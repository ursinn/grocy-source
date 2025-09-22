class HAScaleEventManager {
	constructor() {
		this.handlers = new Map();
		this.globalHandlers = new Set();
	}

	addHandler(element, event, handler, options = {}) {
		const key = `${element}_${event}_${Date.now()}_${Math.random()}`;
		
		this.handlers.set(key, {
			element: $(element),
			event,
			handler,
			options
		});

		if (options.selector) {
			$(element).on(event, options.selector, handler);
		} else {
			$(element).on(event, handler);
		}

		return key;
	}

	addGlobalHandler(event, handler) {
		$(document).on(event, handler);
		this.globalHandlers.add({ event, handler });
	}

	removeHandler(key) {
		const handlerInfo = this.handlers.get(key);
		if (handlerInfo) {
			const { element, event, handler, options } = handlerInfo;
			if (options.selector) {
				element.off(event, options.selector, handler);
			} else {
				element.off(event, handler);
			}
			this.handlers.delete(key);
		}
	}

	cleanup() {
		this.handlers.forEach((_, key) => {
			this.removeHandler(key);
		});

		this.globalHandlers.forEach(({ event, handler }) => {
			$(document).off(event, handler);
		});
		this.globalHandlers.clear();
	}
}

class HAScaleErrorHandler {
	static async withRetry(operation, options = {}) {
		const {
			maxRetries = 3,
			retryDelay = 1000,
			exponentialBackoff = true,
			retryCondition = () => true,
			onRetry = () => {},
			context = 'Operation'
		} = options;

		let lastError;
		
		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			try {
				return await operation(attempt);
			} catch (error) {
				lastError = error;
				
				if (attempt === maxRetries || !retryCondition(error)) {
					HAScaleLogger.error('ErrorHandler', `${context} failed after ${attempt + 1} attempts:`, error);
					break;
				}
				
				const delay = exponentialBackoff 
					? retryDelay * Math.pow(2, attempt)
					: retryDelay;
				
				HAScaleLogger.warn('ErrorHandler', `${context} failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
				onRetry(error, attempt + 1);
				
				await new Promise(resolve => setTimeout(resolve, delay));
			}
		}
		
		throw lastError;
	}

	static handleError(error, context = 'Unknown', showNotification = null) {
		HAScaleLogger.error('ErrorHandler', `${context} error:`, error);
		
		if (error.name === 'NetworkError' || error.message.includes('fetch')) {
			if (showNotification) {
				showNotification('error', HAScaleConstants.CONFIG.MESSAGES.CONNECTION_TIMEOUT);
			}
		} else if (error.message.includes('auth') || error.message.includes('token')) {
			if (showNotification) {
				showNotification('error', HAScaleConstants.CONFIG.MESSAGES.AUTH_FAILED);
			}
		} else {
			if (showNotification) {
				showNotification('error', HAScaleConstants.CONFIG.MESSAGES.VALIDATION_FAILED);
			}
		}
		
		return error;
	}

	static isRetryableError(error) {
		if (!error) return false;
		
		if (error === window.HAWS?.ERR_INVALID_AUTH) {
			return false;
		}
		
		if (error === window.HAWS?.ERR_CANNOT_CONNECT ||
			error === window.HAWS?.ERR_CONNECTION_LOST) {
			return true;
		}
		
		const message = error.message || error.toString() || '';
		return (
			error.name === 'NetworkError' ||
			message.includes('timeout') ||
			message.includes('ECONNRESET') ||
			message.includes('ENOTFOUND') ||
			(error.status >= HAScaleConstants.CONFIG.HTTP_STATUS.SERVER_ERROR_MIN && error.status < HAScaleConstants.CONFIG.HTTP_STATUS.SERVER_ERROR_MAX)
		);
	}
}