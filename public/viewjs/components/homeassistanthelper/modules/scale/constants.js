class HAHelperScaleConstants {
	static get CONFIG() {
		return Object.freeze({
			// Scale-specific timing
			STABLE_WEIGHT_DEBOUNCE: 100,
			HOTKEY_CLEANUP_DELAY: 150,

			// Scale-specific hotkeys
			HOTKEYS: {
				TRIGGER: 'Alt+S'
			},

			// Scale-specific CSS classes
			CSS_CLASSES: {
				AUTO_TARGETED: 'ha-helper-auto-targeted',
				BUTTON_BASE: 'ha-helper-refresh-btn',
				BUTTON_WAITING: 'ha-helper-waiting-btn',
				BUTTON_SUCCESS: 'btn-success',
				BUTTON_WARNING: 'btn-warning',
				BUTTON_IDLE: 'btn-outline-secondary',
				INPUT_FULFILLED: 'ha-helper-scale-fulfilled',
				INPUT_WAITING: 'ha-helper-scale-waiting'
			},

			// Scale-specific timeouts
			TIMEOUTS: {
				NOTIFICATION_QUICK: 1500,
				NOTIFICATION_MEDIUM: 2000
			},

			// Scale-specific messages
			MESSAGES: {
				ENTITY_REQUIRED: 'Please enter the scale entity ID (e.g. sensor.kitchen_scale)',
				ENTITY_MISSING_ATTRIBUTE: 'Entity "{0}" found but missing \'is_stable\' attribute. Scale integration may not work correctly.',
				READING_CANCELLED: 'Scale reading cancelled',
				NO_WEIGHT_INPUTS: 'No weight inputs found on this page',
				WAITING_FOR_WEIGHT: 'Waiting for stable weight reading',
				PROCESSING_ERROR: 'Error processing weight from scale'
			},

			// Unit conversions for weight
			UNIT_CONVERSIONS: {
				'g': 1, 'gram': 1, 'grams': 1,
				'kg': 1000, 'kilo': 1000, 'kilogram': 1000, 'kilograms': 1000,
				'lb': 453.592, 'lbs': 453.592, 'pound': 453.592, 'pounds': 453.592,
				'oz': 28.3495, 'ounce': 28.3495, 'ounces': 28.3495
			},

			// Scale animation settings
			ANIMATION: {
				PULSE_DURATION: '1.5s',
				SCALE_NORMAL: 1,
				SCALE_ENLARGED: 1.2,
				OPACITY_NORMAL: 1,
				OPACITY_DIMMED: 0.7
			},

			// Decimal precision settings
			DEFAULT_DECIMAL_PLACES: 4,
			MAX_DECIMAL_PLACES: 10,
			MIN_DECIMAL_PLACES: 0,

			// Validation
			VALIDATION: {
				ENTITY_MAX_LENGTH: 100
			}
		});
	}
}