class HAScaleConstants {
	static get CONFIG() {
		return Object.freeze({
			CACHE_TTL: 30000,
			STABLE_WEIGHT_DEBOUNCE: 100,
			RECONNECT_DELAY: 5000,
			CONNECTION_TIMEOUT: 10000,
			INPUT_DEBOUNCE: 100,
			FORM_RESET_DELAY: 10,
			SUCCESS_RESET_DELAY: 100,
			HOTKEY_CLEANUP_DELAY: 150,
			INIT_DELAY: 100,
			
			DEFAULT_DECIMAL_PLACES: 4,
			MAX_DECIMAL_PLACES: 10,
			MIN_DECIMAL_PLACES: 0,
			
			STORAGE_PREFIX: 'grocy.ha_scale',
			
			STORAGE_KEYS: {
				HA_URL: 'url',
				SCALE_ENTITY_ID: 'entity_id',
				DEBUG_MODE: 'debug',
				OAUTH_STATE: 'oauth_state',
				OAUTH_TOKENS: 'oauth_tokens',
				LONG_LIVED_TOKEN: 'long_lived_token',
				AUTH_METHOD: 'auth_method'
			},
			
			AUTH_METHODS: {
				OAUTH: 'oauth',
				LONG_LIVED: 'long_lived'
			},
			
			TIMEOUTS: {
				TOKEN_VALIDATION: 30000,
				DEFAULT_TOKEN_EXPIRY: 1800,
				MODAL_FOCUS_DELAY: 500,
				NOTIFICATION_DEFAULT: 3000,
				NOTIFICATION_QUICK: 1500,
				NOTIFICATION_MEDIUM: 2000
			},

			OAUTH: {
				CLIENT_ID: window.location.origin,
				GRANT_TYPE: 'authorization_code'
			},

			SELECTORS: {
				MODAL: '#ha-scale-config-modal',
				STYLES: '#ha-scale-styles',
				CONFIG_CONTAINER: '.ha-scale-config',
				INPUT_SELECTOR: 'input[type="text"], input[type="number"], input:not([type])',
				TOAST_CONTAINER: '#toast-container'
			},

			UNIT_CONVERSIONS: {
				'g': 1, 'gram': 1, 'grams': 1,
				'kg': 1000, 'kilo': 1000, 'kilogram': 1000, 'kilograms': 1000,
				'lb': 453.592, 'lbs': 453.592, 'pound': 453.592, 'pounds': 453.592,
				'oz': 28.3495, 'ounce': 28.3495, 'ounces': 28.3495
			},

			NOTIFICATION: {
				POSITION: 'toast-bottom-right'
			},

			HOTKEYS: {
				TRIGGER_SCALE: 'Alt+S'
			},

			RESET_ACTIONS: {
				SUCCESS_DETECTION: 'success-detection',
				FORM_RESET: 'form-reset'
			},

			VALIDATION: {
				PORT_MIN: 1,
				PORT_MAX: 65535,
				TOKEN_MIN_LENGTH: 8,
				TOKEN_MAX_LENGTH: 500,
				ENTITY_MAX_LENGTH: 100
			},

			ANIMATION: {
				PULSE_DURATION: '1.5s',
				SCALE_NORMAL: 1,
				SCALE_ENLARGED: 1.2,
				OPACITY_NORMAL: 1,
				OPACITY_DIMMED: 0.7
			},

			HTTP_STATUS: {
				SERVER_ERROR_MIN: 500,
				SERVER_ERROR_MAX: 600
			},

			LOGGING: {
				TIMESTAMP_START: 11,
				TIMESTAMP_END: 23,
				LEVEL_NAME_PADDING: 7
			},
			
			CSS_CLASSES: {
				AUTO_TARGETED: 'ha-scale-auto-targeted',
				BUTTON_BASE: 'ha-scale-refresh-btn',
				BUTTON_WAITING: 'ha-scale-waiting-btn',
				BUTTON_SUCCESS: 'btn-success',
				BUTTON_WARNING: 'btn-warning',
				BUTTON_IDLE: 'btn-outline-secondary',
				INPUT_FULFILLED: 'ha-scale-fulfilled',
				INPUT_WAITING: 'ha-scale-waiting',
				BOOTSTRAP_HIDDEN: 'd-none',
				TOAST_SUCCESS: 'toast-success'
			},

			MESSAGES: {
				URL_REQUIRED: 'Please enter the Home Assistant URL',
				TOKEN_REQUIRED: 'Please enter the access token or sign in with Home Assistant',
				ENTITY_REQUIRED: 'Please enter the scale entity ID (e.g. sensor.kitchen_scale)',
				URL_INVALID: 'Please enter a valid Home Assistant URL (e.g., http://homeassistant.local:8123)',
				OAUTH_SUCCESS: 'Successfully signed in with Home Assistant! Please enter your scale entity ID below to complete the setup.',
				OAUTH_FAILED: 'Failed to exchange authorization code for token. Please try again.',
				OAUTH_STATE_MISMATCH: 'OAuth state mismatch. Please try again.',
				OAUTH_ERROR: 'OAuth flow error. Please try again.',
				VALIDATION_FAILED: 'Failed to validate entity. Please check your configuration and try again.',
				AUTH_FAILED: 'Authentication failed. Please check your access token or sign in again.',
				CONNECTION_TIMEOUT: 'Connection timeout. Please check your Home Assistant URL and network connection.',
				LOGOUT_SUCCESS: 'Disconnected from Home Assistant. You can sign in again to reconnect.',
				SCALE_READING_CANCELLED: 'Scale reading cancelled',
				NO_WEIGHT_INPUTS: 'No weight inputs found on this page',
				WAITING_FOR_WEIGHT: 'Waiting for stable weight reading',
				CONFIG_REQUIRED: 'Please configure Home Assistant connection first',
				WEIGHT_PROCESSING_ERROR: 'Error processing weight from scale',
				TOKEN_TOO_SHORT: 'Access token appears to be too short.',
				TOKEN_TOO_LONG: 'Access token appears to be too long.',
				TOKEN_INVALID_CHARS: 'Access token contains invalid characters.',
				ENTITY_INVALID_FORMAT: 'Entity ID must follow format: domain.entity_name',
				ENTITY_TOO_LONG: 'Entity ID is too long.',
				ENTITY_RESERVED_DOMAIN: 'Entity ID uses a reserved domain. Please ensure this is a sensor entity.',
				ENTITY_NOT_FOUND: 'Entity "{0}" not found in Home Assistant',
				ENTITY_MISSING_ATTRIBUTE: 'Entity "{0}" found but missing \'is_stable\' attribute. Scale integration may not work correctly.',
				ENTITY_VALIDATED: 'Entity "{0}" validated successfully!',
				CONTROLLER_NOT_AVAILABLE: 'Controller not available',
				HA_URL_REQUIRED_FIRST: 'Please enter Home Assistant URL first',
				AUTH_REQUIRED_FIRST: 'Please complete authentication first',
				URL_AND_ENTITY_REQUIRED: 'Please fill in Home Assistant URL and Scale Entity ID',
				CONFIG_SAVED_SUCCESS: 'Configuration saved and tested successfully!',
				CONFIG_TEST_FAILED: 'Configuration test failed. Please check your settings.',
				TOKEN_VALIDATED_SUCCESS: 'Long-lived token validated successfully!',
				TOKEN_VALIDATION_FAILED: 'Token validation failed. Please check your token and URL.'
			}
		});
	}
}

class HAScaleStorageService {
	static _getKey(key) {
		return `${HAScaleConstants.CONFIG.STORAGE_PREFIX}.${key}`;
	}

	static get(key) {
		try {
			return localStorage.getItem(this._getKey(key)) || null;
		} catch (error) {
			HAScaleLogger.error('Storage', 'Error reading from storage:', error);
			return null;
		}
	}

	static set(key, value) {
		try {
			if (value === null || value === undefined) {
				localStorage.removeItem(this._getKey(key));
			} else {
				localStorage.setItem(this._getKey(key), value);
			}
		} catch (error) {
			HAScaleLogger.error('Storage', 'Error writing to storage:', error);
		}
	}

	static remove(key) {
		try {
			localStorage.removeItem(this._getKey(key));
		} catch (error) {
			HAScaleLogger.error('Storage', 'Error removing from storage:', error);
		}
	}

	static getJson(key) {
		try {
			const value = this.get(key);
			return value ? JSON.parse(value) : null;
		} catch (error) {
			HAScaleLogger.error('Storage', 'Error parsing JSON from storage:', error);
			return null;
		}
	}

	static setJson(key, value) {
		try {
			if (value === null || value === undefined) {
				this.remove(key);
			} else {
				this.set(key, JSON.stringify(value));
			}
		} catch (error) {
			HAScaleLogger.error('Storage', 'Error storing JSON to storage:', error);
		}
	}
}

class HAScaleLogger {
	static LOG_LEVELS = {
		ERROR: 0,
		WARN: 1,
		INFO: 2,
		DEBUG: 3
	};

	static LEVEL_NAMES = {
		[this.LOG_LEVELS.ERROR]: 'ERROR',
		[this.LOG_LEVELS.WARN]: 'WARN',
		[this.LOG_LEVELS.INFO]: 'INFO',
		[this.LOG_LEVELS.DEBUG]: 'DEBUG'
	};

	static _throttleState = new Map();
	static _currentLevel = this.LOG_LEVELS.INFO;

	static get currentLevel() {
		return this._currentLevel;
	}
	
	static setLevel(level) {
		if (level >= this.LOG_LEVELS.ERROR && level <= this.LOG_LEVELS.DEBUG) {
			this._currentLevel = level;
			HAScaleStorageService.set('log_level', level.toString());
		}
	}
	
	static loadLevel() {
		const storedLevel = HAScaleStorageService.get('log_level');
		if (storedLevel) {
			this._currentLevel = parseInt(storedLevel);
		}
	}
	
	static _log(level, category, message, ...args) {
		if (level > this.currentLevel) return;
		
		const timestamp = new Date().toISOString().substring(HAScaleConstants.CONFIG.LOGGING.TIMESTAMP_START, HAScaleConstants.CONFIG.LOGGING.TIMESTAMP_END);
		const levelName = this.LEVEL_NAMES[level];
		const levelPart = `[${levelName}]`.padEnd(HAScaleConstants.CONFIG.LOGGING.LEVEL_NAME_PADDING);
		const prefix = `[${timestamp}] ${levelPart} HA Scale ${category}:`;
		
		switch (level) {
			case this.LOG_LEVELS.ERROR:
				console.error(prefix, message, ...args);
				break;
			case this.LOG_LEVELS.WARN:
				console.warn(prefix, message, ...args);
				break;
			case this.LOG_LEVELS.INFO:
				console.info(prefix, message, ...args);
				break;
			case this.LOG_LEVELS.DEBUG:
				console.log(prefix, message, ...args);
				break;
		}
	}
	
	static error(category, message, ...args) {
		this._log(this.LOG_LEVELS.ERROR, category, message, ...args);
	}
	
	static warn(category, message, ...args) {
		this._log(this.LOG_LEVELS.WARN, category, message, ...args);
	}
	
	static info(category, message, ...args) {
		this._log(this.LOG_LEVELS.INFO, category, message, ...args);
	}
	
	static debug(category, message, ...args) {
		this._log(this.LOG_LEVELS.DEBUG, category, message, ...args);
	}
	
	static throttled(key, intervalMs, logCallback) {
		const now = Date.now();
		const lastLogged = this._throttleState.get(key);
		
		if (!lastLogged || (now - lastLogged) >= intervalMs) {
			this._throttleState.set(key, now);
			logCallback();
		}
	}
}


class HAScaleUtils {
	static getInputReference($input) {
		if (!$input || !$input.length) return 'null-input';
		
		const id = $input.attr('id');
		if (id) return `#${id}`;
		
		const name = $input.attr('name');
		if (name) return `[name="${name}"]`;
		
		const className = $input.attr('class');
		if (className) return `.${className}`;
		
		return `input[${$input.prop('tagName').toLowerCase()}]`;
	}

	static formatMessage(template, ...args) {
		return template.replace(/{(\d+)}/g, (match, index) => args[index] || match);
	}

	static sanitizeUrl(url) {
		if (!url || typeof url !== 'string') return '';
		return url.trim()
			.replace(/[<>"'`]/g, '')
			.replace(/javascript:/gi, '')
			.replace(/data:/gi, '')
			.replace(/vbscript:/gi, '');
	}

	static sanitizeToken(token) {
		if (!token || typeof token !== 'string') return '';
		return token.trim().replace(/[^a-zA-Z0-9.\-_]/g, '');
	}

	static sanitizeEntityId(entityId) {
		if (!entityId || typeof entityId !== 'string') return '';
		return entityId.trim().toLowerCase().replace(/[^a-z0-9._]/g, '');
	}

	static validateUrl(url, showNotification) {
		try {
			const urlObj = new URL(url);
			if (!['http:', 'https:'].includes(urlObj.protocol) || 
				urlObj.hostname.includes('<') || urlObj.hostname.includes('>')) {
				if (showNotification) showNotification('error', HAScaleConstants.CONFIG.MESSAGES.URL_INVALID);
				return false;
			}
			if (urlObj.port && (parseInt(urlObj.port) < HAScaleConstants.CONFIG.VALIDATION.PORT_MIN || parseInt(urlObj.port) > HAScaleConstants.CONFIG.VALIDATION.PORT_MAX)) {
				if (showNotification) showNotification('error', HAScaleConstants.CONFIG.MESSAGES.URL_INVALID);
				return false;
			}
			return true;
		} catch (error) {
			if (showNotification) showNotification('error', HAScaleConstants.CONFIG.MESSAGES.URL_INVALID);
			return false;
		}
	}

	static validateToken(token, showNotification) {
		if (token.length < HAScaleConstants.CONFIG.VALIDATION.TOKEN_MIN_LENGTH) {
			if (showNotification) showNotification('error', HAScaleConstants.CONFIG.MESSAGES.TOKEN_TOO_SHORT);
			return false;
		}
		if (token.length > HAScaleConstants.CONFIG.VALIDATION.TOKEN_MAX_LENGTH) {
			if (showNotification) showNotification('error', HAScaleConstants.CONFIG.MESSAGES.TOKEN_TOO_LONG);
			return false;
		}
		if (!/^[a-zA-Z0-9.\-_]+$/.test(token)) {
			if (showNotification) showNotification('error', HAScaleConstants.CONFIG.MESSAGES.TOKEN_INVALID_CHARS);
			return false;
		}
		return true;
	}

	static validateEntityId(entityId, showNotification) {
		if (!/^[a-z][a-z0-9_]*\.[a-z0-9_]+$/.test(entityId)) {
			if (showNotification) showNotification('error', HAScaleConstants.CONFIG.MESSAGES.ENTITY_INVALID_FORMAT);
			return false;
		}
		if (entityId.length > HAScaleConstants.CONFIG.VALIDATION.ENTITY_MAX_LENGTH) {
			if (showNotification) showNotification('error', HAScaleConstants.CONFIG.MESSAGES.ENTITY_TOO_LONG);
			return false;
		}
		const reservedPrefixes = ['script.', 'automation.', 'scene.'];
		if (reservedPrefixes.some(prefix => entityId.startsWith(prefix))) {
			if (showNotification) showNotification('warning', HAScaleConstants.CONFIG.MESSAGES.ENTITY_RESERVED_DOMAIN);
		}
		return true;
	}


	static debounce(func, wait) {
		return Delay(func, wait);
	}

	static showNotification(type, message, options = {}) {
		if (typeof toastr !== 'undefined') {
			const defaultOptions = {
				timeOut: HAScaleConstants.CONFIG.TIMEOUTS.NOTIFICATION_DEFAULT,
				positionClass: HAScaleConstants.CONFIG.NOTIFICATION.POSITION,
				...options
			};
			toastr[type](message, '', defaultOptions);
		}
	}
}

class HAScaleModel {
	constructor() {
		this.config = {
			haUrl: null,
			scaleEntityId: null,
			authMethod: null
		};
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
		const keys = HAScaleConstants.CONFIG.STORAGE_KEYS;
		const authMethods = HAScaleConstants.CONFIG.AUTH_METHODS;
		
		if (this.config.authMethod === authMethods.OAUTH) {
			const oauthTokens = HAScaleStorageService.getJson(keys.OAUTH_TOKENS);
			return !!(oauthTokens && oauthTokens.access_token);
		} else if (this.config.authMethod === authMethods.LONG_LIVED) {
			const longLivedToken = HAScaleStorageService.get(keys.LONG_LIVED_TOKEN);
			return !!(longLivedToken && longLivedToken.length > 0);
		}
		
		return false;
	}
	
	setAuthMethod(method, authData) {
		const keys = HAScaleConstants.CONFIG.STORAGE_KEYS;
		const authMethods = HAScaleConstants.CONFIG.AUTH_METHODS;
		
		this.clearAllAuth();
		
		this.config.authMethod = method;
		
		if (method === authMethods.OAUTH) {
			HAScaleStorageService.setJson(keys.OAUTH_TOKENS, authData);
		} else if (method === authMethods.LONG_LIVED) {
			HAScaleStorageService.set(keys.LONG_LIVED_TOKEN, authData);
		}
		
		this.saveConfiguration();
	}
	
	clearAllAuth() {
		const keys = HAScaleConstants.CONFIG.STORAGE_KEYS;
		HAScaleStorageService.remove(keys.OAUTH_TOKENS);
		HAScaleStorageService.remove(keys.LONG_LIVED_TOKEN);
		HAScaleStorageService.remove(keys.AUTH_METHOD);
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
				
				/* Button states */
				.${css.BUTTON_BASE}.${css.BUTTON_SUCCESS} { color: #fff; }
				.${css.BUTTON_BASE}.${css.BUTTON_WARNING} { color: #fff; }
				.${css.BUTTON_BASE}.${css.BUTTON_WAITING} {
					color: #007bff !important;
					border-color: #007bff !important;
				}
				.${css.BUTTON_BASE}.${css.BUTTON_WAITING} i {
					animation: ha-scale-pulse ${HAScaleConstants.CONFIG.ANIMATION.PULSE_DURATION} ease-in-out infinite;
				}
				
				/* Animations */
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

/**
 * OAuth Token Manager - handles OAuth token storage, expiration, and refresh logic
 * Prevents automatic redirects to HA login page
 */
class HAScaleOAuthTokenManager {
	constructor() {
		this.constants = HAScaleConstants.CONFIG;
	}

	/**
	 * Save OAuth tokens with proper expiration tracking
	 */
	saveTokens(tokens) {
		try {
			const keys = this.constants.STORAGE_KEYS;
			if (tokens) {
				// Store complete OAuth token data with proper expiration tracking
				const tokenData = {
					...tokens,
					hassUrl: tokens.hassUrl || tokens.hassUrl,
					clientId: tokens.clientId || this.constants.OAUTH.CLIENT_ID,
					expires: tokens.expires || (tokens.expires_in ? Date.now() + (tokens.expires_in * 1000) : Date.now() + (3600 * 1000)),
					stored_at: Date.now()
				};
				HAScaleStorageService.setJson(keys.OAUTH_TOKENS, tokenData);
				HAScaleLogger.debug('OAuth', 'Tokens saved successfully with expiration tracking');
				return true;
			} else {
				// Clear OAuth tokens
				HAScaleStorageService.remove(keys.OAUTH_TOKENS);
				HAScaleLogger.debug('OAuth', 'Tokens cleared');
				return true;
			}
		} catch (error) {
			HAScaleLogger.error('OAuth', 'Error saving tokens:', error);
			return false;
		}
	}

	/**
	 * Load OAuth tokens with expiration checking
	 */
	loadTokens() {
		try {
			const keys = this.constants.STORAGE_KEYS;
			const tokens = HAScaleStorageService.getJson(keys.OAUTH_TOKENS);
			
			if (tokens && tokens.access_token) {
				// Check token expiration (5 minute buffer)
				const now = Date.now();
				const isExpired = tokens.expires && now > (tokens.expires - 300000);
				
				if (isExpired) {
					HAScaleLogger.debug('OAuth', 'Tokens expired, marking for refresh');
					return { ...tokens, needsRefresh: true };
				}
				
				HAScaleLogger.debug('OAuth', 'Valid tokens loaded successfully');
				return tokens;
			}
			
			HAScaleLogger.debug('OAuth', 'No valid tokens found');
			return null;
		} catch (error) {
			HAScaleLogger.error('OAuth', 'Error loading tokens:', error);
			return null;
		}
	}

	/**
	 * Create HAWS Auth object from stored tokens with proper refresh callback
	 * Does NOT trigger automatic redirects
	 */
	createAuth(haUrl) {
		const tokens = this.loadTokens();
		
		if (!tokens || !tokens.access_token) {
			throw new Error('No OAuth tokens available - user authentication required');
		}
		
		// Ensure token data has required fields for Auth object
		const completeTokens = {
			...tokens,
			hassUrl: tokens.hassUrl || haUrl,
			clientId: tokens.clientId || this.constants.OAUTH.CLIENT_ID
		};
		
		// Create Auth object with robust refresh callback
		const auth = new window.HAWS.Auth(completeTokens, (updatedTokens) => {
			if (updatedTokens) {
				HAScaleLogger.debug('OAuth', 'Tokens refreshed by HAWS Auth');
				this.saveTokens(updatedTokens);
			} else {
				// Token refresh failed - notify user to re-authenticate manually
				HAScaleLogger.warn('OAuth', 'Token refresh failed - clearing stored tokens');
				this.saveTokens(null);
				HAScaleUtils.showNotification('error', 'Authentication expired. Please go to configuration and sign in again.');
			}
		});
		
		return auth;
	}

	/**
	 * Check if we have valid tokens (doesn't guarantee they work, just that they exist and aren't obviously expired)
	 */
	hasValidTokens() {
		const tokens = this.loadTokens();
		return tokens && tokens.access_token && !tokens.needsRefresh;
	}

	/**
	 * Clear all stored tokens
	 */
	clearTokens() {
		return this.saveTokens(null);
	}
}

class HAScaleOAuthManager {
	constructor(authUIManager) {
		this.authUIManager = authUIManager;
		this.tokenManager = new HAScaleOAuthTokenManager();
	}

	initializeOAuthFlow(haUrl) {
		const state = this._generateRandomState();
		HAScaleStorageService.set(HAScaleConstants.CONFIG.STORAGE_KEYS.OAUTH_STATE, state);

		const clientId = HAScaleConstants.CONFIG.OAUTH.CLIENT_ID;
		const redirectUri = encodeURIComponent(window.location.origin + window.location.pathname);
		const oauthUrl = `${haUrl}/auth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}`;

		window.location.href = oauthUrl;
	}

	_generateRandomState() {
		return RandomString();
	}

	checkOAuthCallback() {
		const urlParams = new URLSearchParams(window.location.search);
		const code = urlParams.get('code');
		const state = urlParams.get('state');

		if (code && state) {
			window.history.replaceState({}, document.title, window.location.pathname);
			
			try {
				this._handleOAuthCallback(code, state);
			} catch (error) {
				HAScaleLogger.error('OAuth', 'OAuth callback error:', error);
			}
		}
	}

	async _handleOAuthCallback(code, state) {
		try {
			// Validate OAuth parameters (don't sanitize state as it breaks OAuth flow)
			if (!code || !state) {
				HAScaleUtils.showNotification('error', HAScaleConstants.CONFIG.MESSAGES.OAUTH_ERROR);
				return;
			}

			const storedState = HAScaleStorageService.get(HAScaleConstants.CONFIG.STORAGE_KEYS.OAUTH_STATE);
			HAScaleStorageService.remove(HAScaleConstants.CONFIG.STORAGE_KEYS.OAUTH_STATE);

			// Compare raw state values - do NOT sanitize as OAuth state can contain base64 characters
			if (state !== storedState) {
				HAScaleLogger.error('OAuth', `State mismatch - received: "${state}", expected: "${storedState}"`);
				HAScaleUtils.showNotification('error', HAScaleConstants.CONFIG.MESSAGES.OAUTH_STATE_MISMATCH);
				return;
			}
			
			// Only sanitize the authorization code for security
			const sanitizedCode = HAScaleUtils.sanitizeToken(code);
			if (!sanitizedCode) {
				HAScaleUtils.showNotification('error', HAScaleConstants.CONFIG.MESSAGES.OAUTH_ERROR);
				return;
			}

			// Get the HA URL from localStorage (since it was saved before OAuth redirect)
			const haUrl = HAScaleStorageService.get(HAScaleConstants.CONFIG.STORAGE_KEYS.HA_URL);
			
			if (!haUrl || !HAScaleUtils.validateUrl(haUrl)) {
				HAScaleLogger.error('OAuth', 'Invalid URL from storage');
				return;
			}

			// Exchange authorization code for token
			const tokenData = await this._exchangeCodeForToken(haUrl, sanitizedCode);
			
			if (tokenData && tokenData.access_token) {
				// Save tokens using the token manager and update model
				if (this.tokenManager.saveTokens(tokenData)) {
					const controller = Grocy.Components.HomeAssistantScale.Controller;
					if (controller) {
						const currentConfig = controller.model.config;
						controller.model.setAuthMethod(HAScaleConstants.CONFIG.AUTH_METHODS.OAUTH, tokenData);
						controller.model.updateConfig({
							haUrl: haUrl,
							scaleEntityId: currentConfig.scaleEntityId || '', // Preserve existing entity ID if any
							authMethod: HAScaleConstants.CONFIG.AUTH_METHODS.OAUTH
						});
					}
				} else {
					HAScaleUtils.showNotification('error', 'Failed to save authentication tokens');
					return;
				}
				
				// Show OAuth success in the card
				const elements = this.authUIManager._getModalElements();
				elements.oauthAuthStatus.removeClass('d-none');
				
				HAScaleUtils.showNotification('success', HAScaleConstants.CONFIG.MESSAGES.OAUTH_SUCCESS);
				this.authUIManager.openModalForEntityConfig();
			}
		} catch (error) {
			HAScaleLogger.error('OAuth', 'OAuth token exchange error:', error);
			HAScaleUtils.showNotification('error', HAScaleConstants.CONFIG.MESSAGES.OAUTH_FAILED);
		}
	}

	async _exchangeCodeForToken(haUrl, code) {
		return await HAScaleErrorHandler.withRetry(async () => {
			const tokenEndpoint = `${haUrl}/auth/token`;
			const redirectUri = window.location.href.split('?')[0];

			const response = await fetch(tokenEndpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: new URLSearchParams({
					grant_type: HAScaleConstants.CONFIG.OAUTH.GRANT_TYPE,
					code: code,
					redirect_uri: redirectUri,
					client_id: HAScaleConstants.CONFIG.OAUTH.CLIENT_ID,
				}),
			});

			if (!response.ok) {
				const error = new Error(`Token exchange failed: ${response.status} ${response.statusText}`);
				error.status = response.status;
				throw error;
			}

			return await response.json();
		}, {
			maxRetries: 2,
			retryDelay: 1000,
			retryCondition: HAScaleErrorHandler.isRetryableError,
			context: 'OAuth token exchange'
		});
	}
}

class HAScaleEventManager {
	constructor() {
		this.handlers = new Map();
		this.globalHandlers = new Set();
	}

	addHandler(element, event, handler, options = {}) {
		const key = `${element}_${event}_${Date.now()}_${Math.random()}`;
		
		this.handlers.set(key, {
			element: $(element),
			event,
			handler,
			options
		});

		if (options.selector) {
			$(element).on(event, options.selector, handler);
		} else {
			$(element).on(event, handler);
		}

		return key;
	}

	addGlobalHandler(event, handler) {
		$(document).on(event, handler);
		this.globalHandlers.add({ event, handler });
	}

	removeHandler(key) {
		const handlerInfo = this.handlers.get(key);
		if (handlerInfo) {
			const { element, event, handler, options } = handlerInfo;
			if (options.selector) {
				element.off(event, options.selector, handler);
			} else {
				element.off(event, handler);
			}
			this.handlers.delete(key);
		}
	}

	cleanup() {
		this.handlers.forEach((_, key) => {
			this.removeHandler(key);
		});

		this.globalHandlers.forEach(({ event, handler }) => {
			$(document).off(event, handler);
		});
		this.globalHandlers.clear();
	}
}

class HAScaleErrorHandler {
	static async withRetry(operation, options = {}) {
		const {
			maxRetries = 3,
			retryDelay = 1000,
			exponentialBackoff = true,
			retryCondition = () => true,
			onRetry = () => {},
			context = 'Operation'
		} = options;

		let lastError;
		
		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			try {
				return await operation(attempt);
			} catch (error) {
				lastError = error;
				
				if (attempt === maxRetries || !retryCondition(error)) {
					HAScaleLogger.error('ErrorHandler', `${context} failed after ${attempt + 1} attempts:`, error);
					break;
				}
				
				const delay = exponentialBackoff 
					? retryDelay * Math.pow(2, attempt)
					: retryDelay;
				
				HAScaleLogger.warn('ErrorHandler', `${context} failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
				onRetry(error, attempt + 1);
				
				await new Promise(resolve => setTimeout(resolve, delay));
			}
		}
		
		throw lastError;
	}

	static handleError(error, context = 'Unknown', showNotification = null) {
		HAScaleLogger.error('ErrorHandler', `${context} error:`, error);
		
		if (error.name === 'NetworkError' || error.message.includes('fetch')) {
			if (showNotification) {
				showNotification('error', HAScaleConstants.CONFIG.MESSAGES.CONNECTION_TIMEOUT);
			}
		} else if (error.message.includes('auth') || error.message.includes('token')) {
			if (showNotification) {
				showNotification('error', HAScaleConstants.CONFIG.MESSAGES.AUTH_FAILED);
			}
		} else {
			if (showNotification) {
				showNotification('error', HAScaleConstants.CONFIG.MESSAGES.VALIDATION_FAILED);
			}
		}
		
		return error;
	}

	static isRetryableError(error) {
		if (!error) return false;
		
		// Handle HAWS error codes - don't retry auth errors
		if (error === window.HAWS?.ERR_INVALID_AUTH) {
			return false;
		}
		
		if (error === window.HAWS?.ERR_CANNOT_CONNECT ||
			error === window.HAWS?.ERR_CONNECTION_LOST) {
			return true;
		}
		
		const message = error.message || error.toString() || '';
		return (
			error.name === 'NetworkError' ||
			message.includes('timeout') ||
			message.includes('ECONNRESET') ||
			message.includes('ENOTFOUND') ||
			(error.status >= HAScaleConstants.CONFIG.HTTP_STATUS.SERVER_ERROR_MIN && error.status < HAScaleConstants.CONFIG.HTTP_STATUS.SERVER_ERROR_MAX)
		);
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
													<i class="fa-solid fa-check"></i> Validate Token
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
		this.oauthManager = new HAScaleOAuthManager(this.authUIManager);
	}

	initialize() {
		if (this.initialized) return;
		
		this.styleManager.addStyles();
		this.addConfigurationUI();
		this.addRefreshButtons();
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
		
		// Log enable/disable actions at INFO level, others at DEBUG
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
		
		// Check element attributes first (most reliable)
		if (this._checkElementAttributes(element)) {
			return true;
		}
		
		// Check data attributes
		if (this._checkDataAttributes($element)) {
			return true;
		}
		
		// Check labels (less reliable but comprehensive)
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
		
		// Try different label finding strategies
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
		
		// Load current configuration when modal is shown
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
		
		// Config save button - only handles entity validation and final save/test
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
			
			// Update configuration with current form values
			controller.model.updateConfig({
				haUrl: haUrl,
				scaleEntityId: scaleEntityId,
				authMethod: controller.model.config.authMethod
			});
			
			try {
				elements.configSave.prop('disabled', true).html('<i class="fa-solid fa-spinner fa-spin"></i> Testing...');
				
				// Test the entity exists and connection works
				HAScaleLogger.info('UI', `Testing connection and entity: ${scaleEntityId}`);
				
				// Try to connect and validate entity
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
		
		// OAuth sign in button
		this.eventManager.addHandler(elements.oauthSigninBtn, 'click', () => {
			const rawUrl = elements.urlInput.val();
			const haUrl = HAScaleUtils.sanitizeUrl(rawUrl);
			if (!HAScaleUtils.validateUrl(haUrl, HAScaleUtils.showNotification)) {
				return;
			}
			
			// Save HA URL directly to localStorage before OAuth flow
			HAScaleStorageService.set(HAScaleConstants.CONFIG.STORAGE_KEYS.HA_URL, haUrl);
			
			this.oauthManager.initializeOAuthFlow(haUrl);
		});
		
		// Long-lived token button
		this.eventManager.addHandler(elements.longLivedBtn, 'click', () => {
			this.authUIManager.showLongLivedTokenInput();
		});
		
		// Token validation button
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
			
			// Validate the token by creating a test connection
			try {
				elements.tokenValidateBtn.prop('disabled', true).html('<i class="fa-solid fa-spinner fa-spin"></i> Validating...');
				
				const auth = window.HAWS.createLongLivedTokenAuth(haUrl, token);
				const connection = await window.HAWS.createConnection({ auth });
				
				// Test the connection
				await connection.ping();
				connection.close();
				
				// Success - save the authentication
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
				HAScaleUtils.showNotification('success', 'Long-lived token validated successfully!');
			} catch (error) {
				HAScaleLogger.error('UI', 'Token validation error:', error);
				HAScaleUtils.showNotification('error', 'Token validation failed. Please check your token and URL.');
			} finally {
				elements.tokenValidateBtn.prop('disabled', false).html('<i class="fa-solid fa-check"></i> Validate Token');
			}
		});
		
		// Logout/disconnect button
		this.eventManager.addHandler(elements.logoutBtn, 'click', () => {
			const controller = Grocy.Components.HomeAssistantScale.Controller;
			if (controller) {
				const currentConfig = controller.model.config;
				// Clear all authentication but preserve URL and entity ID
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
		
		// Log level selector
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
				// For OAuth, use the token manager to create auth
				try {
					auth = this.connectionService.oauthTokenManager.createAuth(config.haUrl);
				} catch (error) {
					throw new Error('OAuth tokens not available for validation');
				}
			} else if (config.authMethod === authMethods.LONG_LIVED) {
				// Create temporary auth for validation
				auth = window.HAWS.createLongLivedTokenAuth(config.haUrl, config.authData);
			}
			
			if (!auth) {
				throw new Error('Failed to create authentication for validation');
			}
			
			// Create temporary connection for validation
			const connection = await window.HAWS.createConnection({ auth });
			
			try {
				// Get all entities to check if our scale entity exists
				const entities = await window.HAWS.getStates(connection);
				const entity = entities.find(state => state.entity_id === config.scaleEntityId);
				
				// Close the temporary connection
				connection.close();
				
				if (!entity) {
					HAScaleUtils.showNotification('error', HAScaleUtils.formatMessage(HAScaleConstants.CONFIG.MESSAGES.ENTITY_NOT_FOUND, config.scaleEntityId));
					return false;
				}
				
				// Entity exists - validate it has the required attributes
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
			
			// Provide more specific error messages
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

class HAScaleConnectionService {
	constructor(model) {
		this.model = model;
		this.config = HAScaleConstants.CONFIG;
		this.connection = null;
		this.unsubscribeEntities = null;
		this.auth = null;
		this.oauthTokenManager = new HAScaleOAuthTokenManager();
	}

	async connect() {
		if (!this.model.isConfigComplete()) {
			HAScaleLogger.warn('Connection', 'Missing configuration, cannot connect');
			return false;
		}

		if (this.model.connectionState.isConnected && this.connection && this.connection.connected) {
			return true;
		}

		// Clean up any existing connection before creating a new one
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
			// Check if HAWS library is available
			if (!window.HAWS) {
				throw new Error('home-assistant-js-websocket library not loaded');
			}

			// Get or create authentication
			this.auth = await this._getAuth();
			if (!this.auth) {
				HAScaleLogger.error('Connection', 'Authentication failed');
				return false;
			}

			// Create connection using the library
			this.connection = await window.HAWS.createConnection({ auth: this.auth });
			
			// Set up connection event handlers
			this.connection.addEventListener('ready', () => {
				HAScaleLogger.info('Connection', 'Connected to Home Assistant');
				this.model.updateConnectionState({ isConnected: true, connection: this.connection });
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

			// Check if the connection is already ready (in case the ready event fired before we set up the listener)
			if (this.connection.connected) {
				HAScaleLogger.debug('Connection', 'Connection already ready, triggering ready logic immediately');
				this.model.updateConnectionState({ isConnected: true, connection: this.connection });
			}

			// Set a timeout to detect if ready event never fires and connection isn't established
			setTimeout(() => {
				if (!this.model.connectionState.isConnected && !this.connection.connected) {
					HAScaleLogger.error('Connection', 'Connection timeout - check Home Assistant URL and network connectivity');
				}
			}, 10000); // 10 second timeout

			return true;
		} catch (error) {
			// Handle specific HAWS error codes
			let errorMessage = 'Unknown connection error';
			if (error === window.HAWS?.ERR_INVALID_AUTH) {
				errorMessage = 'Invalid authentication - token may be expired';
				HAScaleLogger.warn('Connection', 'Invalid auth error - user needs to re-authenticate');
				// Don't automatically clear tokens - let user choose to re-authenticate
			} else if (error === window.HAWS?.ERR_CANNOT_CONNECT) {
				errorMessage = 'Cannot connect to Home Assistant - check URL and network';
			} else if (error === window.HAWS?.ERR_CONNECTION_LOST) {
				errorMessage = 'Connection to Home Assistant lost';
			} else if (error === window.HAWS?.ERR_HASS_HOST_REQUIRED) {
				errorMessage = 'Home Assistant URL is required';
			} else {
				// Log the actual error for debugging
				errorMessage = error.message || error.toString() || 'Unknown connection error';
				HAScaleLogger.debug('Connection', 'Full error details:', error);
			}

			HAScaleLogger.error('Connection', `Connection failed: ${errorMessage}`);
			this.model.updateConnectionState({ lastError: { code: error, message: errorMessage } });
			
			// Don't retry auth errors - user needs to re-authenticate
			if (error === window.HAWS?.ERR_INVALID_AUTH) {
				return false;
			}
			
			// Create retryable error for network/connection issues
			if (HAScaleErrorHandler.isRetryableError(error)) {
				throw error;
			}
			
			return false;
		}
	}

	async _getAuth() {
		try {
			// Check if HAWS library is available
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
		// Use the OAuth token manager to create auth without redirects
		try {
			return this.oauthTokenManager.createAuth(this.model.config.haUrl);
		} catch (error) {
			// Token manager will handle the error notifications
			HAScaleLogger.debug('Connection', 'OAuth token manager failed to create auth:', error.message);
			throw error;
		}
	}
	
	_getLongLivedAuth() {
		const keys = HAScaleConstants.CONFIG.STORAGE_KEYS;
		const longLivedToken = HAScaleStorageService.get(keys.LONG_LIVED_TOKEN);
		
		if (!longLivedToken) {
			throw new Error('No long-lived token found');
		}
		
		// Create long-lived token auth using the library helper
		return window.HAWS.createLongLivedTokenAuth(this.model.config.haUrl, longLivedToken);
	}


	async _handleAuthError() {
		try {
			// Clear current auth and connection instances
			this.auth = null;
			if (this.connection) {
				this.connection.close();
				this.connection = null;
			}
			
			// Check if we still have valid stored tokens that might work
			if (!this.oauthTokenManager.hasValidTokens() && this.model.config.authMethod === HAScaleConstants.CONFIG.AUTH_METHODS.OAUTH) {
				// No valid tokens available - notify user to re-authenticate
				HAScaleLogger.warn('Connection', 'No valid authentication tokens available');
				HAScaleUtils.showNotification('error', 'Authentication lost. Please go to configuration and sign in again.');
				return;
			}
			
			// Try to create new auth with existing tokens (HAWS will handle refresh if needed)
			try {
				this.auth = await this._getAuth();
				if (this.auth) {
					HAScaleLogger.debug('Connection', 'Auth recreated successfully, connection will retry');
					return; // Success, let connection retry
				}
			} catch (authError) {
				// If auth creation fails, it's likely token refresh failed
				HAScaleLogger.warn('Connection', 'Auth recreation failed, tokens may be invalid:', authError);
				
				// Clear invalid tokens and notify user (only for OAuth)
				if (this.model.config.authMethod === HAScaleConstants.CONFIG.AUTH_METHODS.OAUTH) {
					this.oauthTokenManager.clearTokens();
				}
				HAScaleUtils.showNotification('error', 'Authentication expired and refresh failed. Please go to configuration and sign in again.');
			}
			
		} catch (error) {
			HAScaleLogger.error('Connection', 'Error in auth error handler', error);
			// Fallback notification
			HAScaleUtils.showNotification('error', 'Authentication error occurred. Please check configuration.');
		}
	}


	_handleEntityUpdate(entity) {
		const newWeight = parseFloat(entity.state);
		const isStable = entity.attributes?.is_stable === true;
		
		if (!isNaN(newWeight) && entity.attributes) {
			// Throttle frequent weight update debug messages to every 1 second
			HAScaleLogger.throttled('weight_update', 1000, () => {
				HAScaleLogger.debug('Connection', `Weight update received: ${newWeight}g, stable: ${isStable}, entity: ${this.model.config.scaleEntityId}`);
			});
			
			this.model.updateScaleData({
				lastWeight: newWeight,
				isStable: isStable,
				attributes: entity.attributes
			});
		} else {
			// Throttle repetitive invalid entity messages (like "unavailable" state)
			HAScaleLogger.throttled('invalid_entity', 5000, () => {
				HAScaleLogger.warn('Connection', `Invalid entity data received from ${this.model.config.scaleEntityId}: state="${entity.state}", has_attributes=${!!entity.attributes}`);
			});
		}
	}
	

	disconnect() {
		try {
			// Clean up entity subscription first
			if (this.unsubscribeEntities) {
				try {
					this.unsubscribeEntities();
				} catch (error) {
					HAScaleLogger.error('Connection', 'Error cleaning up entity subscription', error);
				}
				this.unsubscribeEntities = null;
			}
			
			// Close connection
			if (this.connection) {
				try {
					this.connection.close();
				} catch (error) {
					HAScaleLogger.error('Connection', 'Error closing connection', error);
				}
				this.connection = null;
			}
			
			// Reset auth
			this.auth = null;
			
			// Update model state
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
		
		// Don't target if already fulfilled
		if ($activeElement.hasClass('ha-scale-fulfilled')) {
			return null;
		}
		
		if (!$activeElement.hasClass('ha-scale-auto-targeted')) {
			$activeElement.addClass('ha-scale-auto-targeted');
			
			// Set up waiting state with visual feedback
			Grocy.Components.HomeAssistantScale.Controller.view.updateInputState(activeElement, 'waiting');
			
			return $activeElement;
		}
		
		return null;
	}

	clearInput(input) {
		const $input = $(input);
		
		// Clear other waiting inputs efficiently
		this._clearOtherWaitingInputs($input);
		
		// Reset the stored stable weight so the same weight can trigger again
		const controller = Grocy.Components.HomeAssistantScale.Controller;
		if (controller?.model) {
			controller.model.scaleData.lastStableWeight = null;
			HAScaleLogger.debug('InputService', 'Reset lastStableWeight to allow same weight to trigger again');
		}
		
		// Prepare the target input for scale reading
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
		// Priority 1: Check for [input_id]_qu_unit pattern (most reliable)
		if (inputId) {
			const $quUnit = $(`#${inputId}_qu_unit`);
			if ($quUnit.length > 0) {
				const unit = $quUnit.text().trim().toLowerCase();
				if (unit) {
					return { unit, isFallback: false };
				}
			}
		}
		
		// Priority 2: Check siblings for unit text
		const $unitElement = $input.siblings('.input-group-text, .input-group-append .input-group-text');
		if ($unitElement.length > 0) {
			const unit = this._extractUnitText($unitElement);
			if (unit) {
				return { unit, isFallback: false };
			}
		}
		
		// Priority 3: Check input group for unit elements
		const $inputGroup = $input.closest('.input-group');
		if ($inputGroup.length > 0) {
			const $unitInGroup = $inputGroup.find('.input-group-text, [id$="_unit"], [class*="unit"]');
			const unit = this._extractUnitText($unitInGroup);
			if (unit) {
				return { unit, isFallback: false };
			}
		}
		
		// Priority 4: Check quantity selector (global)
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
		
		this.setupObservers();
		this.setupEventHandlers();
	}

	setupObservers() {
		this.model.addObserver({
			onConnectionStateChanged: (state) => {
				this.view.updateConnectionStatus(state.isConnected);
				if (state.isConnected && !this.unsubscribeEntities) {
					try {
						if (!state.connection || !state.connection.connected) {
							HAScaleLogger.error('Connection', 'Cannot subscribe to entities - connection not ready');
							return;
						}

						// Subscribe to entity state changes using the library
						this.unsubscribeEntities = window.HAWS.subscribeEntities(state.connection, (entities) => {
							const scaleEntity = entities[this.model.config.scaleEntityId];
							if (scaleEntity) {
								this.connectionService._handleEntityUpdate(scaleEntity);
							}
						});
						HAScaleLogger.debug('Connection', 'Successfully subscribed to entity changes');
					} catch (error) {
						HAScaleLogger.error('Connection', 'Error subscribing to entities', error);
					}
				}
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
				// Update UI based on new config
				const hasAuth = this.model.hasValidAuth();
				const authState = hasAuth ? 
					this.view.authUIManager.authStates.AUTHENTICATED : 
					this.view.authUIManager.authStates.UNAUTHENTICATED;
				this.view.authUIManager.updateAuthUI(authState, config);
				
				// Handle connection
				this.connectionService.disconnect();
				
				if (this.model.isConfigComplete()) {
					try {
						await this.connectionService.connect();
					} catch (error) {
						HAScaleLogger.error('Controller', 'Connection attempt failed', error);
						
						// If auth error and no valid auth, show modal for user to re-authenticate
						if (error.message && error.message.includes('authentication required')) {
							HAScaleLogger.info('Controller', 'Authentication required - showing config modal');
							// Don't auto-redirect, let user choose to re-authenticate
						}
					}
				}
			}
		});
	}

	setupEventHandlers() {
		// Define event handlers for new config format
		const updatedEventMap = {
			'HAScale.ConfigSave': (_, config) => {
				// Handle the new config format with separated auth methods
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

		// Setup document events
		Object.entries(updatedEventMap).forEach(([event, handler]) => {
			this._addEventHandler($(document), event, handler);
		});
		
		// Form reset handling
		this._addEventHandler($(document), 'reset', 'form', () => {
			setTimeout(() => this.view.resetAllInputs('form-reset'), HAScaleConstants.CONFIG.FORM_RESET_DELAY);
		});
		
		// Manual input detection with debouncing
		this._addEventHandler($(document), 'input keydown paste', 'input', 
			this._debounce((e) => {
				// Skip manual input detection if hotkey is in progress
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
		
		// Auto-target weight inputs when focused for the first time
		this._addEventHandler($(document), 'focus', 'input', (e) => {
			const input = e.target;
			const $input = $(input);
			
			// Only auto-target if it's a weight input and not already auto-targeted
			if (this.view.isWeightInput(input) && 
				!this.view.inputManager.isInputAutoTargeted($input)) {
				
				// Clear other waiting inputs first
				this.inputService._clearOtherWaitingInputs($input);
				
				// Reset stored stable weight to allow same weight to trigger
				this.model.scaleData.lastStableWeight = null;
				
				// Set to waiting state and mark as auto-targeted
				this.view.updateInputState(input, 'waiting');
				this.view.inputManager.setAutoTargeted($input);
			}
		});
		
		// Untarget auto-targeted inputs when they lose focus
		this._addEventHandler($(document), 'blur', 'input', (e) => {
			const input = e.target;
			const $input = $(input);
			
			// Only untarget if it's auto-targeted and still waiting (not fulfilled)
			if (this.view.isWeightInput(input) && 
				this.view.inputManager.isInputAutoTargeted($input) &&
				this.view.inputManager.isInputWaiting($input)) {
				
				this.view.updateInputState(input, 'reset');
			}
		});
		
		// Hotkey handler for scale trigger
		this._addEventHandler($(document), 'keydown', (e) => {
			// Check if hotkey matches (Alt+S by default)
			if (e.key === 's' && e.altKey && !e.ctrlKey && !e.shiftKey) {
				e.preventDefault();
				this._handleScaleHotkey();
			}
		});
		
		// Success operation detection using MutationObserver
		this.setupSuccessDetection();
	}

	_addEventHandler(element, event, selectorOrHandler, handler) {
		if (typeof selectorOrHandler === 'function') {
			// No selector provided
			handler = selectorOrHandler;
			element.on(event, handler);
			this.eventHandlers.push({ element, event, handler });
		} else {
			// Selector provided (delegated event)
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

		// Start observing toast container
		const toastContainer = document.querySelector('#toast-container') || document.body;
		this.mutationObserver.observe(toastContainer, {
			childList: true,
			subtree: true
		});
	}

	handleStableWeight(weight) {
		// Validate weight
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
			
			// Update input
			targetInput.val(formattedWeight);
			targetInput.trigger('input');
			targetInput.trigger('change');
			
			// Update view state
			this.view.updateInputState(targetInput[0], 'fulfilled');
			
			// Show notification
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
		
		// Use a more efficient pattern matching approach
		const successPatterns = this._getSuccessPatterns();
		
		return successPatterns.some(pattern => 
			pattern.terms.every(term => message.toLowerCase().includes(term.toLowerCase()))
		);
	}

	_getSuccessPatterns() {
		// Cache patterns to avoid repeated function calls
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
				// Fallback to English terms if __t function is not available
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
		// Load log level from storage first
		HAScaleLogger.loadLevel();
		
		HAScaleLogger.info('Controller', 'Initializing Home Assistant Scale component');
		
		this.view.initialize();
		
		// Check for OAuth callback on initialization
		this.view.oauthManager.checkOAuthCallback();
		
		if (this.model.loadConfiguration()) {
			HAScaleLogger.info('Controller', 'Configuration loaded, attempting to connect to Home Assistant');
			HAScaleLogger.debug('Controller', 'Config state:', {
				haUrl: this.model.config.haUrl,
				scaleEntityId: this.model.config.scaleEntityId,
				authMethod: this.model.config.authMethod,
				isComplete: this.model.isConfigComplete(),
				hasValidAuth: this.model.hasValidAuth()
			});
			await this.connectionService.connect();
		} else {
			HAScaleLogger.info('Controller', 'No configuration found, connection setup required');
		}
	}

	destroy() {
		// Batch cleanup operations
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

		// Reset object references
		this.mutationObserver = null;
		this._cachedSuccessPatterns = null;
		
	}

	_handleScaleHotkey() {
		HAScaleLogger.info('Controller', 'Scale hotkey (Alt+S) triggered');
		
		// Set flag to prevent manual input detection during hotkey operation
		this._hotkeyInProgress = true;
		
		// Find the currently focused element
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
				// Prioritize empty inputs first, then fall back to first input
				const $emptyInputs = $weightInputs.filter((_, input) => !input.value || input.value.trim() === '');
				const $firstInput = $emptyInputs.length > 0 ? $emptyInputs.first() : $weightInputs.first();
				
				// Clear auto-targeted state so focus handler will activate it
				const $button = this.view.inputManager.getButtonFromInput($firstInput);
				if ($button.length > 0) {
					$button.removeClass(this.view.inputManager.css.AUTO_TARGETED);
				}
				
				$firstInput.focus();
				// Focus event handler will automatically target weight inputs for scale reading
			} else {
				HAScaleLogger.warn('Controller', 'No weight inputs found on page for hotkey operation');
				HAScaleUtils.showNotification('warning', HAScaleConstants.CONFIG.MESSAGES.NO_WEIGHT_INPUTS, { timeOut: HAScaleConstants.CONFIG.TIMEOUTS.NOTIFICATION_MEDIUM });
			}
		}
		
		// Clear the hotkey flag after a short delay to allow processing to complete
		setTimeout(() => {
			this._hotkeyInProgress = false;
		}, HAScaleConstants.CONFIG.HOTKEY_CLEANUP_DELAY);
	}
	
	_cleanupEventHandlers() {
		this.eventHandlers.forEach(({ element, event, selector, handler }) => {
			if (selector) {
				// Delegated event
				element.off(event, selector, handler);
			} else {
				// Direct event
				element.off(event, handler);
			}
		});
		this.eventHandlers = [];
	}
}

Grocy.Components.HomeAssistantScale = {
	Controller: null,
	InitDone: false,

	async Init() {
		if (this.InitDone) {
			HAScaleLogger.debug('Init', 'Component already initialized, skipping');
			return;
		}
		
		HAScaleLogger.info('Init', 'Starting Home Assistant Scale component initialization');
		
		this.Controller = new HAScaleController();
		await this.Controller.initialize();
		this.InitDone = true;
		
		HAScaleLogger.info('Init', 'Home Assistant Scale component initialization completed');
	}
};

setTimeout(async () => {
	await Grocy.Components.HomeAssistantScale.Init();
}, HAScaleConstants.CONFIG.INIT_DELAY);

$(window).on('beforeunload', () => {
	Grocy.Components.HomeAssistantScale.Controller?.destroy();
});