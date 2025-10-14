import { writable } from 'svelte/store';
import { browser } from '$app/environment';

/**
 * Create a persistent store that syncs with localStorage
 */
function persistentStore(key, initialValue) {
	// Load from localStorage if in browser
	let stored = initialValue;
	if (browser) {
		const item = localStorage.getItem(key);
		if (item) {
			try {
				stored = JSON.parse(item);
			} catch (e) {
				console.error(`Failed to parse stored value for ${key}:`, e);
			}
		}
	}

	const store = writable(stored);

	// Subscribe and save to localStorage
	if (browser) {
		store.subscribe((value) => {
			localStorage.setItem(key, JSON.stringify(value));
		});
	}

	return store;
}

/**
 * Global configuration store
 */
export const configStore = persistentStore('globalApiConfig', {
	apiKey: '',
	apiBaseUrl: 'https://api.dev.payment.sportalliance.com'
});

/**
 * Update config
 */
export function updateConfig(updates) {
	configStore.update((current) => ({
		...current,
		...updates
	}));
}
