class HAScaleController {
	constructor() {
		this.config = HAScaleConstants.CONFIG;
		this.model = new HAScaleModel();
		this.view = new HAScaleView();
		this.connectionService = new HAScaleConnectionService(this.model);
		this.inputService = new HAScaleInputService(this.view);
		this.unitService = new HAScaleUnitService();
		this.eventHandlers = [];
		this.mutationObserver = null;
		this._hotkeyInProgress = false;
		this._buttonsAdded = false;
		
		this.setupObservers();
		this.setupEventHandlers();
	}

	setupObservers() {
		this.model.addObserver({
			onConnectionStateChanged: (state) => {
				this.view.updateConnectionStatus(state.isConnected);
			},
			onAuthStateChanged: (data) => {
				const authState = data.hasValidAuth ? 
					this.view.authUIManager.authStates.AUTHENTICATED : 
					this.view.authUIManager.authStates.UNAUTHENTICATED;
				this.view.authUIManager.updateAuthUI(authState, data.config);
			},
			onStableWeightChanged: (data) => {
				if (data.weight && !isNaN(data.weight)) {
					this.handleStableWeight(data.weight);
				}
			},
			onConfigUpdated: async (config) => {
					const hasAuth = this.model.hasValidAuth();
				const authState = hasAuth ? 
					this.view.authUIManager.authStates.AUTHENTICATED : 
					this.view.authUIManager.authStates.UNAUTHENTICATED;
				this.view.authUIManager.updateAuthUI(authState, config);
				
					this.connectionService.disconnect();
				
				if (this.model.isConfigComplete()) {
					this._ensureButtonsAdded();
					try {
						await this.connectionService.connect();
					} catch (error) {
						HAScaleLogger.error('Controller', 'Connection attempt failed', error);
						
							if (error.message && error.message.includes('authentication required')) {
							HAScaleLogger.info('Controller', 'Authentication required - showing config modal');
							}
					}
				}
			}
		});
	}

	setupEventHandlers() {
		const updatedEventMap = {
			'HAScale.ConfigSave': (_, config) => {
					this.model.setAuthMethod(config.authMethod, config.authData);
				this.model.updateConfig({
					haUrl: config.haUrl,
					scaleEntityId: config.scaleEntityId,
					authMethod: config.authMethod
				});
			},
			'HAScale.ClearInput': (_, input) => {
				const controller = Grocy.Components.HomeAssistantScale.Controller;
				const isConfigComplete = controller?.model?.isConfigComplete();
				const isConnected = controller?.model?.connectionState?.isConnected;
				
				if (!isConfigComplete || !isConnected) {
					$('#ha-scale-config-modal').modal('show');
					HAScaleUtils.showNotification('info', HAScaleConstants.CONFIG.MESSAGES.CONFIG_REQUIRED, { timeOut: 3000 });
					return;
				} else {
					this.inputService.clearInput(input);
					HAScaleUtils.showNotification('info', HAScaleConstants.CONFIG.MESSAGES.WAITING_FOR_WEIGHT, { timeOut: HAScaleConstants.CONFIG.TIMEOUTS.NOTIFICATION_MEDIUM });
				}
			}
		};

		Object.entries(updatedEventMap).forEach(([event, handler]) => {
			this._addEventHandler($(document), event, handler);
		});
		
		this._addEventHandler($(document), 'reset', 'form', () => {
			setTimeout(() => this.view.resetAllInputs('form-reset'), HAScaleConstants.CONFIG.FORM_RESET_DELAY);
		});
		
		this._addEventHandler($(document), 'input keydown paste', 'input', 
			this._debounce((e) => {
				if (this._hotkeyInProgress) {
					return;
				}
				
				const $input = $(e.target);
				if (this.view.inputManager.isInputWaiting($input)) {
					if (e.type === 'keydown' || e.type === 'paste' || $input.val().length > 0) {
						this.view.updateInputState(e.target, 'reset');
					}
				}
			}, HAScaleConstants.CONFIG.INPUT_DEBOUNCE)
		);
		
		this._addEventHandler($(document), 'focus', 'input', (e) => {
			const input = e.target;
			const $input = $(input);
			
			if (this.view.isWeightInput(input) && 
				!this.view.inputManager.isInputAutoTargeted($input) &&
				this.model.isConfigComplete()) {
				
				this.inputService._clearOtherWaitingInputs($input);
				
				this.model.scaleData.lastStableWeight = null;
				
				this.view.updateInputState(input, 'waiting');
				this.view.inputManager.setAutoTargeted($input);
			}
		});
		
		this._addEventHandler($(document), 'blur', 'input', (e) => {
			const input = e.target;
			const $input = $(input);
			
			if (this.view.isWeightInput(input) && 
				this.view.inputManager.isInputAutoTargeted($input) &&
				this.view.inputManager.isInputWaiting($input)) {
				
				this.view.updateInputState(input, 'reset');
			}
		});
		
		this._addEventHandler($(document), 'keydown', (e) => {
			if (e.key === 's' && e.altKey && !e.ctrlKey && !e.shiftKey) {
				e.preventDefault();
				this._handleScaleHotkey();
			}
		});
		
		this.setupSuccessDetection();
	}

	_addEventHandler(element, event, selectorOrHandler, handler) {
		if (typeof selectorOrHandler === 'function') {
			handler = selectorOrHandler;
			element.on(event, handler);
			this.eventHandlers.push({ element, event, handler });
		} else {
			element.on(event, selectorOrHandler, handler);
			this.eventHandlers.push({ element, event, selector: selectorOrHandler, handler });
		}
	}

	_debounce(func, wait) {
		return Delay(func, wait);
	}

	setupSuccessDetection() {
		if (typeof MutationObserver === 'undefined') return;
		
		this.mutationObserver = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				for (const node of mutation.addedNodes) {
					if (node.nodeType === Node.ELEMENT_NODE) {
						const $node = $(node);
						if ($node.hasClass('toast-success') || $node.find('.toast-success').length > 0) {
							const message = $node.text().trim();
							if (this.isStockOperationSuccess(message)) {
								setTimeout(() => this.view.resetAllInputs('success-detection'), HAScaleConstants.CONFIG.SUCCESS_RESET_DELAY);
								return; // Exit early on first match
							}
						}
					}
				}
			}
		});

		const toastContainer = document.querySelector('#toast-container') || document.body;
		this.mutationObserver.observe(toastContainer, {
			childList: true,
			subtree: true
		});
	}

	handleStableWeight(weight) {
		if (weight == null || isNaN(weight) || weight < 0) {
			HAScaleLogger.error('Controller', 'Invalid weight value received:', weight);
			return;
		}
		
		HAScaleLogger.info('Controller', `Processing stable weight from scale: ${weight}g`);
		
		const targetInput = this.inputService.findTargetInput();
		
		if (!targetInput?.length) {
			HAScaleLogger.debug('Controller', 'No eligible target input found for weight data');
			return;
		}
		
		const inputRef = HAScaleUtils.getInputReference(targetInput);
		
		try {
			const unitInfo = this.unitService.getExpectedUnitWithFallback(targetInput[0]);
			const convertedWeight = this.unitService.convertFromGrams(weight, unitInfo.unit);
			const precision = this.unitService.getDecimalPrecision(targetInput[0]);
			const formattedWeight = this.unitService.formatWeight(convertedWeight, precision);
			
			HAScaleLogger.info('Controller', `Updating input ${inputRef} with weight: ${formattedWeight} ${unitInfo.unit}`);
			
			targetInput.val(formattedWeight);
			targetInput.trigger('input');
			targetInput.trigger('change');
			
			this.view.updateInputState(targetInput[0], 'fulfilled');
			
			const baseMessage = `Weight updated from scale: ${formattedWeight} ${unitInfo.unit}`;
			const message = unitInfo.unit !== 'g' ? `${baseMessage} (converted from ${weight}g)` : baseMessage;
			
			HAScaleUtils.showNotification('success', message);
		} catch (error) {
			HAScaleLogger.error('Controller', 'Error processing stable weight:', error);
			HAScaleUtils.showNotification('error', HAScaleConstants.CONFIG.MESSAGES.WEIGHT_PROCESSING_ERROR);
		}
	}

	isStockOperationSuccess(message) {
		if (!message) return false;
		
		const successPatterns = this._getSuccessPatterns();
		
		return successPatterns.some(pattern => 
			pattern.terms.every(term => message.toLowerCase().includes(term.toLowerCase()))
		);
	}

	_getSuccessPatterns() {
		if (!this._cachedSuccessPatterns) {
			try {
				this._cachedSuccessPatterns = [
					{ terms: [__t('Added'), __t('stock')] },
					{ terms: [__t('Removed'), __t('stock')] },
					{ terms: [__t('Transferred')] },
					{ terms: [__t('Inventory saved successfully')] },
					{ terms: [__t('Marked'), __t('opened')] }
				];
			} catch (error) {
				this._cachedSuccessPatterns = [
					{ terms: ['Added', 'stock'] },
					{ terms: ['Removed', 'stock'] },
					{ terms: ['Transferred'] },
					{ terms: ['Inventory saved successfully'] },
					{ terms: ['Marked', 'opened'] }
				];
			}
		}
		return this._cachedSuccessPatterns;
	}

	async initialize() {
		HAScaleLogger.loadLevel();
		
		HAScaleLogger.info('Controller', 'Initializing Home Assistant Scale component');
		
		this.view.initialize();
		
		await this._handleOAuthCallback();
		
		if (this.model.loadConfiguration()) {
			HAScaleLogger.info('Controller', 'Configuration loaded, attempting to connect to Home Assistant');
			HAScaleLogger.debug('Controller', 'Config state:', {
				haUrl: this.model.config.haUrl,
				scaleEntityId: this.model.config.scaleEntityId,
				authMethod: this.model.config.authMethod,
				isComplete: this.model.isConfigComplete(),
				hasValidAuth: this.model.hasValidAuth()
			});
			
			this._ensureButtonsAdded();
			
			await this.connectionService.connect();
		} else {
			HAScaleLogger.info('Controller', 'No configuration found, connection setup required');
		}
	}

	destroy() {
		const cleanupTasks = [
			() => this.connectionService.disconnect(),
			() => this.view.resetAllInputs('destroy-cleanup'),
			() => this.mutationObserver?.disconnect(),
			() => this.view.cleanup(), // Use new centralized cleanup
			() => this.model.observers.clear()
		];

		cleanupTasks.forEach(task => {
			try {
				task();
			} catch (error) {
				HAScaleLogger.error('Cleanup', 'Error during cleanup task:', error);
			}
		});

		this.mutationObserver = null;
		this._cachedSuccessPatterns = null;
	}

	cleanup() {
		this.destroy();
	}

	_ensureButtonsAdded() {
		if (this.model.isConfigComplete() && !this._buttonsAdded) {
			this.view.addRefreshButtons();
			this._buttonsAdded = true;
		}
	}

	async _handleOAuthCallback() {
		const urlParams = new URLSearchParams(window.location.search);
		if (urlParams.get('auth_callback') === '1') {
			HAScaleLogger.info('Controller', 'Detected OAuth callback, processing...');
			
			try {
				const haUrl = HAScaleStorageService.get(HAScaleConstants.CONFIG.STORAGE_KEYS.HA_URL);
				if (!haUrl) {
					HAScaleLogger.error('Controller', 'No HA URL found for OAuth callback');
					return;
				}

				await this.model.authManager.createOAuthAuth(haUrl);
				
				this.model.setAuthMethod(HAScaleConstants.CONFIG.AUTH_METHODS.OAUTH, null);
				this.model.updateConfig({
					haUrl: haUrl,
					scaleEntityId: this.model.config.scaleEntityId || '',
					authMethod: HAScaleConstants.CONFIG.AUTH_METHODS.OAUTH
				});

				HAScaleUtils.showNotification('success', HAScaleConstants.CONFIG.MESSAGES.OAUTH_SUCCESS);
				
				this.view.authUIManager.openModalForEntityConfig();
				
				window.history.replaceState({}, document.title, window.location.pathname);
				
			} catch (error) {
				HAScaleLogger.error('Controller', 'OAuth callback processing failed:', error);
				HAScaleUtils.showNotification('error', 'OAuth authentication failed. Please try again.');
			}
		}
	}

	_handleScaleHotkey() {
		HAScaleLogger.info('Controller', 'Scale hotkey (Alt+S) triggered');
		
		this._hotkeyInProgress = true;
		
		const activeElement = document.activeElement;
		const $activeElement = $(activeElement);
		
		if (activeElement && this.view.isWeightInput(activeElement)) {
			if (this.view.inputManager.isInputWaiting($activeElement)) {
				this.view.updateInputState(activeElement, 'reset');
				HAScaleUtils.showNotification('info', HAScaleConstants.CONFIG.MESSAGES.SCALE_READING_CANCELLED, { timeOut: HAScaleConstants.CONFIG.TIMEOUTS.NOTIFICATION_QUICK });
			} else {
				$(document).trigger('HAScale.ClearInput', [$activeElement]);
			}
		} else {
			const $weightInputs = $('input').filter((_, input) => 
				this.view.isWeightInput(input) && $(input).is(':visible')
			);
			
			if ($weightInputs.length > 0) {
				const $emptyInputs = $weightInputs.filter((_, input) => !input.value || input.value.trim() === '');
				const $firstInput = $emptyInputs.length > 0 ? $emptyInputs.first() : $weightInputs.first();
				
				const $button = this.view.inputManager.getButtonFromInput($firstInput);
				if ($button.length > 0) {
					$button.removeClass(this.view.inputManager.css.AUTO_TARGETED);
				}
				
				$firstInput.focus();
			} else {
				HAScaleLogger.warn('Controller', 'No weight inputs found on page for hotkey operation');
				HAScaleUtils.showNotification('warning', HAScaleConstants.CONFIG.MESSAGES.NO_WEIGHT_INPUTS, { timeOut: HAScaleConstants.CONFIG.TIMEOUTS.NOTIFICATION_MEDIUM });
			}
		}
		
		setTimeout(() => {
			this._hotkeyInProgress = false;
		}, HAScaleConstants.CONFIG.HOTKEY_CLEANUP_DELAY);
	}
	
	_cleanupEventHandlers() {
		this.eventHandlers.forEach(({ element, event, selector, handler }) => {
			if (selector) {
					element.off(event, selector, handler);
			} else {
					element.off(event, handler);
			}
		});
		this.eventHandlers = [];
	}
}

