class HAHelperScaleView {
	constructor(module) {
		this.module = module;
	}

	updateInputState(input, state) {
		const $input = $(input);
		const inputRef = HAHelperUtils.getInputReference($input);

		if (state === 'waiting') {
			HAHelperLogger.info('ScaleModule', `Enabling scale entry for: ${inputRef}`);
		} else if (state === 'reset' && this.module.inputManager.isInputWaiting($input)) {
			HAHelperLogger.info('ScaleModule', `Disabling scale entry for: ${inputRef}`);
		} else {
			HAHelperLogger.debug('ScaleModule', `Updating input state to '${state}' for: ${inputRef}`);
		}

		let unitInfo = null;
		if (this.module.core?.unitService) {
			unitInfo = this.module.core.unitService.getExpectedUnitWithFallback(input);
			HAHelperLogger.debug('ScaleModule', `Detected unit for ${inputRef}: ${unitInfo.unit} (fallback: ${unitInfo.isFallback})`);
		}

		const stateMap = {
			'waiting': this.module.inputManager.states.WAITING,
			'fulfilled': this.module.inputManager.states.FULFILLED,
			'reset': this.module.inputManager.states.IDLE
		};

		const newState = stateMap[state] || this.module.inputManager.states.IDLE;
		this.module.inputManager.setState($input, newState, unitInfo);
	}

	resetAllInputs(reason = 'unknown') {
		HAHelperLogger.info('ScaleModule', `Resetting all scale input states (reason: ${reason})`);
		this.module.inputManager.resetAll();
	}

	isWeightInput(element) {
		if (!element || !$(element).is('input')) return false;

		const $element = $(element);

		if ($element.prop('readonly') || $element.prop('disabled')) {
			return false;
		}

		if (this._checkElementAttributes(element)) {
			return true;
		}

		if (this._checkDataAttributes($element)) {
			return true;
		}

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
								setTimeout(() => this.resetAllInputs('success-detection'), HAHelperScaleConstants.CONFIG.SUCCESS_RESET_DELAY || 3000);
								return;
							}
						}
					}
				}
			}
		});

		const toastContainer = document.querySelector('#toast-container') || document.body;
		this.mutationObserver.observe(toastContainer, {
			childList: true,
			subtree: true
		});
	}

	isStockOperationSuccess(message) {
		if (!message) return false;

		const successPatterns = this._getSuccessPatterns();

		return successPatterns.some(pattern =>
			pattern.terms.every(term => message.toLowerCase().includes(term.toLowerCase()))
		);
	}

	_getSuccessPatterns() {
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
}