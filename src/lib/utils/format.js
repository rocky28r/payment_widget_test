/**
 * Extract amount and currency from API price object or simple number
 * @param {number|object} price - Price as number or {amount, currency} object
 * @returns {{amount: number, currency: string}} - Extracted amount and currency
 */
export function extractPrice(price) {
	if (price === null || price === undefined) {
		return { amount: 0, currency: 'EUR' };
	}

	// Handle object format from API
	if (typeof price === 'object' && price.amount !== undefined) {
		return {
			amount: price.amount,
			currency: price.currency || 'EUR'
		};
	}

	// Handle simple number format
	return {
		amount: price,
		currency: 'EUR' // Default to EUR for legacy data
	};
}

/**
 * Format currency amount with proper locale formatting
 * @param {number} amount - Amount in cents/smallest unit
 * @param {string} currency - Currency code (EUR, USD, etc.)
 * @returns {string} - Formatted currency string
 */
export function formatCurrency(amount, currency = 'EUR') {
	if (amount === null || amount === undefined) return '—';

	// Amount is in cents, convert to main unit
	const value = amount / 100;

	return new Intl.NumberFormat('de-DE', {
		style: 'currency',
		currency: currency
	}).format(value);
}

/**
 * Format currency from decimal value (already in main unit)
 * Supports both simple number and API price object formats
 * @param {number|object} amountOrPrice - Amount in main unit (e.g., 10.50) or {amount, currency} object
 * @param {string} currencyOverride - Optional currency code to override
 * @returns {string} - Formatted currency string
 */
export function formatCurrencyDecimal(amountOrPrice, currencyOverride = null) {
	if (amountOrPrice === null || amountOrPrice === undefined) return '—';

	// Extract amount and currency from price object or simple number
	const { amount, currency } = extractPrice(amountOrPrice);

	// Use override currency if provided, otherwise use extracted currency
	const finalCurrency = currencyOverride || currency;

	return new Intl.NumberFormat('de-DE', {
		style: 'currency',
		currency: finalCurrency
	}).format(amount);
}

/**
 * Format date to locale string
 * @param {string|Date} date - Date to format
 * @returns {string} - Formatted date string
 */
export function formatDate(date) {
	if (!date) return '—';

	const d = typeof date === 'string' ? new Date(date) : date;

	return new Intl.DateTimeFormat('de-DE', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	}).format(d);
}

/**
 * Format date to short format
 * @param {string|Date} date - Date to format
 * @returns {string} - Formatted date string (DD.MM.YYYY)
 */
export function formatDateShort(date) {
	if (!date) return '—';

	const d = typeof date === 'string' ? new Date(date) : date;

	return new Intl.DateTimeFormat('de-DE', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(d);
}

/**
 * Parse payment frequency to readable text
 * @param {string} frequency - Payment frequency code (MONTHLY, YEARLY, etc.)
 * @returns {string} - Human readable frequency
 */
export function parsePaymentFrequency(frequency) {
	const frequencies = {
		MONTHLY: 'per month',
		YEARLY: 'per year',
		QUARTERLY: 'per quarter',
		WEEKLY: 'per week',
		DAILY: 'per day',
		ONE_TIME: 'one-time'
	};

	return frequencies[frequency] || frequency;
}

/**
 * Parse cancellation strategy to readable text
 * @param {string} strategy - Cancellation strategy code
 * @returns {string} - Human readable strategy
 */
export function parseCancellationStrategy(strategy) {
	const strategies = {
		END_OF_CONTRACT: 'End of contract',
		END_OF_MONTH: 'End of month',
		END_OF_QUARTER: 'End of quarter',
		END_OF_YEAR: 'End of year',
		IMMEDIATE: 'Immediately'
	};

	return strategies[strategy] || strategy;
}

/**
 * Parse extension type to readable text
 * @param {string} type - Extension type code
 * @returns {string} - Human readable extension type
 */
export function parseExtensionType(type) {
	const types = {
		AUTOMATIC: 'Automatic',
		MANUAL: 'Manual',
		NONE: 'None'
	};

	return types[type] || type;
}

/**
 * Format duration in months to readable text
 * @param {number|object} duration - Duration in months, or object with {value, unit}
 * @returns {string} - Human readable duration
 */
export function formatDuration(duration) {
	if (!duration) return '—';

	// Handle object format {value: 12, unit: "MONTHS"}
	if (typeof duration === 'object' && duration.value !== undefined) {
		const value = duration.value;
		const unit = duration.unit?.toLowerCase() || 'months';

		// Convert to English units
		const unitMap = {
			'month': value === 1 ? 'month' : 'months',
			'months': value === 1 ? 'month' : 'months',
			'year': value === 1 ? 'year' : 'years',
			'years': value === 1 ? 'year' : 'years',
			'week': value === 1 ? 'week' : 'weeks',
			'weeks': value === 1 ? 'week' : 'weeks',
			'day': value === 1 ? 'day' : 'days',
			'days': value === 1 ? 'day' : 'days'
		};

		const englishUnit = unitMap[unit] || unit;
		return `${value} ${englishUnit}`;
	}

	// Handle number format (months)
	const months = duration;
	if (months === 1) return '1 month';
	if (months < 12) return `${months} months`;
	if (months === 12) return '1 year';
	if (months % 12 === 0) return `${months / 12} years`;

	const years = Math.floor(months / 12);
	const remainingMonths = months % 12;

	return `${years} ${years === 1 ? 'year' : 'years'} and ${remainingMonths} ${remainingMonths === 1 ? 'month' : 'months'}`;
}

/**
 * Construct customer management URL from API base URL and customer ID
 * Transforms: https://<tenant>.open-api.<base_url> -> https://<tenant>.web.<base_url>/#/customermanagement/<customerId>/overview
 * Handles various environment prefixes: local, dev, sandbox, ref, prod (empty)
 * Preserves port numbers if present in the API base URL
 *
 * @param {string} apiBaseUrl - API base URL (e.g., https://spadeanranzenberger.open-api.sandbox.magicline.com)
 * @param {string} customerId - Customer ID from signup response
 * @returns {string|null} - Customer management URL or null if parsing fails
 *
 * @example
 * constructCustomerManagementUrl('https://spadeanranzenberger.open-api.sandbox.magicline.com', '12345')
 * // Returns: 'https://spadeanranzenberger.web.sandbox.magicline.com/#/customermanagement/12345/overview'
 *
 * @example
 * constructCustomerManagementUrl('https://tenant.open-api.magicline.com', '12345')
 * // Returns: 'https://tenant.web.magicline.com/#/customermanagement/12345/overview'
 *
 * @example
 * constructCustomerManagementUrl('https://tenant1.open-api.local.magicline.com:9443', '12345')
 * // Returns: 'https://tenant1.web.local.magicline.com:9443/#/customermanagement/12345/overview'
 */
export function constructCustomerManagementUrl(apiBaseUrl, customerId) {
	if (!apiBaseUrl || !customerId) return null;

	try {
		const url = new URL(apiBaseUrl);

		// Extract hostname parts: tenant.open-api.sandbox.magicline.com
		const hostnameParts = url.hostname.split('.');

		// We need at least: tenant.open-api.domain.tld (4 parts minimum)
		if (hostnameParts.length < 4) {
			console.error('Invalid API URL format:', apiBaseUrl);
			return null;
		}

		// Find the "open-api" part and replace with "web"
		const openApiIndex = hostnameParts.findIndex(part => part === 'open-api');
		if (openApiIndex === -1) {
			console.error('Could not find "open-api" in hostname:', url.hostname);
			return null;
		}

		// Replace "open-api" with "web"
		hostnameParts[openApiIndex] = 'web';

		// Reconstruct the URL
		const webHostname = hostnameParts.join('.');

		// Include port if present (e.g., :9443)
		const portSuffix = url.port ? `:${url.port}` : '';
		const webUrl = `${url.protocol}//${webHostname}${portSuffix}/#/customermanagement/${customerId}/overview`;

		return webUrl;
	} catch (error) {
		console.error('Failed to parse API base URL:', error);
		return null;
	}
}
