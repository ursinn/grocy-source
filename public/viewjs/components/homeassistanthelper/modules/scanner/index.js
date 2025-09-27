// Scanner module loader - loads all scanner module components
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

	const moduleScripts = [
		'constants.js',
		'module.js'
	];

	const basePath = '/viewjs/components/homeassistanthelper/modules/scanner/';

	try {
		for (const script of moduleScripts) {
			await loadScript(basePath + script);
		}
	} catch (error) {
		console.error('Failed to load scanner module components:', error);
	}
})();