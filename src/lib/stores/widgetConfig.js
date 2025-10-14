import { writable } from 'svelte/store';

// Styling presets
export const STYLING_PRESETS = {
	default: {
		name: 'Default',
		colors: {
			primaryColor: '#007bff',
			secondaryColor: '#f8f9fa',
			textColorMain: '#333333',
			textColorSecondary: '#6c757d',
			borderColor: '#dee2e6',
			borderRadius: '4px',
			boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
		}
	},
	magicline: {
		name: 'Magicline',
		colors: {
			primaryColor: '#00ADE2',
			secondaryColor: '#F1FCFF',
			textColorMain: '#58666E',
			textColorSecondary: '#94999D',
			borderColor: '#DEE5E7',
			borderRadius: '0px',
			boxShadow: 'none'
		}
	},
	mysports: {
		name: 'MySports',
		colors: {
			primaryColor: '#1A3294',
			secondaryColor: '#E8EAF4',
			textColorMain: '#131313',
			textColorSecondary: '#5F5E5E',
			borderColor: '#DFDFDF',
			borderRadius: '8px',
			boxShadow: '0 8px 16px 0 rgba(0, 0, 0, 0.08)'
		}
	}
};

// Default widget configuration
const DEFAULT_CONFIG = {
	// Base settings
	environment: 'sandbox',
	countryCode: 'DE',
	locale: 'en',

	// Styling preset
	selectedPreset: 'default',

	// Custom styling (when not using preset)
	customStyling: {
		primaryColor: '#007bff',
		secondaryColor: '#f8f9fa',
		textColorMain: '#333333',
		textColorSecondary: '#6c757d',
		borderColor: '#dee2e6',
		borderRadius: '4px',
		boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
	},

	// Feature flags
	featureFlags: {
		useRubiksUI: false
	},

	// Development mode
	devMode: false,

	// Custom i18n overrides (optional)
	i18nOverrides: {}
};

// Load configuration from localStorage
function loadConfig() {
	if (typeof window === 'undefined') return DEFAULT_CONFIG;

	try {
		const stored = localStorage.getItem('widgetConfig');
		if (stored) {
			const parsed = JSON.parse(stored);
			// Merge with defaults to ensure all fields exist
			return {
				...DEFAULT_CONFIG,
				...parsed,
				customStyling: {
					...DEFAULT_CONFIG.customStyling,
					...parsed.customStyling
				},
				featureFlags: {
					...DEFAULT_CONFIG.featureFlags,
					...parsed.featureFlags
				}
			};
		}
	} catch (error) {
		console.error('Failed to load widget config from localStorage:', error);
	}

	return DEFAULT_CONFIG;
}

// Save configuration to localStorage
function saveConfig(config) {
	if (typeof window === 'undefined') return;

	try {
		localStorage.setItem('widgetConfig', JSON.stringify(config));
	} catch (error) {
		console.error('Failed to save widget config to localStorage:', error);
	}
}

// Create the store
function createWidgetConfigStore() {
	const { subscribe, set, update } = writable(loadConfig());

	return {
		subscribe,

		// Update environment
		setEnvironment: (environment) => update(config => {
			const updated = { ...config, environment };
			saveConfig(updated);
			return updated;
		}),

		// Update country code
		setCountryCode: (countryCode) => update(config => {
			const updated = { ...config, countryCode };
			saveConfig(updated);
			return updated;
		}),

		// Update locale
		setLocale: (locale) => update(config => {
			const updated = { ...config, locale };
			saveConfig(updated);
			return updated;
		}),

		// Select styling preset
		setPreset: (presetKey) => update(config => {
			const preset = STYLING_PRESETS[presetKey];
			if (!preset) return config;

			const updated = {
				...config,
				selectedPreset: presetKey,
				// Update custom styling to match preset
				customStyling: { ...preset.colors }
			};
			saveConfig(updated);
			return updated;
		}),

		// Update custom styling
		updateStyling: (styling) => update(config => {
			const updated = {
				...config,
				selectedPreset: 'custom',
				customStyling: {
					...config.customStyling,
					...styling
				}
			};
			saveConfig(updated);
			return updated;
		}),

		// Update feature flags
		setFeatureFlag: (flag, value) => update(config => {
			const updated = {
				...config,
				featureFlags: {
					...config.featureFlags,
					[flag]: value
				}
			};
			saveConfig(updated);
			return updated;
		}),

		// Update dev mode
		setDevMode: (devMode) => update(config => {
			const updated = { ...config, devMode };
			saveConfig(updated);
			return updated;
		}),

		// Update i18n overrides
		updateI18n: (overrides) => update(config => {
			const updated = {
				...config,
				i18nOverrides: {
					...config.i18nOverrides,
					...overrides
				}
			};
			saveConfig(updated);
			return updated;
		}),

		// Reset to defaults
		reset: () => {
			saveConfig(DEFAULT_CONFIG);
			set(DEFAULT_CONFIG);
		},

		// Get widget initialization config (formatted for paymentWidget.init())
		getWidgetConfig: (baseConfig) => {
			let config = loadConfig();

			// Get current styling based on preset
			let styling = config.customStyling;
			if (config.selectedPreset !== 'custom' && STYLING_PRESETS[config.selectedPreset]) {
				styling = STYLING_PRESETS[config.selectedPreset].colors;
			}

			// Build widget config
			const widgetConfig = {
				...baseConfig, // Contains userSessionToken, container, onSuccess, onError
				environment: config.environment,
				countryCode: config.countryCode,
				locale: config.locale,
				styling: styling,
				devMode: config.devMode
			};

			// Add feature flags if any are set
			if (Object.keys(config.featureFlags).length > 0) {
				widgetConfig.featureFlags = config.featureFlags;
			}

			// Add i18n overrides if any are set
			if (Object.keys(config.i18nOverrides).length > 0) {
				widgetConfig.i18n = config.i18nOverrides;
			}

			return widgetConfig;
		}
	};
}

export const widgetConfigStore = createWidgetConfigStore();

// Available options for dropdowns
export const ENVIRONMENTS = ['test', 'sandbox', 'live'];

export const COUNTRIES = [
	{ code: 'DE', name: 'Germany' },
	{ code: 'US', name: 'United States' },
	{ code: 'GB', name: 'United Kingdom' },
	{ code: 'CH', name: 'Switzerland' },
	{ code: 'FR', name: 'France' },
	{ code: 'IT', name: 'Italy' },
	{ code: 'ES', name: 'Spain' },
	{ code: 'NL', name: 'Netherlands' },
	{ code: 'BE', name: 'Belgium' },
	{ code: 'AT', name: 'Austria' }
];

export const LOCALES = [
	{ code: 'en', name: 'English' },
	{ code: 'en-US', name: 'English (US)' },
	{ code: 'en-GB', name: 'English (UK)' },
	{ code: 'de', name: 'German' },
	{ code: 'de-DE', name: 'German (Germany)' },
	{ code: 'fr', name: 'French' },
	{ code: 'fr-FR', name: 'French (France)' },
	{ code: 'it', name: 'Italian' },
	{ code: 'it-IT', name: 'Italian (Italy)' },
	{ code: 'es', name: 'Spanish' },
	{ code: 'es-ES', name: 'Spanish (Spain)' },
	{ code: 'nl', name: 'Dutch' },
	{ code: 'nl-NL', name: 'Dutch (Netherlands)' }
];
