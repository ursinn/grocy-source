import { HAHelperScannerConstants } from './constants.js';

export class HAHelperScannerModule extends HAHelperBaseModule {
	constructor(id, core) {
		super(id, core);
		this.config = HAHelperScannerConstants.CONFIG;
		this.globalToggleEnabled = true;
		this.eventHandlers = [];
		this._hotkeyInProgress = false;
		this.entityUnsubscribe = null;
		this.observerInstance = null;

		// Scanner state management
		this.scannerData = {
			targetInput: null
		};
	}

	static getMetadata() {
		return {
			displayName: 'Scanner Module',
			description: 'Barcode scanner integration for input fields'
		};
	}

	async init() {
		HAHelperLogger.debug('ScannerModule', 'Scanner module init() called');
		this.addScannerStyles();
		this.setupObservers();
		this.setupEventHandlers();
		// Don't subscribe during init - will be called after config is loaded
		HAHelperLogger.info('ScannerModule', 'Scanner module initialized');
	}

	addScannerStyles() {
		if ($('#ha-scanner-styles').length > 0) return;

		const css = this.config.CSS_CLASSES;
		const styles = `
			<style id="ha-scanner-styles">
				.${css.INPUT_SCANNER_WAITING} {
					border-color: #007bff !important;
					box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25) !important;
					background-color: rgba(0, 123, 255, 0.05) !important;
				}
			</style>
		`;
		$('head').append(styles);
		HAHelperLogger.debug('ScannerModule', 'Scanner styles added');
	}

	async destroy() {
		this._clearAllScannerWaiting();
		this.unsubscribeFromEntity();
		this.cleanup();
		$('#ha-scanner-styles').remove();
		HAHelperLogger.info('ScannerModule', 'Scanner module destroyed');
	}

	setupObservers() {
		this.observerInstance = {
			onConnectionReady: () => {
				// Resubscribe when connection is re-established
				this.unsubscribeFromEntity();
				this.subscribeToEntity();
				HAHelperLogger.info('ScannerModule', 'Resubscribed after reconnection');
			}
		};
		this.core.model.addObserver(this.observerInstance);
	}

	setupEventHandlers() {
		// Scanner hotkey handler (Alt+W)
		this._addEventHandler($(document), 'keydown', (e) => {
			if (e.altKey && e.key.toLowerCase() === 'w') {
				e.preventDefault();
				this._handleScannerHotkey();
			}
		});

		// Focus and blur handlers for input fields
		this._addEventHandler($(document), 'focus', 'input', (e) => {
			if (this.globalToggleEnabled) {
				this._handleInputFocus(e);
			}
		});

		this._addEventHandler($(document), 'blur', 'input', (e) => {
			this._handleInputBlur(e);
		});
	}

	_handleScannerHotkey() {
		if (this._hotkeyInProgress) return;

		this._hotkeyInProgress = true;

		try {

			const isConfigComplete = this.core.model.isConfigComplete();
			const isConnected = this.core.model.connectionState.isConnected;

			if (!isConfigComplete || !isConnected) {
				$(HAHelperConstants.CONFIG.SELECTORS.MODAL).modal('show');
				HAHelperUtils.showNotification('info', HAHelperConstants.CONFIG.MESSAGES.CONFIG_REQUIRED, { timeOut: 3000 });
				return;
			}

			const $focusedInput = $(':focus');

			if ($focusedInput.length > 0 && $focusedInput.is('input')) {
				// Input is focused - toggle waiting state for this specific input
				if ($focusedInput.hasClass(this.config.CSS_CLASSES.INPUT_SCANNER_WAITING)) {
					this._clearScannerWaiting($focusedInput);
					HAHelperUtils.showNotification('info', 'Scanner cancelled for this input', { timeOut: this.config.TIMEOUTS.NOTIFICATION_QUICK });
				} else {
					this._setScannerWaiting($focusedInput);
					HAHelperUtils.showNotification('info', this.config.MESSAGES.WAITING_FOR_SCAN, { timeOut: this.config.TIMEOUTS.NOTIFICATION_MEDIUM });
				}
			} else {
				// No input focused - toggle global scanner mode
				this.globalToggleEnabled = !this.globalToggleEnabled;

				if (this.globalToggleEnabled) {
					HAHelperUtils.showNotification('success', this.config.MESSAGES.ENABLED, { timeOut: this.config.TIMEOUTS.NOTIFICATION_MEDIUM });
				} else {
					this._clearAllScannerWaiting();
					HAHelperUtils.showNotification('info', this.config.MESSAGES.DISABLED, { timeOut: this.config.TIMEOUTS.NOTIFICATION_MEDIUM });
				}
			}

		} finally {
			setTimeout(() => {
				this._hotkeyInProgress = false;
			}, this.config.HOTKEY_CLEANUP_DELAY);
		}
	}

	_handleInputFocus(e) {
		const $input = $(e.target);
		if (this.globalToggleEnabled && $input.is('input')) {
			this._setScannerWaiting($input);
		}
	}

	_handleInputBlur(e) {
		const $input = $(e.target);
		if ($input.hasClass(this.config.CSS_CLASSES.INPUT_SCANNER_WAITING)) {
			this._clearScannerWaiting($input);
		}
	}

	_setScannerWaiting($input) {
		this.scannerData.targetInput = $input;
		$input.addClass(this.config.CSS_CLASSES.INPUT_SCANNER_WAITING);
		HAHelperLogger.debug('ScannerModule', `Scanner waiting set for input: ${HAHelperUtils.getInputReference($input)}`);
	}

	_clearScannerWaiting($input) {
		this.scannerData.targetInput = null;
		$input.removeClass(this.config.CSS_CLASSES.INPUT_SCANNER_WAITING);
		HAHelperLogger.debug('ScannerModule', `Scanner waiting cleared for input: ${HAHelperUtils.getInputReference($input)}`);
	}

	_clearAllScannerWaiting() {
		$(`.${this.config.CSS_CLASSES.INPUT_SCANNER_WAITING}`).each((index, element) => {
			this._clearScannerWaiting($(element));
		});
	}

	_checkExistingFocusedInputs() {
		if (!this.globalToggleEnabled) {
			return;
		}

		const $focusedInput = $(':focus');
		if ($focusedInput.length > 0 && $focusedInput.is('input')) {
			HAHelperLogger.debug('ScannerModule', `Found already-focused input during init: ${HAHelperUtils.getInputReference($focusedInput)}`);
			this._setScannerWaiting($focusedInput);
		}
	}

	_processScannerData(barcode) {

		const $waitingInput = $(`.${this.config.CSS_CLASSES.INPUT_SCANNER_WAITING}`).first();

		if ($waitingInput.length === 0) {
			HAHelperLogger.debug('ScannerModule', `Scanner data received but no waiting input: ${barcode}`);
			return;
		}

		$waitingInput.val(barcode);
		$waitingInput.blur();
		$waitingInput.focus();
		$waitingInput.select();

		// // Move focus to next input field
		// setTimeout(() => {
		// 	// Find next focusable input and move focus there
		// 	const focusableElements = $('input:visible:enabled, select:visible:enabled, textarea:visible:enabled');
		// 	const currentIndex = focusableElements.index($waitingInput[0]);
		// 	const nextElement = focusableElements.eq(currentIndex + 1);

		// 	if (nextElement.length > 0) {
		// 		nextElement.focus();
		// 		HAHelperLogger.debug('ScannerModule', `Focus moved to next input: ${HAHelperUtils.getInputReference(nextElement)}`);
		// 	}
		// }, 50);

		// Clear scanner waiting state
		// this._clearScannerWaiting($waitingInput);

		const inputRef = HAHelperUtils.getInputReference($waitingInput);
		HAHelperLogger.info('ScannerModule', `Scanner data processed: "${barcode}" → ${inputRef}`);
	}


	_addEventHandler(element, event, selector, handler) {
		if (typeof selector === 'function') {
			handler = selector;
			selector = null;
		}

		if (selector) {
			element.on(event, selector, handler);
		} else {
			element.on(event, handler);
		}

		this.eventHandlers.push({ element, event, selector, handler });
	}

	cleanup() {
		this.globalToggleEnabled = false;

		// Remove observers
		if (this.observerInstance) {
			this.core.model.removeObserver(this.observerInstance);
			this.observerInstance = null;
		}

		// Remove event handlers
		this.eventHandlers.forEach(({ element, event, selector, handler }) => {
			if (selector) {
				element.off(event, selector, handler);
			} else {
				element.off(event, handler);
			}
		});
		this.eventHandlers = [];
	}

	// Base class required methods
	getConfigSection() {
		return `
			<div class="scanner-config-section">
				<h6>Scanner Configuration</h6>
				<div class="form-group">
					<label for="ha-helper-scanner-entity-id">Scanner Entity ID</label>
					<input type="text"
						   class="form-control"
						   id="ha-helper-scanner-entity-id"
						   placeholder="sensor.barcode_scanner"
						   maxlength="${this.config.VALIDATION.ENTITY_MAX_LENGTH}">
					<small class="form-text text-muted">Enter the entity ID of your Home Assistant barcode scanner sensor</small>
				</div>
				<div class="scanner-info">
					<small class="form-text text-muted">
						<strong>Usage:</strong> Press <kbd>Alt+W</kbd> to toggle scanner mode
					</small>
				</div>
			</div>
		`;
	}

	loadConfig(config) {
		HAHelperLogger.debug('ScannerModule', `loadConfig called with: ${JSON.stringify(config)}`);
		const entityId = config.scannerEntityId || '';
		HAHelperLogger.debug('ScannerModule', `Setting scanner entity ID field to: "${entityId}"`);
		$('#ha-helper-scanner-entity-id').val(entityId);

		// Unsubscribe from any existing subscription before creating a new one
		this.unsubscribeFromEntity();

		// Now that config is loaded, subscribe to entities
		this.subscribeToEntity();

		// Check for already-focused inputs and set waiting state
		this._checkExistingFocusedInputs();
	}

	getConfig() {
		return {
			scannerEntityId: $('#ha-helper-scanner-entity-id').val().trim()
		};
	}

	subscribeToEntity() {
		HAHelperLogger.debug('ScannerModule', 'subscribeToEntity() called');

		const moduleConfig = this.core.getModuleConfig(this.id);
		const scannerEntityId = moduleConfig.scannerEntityId;

		HAHelperLogger.debug('ScannerModule', `Module config: ${JSON.stringify(moduleConfig)}`);
		HAHelperLogger.debug('ScannerModule', `Scanner entity ID: ${scannerEntityId}`);

		if (!scannerEntityId) {
			HAHelperLogger.debug('ScannerModule', 'No scanner entity ID configured, skipping subscription');
			return;
		}

		HAHelperLogger.debug('ScannerModule', `About to subscribe to entity: ${scannerEntityId}`);

		// Track if this is the first update (initial state) to filter it out
		let isFirstUpdate = true;

		// Subscribe to the scanner entity using the new subscription API
		this.entityUnsubscribe = this.core.connectionService.subscribe([scannerEntityId], (entities) => {
			HAHelperLogger.debug('ScannerModule', `Scanner module callback triggered with entities: ${Object.keys(entities).join(', ')}`);
			const scannerEntity = entities[scannerEntityId];

			if (scannerEntity) {
				if (isFirstUpdate) {
					HAHelperLogger.debug('ScannerModule', `Ignoring initial entity state: ${scannerEntity.state}`);
					isFirstUpdate = false;
					return;
				}

				HAHelperLogger.debug('ScannerModule', `Processing scanner entity update: ${scannerEntity.state}`);
				this.handleScannerEntityUpdate(scannerEntity);
			} else {
				HAHelperLogger.debug('ScannerModule', `No entity found for ${scannerEntityId} in callback`);
			}
		});

		HAHelperLogger.info('ScannerModule', `Subscribed to scanner entity: ${scannerEntityId}`);
	}

	unsubscribeFromEntity() {
		if (this.entityUnsubscribe) {
			this.entityUnsubscribe();
			this.entityUnsubscribe = null;
			HAHelperLogger.info('ScannerModule', 'Unsubscribed from scanner entity');
		}
	}

	handleScannerEntityUpdate(entity) {
		const barcode = entity.state;

		if (!barcode || barcode === 'unknown' || barcode === 'unavailable') {
			HAHelperLogger.debug('ScannerModule', `Invalid scanner state: ${barcode}`);
			return;
		}

		// Process scanner data directly within the module
		this._processScannerData(barcode);
		HAHelperLogger.info('ScannerModule', `Scanner entity update: ${barcode}`);
	}

	async validateConfig(config, validateEntity) {
		const entityId = config.scannerEntityId;
		if (!entityId || !entityId.trim()) {
			return {
				isValid: false,
				message: 'Scanner entity ID is required'
			};
		}

		HAHelperLogger.info('ScannerModule', `Validating scanner entity: ${entityId}`);

		try {
			// Core validator should only need the entity ID
			const isValid = await validateEntity(entityId);

			if (!isValid) {
				return {
					isValid: false,
					message: `Scanner entity "${entityId}" not found or connection failed`
				};
			}

			return {
				isValid: true,
				message: `Scanner entity "${entityId}" validated successfully`
			};
		} catch (error) {
			HAHelperLogger.error('ScannerModule', 'Scanner validation error:', error);
			return {
				isValid: false,
				message: 'Scanner entity validation failed: ' + error.message
			};
		}
	}
}
