/**
 * Contract Flow (Experimental) - Main Application Logic
 * Experimental conversion-optimized membership signup flow
 */

// =================================================================
// STORAGE MANAGER
// =================================================================

class StorageManager {
    constructor(prefix = 'contractOptimized:') {
        this.prefix = prefix;
        this.available = this.testStorage();
        this.memoryFallback = {};
    }

    testStorage() {
        try {
            const test = '__test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            console.warn('localStorage not available:', e);
            return false;
        }
    }

    set(key, value, ttl = null) {
        const fullKey = this.prefix + key;
        const item = {
            value,
            timestamp: Date.now(),
            expiry: ttl ? Date.now() + ttl : null
        };

        try {
            if (this.available) {
                localStorage.setItem(fullKey, JSON.stringify(item));
                return true;
            }
        } catch (e) {
            console.error('Storage error:', e);
            this.available = false;
        }

        this.memoryFallback[fullKey] = item;
        return false;
    }

    get(key) {
        const fullKey = this.prefix + key;
        let item = null;

        try {
            if (this.available) {
                const stored = localStorage.getItem(fullKey);
                item = stored ? JSON.parse(stored) : null;
            }
        } catch (e) {
            console.error('Storage read error:', e);
        }

        if (!item) {
            item = this.memoryFallback[fullKey] || null;
        }

        if (!item) return null;

        if (item.expiry && Date.now() > item.expiry) {
            this.remove(key);
            return null;
        }

        return item.value;
    }

    remove(key) {
        const fullKey = this.prefix + key;
        try {
            if (this.available) {
                localStorage.removeItem(fullKey);
            }
        } catch (e) {
            console.error('Storage remove error:', e);
        }
        delete this.memoryFallback[fullKey];
    }

    clear() {
        const keys = Object.keys(localStorage).filter(k => k.startsWith(this.prefix));
        keys.forEach(k => {
            try {
                localStorage.removeItem(k);
            } catch (e) {
                console.error('Storage clear error:', e);
            }
        });
        this.memoryFallback = {};
    }
}

const storage = new StorageManager();

// =================================================================
// URL STATE MANAGER
// =================================================================

class URLStateManager {
    constructor() {
        this.params = new URLSearchParams(window.location.search);
    }

    /**
     * Get current screen from URL
     * @returns {string|null} Screen identifier (A, B, C, D)
     */
    getScreen() {
        return this.params.get('screen');
    }

    /**
     * Get current payment step from URL
     * @returns {string|null} Payment step (recurring, upfront)
     */
    getPaymentStep() {
        return this.params.get('payment');
    }

    /**
     * Update URL with current screen and optional payment step
     * @param {string} screen - Screen identifier
     * @param {string|null} paymentStep - Optional payment step
     */
    updateURL(screen, paymentStep = null) {
        const params = new URLSearchParams();
        params.set('screen', screen);

        if (paymentStep) {
            params.set('payment', paymentStep);
        }

        const newURL = `${window.location.pathname}?${params.toString()}`;
        window.history.pushState({ screen, paymentStep }, '', newURL);
    }

    /**
     * Replace current URL state (no new history entry)
     * @param {string} screen - Screen identifier
     * @param {string|null} paymentStep - Optional payment step
     */
    replaceURL(screen, paymentStep = null) {
        const params = new URLSearchParams();
        params.set('screen', screen);

        if (paymentStep) {
            params.set('payment', paymentStep);
        }

        const newURL = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState({ screen, paymentStep }, '', newURL);
    }

    /**
     * Clear URL parameters
     */
    clearURL() {
        window.history.pushState({}, '', window.location.pathname);
    }

    /**
     * Check if URL has state information
     * @returns {boolean}
     */
    hasURLState() {
        return this.params.has('screen');
    }
}

const urlStateManager = new URLStateManager();

// =================================================================
// STATE MANAGER
// =================================================================

class StateManager {
    constructor() {
        this.state = {
            currentScreen: 'A',
            selectedOffer: null,
            customer: {
                firstName: '',
                lastName: '',
                email: '',
                dateOfBirth: '',
                phone: '',
                address: {
                    street: '',
                    city: '',
                    zipCode: '',
                    countryCode: ''
                },
                language: {
                    languageCode: 'de',
                    countryCode: 'DE'
                }
            },
            contract: {
                startDate: this.getDefaultStartDate(),
                voucherCode: null,
                selectedModules: []
            },
            preview: null,
            payment: {
                method: null,
                recurringToken: null,
                upfrontToken: null,
                skippedRecurring: false,
                skippedUpfront: false,
                activePaymentStep: null, // 'recurring' or 'upfront'
                awaitingRedirect: false,
                sessionToken: null // Store session token for remounting
            },
            signatures: {
                contractSignature: null,
                textBlockSignatures: []
            },
            ui: {
                isLoading: false,
                errors: {}
            }
        };

        this.listeners = [];
        this.loadState();
    }

    getDefaultStartDate() {
        const today = new Date();
        today.setDate(today.getDate() + 7); // Default to 7 days from now
        return today.toISOString().split('T')[0];
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notify() {
        this.listeners.forEach(listener => listener(this.state));
        this.saveState();
    }

    update(updates) {
        this.state = this.deepMerge(this.state, updates);
        this.notify();
    }

    deepMerge(target, source) {
        // If target is null/undefined, use source directly
        if (!target) {
            return source;
        }

        const output = Object.assign({}, target);
        if (this.isObject(target) && this.isObject(source)) {
            Object.keys(source).forEach(key => {
                if (this.isObject(source[key])) {
                    // If target doesn't have this key or target[key] is null, use source[key] directly
                    if (!(key in target) || !target[key])
                        Object.assign(output, { [key]: source[key] });
                    else
                        output[key] = this.deepMerge(target[key], source[key]);
                } else {
                    Object.assign(output, { [key]: source[key] });
                }
            });
        }
        return output;
    }

    isObject(item) {
        return item && typeof item === 'object' && !Array.isArray(item);
    }

    saveState() {
        storage.set('state', this.state, 60 * 60 * 1000); // 1 hour TTL
    }

    loadState() {
        const saved = storage.get('state');
        if (saved) {
            this.state = { ...this.state, ...saved };

            // Validate and clean up invalid state
            // If selectedOffer exists but doesn't have required properties, reset it
            if (this.state.selectedOffer && typeof this.state.selectedOffer === 'object') {
                if (!this.state.selectedOffer.id || !this.state.selectedOffer.term) {
                    console.warn('Invalid selectedOffer in loaded state, resetting...');
                    this.state.selectedOffer = null;
                }
            }

            // Ensure payment object has all required fields (for backward compatibility)
            this.state.payment = {
                method: null,
                recurringToken: null,
                upfrontToken: null,
                skippedRecurring: false,
                skippedUpfront: false,
                activePaymentStep: null,
                awaitingRedirect: false,
                sessionToken: null,
                ...this.state.payment
            };
        }
    }

    reset() {
        // Reset to initial state
        this.state.currentScreen = 'A';
        this.state.selectedOffer = null;
        this.state.customer = {
            firstName: '',
            lastName: '',
            email: '',
            dateOfBirth: '',
            phone: '',
            address: {
                street: '',
                city: '',
                zipCode: '',
                countryCode: ''
            },
            language: {
                languageCode: 'de',
                countryCode: 'DE'
            }
        };
        this.state.contract = {
            startDate: this.getDefaultStartDate(),
            voucherCode: null,
            selectedModules: []
        };
        this.state.preview = null;
        this.state.payment = {
            method: null,
            recurringToken: null,
            upfrontToken: null,
            skippedRecurring: false,
            skippedUpfront: false,
            activePaymentStep: null,
            awaitingRedirect: false,
            sessionToken: null
        };
        this.state.signatures = {
            contractSignature: null,
            textBlockSignatures: []
        };
        this.state.ui = {
            isLoading: false,
            errors: {}
        };
        storage.clear();
        this.notify();
    }
}

const stateManager = new StateManager();

// =================================================================
// API SERVICE
// =================================================================

class APIService {
    constructor() {
        this.baseUrl = API_CONFIG.baseUrl;
    }

    getConfig() {
        // Check if GlobalConfig exists and is initialized
        if (typeof window.GlobalConfig === 'undefined' || typeof window.GlobalConfig.load !== 'function') {
            throw new Error('API configuration not found. Please configure via the Config button.');
        }

        const config = window.GlobalConfig.load();
        if (!config || !config.apiKey || !config.apiBaseUrl) {
            throw new Error('API configuration not found. Please configure via the Config button.');
        }
        return config;
    }

    async request(endpoint, options = {}) {
        const config = this.getConfig();
        const url = options.fullUrl || `${config.apiBaseUrl}${endpoint}`;

        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': config.apiKey
            }
        };

        const response = await fetch(url, {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `API Error: ${response.status}`;
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.message || errorJson.error || errorMessage;
            } catch (e) {
                errorMessage = errorText || errorMessage;
            }
            throw new Error(errorMessage);
        }

        return response.json();
    }

    // Offers
    async getOffers() {
        return this.request(API_CONFIG.endpoints.membershipOffers);
    }

    async getOfferDetails(offerId) {
        const endpoint = API_CONFIG.endpoints.membershipOfferDetail.replace(':id', offerId);
        return this.request(endpoint);
    }

    // Preview
    async getContractPreview(payload, signal) {
        return this.request(API_CONFIG.endpoints.signupPreview, {
            method: 'POST',
            body: JSON.stringify(payload),
            signal
        });
    }

    // Payment Session
    async createPaymentSession(config) {
        return this.request(API_CONFIG.endpoints.userSession, {
            method: 'POST',
            body: JSON.stringify(config)
        });
    }

    // Final Signup
    async createMembership(payload) {
        return this.request(API_CONFIG.endpoints.signup, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }
}

const apiService = new APIService();

// =================================================================
// PREVIEW SERVICE (Debounced)
// =================================================================

class PreviewService {
    constructor(delay = 500) {
        this.delay = delay;
        this.timeout = null;
        this.abortController = null;
    }

    async call(payload) {
        // Cancel previous call
        if (this.abortController) {
            this.abortController.abort();
        }

        // Clear timeout
        clearTimeout(this.timeout);

        // Create new abort controller
        this.abortController = new AbortController();

        // Return promise that resolves after delay
        return new Promise((resolve, reject) => {
            this.timeout = setTimeout(async () => {
                try {
                    const result = await apiService.getContractPreview(payload, this.abortController.signal);
                    resolve(result);
                } catch (error) {
                    if (error.name === 'AbortError') {
                        console.log('Preview request cancelled');
                        reject(new Error('cancelled'));
                    } else {
                        reject(error);
                    }
                }
            }, this.delay);
        });
    }

    cancel() {
        if (this.abortController) {
            this.abortController.abort();
        }
        clearTimeout(this.timeout);
    }
}

const previewService = new PreviewService(500);

// =================================================================
// UTILITY FUNCTIONS
// =================================================================

const Utils = {
    // Format currency
    formatCurrency(amount, currency = 'EUR') {
        let value = typeof amount === 'string' ? parseFloat(amount) : amount;
        // Handle NaN, undefined, null
        if (isNaN(value) || value === null || value === undefined) {
            value = 0;
        }
        return new Intl.NumberFormat('de-DE', {
            style: 'currency',
            currency: currency
        }).format(value);
    },

    // Format date
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid date';

        // Fallback if Intl is not available
        if (typeof Intl === 'undefined' || typeof Intl.DateTimeFormat !== 'function') {
            // Simple fallback format: DD.MM.YYYY
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}.${month}.${year}`;
        }

        try {
            return new Intl.DateTimeFormat('de-DE', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }).format(date);
        } catch (error) {
            // Fallback format
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}.${month}.${year}`;
        }
    },

    // Validate email
    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },

    // Validate phone
    isValidPhone(phone) {
        return !phone || /^\+?[0-9\s\-()]+$/.test(phone);
    },

    // Validate date of birth (16+ years old)
    isValidDateOfBirth(dob) {
        const date = new Date(dob);
        const age = (Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        return age >= 16 && age < 120;
    },

    // Calculate age from date of birth
    calculateAge(dob) {
        const date = new Date(dob);
        const age = (Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        return Math.floor(age);
    },

    // Show notification
    showNotification(message, type = 'info') {
        // Simple implementation - can be enhanced
        console.log(`[${type.toUpperCase()}] ${message}`);
    },

    // Show/hide element
    show(element) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        if (element) {
            element.classList.remove('hidden');
        }
    },

    hide(element) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        if (element) {
            element.classList.add('hidden');
        }
    }
};

// =================================================================
// NAVIGATION CONTROLLER
// =================================================================

class NavigationController {
    constructor() {
        this.screens = ['A', 'B', 'C', 'D'];
        this.currentScreen = 'A';
    }

    goToScreen(screen, paymentStep = null) {
        // Hide all screens
        this.screens.forEach(s => {
            const element = document.getElementById(`screen-${s}`);
            if (element) {
                element.classList.add('hidden');
            }
        });

        // Show target screen
        const targetElement = document.getElementById(`screen-${screen}`);
        if (targetElement) {
            targetElement.classList.remove('hidden');
            this.currentScreen = screen;
            stateManager.update({ currentScreen: screen });

            // Update URL
            urlStateManager.updateURL(screen, paymentStep);

            // Update progress dots
            this.updateProgressDots();

            // Update screen label
            this.updateScreenLabel();

            // Scroll to top
            window.scrollTo(0, 0);
        }
    }

    updateProgressDots() {
        const dots = document.querySelectorAll('.progress-dot');
        const screenIndex = this.screens.indexOf(this.currentScreen);

        dots.forEach((dot, index) => {
            dot.classList.remove('active', 'completed');
            if (index === screenIndex) {
                dot.classList.add('active');
            } else if (index < screenIndex) {
                dot.classList.add('completed');
            }
        });
    }

    updateScreenLabel() {
        const labels = {
            'A': 'Choose Your Plan',
            'B': 'Your Details',
            'C': 'Payment Method',
            'D': 'Review & Confirm'
        };

        const labelElement = document.getElementById('current-screen-label');
        if (labelElement) {
            labelElement.textContent = labels[this.currentScreen] || '';
        }
    }

    back() {
        const currentIndex = this.screens.indexOf(this.currentScreen);
        if (currentIndex > 0) {
            this.goToScreen(this.screens[currentIndex - 1]);
        }
    }

    next() {
        const currentIndex = this.screens.indexOf(this.currentScreen);
        if (currentIndex < this.screens.length - 1) {
            this.goToScreen(this.screens[currentIndex + 1]);
        }
    }
}

const navigationController = new NavigationController();

// =================================================================
// OFFER PREVIEW BUILDER
// =================================================================

class OfferPreviewBuilder {
    /**
     * Build normalized offer preview from API offer data
     * @param {Object} offer - Raw offer from API
     * @returns {Object} Normalized offer preview
     */
    static buildPreview(offer) {
        if (!offer || !offer.terms || offer.terms.length === 0) {
            return this.buildEmptyPreview(offer);
        }

        // Build preview for each term variant
        const variants = offer.terms.map(term => this.buildTermPreview(offer, term));

        // Sort variants
        const sorted = this.sortVariants(variants);

        // Mark default variant
        if (sorted.length > 0) {
            sorted[0].isDefaultVariant = true;
        }

        return {
            id: offer.id,
            name: offer.name,
            description: offer.description,
            imageUrl: offer.imageUrl,
            variants: sorted,
            defaultVariant: sorted[0],
            allowedPaymentChoices: offer.allowedPaymentChoices || []
        };
    }

    /**
     * Build preview for a single term
     */
    static buildTermPreview(offer, term) {
        const paymentFrequency = term.paymentFrequency || {};
        const isRecurring = paymentFrequency.type === 'RECURRING';
        const isTermBased = paymentFrequency.type === 'TERM_BASED';

        // Classify product type
        const productType = isRecurring ? 'RECURRING' : (isTermBased ? 'ONE_TIME' : 'UNKNOWN');

        // Compute prices
        const priceInfo = this.computePriceInfo(term, productType);

        // Compute duration and renewal
        const durationInfo = this.computeDurationInfo(term, productType);

        // Compute badges
        const badges = this.computeBadges(offer, term, productType);

        return {
            termId: term.id,
            termName: term.name,
            productType,
            isRecurring,
            isOneTime: isTermBased,
            priceInfo,
            durationInfo,
            badges,
            term,
            sortKey: this.computeSortKey(priceInfo, durationInfo, productType)
        };
    }

    /**
     * Compute price information
     */
    static computePriceInfo(term, productType) {
        const paymentFrequency = term.paymentFrequency || {};

        // Extract currency based on product type
        let currency = 'EUR'; // fallback

        if (productType === 'RECURRING') {
            // For recurring, get currency from price object
            const priceObj = paymentFrequency.price || {};
            currency = priceObj.currency || term.currency || paymentFrequency.currency || 'EUR';
        } else if (productType === 'ONE_TIME') {
            // For one-time, get currency from termsToPrices
            const termsToPrices = paymentFrequency.termsToPrices || [];
            if (termsToPrices.length > 0 && termsToPrices[0].price?.currency) {
                currency = termsToPrices[0].price.currency;
            } else {
                currency = term.currency || paymentFrequency.currency || 'EUR';
            }
        } else {
            // Unknown type fallback
            const priceObj = paymentFrequency.price || {};
            currency = priceObj.currency || term.currency || paymentFrequency.currency || 'EUR';
        }

        if (productType === 'RECURRING') {
            // Recurring membership
            // Handle price as object { amount, currency } or direct number
            let price = 0;
            if (paymentFrequency.price) {
                price = typeof paymentFrequency.price === 'object'
                    ? (paymentFrequency.price.amount || 0)
                    : paymentFrequency.price;
            } else if (term.rateStartPrice) {
                price = typeof term.rateStartPrice === 'object'
                    ? (term.rateStartPrice.amount || 0)
                    : term.rateStartPrice;
            }

            const cadenceTerm = paymentFrequency.term || { value: 1, unit: 'MONTH' };

            // Format cadence string
            let cadenceStr = 'month';
            if (cadenceTerm.unit === 'WEEK' || cadenceTerm.unit === 'WEEKS') {
                cadenceStr = cadenceTerm.value === 1 ? 'week' : `${cadenceTerm.value} weeks`;
            } else if (cadenceTerm.unit === 'MONTH' || cadenceTerm.unit === 'MONTHS') {
                cadenceStr = cadenceTerm.value === 1 ? 'month' : `${cadenceTerm.value} months`;
            } else if (cadenceTerm.unit === 'YEAR' || cadenceTerm.unit === 'YEARS') {
                cadenceStr = cadenceTerm.value === 1 ? 'year' : `${cadenceTerm.value} years`;
            }

            // Check for setup/flat fees
            const flatFees = term.flatFees || [];
            const setupFee = flatFees.find(f => f.feeType === 'SETUP_FEE');

            return {
                primaryPrice: price,
                primaryPriceFormatted: `${this.formatCurrency(price, currency)}/${cadenceStr}`,
                secondaryPrice: setupFee ? parseFloat(setupFee.amount) : null,
                secondaryPriceLabel: setupFee ? `+ ${this.formatCurrency(setupFee.amount, currency)} setup fee` : null,
                currency,
                cadence: cadenceStr,
                cadenceTerm,
                hasProRata: (paymentFrequency.monthDaysToPrices || []).length > 0,
                hasAgeAdjustments: (term.ageBasedAdjustments || []).length > 0
            };

        } else if (productType === 'ONE_TIME') {
            // One-time pass
            const termsToPrices = paymentFrequency.termsToPrices || [];
            const totalAmount = termsToPrices.reduce((sum, item) => {
                // Handle price as object or direct number
                let priceValue = 0;
                if (item.price) {
                    priceValue = typeof item.price === 'object'
                        ? (item.price.amount || 0)
                        : item.price;
                }
                return sum + parseFloat(priceValue || 0);
            }, 0);

            const accessTerm = term.term || { value: 12, unit: 'MONTH' };
            let accessStr = this.formatTermDuration(accessTerm);

            return {
                primaryPrice: totalAmount,
                primaryPriceFormatted: `${this.formatCurrency(totalAmount, currency)} one-time`,
                secondaryPrice: null,
                secondaryPriceLabel: `Access for ${accessStr}`,
                currency,
                accessWindow: accessStr,
                hasProRata: false,
                hasAgeAdjustments: (term.ageBasedAdjustments || []).length > 0
            };

        } else {
            // Unknown type - fallback
            let price = 0;
            if (term.rateStartPrice) {
                price = typeof term.rateStartPrice === 'object'
                    ? (term.rateStartPrice.amount || 0)
                    : term.rateStartPrice;
            } else if (paymentFrequency.price) {
                price = typeof paymentFrequency.price === 'object'
                    ? (paymentFrequency.price.amount || 0)
                    : paymentFrequency.price;
            }

            return {
                primaryPrice: price,
                primaryPriceFormatted: this.formatCurrency(price, currency),
                secondaryPrice: null,
                secondaryPriceLabel: null,
                currency,
                hasProRata: false,
                hasAgeAdjustments: false
            };
        }
    }

    /**
     * Compute duration and renewal information
     */
    static computeDurationInfo(term, productType) {
        const termDuration = term.term || { value: 12, unit: 'MONTH' };
        const extensionTerm = term.extensionTerm || null;

        if (productType === 'RECURRING') {
            // Recurring membership
            const minTermStr = this.formatTermDuration(termDuration);
            let renewalStr = null;

            if (extensionTerm) {
                renewalStr = `Renews every ${this.formatTermDuration(extensionTerm)}`;
            }

            return {
                duration: `Min. term: ${minTermStr}`,
                renewal: renewalStr,
                minTerm: termDuration,
                extensionTerm
            };

        } else if (productType === 'ONE_TIME') {
            // One-time pass
            const accessStr = this.formatTermDuration(termDuration);

            return {
                duration: `Access: ${accessStr}`,
                renewal: null,
                accessWindow: termDuration
            };

        } else {
            return {
                duration: null,
                renewal: null
            };
        }
    }

    /**
     * Compute badges/annotations
     */
    static computeBadges(offer, term, productType) {
        const badges = [];

        // Limited offering period
        if (offer.limitedOfferingPeriod) {
            badges.push({ type: 'warning', label: 'Limited Time', icon: '⏰' });
        }

        // Pre-use type
        if (offer.preUseType === 'CHARGEABLE') {
            badges.push({ type: 'info', label: 'Pre-use available', icon: 'ℹ️' });
        }

        // Age-based adjustments
        if ((term.ageBasedAdjustments || []).length > 0) {
            badges.push({ type: 'success', label: 'Age discounts available', icon: '🎉' });
        }

        // Product type
        if (productType === 'ONE_TIME') {
            badges.push({ type: 'primary', label: 'One-time payment', icon: '💳' });
        }

        return badges;
    }

    /**
     * Sort variants
     */
    static sortVariants(variants) {
        return variants.sort((a, b) => {
            // Sort recurring first, then one-time
            if (a.productType !== b.productType) {
                if (a.productType === 'RECURRING') return -1;
                if (b.productType === 'RECURRING') return 1;
            }

            // Within same type, sort by price
            return a.sortKey - b.sortKey;
        });
    }

    /**
     * Compute sort key for ordering
     */
    static computeSortKey(priceInfo, durationInfo, productType) {
        if (productType === 'RECURRING') {
            // For recurring, compute monthly effective price
            const cadenceTerm = priceInfo.cadenceTerm || { value: 1, unit: 'MONTH' };
            const monthsPerCycle = this.convertToMonths(cadenceTerm);
            return priceInfo.primaryPrice / (monthsPerCycle || 1);
        } else {
            // For one-time, use total price
            return priceInfo.primaryPrice;
        }
    }

    /**
     * Convert term to months
     */
    static convertToMonths(term) {
        const unit = (term.unit || 'MONTH').toUpperCase();
        const value = term.value || 1;

        if (unit === 'WEEK' || unit === 'WEEKS') {
            return value / 4.33; // approximate weeks per month
        } else if (unit === 'MONTH' || unit === 'MONTHS') {
            return value;
        } else if (unit === 'YEAR' || unit === 'YEARS') {
            return value * 12;
        }

        return value;
    }

    /**
     * Format term duration for display
     */
    static formatTermDuration(term) {
        if (!term) return 'N/A';

        const unit = (term.unit || 'MONTH').toLowerCase().replace(/s$/, '');
        const value = term.value || 1;

        if (value === 1) {
            return `1 ${unit}`;
        } else {
            return `${value} ${unit}s`;
        }
    }

    /**
     * Format currency (simple implementation)
     */
    static formatCurrency(amount, currency = 'EUR') {
        let value = typeof amount === 'string' ? parseFloat(amount) : amount;
        if (isNaN(value) || value === null || value === undefined) {
            value = 0;
        }

        return new Intl.NumberFormat('de-DE', {
            style: 'currency',
            currency: currency
        }).format(value);
    }

    /**
     * Build empty preview fallback
     */
    static buildEmptyPreview(offer) {
        return {
            id: offer?.id,
            name: offer?.name || 'Unknown Offer',
            description: offer?.description,
            imageUrl: offer?.imageUrl,
            variants: [],
            defaultVariant: null,
            allowedPaymentChoices: offer?.allowedPaymentChoices || []
        };
    }
}

// =================================================================
// PAYMENT SUMMARY TRANSFORMER
// =================================================================

/**
 * Transforms API payment preview responses into user-friendly display structures
 */
class PaymentSummaryTransformer {
    /**
     * Transform payment preview API response into structured summary
     * @param {Object} preview - API response from payment preview endpoint
     * @param {Object} offer - Selected offer object
     * @returns {Object} Structured payment summary
     */
    static transform(preview, offer) {
        if (!preview || !preview.paymentPreview) {
            return this.buildEmptySummary();
        }

        const paymentPreview = preview.paymentPreview;
        const schedule = paymentPreview.paymentSchedule || [];

        // Extract currency
        const currency = this.extractCurrency(preview, offer, paymentPreview);

        // Extract due today amount
        const dueOnSigningObj = paymentPreview.dueOnSigningAmount || {};
        const totalDueToday = dueOnSigningObj.amount || dueOnSigningObj || 0;

        // Build today's charges breakdown
        const today = this.buildTodaySection(schedule, preview, currency, totalDueToday);

        // Build monthly/ongoing payments section
        const monthly = this.buildMonthlySection(schedule, preview, currency);

        // Build summary section
        const summary = this.buildSummarySection(preview, offer, currency, totalDueToday);

        // Build footer notes
        const footer = this.buildFooterNotes(preview, currency, totalDueToday, monthly);

        return {
            currency,
            today,
            monthly,
            summary,
            footer
        };
    }

    /**
     * Extract currency from various sources
     */
    static extractCurrency(preview, offer, paymentPreview) {
        // Priority: preview currency > offer currency > payment preview > fallback
        if (paymentPreview.dueOnSigningAmount?.currency) {
            return paymentPreview.dueOnSigningAmount.currency;
        }

        if (offer?.term?.paymentFrequency?.price?.currency) {
            return offer.term.paymentFrequency.price.currency;
        }

        if (offer?.term?.currency) {
            return offer.term.currency;
        }

        return 'EUR'; // fallback
    }

    /**
     * Build "Pay Today" section with itemized breakdown
     */
    static buildTodaySection(schedule, preview, currency, totalDueToday) {
        const mandatoryPayments = schedule.filter(item => item.mandatoryOnSigning === true);
        const items = [];

        // Group by type
        const starterPackages = mandatoryPayments.filter(p => p.type === 'STARTER_PACKAGE');
        const contractFees = mandatoryPayments.filter(p => p.type === 'CONTRACT_FEE');

        // Add starter packages (setup fees)
        starterPackages.forEach(pkg => {
            const amount = pkg.amount?.amount || pkg.amount || 0;
            items.push({
                name: `${pkg.description || 'Starter Package'} (one-time)`,
                amount: parseFloat(amount)
            });
        });

        // Separate pre-use charge from partial month fee
        if (preview.preUseCharge && preview.preUseCharge > 0) {
            items.push({
                name: 'Pre-use Charge',
                amount: parseFloat(preview.preUseCharge)
            });
        }

        // Calculate partial month fee (remaining contract fees)
        const partialMonthFee = contractFees.reduce((sum, fee) => {
            const amount = fee.amount?.amount || fee.amount || 0;
            return sum + parseFloat(amount);
        }, 0);

        // Subtract pre-use charge if it's included in contract fees
        const adjustedPartialFee = preview.preUseCharge
            ? partialMonthFee - parseFloat(preview.preUseCharge)
            : partialMonthFee;

        if (adjustedPartialFee > 0) {
            items.push({
                name: 'Partial Month Fee',
                amount: adjustedPartialFee
            });
        } else if (partialMonthFee > 0 && !preview.preUseCharge) {
            items.push({
                name: 'First Payment',
                amount: partialMonthFee
            });
        }

        return {
            label: 'Pay Today',
            totalDueToday: parseFloat(totalDueToday),
            items,
            note: 'Charged immediately when signing up'
        };
    }

    /**
     * Build "Monthly Payments" section with schedule
     */
    static buildMonthlySection(schedule, preview, currency) {
        const futurePayments = schedule.filter(item => item.mandatoryOnSigning === false);

        if (futurePayments.length === 0) {
            return null; // No recurring payments
        }

        const firstPayment = futurePayments[0];
        const amountPerMonth = firstPayment.amount?.amount || firstPayment.amount || 0;

        // Build schedule with formatted month names
        const scheduleItems = futurePayments.map(payment => {
            const amount = payment.amount?.amount || payment.amount || 0;
            const dueDate = payment.dueDate;
            const date = new Date(dueDate);
            const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

            return {
                month: monthName,
                amount: parseFloat(amount),
                dueDate
            };
        });

        return {
            label: 'Your Ongoing Monthly Payments',
            startDate: firstPayment.dueDate,
            amountPerMonth: parseFloat(amountPerMonth),
            paymentFrequency: 'MONTHLY',
            schedule: scheduleItems,
            note: `Your membership fee is ${Utils.formatCurrency(amountPerMonth, currency)} per month, automatically collected each month.`
        };
    }

    /**
     * Build "Overview at a Glance" summary section
     */
    static buildSummarySection(preview, offer, currency, totalDueToday) {
        const items = [];

        // One-time setup fee
        if (preview.flatFeePreviews && preview.flatFeePreviews.length > 0) {
            const setupFee = preview.flatFeePreviews.reduce((sum, fee) => {
                const amount = fee.paymentFrequency?.price?.amount || 0;
                return sum + parseFloat(amount);
            }, 0);

            if (setupFee > 0) {
                items.push({
                    name: 'One-time setup fee',
                    amount: setupFee
                });
            }
        }

        // First payment today
        items.push({
            name: 'First payment today',
            amount: parseFloat(totalDueToday)
        });

        // Monthly fee (base price)
        if (preview.basePrice && preview.basePrice > 0) {
            items.push({
                name: 'Monthly fee',
                amount: parseFloat(preview.basePrice)
            });
        }

        // Total contract value
        if (preview.contractVolumeInformation?.totalContractVolume) {
            items.push({
                name: 'Total contract value',
                amount: parseFloat(preview.contractVolumeInformation.totalContractVolume)
            });
        }

        // Average monthly cost
        if (preview.contractVolumeInformation?.averagePaymentVolumePerMonth) {
            items.push({
                name: 'Average monthly cost',
                amount: parseFloat(preview.contractVolumeInformation.averagePaymentVolumePerMonth)
            });
        }

        return {
            label: 'Overview at a Glance',
            items
        };
    }

    /**
     * Build footer notes
     */
    static buildFooterNotes(preview, currency, totalDueToday, monthly) {
        const notes = [];

        // Today's payment
        const todayFormatted = Utils.formatCurrency(totalDueToday, currency);
        notes.push(`You pay ${todayFormatted} today (setup + first partial period).`);

        // Monthly payments
        if (monthly && monthly.startDate) {
            const startDate = new Date(monthly.startDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            const monthlyFormatted = Utils.formatCurrency(monthly.amountPerMonth, currency);
            notes.push(`From ${startDate}, your monthly fee is ${monthlyFormatted}.`);
        }

        // Total contract value
        if (preview.contractVolumeInformation?.totalContractVolume) {
            const totalFormatted = Utils.formatCurrency(preview.contractVolumeInformation.totalContractVolume, currency);
            notes.push(`Total expected payments: ${totalFormatted}.`);
        }

        // Currency note
        notes.push(`All payments are made in ${currency}.`);

        return { notes };
    }

    /**
     * Build empty summary for error cases
     */
    static buildEmptySummary() {
        return {
            currency: 'EUR',
            today: null,
            monthly: null,
            summary: { label: 'Overview at a Glance', items: [] },
            footer: { notes: [] }
        };
    }
}

// =================================================================
// SCREEN A: OFFER SELECTION
// =================================================================

class ScreenAController {
    constructor() {
        this.offers = [];
        this.selectedOfferId = null;
    }

    async init() {
        this.showLoading();

        try {
            const rawOffers = await apiService.getOffers();

            // Build normalized previews
            this.offers = rawOffers.map(offer => OfferPreviewBuilder.buildPreview(offer));

            // Sort offers: recurring first, then one-time, then by price
            this.offers.sort((a, b) => {
                const aVariant = a.defaultVariant;
                const bVariant = b.defaultVariant;

                if (!aVariant || !bVariant) return 0;

                // Sort recurring before one-time
                if (aVariant.productType !== bVariant.productType) {
                    if (aVariant.productType === 'RECURRING') return -1;
                    if (bVariant.productType === 'RECURRING') return 1;
                }

                // Within same type, sort by price
                return aVariant.sortKey - bVariant.sortKey;
            });

            this.renderOffers();
            this.hideLoading();
            this.showGrid();
        } catch (error) {
            console.error('Error loading offers:', error);
            this.showError(error.message);
        }
    }

    showLoading() {
        Utils.show('offers-loading');
        Utils.hide('offers-error');
        Utils.hide('offers-grid');
        Utils.hide('offers-continue-container');
    }

    hideLoading() {
        Utils.hide('offers-loading');
    }

    showError(message) {
        Utils.hide('offers-loading');
        Utils.hide('offers-grid');
        Utils.show('offers-error');
        document.getElementById('offers-error-message').textContent = message;
    }

    showGrid() {
        Utils.hide('offers-loading');
        Utils.hide('offers-error');
        Utils.show('offers-grid');
        Utils.show('offers-continue-container');
    }

    renderOffers() {
        const grid = document.getElementById('offers-grid');
        grid.innerHTML = '';

        this.offers.forEach((offer, index) => {
            const card = this.createOfferCard(offer, index === 0);
            grid.appendChild(card);
        });

        // Set up event listeners
        this.attachEventListeners();
    }

    createOfferCard(offer, isBestValue = false) {
        const card = document.createElement('div');
        card.className = 'offer-card relative bg-white rounded-lg border-2 border-gray-200 p-6 shadow-sm';
        card.dataset.offerId = offer.id;

        // Use default variant from preview builder
        const variant = offer.defaultVariant;

        if (!variant) {
            // Fallback for offers without valid variants
            card.innerHTML = `
                <div class="mb-4">
                    <h3 class="text-2xl font-bold text-gray-900 mb-2">${offer.name}</h3>
                    <p class="text-gray-600 text-sm">${offer.description || ''}</p>
                </div>
                <div class="mb-6">
                    <div class="text-lg text-gray-600">No pricing information available</div>
                </div>
                <button class="w-full py-3 border-2 border-gray-400 text-gray-400 rounded-lg cursor-not-allowed" disabled>
                    Not Available
                </button>
            `;
            return card;
        }

        const priceInfo = variant.priceInfo;
        const durationInfo = variant.durationInfo;
        const badges = variant.badges;

        // Build badges HTML
        let badgesHtml = '';
        if (badges && badges.length > 0) {
            badgesHtml = badges.map(badge => {
                const colorClass = {
                    'primary': 'bg-blue-100 text-blue-800',
                    'success': 'bg-green-100 text-green-800',
                    'warning': 'bg-yellow-100 text-yellow-800',
                    'info': 'bg-gray-100 text-gray-800'
                }[badge.type] || 'bg-gray-100 text-gray-800';

                return `<span class="chip ${colorClass} text-xs mr-1 mb-1">${badge.icon} ${badge.label}</span>`;
            }).join('');
        }

        // Build price display
        let priceDisplay = '';
        if (variant.isRecurring) {
            // Recurring membership
            priceDisplay = `
                <div class="text-3xl font-bold text-blue-600 mb-1">
                    ${priceInfo.primaryPriceFormatted}
                </div>
                ${priceInfo.secondaryPriceLabel ? `
                    <div class="text-sm text-gray-600">
                        ${priceInfo.secondaryPriceLabel}
                    </div>
                ` : ''}
            `;
        } else if (variant.isOneTime) {
            // One-time pass
            priceDisplay = `
                <div class="text-3xl font-bold text-green-600 mb-1">
                    ${priceInfo.primaryPriceFormatted}
                </div>
                ${priceInfo.secondaryPriceLabel ? `
                    <div class="text-sm text-gray-600">
                        ${priceInfo.secondaryPriceLabel}
                    </div>
                ` : ''}
            `;
        } else {
            // Unknown type
            priceDisplay = `
                <div class="text-2xl font-bold text-gray-600 mb-1">
                    ${priceInfo.primaryPriceFormatted}
                </div>
            `;
        }

        // Build duration/renewal info
        let durationHtml = '';
        if (durationInfo.duration) {
            durationHtml += `<div class="text-xs text-gray-600">📅 ${durationInfo.duration}</div>`;
        }
        if (durationInfo.renewal) {
            durationHtml += `<div class="text-xs text-gray-600 mt-1">🔄 ${durationInfo.renewal}</div>`;
        }

        card.innerHTML = `
            ${isBestValue ? '<div class="best-value-badge">Best Value</div>' : ''}
            ${badgesHtml ? `<div class="mb-3 flex flex-wrap">${badgesHtml}</div>` : ''}
            <div class="mb-4">
                <h3 class="text-2xl font-bold text-gray-900 mb-2">${offer.name}</h3>
                <p class="text-gray-600 text-sm">${offer.description || ''}</p>
            </div>
            <div class="mb-4">
                ${priceDisplay}
            </div>
            ${durationHtml ? `<div class="mb-4 pt-3 border-t border-gray-200">${durationHtml}</div>` : ''}
            <button class="w-full py-3 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition font-semibold select-offer-btn">
                Select Plan
            </button>
            <button class="w-full mt-2 py-2 text-sm text-gray-600 hover:text-gray-800 more-details-btn">
                More details →
            </button>
        `;

        return card;
    }

    attachEventListeners() {
        // Select offer buttons
        document.querySelectorAll('.select-offer-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = e.target.closest('.offer-card');
                const offerId = parseInt(card.dataset.offerId);
                this.selectOffer(offerId);
            });
        });

        // More details buttons
        document.querySelectorAll('.more-details-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = e.target.closest('.offer-card');
                const offerId = parseInt(card.dataset.offerId);
                this.showOfferDetails(offerId);
            });
        });

        // Continue button
        document.getElementById('continue-screen-A')?.addEventListener('click', () => {
            if (this.selectedOfferId) {
                navigationController.goToScreen('B');
                screenBController.init();
            }
        });

        // Retry button
        document.getElementById('retry-offers')?.addEventListener('click', () => {
            this.init();
        });
    }

    selectOffer(offerId) {
        this.selectedOfferId = offerId;

        // Update card visuals
        document.querySelectorAll('.offer-card').forEach(card => {
            card.classList.remove('selected');
        });
        document.querySelector(`.offer-card[data-offer-id="${offerId}"]`)?.classList.add('selected');

        // Find offer
        const offer = this.offers.find(o => o.id === offerId);
        if (offer && offer.defaultVariant) {
            stateManager.update({
                selectedOffer: {
                    id: offer.id,
                    name: offer.name,
                    description: offer.description,
                    term: offer.defaultVariant.term,
                    allowedPaymentChoices: offer.allowedPaymentChoices || []
                }
            });

            // Enable continue button
            document.getElementById('continue-screen-A').disabled = false;
        }
    }

    showOfferDetails(offerId) {
        // Simple alert for now - can be enhanced with a modal
        const offer = this.offers.find(o => o.id === offerId);
        if (offer) {
            alert(`Offer Details:\n\n${offer.name}\n\n${offer.description || 'No description available'}`);
        }
    }
}

const screenAController = new ScreenAController();

// =================================================================
// SCREEN B: DETAILS FORM + CONTRACT SUMMARY
// =================================================================

class ScreenBController {
    constructor() {
        this.isPreviewLoading = false;
    }

    init() {
        this.populateForm();
        this.attachEventListeners();
        this.updateOrderSummary();
        this.triggerPreview();
    }

    populateForm() {
        const state = stateManager.state;

        // Populate customer fields
        document.getElementById('firstName').value = state.customer.firstName;
        document.getElementById('lastName').value = state.customer.lastName;
        document.getElementById('email').value = state.customer.email;
        document.getElementById('dateOfBirth').value = state.customer.dateOfBirth;
        document.getElementById('phone').value = state.customer.phone;
        document.getElementById('street').value = state.customer.address.street;
        document.getElementById('city').value = state.customer.address.city;
        document.getElementById('zipCode').value = state.customer.address.zipCode;
        document.getElementById('countryCode').value = state.customer.address.countryCode;

        // Populate contract fields
        document.getElementById('startDate').value = state.contract.startDate;
        document.getElementById('voucherCode').value = state.contract.voucherCode || '';
    }

    attachEventListeners() {
        // Form submission
        const form = document.getElementById('details-form');
        form?.addEventListener('submit', (e) => {
            e.preventDefault();
            if (this.validateForm()) {
                this.saveFormData();
                this.handlePaymentNavigation();
            }
        });

        // Back button
        document.getElementById('back-screen-B')?.addEventListener('click', () => {
            navigationController.goToScreen('A');
        });

        // Fill test data button
        document.getElementById('fill-test-data-btn')?.addEventListener('click', () => {
            this.fillTestData();
        });

        // Apply voucher button
        document.getElementById('apply-voucher-btn')?.addEventListener('click', () => {
            this.applyVoucher();
        });

        // Live preview triggers (debounced)
        const previewTriggers = ['dateOfBirth', 'startDate'];
        previewTriggers.forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => {
                this.triggerPreview();
            });
        });
    }

    fillTestData() {
        // Randomize email to avoid duplicate customer checks
        const randomId = Math.floor(Math.random() * 100000);
        const timestamp = Date.now().toString().slice(-6);
        const randomEmail = `max.mustermann+${timestamp}${randomId}@example.com`;

        // Randomize birth date (between 25 and 50 years old)
        const today = new Date();
        const minAge = 25;
        const maxAge = 50;
        const randomAge = minAge + Math.floor(Math.random() * (maxAge - minAge));
        const birthYear = today.getFullYear() - randomAge;
        const birthMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
        const birthDay = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
        const randomBirthDate = `${birthYear}-${birthMonth}-${birthDay}`;

        document.getElementById('firstName').value = 'Max';
        document.getElementById('lastName').value = 'Mustermann';
        document.getElementById('email').value = randomEmail;
        document.getElementById('dateOfBirth').value = randomBirthDate;
        document.getElementById('phone').value = '+49 30 12345678';
        document.getElementById('street').value = 'Hauptstraße 123';
        document.getElementById('city').value = 'Berlin';
        document.getElementById('zipCode').value = '10115';
        document.getElementById('countryCode').value = 'DE';

        this.triggerPreview();
    }

    validateForm() {
        let isValid = true;
        const fields = [
            { id: 'firstName', validator: (v) => v.trim().length > 0, message: 'First name is required' },
            { id: 'lastName', validator: (v) => v.trim().length > 0, message: 'Last name is required' },
            { id: 'email', validator: Utils.isValidEmail, message: 'Please enter a valid email' },
            { id: 'dateOfBirth', validator: Utils.isValidDateOfBirth, message: 'You must be at least 16 years old' },
            { id: 'phone', validator: Utils.isValidPhone, message: 'Please enter a valid phone number' },
            { id: 'street', validator: (v) => v.trim().length > 0, message: 'Street address is required' },
            { id: 'city', validator: (v) => v.trim().length > 0, message: 'City is required' },
            { id: 'zipCode', validator: (v) => v.trim().length > 0, message: 'Postal code is required' },
            { id: 'countryCode', validator: (v) => v.trim().length > 0, message: 'Country is required' },
            { id: 'startDate', validator: (v) => v.trim().length > 0, message: 'Start date is required' }
        ];

        fields.forEach(field => {
            const input = document.getElementById(field.id);
            const errorMsg = input?.parentElement.querySelector('.error-message');

            if (!input) return;

            if (!field.validator(input.value)) {
                isValid = false;
                input.classList.add('error-input');
                if (errorMsg) {
                    errorMsg.textContent = field.message;
                    errorMsg.classList.remove('hidden');
                }
            } else {
                input.classList.remove('error-input');
                if (errorMsg) {
                    errorMsg.classList.add('hidden');
                }
            }
        });

        return isValid;
    }

    saveFormData() {
        stateManager.update({
            customer: {
                firstName: document.getElementById('firstName').value,
                lastName: document.getElementById('lastName').value,
                email: document.getElementById('email').value,
                dateOfBirth: document.getElementById('dateOfBirth').value,
                phone: document.getElementById('phone').value,
                address: {
                    street: document.getElementById('street').value,
                    city: document.getElementById('city').value,
                    zipCode: document.getElementById('zipCode').value,
                    countryCode: document.getElementById('countryCode').value
                }
            },
            contract: {
                startDate: document.getElementById('startDate').value,
                voucherCode: document.getElementById('voucherCode').value || null
            }
        });
    }

    /**
     * Handle navigation to payment screen with conditional step skipping
     * Based on payment preview data, determines which payment steps are needed
     */
    handlePaymentNavigation() {
        const preview = stateManager.state.preview;
        if (!preview || !preview.paymentPreview) {
            // No preview available, go to payment screen (it will handle errors)
            navigationController.goToScreen('C');
            screenCController.init();
            return;
        }

        const dueOnSigning = preview.paymentPreview.dueOnSigningAmount;
        const totalValue = preview.contractVolumeInformation?.totalContractVolume;
        const paymentSchedule = preview.paymentPreview.paymentSchedule || [];

        // Extract amounts
        const dueAmount = typeof dueOnSigning === 'object' ? (dueOnSigning.amount || 0) : (dueOnSigning || 0);
        const totalAmount = typeof totalValue === 'object' ? (totalValue.amount || totalValue || 0) : (totalValue || 0);

        // Determine payment scenarios
        const hasRecurring = paymentSchedule.length > 0 && paymentSchedule.some(p => p.amount > 0);
        const hasUpfront = dueAmount > 0;
        const isFullPaymentUpfront = hasUpfront && dueAmount === totalAmount;

        console.log('Payment navigation check:', {
            dueAmount,
            totalAmount,
            hasRecurring,
            hasUpfront,
            isFullPaymentUpfront,
            scheduleLength: paymentSchedule.length
        });

        // Scenario 1: No payments needed at all (edge case, shouldn't happen)
        if (!hasRecurring && !hasUpfront) {
            console.log('No payments needed, skipping to review');
            stateManager.update({
                payment: {
                    ...stateManager.state.payment,
                    skippedRecurring: true,
                    skippedUpfront: true
                }
            });
            navigationController.goToScreen('D');
            screenDController.init();
            return;
        }

        // Scenario 2: Full payment upfront (skip recurring, show only upfront)
        if (isFullPaymentUpfront) {
            console.log('Full payment upfront, skipping recurring step');
            stateManager.update({
                payment: {
                    ...stateManager.state.payment,
                    skippedRecurring: true,
                    skippedUpfront: false
                }
            });
            navigationController.goToScreen('C');
            screenCController.init();
            return;
        }

        // Scenario 3: No upfront payment (show only recurring)
        if (!hasUpfront && hasRecurring) {
            console.log('No upfront payment, only recurring');
            stateManager.update({
                payment: {
                    ...stateManager.state.payment,
                    skippedRecurring: false,
                    skippedUpfront: true
                }
            });
            navigationController.goToScreen('C');
            screenCController.init();
            return;
        }

        // Scenario 4: Both payments needed (default)
        console.log('Both recurring and upfront payments needed');
        stateManager.update({
            payment: {
                ...stateManager.state.payment,
                skippedRecurring: false,
                skippedUpfront: false
            }
        });
        navigationController.goToScreen('C');
        screenCController.init();
    }

    async applyVoucher() {
        const voucherCode = document.getElementById('voucherCode').value.trim();
        if (!voucherCode) return;

        // Store voucher code
        stateManager.update({
            contract: {
                ...stateManager.state.contract,
                voucherCode
            }
        });

        // Trigger preview to validate voucher
        await this.triggerPreview();
    }

    async triggerPreview() {
        if (this.isPreviewLoading) return;

        const state = stateManager.state;
        if (!state.selectedOffer || !state.selectedOffer.term || !state.selectedOffer.term.id) {
            console.warn('Cannot trigger preview: selectedOffer or term is missing');
            return;
        }

        // Build preview payload
        const payload = {
            contract: {
                contractOfferTermId: state.selectedOffer.term.id,
                startDate: document.getElementById('startDate')?.value || state.contract.startDate,
                voucherCode: state.contract.voucherCode || undefined
            },
            customer: {
                firstName: document.getElementById('firstName')?.value || 'Preview',
                lastName: document.getElementById('lastName')?.value || 'User',
                dateOfBirth: document.getElementById('dateOfBirth')?.value || undefined,
                email: document.getElementById('email')?.value || 'preview@example.com',
                street: document.getElementById('street')?.value || 'Street 1',
                city: document.getElementById('city')?.value || 'City',
                zipCode: document.getElementById('zipCode')?.value || '12345',
                countryCode: document.getElementById('countryCode')?.value || 'DE',
                language: {
                    languageCode: 'de',
                    countryCode: 'DE'
                }
            }
        };

        this.isPreviewLoading = true;
        this.showOrderSummarySkeleton();

        try {
            const preview = await previewService.call(payload);
            stateManager.update({ preview });
            this.updateOrderSummary(preview);
            this.updateAgeDiscountBadge(preview);
            this.updateVoucherFeedback(preview);
            this.isPreviewLoading = false;
        } catch (error) {
            if (error.message !== 'cancelled') {
                console.error('Preview error:', error);
                this.showOrderSummaryError(error.message);
            }
            this.isPreviewLoading = false;
        }
    }

    showOrderSummarySkeleton() {
        const content = document.getElementById('order-summary-content');
        if (content) {
            content.innerHTML = `
                <div class="space-y-4 animate-pulse">
                    <div class="skeleton h-6 rounded"></div>
                    <div class="skeleton h-4 rounded w-3/4"></div>
                    <div class="skeleton h-4 rounded w-1/2"></div>
                    <div class="border-t border-gray-200 my-4"></div>
                    <div class="skeleton h-8 rounded"></div>
                    <div class="skeleton h-6 rounded w-2/3"></div>
                </div>
            `;
        }
    }

    showOrderSummaryError(message) {
        const content = document.getElementById('order-summary-content');
        if (content) {
            content.innerHTML = `
                <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p class="text-sm text-red-700">${message}</p>
                </div>
            `;
        }
    }

    updateOrderSummary(preview = null) {
        const state = stateManager.state;
        const content = document.getElementById('order-summary-content');
        if (!content) return;

        const offer = state.selectedOffer;
        if (!offer || !offer.term) {
            // No valid offer selected, show placeholder
            content.innerHTML = `
                <div class="bg-gray-50 rounded-lg p-4">
                    <p class="text-sm text-gray-600">Select an offer to see pricing details</p>
                </div>
            `;
            return;
        }

        // If no preview, show basic offer info
        if (!preview || !preview.paymentPreview) {
            this.showBasicOrderSummary(offer);
            return;
        }

        // Transform API response into user-friendly structure
        const summary = PaymentSummaryTransformer.transform(preview, offer);

        // Build HTML with improved structure
        let html = `
            <div class="space-y-6">
                <!-- Plan Name -->
                <div>
                    <h3 class="font-bold text-gray-900 text-lg">${offer.name}</h3>
                    <p class="text-sm text-gray-600">${offer.term.name || ''}</p>
                </div>

                <div class="border-t border-gray-200"></div>
        `;

        // Pay Today Section
        if (summary.today) {
            html += `
                <!-- Pay Today -->
                <div class="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5">
                    <h4 class="font-bold text-gray-900 text-base mb-3">${summary.today.label}</h4>
                    <div class="space-y-2 mb-4">
            `;

            summary.today.items.forEach(item => {
                html += `
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-700">${item.name}</span>
                            <span class="text-sm font-semibold text-gray-900">${Utils.formatCurrency(item.amount, summary.currency)}</span>
                        </div>
                `;
            });

            html += `
                    </div>
                    <div class="border-t border-blue-300 pt-3 flex justify-between items-center">
                        <span class="font-bold text-gray-900">Total Due Today</span>
                        <span class="text-2xl font-bold text-blue-600">${Utils.formatCurrency(summary.today.totalDueToday, summary.currency)}</span>
                    </div>
                    <p class="text-xs text-gray-600 mt-3">${summary.today.note}</p>
                </div>
            `;
        }

        // Monthly Payments Section
        if (summary.monthly) {
            const startDate = new Date(summary.monthly.startDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

            html += `
                <!-- Monthly Payments -->
                <div class="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-5">
                    <h4 class="font-bold text-gray-900 text-base mb-2">${summary.monthly.label}</h4>
                    <div class="flex items-baseline gap-2 mb-3">
                        <span class="text-3xl font-bold text-green-600">${Utils.formatCurrency(summary.monthly.amountPerMonth, summary.currency)}</span>
                        <span class="text-sm text-gray-600">per month</span>
                    </div>
                    <p class="text-xs text-gray-600 mb-3">Starting ${startDate}</p>

                    <!-- Collapsible Schedule -->
                    <details class="mt-3">
                        <summary class="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                            View full payment schedule (${summary.monthly.schedule.length} payments)
                        </summary>
                        <div class="mt-3 space-y-1 max-h-48 overflow-y-auto">
            `;

            summary.monthly.schedule.forEach((payment, index) => {
                html += `
                            <div class="flex justify-between items-center text-xs py-1 ${index % 2 === 0 ? 'bg-white/50' : ''}">
                                <span class="text-gray-700">${payment.month}</span>
                                <span class="font-medium text-gray-900">${Utils.formatCurrency(payment.amount, summary.currency)}</span>
                            </div>
                `;
            });

            html += `
                        </div>
                    </details>

                    <p class="text-xs text-gray-600 mt-3">${summary.monthly.note}</p>
                </div>
            `;
        }

        // Summary Section
        if (summary.summary && summary.summary.items.length > 0) {
            html += `
                <!-- Overview at a Glance -->
                <div class="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-5">
                    <h4 class="font-bold text-gray-900 text-base mb-3">${summary.summary.label}</h4>
                    <div class="space-y-2">
            `;

            summary.summary.items.forEach(item => {
                html += `
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-700">${item.name}</span>
                            <span class="text-sm font-bold text-gray-900">${Utils.formatCurrency(item.amount, summary.currency)}</span>
                        </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        }

        // Footer Notes
        if (summary.footer && summary.footer.notes.length > 0) {
            html += `
                <!-- Key Information -->
                <div class="bg-gray-50 rounded-lg p-4">
                    <ul class="space-y-1.5 text-xs text-gray-600">
            `;

            summary.footer.notes.forEach(note => {
                html += `
                        <li class="flex items-start gap-2">
                            <span class="text-blue-600 mt-0.5">ℹ️</span>
                            <span>${note}</span>
                        </li>
                `;
            });

            html += `
                    </ul>
                </div>
            `;
        }

        html += `
                <!-- Start Date -->
                <div class="text-sm text-gray-600 border-t border-gray-200 pt-4">
                    <span class="font-medium">Contract start date:</span> ${Utils.formatDate(state.contract.startDate)}
                </div>
            </div>
        `;

        content.innerHTML = html;

        // Also update Screen C contract summary
        const paymentSummary = document.getElementById('order-summary-payment');
        if (paymentSummary) {
            paymentSummary.innerHTML = html;
        }
    }

    showBasicOrderSummary(offer) {
        const content = document.getElementById('order-summary-content');
        if (!content) return;

        // Safety check for offer structure
        if (!offer || !offer.term) {
            content.innerHTML = `
                <div class="bg-gray-50 rounded-lg p-4">
                    <p class="text-sm text-gray-600">Select an offer to see pricing details</p>
                </div>
            `;
            return;
        }

        const isOneTime = offer.term.paymentFrequency?.type === 'TERM_BASED';

        let currency = 'EUR';
        if (offer.term.paymentFrequency?.price?.currency) {
            currency = offer.term.paymentFrequency.price.currency;
        }

        let displayPrice = 0;
        let priceLabel = 'Monthly Fee';

        if (isOneTime) {
            const termsToPrices = offer.term.paymentFrequency?.termsToPrices || [];
            displayPrice = termsToPrices.reduce((sum, item) => {
                let priceValue = 0;
                if (item.price) {
                    priceValue = typeof item.price === 'object' ? (item.price.amount || 0) : item.price;
                }
                return sum + parseFloat(priceValue || 0);
            }, 0);
            priceLabel = 'One-time Fee';
        } else {
            if (offer.term.paymentFrequency?.price) {
                const price = offer.term.paymentFrequency.price;
                displayPrice = typeof price === 'object' ? (price.amount || 0) : price;
            }
            priceLabel = 'Monthly Fee';
        }

        let html = `
            <div class="space-y-4">
                <div>
                    <h3 class="font-bold text-gray-900 text-lg">${offer.name}</h3>
                    <p class="text-sm text-gray-600">${offer.term.name || ''}</p>
                </div>
                <div class="border-t border-gray-200"></div>
                <div class="flex justify-between items-center">
                    <span class="text-gray-700">${priceLabel}</span>
                    <span class="font-bold text-gray-900">${Utils.formatCurrency(displayPrice, currency)}</span>
                </div>
                <div class="bg-gray-50 rounded-lg p-4">
                    <p class="text-sm text-gray-600">Enter your details to see full payment breakdown</p>
                </div>
            </div>
        `;

        content.innerHTML = html;
    }

    updateAgeDiscountBadge(preview) {
        const badge = document.getElementById('age-discount-badge');
        if (!badge) return;

        if (preview?.ageAdjustedPrice && preview.ageAdjustedPrice < preview.paymentPreview?.basePrice) {
            const savings = preview.paymentPreview.basePrice - preview.ageAdjustedPrice;
            badge.innerHTML = `
                <div class="chip chip-success">
                    🎉 Youth Discount Applied! Save ${Utils.formatCurrency(savings, preview.paymentPreview.currency)}/month
                </div>
            `;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    updateVoucherFeedback(preview) {
        const feedback = document.getElementById('voucher-feedback');
        if (!feedback) return;

        const vouchers = preview?.vouchers || [];

        if (vouchers.length > 0) {
            feedback.innerHTML = vouchers.map(v => {
                const isValid = v.valid !== false;
                return `
                    <div class="chip ${isValid ? 'chip-success' : 'chip-error'}">
                        ${v.code} - ${v.description || 'Applied'}
                        ${isValid ? `
                            <button class="ml-2 text-xs" onclick="screenBController.removeVoucher()">✕</button>
                        ` : ''}
                    </div>
                `;
            }).join('');
        } else {
            feedback.innerHTML = '';
        }
    }

    removeVoucher() {
        document.getElementById('voucherCode').value = '';
        stateManager.update({
            contract: {
                ...stateManager.state.contract,
                voucherCode: null
            }
        });
        this.triggerPreview();
    }
}

const screenBController = new ScreenBController();

// =================================================================
// SCREEN C: PAYMENT (TWO-STEP: RECURRING + UPFRONT)
// =================================================================

class ScreenCController {
    constructor() {
        this.recurringWidget = null;
        this.upfrontWidget = null;
    }

    async init() {
        this.updateOrderSummary();
        this.attachEventListeners();

        const state = stateManager.state;
        const skippedRecurring = state.payment.skippedRecurring;
        const skippedUpfront = state.payment.skippedUpfront;

        console.log('ScreenC init:', { skippedRecurring, skippedUpfront });

        // If both skipped (shouldn't reach here), go to review
        if (skippedRecurring && skippedUpfront) {
            console.log('Both payments skipped, navigating to review');
            navigationController.goToScreen('D');
            screenDController.init();
            return;
        }

        // If recurring is skipped, jump directly to upfront payment
        if (skippedRecurring) {
            console.log('Recurring payment skipped, showing only upfront payment');
            Utils.hide('recurring-payment-section');
            Utils.show('upfront-payment-section');

            const preview = state.preview;
            const dueOnSigningObj = preview?.paymentPreview?.dueOnSigningAmount;
            const dueAmount = typeof dueOnSigningObj === 'object' ? (dueOnSigningObj.amount || 0) : (dueOnSigningObj || 0);
            const currency = typeof dueOnSigningObj === 'object' ? (dueOnSigningObj.currency || 'EUR') : 'EUR';

            await this.loadUpfrontPaymentWidget(dueAmount, currency);
            return;
        }

        // Default: load recurring payment widget first
        await this.loadRecurringPaymentWidget();
    }

    attachEventListeners() {
        document.getElementById('back-screen-C')?.addEventListener('click', () => {
            navigationController.goToScreen('B');
        });

        document.getElementById('continue-screen-C')?.addEventListener('click', () => {
            navigationController.goToScreen('D');
            screenDController.init();
        });
    }

    updateOrderSummary() {
        // Reuse the contract summary from Screen B
        screenBController.updateOrderSummary(stateManager.state.preview);
    }

    // ========================================
    // STEP 1: RECURRING PAYMENT (MEMBER_ACCOUNT, amount 0)
    // ========================================

    async loadRecurringPaymentWidget() {
        Utils.show('recurring-payment-loading');
        Utils.hide('recurring-payment-container');
        Utils.hide('recurring-payment-error');
        Utils.hide('recurring-payment-success');

        try {
            const state = stateManager.state;

            // Create payment session for recurring payment
            // Scope: MEMBER_ACCOUNT, Amount: 0 (for setting up recurring payment method)
            const allowedChoices = state.selectedOffer.allowedPaymentChoices || [];
            const sessionConfig = {
                amount: 0,
                scope: 'MEMBER_ACCOUNT',
                referenceText: `Membership: ${state.selectedOffer.name} (Recurring)`,
                permittedPaymentChoices: allowedChoices
            };

            const session = await apiService.createPaymentSession(sessionConfig);

            // Save state with redirect information before mounting widget
            stateManager.update({
                payment: {
                    ...state.payment,
                    activePaymentStep: 'recurring',
                    awaitingRedirect: true,
                    sessionToken: session.token
                }
            });

            // Update URL with payment step
            urlStateManager.replaceURL('C', 'recurring');

            // Initialize recurring payment widget
            Utils.hide('recurring-payment-loading');
            Utils.show('recurring-payment-container');

            if (window.paymentWidget && typeof window.paymentWidget.init === 'function') {
                const config = GlobalConfig.load();

                this.recurringWidget = window.paymentWidget.init({
                    userSessionToken: session.token,
                    container: 'recurring-payment-container',
                    countryCode: config.countryCode || 'DE',
                    locale: config.locale || 'de-DE',
                    environment: config.environment || 'sandbox',
                    onSuccess: (paymentRequestToken, paymentInstrumentDetails) => {
                        this.handleRecurringPaymentSuccess(paymentRequestToken, paymentInstrumentDetails);
                    },
                    onError: (error) => {
                        this.handleRecurringPaymentError(error);
                    }
                });
            } else {
                throw new Error('Payment widget not loaded');
            }

        } catch (error) {
            console.error('Recurring payment widget error:', error);
            this.showRecurringPaymentError(error.message);
        }
    }

    handleRecurringPaymentSuccess(paymentRequestToken, paymentInstrumentDetails) {
        console.log('Recurring payment success:', paymentRequestToken, paymentInstrumentDetails);

        // Store recurring payment token and clear redirect flags
        stateManager.update({
            payment: {
                ...stateManager.state.payment,
                method: paymentInstrumentDetails?.type || 'UNKNOWN',
                recurringToken: paymentRequestToken,
                awaitingRedirect: false,
                activePaymentStep: null
            }
        });

        // Show success message (keep widget visible to display pre-selected payment method)
        // Utils.hide('recurring-payment-container'); // Commented out - keep widget visible
        Utils.show('recurring-payment-success');
        Utils.show('recurring-status-badge');

        // Check if upfront payment is needed (or skipped)
        const state = stateManager.state;
        const skippedUpfront = state.payment.skippedUpfront;

        if (skippedUpfront) {
            // No upfront payment needed, enable continue button
            console.log('Upfront payment skipped, enabling continue button');
            document.getElementById('continue-screen-C').disabled = false;
        } else {
            const preview = state.preview;
            const dueOnSigningObj = preview?.paymentPreview?.dueOnSigningAmount;
            const dueAmount = typeof dueOnSigningObj === 'object' ? (dueOnSigningObj.amount || 0) : (dueOnSigningObj || 0);
            const currency = typeof dueOnSigningObj === 'object' ? (dueOnSigningObj.currency || 'EUR') : 'EUR';

            if (dueAmount > 0) {
                // Show upfront payment section and load widget
                Utils.show('upfront-payment-section');
                this.loadUpfrontPaymentWidget(dueAmount, currency);
            } else {
                // No upfront payment needed, enable continue button
                document.getElementById('continue-screen-C').disabled = false;
            }
        }
    }

    handleRecurringPaymentError(error) {
        console.error('Recurring payment error:', error);
        this.showRecurringPaymentError(error.message || 'Payment failed');
    }

    showRecurringPaymentError(message) {
        Utils.hide('recurring-payment-loading');
        Utils.hide('recurring-payment-container');
        Utils.show('recurring-payment-error');
        document.getElementById('recurring-payment-error-message').textContent = message;

        document.getElementById('retry-recurring-payment')?.addEventListener('click', () => {
            this.loadRecurringPaymentWidget();
        }, { once: true });
    }

    // ========================================
    // STEP 2: UPFRONT PAYMENT (ECOM, actual amount)
    // ========================================

    async loadUpfrontPaymentWidget(amount, currency) {
        // Display the amount to the user
        document.getElementById('upfront-amount-display').textContent = Utils.formatCurrency(amount, currency);

        Utils.show('upfront-payment-loading');
        Utils.hide('upfront-payment-container');
        Utils.hide('upfront-payment-error');
        Utils.hide('upfront-payment-success');

        try {
            const state = stateManager.state;

            // Create payment session for upfront payment
            // Scope: ECOM, Amount: decimal format (e.g., 10.50 for €10.50)
            const sessionConfig = {
                amount: amount,
                scope: 'ECOM',
                referenceText: `Membership: ${state.selectedOffer.name} (Upfront)`
            };

            const session = await apiService.createPaymentSession(sessionConfig);

            // Save state with redirect information before mounting widget
            stateManager.update({
                payment: {
                    ...state.payment,
                    activePaymentStep: 'upfront',
                    awaitingRedirect: true,
                    sessionToken: session.token
                }
            });

            // Update URL with payment step
            urlStateManager.replaceURL('C', 'upfront');

            // Initialize upfront payment widget
            Utils.hide('upfront-payment-loading');
            Utils.show('upfront-payment-container');

            if (window.paymentWidget && typeof window.paymentWidget.init === 'function') {
                const config = GlobalConfig.load();

                this.upfrontWidget = window.paymentWidget.init({
                    userSessionToken: session.token,
                    container: 'upfront-payment-container',
                    countryCode: config.countryCode || 'DE',
                    locale: config.locale || 'de-DE',
                    environment: config.environment || 'sandbox',
                    onSuccess: (paymentRequestToken, paymentInstrumentDetails) => {
                        this.handleUpfrontPaymentSuccess(paymentRequestToken, paymentInstrumentDetails);
                    },
                    onError: (error) => {
                        this.handleUpfrontPaymentError(error);
                    }
                });
            } else {
                throw new Error('Payment widget not loaded');
            }

        } catch (error) {
            console.error('Upfront payment widget error:', error);
            this.showUpfrontPaymentError(error.message);
        }
    }

    handleUpfrontPaymentSuccess(paymentRequestToken, paymentInstrumentDetails) {
        console.log('Upfront payment success:', paymentRequestToken, paymentInstrumentDetails);

        // Store upfront payment token and clear redirect flags
        stateManager.update({
            payment: {
                ...stateManager.state.payment,
                upfrontToken: paymentRequestToken,
                awaitingRedirect: false,
                activePaymentStep: null
            }
        });

        // Show success message (keep widget visible to display pre-selected payment method)
        // Utils.hide('upfront-payment-container'); // Commented out - keep widget visible
        Utils.show('upfront-payment-success');
        Utils.show('upfront-status-badge');

        // Both payments complete, enable continue button
        document.getElementById('continue-screen-C').disabled = false;
    }

    handleUpfrontPaymentError(error) {
        console.error('Upfront payment error:', error);
        this.showUpfrontPaymentError(error.message || 'Payment failed');
    }

    showUpfrontPaymentError(message) {
        Utils.hide('upfront-payment-loading');
        Utils.hide('upfront-payment-container');
        Utils.show('upfront-payment-error');
        document.getElementById('upfront-payment-error-message').textContent = message;

        document.getElementById('retry-upfront-payment')?.addEventListener('click', () => {
            const preview = stateManager.state.preview;
            const dueOnSigningObj = preview?.paymentPreview?.dueOnSigningAmount;
            const dueAmount = dueOnSigningObj?.amount || dueOnSigningObj || 0;
            const currency = dueOnSigningObj?.currency || 'EUR';
            this.loadUpfrontPaymentWidget(dueAmount, currency);
        }, { once: true });
    }

    // ========================================
    // REDIRECT RECOVERY: REMOUNT WIDGETS
    // ========================================

    /**
     * Remount recurring payment widget after redirect
     * Uses saved session token from state
     */
    async remountRecurringWidget() {
        const state = stateManager.state;

        if (!state.payment.sessionToken) {
            console.error('No session token found for remounting recurring widget');
            this.showRecurringPaymentError('Session expired. Please try again.');
            return;
        }

        console.log('Remounting recurring payment widget with saved session...');

        // Show recurring payment section
        Utils.show('recurring-payment-section');
        Utils.hide('recurring-payment-success');
        Utils.hide('recurring-payment-error');
        Utils.show('recurring-payment-loading');

        // Initialize order summary
        this.updateOrderSummary();

        try {
            // Wait for container to be visible
            await new Promise(resolve => setTimeout(resolve, 100));

            // Mount widget with saved session token
            Utils.hide('recurring-payment-loading');
            Utils.show('recurring-payment-container');

            if (window.paymentWidget && typeof window.paymentWidget.init === 'function') {
                const config = GlobalConfig.load();

                this.recurringWidget = window.paymentWidget.init({
                    userSessionToken: state.payment.sessionToken,
                    container: 'recurring-payment-container',
                    countryCode: config.countryCode || 'DE',
                    locale: config.locale || 'de-DE',
                    environment: config.environment || 'sandbox',
                    onSuccess: (paymentRequestToken, paymentInstrumentDetails) => {
                        this.handleRecurringPaymentSuccess(paymentRequestToken, paymentInstrumentDetails);
                    },
                    onError: (error) => {
                        this.handleRecurringPaymentError(error);
                    }
                });

                // Clear awaitingRedirect flag after successful remount
                stateManager.update({
                    payment: {
                        ...stateManager.state.payment,
                        awaitingRedirect: false
                    }
                });

                console.log('Recurring widget remounted successfully');
            } else {
                throw new Error('Payment widget not loaded');
            }

        } catch (error) {
            console.error('Error remounting recurring widget:', error);
            this.showRecurringPaymentError(error.message);
        }
    }

    /**
     * Remount upfront payment widget after redirect
     * Uses saved session token from state
     */
    async remountUpfrontWidget() {
        const state = stateManager.state;

        if (!state.payment.sessionToken) {
            console.error('No session token found for remounting upfront widget');
            this.showUpfrontPaymentError('Session expired. Please try again.');
            return;
        }

        console.log('Remounting upfront payment widget with saved session...');

        // If recurring payment was already completed, show it in completed state
        if (state.payment.recurringToken) {
            console.log('Recurring payment already completed, showing success state');
            Utils.show('recurring-payment-section');
            Utils.hide('recurring-payment-loading');
            Utils.hide('recurring-payment-error');
            Utils.show('recurring-payment-success');
            Utils.show('recurring-status-badge');
            Utils.hide('recurring-payment-container'); // Hide the widget container itself
        }

        // Get amount and currency from preview
        const preview = state.preview;
        const dueOnSigningObj = preview?.paymentPreview?.dueOnSigningAmount;
        const dueAmount = typeof dueOnSigningObj === 'object' ? (dueOnSigningObj.amount || 0) : (dueOnSigningObj || 0);
        const currency = typeof dueOnSigningObj === 'object' ? (dueOnSigningObj.currency || 'EUR') : 'EUR';

        // Show upfront payment section
        Utils.show('upfront-payment-section');
        Utils.hide('upfront-payment-success');
        Utils.hide('upfront-payment-error');
        Utils.show('upfront-payment-loading');

        // Update amount display
        document.getElementById('upfront-amount-display').textContent = Utils.formatCurrency(dueAmount, currency);

        // Initialize order summary
        this.updateOrderSummary();

        try {
            // Wait for container to be visible
            await new Promise(resolve => setTimeout(resolve, 100));

            // Mount widget with saved session token
            Utils.hide('upfront-payment-loading');
            Utils.show('upfront-payment-container');

            if (window.paymentWidget && typeof window.paymentWidget.init === 'function') {
                const config = GlobalConfig.load();

                this.upfrontWidget = window.paymentWidget.init({
                    userSessionToken: state.payment.sessionToken,
                    container: 'upfront-payment-container',
                    countryCode: config.countryCode || 'DE',
                    locale: config.locale || 'de-DE',
                    environment: config.environment || 'sandbox',
                    onSuccess: (paymentRequestToken, paymentInstrumentDetails) => {
                        this.handleUpfrontPaymentSuccess(paymentRequestToken, paymentInstrumentDetails);
                    },
                    onError: (error) => {
                        this.handleUpfrontPaymentError(error);
                    }
                });

                // Clear awaitingRedirect flag after successful remount
                stateManager.update({
                    payment: {
                        ...stateManager.state.payment,
                        awaitingRedirect: false
                    }
                });

                console.log('Upfront widget remounted successfully');
            } else {
                throw new Error('Payment widget not loaded');
            }

        } catch (error) {
            console.error('Error remounting upfront widget:', error);
            this.showUpfrontPaymentError(error.message);
        }
    }
}

const screenCController = new ScreenCController();

// =================================================================
// SCREEN D: REVIEW & SIGN
// =================================================================

class ScreenDController {
    constructor() {
        this.isSubmitting = false;
    }

    init() {
        this.populateReview();
        this.attachEventListeners();
    }

    populateReview() {
        const state = stateManager.state;

        // Member info
        const memberInfo = document.getElementById('review-member-info');
        if (memberInfo) {
            memberInfo.innerHTML = `
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <span class="text-sm text-gray-600">Name:</span>
                        <p class="font-semibold">${state.customer.firstName} ${state.customer.lastName}</p>
                    </div>
                    <div>
                        <span class="text-sm text-gray-600">Email:</span>
                        <p class="font-semibold">${state.customer.email}</p>
                    </div>
                    <div>
                        <span class="text-sm text-gray-600">Date of Birth:</span>
                        <p class="font-semibold">${Utils.formatDate(state.customer.dateOfBirth)}</p>
                    </div>
                    <div>
                        <span class="text-sm text-gray-600">Phone:</span>
                        <p class="font-semibold">${state.customer.phone || 'N/A'}</p>
                    </div>
                    <div class="col-span-2">
                        <span class="text-sm text-gray-600">Address:</span>
                        <p class="font-semibold">${state.customer.address.street}, ${state.customer.address.zipCode} ${state.customer.address.city}, ${state.customer.address.countryCode}</p>
                    </div>
                </div>
            `;
        }

        // Membership info
        const membershipInfo = document.getElementById('review-membership-info');
        if (membershipInfo) {
            membershipInfo.innerHTML = `
                <div class="space-y-2">
                    <div>
                        <span class="text-sm text-gray-600">Plan:</span>
                        <p class="font-semibold">${state.selectedOffer.name}</p>
                    </div>
                    <div>
                        <span class="text-sm text-gray-600">Start Date:</span>
                        <p class="font-semibold">${Utils.formatDate(state.contract.startDate)}</p>
                    </div>
                    ${state.contract.voucherCode ? `
                        <div>
                            <span class="text-sm text-gray-600">Voucher:</span>
                            <p class="font-semibold">${state.contract.voucherCode}</p>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        // Payment summary
        const paymentSummary = document.getElementById('review-payment-summary');
        if (paymentSummary && state.preview) {
            const preview = state.preview.paymentPreview;
            const offer = state.selectedOffer;

            // Extract dueOnSigningAmount - handle both object and primitive formats
            const dueOnSigningObj = preview.dueOnSigningAmount;
            const dueAmount = dueOnSigningObj?.amount || dueOnSigningObj || 0;

            // Extract currency - prioritize offer's currency for consistency
            let currency = 'EUR'; // fallback
            const isRecurring = offer.term.paymentFrequency?.type === 'RECURRING';
            const isOneTime = offer.term.paymentFrequency?.type === 'TERM_BASED';

            if (isRecurring && offer.term.paymentFrequency?.price?.currency) {
                currency = offer.term.paymentFrequency.price.currency;
            } else if (isOneTime) {
                const termsToPrices = offer.term.paymentFrequency?.termsToPrices || [];
                if (termsToPrices.length > 0 && termsToPrices[0].price?.currency) {
                    currency = termsToPrices[0].price.currency;
                } else {
                    currency = offer.term.currency || dueOnSigningObj?.currency || preview.currency || 'EUR';
                }
            } else {
                // Fallback chain
                const priceObj = offer.term.paymentFrequency?.price || {};
                currency = priceObj.currency || offer.term.currency || dueOnSigningObj?.currency || preview.currency || 'EUR';
            }

            // Build next charge display
            let nextChargeHtml = '';
            if (preview.paymentSchedule && preview.paymentSchedule.length > 0) {
                const nextCharge = preview.paymentSchedule[0];
                // Extract next charge amount - handle both object and primitive formats
                let nextChargeAmount = 0;
                if (nextCharge.amount) {
                    nextChargeAmount = typeof nextCharge.amount === 'object' ? (nextCharge.amount.amount || 0) : nextCharge.amount;
                }
                nextChargeHtml = `
                    <div class="flex justify-between items-center">
                        <span class="text-gray-700">Next Charge:</span>
                        <span class="font-semibold">${Utils.formatCurrency(nextChargeAmount, currency)} on ${Utils.formatDate(nextCharge.dueDate)}</span>
                    </div>
                `;
            }

            paymentSummary.innerHTML = `
                <div class="space-y-3">
                    <div class="flex justify-between items-center text-lg">
                        <span class="font-semibold text-gray-900">Pay Today:</span>
                        <span class="text-2xl font-bold text-blue-600">${Utils.formatCurrency(dueAmount, currency)}</span>
                    </div>
                    ${nextChargeHtml}
                    <div class="flex justify-between items-center">
                        <span class="text-gray-700">Payment Method:</span>
                        <span class="font-semibold">${state.payment.method || 'Saved'}</span>
                    </div>
                </div>
            `;
        }
    }

    attachEventListeners() {
        // Back button
        document.getElementById('back-screen-D')?.addEventListener('click', () => {
            navigationController.goToScreen('C');
        });

        // Edit buttons
        document.getElementById('edit-member-info')?.addEventListener('click', () => {
            navigationController.goToScreen('B');
        });

        document.getElementById('edit-membership')?.addEventListener('click', () => {
            navigationController.goToScreen('A');
        });

        // Terms checkbox
        document.getElementById('accept-terms')?.addEventListener('change', (e) => {
            document.getElementById('submit-contract').disabled = !e.target.checked;
        });

        // Submit button
        document.getElementById('submit-contract')?.addEventListener('click', () => {
            this.submitContract();
        });

        // Retry button
        document.getElementById('retry-submit')?.addEventListener('click', () => {
            this.submitContract();
        });

        // Create another button
        document.getElementById('create-another')?.addEventListener('click', () => {
            this.reset();
        });
    }

    async submitContract() {
        if (this.isSubmitting) return;

        this.isSubmitting = true;
        Utils.hide('submit-error');
        Utils.hide('submit-success');
        Utils.show('submit-loading');
        Utils.hide('review-navigation');

        try {
            const state = stateManager.state;

            const payload = {
                contract: {
                    contractOfferTermId: state.selectedOffer.term.id,
                    startDate: state.contract.startDate,
                    voucherCode: state.contract.voucherCode || undefined,
                    initialPaymentRequestToken: state.payment.upfrontToken,
                    selectedSelectableModuleIds: [],
                    selectedOptionalModuleIds: []
                },
                customer: {
                    firstName: state.customer.firstName,
                    lastName: state.customer.lastName,
                    dateOfBirth: state.customer.dateOfBirth,
                    email: state.customer.email,
                    phoneNumberMobile: state.customer.phone || undefined,
                    street: state.customer.address.street,
                    city: state.customer.address.city,
                    zipCode: state.customer.address.zipCode,
                    countryCode: state.customer.address.countryCode,
                    language: {
                        languageCode: 'de',
                        countryCode: state.customer.address.countryCode
                    },
                    paymentRequestToken: state.payment.recurringToken
                }
            };

            const result = await apiService.createMembership(payload);

            // Success!
            Utils.hide('submit-loading');
            Utils.show('submit-success');
            document.getElementById('customer-id').textContent = result.customerId || result.id || 'N/A';

            this.isSubmitting = false;

        } catch (error) {
            console.error('Signup error:', error);
            Utils.hide('submit-loading');
            Utils.show('submit-error');
            Utils.show('review-navigation');
            document.getElementById('submit-error-message').textContent = error.message;
            this.isSubmitting = false;
        }
    }

    reset() {
        stateManager.reset();
        navigationController.goToScreen('A');
        screenAController.init();
    }
}

const screenDController = new ScreenDController();

// =================================================================
// REDIRECT RECOVERY HANDLER
// =================================================================

/**
 * Handles returning from payment redirects (3D Secure, etc.)
 * Detects if user was in payment flow and remounts the widget
 */
function handlePaymentRedirectRecovery() {
    const state = stateManager.state;

    // Check if we're returning from a payment redirect
    if (!state.payment.awaitingRedirect || !state.payment.activePaymentStep) {
        return false; // Not a redirect recovery scenario
    }

    console.log('Detected return from payment redirect, recovering flow...', {
        step: state.payment.activePaymentStep,
        screen: state.currentScreen
    });

    // Navigate to payment screen
    navigationController.goToScreen('C');

    // Wait for DOM to be ready, then remount the appropriate widget
    setTimeout(() => {
        if (state.payment.activePaymentStep === 'recurring') {
            console.log('Remounting recurring payment widget...');
            screenCController.remountRecurringWidget();
        } else if (state.payment.activePaymentStep === 'upfront') {
            console.log('Remounting upfront payment widget...');
            screenCController.remountUpfrontWidget();
        }
    }, 200);

    return true; // Handled redirect recovery
}

// =================================================================
// URL RESTORE HANDLER
// =================================================================

/**
 * Restore application state from URL parameters
 * @param {string} screen - Screen identifier from URL
 * @param {string|null} paymentStep - Payment step from URL
 */
function handleURLRestore(screen, paymentStep) {
    const state = stateManager.state;

    // Navigate to the screen without adding to history (use replaceURL internally)
    navigationController.currentScreen = screen;
    document.querySelectorAll('[id^="screen-"]').forEach(el => el.classList.add('hidden'));
    const targetScreen = document.getElementById(`screen-${screen}`);
    if (targetScreen) {
        targetScreen.classList.remove('hidden');
    }

    // Replace URL to ensure it's clean
    urlStateManager.replaceURL(screen, paymentStep);
    stateManager.update({ currentScreen: screen });
    navigationController.updateProgressDots();
    navigationController.updateScreenLabel();

    // Handle each screen restoration
    switch (screen) {
        case 'A':
            screenAController.init();
            break;

        case 'B':
            if (state.selectedOffer) {
                screenBController.init();
            } else {
                // No offer selected, go back to A
                console.warn('No offer selected, redirecting to screen A');
                navigationController.goToScreen('A');
                screenAController.init();
            }
            break;

        case 'C':
            if (state.selectedOffer && state.preview) {
                // Restore payment screen
                if (paymentStep === 'upfront' && state.payment.activePaymentStep === 'upfront') {
                    // User was on upfront payment, remount it
                    console.log('Restoring upfront payment from URL');
                    navigationController.currentScreen = 'C';
                    setTimeout(() => screenCController.remountUpfrontWidget(), 200);
                } else if (paymentStep === 'recurring' && state.payment.activePaymentStep === 'recurring') {
                    // User was on recurring payment, remount it
                    console.log('Restoring recurring payment from URL');
                    navigationController.currentScreen = 'C';
                    setTimeout(() => screenCController.remountRecurringWidget(), 200);
                } else {
                    // No specific payment step or mismatch, reinitialize normally
                    screenCController.init();
                }
            } else {
                console.warn('Incomplete state for payment screen, redirecting to screen A');
                navigationController.goToScreen('A');
                screenAController.init();
            }
            break;

        case 'D':
            if (state.selectedOffer && state.preview && (state.payment.recurringToken || state.payment.upfrontToken)) {
                screenDController.init();
            } else {
                console.warn('Incomplete state for review screen, redirecting to screen A');
                navigationController.goToScreen('A');
                screenAController.init();
            }
            break;

        default:
            navigationController.goToScreen('A');
            screenAController.init();
    }
}

/**
 * Set up browser back/forward navigation handler
 */
function setupHistoryNavigation() {
    window.addEventListener('popstate', (event) => {
        console.log('Browser navigation detected:', event.state);
        const urlScreen = urlStateManager.getScreen();
        const urlPaymentStep = urlStateManager.getPaymentStep();

        if (urlScreen) {
            handleURLRestore(urlScreen, urlPaymentStep);
        } else {
            // No URL state, go to start
            navigationController.goToScreen('A');
            screenAController.init();
        }
    });
}

// =================================================================
// INITIALIZATION
// =================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('Contract Flow (Experimental) - Initializing...');

    // Wait a bit for GlobalConfig to initialize (from nav.js)
    setTimeout(() => {
        // First check URL for screen/payment step
        const urlScreen = urlStateManager.getScreen();
        const urlPaymentStep = urlStateManager.getPaymentStep();

        if (urlScreen) {
            console.log('Restoring from URL:', { screen: urlScreen, paymentStep: urlPaymentStep });
            handleURLRestore(urlScreen, urlPaymentStep);
        } else {
            // Check if we're recovering from a payment redirect (fallback)
            const isRecovering = handlePaymentRedirectRecovery();

            if (!isRecovering) {
                // Normal initialization - start at Screen A
                screenAController.init();
                navigationController.goToScreen('A');
            }
        }

        // Set up "Start Over" button handlers
        setupStartOverButtons();

        // Set up browser back/forward navigation
        setupHistoryNavigation();
    }, 100);
});

/**
 * Set up Start Over button event listeners
 * Confirms with user before resetting the flow
 */
function setupStartOverButtons() {
    const handleStartOver = () => {
        const confirmed = confirm('Are you sure you want to start over? All your progress will be lost.');
        if (confirmed) {
            console.log('User requested to start over, resetting flow...');
            stateManager.reset();
            navigationController.goToScreen('A');
            screenAController.init();
        }
    };

    // Desktop button
    const desktopBtn = document.getElementById('start-over-btn-desktop');
    if (desktopBtn) {
        desktopBtn.addEventListener('click', handleStartOver);
    }

    // Mobile button
    const mobileBtn = document.getElementById('start-over-btn-mobile');
    if (mobileBtn) {
        mobileBtn.addEventListener('click', handleStartOver);
    }
}
