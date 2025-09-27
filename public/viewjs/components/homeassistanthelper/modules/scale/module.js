class HAHelperScaleModule extends HAHelperBaseModule {
	constructor(id, core) {
		super(id, core);
		this.config = HAHelperScaleConstants.CONFIG;
		this.eventHandlers = [];
		this._hotkeyInProgress = false;
		this.entityUnsubscribe = null;
		this.observerInstance = null;
		this.inputManager = new HAHelperScaleInputManager();
		this.view = new HAHelperScaleView(this);

		// Scale-specific data (moved from core model)
		this.scaleData = {
			lastWeight: null,
			lastStableWeight: null,
			isStable: false,
			lastUpdate: null
		};
		this.observers = new Set();
		this._debounceTimers = new Map();
	}

	static getMetadata() {
		return {
			displayName: 'Scale Module',
			description: 'Smart scale integration for weight measurements'
		};
	}

	async init() {
		HAHelperLogger.debug('ScaleModule', 'Scale module init() called');
		this.addScaleStyles();
		this.setupObservers();
		this.setupEventHandlers();
		// Don't subscribe during init - will be called after config is loaded
		// Don't add buttons during init - core controller handles this properly
		HAHelperLogger.info('ScaleModule', 'Scale module initialized');
	}

	addScaleStyles() {
		if ($('#ha-scale-styles').length > 0) return;

		const css = HAHelperScaleConstants.CONFIG.CSS_CLASSES;
		const styles = `
			<style id="ha-scale-styles">
				.${css.BUTTON_BASE} { margin-right: 0; }

				.${css.BUTTON_BASE}.${css.BUTTON_SUCCESS} { color: #fff; }
				.${css.BUTTON_BASE}.${css.BUTTON_WARNING} { color: #fff; }
				.${css.BUTTON_BASE}.${css.BUTTON_WAITING} {
					color: #007bff !important;
					border-color: #007bff !important;
				}
				.${css.BUTTON_BASE}.${css.BUTTON_WAITING} i {
					animation: ha-scale-pulse ${HAHelperScaleConstants.CONFIG.ANIMATION.PULSE_DURATION} ease-in-out infinite;
				}

				@keyframes ha-scale-pulse {
					0% { transform: scale(${HAHelperScaleConstants.CONFIG.ANIMATION.SCALE_NORMAL}); opacity: ${HAHelperScaleConstants.CONFIG.ANIMATION.OPACITY_NORMAL}; }
					50% { transform: scale(${HAHelperScaleConstants.CONFIG.ANIMATION.SCALE_ENLARGED}); opacity: ${HAHelperScaleConstants.CONFIG.ANIMATION.OPACITY_DIMMED}; }
					100% { transform: scale(${HAHelperScaleConstants.CONFIG.ANIMATION.SCALE_NORMAL}); opacity: ${HAHelperScaleConstants.CONFIG.ANIMATION.OPACITY_NORMAL}; }
				}
			</style>
		`;

		$('head').append(styles);
	}

	async destroy() {
		this.removeScaleButtons();
		this.unsubscribeFromEntity();
		this.cleanup();
		HAHelperLogger.info('ScaleModule', 'Scale module destroyed');
	}

	setupObservers() {
		// Register internal scale observer for self-handling
		this.internalObserver = {
			onStableWeightChanged: (data) => {
				if (data.weight && !isNaN(data.weight)) {
					this.handleStableWeight(data.weight);
				}
			}
		};
		this.addObserver(this.internalObserver);

		// Keep connection observer with core for reconnection events
		this.coreObserverInstance = {
			onConnectionReady: () => {
				// Resubscribe when connection is re-established
				this.unsubscribeFromEntity();
				this.subscribeToEntity();
				HAHelperLogger.info('ScaleModule', 'Resubscribed after reconnection');
			}
		};
		this.core.model.addObserver(this.coreObserverInstance);
	}

	setupEventHandlers() {
		const eventMap = {
			'HAHelper.Scale.ClearInput': (_, input) => {
				const isConfigComplete = this.core.model.isConfigComplete();
				const isConnected = this.core.model.connectionState.isConnected;

				if (!isConfigComplete || !isConnected) {
					$(HAHelperConstants.CONFIG.SELECTORS.MODAL).modal('show');
					HAHelperUtils.showNotification('info', HAHelperConstants.CONFIG.MESSAGES.CONFIG_REQUIRED, { timeOut: 3000 });
					return;
				} else {
					this.clearInput(input);
					HAHelperUtils.showNotification('info', this.config.MESSAGES.WAITING_FOR_WEIGHT, { timeOut: this.config.TIMEOUTS.NOTIFICATION_MEDIUM });
				}
			}
		};

		Object.entries(eventMap).forEach(([event, handler]) => {
			this._addEventHandler($(document), event, handler);
		});

		// Scale hotkey handler
		this._addEventHandler($(document), 'keydown', (e) => {
			if (e.altKey && e.key.toLowerCase() === 's') {
				e.preventDefault();
				this._handleScaleHotkey();
			}
		});

		// Focus handling for scale functionality
		this._addEventHandler($(document), 'focus', 'input', (e) => {
			const input = e.target;
			const $input = $(input);

			if (this.view.isWeightInput(input) &&
				!this.inputManager.isInputAutoTargeted($input) &&
				this.core.model.isConfigComplete()) {

				this._clearOtherWaitingInputs($input);
				this.scaleData.lastStableWeight = null;
				this.view.updateInputState(input, 'waiting');
				this.inputManager.setAutoTargeted($input);
			}
		});

		this._addEventHandler($(document), 'blur', 'input', (e) => {
			const input = e.target;
			const $input = $(input);

			if (this.view.isWeightInput(input) &&
				this.inputManager.isInputAutoTargeted($input) &&
				this.inputManager.isInputWaiting($input)) {

				this.view.updateInputState(input, 'reset');
			}
		});

		// Handle manual input to reset waiting state
		this._addEventHandler($(document), 'input keydown paste', 'input',
			this.core._debounce((e) => {
				const $input = $(e.target);
				if (this.inputManager.isInputWaiting($input)) {
					if (e.type === 'keydown' || e.type === 'paste' || $input.val().length > 0) {
						this.view.updateInputState(e.target, 'reset');
					}
				}
			}, HAHelperScaleConstants.CONFIG.INPUT_DEBOUNCE || 250)
		);

		// Handle form resets
		this._addEventHandler($(document), 'reset', 'form', () => {
			setTimeout(() => this.view.resetAllInputs('form-reset'), HAHelperScaleConstants.CONFIG.FORM_RESET_DELAY || 1000);
		});

		this.view.setupSuccessDetection();
	}

	_handleScaleHotkey() {
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

			const $inputs = this.inputManager.findInputs();

			if ($inputs.length === 0) {
				HAHelperUtils.showNotification('warning', this.config.MESSAGES.NO_WEIGHT_INPUTS, { timeOut: this.config.TIMEOUTS.NOTIFICATION_MEDIUM });
				return;
			}

			const $waitingInputs = this.inputManager.findWaitingInputs();

			if ($waitingInputs.length > 0) {
				HAHelperUtils.showNotification('info', this.config.MESSAGES.READING_CANCELLED, { timeOut: this.config.TIMEOUTS.NOTIFICATION_QUICK });
				this.view.resetAllInputs('success-detection');
				return;
			}

			const $focusedInput = $(':focus');
			let $targetInput = null;

			if ($focusedInput.length > 0 && this.view.isWeightInput($focusedInput[0])) {
				$targetInput = $focusedInput;
			} else {
				$targetInput = $inputs.first();
			}

			this.clearInput($targetInput);
			HAHelperUtils.showNotification('info', this.config.MESSAGES.WAITING_FOR_WEIGHT, { timeOut: this.config.TIMEOUTS.NOTIFICATION_MEDIUM });

		} finally {
			setTimeout(() => {
				this._hotkeyInProgress = false;
			}, this.config.HOTKEY_CLEANUP_DELAY);
		}
	}

	handleStableWeight(weight) {
		const $targetInput = this.findTargetInput();

		if (!$targetInput) {
			HAHelperLogger.debug('ScaleModule', `No target input found for weight: ${weight}g`);
			return;
		}

		const unitResult = this.core.unitService.getExpectedUnitWithFallback($targetInput[0]);
		const convertedWeight = this.core.unitService.convertFromGrams(weight, unitResult.unit);
		const precision = this.core.unitService.getDecimalPrecision($targetInput[0]);
		const formattedWeight = this.core.unitService.formatWeight(convertedWeight, precision);

		$targetInput.val(formattedWeight);
		$targetInput.trigger('keyup');
		$targetInput.trigger('change');
		$targetInput.blur();

		// setTimeout(() => {
		// 	// Find next focusable input and move focus there
		// 	const focusableElements = $('input:visible:enabled, select:visible:enabled, textarea:visible:enabled');
		// 	const currentIndex = focusableElements.index($targetInput[0]);
		// 	const nextElement = focusableElements.eq(currentIndex + 1);

		// 	if (nextElement.length > 0) {
		// 		nextElement.focus();
		// 		HAHelperLogger.debug('ScaleModule', `Focus moved to next input: ${HAHelperUtils.getInputReference(nextElement)}`);
		// 	}
		// }, 50);

		this.view.updateInputState($targetInput[0], 'fulfilled');

		const inputRef = HAHelperUtils.getInputReference($targetInput);
		HAHelperLogger.info('ScaleModule', `Weight processed: ${weight}g → ${formattedWeight} ${unitResult.unit} (${inputRef})`);
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

	addScaleButtons() {
		if (this.core.model.isConfigComplete()) {
			this.addRefreshButtons();
		}
	}

	removeScaleButtons() {
		this.removeRefreshButtons();
	}

	cleanup() {
		// Remove observers
		if (this.coreObserverInstance) {
			this.core.model.removeObserver(this.coreObserverInstance);
			this.coreObserverInstance = null;
		}
		if (this.internalObserver) {
			this.removeObserver(this.internalObserver);
			this.internalObserver = null;
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

		// Clean up mutation observer
		if (this.mutationObserver) {
			this.mutationObserver.disconnect();
			this.mutationObserver = null;
		}

		// Remove scale-specific styles
		$('#ha-scale-styles').remove();

		// Clean up debounce timers
		for (const timer of this._debounceTimers.values()) {
			clearTimeout(timer);
		}
		this._debounceTimers.clear();

		// Clear observers
		this.observers.clear();
	}

	// Scale data management (moved from core model)
	addObserver(observer) {
		this.observers.add(observer);
	}

	removeObserver(observer) {
		this.observers.delete(observer);
	}

	notifyObservers(eventName, data) {
		for (const observer of this.observers) {
			if (observer[eventName] && typeof observer[eventName] === 'function') {
				try {
					observer[eventName](data);
				} catch (error) {
					HAHelperLogger.error('ScaleModule', `Error in observer ${eventName}:`, error);
				}
			}
		}
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

	updateScaleData(data) {
		if (!data || typeof data !== 'object') {
			HAHelperLogger.error('ScaleModule', 'Invalid scale data provided');
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
			}, HAHelperScaleConstants.CONFIG.STABLE_WEIGHT_DEBOUNCE);
		}

		this.notifyObservers('onScaleDataUpdated', this.scaleData);
	}

	// Base class required methods
	getConfigSection() {
		return `
			<div class="scale-config-section">
				<h6>Scale Configuration</h6>
				<div class="form-group">
					<label for="ha-helper-scale-entity-id">Scale Entity ID</label>
					<input type="text"
						   class="form-control"
						   id="ha-helper-scale-entity-id"
						   placeholder="sensor.kitchen_scale"
						   maxlength="${this.config.VALIDATION.ENTITY_MAX_LENGTH}">
					<small class="form-text text-muted">Enter the entity ID of your Home Assistant scale sensor (must have 'is_stable' attribute)</small>
				</div>
				<div class="scale-info">
					<small class="form-text text-muted">
						<strong>Usage:</strong> Press <kbd>Alt+S</kbd> to trigger scale reading or use the scale buttons on weight inputs
					</small>
				</div>
			</div>
		`;
	}

	loadConfig(config) {
		HAHelperLogger.debug('ScaleModule', `loadConfig called with: ${JSON.stringify(config)}`);
		const entityId = config.scaleEntityId || '';
		HAHelperLogger.debug('ScaleModule', `Setting scale entity ID field to: "${entityId}"`);
		$('#ha-helper-scale-entity-id').val(entityId);

		// Unsubscribe from any existing subscription before creating a new one
		this.unsubscribeFromEntity();

		// Now that config is loaded, subscribe to entities
		this.subscribeToEntity();

		// Add scale buttons now that config is loaded
		this.addScaleButtons();
	}

	getConfig() {
		return {
			scaleEntityId: $('#ha-helper-scale-entity-id').val().trim()
		};
	}

	subscribeToEntity() {
		HAHelperLogger.debug('ScaleModule', 'subscribeToEntity() called');

		const moduleConfig = this.core.getModuleConfig(this.id);
		const scaleEntityId = moduleConfig.scaleEntityId;

		HAHelperLogger.debug('ScaleModule', `Module config: ${JSON.stringify(moduleConfig)}`);
		HAHelperLogger.debug('ScaleModule', `Scale entity ID: ${scaleEntityId}`);

		if (!scaleEntityId) {
			HAHelperLogger.debug('ScaleModule', 'No scale entity ID configured, skipping subscription');
			return;
		}

		HAHelperLogger.debug('ScaleModule', `About to subscribe to entity: ${scaleEntityId}`);

		// Track if this is the first update (initial state) to filter it out
		let isFirstUpdate = true;

		// Subscribe to the scale entity using the new subscription API
		this.entityUnsubscribe = this.core.connectionService.subscribe([scaleEntityId], (entities) => {
			HAHelperLogger.debug('ScaleModule', `Scale module callback triggered with entities: ${Object.keys(entities).join(', ')}`);
			const scaleEntity = entities[scaleEntityId];

			if (scaleEntity) {
				if (isFirstUpdate) {
					HAHelperLogger.debug('ScaleModule', `Ignoring initial entity state: ${scaleEntity.state}`);
					isFirstUpdate = false;
					return;
				}

				HAHelperLogger.debug('ScaleModule', `Processing scale entity update: ${scaleEntity.state}`);
				this.handleWeightEntityUpdate(scaleEntity);
			} else {
				HAHelperLogger.debug('ScaleModule', `No entity found for ${scaleEntityId} in callback`);
			}
		});

		HAHelperLogger.info('ScaleModule', `Subscribed to scale entity: ${scaleEntityId}`);
	}

	unsubscribeFromEntity() {
		if (this.entityUnsubscribe) {
			this.entityUnsubscribe();
			this.entityUnsubscribe = null;
			HAHelperLogger.info('ScaleModule', 'Unsubscribed from scale entity');
		}
	}

	handleWeightEntityUpdate(entity) {
		const weight = parseFloat(entity.state);
		const isStable = entity.attributes?.is_stable === true;

		if (isNaN(weight)) {
			HAHelperLogger.debug('ScaleModule', `Invalid weight value: ${entity.state}`);
			return;
		}

		const scaleData = {
			lastWeight: weight,
			isStable: isStable,
			attributes: entity.attributes || {}
		};

		this.updateScaleData(scaleData);
		HAHelperLogger.debug('ScaleModule', `Scale entity update: ${weight}${entity.attributes?.unit_of_measurement || ''} (stable: ${isStable})`);
	}

	async validateConfig(config, validateEntity) {
		const entityId = config.scaleEntityId;
		if (!entityId || !entityId.trim()) {
			return {
				isValid: false,
				message: 'Scale entity ID is required'
			};
		}

		HAHelperLogger.info('ScaleModule', `Validating scale entity: ${entityId}`);

		try {
			// Core validator should only need the entity ID
			const isValid = await validateEntity(entityId);

			if (!isValid) {
				return {
					isValid: false,
					message: `Scale entity "${entityId}" not found or connection failed`
				};
			}

			// TODO: Add scale-specific validation for is_stable attribute
			// For now, basic validation is sufficient

			return {
				isValid: true,
				message: `Scale entity "${entityId}" validated successfully`
			};
		} catch (error) {
			HAHelperLogger.error('ScaleModule', 'Scale validation error:', error);
			return {
				isValid: false,
				message: 'Scale entity validation failed: ' + error.message
			};
		}
	}

	// Scale-specific UI methods (moved from core)
	addRefreshButtons() {
		const inputSelector = HAHelperConstants.CONFIG.SELECTORS.INPUT_SELECTOR;
		const self = this;
		const eligibleInputs = $(inputSelector).filter(function(_, element) {
			return self._shouldAddButton(element);
		});
		HAHelperLogger.debug('ScaleModule', `Adding refresh buttons to ${eligibleInputs.length} eligible weight inputs`);
		eligibleInputs.each((_, element) => this._createRefreshButton($(element)));
	}

	removeRefreshButtons() {
		const css = HAHelperConstants.CONFIG.CSS_CLASSES;
		$(`.${css.BUTTON_BASE}`).remove();
		HAHelperLogger.debug('ScaleModule', 'Removed all scale refresh buttons');
	}

	_shouldAddButton(element) {
		const $input = $(element);
		const isWeight = this.view.isWeightInput(element);
		const hasButton = this.inputManager.getButtonFromInput($input).length > 0;

		return isWeight && !hasButton;
	}

	_createRefreshButton($input) {
		const $button = this.inputManager.createButton();
		const inputRef = HAHelperUtils.getInputReference($input);

		HAHelperLogger.debug('ScaleModule', `Creating refresh button for input: ${inputRef}`);

		$input.before($button);

		this.core.view.eventManager.addHandler($button, 'click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			HAHelperLogger.info('ScaleModule', `Refresh button clicked for input: ${inputRef}`);
			$(document).trigger('HAHelper.ClearInput', [$input]);
		});
	}

	// Scale-specific input service methods (moved from core)
	findTargetInput() {
		const waitingInputs = this.inputManager.findWaitingInputs();

		if (waitingInputs.length > 0) {
			const $input = waitingInputs[0];
			const inputRef = HAHelperUtils.getInputReference($input);
			HAHelperLogger.debug('ScaleModule', `Found target input: ${inputRef} (${waitingInputs.length} waiting inputs total)`);
			return $input;
		}

		HAHelperLogger.debug('ScaleModule', 'No waiting inputs found for scale data');
		return null;
	}

	_isValidTargetInput(element) {
		return element && this.view.isWeightInput(element);
	}

	_prepareActiveInput($activeElement, activeElement) {
		if ($activeElement.hasClass('ha-scale-waiting')) {
			return $activeElement;
		}

		if ($activeElement.hasClass('ha-scale-fulfilled')) {
			return null;
		}

		if (!$activeElement.hasClass('ha-scale-auto-targeted')) {
			$activeElement.addClass('ha-scale-auto-targeted');
			this.view.updateInputState(activeElement, 'waiting');
			return $activeElement;
		}

		return null;
	}

	clearInput(input) {
		const $input = $(input);

		this._clearOtherWaitingInputs($input);

		this.scaleData.lastStableWeight = null;
		HAHelperLogger.debug('ScaleModule', 'Reset lastStableWeight to allow same weight to trigger again');

		this.view.updateInputState(input[0], 'waiting');
		$input.focus();
	}

	_clearOtherWaitingInputs($targetInput) {
		const waitingInputs = this.inputManager.findWaitingInputs();
		const clearedCount = waitingInputs.filter($input => $input[0] !== $targetInput[0]).length;

		if (clearedCount > 0) {
			HAHelperLogger.debug('ScaleModule', `Clearing ${clearedCount} other waiting inputs`);
		}

		waitingInputs.forEach($input => {
			if ($input[0] !== $targetInput[0]) {
				this.view.updateInputState($input[0], 'reset');
			}
		});
	}
}
