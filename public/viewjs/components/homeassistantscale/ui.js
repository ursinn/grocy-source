class HAScaleInputManager {
	constructor() {
		this.css = HAScaleConstants.CONFIG.CSS_CLASSES;
		this.states = {
			IDLE: 'idle',
			WAITING: 'waiting', 
			FULFILLED: 'fulfilled'
		};
		
		this.buttonConfigs = {
			[this.states.IDLE]: {
				classes: [this.css.BUTTON_IDLE],
				icon: 'fa-scale-balanced',
				getTooltip: (unit, isFallback) => isFallback ? 
					'Waiting for stable weight (unit not detected, will use grams)' :
					`Waiting for stable weight (detected unit: ${unit})`
			},
			[this.states.WAITING]: {
				classes: [this.css.BUTTON_IDLE, this.css.BUTTON_WAITING],
				icon: 'fa-scale-balanced',
				getTooltip: (unit, isFallback) => isFallback ? 
					'Waiting for stable weight (unit not detected, will use grams)' :
					`Waiting for stable weight (detected unit: ${unit})`
			},
			[this.states.FULFILLED]: {
				classes: (isFallback) => isFallback ? [this.css.BUTTON_WARNING] : [this.css.BUTTON_SUCCESS],
				icon: 'fa-refresh',
				getTooltip: (unit, isFallback) => isFallback ? 
					'Clear and wait for new weight (unit not detected, using grams)' :
					`Clear and wait for new weight (detected unit: ${unit})`
			}
		};
	}

	getInputFromButton($button) {
		return $button.siblings('input').first();
	}

	getButtonFromInput($input) {
		return $input.siblings(`.${this.css.BUTTON_BASE}`).first();
	}

	createButton() {
		return $(HAScaleTemplateGenerator.generateRefreshButton());
	}

	isWaiting($button) {
		return $button.hasClass(this.css.BUTTON_WAITING);
	}

	isAutoTargeted($button) {
		return $button.hasClass(this.css.AUTO_TARGETED);
	}

	isFulfilled($button) {
		return $button.hasClass(this.css.BUTTON_SUCCESS) || $button.hasClass(this.css.BUTTON_WARNING);
	}

	isInputWaiting($input) {
		const $button = this.getButtonFromInput($input);
		return $button.length > 0 && this.isWaiting($button);
	}

	isInputAutoTargeted($input) {
		const $button = this.getButtonFromInput($input);
		return $button.length > 0 && this.isAutoTargeted($button);
	}

	findWaitingInputs() {
		return $(`.${this.css.BUTTON_BASE}.${this.css.BUTTON_WAITING}`)
			.map((_, button) => {
				const $input = this.getInputFromButton($(button));
				return $input.length > 0 ? $input : null;
			})
			.get()
			.filter(Boolean);
	}

	setState($input, state, unitInfo = null) {
		this._clearInputStates($input);
		this._setInputState($input, state);
		this._setButtonState($input, state, unitInfo);
	}

	_clearInputStates($input) {
		$input.removeClass(`${this.css.INPUT_WAITING} ${this.css.INPUT_FULFILLED}`);
	}

	_setInputState($input, state) {
		if (state === this.states.WAITING) {
			$input.addClass(this.css.INPUT_WAITING);
		} else if (state === this.states.FULFILLED) {
			$input.addClass(this.css.INPUT_FULFILLED);
		}
	}

	_setButtonState($input, state, unitInfo) {
		const $button = this.getButtonFromInput($input);
		if ($button.length === 0) return;

		const config = this.buttonConfigs[state];
		if (!config) return;

		const allButtonClasses = `${this.css.BUTTON_IDLE} ${this.css.BUTTON_SUCCESS} ${this.css.BUTTON_WARNING} ${this.css.BUTTON_WAITING}`;
		$button.removeClass(allButtonClasses);

		const classes = typeof config.classes === 'function' ? 
			config.classes(unitInfo?.isFallback) : config.classes;
		$button.addClass(classes.join(' '));

		$button.html(`<i class="fa-solid ${config.icon}"></i>`);
		if (unitInfo) {
			$button.attr('title', config.getTooltip(unitInfo.unit, unitInfo.isFallback));
		}
	}

	setAutoTargeted($input) {
		const $button = this.getButtonFromInput($input);
		if ($button.length > 0) {
			$button.addClass(this.css.AUTO_TARGETED);
		}
	}

	resetAll() {
		$(`.${this.css.INPUT_WAITING}, .${this.css.INPUT_FULFILLED}`).each((_, input) => {
			this.setState($(input), this.states.IDLE);
		});
	}
}

class HAScaleAuthUIManager {
	constructor() {
		this.authStates = {
			UNAUTHENTICATED: 'unauthenticated',
			AUTHENTICATED: 'authenticated'
		};
		this.modalSelector = HAScaleConstants.CONFIG.SELECTORS.MODAL;
	}

	_getModalElements() {
		const $container = $(HAScaleConstants.CONFIG.SELECTORS.CONFIG_CONTAINER);
		return {
			modal: $container.closest('.modal'),
			authStatus: $container.find('.auth-status'),
			authMethodDisplay: $container.find('.auth-method-display'),
			authMethodSelection: $container.find('.auth-method-selection'),
			oauthCard: $container.find('.oauth-card'),
			longLivedCard: $container.find('.long-lived-card'),
			oauthAuthStatus: $container.find('.oauth-auth-status'),
			longLivedAuthStatus: $container.find('.long-lived-auth-status'),
			oauthSigninBtn: $container.find('.oauth-signin-btn'),
			longLivedBtn: $container.find('.long-lived-btn'),
			tokenValidateBtn: $container.find('.token-validate-btn'),
			tokenInput: $container.find('.token-input'),
			urlInput: $container.find('.url-input'),
			tokenField: $container.find('.token-field'),
			entityInput: $container.find('.entity-input'),
			connectionStatus: $container.find('.connection-status'),
			configSave: $container.find('.config-save'),
			logoutBtn: $container.find('.logout-btn'),
			logLevelSelect: $container.find('.log-level-select')
		};
	}

	updateAuthUI(state, config = {}) {
		const elements = this._getModalElements();
		const authMethods = HAScaleConstants.CONFIG.AUTH_METHODS;

		elements.urlInput.val(config.haUrl || '');
		elements.entityInput.val(config.scaleEntityId || '');
		elements.logLevelSelect.val(HAScaleLogger.currentLevel.toString());

		elements.oauthAuthStatus.addClass('d-none');
		elements.longLivedAuthStatus.addClass('d-none');
		elements.tokenInput.addClass('d-none');

		switch (state) {
			case this.authStates.AUTHENTICATED:
				elements.authStatus.removeClass('d-none');
				elements.authMethodSelection.removeClass('d-none');
				
				if (config.authMethod === authMethods.OAUTH) {
					elements.authMethodDisplay.text('OAuth Authentication Active');
					elements.oauthAuthStatus.removeClass('d-none');
				} else if (config.authMethod === authMethods.LONG_LIVED) {
					elements.authMethodDisplay.text('Long-lived Token Active');
					elements.longLivedAuthStatus.removeClass('d-none');
				} else {
					elements.authMethodDisplay.text('Successfully authenticated');
				}
				break;

			case this.authStates.UNAUTHENTICATED:
				elements.authStatus.addClass('d-none');
				elements.authMethodSelection.removeClass('d-none');
				break;
		}
	}

	showLongLivedTokenInput() {
		const elements = this._getModalElements();
		elements.tokenInput.removeClass('d-none');
		elements.longLivedBtn.addClass('d-none');
		elements.tokenField.focus();
	}

	openModalForEntityConfig() {
		const elements = this._getModalElements();
		elements.modal.modal('show');
		setTimeout(() => elements.entityInput.focus(), HAScaleConstants.CONFIG.TIMEOUTS.MODAL_FOCUS_DELAY);
	}

	updateConnectionStatus(isConnected) {
		const elements = this._getModalElements();
		const $status = elements.connectionStatus;
		if ($status.length > 0) {
			$status.text(isConnected ? 'Connected' : 'Not connected')
				.removeClass('text-success text-danger')
				.addClass(isConnected ? 'text-success' : 'text-danger');
		}
	}
}

class HAScaleStyleManager {
	constructor(config) {
		this.config = config;
	}

	addStyles() {
		if ($(HAScaleConstants.CONFIG.SELECTORS.STYLES).length > 0) return;
		
		const css = this.config.CSS_CLASSES;
		const styles = `
			<style id="ha-scale-styles">
				.${css.BUTTON_BASE} { margin-right: 0; }
				
				.${css.BUTTON_BASE}.${css.BUTTON_SUCCESS} { color: #fff; }
				.${css.BUTTON_BASE}.${css.BUTTON_WARNING} { color: #fff; }
				.${css.BUTTON_BASE}.${css.BUTTON_WAITING} {
					color: #007bff !important;
					border-color: #007bff !important;
				}
				.${css.BUTTON_BASE}.${css.BUTTON_WAITING} i {
					animation: ha-scale-pulse ${HAScaleConstants.CONFIG.ANIMATION.PULSE_DURATION} ease-in-out infinite;
				}
				
				@keyframes ha-scale-pulse {
					0% { transform: scale(${HAScaleConstants.CONFIG.ANIMATION.SCALE_NORMAL}); opacity: ${HAScaleConstants.CONFIG.ANIMATION.OPACITY_NORMAL}; }
					50% { transform: scale(${HAScaleConstants.CONFIG.ANIMATION.SCALE_ENLARGED}); opacity: ${HAScaleConstants.CONFIG.ANIMATION.OPACITY_DIMMED}; }
					100% { transform: scale(${HAScaleConstants.CONFIG.ANIMATION.SCALE_NORMAL}); opacity: ${HAScaleConstants.CONFIG.ANIMATION.OPACITY_NORMAL}; }
				}
			</style>
		`;
		
		$('head').append(styles);
	}
}

class HAScaleTemplateGenerator {
	static generateConfigModal() {
		return `
			<div class="modal fade" id="ha-scale-config-modal" tabindex="-1" role="dialog">
				<div class="modal-dialog" role="document">
					<div class="modal-content ha-scale-config">
						<div class="modal-header">
							<h5 class="modal-title"><i class="fa-solid fa-scale-balanced"></i> Home Assistant Scale Configuration</h5>
							<button type="button" class="close" data-dismiss="modal"><span>&times;</span></button>
						</div>
						<div class="modal-body">
							<div class="form-group url-group">
								<label>Home Assistant URL</label>
								<input type="text" class="form-control url-input" placeholder="http://homeassistant.local:8123">
							</div>
							<div class="form-group auth-group">
								<label>Authentication Method</label>
								
								<!-- Authentication Status -->
								<div class="auth-status mb-3 d-none">
									<div class="alert alert-success d-flex justify-content-between align-items-center">
										<div>
											<i class="fa-solid fa-check-circle"></i> 
											<span class="auth-method-display">Successfully authenticated</span>
										</div>
										<button type="button" class="btn btn-sm btn-danger logout-btn">
											<i class="fa-solid fa-sign-out-alt"></i> Disconnect
										</button>
									</div>
								</div>
								
								<!-- Authentication Method Selection -->
								<div class="auth-method-selection">
									<div class="card mb-3 oauth-card">
										<div class="card-body">
											<h6 class="card-title">
												<i class="fa-solid fa-shield-alt"></i> OAuth Authentication (Recommended)
											</h6>
											<p class="card-text small text-muted">
												Secure authentication with automatic token refresh. Tokens persist across browser sessions.
											</p>
											<div class="oauth-auth-status d-none mb-2">
												<div class="alert alert-success mb-0">
													<i class="fa-solid fa-check-circle"></i> OAuth authentication successful
												</div>
											</div>
											<button type="button" class="btn btn-primary btn-block oauth-signin-btn">
												<i class="fa-solid fa-sign-in-alt"></i> Sign in with Home Assistant
											</button>
										</div>
									</div>
									
									<div class="card long-lived-card">
										<div class="card-body">
											<h6 class="card-title">
												<i class="fa-solid fa-key"></i> Long-lived Access Token
											</h6>
											<p class="card-text small text-muted">
												Use a manually created long-lived access token. You'll need to create this in Home Assistant first.
											</p>
											<div class="long-lived-auth-status d-none mb-2">
												<div class="alert alert-success mb-0">
													<i class="fa-solid fa-check-circle"></i> Long-lived token validated
												</div>
											</div>
											<button type="button" class="btn btn-outline-secondary btn-block long-lived-btn">
												<i class="fa-solid fa-key"></i> Use Long-lived Token
											</button>
											<div class="token-input mt-3 d-none">
												<input type="password" class="form-control token-field" placeholder="Enter your long-lived access token">
												<small class="form-text text-muted">
													Create this in Home Assistant: Profile → Security → Long-lived access tokens
												</small>
												<button type="button" class="btn btn-primary btn-sm mt-2 token-validate-btn">
													<i class="fa-solid fa-save"></i> Save Token
												</button>
											</div>
										</div>
									</div>
								</div>
							</div>
							<div class="form-group entity-group">
								<label>Scale Entity ID</label>
								<input type="text" class="form-control entity-input" placeholder="e.g. sensor.kitchen_scale, must have 'is_stable' attribute">
							</div>
							<div class="form-group log-level-group">
								<label for="ha-log-level">
									<small>Log Level</small>
								</label>
								<select class="form-control form-control-sm log-level-select" id="ha-log-level">
									<option value="0">Error only</option>
									<option value="1">Warning & Error</option>
									<option value="2" selected>Info, Warning & Error</option>
									<option value="3">All (Debug)</option>
								</select>
							</div>
						</div>
						<div class="modal-footer d-flex justify-content-between align-items-center">
							<div class="connection-status-display">
								<small class="text-muted">Connection: <span class="connection-status text-danger">Not connected</span></small>
							</div>
							<div>
								<button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
								<button type="button" class="btn btn-success config-save ml-2">Save & Test</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		`;
	}

	static generateMenuButton() {
		return `
			<a class="dropdown-item" href="#" id="ha-scale-config-menu" data-toggle="modal" data-target="#ha-scale-config-modal">
				<i class="fa-solid fa-scale-balanced"></i> Home Assistant Scale
			</a>
			<div class="dropdown-divider"></div>
		`;
	}

	static generateRefreshButton() {
		const { BUTTON_IDLE, BUTTON_BASE } = HAScaleConstants.CONFIG.CSS_CLASSES;
		return `<button type="button" class="btn btn-sm ${BUTTON_IDLE} ${BUTTON_BASE}">
			<i class="fa-solid fa-scale-balanced"></i>
		</button>`;
	}
}

class HAScaleView {
	constructor() {
		this.config = HAScaleConstants.CONFIG;
		this.initialized = false;
		this._cache = new Map();
		this.eventManager = new HAScaleEventManager();
		this.inputManager = new HAScaleInputManager();
		this.authUIManager = new HAScaleAuthUIManager();
		this.styleManager = new HAScaleStyleManager(this.config);
		this.authManager = new HAScaleAuthManager();
	}

	initialize() {
		if (this.initialized) return;
		
		this.styleManager.addStyles();
		this.addConfigurationUI();
		this.initialized = true;
	}

	updateConnectionStatus(isConnected) {
		this.authUIManager.updateConnectionStatus(isConnected);
	}

	_getCachedElement(selector) {
		const cached = this._cache.get(selector);
		if (cached && (Date.now() - cached.timestamp) < this.config.CACHE_TTL) {
			return cached.element;
		}
		
		const $element = $(selector);
		this._cache.set(selector, {
			element: $element,
			timestamp: Date.now()
		});
		return $element;
	}

	_clearCache() {
		this._cache.clear();
	}

	cleanup() {
		this.eventManager.cleanup();
		
		this._clearCache();
		
		this.initialized = false;
	}


	updateInputState(input, state) {
		const $input = $(input);
		const inputRef = HAScaleUtils.getInputReference($input);
		
		if (state === 'waiting') {
			HAScaleLogger.info('UI', `Enabling scale entry for: ${inputRef}`);
		} else if (state === 'reset' && this.inputManager.isInputWaiting($input)) {
			HAScaleLogger.info('UI', `Disabling scale entry for: ${inputRef}`);
		} else {
			HAScaleLogger.debug('UI', `Updating input state to '${state}' for: ${inputRef}`);
		}
		
		let unitInfo = null;
		if (Grocy.Components.HomeAssistantScale.Controller) {
			unitInfo = Grocy.Components.HomeAssistantScale.Controller.unitService.getExpectedUnitWithFallback(input);
			HAScaleLogger.debug('UI', `Detected unit for ${inputRef}: ${unitInfo.unit} (fallback: ${unitInfo.isFallback})`);
		}
		
		const stateMap = {
			'waiting': this.inputManager.states.WAITING,
			'fulfilled': this.inputManager.states.FULFILLED,
			'reset': this.inputManager.states.IDLE
		};
		
		const newState = stateMap[state] || this.inputManager.states.IDLE;
		this.inputManager.setState($input, newState, unitInfo);
	}


	resetAllInputs(reason = 'unknown') {
		HAScaleLogger.info('UI', `Resetting all scale input states (reason: ${reason})`);
		this.inputManager.resetAll();
		
		this._clearCache();
	}

	addRefreshButtons() {
		const inputSelector = HAScaleConstants.CONFIG.SELECTORS.INPUT_SELECTOR;
		
		const eligibleInputs = $(inputSelector).filter((_, element) => this._shouldAddButton(element));
		HAScaleLogger.debug('UI', `Adding refresh buttons to ${eligibleInputs.length} eligible weight inputs`);
		
		eligibleInputs.each((_, element) => this._createRefreshButton($(element)));
	}

	_shouldAddButton(element) {
		const $input = $(element);
		const isWeight = this.isWeightInput(element);
		const hasButton = this.inputManager.getButtonFromInput($input).length > 0;
		
		return isWeight && !hasButton;
	}

	_createRefreshButton($input) {
		const $button = this.inputManager.createButton();
		const inputRef = HAScaleUtils.getInputReference($input);
		
		HAScaleLogger.debug('UI', `Creating refresh button for input: ${inputRef}`);
		
		$input.before($button);
		
		this.eventManager.addHandler($button, 'click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			HAScaleLogger.info('UI', `Refresh button clicked for input: ${inputRef}`);
			$(document).trigger('HAScale.ClearInput', [$input]);
		});
	}

	isWeightInput(element) {
		if (!element || !$(element).is('input')) return false;
		
		const $element = $(element);
		
		if ($element.prop('readonly') || $element.prop('disabled')) {
			return false;
		}
		
		if (this._checkElementAttributes(element)) {
			return true;
		}
		
		if (this._checkDataAttributes($element)) {
			return true;
		}
		
		return this._checkLabelText($element, element.id);
	}

	_checkElementAttributes(element) {
		const weightTerms = ['weight', 'amount', 'quantity'];
		const attributes = [
			element.id?.toLowerCase() || '',
			element.name?.toLowerCase() || '',
			element.className?.toLowerCase() || ''
		];
		
		return attributes.some(attr => 
			weightTerms.some(term => attr.includes(term))
		);
	}

	_checkDataAttributes($element) {
		const dataAttrs = $element.data();
		if (!dataAttrs || typeof dataAttrs !== 'object') {
			return false;
		}
		
		const weightTerms = ['weight', 'amount', 'quantity'];
		
		return Object.values(dataAttrs).some(value => {
			if (value == null) return false;
			const strValue = String(value).toLowerCase();
			return weightTerms.some(term => strValue.includes(term));
		});
	}

	_checkLabelText($element, id) {
		const weightTerms = ['weight', 'amount', 'quantity'];
		let label = null;
		
		if (id && id.trim()) {
			label = $(`label[for="${id}"]`);
		}
		
		if (!label || label.length === 0) {
			label = $element.closest('label');
			if (label.length === 0) {
				label = $element.siblings('label');
			}
		}
		
		if (!label || label.length === 0) {
			const container = $element.closest('.form-group, .input-group, .field');
			if (container.length > 0) {
				label = container.find('label').first();
			}
		}
		
		if (label && label.length > 0) {
			const labelText = label.text().toLowerCase();
			return weightTerms.some(term => labelText.includes(term));
		}
		
		return false;
	}

	addConfigurationUI() {
		const nightModeItem = $('.dropdown-item:contains("Night mode")').first();
		if (nightModeItem.length > 0) {
			nightModeItem.before(HAScaleTemplateGenerator.generateMenuButton());
		}
		
		this.addConfigModal();
	}

	addConfigModal() {
		if ($(HAScaleConstants.CONFIG.SELECTORS.MODAL).length > 0) return;
		
		const modalHtml = HAScaleTemplateGenerator.generateConfigModal();
		
		$('body').append(modalHtml);
		
		this.eventManager.addGlobalHandler('show.bs.modal', (e) => {
			if (!$(e.target).is(HAScaleConstants.CONFIG.SELECTORS.MODAL)) return;
			const controller = Grocy.Components.HomeAssistantScale.Controller;
			if (controller) {
				const config = controller.model.config;
				const hasAuth = controller.model.hasValidAuth();
				const authState = hasAuth ? 
					this.authUIManager.authStates.AUTHENTICATED : 
					this.authUIManager.authStates.UNAUTHENTICATED;
				
				this.authUIManager.updateAuthUI(authState, config);
				HAScaleLogger.debug('UI', 'Modal opened with auth state:', authState, 'config:', config);
			}
		});
		
		this._setupConfigEventHandlers();
	}

	_setupConfigEventHandlers() {
		const elements = this.authUIManager._getModalElements();
		
		this.eventManager.addHandler(elements.configSave, 'click', async () => {
			HAScaleLogger.debug('UI', 'Save & Test button clicked');
			
			const controller = Grocy.Components.HomeAssistantScale.Controller;
			if (!controller) {
				HAScaleUtils.showNotification('error', 'Controller not available');
				return;
			}
			
			const config = controller.model.config;
			if (!config.haUrl) {
				HAScaleUtils.showNotification('error', 'Please enter Home Assistant URL first');
				return;
			}
			
			if (!controller.model.hasValidAuth()) {
				HAScaleUtils.showNotification('error', 'Please complete authentication first');
				return;
			}
			
			const haUrl = HAScaleUtils.sanitizeUrl(elements.urlInput.val());
			const scaleEntityId = HAScaleUtils.sanitizeEntityId(elements.entityInput.val());
			
			if (!haUrl || !scaleEntityId) {
				HAScaleUtils.showNotification('error', 'Please fill in Home Assistant URL and Scale Entity ID');
				return;
			}
			
			try {
				elements.configSave.prop('disabled', true).html('<i class="fa-solid fa-spinner fa-spin"></i> Validating...');
				
				HAScaleLogger.info('UI', `Validating entity: ${scaleEntityId}`);
				
				const isValid = await this.validateEntityWithAuth({
					haUrl: haUrl,
					scaleEntityId: scaleEntityId,
					authMethod: controller.model.config.authMethod
				});
				
				if (!isValid) {
					return;
				}
				
				controller.model.updateConfig({
					haUrl: haUrl,
					scaleEntityId: scaleEntityId,
					authMethod: controller.model.config.authMethod
				});
				
				elements.configSave.html('<i class="fa-solid fa-spinner fa-spin"></i> Testing...');
				
				HAScaleLogger.info('UI', `Testing connection: ${haUrl}`);
				
				const connectionSuccess = await controller.connectionService.connect();
				
				if (connectionSuccess) {
					HAScaleUtils.showNotification('success', 'Configuration saved and tested successfully!');
					elements.modal.modal('hide');
				} else {
					HAScaleUtils.showNotification('error', 'Configuration test failed. Please check your settings.');
				}
			} catch (error) {
				HAScaleLogger.error('UI', 'Configuration test failed:', error);
				HAScaleUtils.showNotification('error', 'Configuration test failed. Please check your settings.');
			} finally {
				elements.configSave.prop('disabled', false).html('Save & Test');
			}
		});
		
		this.eventManager.addHandler(elements.oauthSigninBtn, 'click', async () => {
			const rawUrl = elements.urlInput.val();
			const haUrl = HAScaleUtils.sanitizeUrl(rawUrl);
			if (!HAScaleUtils.validateUrl(haUrl, HAScaleUtils.showNotification)) {
				return;
			}
			
			HAScaleStorageService.set(HAScaleConstants.CONFIG.STORAGE_KEYS.HA_URL, haUrl);
			
			try {
				elements.oauthSigninBtn.prop('disabled', true).html('<i class="fa-solid fa-spinner fa-spin"></i> Signing in...');
				
				await this.authManager.createOAuthAuth(haUrl);
				
				const controller = Grocy.Components.HomeAssistantScale.Controller;
				if (controller) {
					controller.model.setAuthMethod(HAScaleConstants.CONFIG.AUTH_METHODS.OAUTH, null);
					controller.model.updateConfig({
						haUrl: haUrl,
						scaleEntityId: controller.model.config.scaleEntityId || '',
						authMethod: HAScaleConstants.CONFIG.AUTH_METHODS.OAUTH
					});
				}
				
				elements.oauthAuthStatus.removeClass('d-none');
				HAScaleUtils.showNotification('success', HAScaleConstants.CONFIG.MESSAGES.OAUTH_SUCCESS);
				this.authUIManager.openModalForEntityConfig();
			} catch (error) {
				HAScaleLogger.error('OAuth', 'OAuth authentication failed:', error);
				HAScaleUtils.showNotification('error', 'OAuth authentication failed. Please try again.');
			} finally {
				elements.oauthSigninBtn.prop('disabled', false).html('<i class="fa-solid fa-home"></i> Sign in with Home Assistant');
			}
		});
		
		this.eventManager.addHandler(elements.longLivedBtn, 'click', () => {
			this.authUIManager.showLongLivedTokenInput();
		});
		
		this.eventManager.addHandler(elements.tokenValidateBtn, 'click', async () => {
			const rawUrl = elements.urlInput.val();
			const haUrl = HAScaleUtils.sanitizeUrl(rawUrl);
			const token = elements.tokenField.val();
			
			if (!haUrl || !HAScaleUtils.validateUrl(haUrl, HAScaleUtils.showNotification)) {
				return;
			}
			
			if (!token || !HAScaleUtils.validateToken(token, HAScaleUtils.showNotification)) {
				return;
			}
			
			try {
				elements.tokenValidateBtn.prop('disabled', true).html('<i class="fa-solid fa-spinner fa-spin"></i> Saving...');
				
				const controller = Grocy.Components.HomeAssistantScale.Controller;
				if (controller) {
					controller.model.setAuthMethod(HAScaleConstants.CONFIG.AUTH_METHODS.LONG_LIVED, token);
					controller.model.updateConfig({
						haUrl: haUrl,
						scaleEntityId: controller.model.config.scaleEntityId || '',
						authMethod: HAScaleConstants.CONFIG.AUTH_METHODS.LONG_LIVED
					});
				}
				
				elements.longLivedAuthStatus.removeClass('d-none');
				HAScaleUtils.showNotification('success', 'Long-lived token saved successfully!');
			} catch (error) {
				HAScaleLogger.error('UI', 'Token save error:', error);
				HAScaleUtils.showNotification('error', 'Failed to save token. Please try again.');
			} finally {
				elements.tokenValidateBtn.prop('disabled', false).html('<i class="fa-solid fa-check"></i> Save Token');
			}
		});
		
		this.eventManager.addHandler(elements.logoutBtn, 'click', () => {
			const controller = Grocy.Components.HomeAssistantScale.Controller;
			if (controller) {
				const currentConfig = controller.model.config;
				controller.model.clearAllAuth();
				controller.model.updateConfig({
					haUrl: currentConfig.haUrl,
					scaleEntityId: currentConfig.scaleEntityId,
					authMethod: null
				});
			}
			
			elements.tokenField.val('');
			
			HAScaleUtils.showNotification('info', HAScaleConstants.CONFIG.MESSAGES.LOGOUT_SUCCESS);
		});
		
		this.eventManager.addHandler(elements.logLevelSelect, 'change', (e) => {
			const newLevel = parseInt(e.target.value);
			HAScaleLogger.setLevel(newLevel);
			HAScaleLogger.info('UI', `Log level changed to: ${HAScaleLogger.LEVEL_NAMES[newLevel]}`);
		});
	}

	async validateEntityWithAuth(config) {
		const authMethods = HAScaleConstants.CONFIG.AUTH_METHODS;
		
		try {
			let auth;
			
			if (config.authMethod === authMethods.OAUTH) {
				try {
					auth = await this.authManager.createOAuthAuth(config.haUrl);
				} catch (error) {
					throw new Error('OAuth tokens not available for validation');
				}
			} else if (config.authMethod === authMethods.LONG_LIVED) {
				auth = this.authManager.createLongLivedAuth(config.haUrl, config.authData);
			}
			
			if (!auth) {
				throw new Error('Failed to create authentication for validation');
			}
			
			const connection = await window.HAWS.createConnection({ auth });
			
			try {
				const entities = await window.HAWS.getStates(connection);
				const entity = entities.find(state => state.entity_id === config.scaleEntityId);
				
				connection.close();
				
				if (!entity) {
					HAScaleUtils.showNotification('error', HAScaleUtils.formatMessage(HAScaleConstants.CONFIG.MESSAGES.ENTITY_NOT_FOUND, config.scaleEntityId));
					return false;
				}
				
				if (!entity.attributes || typeof entity.attributes.is_stable === 'undefined') {
					HAScaleUtils.showNotification('warning', HAScaleUtils.formatMessage(HAScaleConstants.CONFIG.MESSAGES.ENTITY_MISSING_ATTRIBUTE, config.scaleEntityId));
				} else {
					HAScaleUtils.showNotification('success', HAScaleUtils.formatMessage(HAScaleConstants.CONFIG.MESSAGES.ENTITY_VALIDATED, config.scaleEntityId));
				}
				
				return true;
			} catch (connectionError) {
				connection?.close();
				throw connectionError;
			}
		} catch (error) {
			HAScaleLogger.error('EntityValidation', 'Entity validation error:', error);
			
			if (error.message.includes('auth') || error.message.includes('Authentication')) {
				HAScaleUtils.showNotification('error', HAScaleConstants.CONFIG.MESSAGES.AUTH_FAILED);
			} else if (error.message.includes('timeout') || error.message.includes('network')) {
				HAScaleUtils.showNotification('error', HAScaleConstants.CONFIG.MESSAGES.CONNECTION_TIMEOUT);
			} else {
				HAScaleUtils.showNotification('error', HAScaleConstants.CONFIG.MESSAGES.VALIDATION_FAILED);
			}
			
			return false;
		}
	}
	
}

