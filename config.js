// Central API Configuration
// This configuration can be used across the entire application

const API_CONFIG = {
    // Default API endpoint
    baseUrl: 'https://api.dev.payment.sportalliance.com',

    // API endpoints
    endpoints: {
        userSession: '/v1/payments/user-session'
    },

    // Request configuration
    headers: {
        contentType: 'application/json'
    },

    // Get full URL for an endpoint
    getUrl(endpoint) {
        return `${this.baseUrl}${this.endpoints[endpoint]}`;
    },

    // Get headers with API key
    getHeaders(apiKey) {
        return {
            'Content-Type': this.headers.contentType,
            'X-API-KEY': apiKey
        };
    }
};

// Widget configuration defaults
const WIDGET_CONFIG = {
    scriptUrl: 'https://widget.dev.payment.sportalliance.com/widget.js',
    defaultEnvironment: 'sandbox',
    defaultCountryCode: 'DE',
    defaultLocale: 'en'
};

// Storage configuration
const STORAGE_CONFIG = {
    key: 'paymentWidgetTestSuite',
    version: '1.1'
};
