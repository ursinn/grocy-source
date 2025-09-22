// Home Assistant Scale Integration for Grocy
// This is the main entry point that loads all component modules

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

	async function loadHAScaleComponents() {
		const scripts = [
			'/viewjs/components/homeassistantscale/constants.js',
			'/viewjs/components/homeassistantscale/core.js',
			'/viewjs/components/homeassistantscale/model.js',
			'/viewjs/components/homeassistantscale/events.js',
			'/viewjs/components/homeassistantscale/auth.js',
			'/viewjs/components/homeassistantscale/ui.js',
			'/viewjs/components/homeassistantscale/services.js',
			'/viewjs/components/homeassistantscale/controller.js',
			'/viewjs/components/homeassistantscale/index.js'
		];
		
		try {
			for (const script of scripts) {
				await loadScript(script);
			}
		} catch (error) {
			console.error('Failed to load Home Assistant Scale components:', error);
		}
	}

	// Load components when DOM is ready
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', loadHAScaleComponents);
	} else {
		await loadHAScaleComponents();
	}
})();