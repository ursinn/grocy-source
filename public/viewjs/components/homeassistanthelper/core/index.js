import { HAHelperScaleModule } from '../modules/scale/module.js';
import { HAHelperScannerModule } from '../modules/scanner/module.js';

class HAHelperController {
	constructor() {
		this.config = HAHelperConstants.CONFIG;
		this.model = new HAHelperModel();
		this.view = new HAHelperView();
		this.connectionService = new HAHelperConnectionService(this.model);
		// inputService moved to scale module
		this.unitService = new HAHelperUnitService();

		// Initialize module registry
		this.moduleRegistry = new HAHelperModuleRegistry(this);

		// Register available modules
		this.moduleRegistry.registerModule('scale', HAHelperScaleModule);
		this.moduleRegistry.registerModule('scanner', HAHelperScannerModule);

		this.eventHandlers = [];
		// _buttonsAdded and mutationObserver removed - functionality moved to scale module

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
			onConfigUpdated: async (config) => {
				const hasAuth = this.model.hasValidAuth();
				const authState = hasAuth ?
					this.view.authUIManager.authStates.AUTHENTICATED :
					this.view.authUIManager.authStates.UNAUTHENTICATED;
				this.view.authUIManager.updateAuthUI(authState, config);

				this.connectionService.disconnect();

				// Update module states based on configuration
				const moduleConfig = config.modulesEnabled || {};
				await this.moduleRegistry.updateModuleStates(moduleConfig);

				// Load module configurations after they're enabled
				this.moduleRegistry.loadModuleConfigs(config);

				if (this.model.isConfigComplete()) {
					try {
						await this.connectionService.connect();
					} catch (error) {
						HAHelperLogger.error('Controller', 'Connection attempt failed', error);

						if (error.message && error.message.includes('authentication required')) {
							HAHelperLogger.info('Controller', 'Authentication required - showing config modal');
						}
					}
				}
			}
		});
	}

	setupEventHandlers() {
		const eventMap = {
			'HAHelper.ConfigSave': (_, config) => {
				this.model.setAuthMethod(config.authMethod, config.authData);
				this.model.updateConfig(config);
			}
		};

		Object.entries(eventMap).forEach(([event, handler]) => {
			this._addEventHandler($(document), event, handler);
		});

		// Form reset, input handlers, and success detection moved to scale module for proper lifecycle management
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


	async initialize() {
		HAHelperLogger.loadLevel();

		HAHelperLogger.info('Controller', 'Initializing Home Assistant Helper component');

		// Set module registry reference in view
		this.view.moduleRegistry = this.moduleRegistry;
		this.view.initialize();

		await this._handleOAuthCallback();

		if (this.model.loadConfiguration()) {
			HAHelperLogger.info('Controller', 'Configuration loaded, attempting to connect to Home Assistant');
			HAHelperLogger.debug('Controller', 'Config state:', {
				haUrl: this.model.config.haUrl,
				authMethod: this.model.config.authMethod,
				modulesEnabled: this.model.config.modulesEnabled,
				modules: this.model.config.modules,
				isComplete: this.model.isConfigComplete(),
				hasValidAuth: this.model.hasValidAuth()
			});

			// Enable modules based on saved configuration
			const moduleConfig = this.model.config.modulesEnabled || {};
			await this.moduleRegistry.updateModuleStates(moduleConfig);

			// Load module configurations after they're enabled
			this.moduleRegistry.loadModuleConfigs(this.model.config);


			await this.connectionService.connect();
		} else {
			HAHelperLogger.info('Controller', 'No configuration found, connection setup required');
		}
	}

	destroy() {
		const cleanupTasks = [
			() => this.connectionService.disconnect(),
			() => this.view.cleanup(),
			() => this.moduleRegistry.cleanup(),
			() => this.model.observers.clear()
		];

		cleanupTasks.forEach(task => {
			try {
				task();
			} catch (error) {
				HAHelperLogger.error('Cleanup', 'Error during cleanup task:', error);
			}
		});
	}

	cleanup() {
		this.destroy();
	}

	// Generic validation delegation to modules
	async validateModuleConfig(moduleId, config, validateEntity) {
		const module = this.moduleRegistry.getModule(moduleId);
		if (!module || !module.validateConfig) {
			HAHelperLogger.error('Controller', `Module ${moduleId} not found or does not support validation`);
			return false;
		}

		try {
			const result = await module.validateConfig(config, validateEntity);
			return result.isValid || false;
		} catch (error) {
			HAHelperLogger.error('Controller', `Error validating config for module ${moduleId}:`, error);
			return false;
		}
	}

	async _handleOAuthCallback() {
		const urlParams = new URLSearchParams(window.location.search);
		if (urlParams.get('auth_callback') === '1') {
			HAHelperLogger.info('Controller', 'Detected OAuth callback, processing...');

			try {
				const haUrl = HAHelperStorageService.get(HAHelperConstants.CONFIG.STORAGE_KEYS.HA_URL);
				if (!haUrl) {
					HAHelperLogger.error('Controller', 'No HA URL found for OAuth callback');
					return;
				}

				await this.model.authManager.createOAuthAuth(haUrl);

				this.model.setAuthMethod(HAHelperConstants.CONFIG.AUTH_METHODS.OAUTH, null);
				this.model.updateConfig({
					haUrl: haUrl,
					authMethod: HAHelperConstants.CONFIG.AUTH_METHODS.OAUTH,
					modules: this.model.config.modules || {},
					modulesEnabled: this.model.config.modulesEnabled || {}
				});

				HAHelperUtils.showNotification('success', HAHelperConstants.CONFIG.MESSAGES.OAUTH_SUCCESS);

				this.view.authUIManager.openModalForEntityConfig();

				window.history.replaceState({}, document.title, window.location.pathname);

			} catch (error) {
				HAHelperLogger.error('Controller', 'OAuth callback processing failed:', error);
				HAHelperUtils.showNotification('error', 'OAuth authentication failed. Please try again.');
			}
		}
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

	// Clean API for modules to get their own configuration
	getModuleConfig(moduleId) {
		return this.model.config.modules && this.model.config.modules[moduleId]
			? this.model.config.modules[moduleId]
			: {};
	}
}

Grocy.Components.HomeAssistantHelper = {
	Controller: null,
	InitDone: false,

	async Init() {
		if (this.InitDone) {
			HAHelperLogger.debug('Init', 'Component already initialized, skipping');
			return;
		}

		HAHelperLogger.info('Init', 'Starting Home Assistant Helper component initialization');

		this.Controller = new HAHelperController();
		await this.Controller.initialize();
		this.InitDone = true;

		HAHelperLogger.info('Init', 'Home Assistant Helper component initialization completed');
	}
};

Grocy.Components.HomeAssistantHelper.Init();

$(window).on('beforeunload', () => {
	if (Grocy.Components.HomeAssistantHelper.Controller) {
		Grocy.Components.HomeAssistantHelper.Controller.cleanup();
	}
});
