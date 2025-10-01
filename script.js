// DOM Elements
const createSessionBtn = document.getElementById('createSessionBtn');
const clearLogsBtn = document.getElementById('clearLogsBtn');
const clearStorageBtn = document.getElementById('clearStorageBtn');
const statusLog = document.getElementById('status-log');
const debugModeCheckbox = document.getElementById('debugMode');
const manualTokenModeCheckbox = document.getElementById('manualTokenMode');
const userSessionTokenField = document.getElementById('userSessionToken');
let widgetContainer = document.getElementById('payment-widget-container');
const statusIndicator = document.getElementById('statusIndicator');

// Session state
let currentSessionToken = null;
let sessionTokenExpiry = null;
let debugMode = false;
let widgetInstance = null;
let isReturningFromRedirect = false;

// Translation management
let translationPairs = [];

// Styling Presets
const STYLING_PRESETS = {
    magicline: {
        name: "Magicline",
        textColorMain: "#58666E",
        textColorSecondary: "#94999D",
        primaryColor: "#00ADE2",
        secondaryColor: "#F1FCFF",
        borderColor: "#DEE5E7",
        borderRadius: "0",
        boxShadow: "none"
    },
    mysports: {
        name: "MySports", 
        textColorMain: "#131313",
        textColorSecondary: "#5F5E5E",
        primaryColor: "#1A3294",
        secondaryColor: "#E8EAF4",
        borderColor: "#DFDFDF",
        borderRadius: "8px",
        boxShadow: "0 8px 16px 0 rgba(0, 0, 0, 0.08)"
    }
};

// Local Storage Keys
const STORAGE_KEY = 'paymentWidgetTestSuite';
const STORAGE_VERSION = '1.1';

// URL Parameter Detection
function detectRedirectReturn() {
    const urlParams = new URLSearchParams(window.location.search);
    const redirectIndicators = [
        'payment_status',
        'payment_result',
        'status',
        'result',
        'return',
        'callback',
        'success',
        'error',
        'cancel',
        'cancelled',
        'payment_id',
        'transaction_id'
    ];
    
    // Check if any redirect indicator parameters exist
    const hasRedirectParams = redirectIndicators.some(param => urlParams.has(param));
    
    if (hasRedirectParams) {
        logStatus('Detected return from payment redirect', 'info');
        updateStatusIndicator('redirect', 'Redirect Return');
        const params = {};
        for (const [key, value] of urlParams.entries()) {
            params[key] = value;
        }
        logDebugInfo('Redirect Return Parameters', params);
        return true;
    }
    
    return false;
}

function updateStatusIndicator(status, message) {
    const statusClasses = {
        ready: 'bg-green-100 text-green-800',
        processing: 'bg-yellow-100 text-yellow-800',
        redirect: 'bg-blue-100 text-blue-800',
        success: 'bg-green-100 text-green-800',
        error: 'bg-red-100 text-red-800'
    };
    
    statusIndicator.className = `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClasses[status] || statusClasses.ready}`;
    statusIndicator.textContent = message;
}

function cleanupRedirectParams() {
    // Remove redirect parameters from URL without reloading the page
    const url = new URL(window.location);
    const redirectIndicators = [
        'payment_status',
        'payment_result', 
        'status',
        'result',
        'return',
        'callback',
        'success',
        'error',
        'cancel',
        'cancelled',
        'payment_id',
        'transaction_id'
    ];
    
    let paramsRemoved = false;
    redirectIndicators.forEach(param => {
        if (url.searchParams.has(param)) {
            url.searchParams.delete(param);
            paramsRemoved = true;
        }
    });
    
    if (paramsRemoved) {
        window.history.replaceState({}, document.title, url.pathname + url.search);
        logStatus('Cleaned up redirect parameters from URL', 'info');
        updateStatusIndicator('ready', 'Ready');
    }
}

// Utility Functions
function logStatus(message, type = 'info', showTimestamp = true) {
    const colors = {
        info: 'text-gray-300',
        success: 'text-green-400',
        error: 'text-red-400',
        warn: 'text-yellow-400'
    };
    
    const typeLabels = {
        info: 'INFO',
        success: 'SUCCESS',
        error: 'ERROR',
        warn: 'WARN'
    };

    const entry = document.createElement('div');
    entry.className = `status-log-entry ${colors[type]} flex items-start`;
    
    const timestamp = showTimestamp ? new Date().toLocaleTimeString() : '';
    const label = typeLabels[type] || 'INFO';
    
    entry.innerHTML = `
        <span class="w-16 text-gray-500 shrink-0">[${label}]</span>
        <span class="flex-1">${message}</span>
        ${timestamp ? `<span class="text-xs text-gray-600 ml-2 shrink-0">${timestamp}</span>` : ''}
    `;
    
    statusLog.appendChild(entry);
    statusLog.scrollTop = statusLog.scrollHeight;
}

function clearLogs() {
    statusLog.innerHTML = `
        <div class="text-gray-400 flex items-center">
            <span class="w-16 text-gray-500">[INIT]</span>
            <span>Logs cleared</span>
        </div>
    `;
}

function validateForm(formData) {
    const errors = [];
    
    if (!formData.apiKey?.trim()) {
        errors.push('API Key is required');
    }
    
    if (!formData.amount && formData.amount !== 0) {
        errors.push('Amount is required');
    }
    
    if (formData.amount < 0) {
        errors.push('Amount cannot be negative');
    }
    
    if (!formData.scope?.trim()) {
        errors.push('Scope is required');
    }
    
    if (formData.referenceText !== undefined && !formData.referenceText?.trim()) {
        errors.push('Reference text cannot be empty when provided');
    }
    
    return errors;
}

function setButtonLoading(button, isLoading, loadingText = 'Loading...') {
    if (isLoading) {
        button.disabled = true;
        button.innerHTML = `
            <svg class="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            ${loadingText}
        `;
    } else {
        button.disabled = false;
    }
}


// Local Storage Functions
function saveToLocalStorage() {
    try {
        const formData = {
            version: STORAGE_VERSION,
            timestamp: new Date().toISOString(),
            // API Configuration
            apiKey: document.getElementById('apiKey').value,
            apiBaseUrl: document.getElementById('apiBaseUrl').value,
            
            // Session Parameters
            sessionAmount: document.getElementById('sessionAmount').value,
            scope: document.getElementById('scope').value,
            referenceText: document.getElementById('referenceText').value,
            customerId: document.getElementById('customerId').value,
            finionPayCustomerId: document.getElementById('finionPayCustomerId').value,
            permittedPaymentChoices: Array.from(document.querySelectorAll('.payment-method-checkbox:checked')).map(cb => cb.value),
            requireDirectDebitSignature: document.getElementById('requireDirectDebitSignature').checked,
            debugMode: document.getElementById('debugMode').checked,

            // Widget Configuration
            countryCode: document.getElementById('countryCode').value,
            environment: document.getElementById('environment').value,
            locale: document.getElementById('locale').value,
            manualTokenMode: document.getElementById('manualTokenMode').checked,

            // Feature Flags
            useRubiksUI: document.getElementById('useRubiksUI').checked,

            // Styling Configuration
            stylingPreset: document.getElementById('stylingPreset').value,
            textColorMain: document.getElementById('textColorMain').value,
            textColorSecondary: document.getElementById('textColorSecondary').value,
            primaryColor: document.getElementById('primaryColor').value,
            secondaryColor: document.getElementById('secondaryColor').value,
            borderColor: document.getElementById('borderColor').value,
            borderRadius: document.getElementById('borderRadius').value,
            boxShadow: document.getElementById('boxShadow').value,
            
            // i18n Configuration
            translationPairs: translationPairs,
            devMode: document.getElementById('devMode').checked,
            
            // Session token (only if in manual mode)
            userSessionToken: document.getElementById('manualTokenMode').checked ? document.getElementById('userSessionToken').value : '',
            
            // Store current session info for redirect recovery
            currentSessionToken: currentSessionToken,
            sessionTokenExpiry: sessionTokenExpiry ? sessionTokenExpiry.toISOString() : null
        };
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
        logStatus('Form data saved to local storage', 'info');
    } catch (error) {
        console.error('Failed to save to local storage:', error);
        logStatus('Failed to save form data', 'warn');
    }
}

function loadFromLocalStorage() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return false;
        
        const formData = JSON.parse(saved);
        
        // Check version compatibility
        if (formData.version !== STORAGE_VERSION) {
            logStatus('Stored data version mismatch, skipping restore', 'warn');
            return false;
        }
        
        // Restore API Configuration
        if (formData.apiKey) document.getElementById('apiKey').value = formData.apiKey;
        if (formData.apiBaseUrl) document.getElementById('apiBaseUrl').value = formData.apiBaseUrl;
        
        // Restore Session Parameters
        if (formData.sessionAmount) document.getElementById('sessionAmount').value = formData.sessionAmount;
        if (formData.scope) document.getElementById('scope').value = formData.scope;
        if (formData.referenceText) document.getElementById('referenceText').value = formData.referenceText;
        if (formData.customerId) document.getElementById('customerId').value = formData.customerId;
        if (formData.finionPayCustomerId) document.getElementById('finionPayCustomerId').value = formData.finionPayCustomerId;
        
        // Restore payment method selections
        if (formData.permittedPaymentChoices) {
            document.querySelectorAll('.payment-method-checkbox').forEach(cb => {
                cb.checked = formData.permittedPaymentChoices.includes(cb.value);
            });
        }

        // Restore requireDirectDebitSignature
        if (formData.requireDirectDebitSignature !== undefined) {
            document.getElementById('requireDirectDebitSignature').checked = formData.requireDirectDebitSignature;
        }

        // Restore debug mode
        if (formData.debugMode !== undefined) {
            document.getElementById('debugMode').checked = formData.debugMode;
            debugMode = formData.debugMode;
        }
        
        // Restore Widget Configuration
        if (formData.countryCode) document.getElementById('countryCode').value = formData.countryCode;
        if (formData.environment) document.getElementById('environment').value = formData.environment;
        if (formData.locale) document.getElementById('locale').value = formData.locale;

        // Restore Feature Flags
        if (formData.useRubiksUI !== undefined) {
            document.getElementById('useRubiksUI').checked = formData.useRubiksUI;
        }

        // Restore Styling Configuration
        if (formData.stylingPreset !== undefined) document.getElementById('stylingPreset').value = formData.stylingPreset;
        if (formData.textColorMain) document.getElementById('textColorMain').value = formData.textColorMain;
        if (formData.textColorSecondary) document.getElementById('textColorSecondary').value = formData.textColorSecondary;
        if (formData.primaryColor) document.getElementById('primaryColor').value = formData.primaryColor;
        if (formData.secondaryColor) document.getElementById('secondaryColor').value = formData.secondaryColor;
        if (formData.borderColor) document.getElementById('borderColor').value = formData.borderColor;
        if (formData.borderRadius) document.getElementById('borderRadius').value = formData.borderRadius;
        if (formData.boxShadow) document.getElementById('boxShadow').value = formData.boxShadow;
        
        // Restore i18n Configuration
        if (formData.translationPairs && Array.isArray(formData.translationPairs)) {
            translationPairs = formData.translationPairs;
            // Clear container and re-render all translation pairs
            const container = document.getElementById('translationPairs');
            if (container) {
                container.innerHTML = '';
                translationPairs.forEach(pair => {
                    renderTranslationPair(pair);
                });
            }
        }
        if (formData.devMode !== undefined) {
            document.getElementById('devMode').checked = formData.devMode;
        }
        
        // Restore manual token mode and token
        if (formData.manualTokenMode !== undefined) {
            document.getElementById('manualTokenMode').checked = formData.manualTokenMode;
            // Trigger change event to update UI
            manualTokenModeCheckbox.dispatchEvent(new Event('change'));
            
            if (formData.manualTokenMode && formData.userSessionToken) {
                document.getElementById('userSessionToken').value = formData.userSessionToken;
                updateTokenUI(formData.userSessionToken, null, true);
                
                // Auto-mount widget after manual token restoration
                setTimeout(async () => {
                    logStatus('Auto-mounting widget with restored manual token...', 'info');
                    await autoMountWidget();
                }, 100);
            }
        }
        
        // Restore session token from previous session (for redirect recovery)
        if (formData.currentSessionToken) {
            currentSessionToken = formData.currentSessionToken;
            if (formData.sessionTokenExpiry) {
                sessionTokenExpiry = new Date(formData.sessionTokenExpiry);
            }
            
            // Update UI if not in manual mode
            if (!formData.manualTokenMode) {
                updateTokenUI(currentSessionToken, sessionTokenExpiry, false);
                logStatus('Session token restored from previous session', 'success');
                
                // Auto-mount widget after session token restoration
                setTimeout(async () => {
                    logStatus('Auto-mounting widget with restored session token...', 'info');
                    await autoMountWidget();
                }, 100);
            }
        }
        
        // Ensure customer ID fields are both enabled (mutual exclusivity removed)
        const customerIdField = document.getElementById('customerId');
        const finionPayCustomerIdField = document.getElementById('finionPayCustomerId');
        customerIdField.disabled = false;
        customerIdField.classList.remove('bg-gray-100');
        finionPayCustomerIdField.disabled = false;
        finionPayCustomerIdField.classList.remove('bg-gray-100');
        
        const savedDate = new Date(formData.timestamp);
        logStatus(`Form data restored from ${savedDate.toLocaleString()}`, 'success');
        return true;
        
    } catch (error) {
        console.error('Failed to load from local storage:', error);
        logStatus('Failed to restore form data', 'warn');
        return false;
    }
}

function clearLocalStorage() {
    try {
        localStorage.removeItem(STORAGE_KEY);
        logStatus('Local storage cleared', 'info');
    } catch (error) {
        console.error('Failed to clear local storage:', error);
        logStatus('Failed to clear storage', 'warn');
    }
}

function logDebugInfo(title, data) {
    if (debugMode) {
        logStatus(`[DEBUG] ${title}:`, 'warn');
        const debugEntry = document.createElement('div');
        debugEntry.className = 'text-cyan-300 ml-16 mt-1';
        debugEntry.innerHTML = `<pre class="text-xs bg-gray-800 p-2 rounded border-l-2 border-cyan-500 overflow-x-auto">${JSON.stringify(data, null, 2)}</pre>`;
        statusLog.appendChild(debugEntry);
        statusLog.scrollTop = statusLog.scrollHeight;
    }
}

// Translation Management Functions
function generateTranslationId() {
    return 'translation_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function addTranslationPair(key = '', value = '', id = null) {
    const pairId = id || generateTranslationId();
    const pairObj = { id: pairId, key, value };
    
    if (!id) {
        translationPairs.push(pairObj);
    }
    
    renderTranslationPair(pairObj);
    saveToLocalStorage();
}

function removeTranslationPair(id) {
    translationPairs = translationPairs.filter(pair => pair.id !== id);
    const pairElement = document.getElementById(id);
    if (pairElement) {
        pairElement.remove();
    }
    saveToLocalStorage();
}

function updateTranslationPair(id, key, value) {
    const pairIndex = translationPairs.findIndex(pair => pair.id === id);
    if (pairIndex !== -1) {
        translationPairs[pairIndex].key = key;
        translationPairs[pairIndex].value = value;
        saveToLocalStorage();
    }
}

function renderTranslationPair(pairObj) {
    const container = document.getElementById('translationPairs');
    
    const pairDiv = document.createElement('div');
    pairDiv.id = pairObj.id;
    pairDiv.className = 'flex items-center space-x-2 p-3 bg-gray-50 rounded-md';
    
    pairDiv.innerHTML = `
        <div class="flex-1">
            <input 
                type="text" 
                placeholder="Translation key (e.g., button.pay)"
                value="${pairObj.key}"
                class="translation-key block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
            >
        </div>
        <div class="flex-1">
            <input 
                type="text" 
                placeholder="Custom value"
                value="${pairObj.value}"
                class="translation-value block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
            >
        </div>
        <button 
            type="button" 
            class="remove-translation text-red-500 hover:text-red-700 p-1"
            title="Remove translation"
        >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
        </button>
    `;
    
    container.appendChild(pairDiv);
    
    // Add event listeners for this pair
    const keyInput = pairDiv.querySelector('.translation-key');
    const valueInput = pairDiv.querySelector('.translation-value');
    const removeBtn = pairDiv.querySelector('.remove-translation');
    
    keyInput.addEventListener('input', () => {
        updateTranslationPair(pairObj.id, keyInput.value, valueInput.value);
    });
    
    valueInput.addEventListener('input', () => {
        updateTranslationPair(pairObj.id, keyInput.value, valueInput.value);
    });
    
    removeBtn.addEventListener('click', () => {
        removeTranslationPair(pairObj.id);
    });
}

function getTranslationsAsObject() {
    const translations = {};
    translationPairs.forEach(pair => {
        if (pair.key.trim() && pair.value.trim()) {
            translations[pair.key.trim()] = pair.value.trim();
        }
    });
    return translations;
}

// Styling Preset Functions
function applyStylePreset(presetKey) {
    if (!presetKey || !STYLING_PRESETS[presetKey]) {
        logStatus('Invalid or empty preset selected', 'warn');
        return;
    }
    
    const preset = STYLING_PRESETS[presetKey];
    logStatus(`Applying ${preset.name} styling preset...`, 'info');
    
    // Apply preset values to form fields
    document.getElementById('textColorMain').value = preset.textColorMain;
    document.getElementById('textColorSecondary').value = preset.textColorSecondary;
    document.getElementById('primaryColor').value = preset.primaryColor;
    document.getElementById('secondaryColor').value = preset.secondaryColor;
    document.getElementById('borderColor').value = preset.borderColor;
    document.getElementById('borderRadius').value = preset.borderRadius;
    document.getElementById('boxShadow').value = preset.boxShadow;
    
    logStatus(`${preset.name} preset applied successfully`, 'success');
    
    // Save the configuration
    saveToLocalStorage();
    
    // If widget is already mounted, remount it with new styling
    if (currentSessionToken && widgetInstance) {
        logStatus('Remounting widget with new preset styling...', 'info');
        setTimeout(autoMountWidget, 100);
    }
}

function clearStylePreset() {
    logStatus('Clearing custom styling to vanilla defaults...', 'info');
    
    // Clear all styling fields
    document.getElementById('textColorMain').value = '';
    document.getElementById('textColorSecondary').value = '';
    document.getElementById('primaryColor').value = '';
    document.getElementById('secondaryColor').value = '';
    document.getElementById('borderColor').value = '';
    document.getElementById('borderRadius').value = '';
    document.getElementById('boxShadow').value = '';
    
    logStatus('Styling cleared - using vanilla widget appearance', 'success');
    
    // Save the configuration
    saveToLocalStorage();
    
    // If widget is already mounted, remount it without styling
    if (currentSessionToken && widgetInstance) {
        logStatus('Remounting widget with vanilla styling...', 'info');
        setTimeout(autoMountWidget, 100);
    }
}

function updateTokenUI(token, expiry = null, isManual = false) {
    userSessionTokenField.value = token;
    currentSessionToken = token;
    
    const tokenInfo = document.getElementById('tokenInfo');
    const tokenExpiry = document.getElementById('tokenExpiry');
    
    if (expiry) {
        sessionTokenExpiry = new Date(expiry);
        tokenExpiry.textContent = `Token expires: ${sessionTokenExpiry.toLocaleString()}`;
        tokenInfo.classList.remove('hidden');
    } else if (isManual) {
        tokenExpiry.textContent = 'Manual entry - expiry unknown';
        tokenInfo.classList.remove('hidden');
        sessionTokenExpiry = null;
    }
}

// API Functions
async function createPaymentSession(sessionData) {
    console.log('createPaymentSession called with sessionData:', sessionData);
    console.log('sessionData.requireDirectDebitSignature:', sessionData.requireDirectDebitSignature, 'type:', typeof sessionData.requireDirectDebitSignature);

    const apiKey = document.getElementById('apiKey').value.trim();
    const baseUrl = document.getElementById('apiBaseUrl').value.trim();

    const requestBody = {
        amount: parseFloat(sessionData.amount),
        scope: sessionData.scope
    };
    
    // Add optional fields if they have values
    if (sessionData.referenceText?.trim()) {
        requestBody.referenceText = sessionData.referenceText.trim();
    }
    
    if (sessionData.customerId) {
        requestBody.customerId = parseInt(sessionData.customerId, 10);
    }
    
    if (sessionData.finionPayCustomerId?.trim()) {
        requestBody.finionPayCustomerId = sessionData.finionPayCustomerId.trim();
    }
    
    if (sessionData.permittedPaymentChoices?.length > 0) {
        requestBody.permittedPaymentChoices = sessionData.permittedPaymentChoices;
    }

    // Always include requireDirectDebitSignature if it's a boolean
    if (typeof sessionData.requireDirectDebitSignature === 'boolean') {
        requestBody.requireDirectDebitSignature = sessionData.requireDirectDebitSignature;
        console.log('✓ Added requireDirectDebitSignature to request body:', requestBody.requireDirectDebitSignature);
    } else {
        console.log('✗ NOT adding requireDirectDebitSignature. Value:', sessionData.requireDirectDebitSignature, 'Type:', typeof sessionData.requireDirectDebitSignature);
    }

    console.log('Final request body before API call:', JSON.stringify(requestBody, null, 2));

    // Debug logging for request
    logDebugInfo('API Request Headers', {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey.substring(0, 8) + '...' // Partial key for security
    });
    logDebugInfo('API Request Body', requestBody);
    
    const response = await fetch(`${baseUrl}/v1/payments/user-session`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': apiKey
        },
        body: JSON.stringify(requestBody)
    });
    
    // Debug logging for response
    logDebugInfo('API Response Status', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
    });
    
    const responseData = await response.json();
    
    if (!response.ok) {
        logDebugInfo('API Error Response', responseData);
        throw new Error(`API Error (${response.status}): ${responseData.message || response.statusText}`);
    }
    
    logDebugInfo('API Success Response', responseData);
    return responseData;
}

// Widget Functions
async function unmountWidget() {
    if (widgetInstance) {
        try {
            logStatus('Unmounting existing widget...');
            
            // Try multiple unmount strategies
            if (typeof widgetInstance.unmount === 'function') {
                await widgetInstance.unmount();
            } else if (typeof widgetInstance.destroy === 'function') {
                await widgetInstance.destroy();
            } else if (typeof paymentWidget?.unmount === 'function') {
                await paymentWidget.unmount();
            } else if (typeof paymentWidget?.destroy === 'function') {
                await paymentWidget.destroy();
            }
            
            widgetInstance = null;
            logStatus('Widget unmounted successfully', 'success');
        } catch (error) {
            logStatus(`Widget unmount error: ${error.message}`, 'warn');
            console.error('Error during widget unmount:', error);
            widgetInstance = null;
        }
    }
    
    // Clear the container content to prepare for fresh mount
    widgetContainer.innerHTML = '';
}

async function initializeWidget(config) {
    // Unmount existing widget first
    await unmountWidget();

    // Save current form data to preserve it during widget initialization
    try {
        saveToLocalStorage();
    } catch (error) {
        logStatus(`Form data preservation error: ${error.message}`, 'warn');
    }

    logStatus('Initializing payment widget...');

    // Check if the paymentWidget global object exists
    if (typeof paymentWidget === 'undefined') {
        const errorMsg = 'Payment widget library not loaded';
        logStatus(errorMsg, 'error');
        console.error("Payment widget library 'paymentWidget' is undefined");
        return;
    }

    try {
        logStatus('Calling paymentWidget.init()...');

        // Debug log the config (excluding sensitive callbacks)
        logDebugInfo('Widget Configuration', {
            ...config,
            onSuccess: '[Function]',
            onError: '[Function]'
        });

        widgetInstance = paymentWidget.init(config);
        logStatus('Payment widget initialized successfully!', 'success');
        console.log('Payment widget initialized successfully.');
    } catch (error) {
        const errorMsg = `Widget initialization failed: ${error.message || 'Unknown error'}`;
        logStatus(errorMsg, 'error');

        // Reset widget instance on error
        widgetInstance = null;

        console.error('Failed to initialize payment widget:', error);
    }
}

// Auto-mount widget function (used after session creation)
async function autoMountWidget() {
    if (!currentSessionToken) {
        logStatus('No session token available for auto-mount.', 'error');
        return;
    }
    
    // Check if token is expired
    if (sessionTokenExpiry && new Date() > sessionTokenExpiry) {
        logStatus('Session token has expired. Cannot auto-mount widget.', 'error');
        return;
    }
    
    try {
        // Collect widget configuration (same as manual mount)
        const config = {
            userSessionToken: currentSessionToken,
            environment: document.getElementById('environment').value,
            container: 'payment-widget-container',
            countryCode: document.getElementById('countryCode').value,
            locale: document.getElementById('locale').value,
            onSuccess: (paymentToken) => {
                const successMsg = `Payment authorized successfully! Token: ${paymentToken}`;
                logStatus(successMsg, 'success');
                console.log('Payment successful:', paymentToken);
            },
            onError: (error) => {
                const errorMsg = `Payment error: ${error.message || 'Unknown error'}`;
                logStatus(errorMsg, 'error');
                console.error('Payment widget error:', error);
            }
        };
        
        // Add styling configuration if any values are provided
        const styling = {};
        const textColorMain = document.getElementById('textColorMain').value.trim();
        const textColorSecondary = document.getElementById('textColorSecondary').value.trim();
        const primaryColor = document.getElementById('primaryColor').value.trim();
        const secondaryColor = document.getElementById('secondaryColor').value.trim();
        const borderColor = document.getElementById('borderColor').value.trim();
        const borderRadius = document.getElementById('borderRadius').value.trim();
        const boxShadow = document.getElementById('boxShadow').value.trim();
        
        if (textColorMain) styling.textColorMain = textColorMain;
        if (textColorSecondary) styling.textColorSecondary = textColorSecondary;
        if (primaryColor) styling.primaryColor = primaryColor;
        if (secondaryColor) styling.secondaryColor = secondaryColor;
        if (borderColor) styling.borderColor = borderColor;
        if (borderRadius) styling.borderRadius = borderRadius;
        if (boxShadow) styling.boxShadow = boxShadow;
        
        if (Object.keys(styling).length > 0) {
            config.styling = styling;
        }
        
        // Add i18n configuration if translations are provided
        const translations = getTranslationsAsObject();
        if (Object.keys(translations).length > 0) {
            config.i18n = translations;
            logStatus(`Custom translations loaded (${Object.keys(translations).length} keys)`, 'info');
        }
        
        // Add devMode if enabled
        const devModeEnabled = document.getElementById('devMode').checked;
        if (devModeEnabled) {
            config.devMode = true;
            logStatus('Development mode enabled - translation keys will be visible', 'info');
        }

        // Add featureFlags if any are enabled
        const useRubiksUI = document.getElementById('useRubiksUI').checked;
        if (useRubiksUI) {
            config.featureFlags = {
                useRubiksUI: true
            };
            logStatus('Feature flag enabled: useRubiksUI', 'info');
        }

        logStatus(`Auto-mounting payment widget...`);
        logStatus(`Environment: ${config.environment}, Country: ${config.countryCode}`);
        
        await initializeWidget(config);
        logStatus('Widget auto-mounted successfully!', 'success');
        
    } catch (error) {
        logStatus(`Auto-mount failed: ${error.message}`, 'error');
        console.error('Failed to auto-mount widget:', error);
    }
}

// Event Listeners
createSessionBtn.addEventListener('click', async () => {
    logStatus('Starting payment session creation...');
    
    // Collect form data
    const formData = {
        apiKey: document.getElementById('apiKey').value,
        apiBaseUrl: document.getElementById('apiBaseUrl').value,
        amount: document.getElementById('sessionAmount').value,
        scope: document.getElementById('scope').value,
        referenceText: document.getElementById('referenceText').value,
        customerId: document.getElementById('customerId').value,
        finionPayCustomerId: document.getElementById('finionPayCustomerId').value,
        permittedPaymentChoices: Array.from(document.querySelectorAll('.payment-method-checkbox:checked')).map(cb => cb.value),
        requireDirectDebitSignature: document.getElementById('requireDirectDebitSignature').checked
    };

    console.log('Form data collected:', formData);
    console.log('requireDirectDebitSignature value:', formData.requireDirectDebitSignature, 'type:', typeof formData.requireDirectDebitSignature);

    // Validate form
    const errors = validateForm(formData);
    if (errors.length > 0) {
        errors.forEach(error => logStatus(error, 'error'));
        return;
    }
    
    setButtonLoading(createSessionBtn, true, 'Creating Session...');
    
    try {
        logStatus('Sending API request to create payment session...');
        logStatus(`API Endpoint: ${formData.apiBaseUrl}/v1/payments/user-session`);
        
        const response = await createPaymentSession(formData);
        
        // Update UI with session token
        updateTokenUI(response.token, response.tokenValidUntil);
        
        logStatus('Payment session created successfully!', 'success');
        logStatus(`Token: ${response.token.substring(0, 20)}...`);
        if (response.finionPayCustomerId) {
            logStatus(`Finion Pay Customer ID: ${response.finionPayCustomerId}`);
        }
        
        // Auto-mount the widget after session creation
        logStatus('Auto-mounting widget...', 'info');
        await autoMountWidget();
        
    } catch (error) {
        logStatus(`Session creation failed: ${error.message}`, 'error');
        console.error('Failed to create payment session:', error);
    } finally {
        setButtonLoading(createSessionBtn, false);
        createSessionBtn.innerHTML = `
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
            Create Payment Session
        `;
    }
});


clearLogsBtn.addEventListener('click', clearLogs);

// Clear storage button
clearStorageBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all saved form data? This cannot be undone.')) {
        clearLocalStorage();
        // Optionally reload the page to reset form to defaults
        if (confirm('Would you like to reload the page to reset all fields to defaults?')) {
            location.reload();
        }
    }
});

// Auto-save functionality
function setupAutoSave() {
    const formElements = [
        'apiKey', 'apiBaseUrl', 'sessionAmount', 'scope', 'referenceText', 'customerId', 'finionPayCustomerId',
        'countryCode', 'environment', 'locale', 'stylingPreset', 'textColorMain', 'textColorSecondary', 'primaryColor', 'secondaryColor', 'borderColor', 'borderRadius', 'boxShadow'
    ];
    
    // Debounce function to limit save frequency
    let saveTimeout;
    function debouncedSave() {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(saveToLocalStorage, 500); // Save 500ms after last change
    }
    
    // Add listeners to form elements
    formElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', debouncedSave);
            element.addEventListener('change', debouncedSave);
        }
    });
    
    // Add listeners to checkboxes
    document.querySelectorAll('.payment-method-checkbox').forEach(cb => {
        cb.addEventListener('change', debouncedSave);
    });
    
    // Special handling for toggles
    debugModeCheckbox.addEventListener('change', debouncedSave);
    manualTokenModeCheckbox.addEventListener('change', debouncedSave);
    
    const devModeCheckbox = document.getElementById('devMode');
    if (devModeCheckbox) {
        devModeCheckbox.addEventListener('change', debouncedSave);
    }

    const useRubiksUICheckbox = document.getElementById('useRubiksUI');
    if (useRubiksUICheckbox) {
        useRubiksUICheckbox.addEventListener('change', debouncedSave);
    }

    const requireDirectDebitSignatureCheckbox = document.getElementById('requireDirectDebitSignature');
    if (requireDirectDebitSignatureCheckbox) {
        requireDirectDebitSignatureCheckbox.addEventListener('change', debouncedSave);
    }

    // Save manual token when entered
    userSessionTokenField.addEventListener('input', () => {
        if (manualTokenModeCheckbox.checked) {
            debouncedSave();
        }
    });
}

// Debug mode toggle
debugModeCheckbox.addEventListener('change', () => {
    debugMode = debugModeCheckbox.checked;
    logStatus(`Debug mode ${debugMode ? 'enabled' : 'disabled'}`, 'info');
    if (debugMode) {
        logStatus('Debug mode will show detailed API request/response information', 'warn');
    }
});

// Manual token mode toggle
manualTokenModeCheckbox.addEventListener('change', async () => {
    const isManual = manualTokenModeCheckbox.checked;
    
    if (isManual) {
        userSessionTokenField.readOnly = false;
        userSessionTokenField.classList.remove('bg-gray-50');
        userSessionTokenField.classList.add('bg-white');
        userSessionTokenField.placeholder = 'Enter your session token manually';
        logStatus('Manual token entry enabled', 'info');
        
        // Check if there's already a token value and auto-mount if valid
        const token = userSessionTokenField.value.trim();
        if (token.length > 10) {
            updateTokenUI(token, null, true);
            logStatus('Existing token validated in manual mode', 'success');
            logStatus('Auto-mounting widget with existing token...', 'info');
            await autoMountWidget();
        }
    } else {
        userSessionTokenField.readOnly = true;
        userSessionTokenField.classList.add('bg-gray-50');
        userSessionTokenField.classList.remove('bg-white');
        userSessionTokenField.placeholder = 'Token will appear here after creating session';
        logStatus('Automatic token mode enabled', 'info');
        
        // Check if there's a current session token and auto-mount if valid
        if (currentSessionToken) {
            logStatus('Auto-mounting widget with current session token...', 'info');
            await autoMountWidget();
        }
    }
});

// Manual token input validation
let lastProcessedToken = '';
let tokenInputTimeout = null;

userSessionTokenField.addEventListener('input', async () => {
    if (manualTokenModeCheckbox.checked) {
        const token = userSessionTokenField.value.trim();

        // Prevent processing the same token multiple times
        if (token === lastProcessedToken) {
            return;
        }

        // Clear any pending timeout
        if (tokenInputTimeout) {
            clearTimeout(tokenInputTimeout);
        }

        if (token.length > 10) { // Basic validation
            lastProcessedToken = token;
            updateTokenUI(token, null, true);
            logStatus('Manual token entered and validated', 'success');

            // Debounce the auto-mount to prevent infinite loops
            tokenInputTimeout = setTimeout(async () => {
                logStatus('Auto-mounting widget with manual token...', 'info');
                await autoMountWidget();
            }, 300);
        } else {
            lastProcessedToken = '';
            const tokenInfo = document.getElementById('tokenInfo');
            tokenInfo.classList.add('hidden');
        }
    }
});

// Auto-mount widget after redirect return
async function handleRedirectReturn() {
    if (!currentSessionToken) {
        logStatus('No session token available for redirect return', 'warn');
        return;
    }
    
    // Check if token is expired
    if (sessionTokenExpiry && new Date() > sessionTokenExpiry) {
        logStatus('Session token expired, cannot auto-mount widget after redirect', 'error');
        return;
    }
    
    logStatus('Auto-mounting widget after redirect return...', 'info');
    updateStatusIndicator('processing', 'Auto-mounting...');
    
    try {
        // Collect widget configuration (same as manual mount)
        const config = {
            userSessionToken: currentSessionToken,
            environment: document.getElementById('environment').value,
            container: 'payment-widget-container',
            countryCode: document.getElementById('countryCode').value,
            locale: document.getElementById('locale').value,
            onSuccess: (paymentToken) => {
                const successMsg = `Payment completed after redirect! Token: ${paymentToken}`;
                logStatus(successMsg, 'success');
                console.log('Payment successful after redirect:', paymentToken);
                updateStatusIndicator('success', 'Payment Complete!');
                
                // Clean up URL parameters after successful payment
                setTimeout(() => {
                    cleanupRedirectParams();
                }, 2000);
            },
            onError: (error) => {
                const errorMsg = `Payment error after redirect: ${error.message || 'Unknown error'}`;
                logStatus(errorMsg, 'error');
                console.error('Payment widget error after redirect:', error);
                updateStatusIndicator('error', 'Payment Error');
                
                // Clean up URL parameters even on error
                setTimeout(() => {
                    cleanupRedirectParams();
                }, 2000);
            }
        };
        
        // Add styling configuration if any values are provided (same as manual mount)
        const styling = {};
        const textColorMain = document.getElementById('textColorMain').value.trim();
        const textColorSecondary = document.getElementById('textColorSecondary').value.trim();
        const primaryColor = document.getElementById('primaryColor').value.trim();
        const secondaryColor = document.getElementById('secondaryColor').value.trim();
        const borderColor = document.getElementById('borderColor').value.trim();
        const borderRadius = document.getElementById('borderRadius').value.trim();
        const boxShadow = document.getElementById('boxShadow').value.trim();
        
        if (textColorMain) styling.textColorMain = textColorMain;
        if (textColorSecondary) styling.textColorSecondary = textColorSecondary;
        if (primaryColor) styling.primaryColor = primaryColor;
        if (secondaryColor) styling.secondaryColor = secondaryColor;
        if (borderColor) styling.borderColor = borderColor;
        if (borderRadius) styling.borderRadius = borderRadius;
        if (boxShadow) styling.boxShadow = boxShadow;
        
        if (Object.keys(styling).length > 0) {
            config.styling = styling;
        }
        
        // Add i18n configuration if translations are provided (same as manual mount)
        const translations = getTranslationsAsObject();
        if (Object.keys(translations).length > 0) {
            config.i18n = translations;
        }
        
        // Add devMode if enabled (same as manual mount)
        const devModeEnabled = document.getElementById('devMode').checked;
        if (devModeEnabled) {
            config.devMode = true;
        }

        // Add featureFlags if any are enabled (same as manual mount)
        const useRubiksUI = document.getElementById('useRubiksUI').checked;
        if (useRubiksUI) {
            config.featureFlags = {
                useRubiksUI: true
            };
        }

        logStatus(`Auto-mounting with Environment: ${config.environment}, Country: ${config.countryCode}`);
        
        await initializeWidget(config);
        logStatus('Widget auto-mounted successfully after redirect', 'success');
        updateStatusIndicator('ready', 'Widget Mounted');
        
    } catch (error) {
        logStatus(`Auto-mount failed after redirect: ${error.message}`, 'error');
        console.error('Failed to auto-mount widget after redirect:', error);
        updateStatusIndicator('error', 'Auto-mount Failed');
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    logStatus('Payment Widget Test Suite loaded successfully', 'success', false);
    
    // Check if returning from payment redirect
    isReturningFromRedirect = detectRedirectReturn();
    
    // Load saved data from local storage
    const dataRestored = loadFromLocalStorage();
    if (!dataRestored) {
        logStatus('No saved data found, using defaults', 'info');
    }
    
    // Setup auto-save functionality
    setupAutoSave();
    
    // Setup translation management
    const addTranslationBtn = document.getElementById('addTranslationBtn');
    if (addTranslationBtn) {
        addTranslationBtn.addEventListener('click', () => {
            addTranslationPair();
        });
    }
    
    // Setup styling preset selector
    const stylingPresetSelect = document.getElementById('stylingPreset');
    if (stylingPresetSelect) {
        stylingPresetSelect.addEventListener('change', () => {
            const selectedPreset = stylingPresetSelect.value;
            if (selectedPreset) {
                applyStylePreset(selectedPreset);
            } else {
                clearStylePreset();
            }
        });
    }
    
    // Customer ID fields can now be used together (mutual exclusivity removed)
    const customerIdField = document.getElementById('customerId');
    const finionPayCustomerIdField = document.getElementById('finionPayCustomerId');
    
    // Ensure both fields are always enabled
    customerIdField.addEventListener('input', () => {
        finionPayCustomerIdField.disabled = false;
        finionPayCustomerIdField.classList.remove('bg-gray-100');
    });
    
    finionPayCustomerIdField.addEventListener('input', () => {
        customerIdField.disabled = false;
        customerIdField.classList.remove('bg-gray-100');
    });
    
    // Handle redirect return if detected
    if (isReturningFromRedirect) {
        // Wait a bit for all initialization to complete
        setTimeout(() => {
            handleRedirectReturn();
        }, 500);
    }
});