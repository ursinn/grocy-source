class HAScaleModel {
	constructor() {
		this.config = {
			haUrl: null,
			scaleEntityId: null,
			authMethod: null
		};
		this.authManager = new HAScaleAuthManager();
		this.connectionState = {
			isConnected: false,
			connection: null,
			reconnectTimer: null,
			lastError: null
		};
		this.scaleData = {
			lastWeight: null,
			lastStableWeight: null,
			isStable: false,
			lastUpdate: null
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
						HAScaleLogger.error('Observer', `Error in observer ${event}:`, error);
					}
				}
			});
		} catch (error) {
			HAScaleLogger.error('Model', 'Error notifying observers:', error);
		}
	}

	updateConfig(config) {
		if (!config || typeof config !== 'object') {
			HAScaleLogger.error('Model', 'Invalid config provided');
			return;
		}
		Object.assign(this.config, config);
		this.saveConfiguration();
		this.notifyObservers('onConfigUpdated', this.config);
	}

	updateConnectionState(state) {
		if (!state || typeof state !== 'object') {
			HAScaleLogger.error('Model', 'Invalid connection state provided');
			return;
		}
		Object.assign(this.connectionState, state);
		this.notifyObservers('onConnectionStateChanged', this.connectionState);
	}

	updateScaleData(data) {
		if (!data || typeof data !== 'object') {
			HAScaleLogger.error('Model', 'Invalid scale data provided');
			return;
		}
		
		Object.assign(this.scaleData, {
			...data,
			lastUpdate: new Date()
		});
		
		if (data.isStable && data.lastWeight !== null && !isNaN(data.lastWeight)) {
			this._debounceNotification('stableWeight', () => {
				this.scaleData.lastStableWeight = data.lastWeight;
				this.notifyObservers('onStableWeightChanged', {
					weight: data.lastWeight,
					attributes: data.attributes || {}
				});
			}, HAScaleConstants.CONFIG.STABLE_WEIGHT_DEBOUNCE);
		}
		
		this.notifyObservers('onScaleDataUpdated', this.scaleData);
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
			const keys = HAScaleConstants.CONFIG.STORAGE_KEYS;
			this.config = {
				haUrl: HAScaleStorageService.get(keys.HA_URL) || null,
				scaleEntityId: HAScaleStorageService.get(keys.SCALE_ENTITY_ID) || null,
				authMethod: HAScaleStorageService.get(keys.AUTH_METHOD) || null
			};
			return this.isConfigComplete();
		} catch (error) {
			HAScaleLogger.error('Config', 'Error loading configuration:', error);
			return false;
		}
	}

	saveConfiguration() {
		try {
			const keys = HAScaleConstants.CONFIG.STORAGE_KEYS;
			const { haUrl = '', scaleEntityId = '', authMethod = null } = this.config;
			
			const sanitizedConfig = {
				haUrl: HAScaleUtils.sanitizeUrl(haUrl),
				scaleEntityId: HAScaleUtils.sanitizeEntityId(scaleEntityId),
				authMethod: authMethod
			};
			
			HAScaleStorageService.set(keys.HA_URL, sanitizedConfig.haUrl);
			HAScaleStorageService.set(keys.SCALE_ENTITY_ID, sanitizedConfig.scaleEntityId);
			HAScaleStorageService.set(keys.AUTH_METHOD, sanitizedConfig.authMethod);
		} catch (error) {
			HAScaleLogger.error('Config', 'Error saving configuration:', error);
		}
	}

	isConfigComplete() {
		return !!(this.config.haUrl && this.config.scaleEntityId && this.config.authMethod && this.hasValidAuth());
	}
	
	hasValidAuth() {
		const authMethods = HAScaleConstants.CONFIG.AUTH_METHODS;
		
		if (this.config.authMethod === authMethods.OAUTH) {
			return this.authManager.hasOAuth();
		} else if (this.config.authMethod === authMethods.LONG_LIVED) {
			return this.authManager.hasLongLived();
		}
		
		return false;
	}
	
	setAuthMethod(method, authData) {
		const authMethods = HAScaleConstants.CONFIG.AUTH_METHODS;
		
		this.config.authMethod = method;
		
		if (method === authMethods.LONG_LIVED && authData) {
			const keys = HAScaleConstants.CONFIG.STORAGE_KEYS;
			HAScaleStorageService.set(keys.LONG_LIVED_TOKEN, authData);
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
			connectionState: { ...this.connectionState },
			scaleData: { ...this.scaleData }
		};
	}
}