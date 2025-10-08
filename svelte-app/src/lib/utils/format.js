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
 * @param {number} amount - Amount in main unit (e.g., 10.50 EUR)
 * @param {string} currency - Currency code
 * @returns {string} - Formatted currency string
 */
export function formatCurrencyDecimal(amount, currency = 'EUR') {
	if (amount === null || amount === undefined) return '—';

	return new Intl.NumberFormat('de-DE', {
		style: 'currency',
		currency: currency
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
 * @param {number} months - Duration in months
 * @returns {string} - Human readable duration
 */
export function formatDuration(months) {
	if (!months) return '—';

	if (months === 1) return '1 Monat';
	if (months < 12) return `${months} Monate`;
	if (months === 12) return '1 Jahr';
	if (months % 12 === 0) return `${months / 12} Jahre`;

	const years = Math.floor(months / 12);
	const remainingMonths = months % 12;

	return `${years} ${years === 1 ? 'Jahr' : 'Jahre'} und ${remainingMonths} ${remainingMonths === 1 ? 'Monat' : 'Monate'}`;
}
