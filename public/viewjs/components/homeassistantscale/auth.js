class HAScaleAuthManager {
	constructor() {
		this.config = HAScaleConstants.CONFIG;
	}

	async createOAuthAuth(hassUrl) {
		return await window.HAWS.getAuth({
			hassUrl,
			saveTokens: (tokens) => {
				HAScaleStorageService.setJson(this.config.STORAGE_KEYS.OAUTH_TOKENS, tokens);
				HAScaleLogger.info('Auth', 'OAuth tokens saved');
			},
			loadTokens: () => {
				const tokens = HAScaleStorageService.getJson(this.config.STORAGE_KEYS.OAUTH_TOKENS);
				if (tokens) {
					HAScaleLogger.info('Auth', 'OAuth tokens loaded');
				}
				return tokens;
			}
		});
	}

	createLongLivedAuth(hassUrl, token) {
		const auth = window.HAWS.createLongLivedTokenAuth(hassUrl, token);
		HAScaleStorageService.set(this.config.STORAGE_KEYS.LONG_LIVED_TOKEN, token);
		HAScaleLogger.info('Auth', 'Long-lived token auth created');
		return auth;
	}

	hasOAuth() {
		const tokens = HAScaleStorageService.getJson(this.config.STORAGE_KEYS.OAUTH_TOKENS);
		return tokens?.access_token != null;
	}

	hasLongLived() {
		const token = HAScaleStorageService.get(this.config.STORAGE_KEYS.LONG_LIVED_TOKEN);
		return token?.length > 0;
	}

	clearAllAuth() {
		HAScaleStorageService.remove(this.config.STORAGE_KEYS.OAUTH_TOKENS);
		HAScaleStorageService.remove(this.config.STORAGE_KEYS.LONG_LIVED_TOKEN);
		HAScaleStorageService.remove(this.config.STORAGE_KEYS.AUTH_METHOD);
		HAScaleLogger.info('Auth', 'All authentication data cleared');
	}
}