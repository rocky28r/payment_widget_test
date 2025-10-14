/**
 * Custom API Error class
 */
export class ApiError extends Error {
	constructor(status, data) {
		const message = data.errorMessage || data.message || `HTTP ${status}`;
		super(message);
		this.name = 'ApiError';
		this.status = status;
		this.data = data;
		this.retryable = [408, 429, 500, 502, 503, 504].includes(status);
	}
}
