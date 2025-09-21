// Centralized constants for the entire HA Scale system
class HAScaleConstants {
	static get CONFIG() {
		return Object.freeze({
			// Timing
			DEBOUNCE_DELAY: 300,
			CACHE_TTL: 30000,
			STABLE_WEIGHT_DEBOUNCE: 100,
			RECONNECT_DELAY: 5000,
			CONNECTION_TIMEOUT: 10000,
			INPUT_DEBOUNCE: 100,
			
			// Precision
			DEFAULT_DECIMAL_PLACES: 4,
			MAX_DECIMAL_PLACES: 10,
			MIN_DECIMAL_PLACES: 0,
			
			// Storage keys
			STORAGE_KEYS: {
				HA_URL: 'grocy_ha_scale_ha_url',
				HA_TOKEN: 'grocy_ha_scale_ha_token',
				SCALE_ENTITY_ID: 'grocy_ha_scale_ha_entity_id',
				DEBUG_MODE: 'grocy_ha_scale_debug'
			},
			
			// Hotkeys
			HOTKEYS: {
				TRIGGER_SCALE: 'Alt+S' // Default hotkey to trigger scale reading
			},
			
			// CSS Classes
			CSS_CLASSES: {
				AUTO_TARGETED: 'ha-scale-auto-targeted',
				BUTTON_BASE: 'ha-scale-refresh-btn',
				BUTTON_WAITING: 'ha-scale-waiting-btn',
				BUTTON_SUCCESS: 'btn-success',
				BUTTON_WARNING: 'btn-warning',
				BUTTON_IDLE: 'btn-outline-secondary',
				INPUT_FULFILLED: 'ha-scale-fulfilled',
				INPUT_WAITING: 'ha-scale-waiting'
			}
		});
	}
}

// Debug utility for centralized logging
class HAScaleDebug {
	static get isEnabled() {
		return localStorage.getItem(HAScaleConstants.CONFIG.STORAGE_KEYS.DEBUG_MODE) === 'true';
	}
	
	static log(category, message, ...args) {
		if (this.isEnabled) {
			console.log(`HA Scale ${category}:`, message, ...args);
		}
	}
	
	static error(category, message, ...args) {
		console.error(`HA Scale ${category}:`, message, ...args);
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
						HAScaleDebug.error('Observer', `Error in observer ${event}:`, error);
					}
				}
			});
		} catch (error) {
			HAScaleDebug.error('Model', 'Error notifying observers:', error);
		}
	}

	updateConfig(config) {
		if (!config || typeof config !== 'object') {
			HAScaleDebug.error('Model', 'Invalid config provided');
			return;
		}
		Object.assign(this.config, config);
		this.saveConfiguration();
		this.notifyObservers('onConfigUpdated', this.config);
	}

	updateConnectionState(state) {
		if (!state || typeof state !== 'object') {
			HAScaleDebug.error('Model', 'Invalid connection state provided');
			return;
		}
		Object.assign(this.connectionState, state);
		this.notifyObservers('onConnectionStateChanged', this.connectionState);
	}

	updateScaleData(data) {
		if (!data || typeof data !== 'object') {
			HAScaleDebug.error('Model', 'Invalid scale data provided');
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
				haUrl: localStorage.getItem(keys.HA_URL) || null,
				haToken: localStorage.getItem(keys.HA_TOKEN) || null,
				scaleEntityId: localStorage.getItem(keys.SCALE_ENTITY_ID) || null
			};
			return this.isConfigComplete();
		} catch (error) {
			HAScaleDebug.error('Config', 'Error loading configuration:', error);
			return false;
		}
	}

	saveConfiguration() {
		try {
			const keys = HAScaleConstants.CONFIG.STORAGE_KEYS;
			const { haUrl = '', haToken = '', scaleEntityId = '' } = this.config;
			localStorage.setItem(keys.HA_URL, haUrl);
			localStorage.setItem(keys.HA_TOKEN, haToken);
			localStorage.setItem(keys.SCALE_ENTITY_ID, scaleEntityId);
		} catch (error) {
			HAScaleDebug.error('Config', 'Error saving configuration:', error);
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

class HAScaleButtonInputHelper {
	static get CSS() {
		return HAScaleConstants.CONFIG.CSS_CLASSES;
	}

	static get BUTTON_STATES() {
		const { BUTTON_IDLE, BUTTON_SUCCESS, BUTTON_WARNING, BUTTON_WAITING } = this.CSS;
		return `${BUTTON_IDLE} ${BUTTON_SUCCESS} ${BUTTON_WARNING} ${BUTTON_WAITING}`;
	}

	// Get input associated with a scale button
	static getInputFromButton($button) {
		return $button.siblings('input').first();
	}

	// Get scale button associated with an input
	static getButtonFromInput($input) {
		return $input.siblings(`.${this.CSS.BUTTON_BASE}`).first();
	}

	// Find all waiting inputs by looking at their buttons
	static findWaitingInputs() {
		return $(`.${this.CSS.BUTTON_BASE}.${this.CSS.BUTTON_WAITING}`)
			.map((_, button) => {
				const $input = this.getInputFromButton($(button));
				return $input.length > 0 ? $input : null;
			})
			.get()
			.filter(Boolean);
	}

	// Create a new scale button with proper classes and icon
	static createButton() {
		const { BUTTON_IDLE, BUTTON_BASE } = this.CSS;
		return $(`<button type="button" class="btn btn-sm ${BUTTON_IDLE} ${BUTTON_BASE}">` +
			'<i class="fa-solid fa-scale-balanced"></i></button>');
	}

	// Check button states - semantic interface
	static isWaiting($button) {
		return $button.hasClass(this.CSS.BUTTON_WAITING);
	}

	static isAutoTargeted($button) {
		return $button.hasClass(this.CSS.AUTO_TARGETED);
	}

	static isFulfilled($button) {
		return $button.hasClass(this.CSS.BUTTON_SUCCESS) || $button.hasClass(this.CSS.BUTTON_WARNING);
	}

	// Input state checks via button
	static isInputWaiting($input) {
		const $button = this.getButtonFromInput($input);
		return $button.length > 0 && this.isWaiting($button);
	}

	static isInputAutoTargeted($input) {
		const $button = this.getButtonFromInput($input);
		return $button.length > 0 && this.isAutoTargeted($button);
	}
}

class HAScaleInputStateManager {
	constructor() {
		this.states = {
			IDLE: 'idle',
			WAITING: 'waiting', 
			FULFILLED: 'fulfilled'
		};
		
		const css = HAScaleConstants.CONFIG.CSS_CLASSES;
		this.cssClasses = {
			[this.states.FULFILLED]: css.INPUT_FULFILLED,
			[this.states.WAITING]: css.INPUT_WAITING,
			AUTO_TARGETED: css.AUTO_TARGETED
		};
		
		this.buttonConfigs = {
			[this.states.IDLE]: {
				classes: [css.BUTTON_IDLE],
				icon: 'fa-scale-balanced',
				getTooltip: (unit, isFallback) => isFallback ? 
					'Waiting for stable weight (unit not detected, will use grams)' :
					`Waiting for stable weight (detected unit: ${unit})`
			},
			[this.states.WAITING]: {
				classes: [css.BUTTON_IDLE, css.BUTTON_WAITING],
				icon: 'fa-scale-balanced',
				getTooltip: (unit, isFallback) => isFallback ? 
					'Waiting for stable weight (unit not detected, will use grams)' :
					`Waiting for stable weight (detected unit: ${unit})`
			},
			[this.states.FULFILLED]: {
				classes: (isFallback) => isFallback ? [css.BUTTON_WARNING] : [css.BUTTON_SUCCESS],
				icon: 'fa-refresh',
				getTooltip: (unit, isFallback) => isFallback ? 
					'Clear and wait for new weight (unit not detected, using grams)' :
					`Clear and wait for new weight (detected unit: ${unit})`
			}
		};
	}

	setState($input, state, unitInfo = null) {
		this._clearAllStates($input);
		this._setInputState($input, state);
		this._setButtonState($input, state, unitInfo);
	}

	_clearAllStates($input) {
		// Clear state classes from input, but preserve AUTO_TARGETED
		const classesToClear = Object.entries(this.cssClasses)
			.filter(([key]) => key !== 'AUTO_TARGETED')
			.map(([, cls]) => cls);
		
		classesToClear.forEach(cls => $input.removeClass(cls));
	}

	_setInputState($input, state) {
		if (state === this.states.WAITING) {
			$input.addClass(this.cssClasses.WAITING);
		} else if (state === this.states.FULFILLED) {
			$input.addClass(this.cssClasses.FULFILLED);
		}
	}

	_setButtonState($input, state, unitInfo) {
		const $button = HAScaleButtonInputHelper.getButtonFromInput($input);
		if ($button.length === 0) return;

		const config = this.buttonConfigs[state];
		if (!config) return;

		// Clear all possible button classes
		$button.removeClass(HAScaleButtonInputHelper.BUTTON_STATES);

		// Apply new classes
		const classes = typeof config.classes === 'function' ? 
			config.classes(unitInfo?.isFallback) : config.classes;
		$button.addClass(classes.join(' '));

		// Set icon and tooltip
		$button.html(`<i class="fa-solid ${config.icon}"></i>`);
		if (unitInfo) {
			$button.attr('title', config.getTooltip(unitInfo.unit, unitInfo.isFallback));
		}
	}

	setAutoTargeted($input) {
		const $button = HAScaleButtonInputHelper.getButtonFromInput($input);
		if ($button.length > 0) {
			$button.addClass(this.cssClasses.AUTO_TARGETED);
			HAScaleDebug.log('StateManager', 'Marked as auto-targeted (permanent)');
		}
	}

	isAutoTargeted($input) {
		const $button = HAScaleButtonInputHelper.getButtonFromInput($input);
		return $button.length > 0 && $button.hasClass(this.cssClasses.AUTO_TARGETED);
	}

	resetAll() {
		const allStates = Object.values(this.cssClasses).join(', .');
		$(`.${allStates}`).each((_, input) => {
			this.setState($(input), this.states.IDLE);
		});
	}
}

class HAScaleView {
	constructor() {
		this.config = HAScaleConstants.CONFIG;
		this.initialized = false;
		this._cache = new Map();
		this.stateManager = new HAScaleInputStateManager();
	}

	initialize() {
		if (this.initialized) return;
		
		this.addStyles();
		this.addConfigurationUI();
		this.addRefreshButtons();
		this.initialized = true;
	}

	updateConnectionStatus(isConnected) {
		const $status = this._getCachedElement('#ha-connection-status');
		if ($status.length > 0) {
			$status.text(isConnected ? 'Connected' : 'Not connected')
				.removeClass('text-success text-danger')
				.addClass(isConnected ? 'text-success' : 'text-danger');
		}
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

	showNotification(type, message, options = {}) {
		if (typeof toastr !== 'undefined') {
			const defaultOptions = {
				timeOut: 3000,
				positionClass: 'toast-bottom-right',
				...options
			};
			toastr[type](message, '', defaultOptions);
		}
	}

	updateInputState(input, state) {
		const $input = $(input);
		
		// Get unit info for button state
		let unitInfo = null;
		if (Grocy.Components.HomeAssistantScale.Controller) {
			unitInfo = Grocy.Components.HomeAssistantScale.Controller.unitService.getExpectedUnitWithFallback(input);
		}
		
		// Map old state names to new state manager states
		const stateMap = {
			'waiting': this.stateManager.states.WAITING,
			'fulfilled': this.stateManager.states.FULFILLED,
			'reset': this.stateManager.states.IDLE
		};
		
		const newState = stateMap[state] || this.stateManager.states.IDLE;
		this.stateManager.setState($input, newState, unitInfo);
	}


	resetAllInputs() {
		this.stateManager.resetAll();
		
		// Clear cache after reset to ensure fresh lookups
		this._clearCache();
	}

	addStyles() {
		if ($('#ha-scale-styles').length > 0) return;
		
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

	addRefreshButtons() {
		const inputSelector = 'input[type="text"], input[type="number"], input:not([type])';
		
		$(inputSelector)
			.filter((_, element) => this._shouldAddButton(element))
			.each((_, element) => this._createRefreshButton($(element)));
	}

	_shouldAddButton(element) {
		const $input = $(element);
		const isWeight = this.isWeightInput(element);
		const hasButton = HAScaleButtonInputHelper.getButtonFromInput($input).length > 0;
		
		HAScaleDebug.log('View', `Button check for ${element.id || 'no-id'}: isWeight=${isWeight}, hasButton=${hasButton}`);
		
		return isWeight && !hasButton;
	}

	_createRefreshButton($input) {
		const $button = HAScaleButtonInputHelper.createButton();
		
		$input.before($button);
		
		$button.on('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
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
			const configMenuHtml = '<a class="dropdown-item" href="#" id="ha-scale-config-menu" data-toggle="modal" data-target="#ha-scale-config-modal">' +
				'<i class="fa-solid fa-scale-balanced"></i> Home Assistant Scale' +
				'</a>' +
				'<div class="dropdown-divider"></div>';
			
			nightModeItem.before(configMenuHtml);
		}
		
		this.addConfigModal();
	}

	addConfigModal() {
		if ($('#ha-scale-config-modal').length > 0) return;
		
		const modalHtml = `
			<div class="modal fade" id="ha-scale-config-modal" tabindex="-1" role="dialog">
				<div class="modal-dialog" role="document">
					<div class="modal-content">
						<div class="modal-header">
							<h5 class="modal-title">Home Assistant Scale Configuration</h5>
							<button type="button" class="close" data-dismiss="modal"><span>&times;</span></button>
						</div>
						<div class="modal-body">
							<div class="form-group">
								<label for="ha-url">Home Assistant URL</label>
								<input type="text" class="form-control" id="ha-url" placeholder="http://homeassistant.local:8123">
							</div>
							<div class="form-group">
								<label for="ha-token">Authentication</label>
								<div class="mb-2">
									<button type="button" class="btn btn-primary btn-block" id="ha-signin-btn">
										<i class="fa-solid fa-sign-in-alt"></i> Sign in with Home Assistant
									</button>
								</div>
								<div class="text-center mb-2">
									<small class="text-muted">OR</small>
								</div>
								<div class="mb-2">
									<button type="button" class="btn btn-outline-secondary btn-block" id="ha-manual-token-btn">
										<i class="fa-solid fa-key"></i> Enter Long-lived Access Token Manually
									</button>
								</div>
								<div id="ha-token-input" class="d-none">
									<input type="password" class="form-control" id="ha-token" placeholder="Your HA access token">
									<small class="form-text text-muted">
										Enter your Home Assistant long-lived access token.
									</small>
								</div>
							</div>
							<div class="form-group">
								<label for="ha-entity-id">Scale Entity ID</label>
								<input type="text" class="form-control" id="ha-entity-id" placeholder="e.g. sensor.kitchen_scale, must have 'is_stable' attribute">
							</div>
							<div class="form-group">
								<small class="form-text text-muted">Connection status: <span id="ha-connection-status">Not connected</span></small>
							</div>
						</div>
						<div class="modal-footer">
							<button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
							<button type="button" class="btn btn-primary" id="ha-config-save">Save & Connect</button>
						</div>
					</div>
				</div>
			</div>
		`;
		
		$('body').append(modalHtml);
		
		// Load current configuration when modal is shown
		$(document).on('show.bs.modal', '#ha-scale-config-modal', () => {
			const controller = Grocy.Components.HomeAssistantScale.Controller;
			if (controller) {
				const config = controller.model.config;
				$('#ha-url').val(config.haUrl || '');
				$('#ha-token').val(config.haToken || '');
				$('#ha-entity-id').val(config.scaleEntityId || '');
				
				// Always default to showing OAuth button
				$('#ha-token-input').addClass('d-none');
				$('#ha-manual-token-btn').removeClass('d-none');
			}
		});
		
		$(document).on('click', '#ha-config-save', () => {
			const config = {
				haUrl: $('#ha-url').val().trim(),
				haToken: $('#ha-token').val().trim(),
				scaleEntityId: $('#ha-entity-id').val().trim()
			};
			
			// Validate all required fields are filled
			if (!config.haUrl) {
				this.showNotification('error', 'Please enter the Home Assistant URL');
				return;
			}
			if (!config.haToken) {
				this.showNotification('error', 'Please enter the access token or sign in with Home Assistant');
				return;
			}
			if (!config.scaleEntityId) {
				this.showNotification('error', 'Please enter the scale entity ID (e.g. sensor.kitchen_scale)');
				return;
			}
			
			// Validate entity exists before saving
			this.validateEntityExists(config).then(isValid => {
				if (isValid) {
					$(document).trigger('HAScale.ConfigSave', [config]);
					$('#ha-scale-config-modal').modal('hide');
				}
			}).catch(error => {
				console.error('Entity validation error:', error);
				this.showNotification('error', 'Failed to validate entity. Please check your configuration and try again.');
			});
		});
		
		// Sign in with Home Assistant OAuth flow
		$(document).on('click', '#ha-signin-btn', () => {
			this.initializeOAuthFlow();
		});
		
		// Manual token entry toggle
		$(document).on('click', '#ha-manual-token-btn', () => {
			$('#ha-token-input').removeClass('d-none');
			$('#ha-manual-token-btn').addClass('d-none');
			$('#ha-token').focus();
		});
	}

	initializeOAuthFlow() {
		const haUrl = $('#ha-url').val().trim();
		
		if (!haUrl) {
			this.showNotification('error', 'Please enter the Home Assistant URL first');
			return;
		}
		
		// Validate URL format
		try {
			const url = new URL(haUrl);
			if (!['http:', 'https:'].includes(url.protocol)) {
				throw new Error('Invalid protocol');
			}
		} catch (error) {
			this.showNotification('error', 'Please enter a valid Home Assistant URL (e.g., http://homeassistant.local:8123)');
			return;
		}
		
		// Generate state parameter for security
		const state = this._generateRandomState();
		localStorage.setItem('ha_oauth_state', state);
		localStorage.setItem('ha_oauth_url', haUrl);
		
		// Build authorization URL
		const clientId = window.location.origin;
		const redirectUri = `${window.location.origin}${window.location.pathname}#ha-oauth-callback`;
		
		const authUrl = new URL('/auth/authorize', haUrl);
		authUrl.searchParams.set('client_id', clientId);
		authUrl.searchParams.set('redirect_uri', redirectUri);
		authUrl.searchParams.set('state', state);
		
		// Navigate to OAuth URL in same tab
		window.location.href = authUrl.toString();
	}
	
	_generateRandomState() {
		const array = new Uint8Array(32);
		crypto.getRandomValues(array);
		return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
	}
	
	
	_checkOAuthCallback() {
		// Check URL hash for callback parameters
		const hash = window.location.hash;
		if (hash.includes('ha-oauth-callback')) {
			const params = new URLSearchParams(hash.substring(hash.indexOf('?')));
			const code = params.get('code');
			const state = params.get('state');
			
			if (code && state) {
				this._handleOAuthCallback(code, state);
				// Clean up URL
				window.location.hash = '';
			}
		}
	}
	
	async _handleOAuthCallback(code, state) {
		const storedState = localStorage.getItem('ha_oauth_state');
		const haUrl = localStorage.getItem('ha_oauth_url');
		
		// Clean up stored data
		localStorage.removeItem('ha_oauth_state');
		localStorage.removeItem('ha_oauth_url');
		
		if (!storedState || state !== storedState) {
			this.showNotification('error', 'OAuth state mismatch. Please try again.');
			return;
		}
		
		if (!haUrl) {
			this.showNotification('error', 'OAuth flow error. Please try again.');
			return;
		}
		
		try {
			// Exchange code for token
			const token = await this._exchangeCodeForToken(haUrl, code);
			
			if (token) {
				// Populate the token field
				$('#ha-token').val(token);
				
				// Auto-save the configuration
				const config = {
					haUrl: haUrl,
					haToken: token,
					scaleEntityId: $('#ha-entity-id').val().trim()
				};
				
				// Always save the URL and token
				$(document).trigger('HAScale.ConfigSave', [config]);
				this.showNotification('success', 'Successfully signed in with Home Assistant! Configuration saved automatically.');
			}
		} catch (error) {
			console.error('OAuth token exchange error:', error);
			this.showNotification('error', 'Failed to exchange authorization code for token. Please try again.');
		}
	}
	
	async _exchangeCodeForToken(haUrl, code) {
		const clientId = window.location.origin;
		const redirectUri = `${window.location.origin}${window.location.pathname}#ha-oauth-callback`;
		
		const tokenUrl = new URL('/auth/token', haUrl);
		
		const response = await fetch(tokenUrl.toString(), {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: new URLSearchParams({
				grant_type: 'authorization_code',
				code: code,
				client_id: clientId,
				redirect_uri: redirectUri
			})
		});
		
		if (!response.ok) {
			throw new Error(`Token exchange failed: ${response.status} ${response.statusText}`);
		}
		
		const data = await response.json();
		return data.access_token;
	}
	
	async validateEntityExists(config) {
		return new Promise((resolve, reject) => {
			// Create a temporary WebSocket connection to validate the entity
			const wsUrl = config.haUrl.replace(/^http/, 'ws') + '/api/websocket';
			const ws = new WebSocket(wsUrl);
			let authCompleted = false;
			let messageId = 1;
			
			const timeout = setTimeout(() => {
				ws.close();
				reject(new Error('Validation timeout'));
			}, 10000); // 10 second timeout
			
			ws.onopen = () => {
				// WebSocket connected, wait for auth_required
			};
			
			ws.onmessage = (event) => {
				try {
					const message = JSON.parse(event.data);
					
					switch (message.type) {
						case 'auth_required':
							ws.send(JSON.stringify({
								type: 'auth',
								access_token: config.haToken
							}));
							break;
							
						case 'auth_ok':
							authCompleted = true;
							// Request the specific entity state
							ws.send(JSON.stringify({
								id: messageId++,
								type: 'get_states'
							}));
							break;
							
						case 'auth_invalid':
							clearTimeout(timeout);
							ws.close();
							reject(new Error('Invalid authentication token'));
							break;
							
						case 'result':
							if (message.success && message.result) {
								// Check if our entity exists in the states
								const entity = message.result.find(state => state.entity_id === config.scaleEntityId);
								
								clearTimeout(timeout);
								ws.close();
								
								if (!entity) {
									resolve(false); // Entity not found
									return;
								}
								
								// Entity exists 
								this.showNotification('success', `Entity "${config.scaleEntityId}" validated successfully!`);
								resolve(true);
							} else {
								clearTimeout(timeout);
								ws.close();
								reject(new Error('Failed to get states from Home Assistant'));
							}
							break;
					}
				} catch (error) {
					clearTimeout(timeout);
					ws.close();
					reject(error);
				}
			};
			
			ws.onerror = (error) => {
				clearTimeout(timeout);
				reject(new Error('WebSocket connection failed'));
			};
			
			ws.onclose = (event) => {
				clearTimeout(timeout);
				if (!authCompleted && event.code !== 1000) {
					reject(new Error('Connection closed before validation completed'));
				}
			};
		});
	}
}

class HAScaleConnectionService {
	constructor(model) {
		this.model = model;
		this.messageId = 1;
		this.config = HAScaleConstants.CONFIG;
		this.reconnectAttempts = 0;
	}

	connect() {
		if (!this.model.isConfigComplete()) {
			HAScaleDebug.log('Connection', 'Missing configuration, cannot connect');
			return false;
		}

		if (this.model.connectionState.isConnected) {
			return true;
		}

		// Prevent multiple simultaneous connection attempts
		if (this.model.connectionState.connection) {
			HAScaleDebug.log('Connection', 'Connection already in progress');
			return false;
		}

		try {
			const wsUrl = this._buildWebSocketUrl(this.model.config.haUrl);
			if (!wsUrl) {
				HAScaleDebug.error('Connection', 'Invalid URL configuration');
				return false;
			}

			return this._createWebSocketConnection(wsUrl);
		} catch (error) {
			HAScaleDebug.error('Connection', 'Connection error', error);
			this.model.updateConnectionState({ lastError: error });
			return false;
		}
	}

	_createWebSocketConnection(wsUrl) {
		const ws = new WebSocket(wsUrl);
		let authCompleted = false;
		const connectionTimeout = setTimeout(() => {
			if (!authCompleted) {
				HAScaleDebug.error('Connection', 'Connection timeout');
				ws.close();
			}
		}, this.config.CONNECTION_TIMEOUT);

		ws.onopen = () => {
			HAScaleDebug.log('Connection', 'WebSocket connected');
			this.reconnectAttempts = 0; // Reset on successful connection
		};

		ws.onmessage = (event) => {
			try {
				const message = JSON.parse(event.data);
				authCompleted = this.handleMessage(message, ws, authCompleted);
				if (authCompleted) {
					clearTimeout(connectionTimeout);
				}
			} catch (error) {
				HAScaleDebug.error('Connection', 'Error parsing message', error);
			}
		};

		ws.onclose = (event) => {
			clearTimeout(connectionTimeout);
			console.log('HA Scale: WebSocket disconnected', event.code, event.reason);
			this.model.updateConnectionState({
				isConnected: false,
				connection: null
			});
			
			// Only reconnect if it was a successful connection that dropped
			if (authCompleted && event.code !== 1000) {
				this.scheduleReconnect();
			}
		};

		ws.onerror = (error) => {
			clearTimeout(connectionTimeout);
			console.error('HA Scale: WebSocket error', error);
			this.model.updateConnectionState({ 
				lastError: error,
				connection: null
			});
			this.reconnectAttempts++;
		};

		this.model.updateConnectionState({ connection: ws });
		return true;
	}

	_buildWebSocketUrl(haUrl) {
		try {
			// Validate and normalize URL
			if (!haUrl || typeof haUrl !== 'string') {
				return null;
			}
			
			const url = haUrl.trim();
			if (!url.match(/^https?:\/\//)) {
				return null;
			}
			
			return url.replace(/^http/, 'ws') + '/api/websocket';
		} catch (error) {
			console.error('HA Scale: Error building WebSocket URL', error);
			return null;
		}
	}

	handleMessage(message, ws, authCompleted) {
		switch (message.type) {
			case 'auth_required':
				ws.send(JSON.stringify({
					type: 'auth',
					access_token: this.model.config.haToken
				}));
				break;
				
			case 'auth_ok':
				console.log('HA Scale: Authentication successful');
				authCompleted = true;
				this.model.updateConnectionState({ isConnected: true });
				
				ws.send(JSON.stringify({
					id: this.messageId++,
					type: 'subscribe_events',
					event_type: 'state_changed'
				}));
				break;
				
			case 'auth_invalid':
				console.error('HA Scale: Authentication failed');
				this.disconnect();
				break;
				
			case 'event':
				this.handleStateChangeEvent(message.event);
				break;
		}
		return authCompleted;
	}

	handleStateChangeEvent(event) {
		if (event.data && event.data.entity_id === this.model.config.scaleEntityId) {
			const newState = event.data.new_state;
			
			console.log('HA Scale: State change event:', {
				entity_id: event.data.entity_id,
				state: newState?.state,
				is_stable: newState?.attributes?.is_stable,
				attributes: newState?.attributes
			});
			
			if (newState && newState.state !== undefined && newState.attributes) {
				const newWeight = parseFloat(newState.state);
				const isStable = newState.attributes.is_stable === true;
				
				console.log(`HA Scale: Parsed weight: ${newWeight}g, stable: ${isStable}`);
				
				this.model.updateScaleData({
					lastWeight: newWeight,
					isStable: isStable,
					attributes: newState.attributes
				});
			} else {
				console.log('HA Scale: Invalid state data received');
			}
		}
	}

	disconnect() {
		if (this.model.connectionState.connection) {
			this.model.connectionState.connection.close();
		}
		
		if (this.model.connectionState.reconnectTimer) {
			clearTimeout(this.model.connectionState.reconnectTimer);
		}
		
		// Reset reconnection attempts on manual disconnect
		this.reconnectAttempts = 0;
		
		this.model.updateConnectionState({
			isConnected: false,
			connection: null,
			reconnectTimer: null
		});
	}

	scheduleReconnect() {
		if (this.model.connectionState.reconnectTimer) {
			clearTimeout(this.model.connectionState.reconnectTimer);
		}
		
		// Exponential backoff for reconnection delay (capped at 30 seconds)
		const delay = Math.min(this.config.RECONNECT_DELAY * Math.pow(2, Math.min(this.reconnectAttempts, 3)), 30000);
		console.log(`HA Scale: Scheduling reconnection in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);
		
		const timer = setTimeout(() => {
			this.connect();
		}, delay);
		
		this.model.updateConnectionState({ reconnectTimer: timer });
	}
}

class HAScaleInputService {
	constructor(view) {
		this.view = view;
		this._inputCache = new Map();
	}

	findTargetInput() {
		console.log('HA Scale: Finding target input...');
		
		const waitingInputs = HAScaleButtonInputHelper.findWaitingInputs();
		console.log(`HA Scale: Found ${waitingInputs.length} waiting inputs`);
		
		if (waitingInputs.length > 0) {
			const $input = waitingInputs[0];
			console.log(`HA Scale: Using waiting input: ${$input.attr('id') || 'no-id'}`);
			return $input;
		}
		
		console.log('HA Scale: No eligible target input found');
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
			console.log('HA Scale: Active input is already fulfilled, skipping');
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
		HAScaleDebug.log('InputService', `Clearing input: ${input.id || 'no-id'}`);
		
		// Clear other waiting inputs efficiently
		this._clearOtherWaitingInputs($input);
		
		// Reset the stored stable weight so the same weight can trigger again
		const controller = Grocy.Components.HomeAssistantScale.Controller;
		if (controller?.model) {
			controller.model.scaleData.lastStableWeight = null;
			HAScaleDebug.log('InputService', 'Reset stored stable weight to allow re-triggering');
		}
		
		// Prepare the target input for scale reading
		this.view.updateInputState(input[0], 'waiting');
		$input.focus();
		
		HAScaleDebug.log('InputService', 'Input cleared and ready for new weight');
	}

	_clearOtherWaitingInputs($targetInput) {
		const waitingInputs = HAScaleButtonInputHelper.findWaitingInputs();
		
		waitingInputs.forEach($input => {
			if ($input[0] !== $targetInput[0]) {
				console.log(`HA Scale: Clearing other waiting input: ${$input.attr('id') || 'no-id'}`);
				this.view.updateInputState($input[0], 'reset');
			}
		});
	}
}

class HAScaleUnitService {
	constructor() {
		this.conversionFactors = Object.freeze({
			'g': 1, 'gram': 1, 'grams': 1,
			'kg': 1000, 'kilo': 1000, 'kilogram': 1000, 'kilograms': 1000,
			'lb': 453.592, 'lbs': 453.592, 'pound': 453.592, 'pounds': 453.592,
			'oz': 28.3495, 'ounce': 28.3495, 'ounces': 28.3495
		});
		this.config = HAScaleConstants.CONFIG;
	}

	getExpectedUnitWithFallback(inputElement) {
		const $input = $(inputElement);
		const inputId = $input.attr('id') || '';
		
		return this._detectUnit($input, inputId);
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
		return weightInGrams / factor;
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
			onConfigUpdated: () => {
				this.connectionService.disconnect();
				if (this.model.isConfigComplete()) {
					this.connectionService.connect();
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
				if (!controller?.model?.isConfigComplete() || !controller?.model?.connectionState?.isConnected) {
					$('#ha-scale-config-modal').modal('show');
					controller?.view?.showNotification('info', 'Please configure Home Assistant connection first', { timeOut: 3000 });
					return;
				} else {
					this.inputService.clearInput(input);
					this.view.showNotification('info', 'Waiting for stable weight reading', { timeOut: 2000 });
				}
			}
		};

		// Setup document events
		Object.entries(eventMap).forEach(([event, handler]) => {
			this._addEventHandler($(document), event, handler);
		});
		
		// Form reset handling
		this._addEventHandler($(document), 'reset', 'form', () => {
			setTimeout(() => this.view.resetAllInputs(), this.config.INPUT_DEBOUNCE / 10);
		});
		
		// Manual input detection with debouncing
		this._addEventHandler($(document), 'input keydown paste', 'input', 
			this._debounce((e) => {
				// Skip manual input detection if hotkey is in progress
				if (this._hotkeyInProgress) {
					return;
				}
				
				const $input = $(e.target);
				if (HAScaleButtonInputHelper.isInputWaiting($input)) {
					if (e.type === 'keydown' || e.type === 'paste' || $input.val().length > 0) {
						this.view.updateInputState(e.target, 'reset');
						console.log('HA Scale: Manual input detected, removing target status');
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
				!HAScaleButtonInputHelper.isInputAutoTargeted($input)) {
				
				console.log(`HA Scale: Auto-targeting focused weight input: ${input.id || 'no-id'}`);
				
				// Clear other waiting inputs first
				this.inputService._clearOtherWaitingInputs($input);
				
				// Reset stored stable weight to allow same weight to trigger
				this.model.scaleData.lastStableWeight = null;
				
				// Set to waiting state and mark as auto-targeted
				this.view.updateInputState(input, 'waiting');
				this.view.stateManager.setAutoTargeted($input);
			}
		});
		
		// Untarget auto-targeted inputs when they lose focus
		this._addEventHandler($(document), 'blur', 'input', (e) => {
			const input = e.target;
			const $input = $(input);
			
			// Only untarget if it's auto-targeted and still waiting (not fulfilled)
			if (this.view.isWeightInput(input) && 
				HAScaleButtonInputHelper.isInputAutoTargeted($input) &&
				HAScaleButtonInputHelper.isInputWaiting($input)) {
				
				console.log(`HA Scale: Untargeting auto-targeted input on blur: ${input.id || 'no-id'}`);
				
				// Reset the input state to idle
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
		
		// Page unload cleanup
		const unloadHandler = () => this.destroy();
		this._addEventHandler($(window), 'beforeunload', unloadHandler);
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
		let timeout;
		return function executedFunction(...args) {
			const later = () => {
				clearTimeout(timeout);
				func.apply(this, args);
			};
			clearTimeout(timeout);
			timeout = setTimeout(later, wait);
		};
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
								console.log('HA Scale: Stock operation success detected, resetting inputs');
								setTimeout(() => this.view.resetAllInputs(), this.config.INPUT_DEBOUNCE);
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
		HAScaleDebug.log('Controller', `Handling stable weight: ${weight}g`);
		
		// Validate weight
		if (weight == null || isNaN(weight) || weight < 0) {
			HAScaleDebug.error('Controller', 'Invalid weight value received:', weight);
			return;
		}
		
		const targetInput = this.inputService.findTargetInput();
		
		if (!targetInput?.length) {
			HAScaleDebug.log('Controller', 'No eligible target input found', {
				totalInputs: $('input').length,
				waitingInputs: $('input.ha-scale-waiting').length,
				focusedElement: `${document.activeElement?.tagName}#${document.activeElement?.id}`
			});
			return;
		}
		
		HAScaleDebug.log('Controller', `Found target input: ${targetInput.attr('id') || 'no-id'}`);
		
		try {
			const unitInfo = this.unitService.getExpectedUnitWithFallback(targetInput[0]);
			const convertedWeight = this.unitService.convertFromGrams(weight, unitInfo.unit);
			const precision = this.unitService.getDecimalPrecision(targetInput[0]);
			const formattedWeight = this.unitService.formatWeight(convertedWeight, precision);
			
			HAScaleDebug.log('Controller', `Converting ${weight}g to ${convertedWeight} ${unitInfo.unit} (formatted: ${formattedWeight})`);
			
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
			HAScaleDebug.error('Controller', 'Error processing stable weight:', error);
			this.view.showNotification('error', 'Error processing weight from scale');
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

	initialize() {
		this.view.initialize();
		
		// Check for OAuth callback on initialization
		this.view._checkOAuthCallback();
		
		if (this.model.loadConfiguration()) {
			this.connectionService.connect();
			console.log('HA Scale: Initialized with saved configuration');
		} else {
			console.log('HA Scale: Initialized without configuration');
		}
	}

	destroy() {
		// Batch cleanup operations
		const cleanupTasks = [
			() => this.connectionService.disconnect(),
			() => this.view.resetAllInputs(),
			() => this.mutationObserver?.disconnect(),
			() => this._cleanupEventHandlers(),
			() => this.view._clearCache(),
			() => this.model.observers.clear()
		];

		cleanupTasks.forEach(task => {
			try {
				task();
			} catch (error) {
				HAScaleDebug.error('Cleanup', 'Error during cleanup task:', error);
			}
		});

		// Reset object references
		this.mutationObserver = null;
		this._cachedSuccessPatterns = null;
		
		console.log('HA Scale: Controller destroyed and cleaned up');
	}

	_handleScaleHotkey() {
		// Set flag to prevent manual input detection during hotkey operation
		this._hotkeyInProgress = true;
		
		// Find the currently focused element
		const activeElement = document.activeElement;
		const $activeElement = $(activeElement);
		
		// Check if focused element is a weight input
		if (activeElement && this.view.isWeightInput(activeElement)) {
			// If it's already waiting, clear it (toggle behavior)
			if (HAScaleButtonInputHelper.isInputWaiting($activeElement)) {
				console.log('HA Scale: Hotkey clearing waiting input');
				this.view.updateInputState(activeElement, 'reset');
				this.view.showNotification('info', 'Scale reading cancelled', { timeOut: 1500 });
			} else {
				// Trigger scale reading for this input
				console.log(`HA Scale: Hotkey triggering scale for focused input: ${activeElement.id || 'no-id'}`);
				$(document).trigger('HAScale.ClearInput', [$activeElement]);
			}
		} else {
			// No weight input focused, find any available weight input
			const $weightInputs = $('input').filter((_, input) => this.view.isWeightInput(input));
			
			if ($weightInputs.length > 0) {
				const $firstInput = $weightInputs.first();
				console.log(`HA Scale: Hotkey targeting first available weight input: ${$firstInput.attr('id') || 'no-id'}`);
				$firstInput.focus();
				$(document).trigger('HAScale.ClearInput', [$firstInput]);
			} else {
				console.log('HA Scale: No weight inputs found for hotkey');
				this.view.showNotification('warning', 'No weight inputs found on this page', { timeOut: 2000 });
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

// ===== INITIALIZATION =====
Grocy.Components.HomeAssistantScale = {
	Controller: null,
	InitDone: false,

	Init() {
		if (this.InitDone) {
			return;
		}

		// Initialize the centralized controller
		this.Controller = new HAScaleController();
		this.Controller.initialize();

		this.InitDone = true;
	}
};

// Initialize the component when the page loads
setTimeout(() => {
	Grocy.Components.HomeAssistantScale.Init();
}, HAScaleConstants.CONFIG.INPUT_DEBOUNCE);

// Cleanup on page unload
$(window).on('beforeunload', () => {
	Grocy.Components.HomeAssistantScale.Controller?.destroy();
});