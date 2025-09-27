class HAHelperBaseModule {
	constructor(id, core) {
		this.id = id;
		this.core = core;
	}

	// Static method for module metadata - modules should override this
	static getMetadata() {
		return {
			displayName: 'Unknown Module',
			description: 'No description provided'
		};
	}

	// Abstract methods that modules must implement
	async init() {
		throw new Error(`Module ${this.id} must implement init() method`);
	}

	async destroy() {
		throw new Error(`Module ${this.id} must implement destroy() method`);
	}

	getConfigSection() {
		throw new Error(`Module ${this.id} must implement getConfigSection() method`);
	}

	loadConfig(config) {
		throw new Error(`Module ${this.id} must implement loadConfig(config) method`);
	}

	getConfig() {
		throw new Error(`Module ${this.id} must implement getConfig() method`);
	}

	// Optional validation method - modules can override if they need validation
	async validateConfig(config, validateEntity) {
		// Default: no validation needed
		return { isValid: true };
	}
}

class HAHelperModuleRegistry {
	constructor(core) {
		this.core = core;
		this.modules = new Map(); // Active module instances
		this.moduleClasses = new Map(); // Available module classes
	}

	registerModule(id, moduleClass) {
		// Get metadata from the module class itself
		const metadata = moduleClass.getMetadata ? moduleClass.getMetadata() : {
			displayName: id,
			description: 'No description provided'
		};

		this.moduleClasses.set(id, {
			class: moduleClass,
			metadata: metadata
		});
		HAHelperLogger.debug('ModuleRegistry', `Registered module class: ${id}`);
	}

	async enableModule(id) {
		HAHelperLogger.debug('ModuleRegistry', `enableModule called for: ${id}`);

		if (this.modules.has(id)) {
			HAHelperLogger.debug('ModuleRegistry', `Module ${id} already enabled`);
			return this.modules.get(id);
		}

		const moduleInfo = this.moduleClasses.get(id);
		if (!moduleInfo) {
			HAHelperLogger.error('ModuleRegistry', `Module class not found: ${id}`);
			throw new Error(`Module class not found: ${id}`);
		}

		HAHelperLogger.debug('ModuleRegistry', `Creating module instance for: ${id}`);
		const module = new moduleInfo.class(id, this.core);

		HAHelperLogger.debug('ModuleRegistry', `Calling init() on module: ${id}`);
		await module.init();
		this.modules.set(id, module);

		HAHelperLogger.info('ModuleRegistry', `Module ${id} enabled and initialized`);
		return module;
	}

	async disableModule(id) {
		const module = this.modules.get(id);
		if (!module) {
			HAHelperLogger.debug('ModuleRegistry', `Module ${id} already disabled`);
			return;
		}

		await module.destroy();
		this.modules.delete(id);
		HAHelperLogger.info('ModuleRegistry', `Module ${id} disabled and destroyed`);
	}

	getModule(id) {
		return this.modules.get(id);
	}

	isEnabled(id) {
		return this.modules.has(id);
	}

	getEnabledModules() {
		return Array.from(this.modules.values());
	}

	getEnabledModuleIds() {
		return Array.from(this.modules.keys());
	}

	getAvailableModules() {
		const modules = {};
		for (const [id, moduleInfo] of this.moduleClasses.entries()) {
			modules[id] = {
				...moduleInfo.metadata,
				enabled: this.isEnabled(id)
			};
		}
		return modules;
	}

	async updateModuleStates(moduleConfig) {
		HAHelperLogger.debug('ModuleRegistry', `updateModuleStates called with config: ${JSON.stringify(moduleConfig)}`);
		HAHelperLogger.debug('ModuleRegistry', `Currently enabled modules: ${this.getEnabledModuleIds().join(', ')}`);

		const promises = [];

		// Force clean re-initialization: disable all currently enabled modules first
		const currentlyEnabled = this.getEnabledModuleIds();
		for (const id of currentlyEnabled) {
			HAHelperLogger.debug('ModuleRegistry', `Force disabling existing module: ${id}`);
			promises.push(this.disableModule(id));
		}

		// Wait for all modules to be disabled
		await Promise.all(promises);
		promises.length = 0; // Clear array

		// Now enable modules based on new configuration
		for (const [id, enabled] of Object.entries(moduleConfig)) {
			HAHelperLogger.debug('ModuleRegistry', `Processing module ${id}: enabled=${enabled}`);

			if (enabled) {
				HAHelperLogger.debug('ModuleRegistry', `Enabling module: ${id}`);
				promises.push(this.enableModule(id));
			}
		}

		HAHelperLogger.debug('ModuleRegistry', `Waiting for ${promises.length} module initializations`);
		await Promise.all(promises);
		HAHelperLogger.debug('ModuleRegistry', `Module state updates completed`);
	}

	getConfigSections() {
		const sections = {};
		for (const [id, moduleInfo] of this.moduleClasses.entries()) {
			// Create temporary instance to get config section
			const tempModule = new moduleInfo.class(id, this.core);
			sections[id] = tempModule.getConfigSection();
		}
		return sections;
	}

	loadModuleConfigs(config) {
		HAHelperLogger.debug('ModuleRegistry', `loadModuleConfigs called with: ${JSON.stringify(config)}`);
		for (const module of this.modules.values()) {
			// Pass the module-specific config from the nested structure
			const moduleConfig = config.modules && config.modules[module.id] ? config.modules[module.id] : {};
			HAHelperLogger.debug('ModuleRegistry', `Loading config for module ${module.id}: ${JSON.stringify(moduleConfig)}`);
			module.loadConfig(moduleConfig);
		}
	}

	getModuleConfigs() {
		const configs = {};
		const savedConfig = this.core.model.config;

		// Start with saved configs for all modules, then override with current enabled module configs
		for (const [moduleId] of this.moduleClasses.entries()) {
			// Get saved config if it exists
			if (savedConfig.modules && savedConfig.modules[moduleId]) {
				configs[moduleId] = savedConfig.modules[moduleId];
			}

			// Override with current config if module is enabled
			const enabledModule = this.modules.get(moduleId);
			if (enabledModule) {
				configs[moduleId] = enabledModule.getConfig();
			}
		}

		return configs;
	}

	async cleanup() {
		const promises = [];
		for (const [id] of this.modules) {
			promises.push(this.disableModule(id));
		}
		await Promise.all(promises);
	}
}