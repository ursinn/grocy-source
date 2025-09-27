class HAHelperAuthManager {
	constructor() {
		this.config = HAHelperConstants.CONFIG;
	}

	async createOAuthAuth(hassUrl) {
		return await window.HAWS.getAuth({
			hassUrl,
			saveTokens: (tokens) => {
				HAHelperStorageService.setJson(this.config.STORAGE_KEYS.OAUTH_TOKENS, tokens);
				HAHelperLogger.info('Auth', 'OAuth tokens saved');
			},
			loadTokens: () => {
				const tokens = HAHelperStorageService.getJson(this.config.STORAGE_KEYS.OAUTH_TOKENS);
				if (tokens) {
					HAHelperLogger.info('Auth', 'OAuth tokens loaded');
				}
				return tokens;
			}
		});
	}

	createLongLivedAuth(hassUrl, token) {
		const auth = window.HAWS.createLongLivedTokenAuth(hassUrl, token);
		HAHelperStorageService.set(this.config.STORAGE_KEYS.LONG_LIVED_TOKEN, token);
		HAHelperLogger.info('Auth', 'Long-lived token auth created');
		return auth;
	}

	hasOAuth() {
		const tokens = HAHelperStorageService.getJson(this.config.STORAGE_KEYS.OAUTH_TOKENS);
		return tokens?.access_token != null;
	}

	hasLongLived() {
		const token = HAHelperStorageService.get(this.config.STORAGE_KEYS.LONG_LIVED_TOKEN);
		return token?.length > 0;
	}

	clearAllAuth() {
		HAHelperStorageService.remove(this.config.STORAGE_KEYS.OAUTH_TOKENS);
		HAHelperStorageService.remove(this.config.STORAGE_KEYS.LONG_LIVED_TOKEN);
		HAHelperStorageService.remove(this.config.STORAGE_KEYS.AUTH_METHOD);
		HAHelperLogger.info('Auth', 'All authentication data cleared');
	}
}