// Home Assistant Helper Integration for Grocy
// This is the main entry point that loads all helper modules

(async function() {
	async function loadScript(src) {
		return new Promise((resolve, reject) => {
			const script = document.createElement('script');
			script.src = src;
			script.onload = resolve;
			script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
			document.head.appendChild(script);
		});
	}

	async function loadHAHelperComponents() {
		const scripts = [
			// Core components
			'/viewjs/components/homeassistanthelper/core/constants.js',
			'/viewjs/components/homeassistanthelper/core/core.js',
			'/viewjs/components/homeassistanthelper/core/model.js',
			'/viewjs/components/homeassistanthelper/core/events.js',
			'/viewjs/components/homeassistanthelper/core/auth.js',
			'/viewjs/components/homeassistanthelper/core/services.js',
			'/viewjs/components/homeassistanthelper/core/module-registry.js',

			// Scale module
			'/viewjs/components/homeassistanthelper/modules/scale/index.js',

			// Scanner module
			'/viewjs/components/homeassistanthelper/modules/scanner/index.js',

			// Main components
			'/viewjs/components/homeassistanthelper/core/ui.js',
			'/viewjs/components/homeassistanthelper/core/index.js'
		];

		try {
			for (const script of scripts) {
				await loadScript(script);
			}
		} catch (error) {
			console.error('Failed to load Home Assistant Helper components:', error);
		}
	}

	// Load components when DOM is ready
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', loadHAHelperComponents);
	} else {
		await loadHAHelperComponents();
	}
})();