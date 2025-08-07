// DOM Elements
const createSessionBtn = document.getElementById('createSessionBtn');
const mountWidgetBtn = document.getElementById('mountWidgetBtn');
const clearLogsBtn = document.getElementById('clearLogsBtn');
const clearStorageBtn = document.getElementById('clearStorageBtn');
const statusLog = document.getElementById('status-log');
const debugModeCheckbox = document.getElementById('debugMode');
const manualTokenModeCheckbox = document.getElementById('manualTokenMode');
const userSessionTokenField = document.getElementById('userSessionToken');
let widgetContainer = document.getElementById('payment-widget-container');

// Session state
let currentSessionToken = null;
let sessionTokenExpiry = null;
let debugMode = false;
let widgetInstance = null;

// Local Storage Keys
const STORAGE_KEY = 'paymentWidgetTestSuite';
const STORAGE_VERSION = '1.0';

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
    
    if (formData.customerId && formData.finionPayCustomerId) {
        errors.push('Cannot specify both Customer ID and Finion Pay Customer ID');
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

function enableMountButton() {
    mountWidgetBtn.disabled = false;
    mountWidgetBtn.className = 'w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200';
}

function disableMountButton() {
    mountWidgetBtn.disabled = true;
    mountWidgetBtn.className = 'w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-400 cursor-not-allowed transition-colors duration-200';
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
            debugMode: document.getElementById('debugMode').checked,
            
            // Widget Configuration
            widgetAmount: document.getElementById('widgetAmount').value,
            currency: document.getElementById('currency').value,
            countryCode: document.getElementById('countryCode').value,
            environment: document.getElementById('environment').value,
            locale: document.getElementById('locale').value,
            manualTokenMode: document.getElementById('manualTokenMode').checked,
            
            // Session token (only if in manual mode)
            userSessionToken: document.getElementById('manualTokenMode').checked ? document.getElementById('userSessionToken').value : ''
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
        
        // Restore debug mode
        if (formData.debugMode !== undefined) {
            document.getElementById('debugMode').checked = formData.debugMode;
            debugMode = formData.debugMode;
        }
        
        // Restore Widget Configuration
        if (formData.widgetAmount) document.getElementById('widgetAmount').value = formData.widgetAmount;
        if (formData.currency) document.getElementById('currency').value = formData.currency;
        if (formData.countryCode) document.getElementById('countryCode').value = formData.countryCode;
        if (formData.environment) document.getElementById('environment').value = formData.environment;
        if (formData.locale) document.getElementById('locale').value = formData.locale;
        
        // Restore manual token mode and token
        if (formData.manualTokenMode !== undefined) {
            document.getElementById('manualTokenMode').checked = formData.manualTokenMode;
            // Trigger change event to update UI
            manualTokenModeCheckbox.dispatchEvent(new Event('change'));
            
            if (formData.manualTokenMode && formData.userSessionToken) {
                document.getElementById('userSessionToken').value = formData.userSessionToken;
                updateTokenUI(formData.userSessionToken, null, true);
            }
        }
        
        // Trigger mutual exclusivity for customer ID fields
        const customerIdField = document.getElementById('customerId');
        const finionPayCustomerIdField = document.getElementById('finionPayCustomerId');
        if (customerIdField.value.trim()) {
            finionPayCustomerIdField.disabled = true;
            finionPayCustomerIdField.classList.add('bg-gray-100');
        }
        if (finionPayCustomerIdField.value.trim()) {
            customerIdField.disabled = true;
            customerIdField.classList.add('bg-gray-100');
        }
        
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
    
    enableMountButton();
}

// API Functions
async function createPaymentSession(sessionData) {
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
    
    // Clear any widget-related cached data to prevent client_key issues
    try {
        logStatus('Clearing all browser storage to prevent cached client_key issues...', 'info');
        
        // Clear ALL localStorage (aggressive approach)
        const localStorageCount = localStorage.length;
        localStorage.clear();
        
        // Clear ALL sessionStorage (aggressive approach)
        const sessionStorageCount = sessionStorage.length;
        sessionStorage.clear();
        
        // Clear cookies that might be related to the widget
        document.cookie.split(";").forEach(cookie => {
            const eqPos = cookie.indexOf("=");
            const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
            if (name.includes('spa-payment') || name.includes('widget') || name.includes('client') || name.includes('payment')) {
                document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
                document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
            }
        });
        
        // Try to clear IndexedDB databases that might be widget-related
        if ('indexedDB' in window) {
            try {
                const dbs = await indexedDB.databases();
                for (const db of dbs) {
                    if (db.name && (db.name.includes('spa-payment') || db.name.includes('widget') || db.name.includes('payment'))) {
                        indexedDB.deleteDatabase(db.name);
                        logStatus(`Cleared IndexedDB: ${db.name}`, 'info');
                    }
                }
            } catch (idbError) {
                logStatus('Could not access IndexedDB', 'warn');
            }
        }
        
        logStatus(`Cleared ${localStorageCount + sessionStorageCount} storage items and widget cookies`, 'success');
        
        // Wait a moment for cleanup to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
    } catch (error) {
        logStatus(`Storage cleanup error: ${error.message}`, 'warn');
    }
    
    // Force reload the widget script to get a fresh instance
    logStatus('Reloading widget script to ensure fresh client_key...', 'info');
    
    try {
        // Remove existing script tag
        const existingScript = document.querySelector('script[src*="spa-payment-widget"]');
        if (existingScript) {
            existingScript.remove();
            // Clear the global paymentWidget object
            if (typeof paymentWidget !== 'undefined') {
                delete window.paymentWidget;
            }
        }
        
        // Add fresh script tag with cache-busting
        const script = document.createElement('script');
        script.src = `https://spa-payment-widget-tgg.s3.eu-west-1.amazonaws.com/spa-payment/widget.js?t=${Date.now()}`;
        script.onload = () => {
            logStatus('Widget script reloaded successfully', 'success');
            // Proceed with initialization after script loads
            setTimeout(() => initializeWidgetAfterReload(config), 100);
        };
        script.onerror = () => {
            logStatus('Failed to reload widget script', 'error');
        };
        document.head.appendChild(script);
        
        return; // Exit here, initialization continues in initializeWidgetAfterReload
        
    } catch (error) {
        logStatus(`Script reload error: ${error.message}`, 'warn');
    }
    
    // Fallback: continue with existing script
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

async function initializeWidgetAfterReload(config) {
    logStatus('Initializing payment widget with fresh script...');

    // Check if the paymentWidget global object exists
    if (typeof paymentWidget === 'undefined') {
        const errorMsg = 'Payment widget library not loaded after reload';
        logStatus(errorMsg, 'error');
        console.error("Payment widget library 'paymentWidget' is undefined after reload");
        return;
    }

    try {
        logStatus('Calling paymentWidget.init() with fresh instance...');
        
        // Debug log the config (excluding sensitive callbacks)
        logDebugInfo('Widget Configuration', {
            ...config,
            onSuccess: '[Function]',
            onError: '[Function]'
        });
        
        widgetInstance = paymentWidget.init(config);
        logStatus('Payment widget initialized successfully with fresh client_key!', 'success');
        console.log('Payment widget initialized successfully.');
    } catch (error) {
        const errorMsg = `Widget initialization failed: ${error.message || 'Unknown error'}`;
        logStatus(errorMsg, 'error');
        
        // Reset widget instance on error
        widgetInstance = null;
        
        console.error('Failed to initialize payment widget:', error);
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
        permittedPaymentChoices: Array.from(document.querySelectorAll('.payment-method-checkbox:checked')).map(cb => cb.value)
    };
    
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
        
    } catch (error) {
        logStatus(`Session creation failed: ${error.message}`, 'error');
        console.error('Failed to create payment session:', error);
        disableMountButton();
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

mountWidgetBtn.addEventListener('click', async () => {
    if (!currentSessionToken) {
        logStatus('No session token available. Create a payment session first.', 'error');
        return;
    }
    
    // Check if token is expired
    if (sessionTokenExpiry && new Date() > sessionTokenExpiry) {
        logStatus('Session token has expired. Please create a new payment session.', 'error');
        return;
    }
    
    // Validate required widget configuration
    const widgetAmount = parseInt(document.getElementById('widgetAmount').value, 10);
    if (isNaN(widgetAmount) || widgetAmount < 0) {
        logStatus('Invalid amount. Please enter a valid positive number.', 'error');
        return;
    }
    
    setButtonLoading(mountWidgetBtn, true, 'Mounting Widget...');
    
    try {
        // Collect widget configuration
        const config = {
            userSessionToken: currentSessionToken,
            environment: document.getElementById('environment').value,
            container: 'payment-widget-container',
            amount: parseInt(document.getElementById('widgetAmount').value, 10),
            currency: document.getElementById('currency').value,
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
        
        const isRemount = widgetInstance !== null;
        logStatus(`${isRemount ? 'Remounting' : 'Mounting'} payment widget with configuration...`);
        logStatus(`Environment: ${config.environment}, Amount: ${config.amount}, Currency: ${config.currency}, Country: ${config.countryCode}`);
        
        await initializeWidget(config);
        
    } catch (error) {
        logStatus(`Widget mounting failed: ${error.message}`, 'error');
        console.error('Failed to mount widget:', error);
    } finally {
        setButtonLoading(mountWidgetBtn, false);
        const buttonText = widgetInstance ? 'Remount Payment Widget' : 'Mount Payment Widget';
        mountWidgetBtn.innerHTML = `
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
            </svg>
            ${buttonText}
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
        'widgetAmount', 'currency', 'countryCode', 'environment', 'locale'
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
manualTokenModeCheckbox.addEventListener('change', () => {
    const isManual = manualTokenModeCheckbox.checked;
    
    if (isManual) {
        userSessionTokenField.readOnly = false;
        userSessionTokenField.classList.remove('bg-gray-50');
        userSessionTokenField.classList.add('bg-white');
        userSessionTokenField.placeholder = 'Enter your session token manually';
        logStatus('Manual token entry enabled', 'info');
    } else {
        userSessionTokenField.readOnly = true;
        userSessionTokenField.classList.add('bg-gray-50');
        userSessionTokenField.classList.remove('bg-white');
        userSessionTokenField.placeholder = 'Token will appear here after creating session';
        logStatus('Automatic token mode enabled', 'info');
    }
});

// Manual token input validation
userSessionTokenField.addEventListener('input', () => {
    if (manualTokenModeCheckbox.checked) {
        const token = userSessionTokenField.value.trim();
        if (token.length > 10) { // Basic validation
            updateTokenUI(token, null, true);
            logStatus('Manual token entered and validated', 'success');
        } else {
            disableMountButton();
            const tokenInfo = document.getElementById('tokenInfo');
            tokenInfo.classList.add('hidden');
        }
    }
});

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    logStatus('Payment Widget Test Suite loaded successfully', 'success', false);
    
    // Load saved data from local storage
    const dataRestored = loadFromLocalStorage();
    if (!dataRestored) {
        logStatus('No saved data found, using defaults', 'info');
    }
    
    // Setup auto-save functionality
    setupAutoSave();
    
    // Add mutual exclusivity for customer ID fields
    const customerIdField = document.getElementById('customerId');
    const finionPayCustomerIdField = document.getElementById('finionPayCustomerId');
    
    customerIdField.addEventListener('input', () => {
        if (customerIdField.value.trim()) {
            finionPayCustomerIdField.disabled = true;
            finionPayCustomerIdField.classList.add('bg-gray-100');
        } else {
            finionPayCustomerIdField.disabled = false;
            finionPayCustomerIdField.classList.remove('bg-gray-100');
        }
    });
    
    finionPayCustomerIdField.addEventListener('input', () => {
        if (finionPayCustomerIdField.value.trim()) {
            customerIdField.disabled = true;
            customerIdField.classList.add('bg-gray-100');
        } else {
            customerIdField.disabled = false;
            customerIdField.classList.remove('bg-gray-100');
        }
    });
});