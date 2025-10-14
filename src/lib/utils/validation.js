/**
 * Validation rules for form fields
 */
export const VALIDATION_RULES = {
	apiKey: {
		required: true,
		minLength: 10,
		message: 'API Key is required'
	},
	amount: {
		required: true,
		validate: (value) => {
			const num = parseFloat(value);
			if (isNaN(num)) return 'Amount must be a number';
			if (num < 0) return 'Amount cannot be negative';
			return true;
		}
	},
	scope: {
		required: true,
		pattern: /^(MEMBER_ACCOUNT|ECOM)$/,
		message: 'Scope must be MEMBER_ACCOUNT or ECOM'
	},
	email: {
		required: true,
		pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
		message: 'Enter a valid email address'
	}
};

/**
 * Validate a single field
 */
export function validateField(fieldName, value, rules = VALIDATION_RULES) {
	const rule = rules[fieldName];
	if (!rule) return true;

	// Required check
	if (rule.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
		return rule.message || `${fieldName} is required`;
	}

	// Skip further validation if field is empty and not required
	if (!rule.required && (!value || value === '')) {
		return true;
	}

	// Min length
	if (rule.minLength && value.length < rule.minLength) {
		return `Minimum ${rule.minLength} characters required`;
	}

	// Max length
	if (rule.maxLength && value.length > rule.maxLength) {
		return `Maximum ${rule.maxLength} characters allowed`;
	}

	// Pattern
	if (rule.pattern && !rule.pattern.test(value)) {
		return rule.message || 'Invalid format';
	}

	// Custom validator
	if (rule.validate) {
		return rule.validate(value);
	}

	return true;
}

/**
 * Validate entire form
 */
export function validateForm(formData, rules = VALIDATION_RULES) {
	const errors = {};

	Object.keys(rules).forEach((fieldName) => {
		const result = validateField(fieldName, formData[fieldName], rules);
		if (result !== true) {
			errors[fieldName] = result;
		}
	});

	return {
		valid: Object.keys(errors).length === 0,
		errors
	};
}
