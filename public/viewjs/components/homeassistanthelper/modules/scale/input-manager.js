class HAHelperScaleInputManager {
	constructor() {
		this.css = HAHelperScaleConstants.CONFIG.CSS_CLASSES;
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

	_generateScaleButton() {
		const css = HAHelperScaleConstants.CONFIG.CSS_CLASSES;
		return `<button type="button" class="btn btn-sm ${css.BUTTON_IDLE} ${css.BUTTON_BASE}">
			<i class="fa-solid fa-scale-balanced"></i>
		</button>`;
	}

	createButton() {
		return $(this._generateScaleButton());
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

	findInputs() {
		// Find all weight inputs on the page (inputs with scale buttons)
		return $(`.${this.css.BUTTON_BASE}`)
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