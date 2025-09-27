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
			this.config = {
				haUrl: HAHelperStorageService.get(keys.HA_URL) || null,
				authMethod: HAHelperStorageService.get(keys.AUTH_METHOD) || null,
				modules: HAHelperStorageService.getJson(keys.MODULES_CONFIG) || {},
				modulesEnabled: HAHelperStorageService.getJson(keys.MODULES_ENABLED) || {}
			};
			return this.isConfigComplete();
		} catch (error) {
			HAHelperLogger.error('Config', 'Error loading configuration:', error);
			return false;
		}
	}

	saveConfiguration() {
		try {
			const keys = HAHelperConstants.CONFIG.STORAGE_KEYS;

			// Save core configuration
			HAHelperStorageService.set(keys.HA_URL, HAHelperUtils.sanitizeUrl(this.config.haUrl || ''));
			HAHelperStorageService.set(keys.AUTH_METHOD, this.config.authMethod || null);

			// Save module configurations
			HAHelperStorageService.setJson(keys.MODULES_CONFIG, this.config.modules || {});

			// Save module enabled states
			HAHelperStorageService.setJson(keys.MODULES_ENABLED, this.config.modulesEnabled || {});

			HAHelperLogger.debug('Config', 'Configuration saved:', this.config);
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
