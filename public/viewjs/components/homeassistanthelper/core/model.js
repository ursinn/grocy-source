class HAHelperModel {
	constructor() {
		this.config = {
			haUrl: null,
			authMethod: null,
			modules: {}
		};
		this.authManager = new HAHelperAuthManager();
		this.connectionState = {
			isConnected: false,
			connection: null,
			reconnectTimer: null,
			lastError: null
		};
		this.observers = new Set();
		this._debounceTimers = new Map();
	}

	addObserver(observer) {
		this.observers.add(observer);
	}

	removeObserver(observer) {
		this.observers.delete(observer);
	}

	notifyObservers(event, data) {
		try {
			this.observers.forEach(observer => {
				if (typeof observer[event] === 'function') {
					try {
						observer[event](data);
					} catch (error) {
						HAHelperLogger.error('Observer', `Error in observer ${event}:`, error);
					}
				}
			});
		} catch (error) {
			HAHelperLogger.error('Model', 'Error notifying observers:', error);
		}
	}

	updateConfig(config) {
		if (!config || typeof config !== 'object') {
			HAHelperLogger.error('Model', 'Invalid config provided');
			return;
		}
		Object.assign(this.config, config);
		this.saveConfiguration();
		this.notifyObservers('onConfigUpdated', this.config);
	}

	updateConnectionState(state) {
		if (!state || typeof state !== 'object') {
			HAHelperLogger.error('Model', 'Invalid connection state provided');
			return;
		}
		Object.assign(this.connectionState, state);
		this.notifyObservers('onConnectionStateChanged', this.connectionState);
	}



	_debounceNotification(key, callback, delay) {
		if (this._debounceTimers.has(key)) {
			clearTimeout(this._debounceTimers.get(key));
		}
		const timer = setTimeout(() => {
			callback();
			this._debounceTimers.delete(key);
		}, delay);
		this._debounceTimers.set(key, timer);
	}

	loadConfiguration() {
		try {
			const keys = HAHelperConstants.CONFIG.STORAGE_KEYS;
			const defaults = window.Grocy?.HomeAssistantHelper?.defaults || {};

			// Get localStorage deltas
			const urlDelta = HAHelperStorageService.get(keys.HA_URL);
			const authMethodDelta = HAHelperStorageService.get(keys.AUTH_METHOD);
			const modulesDelta = HAHelperStorageService.getJson(keys.MODULES_CONFIG);
			const modulesEnabledDelta = HAHelperStorageService.getJson(keys.MODULES_ENABLED);

			// Use config.php defaults if localStorage is empty, otherwise use localStorage
			this.config = {
				haUrl: urlDelta || defaults.haUrl || null,
				authMethod: authMethodDelta || HAHelperConstants.CONFIG.AUTH_METHODS.LONG_LIVED,
				modules: modulesDelta || defaults.modulesConfig || {},
				modulesEnabled: modulesEnabledDelta || defaults.modulesEnabled || {}
			};

			// Load long-lived token from config.php defaults if available
			if (defaults.longLivedToken && this.config.authMethod === HAHelperConstants.CONFIG.AUTH_METHODS.LONG_LIVED) {
				HAHelperStorageService.set(keys.LONG_LIVED_TOKEN, defaults.longLivedToken);
			}

			return this.isConfigComplete();
		} catch (error) {
			HAHelperLogger.error('Config', 'Error loading configuration:', error);
			return false;
		}
	}

	saveConfiguration() {
		try {
			const keys = HAHelperConstants.CONFIG.STORAGE_KEYS;
			const defaults = window.Grocy?.HomeAssistantHelper?.defaults || {};

			// Only save to localStorage if different from config.php defaults
			const currentUrl = HAHelperUtils.sanitizeUrl(this.config.haUrl || '');
			if (currentUrl !== (defaults.haUrl || '')) {
				HAHelperStorageService.set(keys.HA_URL, currentUrl);
			} else {
				HAHelperStorageService.remove(keys.HA_URL);
			}

			// Save auth method only if different from default (long_lived)
			const defaultAuthMethod = HAHelperConstants.CONFIG.AUTH_METHODS.LONG_LIVED;
			if (this.config.authMethod !== defaultAuthMethod) {
				HAHelperStorageService.set(keys.AUTH_METHOD, this.config.authMethod || null);
			} else {
				HAHelperStorageService.remove(keys.AUTH_METHOD);
			}

			// Save module configurations only if different from defaults
			const currentModules = this.config.modules || {};
			const defaultModules = defaults.modulesConfig || {};
			if (JSON.stringify(currentModules) !== JSON.stringify(defaultModules)) {
				HAHelperStorageService.setJson(keys.MODULES_CONFIG, currentModules);
			} else {
				HAHelperStorageService.remove(keys.MODULES_CONFIG);
			}

			// Save module enabled states only if different from defaults
			const currentModulesEnabled = this.config.modulesEnabled || {};
			const defaultModulesEnabled = defaults.modulesEnabled || {};
			if (JSON.stringify(currentModulesEnabled) !== JSON.stringify(defaultModulesEnabled)) {
				HAHelperStorageService.setJson(keys.MODULES_ENABLED, currentModulesEnabled);
			} else {
				HAHelperStorageService.remove(keys.MODULES_ENABLED);
			}

			HAHelperLogger.debug('Config', 'Configuration saved (deltas only):', this.config);
		} catch (error) {
			HAHelperLogger.error('Config', 'Error saving configuration:', error);
		}
	}

	isConfigComplete() {
		return !!(this.config.haUrl && this.config.authMethod && this.hasValidAuth());
	}

	hasValidAuth() {
		const authMethods = HAHelperConstants.CONFIG.AUTH_METHODS;

		if (this.config.authMethod === authMethods.OAUTH) {
			return this.authManager.hasOAuth();
		} else if (this.config.authMethod === authMethods.LONG_LIVED) {
			return this.authManager.hasLongLived();
		}

		return false;
	}

	setAuthMethod(method, authData) {
		const authMethods = HAHelperConstants.CONFIG.AUTH_METHODS;

		this.config.authMethod = method;

		if (method === authMethods.LONG_LIVED && authData) {
			const keys = HAHelperConstants.CONFIG.STORAGE_KEYS;
			HAHelperStorageService.set(keys.LONG_LIVED_TOKEN, authData);
		}

		this.saveConfiguration();
	}

	clearAllAuth() {
		this.authManager.clearAllAuth();
		this.config.authMethod = null;
	}

	getState() {
		return {
			config: { ...this.config },
			connectionState: { ...this.connectionState }
		};
	}
}
