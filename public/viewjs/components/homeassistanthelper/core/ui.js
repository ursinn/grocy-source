// HAHelperInputManager moved to scale module

class HAHelperAuthUIManager {
	constructor() {
		this.authStates = {
			UNAUTHENTICATED: 'unauthenticated',
			AUTHENTICATED: 'authenticated'
		};
		this.modalSelector = HAHelperConstants.CONFIG.SELECTORS.MODAL;
	}

	_getModalElements() {
		const $container = $(HAHelperConstants.CONFIG.SELECTORS.CONFIG_CONTAINER);
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
		const authMethods = HAHelperConstants.CONFIG.AUTH_METHODS;

		elements.urlInput.val(config.haUrl || '');
		elements.logLevelSelect.val(HAHelperLogger.currentLevel.toString());

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
		setTimeout(() => elements.entityInput.focus(), HAHelperConstants.CONFIG.TIMEOUTS.MODAL_FOCUS_DELAY);
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

class HAHelperStyleManager {
	constructor(config) {
		this.config = config;
	}

	addStyles() {
		if ($(HAHelperConstants.CONFIG.SELECTORS.STYLES).length > 0) return;

		// Core styles only - module-specific styles are managed by their respective modules
		const styles = `
			<style id="ha-helper-styles">
				/* Core helper styles - currently none needed */
				/* Module-specific styles are added by their respective modules */
			</style>
		`;

		$('head').append(styles);
	}
}

class HAHelperTemplateGenerator {
	static generateConfigModal() {
		return `
			<div class="modal fade" id="ha-helper-config-modal" tabindex="-1" role="dialog">
				<div class="modal-dialog" role="document">
					<div class="modal-content ha-helper-config">
						<div class="modal-header">
							<h5 class="modal-title"><i class="fa-solid fa-home"></i> Home Assistant Helper Configuration</h5>
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

							<!-- Module Configuration Sections -->
							<div class="modules-config">
								<hr>
								<h6><i class="fa-solid fa-cogs"></i> Helper Modules</h6>

								<!-- Core Module Enable/Disable Controls (dynamically generated) -->
								<div id="core-module-controls"></div>

								<!-- Individual Module Configuration (shown when enabled) -->
								<div id="individual-module-configs" style="margin-top: 20px;"></div>
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
			<a class="dropdown-item" href="#" id="ha-helper-config-menu" data-toggle="modal" data-target="#ha-helper-config-modal">
				<i class="fa-solid fa-home"></i> Home Assistant Helper
			</a>
			<div class="dropdown-divider"></div>
		`;
	}

}

class HAHelperView {
	constructor() {
		this.config = HAHelperConstants.CONFIG;
		this.initialized = false;
		this._cache = new Map();
		this.eventManager = new HAHelperEventManager();
		// inputManager moved to scale module
		this.authUIManager = new HAHelperAuthUIManager();
		this.styleManager = new HAHelperStyleManager(this.config);
		this.authManager = new HAHelperAuthManager();

		// Module registry will be set by controller
		this.moduleRegistry = null;
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


	// Scale-specific UI methods moved to scale module


	addConfigurationUI() {
		const nightModeItem = $('.dropdown-item:contains("Night mode")').first();
		if (nightModeItem.length > 0) {
			nightModeItem.before(HAHelperTemplateGenerator.generateMenuButton());
		}
		
		this.addConfigModal();
	}

	addConfigModal() {
		if ($(HAHelperConstants.CONFIG.SELECTORS.MODAL).length > 0) return;

		const modalHtml = HAHelperTemplateGenerator.generateConfigModal();

		$('body').append(modalHtml);

		// Generate dynamic module controls and configuration sections
		if (this.moduleRegistry) {
			this._generateModuleControls();
			this._generateModuleConfigSections();
		}

		this.eventManager.addGlobalHandler('show.bs.modal', (e) => {
			if (!$(e.target).is(HAHelperConstants.CONFIG.SELECTORS.MODAL)) return;
			const controller = Grocy.Components.HomeAssistantHelper.Controller;
			if (controller) {
				const config = controller.model.config;
				const hasAuth = controller.model.hasValidAuth();
				const authState = hasAuth ?
					this.authUIManager.authStates.AUTHENTICATED :
					this.authUIManager.authStates.UNAUTHENTICATED;

				this.authUIManager.updateAuthUI(authState, config);

				// Load current module enable states
				if (this.moduleRegistry) {
					const availableModules = this.moduleRegistry.getAvailableModules();
					const modulesEnabled = config.modulesEnabled || {};
					Object.entries(availableModules).forEach(([id]) => {
						$(`#core-module-${id}-enabled`).prop('checked', modulesEnabled[id] === true);
					});

					// Regenerate module config sections to show enabled modules
					this._generateModuleConfigSections();

					// Load modular configurations through module registry
					this.moduleRegistry.loadModuleConfigs(config);
				}

				HAHelperLogger.debug('UI', 'Modal opened with auth state:', authState, 'config:', config);
			}
		});

		this._setupConfigEventHandlers();
	}

	_setupConfigEventHandlers() {
		const elements = this.authUIManager._getModalElements();
		
		this.eventManager.addHandler(elements.configSave, 'click', async () => {
			HAHelperLogger.debug('UI', 'Save & Test button clicked');
			
			const controller = Grocy.Components.HomeAssistantHelper.Controller;
			if (!controller) {
				HAHelperUtils.showNotification('error', 'Controller not available');
				return;
			}
			
			const config = controller.model.config;
			if (!config.haUrl) {
				HAHelperUtils.showNotification('error', 'Please enter Home Assistant URL first');
				return;
			}
			
			if (!controller.model.hasValidAuth()) {
				HAHelperUtils.showNotification('error', 'Please complete authentication first');
				return;
			}
			
			const haUrl = HAHelperUtils.sanitizeUrl(elements.urlInput.val());

			if (!haUrl) {
				HAHelperUtils.showNotification('error', 'Please fill in Home Assistant URL');
				return;
			}

			// Get current module enable states from checkboxes
			const moduleStates = {};
			$('.core-module-checkbox').each((_, checkbox) => {
				const moduleId = $(checkbox).data('module-id');
				const isChecked = $(checkbox).is(':checked');
				moduleStates[moduleId] = isChecked;
				HAHelperLogger.debug('UI', `Checkbox ${moduleId}: checked=${isChecked}`);
			});
			HAHelperLogger.debug('UI', `Module states from checkboxes: ${JSON.stringify(moduleStates)}`);

			// Update module registry based on checkbox states
			if (this.moduleRegistry) {
				await this.moduleRegistry.updateModuleStates(moduleStates);
			}

			// Get configurations from enabled modules and validate
			const moduleConfigs = this.moduleRegistry ? this.moduleRegistry.getModuleConfigs() : {};
			const enabledModules = this.moduleRegistry ? this.moduleRegistry.getEnabledModules() : [];

			// Validate each enabled module
			for (const module of enabledModules) {
				const moduleConfig = moduleConfigs[module.id] || {};
				const fullConfig = {
					haUrl: haUrl,
					authMethod: controller.model.config.authMethod,
					...moduleConfig
				};

				const moduleName = module.constructor.getMetadata().displayName;
				elements.configSave.prop('disabled', true).html(`<i class="fa-solid fa-spinner fa-spin"></i> Validating ${moduleName}...`);

				// Create a simpler validator interface for modules
				const validateEntity = async (entityId) => {
					return await this.validateEntityWithAuth({
						haUrl: haUrl,
						entityId: entityId, // Generic entity ID parameter
						authMethod: controller.model.config.authMethod
					});
				};

				const validationResult = await module.validateConfig(fullConfig, validateEntity);

				if (!validationResult.isValid) {
					elements.configSave.prop('disabled', false).html('Save & Test');
					HAHelperUtils.showNotification('error', validationResult.message || `${moduleName} validation failed`);
					return;
				}
			}

			try {
				// Update configuration with modular settings and module states
				const configToSave = {
					haUrl: haUrl,
					authMethod: controller.model.config.authMethod,
					modules: moduleConfigs,
					modulesEnabled: moduleStates
				};

				controller.model.updateConfig(configToSave);
				
				elements.configSave.html('<i class="fa-solid fa-spinner fa-spin"></i> Testing...');
				
				HAHelperLogger.info('UI', `Testing connection: ${haUrl}`);
				
				const connectionSuccess = await controller.connectionService.connect();
				
				if (connectionSuccess) {
					HAHelperUtils.showNotification('success', 'Configuration saved and tested successfully!');
					elements.modal.modal('hide');
				} else {
					HAHelperUtils.showNotification('error', 'Configuration test failed. Please check your settings.');
				}
			} catch (error) {
				HAHelperLogger.error('UI', 'Configuration test failed:', error);
				HAHelperUtils.showNotification('error', 'Configuration test failed. Please check your settings.');
			} finally {
				elements.configSave.prop('disabled', false).html('Save & Test');
			}
		});
		
		this.eventManager.addHandler(elements.oauthSigninBtn, 'click', async () => {
			const rawUrl = elements.urlInput.val();
			const haUrl = HAHelperUtils.sanitizeUrl(rawUrl);
			if (!HAHelperUtils.validateUrl(haUrl, HAHelperUtils.showNotification)) {
				return;
			}
			
			HAHelperStorageService.set(HAHelperConstants.CONFIG.STORAGE_KEYS.HA_URL, haUrl);
			
			try {
				elements.oauthSigninBtn.prop('disabled', true).html('<i class="fa-solid fa-spinner fa-spin"></i> Signing in...');
				
				await this.authManager.createOAuthAuth(haUrl);
				
				const controller = Grocy.Components.HomeAssistantHelper.Controller;
				if (controller) {
					controller.model.setAuthMethod(HAHelperConstants.CONFIG.AUTH_METHODS.OAUTH, null);
					controller.model.updateConfig({
						haUrl: haUrl,
						authMethod: HAHelperConstants.CONFIG.AUTH_METHODS.OAUTH
					});
				}
				
				elements.oauthAuthStatus.removeClass('d-none');
				HAHelperUtils.showNotification('success', HAHelperConstants.CONFIG.MESSAGES.OAUTH_SUCCESS);
				this.authUIManager.openModalForEntityConfig();
			} catch (error) {
				HAHelperLogger.error('OAuth', 'OAuth authentication failed:', error);
				HAHelperUtils.showNotification('error', 'OAuth authentication failed. Please try again.');
			} finally {
				elements.oauthSigninBtn.prop('disabled', false).html('<i class="fa-solid fa-home"></i> Sign in with Home Assistant');
			}
		});
		
		this.eventManager.addHandler(elements.longLivedBtn, 'click', () => {
			this.authUIManager.showLongLivedTokenInput();
		});
		
		this.eventManager.addHandler(elements.tokenValidateBtn, 'click', async () => {
			const rawUrl = elements.urlInput.val();
			const haUrl = HAHelperUtils.sanitizeUrl(rawUrl);
			const token = elements.tokenField.val();
			
			if (!haUrl || !HAHelperUtils.validateUrl(haUrl, HAHelperUtils.showNotification)) {
				return;
			}
			
			if (!token || !HAHelperUtils.validateToken(token, HAHelperUtils.showNotification)) {
				return;
			}
			
			try {
				elements.tokenValidateBtn.prop('disabled', true).html('<i class="fa-solid fa-spinner fa-spin"></i> Saving...');
				
				const controller = Grocy.Components.HomeAssistantHelper.Controller;
				if (controller) {
					controller.model.setAuthMethod(HAHelperConstants.CONFIG.AUTH_METHODS.LONG_LIVED, token);
					controller.model.updateConfig({
						haUrl: haUrl,
						authMethod: HAHelperConstants.CONFIG.AUTH_METHODS.LONG_LIVED
					});
				}
				
				elements.longLivedAuthStatus.removeClass('d-none');
				HAHelperUtils.showNotification('success', 'Long-lived token saved successfully!');
			} catch (error) {
				HAHelperLogger.error('UI', 'Token save error:', error);
				HAHelperUtils.showNotification('error', 'Failed to save token. Please try again.');
			} finally {
				elements.tokenValidateBtn.prop('disabled', false).html('<i class="fa-solid fa-check"></i> Save Token');
			}
		});
		
		this.eventManager.addHandler(elements.logoutBtn, 'click', () => {
			const controller = Grocy.Components.HomeAssistantHelper.Controller;
			if (controller) {
				const currentConfig = controller.model.config;
				controller.model.clearAllAuth();
				controller.model.updateConfig({
					haUrl: currentConfig.haUrl,
					authMethod: null
				});
			}
			
			elements.tokenField.val('');
			
			HAHelperUtils.showNotification('info', HAHelperConstants.CONFIG.MESSAGES.LOGOUT_SUCCESS);
		});
		
		this.eventManager.addHandler(elements.logLevelSelect, 'change', (e) => {
			const newLevel = parseInt(e.target.value);
			HAHelperLogger.setLevel(newLevel);
			HAHelperLogger.info('UI', `Log level changed to: ${HAHelperLogger.LEVEL_NAMES[newLevel]}`);
		});
	}

	async validateEntityWithAuth(config) {
		const authMethods = HAHelperConstants.CONFIG.AUTH_METHODS;
		
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
				const entity = entities.find(state => state.entity_id === config.entityId);

				connection.close();

				if (!entity) {
					HAHelperUtils.showNotification('error', HAHelperUtils.formatMessage(HAHelperConstants.CONFIG.MESSAGES.ENTITY_NOT_FOUND, config.entityId));
					return false;
				}

				// Entity exists and is accessible
				HAHelperUtils.showNotification('success', HAHelperUtils.formatMessage(HAHelperConstants.CONFIG.MESSAGES.ENTITY_VALIDATED, config.entityId));
				
				return true;
			} catch (connectionError) {
				connection?.close();
				throw connectionError;
			}
		} catch (error) {
			HAHelperLogger.error('EntityValidation', 'Entity validation error:', error);
			
			if (error.message.includes('auth') || error.message.includes('Authentication')) {
				HAHelperUtils.showNotification('error', HAHelperConstants.CONFIG.MESSAGES.AUTH_FAILED);
			} else if (error.message.includes('timeout') || error.message.includes('network')) {
				HAHelperUtils.showNotification('error', HAHelperConstants.CONFIG.MESSAGES.CONNECTION_TIMEOUT);
			} else {
				HAHelperUtils.showNotification('error', HAHelperConstants.CONFIG.MESSAGES.VALIDATION_FAILED);
			}
			
			return false;
		}
	}

	_generateModuleControls() {
		const availableModules = this.moduleRegistry.getAvailableModules();
		const controlsHtml = Object.entries(availableModules).map(([id, moduleInfo]) => {
			return `
				<div class="form-group">
					<div class="custom-control custom-checkbox">
						<input type="checkbox" class="custom-control-input core-module-checkbox"
							   id="core-module-${id}-enabled" data-module-id="${id}">
						<label class="custom-control-label" for="core-module-${id}-enabled">
							<strong>${moduleInfo.displayName}</strong> - ${moduleInfo.description}
						</label>
					</div>
				</div>
			`;
		}).join('');

		$('#core-module-controls').html(controlsHtml);

		// Bind change handlers for module enable/disable
		$('.core-module-checkbox').on('change', async (e) => {
			const moduleId = $(e.target).data('module-id');
			const isEnabled = $(e.target).is(':checked');

			const controller = Grocy.Components.HomeAssistantHelper.Controller;
			if (controller) {
				if (isEnabled) {
					await controller.moduleRegistry.enableModule(moduleId);
				} else {
					await controller.moduleRegistry.disableModule(moduleId);
				}

				// Refresh module config sections
				this._generateModuleConfigSections();

				// Load saved configs into the new form fields
				if (controller && controller.model.config) {
					this.moduleRegistry.loadModuleConfigs(controller.model.config);
				}
			}
		});
	}

	_generateModuleConfigSections() {
		const configSections = this.moduleRegistry.getConfigSections();
		const enabledModules = this.moduleRegistry.getEnabledModuleIds();

		// Clear existing sections
		$('#individual-module-configs').empty();

		// Add sections for enabled modules only
		enabledModules.forEach(moduleId => {
			if (configSections[moduleId]) {
				const sectionHtml = `
					<div id="${moduleId}-config-section" class="module-config-section" style="margin-bottom: 20px;">
						${configSections[moduleId]}
					</div>
				`;
				$('#individual-module-configs').append(sectionHtml);
			}
		});
	}

}

