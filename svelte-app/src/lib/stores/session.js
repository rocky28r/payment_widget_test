import { writable } from 'svelte/store';
import { browser } from '$app/environment';

/**
 * Session state store
 */
function createSessionStore() {
	const initialState = {
		token: null,
		expiry: null,
		customerId: null
	};

	// Load from localStorage if in browser
	let stored = initialState;
	if (browser) {
		const item = localStorage.getItem('paymentSession');
		if (item) {
			try {
				stored = JSON.parse(item);
			} catch (e) {
				console.error('Failed to parse stored session:', e);
			}
		}
	}

	const { subscribe, set, update } = writable(stored);

	// Save to localStorage on changes
	if (browser) {
		subscribe((value) => {
			localStorage.setItem('paymentSession', JSON.stringify(value));
		});
	}

	return {
		subscribe,
		set,
		update,
		setToken: (token, expiry, customerId) => {
			update((s) => ({ ...s, token, expiry, customerId }));
		},
		clear: () => {
			set(initialState);
		},
		isValid: () => {
			let valid = false;
			const unsub = subscribe((s) => {
				valid = s.token && (!s.expiry || new Date() < new Date(s.expiry));
			});
			unsub();
			return valid;
		}
	};
}

export const sessionStore = createSessionStore();
