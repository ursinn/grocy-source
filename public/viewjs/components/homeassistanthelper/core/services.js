class HAHelperConnectionService {
	constructor(model) {
		this.model = model;
		this.config = HAHelperConstants.CONFIG;
		this.connection = null;
		this.auth = null;
		this.authManager = new HAHelperAuthManager();

		// Simple subscription tracking for cleanup on disconnect
		this.activeSubscriptions = new Set();
	}

	async connect() {
		if (!this.model.isConfigComplete()) {
			HAHelperLogger.warn('Connection', 'Missing configuration, cannot connect');
			return false;
		}

		if (this.model.connectionState.isConnected && this.connection && this.connection.connected) {
			return true;
		}

		if (this.connection) {
			this.disconnect();
		}

		HAHelperLogger.info('Connection', 'Connecting to Home Assistant...');

		return await HAHelperErrorHandler.withRetry(async () => {
			return await this._performConnection();
		}, {
			maxRetries: 3,
			retryDelay: 2000,
			retryCondition: HAHelperErrorHandler.isRetryableError,
			context: 'HA connection establishment',
			onRetry: (_, attempt) => {
				HAHelperLogger.warn('Connection', `Connection attempt ${attempt} failed, retrying...`);
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
				HAHelperLogger.error('Connection', 'Authentication failed');
				return false;
			}

			this.connection = await window.HAWS.createConnection({ auth: this.auth });

			let readyHandled = false;

			this.connection.addEventListener('ready', () => {
				if (readyHandled) {
					HAHelperLogger.debug('Connection', 'Ready event already handled, skipping duplicate');
					return;
				}
				readyHandled = true;
				HAHelperLogger.info('Connection', 'Home Assistant connection ready');
				HAHelperLogger.debug('Connection', `Connection object: ${!!this.connection}, Connected state: ${this.connection?.connected}`);
				this.model.updateConnectionState({ isConnected: true, connection: this.connection });
				this._handleReconnection();
			});

			this.connection.addEventListener('disconnected', () => {
				readyHandled = false;
				HAHelperLogger.info('Connection', 'Disconnected from Home Assistant');
				this.model.updateConnectionState({ isConnected: false });
			});

			this.connection.addEventListener('reconnect-error', (event) => {
				HAHelperLogger.error('Connection', 'Reconnect error:', event.data);
				if (event.data === window.HAWS.ERR_INVALID_AUTH) {
					this._handleAuthError();
				}
			});

			if (this.connection.connected) {
				if (!readyHandled) {
					readyHandled = true;
					HAHelperLogger.debug('Connection', 'Connection already ready, triggering ready logic immediately');
					this.model.updateConnectionState({ isConnected: true, connection: this.connection });
					this._handleReconnection();
				}
			}

			setTimeout(() => {
				if (!this.model.connectionState.isConnected && !this.connection.connected) {
					HAHelperLogger.error('Connection', 'Connection timeout - check Home Assistant URL and network connectivity');
				}
			}, 10000); // 10 second timeout

			return true;
		} catch (error) {
			let errorMessage = 'Unknown connection error';
			if (error === window.HAWS?.ERR_INVALID_AUTH) {
				errorMessage = 'Invalid authentication - token may be expired';
				HAHelperLogger.warn('Connection', 'Invalid auth error - user needs to re-authenticate');
			} else if (error === window.HAWS?.ERR_CANNOT_CONNECT) {
				errorMessage = 'Cannot connect to Home Assistant - check URL and network';
			} else if (error === window.HAWS?.ERR_CONNECTION_LOST) {
				errorMessage = 'Connection to Home Assistant lost';
			} else if (error === window.HAWS?.ERR_HASS_HOST_REQUIRED) {
				errorMessage = 'Home Assistant URL is required';
			} else {
				errorMessage = error.message || error.toString() || 'Unknown connection error';
				HAHelperLogger.debug('Connection', 'Full error details:', error);
			}

			HAHelperLogger.error('Connection', `Connection failed: ${errorMessage}`);
			this.model.updateConnectionState({ lastError: { code: error, message: errorMessage } });

			if (error === window.HAWS?.ERR_INVALID_AUTH) {
				return false;
			}

			if (HAHelperErrorHandler.isRetryableError(error)) {
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
			const authMethods = HAHelperConstants.CONFIG.AUTH_METHODS;

			HAHelperLogger.debug('Connection', 'Getting auth with method:', authMethod);

			if (authMethod === authMethods.OAUTH) {
				return await this._getOAuthAuth();
			} else if (authMethod === authMethods.LONG_LIVED) {
				return this._getLongLivedAuth();
			} else {
				throw new Error(`No authentication method configured (current: ${authMethod})`);
			}
		} catch (error) {
			HAHelperLogger.error('Connection', 'Authentication error:', error);
			return null;
		}
	}

	async _getOAuthAuth() {
		try {
			return await this.authManager.createOAuthAuth(this.model.config.haUrl);
		} catch (error) {
			HAHelperLogger.debug('Connection', 'OAuth auth failed to create:', error.message);
			throw error;
		}
	}

	_getLongLivedAuth() {
		const keys = HAHelperConstants.CONFIG.STORAGE_KEYS;
		const longLivedToken = HAHelperStorageService.get(keys.LONG_LIVED_TOKEN);

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

			if (!this.authManager.hasOAuth() && this.model.config.authMethod === HAHelperConstants.CONFIG.AUTH_METHODS.OAUTH) {
				HAHelperLogger.warn('Connection', 'No valid authentication tokens available');
				HAHelperUtils.showNotification('error', 'Authentication lost. Please go to configuration and sign in again.');
				return;
			}

			try {
				this.auth = await this._getAuth();
				if (this.auth) {
					HAHelperLogger.debug('Connection', 'Auth recreated successfully, connection will retry');
					return; // Success, let connection retry
				}
			} catch (authError) {
				HAHelperLogger.warn('Connection', 'Auth recreation failed, tokens may be invalid:', authError);

				if (this.model.config.authMethod === HAHelperConstants.CONFIG.AUTH_METHODS.OAUTH) {
					this.authManager.clearAllAuth();
				}
				HAHelperUtils.showNotification('error', 'Authentication expired and refresh failed. Please go to configuration and sign in again.');
			}

		} catch (error) {
			HAHelperLogger.error('Connection', 'Error in auth error handler', error);
			HAHelperUtils.showNotification('error', 'Authentication error occurred. Please check configuration.');
		}
	}

	_handleReconnection() {
		// Notify modules to resubscribe after reconnection
		// This ensures subscriptions are re-established after Home Assistant reconnects
		HAHelperLogger.debug('Connection', 'Notifying observers of connection ready event');
		this.model.notifyObservers('onConnectionReady', { connection: this.connection });
		HAHelperLogger.info('Connection', 'Connection ready - modules can now resubscribe');
	}

	// Clean subscription API - returns unsubscribe function
	subscribe(entityIds, callback) {
		HAHelperLogger.debug('Connection', `Subscribe called for entities: ${entityIds.join(', ')}`);

		if (!this.connection || !this.connection.connected) {
			HAHelperLogger.warn('Connection', `Cannot subscribe to ${entityIds.join(', ')} - connection: ${!!this.connection}, connected: ${this.connection?.connected}`);
			return () => {}; // Return no-op function
		}

		HAHelperLogger.debug('Connection', `Starting subscription process for ${entityIds.length} entities`);




		try {
			HAHelperLogger.info('Connection', `Creating collection subscription for entities: ${entityIds.join(', ')}`);

			// Entity state change handler
			const entityStateChanged = (state, event) => {
				if (state === undefined) return null;

				const entityId = event.data.entity_id;
				const newState = event.data.new_state;

				// Only process entities we care about
				if (!entityIds.includes(entityId) || !newState) {
					return null;
				}

				// Update our local state with the new entity state
				return {
					...state,
					[entityId]: newState
				};
			};

			// Fetch initial states for our specific entities
			const fetchEntityStates = (conn) =>
				conn.sendMessagePromise({
					type: "get_states"
				}).then(states => {
					// Filter to only our entities
					const filteredStates = {};
					states.forEach(entity => {
						if (entityIds.includes(entity.entity_id)) {
							filteredStates[entity.entity_id] = entity;
						}
					});
					return filteredStates;
				});

			// Subscribe to state_changed events for our entities
			const subscribeUpdates = (conn, store) =>
				conn.subscribeEvents(store.action(entityStateChanged), "state_changed");

			// Create collection with unique key
			const collectionKey = `_ha_helper_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
			HAHelperLogger.debug('Connection', `Creating collection with key: ${collectionKey}`);

			const collection = window.HAWS.getCollection(
				this.connection,
				collectionKey,
				fetchEntityStates,
				subscribeUpdates
			);

			// Subscribe to collection changes
			const unsubscribe = collection.subscribe((entities) => {
				// Handle entity updates
				if (Object.keys(entities).length > 0) {
					HAHelperLogger.debug('Connection', `Collection callback triggered with entities: ${Object.keys(entities).join(', ')}`);
					callback(entities);
				}
			});

			// Track for cleanup on disconnect
			this.activeSubscriptions.add(unsubscribe);

			HAHelperLogger.info('Connection', `Successfully subscribed to ${entityIds.length} entities: ${entityIds.join(', ')}`);

			// Return wrapped unsubscribe that also removes from tracking
			return () => {
				HAHelperLogger.debug('Connection', `Unsubscribing from entities: ${entityIds.join(', ')}`);
				this.activeSubscriptions.delete(unsubscribe);
				unsubscribe();
			};

		} catch (error) {
			HAHelperLogger.error('Connection', 'Error creating entity collection subscription', error);
			return () => {}; // Return no-op function on error
		}




		// try {
		// 	// Use the proper entities collection from HAWS
		// 	const entitiesCollection = window.HAWS.entitiesColl(this.connection);

		// 	// Subscribe to the entities collection and filter for our specific entities
		// 	const unsubscribe = entitiesCollection.subscribe((allEntities) => {
		// 		// Filter to only the entities we care about
		// 		const filteredEntities = {};
		// 		entityIds.forEach(entityId => {
		// 			if (allEntities[entityId]) {
		// 				filteredEntities[entityId] = allEntities[entityId];
		// 			}
		// 		});

		// 		// Only call callback if we have entities
		// 		if (Object.keys(filteredEntities).length > 0) {
		// 			HAHelperLogger.debug('Connection', `Collection callback triggered with entities: ${Object.keys(filteredEntities).join(', ')}`);
		// 			callback(filteredEntities);
		// 		}
		// 	});

		// 	// Track for cleanup on disconnect
		// 	this.activeSubscriptions.add(unsubscribe);

		// 	HAHelperLogger.info('Connection', `Successfully subscribed to ${entityIds.length} entities: ${entityIds.join(', ')}`);

		// 	// Return wrapped unsubscribe that also removes from tracking
		// 	return () => {
		// 		HAHelperLogger.debug('Connection', `Unsubscribing from entities: ${entityIds.join(', ')}`);
		// 		this.activeSubscriptions.delete(unsubscribe);
		// 		unsubscribe();
		// 	};

		// } catch (error) {
		// 	HAHelperLogger.error('Connection', `Failed to subscribe to entities ${entityIds.join(', ')}:`, error);
		// 	return () => {}; // Return no-op function on error
		// }
	}


	disconnect() {
		// Clean up all active subscriptions
		for (const unsubscribe of this.activeSubscriptions) {
			try {
				unsubscribe();
			} catch (error) {
				HAHelperLogger.error('Connection', 'Error unsubscribing from entity:', error);
			}
		}
		this.activeSubscriptions.clear();

		try {

			if (this.connection) {
				try {
					this.connection.close();
				} catch (error) {
					HAHelperLogger.error('Connection', 'Error closing connection', error);
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
			HAHelperLogger.error('Connection', 'Error during disconnect', error);
		}
	}
}

// HAHelperInputService moved to scale module

class HAHelperUnitService {
	constructor() {
		this.conversionFactors = HAHelperConstants.CONFIG.UNIT_CONVERSIONS;
		this.config = HAHelperConstants.CONFIG;
	}

	getExpectedUnitWithFallback(inputElement) {
		const $input = $(inputElement);
		const inputId = $input.attr('id') || '';
		const inputRef = HAHelperUtils.getInputReference($input);

		const result = this._detectUnit($input, inputId);
		HAHelperLogger.debug('UnitService', `Unit detection for ${inputRef}: ${result.unit} (fallback: ${result.isFallback})`);

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

		HAHelperLogger.debug('UnitService', `Converting ${weightInGrams}g to ${toUnit}: ${converted} (factor: ${factor})`);

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

