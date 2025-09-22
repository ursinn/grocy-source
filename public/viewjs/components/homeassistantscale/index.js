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
}, HAScaleConstants.CONFIG.INIT_DELAY);

$(window).on('beforeunload', () => {
	if (Grocy.Components.HomeAssistantScale.Controller) {
		Grocy.Components.HomeAssistantScale.Controller.cleanup();
	}
});