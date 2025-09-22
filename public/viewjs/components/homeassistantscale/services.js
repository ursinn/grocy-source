class HAScaleConnectionService {
	constructor(model) {
		this.model = model;
		this.config = HAScaleConstants.CONFIG;
		this.connection = null;
		this.unsubscribeEntities = null;
		this.auth = null;
		this.authManager = new HAScaleAuthManager();
	}

	async connect() {
		if (!this.model.isConfigComplete()) {
			HAScaleLogger.warn('Connection', 'Missing configuration, cannot connect');
			return false;
		}

		if (this.model.connectionState.isConnected && this.connection && this.connection.connected) {
			return true;
		}

		if (this.connection) {
			this.disconnect();
		}

		HAScaleLogger.info('Connection', 'Connecting to Home Assistant...');

		return await HAScaleErrorHandler.withRetry(async () => {
			return await this._performConnection();
		}, {
			maxRetries: 3,
			retryDelay: 2000,
			retryCondition: HAScaleErrorHandler.isRetryableError,
			context: 'HA connection establishment',
			onRetry: (_, attempt) => {
				HAScaleLogger.warn('Connection', `Connection attempt ${attempt} failed, retrying...`);
			}
		});
	}

	async _performConnection() {
		try {
			if (!window.HAWS) {
				throw new Error('home-assistant-js-websocket library not loaded');
			}

			this.auth = await this._getAuth();
			if (!this.auth) {
				HAScaleLogger.error('Connection', 'Authentication failed');
				return false;
			}

			this.connection = await window.HAWS.createConnection({ auth: this.auth });
			
			this.connection.addEventListener('ready', () => {
				HAScaleLogger.info('Connection', 'Connected to Home Assistant');
				this.model.updateConnectionState({ isConnected: true, connection: this.connection });
				this._subscribeToEntities();
			});

			this.connection.addEventListener('disconnected', () => {
				HAScaleLogger.info('Connection', 'Disconnected from Home Assistant');
				this.model.updateConnectionState({ isConnected: false });
			});

			this.connection.addEventListener('reconnect-error', (event) => {
				HAScaleLogger.error('Connection', 'Reconnect error:', event.data);
				if (event.data === window.HAWS.ERR_INVALID_AUTH) {
					this._handleAuthError();
				}
			});

			if (this.connection.connected) {
				HAScaleLogger.debug('Connection', 'Connection already ready, triggering ready logic immediately');
				this.model.updateConnectionState({ isConnected: true, connection: this.connection });
				this._subscribeToEntities();
			}

			setTimeout(() => {
				if (!this.model.connectionState.isConnected && !this.connection.connected) {
					HAScaleLogger.error('Connection', 'Connection timeout - check Home Assistant URL and network connectivity');
				}
			}, 10000); // 10 second timeout

			return true;
		} catch (error) {
			let errorMessage = 'Unknown connection error';
			if (error === window.HAWS?.ERR_INVALID_AUTH) {
				errorMessage = 'Invalid authentication - token may be expired';
				HAScaleLogger.warn('Connection', 'Invalid auth error - user needs to re-authenticate');
			} else if (error === window.HAWS?.ERR_CANNOT_CONNECT) {
				errorMessage = 'Cannot connect to Home Assistant - check URL and network';
			} else if (error === window.HAWS?.ERR_CONNECTION_LOST) {
				errorMessage = 'Connection to Home Assistant lost';
			} else if (error === window.HAWS?.ERR_HASS_HOST_REQUIRED) {
				errorMessage = 'Home Assistant URL is required';
			} else {
				errorMessage = error.message || error.toString() || 'Unknown connection error';
				HAScaleLogger.debug('Connection', 'Full error details:', error);
			}

			HAScaleLogger.error('Connection', `Connection failed: ${errorMessage}`);
			this.model.updateConnectionState({ lastError: { code: error, message: errorMessage } });
			
			if (error === window.HAWS?.ERR_INVALID_AUTH) {
				return false;
			}
			
			if (HAScaleErrorHandler.isRetryableError(error)) {
				throw error;
			}
			
			return false;
		}
	}

	async _getAuth() {
		try {
			if (!window.HAWS) {
				throw new Error('home-assistant-js-websocket library not available');
			}

			const authMethod = this.model.config.authMethod;
			const authMethods = HAScaleConstants.CONFIG.AUTH_METHODS;
			
			HAScaleLogger.debug('Connection', 'Getting auth with method:', authMethod);

			if (authMethod === authMethods.OAUTH) {
				return await this._getOAuthAuth();
			} else if (authMethod === authMethods.LONG_LIVED) {
				return this._getLongLivedAuth();
			} else {
				throw new Error(`No authentication method configured (current: ${authMethod})`);
			}
		} catch (error) {
			HAScaleLogger.error('Connection', 'Authentication error:', error);
			return null;
		}
	}
	
	async _getOAuthAuth() {
		try {
			return await this.authManager.createOAuthAuth(this.model.config.haUrl);
		} catch (error) {
			HAScaleLogger.debug('Connection', 'OAuth auth failed to create:', error.message);
			throw error;
		}
	}
	
	_getLongLivedAuth() {
		const keys = HAScaleConstants.CONFIG.STORAGE_KEYS;
		const longLivedToken = HAScaleStorageService.get(keys.LONG_LIVED_TOKEN);
		
		if (!longLivedToken) {
			throw new Error('No long-lived token found');
		}
		
		return this.authManager.createLongLivedAuth(this.model.config.haUrl, longLivedToken);
	}


	async _handleAuthError() {
		try {
			this.auth = null;
			if (this.connection) {
				this.connection.close();
				this.connection = null;
			}
			
			if (!this.authManager.hasOAuth() && this.model.config.authMethod === HAScaleConstants.CONFIG.AUTH_METHODS.OAUTH) {
				HAScaleLogger.warn('Connection', 'No valid authentication tokens available');
				HAScaleUtils.showNotification('error', 'Authentication lost. Please go to configuration and sign in again.');
				return;
			}
			
			try {
				this.auth = await this._getAuth();
				if (this.auth) {
					HAScaleLogger.debug('Connection', 'Auth recreated successfully, connection will retry');
					return; // Success, let connection retry
				}
			} catch (authError) {
				HAScaleLogger.warn('Connection', 'Auth recreation failed, tokens may be invalid:', authError);
				
				if (this.model.config.authMethod === HAScaleConstants.CONFIG.AUTH_METHODS.OAUTH) {
					this.authManager.clearAllAuth();
				}
				HAScaleUtils.showNotification('error', 'Authentication expired and refresh failed. Please go to configuration and sign in again.');
			}
			
		} catch (error) {
			HAScaleLogger.error('Connection', 'Error in auth error handler', error);
			HAScaleUtils.showNotification('error', 'Authentication error occurred. Please check configuration.');
		}
	}


	_handleEntityUpdate(entity) {
		const newWeight = parseFloat(entity.state);
		const isStable = entity.attributes?.is_stable === true;
		
		if (!isNaN(newWeight) && entity.attributes) {
			HAScaleLogger.throttled('weight_update', 1000, () => {
				HAScaleLogger.debug('Connection', `Weight update received: ${newWeight}g, stable: ${isStable}, entity: ${this.model.config.scaleEntityId}`);
			});
			
			this.model.updateScaleData({
				lastWeight: newWeight,
				isStable: isStable,
				attributes: entity.attributes
			});
		} else {
			HAScaleLogger.throttled('invalid_entity', 5000, () => {
				HAScaleLogger.warn('Connection', `Invalid entity data received from ${this.model.config.scaleEntityId}: state="${entity.state}", has_attributes=${!!entity.attributes}`);
			});
		}
	}

	_subscribeToEntities() {
		if (!this.connection || !this.connection.connected) {
			HAScaleLogger.error('Connection', 'Cannot subscribe to entities - connection not ready');
			return;
		}

		if (this.unsubscribeEntities) {
			HAScaleLogger.debug('Connection', 'Already subscribed to entities');
			return;
		}

		try {
			this.unsubscribeEntities = window.HAWS.subscribeEntities(this.connection, (entities) => {
				const scaleEntity = entities[this.model.config.scaleEntityId];
				if (scaleEntity) {
					this._handleEntityUpdate(scaleEntity);
				}
			});
			HAScaleLogger.debug('Connection', 'Successfully subscribed to entity changes');
		} catch (error) {
			HAScaleLogger.error('Connection', 'Error subscribing to entities', error);
		}
	}

	disconnect() {
		try {
			if (this.unsubscribeEntities) {
				try {
					this.unsubscribeEntities();
				} catch (error) {
					HAScaleLogger.error('Connection', 'Error cleaning up entity subscription', error);
				}
				this.unsubscribeEntities = null;
			}
			
			if (this.connection) {
				try {
					this.connection.close();
				} catch (error) {
					HAScaleLogger.error('Connection', 'Error closing connection', error);
				}
				this.connection = null;
			}
			
			this.auth = null;
			
			this.model.updateConnectionState({
				isConnected: false,
				connection: null,
				reconnectTimer: null,
				lastError: null
			});
		} catch (error) {
			HAScaleLogger.error('Connection', 'Error during disconnect', error);
		}
	}
}

class HAScaleInputService {
	constructor(view) {
		this.view = view;
		this._inputCache = new Map();
	}

	findTargetInput() {
		const waitingInputs = this.view.inputManager.findWaitingInputs();
		
		if (waitingInputs.length > 0) {
			const $input = waitingInputs[0];
			const inputRef = HAScaleUtils.getInputReference($input);
			HAScaleLogger.debug('InputService', `Found target input: ${inputRef} (${waitingInputs.length} waiting inputs total)`);
			return $input;
		}
		
		HAScaleLogger.debug('InputService', 'No waiting inputs found for scale data');
		return null;
	}

	_isValidTargetInput(element) {
		return element && this.view.isWeightInput(element);
	}

	_prepareActiveInput($activeElement, activeElement) {
		if ($activeElement.hasClass('ha-scale-waiting')) {
			return $activeElement;
		}
		
		if ($activeElement.hasClass('ha-scale-fulfilled')) {
			return null;
		}
		
		if (!$activeElement.hasClass('ha-scale-auto-targeted')) {
			$activeElement.addClass('ha-scale-auto-targeted');
			
			Grocy.Components.HomeAssistantScale.Controller.view.updateInputState(activeElement, 'waiting');
			
			return $activeElement;
		}
		
		return null;
	}

	clearInput(input) {
		const $input = $(input);
		
		this._clearOtherWaitingInputs($input);
		
		const controller = Grocy.Components.HomeAssistantScale.Controller;
		if (controller?.model) {
			controller.model.scaleData.lastStableWeight = null;
			HAScaleLogger.debug('InputService', 'Reset lastStableWeight to allow same weight to trigger again');
		}
		
		this.view.updateInputState(input[0], 'waiting');
		$input.focus();
	}

	_clearOtherWaitingInputs($targetInput) {
		const waitingInputs = this.view.inputManager.findWaitingInputs();
		const clearedCount = waitingInputs.filter($input => $input[0] !== $targetInput[0]).length;
		
		if (clearedCount > 0) {
			HAScaleLogger.debug('InputService', `Clearing ${clearedCount} other waiting inputs`);
		}
		
		waitingInputs.forEach($input => {
			if ($input[0] !== $targetInput[0]) {
				this.view.updateInputState($input[0], 'reset');
			}
		});
	}
}

class HAScaleUnitService {
	constructor() {
		this.conversionFactors = HAScaleConstants.CONFIG.UNIT_CONVERSIONS;
		this.config = HAScaleConstants.CONFIG;
	}

	getExpectedUnitWithFallback(inputElement) {
		const $input = $(inputElement);
		const inputId = $input.attr('id') || '';
		const inputRef = HAScaleUtils.getInputReference($input);
		
		const result = this._detectUnit($input, inputId);
		HAScaleLogger.debug('UnitService', `Unit detection for ${inputRef}: ${result.unit} (fallback: ${result.isFallback})`);
		
		return result;
	}


	_detectUnit($input, inputId) {
		if (inputId) {
			const $quUnit = $(`#${inputId}_qu_unit`);
			if ($quUnit.length > 0) {
				const unit = $quUnit.text().trim().toLowerCase();
				if (unit) {
					return { unit, isFallback: false };
				}
			}
		}
		
		const $unitElement = $input.siblings('.input-group-text, .input-group-append .input-group-text');
		if ($unitElement.length > 0) {
			const unit = this._extractUnitText($unitElement);
			if (unit) {
				return { unit, isFallback: false };
			}
		}
		
		const $inputGroup = $input.closest('.input-group');
		if ($inputGroup.length > 0) {
			const $unitInGroup = $inputGroup.find('.input-group-text, [id$="_unit"], [class*="unit"]');
			const unit = this._extractUnitText($unitInGroup);
			if (unit) {
				return { unit, isFallback: false };
			}
		}
		
		const $quSelector = $('#qu_id');
		if ($quSelector.length > 0) {
			const $selectedOption = $quSelector.find('option:selected');
			if ($selectedOption.length > 0) {
				const unit = $selectedOption.text().trim().toLowerCase();
				if (unit) {
					return { unit, isFallback: false };
				}
			}
		}
		
		return { unit: 'g', isFallback: true };
	}

	_extractUnitText($elements) {
		if ($elements.length === 0) return null;
		
		for (let i = 0; i < $elements.length; i++) {
			const text = $($elements[i]).text().trim().toLowerCase();
			if (text && text.length > 0) {
				return text;
			}
		}
		return null;
	}


	convertFromGrams(weightInGrams, toUnit) {
		const factor = this.conversionFactors[toUnit.toLowerCase()] || 1;
		const converted = weightInGrams / factor;
		
		HAScaleLogger.debug('UnitService', `Converting ${weightInGrams}g to ${toUnit}: ${converted} (factor: ${factor})`);
		
		return converted;
	}

	getDecimalPrecision(targetInput) {
		let maxDecimalPlaces = Grocy.UserSettings?.stock_decimal_places_amounts || this.config.DEFAULT_DECIMAL_PLACES;
		
		const stepAttr = $(targetInput).attr('step');
		if (stepAttr && stepAttr.includes('.')) {
			const stepDecimals = stepAttr.split('.')[1].length;
			if (stepDecimals > 0 && stepDecimals < maxDecimalPlaces) {
				maxDecimalPlaces = stepDecimals;
			}
		}
		
		return Math.max(this.config.MIN_DECIMAL_PLACES, Math.min(maxDecimalPlaces, this.config.MAX_DECIMAL_PLACES));
	}

	formatWeight(weight, precision) {
		const roundingFactor = Math.pow(10, precision);
		const roundedWeight = Math.round(weight * roundingFactor) / roundingFactor;
		
		return roundedWeight.toLocaleString('en-US', {
			minimumFractionDigits: 0,
			maximumFractionDigits: precision
		});
	}
}

