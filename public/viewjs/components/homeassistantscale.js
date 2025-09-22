class HAScaleConstants {
	static get CONFIG() {
		return Object.freeze({
			DEBOUNCE_DELAY: 300,
			CACHE_TTL: 30000,
			STABLE_WEIGHT_DEBOUNCE: 100,
			RECONNECT_DELAY: 5000,
			CONNECTION_TIMEOUT: 10000,
			INPUT_DEBOUNCE: 100,
			
			DEFAULT_DECIMAL_PLACES: 4,
			MAX_DECIMAL_PLACES: 10,
			MIN_DECIMAL_PLACES: 0,
			
			STORAGE_PREFIX: 'grocy.ha_scale',
			
			STORAGE_KEYS: {
				HA_URL: 'url',
				HA_TOKEN: 'token', 
				SCALE_ENTITY_ID: 'entity_id',
				DEBUG_MODE: 'debug',
				OAUTH_STATE: 'oauth_state',
				AUTH_TOKENS: 'auth_tokens'
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
			
			CSS_CLASSES: {
				AUTO_TARGETED: 'ha-scale-auto-targeted',
				BUTTON_BASE: 'ha-scale-refresh-btn',
				BUTTON_WAITING: 'ha-scale-waiting-btn',
				BUTTON_SUCCESS: 'btn-success',
				BUTTON_WARNING: 'btn-warning',
				BUTTON_IDLE: 'btn-outline-secondary',
				INPUT_FULFILLED: 'ha-scale-fulfilled',
				INPUT_WAITING: 'ha-scale-waiting'
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
				ENTITY_VALIDATED: 'Entity "{0}" validated successfully!'
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

	static get currentLevel() {
		const debugEnabled = BoolVal(HAScaleStorageService.get(HAScaleConstants.CONFIG.STORAGE_KEYS.DEBUG_MODE));
		return debugEnabled ? this.LOG_LEVELS.DEBUG : this.LOG_LEVELS.INFO;
	}
	
	static enable() {
		HAScaleStorageService.set(HAScaleConstants.CONFIG.STORAGE_KEYS.DEBUG_MODE, 'true');
	}
	
	static disable() {
		HAScaleStorageService.set(HAScaleConstants.CONFIG.STORAGE_KEYS.DEBUG_MODE, 'false');
	}
	
	static _log(level, category, message, ...args) {
		if (level > this.currentLevel) return;
		
		const timestamp = new Date().toISOString().substring(11, 23);
		const levelName = this.LEVEL_NAMES[level];
		const levelPart = `[${levelName}]`.padEnd(7);
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
			if (urlObj.port && (parseInt(urlObj.port) < 1 || parseInt(urlObj.port) > 65535)) {
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
		if (token.length < 8) {
			if (showNotification) showNotification('error', HAScaleConstants.CONFIG.MESSAGES.TOKEN_TOO_SHORT);
			return false;
		}
		if (token.length > 500) {
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
		if (entityId.length > 100) {
			if (showNotification) showNotification('error', HAScaleConstants.CONFIG.MESSAGES.ENTITY_TOO_LONG);
			return false;
		}
		const reservedPrefixes = ['script.', 'automation.', 'scene.'];
		if (reservedPrefixes.some(prefix => entityId.startsWith(prefix))) {
			if (showNotification) showNotification('warning', HAScaleConstants.CONFIG.MESSAGES.ENTITY_RESERVED_DOMAIN);
		}
		return true;
	}

	static validateConfig(elements, showNotification) {
		const config = {
			haUrl: this.sanitizeUrl(elements.urlInput.val()),
			haToken: this.sanitizeToken(elements.tokenField.val()),
			scaleEntityId: this.sanitizeEntityId(elements.entityInput.val())
		};

		if (!config.haUrl) {
			showNotification('error', HAScaleConstants.CONFIG.MESSAGES.URL_REQUIRED);
			return null;
		}
		if (!config.haToken) {
			showNotification('error', HAScaleConstants.CONFIG.MESSAGES.TOKEN_REQUIRED);
			return null;
		}
		if (!config.scaleEntityId) {
			showNotification('error', HAScaleConstants.CONFIG.MESSAGES.ENTITY_REQUIRED);
			return null;
		}

		if (!this.validateUrl(config.haUrl, showNotification)) return null;
		if (!this.validateToken(config.haToken, showNotification)) return null;
		if (!this.validateEntityId(config.scaleEntityId, showNotification)) return null;

		return config;
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
			haToken: null,
			scaleEntityId: null
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
				haToken: HAScaleStorageService.get(keys.HA_TOKEN) || null,
				scaleEntityId: HAScaleStorageService.get(keys.SCALE_ENTITY_ID) || null
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
			const { haUrl = '', haToken = '', scaleEntityId = '' } = this.config;
			
			const sanitizedConfig = {
				haUrl: HAScaleUtils.sanitizeUrl(haUrl),
				haToken: HAScaleUtils.sanitizeToken(haToken),
				scaleEntityId: HAScaleUtils.sanitizeEntityId(scaleEntityId)
			};
			
			HAScaleStorageService.set(keys.HA_URL, sanitizedConfig.haUrl);
			HAScaleStorageService.set(keys.HA_TOKEN, sanitizedConfig.haToken);
			HAScaleStorageService.set(keys.SCALE_ENTITY_ID, sanitizedConfig.scaleEntityId);
		} catch (error) {
			HAScaleLogger.error('Config', 'Error saving configuration:', error);
		}
	}

	isConfigComplete() {
		return !!(this.config.haUrl && this.config.haToken && this.config.scaleEntityId);
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
			tokenInput: $container.find('.token-input'),
			signInBtn: $container.find('.signin-btn'),
			manualTokenBtn: $container.find('.manual-token-btn'),
			orText: $container.find('.or-text'),
			urlInput: $container.find('.url-input'),
			tokenField: $container.find('.token-field'),
			entityInput: $container.find('.entity-input'),
			connectionStatus: $container.find('.connection-status'),
			configSave: $container.find('.config-save'),
			logoutBtn: $container.find('.logout-btn'),
			debugToggle: $container.find('.debug-toggle')
		};
	}

	updateAuthUI(state, config = {}) {
		const elements = this._getModalElements();

		elements.urlInput.val(config.haUrl || '');
		elements.tokenField.val(config.haToken || '');
		elements.entityInput.val(config.scaleEntityId || '');
		elements.debugToggle.prop('checked', HAScaleLogger.currentLevel >= HAScaleLogger.LOG_LEVELS.DEBUG);

		switch (state) {
			case this.authStates.AUTHENTICATED:
				elements.authStatus.removeClass('d-none');
				elements.tokenInput.addClass('d-none');
				elements.signInBtn.addClass('d-none');
				elements.manualTokenBtn.addClass('d-none');
				elements.orText.addClass('d-none');
				break;

			case this.authStates.UNAUTHENTICATED:
				elements.authStatus.addClass('d-none');
				elements.tokenInput.addClass('d-none');
				elements.signInBtn.removeClass('d-none');
				elements.manualTokenBtn.removeClass('d-none');
				elements.orText.removeClass('d-none');
				break;
		}
	}

	showManualTokenInput() {
		const elements = this._getModalElements();
		elements.tokenInput.removeClass('d-none');
		elements.manualTokenBtn.addClass('d-none');
		elements.tokenField.focus();
	}

	openModalForEntityConfig() {
		const elements = this._getModalElements();
		elements.modal.modal('show');
		setTimeout(() => elements.entityInput.focus(), HAScaleConstants.CONFIG.TIMEOUTS.MODAL_FOCUS_DELAY);
	}

	updateConnectionStatus(isConnected) {
		const elements = this._getModalElements();
		const $status = elements.modal.find('[data-ha-connection-status]');
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
					animation: ha-scale-pulse 1.5s ease-in-out infinite;
				}
				
				/* Animations */
				@keyframes ha-scale-pulse {
					0% { transform: scale(1); opacity: 1; }
					50% { transform: scale(1.2); opacity: 0.7; }
					100% { transform: scale(1); opacity: 1; }
				}
			</style>
		`;
		
		$('head').append(styles);
	}
}

class HAScaleOAuthManager {
	constructor(notificationCallback, authUIManager) {
		this.showNotification = notificationCallback;
		this.authUIManager = authUIManager;
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
			// Sanitize OAuth parameters
			const sanitizedCode = HAScaleUtils.sanitizeToken(code);
			const sanitizedState = HAScaleUtils.sanitizeToken(state);
			
			if (!sanitizedCode) {
				this.showNotification('error', HAScaleConstants.CONFIG.MESSAGES.OAUTH_ERROR);
				return;
			}

			const storedState = HAScaleStorageService.get(HAScaleConstants.CONFIG.STORAGE_KEYS.OAUTH_STATE);
			HAScaleStorageService.remove(HAScaleConstants.CONFIG.STORAGE_KEYS.OAUTH_STATE);

			if (sanitizedState !== storedState) {
				this.showNotification('error', HAScaleConstants.CONFIG.MESSAGES.OAUTH_STATE_MISMATCH);
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
				// Update model with new authentication - UI will update automatically via observer
				const controller = Grocy.Components.HomeAssistantScale.Controller;
				if (controller) {
					const currentConfig = controller.model.config;
					controller.model.updateConfig({
						haUrl: haUrl,
						haToken: tokenData.access_token,
						scaleEntityId: currentConfig.scaleEntityId || '' // Preserve existing entity ID if any
					});
				}
				
				this.showNotification('success', HAScaleConstants.CONFIG.MESSAGES.OAUTH_SUCCESS);
				this.authUIManager.openModalForEntityConfig();
			}
		} catch (error) {
			HAScaleLogger.error('OAuth', 'OAuth token exchange error:', error);
			this.showNotification('error', HAScaleConstants.CONFIG.MESSAGES.OAUTH_FAILED);
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
		
		// Store handler reference
		this.handlers.set(key, {
			element: $(element),
			event,
			handler,
			options
		});

		// Attach handler
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
				
				// Check if we should retry
				if (attempt === maxRetries || !retryCondition(error)) {
					HAScaleLogger.error('ErrorHandler', `${context} failed after ${attempt + 1} attempts:`, error);
					break;
				}
				
				// Calculate delay
				const delay = exponentialBackoff 
					? retryDelay * Math.pow(2, attempt)
					: retryDelay;
				
				HAScaleLogger.warn('ErrorHandler', `${context} failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
				onRetry(error, attempt + 1);
				
				await new Promise(resolve => setTimeout(resolve, delay));
			}
		}
		
		// All retries exhausted
		throw lastError;
	}

	static handleError(error, context = 'Unknown', showNotification = null) {
		HAScaleLogger.error('ErrorHandler', `${context} error:`, error);
		
		// Categorize errors
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
		// Define which errors are worth retrying
		if (!error) return false;
		
		// Handle HAWS error codes - don't retry auth errors
		if (error === window.HAWS?.ERR_INVALID_AUTH) {
			return false; // Auth errors need user intervention
		}
		
		// Retry connection errors
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
			(error.status >= 500 && error.status < 600) // Server errors
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
								<label>Authentication</label>
								<div class="auth-status mb-2 d-none">
									<div class="alert alert-success d-flex justify-content-between align-items-center">
										<span><i class="fa-solid fa-check-circle"></i> Successfully authenticated</span>
										<button type="button" class="btn btn-sm btn-danger logout-btn">
											<i class="fa-solid fa-sign-out-alt"></i> Disconnect
										</button>
									</div>
								</div>
								<div class="mb-2">
									<button type="button" class="btn btn-primary btn-block signin-btn">
										<i class="fa-solid fa-sign-in-alt"></i> Sign in with Home Assistant
									</button>
								</div>
								<div class="text-center mb-2 or-text">
									<small class="text-muted">or</small>
								</div>
								<div class="mb-2">
									<button type="button" class="btn btn-outline-secondary btn-block manual-token-btn">
										<i class="fa-solid fa-key"></i> Enter access token manually
									</button>
								</div>
								<div class="token-input d-none">
									<input type="password" class="form-control token-field" placeholder="Your HA access token">
									<small class="form-text text-muted">
										You can create a long-lived access token in Home Assistant under Profile → Security → Long-lived access tokens
									</small>
								</div>
							</div>
							<div class="form-group entity-group">
								<label>Scale Entity ID</label>
								<input type="text" class="form-control entity-input" placeholder="e.g. sensor.kitchen_scale, must have 'is_stable' attribute">
								<small class="form-text text-muted">Connection status: <span class="connection-status">Not connected</span></small>
							</div>
							<div class="form-group debug-group">
								<div class="form-check">
									<input type="checkbox" class="form-check-input debug-toggle" id="ha-debug-toggle">
									<label class="form-check-label" for="ha-debug-toggle">
										<small>Enable debug logging</small>
									</label>
								</div>
							</div>
						</div>
						<div class="modal-footer">
							<button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
							<button type="button" class="btn btn-primary config-save">Save & Connect</button>
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
		this.oauthManager = new HAScaleOAuthManager((type, message, options) => this.showNotification(type, message, options), this.authUIManager);
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
		// Clean up event handlers to prevent memory leaks
		this.eventManager.cleanup();
		
		// Clear cache
		this._clearCache();
		
		// Reset initialization state
		this.initialized = false;
	}

	showNotification(type, message, options = {}) {
		if (typeof toastr !== 'undefined') {
			const defaultOptions = {
				timeOut: HAScaleConstants.CONFIG.TIMEOUTS.NOTIFICATION_DEFAULT,
				positionClass: HAScaleConstants.CONFIG.NOTIFICATION.POSITION,
				...options
			};
			toastr[type](message, '', defaultOptions);
		}
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
		
		// Get unit info for button state
		let unitInfo = null;
		if (Grocy.Components.HomeAssistantScale.Controller) {
			unitInfo = Grocy.Components.HomeAssistantScale.Controller.unitService.getExpectedUnitWithFallback(input);
			HAScaleLogger.debug('UI', `Detected unit for ${inputRef}: ${unitInfo.unit} (fallback: ${unitInfo.isFallback})`);
		}
		
		// Map old state names to new input manager states
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
		
		// Clear cache after reset to ensure fresh lookups
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
		
		// Use event manager to track handler
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
				const hasToken = config.haToken && config.haToken.length > 0;
				const authState = hasToken ? 
					this.authUIManager.authStates.AUTHENTICATED : 
					this.authUIManager.authStates.UNAUTHENTICATED;
				
				this.authUIManager.updateAuthUI(authState, config);
			}
		});
		
		// Set up event handlers using the element cache
		this._setupConfigEventHandlers();
	}

	_setupConfigEventHandlers() {
		const elements = this.authUIManager._getModalElements();
		
		// Config save button
		this.eventManager.addHandler(elements.configSave, 'click', () => {
			HAScaleLogger.info('UI', 'Config save button clicked, validating configuration');
			
			const config = HAScaleUtils.validateConfig(elements, (type, message, options) => this.showNotification(type, message, options));
			if (!config) return;
			
			HAScaleLogger.info('UI', `Configuration validated successfully: URL=${config.haUrl}, Entity=${config.scaleEntityId}`);
			
			// Validate entity exists before saving
			this.validateEntityExists(config).then(isValid => {
				if (isValid) {
					HAScaleLogger.info('UI', 'Entity validation successful, saving configuration');
					$(document).trigger('HAScale.ConfigSave', [config]);
					elements.modal.modal('hide');
				}
			}).catch(error => {
				HAScaleLogger.error('UI', 'Entity validation error:', error);
				this.showNotification('error', HAScaleConstants.CONFIG.MESSAGES.VALIDATION_FAILED);
			});
		});
		
		// Sign in with Home Assistant OAuth flow
		this.eventManager.addHandler(elements.signInBtn, 'click', () => {
			const rawUrl = elements.urlInput.val();
			const haUrl = HAScaleUtils.sanitizeUrl(rawUrl);
			if (!HAScaleUtils.validateUrl(haUrl, (type, message, options) => this.showNotification(type, message, options))) {
				return;
			}
			
			// Save HA URL directly to localStorage before OAuth flow
			HAScaleStorageService.set(HAScaleConstants.CONFIG.STORAGE_KEYS.HA_URL, haUrl);
			
			this.oauthManager.initializeOAuthFlow(haUrl);
		});
		
		// Manual token entry toggle
		this.eventManager.addHandler(elements.manualTokenBtn, 'click', () => {
			this.authUIManager.showManualTokenInput();
		});
		
		// Logout/disconnect button
		this.eventManager.addHandler(elements.logoutBtn, 'click', () => {
			// Clear stored tokens
			HAScaleStorageService.remove(HAScaleConstants.CONFIG.STORAGE_KEYS.AUTH_TOKENS);
			elements.tokenField.val('');
			
			const controller = Grocy.Components.HomeAssistantScale.Controller;
			if (controller) {
				const currentConfig = controller.model.config;
				// Clear only authentication from model, keep URL and entity ID
				// UI will update automatically via onConfigUpdated observer
				controller.model.updateConfig({
					haUrl: currentConfig.haUrl,
					haToken: null,
					scaleEntityId: currentConfig.scaleEntityId
				});
			}
			
			this.showNotification('info', HAScaleConstants.CONFIG.MESSAGES.LOGOUT_SUCCESS);
		});
		
		// Debug toggle
		this.eventManager.addHandler(elements.debugToggle, 'change', (e) => {
			if (e.target.checked) {
				HAScaleLogger.enable();
			} else {
				HAScaleLogger.disable();
			}
		});
	}

	
	async validateEntityExists(config) {
		try {
			// Create temporary auth object for validation
			const authTokens = {
				access_token: config.haToken,
				hassUrl: config.haUrl,
				clientId: window.location.origin,
				expires: Date.now() + HAScaleConstants.CONFIG.TIMEOUTS.TOKEN_VALIDATION // 30 seconds for validation
			};

			// Get auth using the library
			const auth = await window.HAWS.getAuth({
				hassUrl: config.haUrl,
				clientId: window.location.origin,
				loadTokens: () => authTokens
			});

			if (!auth) {
				throw new Error('Failed to create authentication');
			}

			// Create temporary connection
			const connection = await window.HAWS.createConnection({ auth });
			
			try {
				// Get all entities to check if our scale entity exists
				const entities = await window.HAWS.getStates(connection);
				const entity = entities.find(state => state.entity_id === config.scaleEntityId);
				
				// Close the temporary connection
				connection.close();
				
				if (!entity) {
					this.showNotification('error', HAScaleUtils.formatMessage(HAScaleConstants.CONFIG.MESSAGES.ENTITY_NOT_FOUND, config.scaleEntityId));
					return false;
				}
				
				// Entity exists - validate it has the required attributes
				if (!entity.attributes || typeof entity.attributes.is_stable === 'undefined') {
					this.showNotification('warning', HAScaleUtils.formatMessage(HAScaleConstants.CONFIG.MESSAGES.ENTITY_MISSING_ATTRIBUTE, config.scaleEntityId));
				} else {
					this.showNotification('success', HAScaleUtils.formatMessage(HAScaleConstants.CONFIG.MESSAGES.ENTITY_VALIDATED, config.scaleEntityId));
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
				this.showNotification('error', HAScaleConstants.CONFIG.MESSAGES.AUTH_FAILED);
			} else if (error.message.includes('timeout') || error.message.includes('network')) {
				this.showNotification('error', HAScaleConstants.CONFIG.MESSAGES.CONNECTION_TIMEOUT);
			} else {
				this.showNotification('error', HAScaleConstants.CONFIG.MESSAGES.VALIDATION_FAILED);
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
				this._subscribeToEntityChanges();
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
				this._subscribeToEntityChanges();
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
				HAScaleLogger.warn('Connection', 'Invalid auth error - clearing stored tokens');
				// Clear stored tokens so user can re-authenticate
				this._saveTokens(null);
				this.model.updateConfig({ haToken: null });
			} else if (error === window.HAWS?.ERR_CANNOT_CONNECT) {
				errorMessage = 'Cannot connect to Home Assistant - check URL and network';
			} else if (error === window.HAWS?.ERR_CONNECTION_LOST) {
				errorMessage = 'Connection to Home Assistant lost';
			} else if (error === window.HAWS?.ERR_HASS_HOST_REQUIRED) {
				errorMessage = 'Home Assistant URL is required';
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
			if (!window.HAWS || !window.HAWS.getAuth) {
				throw new Error('home-assistant-js-websocket getAuth function not available');
			}

			// Use the library's getAuth with custom token persistence
			const auth = await window.HAWS.getAuth({
				hassUrl: this.model.config.haUrl,
				clientId: window.location.origin,
				saveTokens: (tokens) => this._saveTokens(tokens),
				loadTokens: () => this._loadTokens()
			});

			return auth;
		} catch (error) {
			HAScaleLogger.error('Connection', 'Authentication error:', error);
			return null;
		}
	}

	_saveTokens(tokens) {
		try {
			if (tokens) {
				// Store complete token data including refresh token
				HAScaleStorageService.setJson(HAScaleConstants.CONFIG.STORAGE_KEYS.AUTH_TOKENS, tokens);
				// Update model with current access token for compatibility
				this.model.config.haToken = tokens.access_token;
				this.model.saveConfiguration();
			} else {
				// Clear tokens
				HAScaleStorageService.remove(HAScaleConstants.CONFIG.STORAGE_KEYS.AUTH_TOKENS);
			}
		} catch (error) {
			HAScaleLogger.error('Connection', 'Error saving tokens', error);
		}
	}

	_loadTokens() {
		try {
			const tokens = HAScaleStorageService.getJson(HAScaleConstants.CONFIG.STORAGE_KEYS.AUTH_TOKENS);
			if (tokens) {
				return tokens;
			}
			
			// Fallback: try to create tokens from stored access token
			if (this.model.config.haToken) {
				return {
					access_token: this.model.config.haToken,
					hassUrl: this.model.config.haUrl,
					clientId: window.location.origin,
					// Set expiry to very soon to force refresh attempt
					expires: Date.now() + 1000
				};
			}
			
			return null;
		} catch (error) {
			HAScaleLogger.error('Connection', 'Error loading tokens', error);
			return null;
		}
	}

	async _handleAuthError() {
		try {
			// Clear current auth and try to get new auth
			this.auth = null;
			this.auth = await this._getAuth();
			
			if (this.auth) {
				HAScaleLogger.debug('Connection', 'Auth refreshed successfully');
				// Connection will automatically retry with new auth
			} else {
				HAScaleLogger.warn('Connection', 'Auth refresh failed, user needs to re-authenticate');
				// Clear stored tokens and notify user
				this._saveTokens(null);
				this.model.updateConfig({ haToken: null });
			}
		} catch (error) {
			HAScaleLogger.error('Connection', 'Error handling auth error', error);
		}
	}

	_subscribeToEntityChanges() {
		try {
			if (!this.connection || !this.connection.connected) {
				HAScaleLogger.error('Connection', 'Cannot subscribe to entities - connection not ready');
				return;
			}

			// Subscribe to entity state changes using the library
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
		
		// Fallback to grams
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
			},
			onStableWeightChanged: (data) => {
				if (data.weight && !isNaN(data.weight)) {
					this.handleStableWeight(data.weight);
				}
			},
			onConfigUpdated: async (config) => {
				// Update UI based on new config
				const hasToken = config.haToken && config.haToken.length > 0;
				const authState = hasToken ? 
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
					}
				}
			}
		});
	}

	setupEventHandlers() {
		const eventMap = {
			'HAScale.ConfigSave': (_, config) => {
				this.model.updateConfig(config);
			},
			'HAScale.ClearInput': (_, input) => {
				const controller = Grocy.Components.HomeAssistantScale.Controller;
				const isConfigComplete = controller?.model?.isConfigComplete();
				const isConnected = controller?.model?.connectionState?.isConnected;
				
				if (!isConfigComplete || !isConnected) {
					$('#ha-scale-config-modal').modal('show');
					controller?.view?.showNotification('info', HAScaleConstants.CONFIG.MESSAGES.CONFIG_REQUIRED, { timeOut: 3000 });
					return;
				} else {
					this.inputService.clearInput(input);
					this.view.showNotification('info', HAScaleConstants.CONFIG.MESSAGES.WAITING_FOR_WEIGHT, { timeOut: HAScaleConstants.CONFIG.TIMEOUTS.NOTIFICATION_MEDIUM });
				}
			}
		};

		// Setup document events
		Object.entries(eventMap).forEach(([event, handler]) => {
			this._addEventHandler($(document), event, handler);
		});
		
		// Form reset handling
		this._addEventHandler($(document), 'reset', 'form', () => {
			setTimeout(() => this.view.resetAllInputs('form-reset'), this.config.INPUT_DEBOUNCE / 10);
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
			}, this.config.INPUT_DEBOUNCE)
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
								setTimeout(() => this.view.resetAllInputs('success-detection'), this.config.INPUT_DEBOUNCE);
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
			
			this.view.showNotification('success', message);
		} catch (error) {
			HAScaleLogger.error('Controller', 'Error processing stable weight:', error);
			this.view.showNotification('error', HAScaleConstants.CONFIG.MESSAGES.WEIGHT_PROCESSING_ERROR);
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
		HAScaleLogger.info('Controller', 'Initializing Home Assistant Scale component');
		
		this.view.initialize();
		
		// Check for OAuth callback on initialization
		this.view.oauthManager.checkOAuthCallback();
		
		if (this.model.loadConfiguration()) {
			HAScaleLogger.info('Controller', 'Configuration loaded, attempting to connect to Home Assistant');
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
			const inputRef = HAScaleUtils.getInputReference($activeElement);
			
			if (this.view.inputManager.isInputWaiting($activeElement)) {
				this.view.updateInputState(activeElement, 'reset');
				this.view.showNotification('info', HAScaleConstants.CONFIG.MESSAGES.SCALE_READING_CANCELLED, { timeOut: HAScaleConstants.CONFIG.TIMEOUTS.NOTIFICATION_QUICK });
			} else {
				$(document).trigger('HAScale.ClearInput', [$activeElement]);
			}
		} else {
			const $weightInputs = $('input').filter((_, input) => this.view.isWeightInput(input));
			
			if ($weightInputs.length > 0) {
				const $firstInput = $weightInputs.first();
				$firstInput.focus();
				$(document).trigger('HAScale.ClearInput', [$firstInput]);
			} else {
				HAScaleLogger.warn('Controller', 'No weight inputs found on page for hotkey operation');
				this.view.showNotification('warning', HAScaleConstants.CONFIG.MESSAGES.NO_WEIGHT_INPUTS, { timeOut: HAScaleConstants.CONFIG.TIMEOUTS.NOTIFICATION_MEDIUM });
			}
		}
		
		// Clear the hotkey flag after a short delay to allow processing to complete
		setTimeout(() => {
			this._hotkeyInProgress = false;
		}, this.config.INPUT_DEBOUNCE + 50);
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
}, HAScaleConstants.CONFIG.INPUT_DEBOUNCE);

$(window).on('beforeunload', () => {
	Grocy.Components.HomeAssistantScale.Controller?.destroy();
});