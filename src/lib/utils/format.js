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
		MONTHLY: 'pro Monat',
		YEARLY: 'pro Jahr',
		QUARTERLY: 'pro Quartal',
		WEEKLY: 'pro Woche',
		DAILY: 'pro Tag',
		ONE_TIME: 'einmalig'
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
		END_OF_CONTRACT: 'Zum Vertragsende',
		END_OF_MONTH: 'Zum Monatsende',
		END_OF_QUARTER: 'Zum Quartalsende',
		END_OF_YEAR: 'Zum Jahresende',
		IMMEDIATE: 'Sofort'
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
		AUTOMATIC: 'Automatisch',
		MANUAL: 'Manuell',
		NONE: 'Keine'
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

		// Convert to German units
		const unitMap = {
			'month': value === 1 ? 'Monat' : 'Monate',
			'months': value === 1 ? 'Monat' : 'Monate',
			'year': value === 1 ? 'Jahr' : 'Jahre',
			'years': value === 1 ? 'Jahr' : 'Jahre',
			'week': value === 1 ? 'Woche' : 'Wochen',
			'weeks': value === 1 ? 'Woche' : 'Wochen',
			'day': value === 1 ? 'Tag' : 'Tage',
			'days': value === 1 ? 'Tag' : 'Tage'
		};

		const germanUnit = unitMap[unit] || unit;
		return `${value} ${germanUnit}`;
	}

	// Handle number format (months)
	const months = duration;
	if (months === 1) return '1 Monat';
	if (months < 12) return `${months} Monate`;
	if (months === 12) return '1 Jahr';
	if (months % 12 === 0) return `${months / 12} Jahre`;

	const years = Math.floor(months / 12);
	const remainingMonths = months % 12;

	return `${years} ${years === 1 ? 'Jahr' : 'Jahre'} und ${remainingMonths} ${remainingMonths === 1 ? 'Monat' : 'Monate'}`;
}
