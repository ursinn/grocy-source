class HAHelperScannerConstants {
	static get CONFIG() {
		return Object.freeze({
			// Scanner-specific timing
			HOTKEY_CLEANUP_DELAY: 150,

			// Scanner-specific hotkeys
			HOTKEYS: {
				TOGGLE: 'Alt+W'
			},

			// Scanner-specific CSS classes
			CSS_CLASSES: {
				INPUT_SCANNER_WAITING: 'ha-helper-scanner-waiting'
			},

			// Scanner-specific timeouts
			TIMEOUTS: {
				NOTIFICATION_QUICK: 1500,
				NOTIFICATION_MEDIUM: 2000
			},

			// Scanner-specific messages
			MESSAGES: {
				ENTITY_REQUIRED: 'Please enter the scanner entity ID (e.g. sensor.barcode_scanner)',
				ENABLED: 'Scanner enabled - focus an input to scan',
				DISABLED: 'Scanner disabled',
				WAITING_FOR_SCAN: 'Waiting for barcode scan',
				PROCESSING_ERROR: 'Error processing barcode from scanner'
			},

			// Validation
			VALIDATION: {
				ENTITY_MAX_LENGTH: 100
			}
		});
	}
}