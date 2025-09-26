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
				SCANNER_ENTITY_ID: 'scanner_entity_id',
				SCANNER_ENABLED: 'scanner_enabled',
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
				TRIGGER_SCALE: 'Alt+S',
				TOGGLE_SCANNER: 'Alt+W'
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
				INPUT_SCANNER_WAITING: 'ha-scanner-waiting',
				BOOTSTRAP_HIDDEN: 'd-none',
				TOAST_SUCCESS: 'toast-success'
			},

			MESSAGES: {
				URL_REQUIRED: 'Please enter the Home Assistant URL',
				TOKEN_REQUIRED: 'Please enter the access token or sign in with Home Assistant',
				ENTITY_REQUIRED: 'Please enter the scale entity ID (e.g. sensor.kitchen_scale)',
				SCANNER_ENTITY_REQUIRED: 'Please enter the scanner entity ID (e.g. sensor.barcode_scanner)',
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
				SCANNER_ENABLED: 'Scanner enabled - focus an input to scan',
				SCANNER_DISABLED: 'Scanner disabled',
				WAITING_FOR_SCAN: 'Waiting for barcode scan',
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