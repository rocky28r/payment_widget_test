import { ApiError } from './errors.js';
import { debugLog } from '$lib/stores/debugLog.js';

/**
 * HTTP API Client with retry logic and timeout handling
 */
export class ApiClient {
	constructor(baseUrl, apiKey) {
		this.baseUrl = baseUrl;
		this.apiKey = apiKey;
		this.timeout = 10000;
		this.maxRetries = 3;
	}

	/**
	 * Make an HTTP request
	 */
	async request(endpoint, options = {}) {
		const url = `${this.baseUrl}${endpoint}`;
		const config = {
			method: options.method || 'GET',
			headers: {
				'Content-Type': 'application/json',
				'X-API-KEY': this.apiKey,
				...options.headers
			},
			...(options.body && { body: JSON.stringify(options.body) })
		};

		// Log the request
		debugLog.add('request', `${config.method} ${endpoint}`, {
			url,
			method: config.method,
			body: options.body
		});

		return this.fetchWithRetry(url, config, endpoint);
	}

	/**
	 * Fetch with retry logic
	 */
	async fetchWithRetry(url, config, endpoint) {
		let lastError;

		for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
			try {
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), this.timeout);

				const response = await fetch(url, {
					...config,
					signal: controller.signal
				});

				clearTimeout(timeoutId);

				if (!response.ok) {
					const errorData = await response.json().catch(() => ({}));
					const apiError = new ApiError(response.status, errorData);

					// Log API error
					debugLog.add('error', `${config.method} ${endpoint} - ${response.status}`, {
						status: response.status,
						error: errorData,
						attempt,
						maxRetries: this.maxRetries
					});

					throw apiError;
				}

				const data = await response.json();

				// Log successful response
				debugLog.add('response', `${config.method} ${endpoint} - ${response.status}`, {
					status: response.status,
					data
				});

				return data;
			} catch (error) {
				lastError = error;

				// Log network/timeout errors
				if (!(error instanceof ApiError)) {
					debugLog.add('error', `${config.method} ${endpoint} - Network error`, {
						error: error.message,
						attempt,
						maxRetries: this.maxRetries
					});
				}

				// Don't retry on non-retryable errors
				if (error instanceof ApiError && !error.retryable) {
					throw error;
				}

				// Don't retry if this was the last attempt
				if (attempt === this.maxRetries) {
					break;
				}

				// Exponential backoff
				const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}

		throw lastError;
	}

	/**
	 * GET request
	 */
	get(endpoint) {
		return this.request(endpoint, { method: 'GET' });
	}

	/**
	 * POST request
	 */
	post(endpoint, body) {
		return this.request(endpoint, { method: 'POST', body });
	}

	/**
	 * PUT request
	 */
	put(endpoint, body) {
		return this.request(endpoint, { method: 'PUT', body });
	}

	/**
	 * DELETE request
	 */
	delete(endpoint) {
		return this.request(endpoint, { method: 'DELETE' });
	}
}
