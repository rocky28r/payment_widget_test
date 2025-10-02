// =================================================================
// CONTRACT FLOW - MAIN APPLICATION JAVASCRIPT
// =================================================================

// =================================================================
// API CLIENT
// =================================================================

class APIError extends Error {
    constructor(code, message, details = {}, retryable = false) {
        super(message);
        this.name = 'APIError';
        this.code = code;
        this.details = details;
        this.retryable = retryable;
    }
}

const API_TIMEOUTS = {
    OFFERS_LIST: 10000,
    OFFER_DETAIL: 5000,
    PREVIEW: 15000,
    PAYMENT_SESSION: 10000,
    SIGNUP: 30000
};

class APIClient {
    constructor() {
        this.baseUrl = null;
        this.apiKey = null;
    }

    configure(baseUrl, apiKey) {
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
    }

    async fetchWithTimeout(url, options, timeout) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new APIError('TIMEOUT', 'Request timed out', {}, true);
            }
            throw error;
        }
    }

    async call(endpoint, options = {}, timeout = 10000) {
        if (!this.baseUrl || !this.apiKey) {
            throw new APIError(
                'CONFIG_ERROR',
                'API not configured. Please set API key and base URL in configuration.',
                {},
                false
            );
        }

        const url = `${this.baseUrl}${endpoint}`;
        const startTime = performance.now();

        try {
            const headers = API_CONFIG.getHeaders(this.apiKey);
            const response = await this.fetchWithTimeout(url, {
                ...options,
                headers: {
                    ...headers,
                    ...options.headers
                }
            }, timeout);

            const duration = performance.now() - startTime;

            if (response.ok) {
                const data = await response.json();
                console.log(`✅ API ${options.method || 'GET'} ${endpoint} (${duration.toFixed(0)}ms)`);
                return data;
            }

            let errorData = {};
            try {
                errorData = await response.json();
            } catch (e) {}

            console.error(`❌ API ${options.method || 'GET'} ${endpoint} - Status: ${response.status}`);
            console.error('Error response body:', JSON.stringify(errorData, null, 2));

            const error = this.createErrorFromResponse(response.status, errorData);
            console.error(`Created error object:`, error);
            throw error;

        } catch (error) {
            if (error instanceof APIError) {
                throw error;
            }

            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new APIError(
                    'NETWORK_ERROR',
                    'Cannot connect to server. Please check your internet connection.',
                    {},
                    true
                );
            }

            throw new APIError('UNKNOWN_ERROR', error.message, {}, true);
        }
    }

    createErrorFromResponse(status, errorData) {
        // Try to extract error message from various response formats
        const apiMessage = errorData.errorMessage || errorData.error?.message || errorData.message;
        const defaultMessage = this.getDefaultErrorMessage(status);
        const message = apiMessage || defaultMessage;
        const details = errorData.error?.details || errorData;

        switch (status) {
            case 400:
                return new APIError('VALIDATION_ERROR', message, details, false);
            case 401:
                return new APIError('AUTH_ERROR', apiMessage || 'Invalid API key', details, false);
            case 403:
                return new APIError('PERMISSION_ERROR', apiMessage || 'Access denied. API key may lack required permissions (e.g., MEMBERSHIP_READ scope)', details, false);
            case 404:
                return new APIError('NOT_FOUND', apiMessage || 'Resource not found', details, false);
            case 409:
                return new APIError('CONFLICT', message, details, false);
            case 422:
                return new APIError('UNPROCESSABLE', message, details, false);
            case 429:
                return new APIError('RATE_LIMIT', message, details, true);
            case 500:
            case 502:
            case 503:
            case 504:
                return new APIError('SERVER_ERROR', message, details, true);
            default:
                return new APIError('UNKNOWN_ERROR', `Error ${status}: ${message}`, details, true);
        }
    }

    getDefaultErrorMessage(status) {
        const messages = {
            400: 'Invalid request data',
            401: 'Authentication failed',
            403: 'Access denied',
            404: 'Resource not found',
            500: 'Internal server error',
            503: 'Service unavailable'
        };
        return messages[status] || 'An error occurred';
    }

    async callWithRetry(endpoint, options, timeout, maxRetries = 3) {
        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await this.call(endpoint, options, timeout);
            } catch (error) {
                lastError = error;

                if (error instanceof APIError && !error.retryable) {
                    throw error;
                }

                if (attempt === maxRetries) {
                    break;
                }

                const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
                console.log(`Retry attempt ${attempt}/${maxRetries} after ${delay}ms`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        throw lastError;
    }

    // API Methods
    async getOffers() {
        return this.callWithRetry('/v1/memberships/membership-offers', {
            method: 'GET'
        }, API_TIMEOUTS.OFFERS_LIST);
    }

    async getOfferById(id) {
        return this.callWithRetry(`/v1/memberships/membership-offers/${id}`, {
            method: 'GET'
        }, API_TIMEOUTS.OFFER_DETAIL);
    }

    async previewMembership(data) {
        return this.callWithRetry('/v1/memberships/signup/preview', {
            method: 'POST',
            body: JSON.stringify(data)
        }, API_TIMEOUTS.PREVIEW);
    }

    async createPaymentSession(data) {
        return this.call('/v1/payments/user-session', {
            method: 'POST',
            body: JSON.stringify(data)
        }, API_TIMEOUTS.PAYMENT_SESSION);
    }

    async createMembership(data) {
        return this.call('/v1/memberships/signup', {
            method: 'POST',
            body: JSON.stringify(data)
        }, API_TIMEOUTS.SIGNUP);
    }
}

const apiClient = new APIClient();

// =================================================================
// VALIDATION ENGINE
// =================================================================

const VALIDATION_RULES = {
    firstName: {
        required: true,
        minLength: 1,
        maxLength: 50,
        pattern: /^[a-zA-ZäöüßÄÖÜàáâãèéêìíîòóôõùúûñçÀÁÂÃÈÉÊÌÍÎÒÓÔÕÙÚÛÑÇ\s\-']+$/,
        message: 'First name must contain only letters'
    },
    lastName: {
        required: true,
        minLength: 1,
        maxLength: 50,
        pattern: /^[a-zA-ZäöüßÄÖÜàáâãèéêìíîòóôõùúûñçÀÁÂÃÈÉÊÌÍÎÒÓÔÕÙÚÛÑÇ\s\-']+$/,
        message: 'Last name must contain only letters'
    },
    email: {
        required: true,
        maxLength: 100,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        message: 'Enter a valid email address'
    },
    dateOfBirth: {
        required: true,
        validate: (value) => {
            const birthDate = new Date(value);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();

            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }

            if (age < 16) return 'You must be at least 16 years old';
            if (age > 120) return 'Please enter a valid date of birth';
            return true;
        }
    },
    'address.street': {
        required: true,
        maxLength: 100
    },
    'address.city': {
        required: true,
        maxLength: 50,
        pattern: /^[a-zA-ZäöüßÄÖÜàáâãèéêìíîòóôõùúûñçÀÁÂÃÈÉÊÌÍÎÒÓÔÕÙÚÛÑÇ\s\-'.]+$/,
        message: 'City must contain only letters'
    },
    'address.postalCode': {
        required: true,
        maxLength: 10,
        validate: (value, formData) => {
            const country = formData['address.country'];
            return validatePostalCode(value, country);
        }
    },
    'address.country': {
        required: true,
        pattern: /^[A-Z]{2}$/,
        message: 'Select a valid country'
    },
    phone: {
        required: false,
        maxLength: 20,
        pattern: /^\+?[1-9]\d{6,19}$/,
        message: 'Enter a valid phone number'
    }
};

const COUNTRY_VALIDATIONS = {
    DE: {
        postalCode: {
            pattern: /^\d{5}$/,
            message: 'German postal code must be 5 digits'
        }
    },
    US: {
        postalCode: {
            pattern: /^\d{5}(-\d{4})?$/,
            message: 'US ZIP code must be 5 digits or ZIP+4 format'
        }
    },
    GB: {
        postalCode: {
            pattern: /^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i,
            message: 'Enter a valid UK postcode'
        }
    },
    CH: {
        postalCode: {
            pattern: /^\d{4}$/,
            message: 'Swiss postal code must be 4 digits'
        }
    },
    AT: {
        postalCode: {
            pattern: /^\d{4}$/,
            message: 'Austrian postal code must be 4 digits'
        }
    },
    FR: {
        postalCode: {
            pattern: /^\d{5}$/,
            message: 'French postal code must be 5 digits'
        }
    }
};

function validatePostalCode(postalCode, country) {
    if (!country) return 'Select a country first';

    const validation = COUNTRY_VALIDATIONS[country]?.postalCode;
    if (!validation) return true;

    if (!validation.pattern.test(postalCode)) {
        return validation.message;
    }

    return true;
}

class FormValidator {
    constructor(rules) {
        this.rules = rules;
        this.errors = {};
    }

    validateField(fieldName, value, formData = {}) {
        const rule = this.rules[fieldName];
        if (!rule) return true;

        if (rule.required && (!value || value.trim() === '')) {
            return rule.message || `${fieldName} is required`;
        }

        if (!rule.required && (!value || value.trim() === '')) {
            return true;
        }

        if (rule.minLength && value.length < rule.minLength) {
            return `Minimum ${rule.minLength} characters required`;
        }

        if (rule.maxLength && value.length > rule.maxLength) {
            return `Maximum ${rule.maxLength} characters allowed`;
        }

        if (rule.pattern && !rule.pattern.test(value)) {
            return rule.message || 'Invalid format';
        }

        if (rule.validate) {
            const result = rule.validate(value, formData);
            if (result !== true) {
                return result;
            }
        }

        return true;
    }

    validateForm(formData) {
        this.errors = {};
        let isValid = true;

        Object.keys(this.rules).forEach(fieldName => {
            const value = formData[fieldName];
            const result = this.validateField(fieldName, value, formData);

            if (result !== true) {
                this.errors[fieldName] = result;
                isValid = false;
            }
        });

        return isValid;
    }

    getError(fieldName) {
        return this.errors[fieldName] || null;
    }

    clearError(fieldName) {
        delete this.errors[fieldName];
    }
}

const customerValidator = new FormValidator(VALIDATION_RULES);

// =================================================================
// UI HELPERS
// =================================================================

function showNotification(message, type = 'info', duration = 5000) {
    const container = document.getElementById('notification-container');
    const id = `notif-${Date.now()}`;

    const colors = {
        success: 'bg-green-50 border-green-200 text-green-800',
        error: 'bg-red-50 border-red-200 text-red-800',
        warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
        info: 'bg-blue-50 border-blue-200 text-blue-800'
    };

    const icons = {
        success: '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>',
        error: '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>',
        warning: '<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>',
        info: '<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>'
    };

    const notification = document.createElement('div');
    notification.id = id;
    notification.className = `notification border rounded-lg p-4 shadow-lg ${colors[type]}`;
    notification.innerHTML = `
        <div class="flex items-start">
            <svg class="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                ${icons[type]}
            </svg>
            <div class="ml-3 flex-1">
                <p class="text-sm font-medium">${message}</p>
            </div>
            <button onclick="document.getElementById('${id}').remove()" class="ml-3 flex-shrink-0">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                </svg>
            </button>
        </div>
    `;

    container.appendChild(notification);

    if (duration > 0) {
        setTimeout(() => {
            const el = document.getElementById(id);
            if (el) el.remove();
        }, duration);
    }
}

function showError(message) {
    showNotification(message, 'error');
}

function showSuccess(message) {
    showNotification(message, 'success');
}

function showWarning(message) {
    showNotification(message, 'warning');
}

function showInfo(message) {
    showNotification(message, 'info');
}

function showLoading(containerId, message = 'Loading...') {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div class="flex items-center justify-center py-12">
            <div class="spinner"></div>
            <span class="ml-3 text-gray-600">${message}</span>
        </div>
    `;
}

function showErrorState(containerId, message, retryCallback) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <svg class="w-12 h-12 text-red-600 mx-auto mb-3" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
            </svg>
            <h3 class="text-lg font-medium text-red-800 mb-2">Error</h3>
            <p class="text-red-700 mb-4">${message}</p>
            ${retryCallback ? `<button onclick="${retryCallback}" class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition">Try Again</button>` : ''}
        </div>
    `;
}

// =================================================================
// FORM VALIDATION UI
// =================================================================

function setupFormValidation(formElement) {
    const fields = formElement.querySelectorAll('[data-validate]');

    fields.forEach(field => {
        field.addEventListener('blur', () => {
            validateAndShowError(field);
        });

        field.addEventListener('input', () => {
            if (field.classList.contains('error')) {
                clearFieldError(field);
            }
        });
    });

    formElement.addEventListener('submit', (e) => {
        e.preventDefault();

        if (validateForm(formElement)) {
            const event = new CustomEvent('formValid', {
                detail: getFormData(formElement)
            });
            formElement.dispatchEvent(event);
        } else {
            scrollToFirstError();
        }
    });
}

function validateAndShowError(field) {
    const fieldName = field.getAttribute('name');
    const value = field.value;
    const formData = getFormData(field.form);

    const result = customerValidator.validateField(fieldName, value, formData);

    if (result !== true) {
        showFieldError(field, result);
        return false;
    } else {
        clearFieldError(field);
        return true;
    }
}

function showFieldError(field, message) {
    field.classList.add('error');
    field.setAttribute('aria-invalid', 'true');

    let errorElement = field.parentElement.querySelector('.error-message');
    if (!errorElement) {
        errorElement = document.createElement('span');
        errorElement.className = 'error-message block mt-1';
        errorElement.id = `${field.id}-error`;
        field.setAttribute('aria-describedby', errorElement.id);
        field.parentElement.appendChild(errorElement);
    }

    errorElement.textContent = message;
}

function clearFieldError(field) {
    field.classList.remove('error');
    field.setAttribute('aria-invalid', 'false');

    const errorElement = field.parentElement.querySelector('.error-message');
    if (errorElement) {
        errorElement.remove();
    }
}

function validateForm(formElement) {
    const formData = getFormData(formElement);
    const isValid = customerValidator.validateForm(formData);

    if (!isValid) {
        const errors = customerValidator.errors;
        Object.keys(errors).forEach(fieldName => {
            const field = formElement.querySelector(`[name="${fieldName}"]`);
            if (field) {
                showFieldError(field, errors[fieldName]);
            }
        });
    }

    return isValid;
}

function getFormData(formElement) {
    const formData = {};
    const fields = formElement.querySelectorAll('[name]');

    fields.forEach(field => {
        if (field.type === 'checkbox') {
            formData[field.name] = field.checked;
        } else if (field.type === 'radio') {
            if (field.checked) {
                formData[field.name] = field.value;
            }
        } else {
            formData[field.name] = field.value;
        }
    });

    return formData;
}

function scrollToFirstError() {
    const firstError = document.querySelector('.error');
    if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstError.focus();
    }
}

// =================================================================
// Continue in next file...
// =================================================================
