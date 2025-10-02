/**
 * Shared Navigation Component
 * Creates a consistent navigation bar across all pages
 */

class Navigation {
    constructor(currentPage) {
        this.currentPage = currentPage;
        this.routes = [
            { path: 'index.html', label: 'Payment Widget Test', id: 'payment-test' },
            { path: 'contract-flow.html', label: 'Contract Flow', id: 'contract-flow' }
        ];
    }

    /**
     * Render the navigation HTML
     * @returns {string} Navigation HTML
     */
    render() {
        const navLinks = this.routes.map(route => {
            const isActive = route.id === this.currentPage;
            const classes = isActive
                ? 'px-4 py-2 rounded-md transition bg-blue-50 text-blue-600 font-semibold'
                : 'px-4 py-2 rounded-md transition hover:bg-blue-50 text-gray-700';

            return `<a href="${route.path}" class="${classes}">${route.label}</a>`;
        }).join('\n                        ');

        return `
        <nav class="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex items-center justify-between h-16">
                    <!-- Logo/Brand -->
                    <div class="flex items-center space-x-2">
                        <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
                        </svg>
                        <span class="text-lg font-semibold">Payment Test Bench</span>
                    </div>

                    <!-- Navigation Links -->
                    <div class="flex items-center space-x-4">
                        ${navLinks}

                        <!-- Global API Configuration Button -->
                        <button
                            id="globalConfigBtn"
                            class="px-3 py-2 rounded-md transition hover:bg-gray-100 text-gray-700 flex items-center space-x-1"
                            title="Global API Configuration"
                        >
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            </svg>
                            <span class="text-sm">Config</span>
                        </button>

                        ${this.currentPage === 'payment-test' ? `
                        <div class="ml-4 text-sm text-gray-500">
                            <span id="statusIndicator" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Ready
                            </span>
                        </div>` : ''}
                    </div>
                </div>
            </div>
        </nav>`;
    }

    /**
     * Render the global configuration modal
     * @returns {string} Modal HTML
     */
    renderConfigModal() {
        return `
        <!-- Global Configuration Modal -->
        <div id="globalConfigModal" class="hidden fixed inset-0 z-50 overflow-y-auto">
            <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <!-- Background overlay -->
                <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onclick="window.GlobalConfig.close()"></div>

                <!-- Modal panel -->
                <div class="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                    <div class="absolute top-0 right-0 pt-4 pr-4">
                        <button type="button" class="bg-white rounded-md text-gray-400 hover:text-gray-500" onclick="window.GlobalConfig.close()">
                            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div class="sm:flex sm:items-start">
                        <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                            <svg class="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            </svg>
                        </div>
                        <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                            <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
                                Global API Configuration
                            </h3>
                            <div class="mt-4 space-y-4">
                                <div>
                                    <label for="globalApiKey" class="block text-sm font-medium text-gray-700 mb-2">
                                        API Key <span class="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="password"
                                        id="globalApiKey"
                                        placeholder="Enter your API key"
                                        class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                    >
                                    <p class="mt-1 text-xs text-gray-500">Used for X-API-KEY header in all API requests</p>
                                </div>

                                <div>
                                    <label for="globalApiBaseUrl" class="block text-sm font-medium text-gray-700 mb-2">
                                        API Base URL
                                    </label>
                                    <input
                                        type="url"
                                        id="globalApiBaseUrl"
                                        placeholder="${API_CONFIG.baseUrl}"
                                        class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                    >
                                    <p class="mt-1 text-xs text-gray-500">Leave empty to use default: ${API_CONFIG.baseUrl}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                        <button type="button"
                            onclick="window.GlobalConfig.save()"
                            class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm">
                            Save Configuration
                        </button>
                        <button type="button"
                            onclick="window.GlobalConfig.close()"
                            class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
    }

    /**
     * Inject navigation into the page
     * @param {string} targetSelector - CSS selector for the target element (default: 'body')
     */
    inject(targetSelector = 'body') {
        const target = document.querySelector(targetSelector);
        if (!target) {
            console.error(`Navigation target "${targetSelector}" not found`);
            return;
        }

        // Insert navigation as first child
        target.insertAdjacentHTML('afterbegin', this.render());

        // Insert configuration modal
        target.insertAdjacentHTML('beforeend', this.renderConfigModal());

        // Setup event listener for config button
        setTimeout(() => {
            const configBtn = document.getElementById('globalConfigBtn');
            if (configBtn) {
                configBtn.addEventListener('click', () => window.GlobalConfig.open());
            }
        }, 0);
    }

    /**
     * Initialize navigation on page load
     * @param {string} currentPage - ID of the current page
     */
    static init(currentPage) {
        const nav = new Navigation(currentPage);
        nav.inject();
    }
}

/**
 * Global Configuration Manager
 * Handles global API configuration across all pages
 */
class GlobalConfig {
    static STORAGE_KEY = 'globalApiConfig';

    static load() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (error) {
            console.error('Failed to load global config:', error);
        }
        return { apiKey: '', apiBaseUrl: '' };
    }

    static save() {
        const apiKey = document.getElementById('globalApiKey').value.trim();
        const apiBaseUrl = document.getElementById('globalApiBaseUrl').value.trim();

        const config = { apiKey, apiBaseUrl };

        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));

            // Sync to page-specific fields if they exist
            this.syncToPageFields(config);

            this.close();

            // Show success notification if available
            if (typeof logStatus === 'function') {
                logStatus('Global configuration saved successfully', 'success');
            }
        } catch (error) {
            console.error('Failed to save global config:', error);
            alert('Failed to save configuration');
        }
    }

    static syncToPageFields(config) {
        // Sync to payment test page fields
        const apiKeyField = document.getElementById('apiKey');
        const apiBaseUrlField = document.getElementById('apiBaseUrl');

        if (apiKeyField && config.apiKey) {
            apiKeyField.value = config.apiKey;
        }

        if (apiBaseUrlField) {
            apiBaseUrlField.value = config.apiBaseUrl || API_CONFIG.baseUrl;
        }

        // Trigger change events to update any dependent logic
        if (apiKeyField) apiKeyField.dispatchEvent(new Event('input'));
        if (apiBaseUrlField) apiBaseUrlField.dispatchEvent(new Event('input'));

        // Sync to contract flow page APIClient if available
        if (typeof apiClient !== 'undefined' && config.apiKey) {
            const baseUrl = config.apiBaseUrl || API_CONFIG.baseUrl;
            apiClient.configure(baseUrl, config.apiKey);
            console.log('✓ APIClient configured with global settings');
        }
    }

    static open() {
        const modal = document.getElementById('globalConfigModal');
        if (modal) {
            // Load current config
            const config = this.load();
            document.getElementById('globalApiKey').value = config.apiKey || '';
            document.getElementById('globalApiBaseUrl').value = config.apiBaseUrl || '';

            modal.classList.remove('hidden');
        }
    }

    static close() {
        const modal = document.getElementById('globalConfigModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    static initialize() {
        // Load and sync config on page load
        const config = this.load();
        this.syncToPageFields(config);
    }
}

// Make GlobalConfig available globally
window.GlobalConfig = GlobalConfig;

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Navigation;
}
