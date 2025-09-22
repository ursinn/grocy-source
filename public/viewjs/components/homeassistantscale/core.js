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