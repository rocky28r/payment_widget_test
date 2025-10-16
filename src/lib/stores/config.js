import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

/**
 * Generate unique ID
 */
function generateId() {
	return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Migrate old config format to new profiles format
 */
function migrateConfig() {
	if (!browser) return null;

	const oldConfigKey = 'globalApiConfig';
	const newConfigKey = 'apiConfigProfiles';

	// Check if new format already exists
	const existingProfiles = localStorage.getItem(newConfigKey);
	if (existingProfiles) {
		return JSON.parse(existingProfiles);
	}

	// Check for old format
	const oldConfig = localStorage.getItem(oldConfigKey);
	if (oldConfig) {
		try {
			const parsed = JSON.parse(oldConfig);
			// Migrate to new format
			const migratedProfiles = {
				profiles: [
					{
						id: generateId(),
						name: 'Default',
						apiKey: parsed.apiKey || '',
						apiBaseUrl: parsed.apiBaseUrl || '',
						isActive: true,
						createdAt: Date.now()
					}
				]
			};
			localStorage.setItem(newConfigKey, JSON.stringify(migratedProfiles));
			return migratedProfiles;
		} catch (e) {
			console.error('Failed to migrate old config:', e);
		}
	}

	// No existing config, return default
	return {
		profiles: [
			{
				id: generateId(),
				name: 'Default',
				apiKey: '',
				apiBaseUrl: '',
				isActive: true,
				createdAt: Date.now()
			}
		]
	};
}

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
 * Profiles store
 */
export const profilesStore = persistentStore('apiConfigProfiles', migrateConfig());

/**
 * Derived store for active config (backward compatibility)
 */
export const configStore = derived(profilesStore, ($profiles) => {
	const activeProfile = $profiles?.profiles?.find((p) => p.isActive);
	return {
		apiKey: activeProfile?.apiKey || '',
		apiBaseUrl: activeProfile?.apiBaseUrl || ''
	};
});

/**
 * Update config (backward compatibility)
 */
export function updateConfig(updates) {
	profilesStore.update((current) => {
		const profiles = current.profiles.map((p) => {
			if (p.isActive) {
				return { ...p, ...updates };
			}
			return p;
		});
		return { ...current, profiles };
	});
}

/**
 * Set active profile
 */
export function setActiveProfile(profileId) {
	profilesStore.update((current) => {
		const profiles = current.profiles.map((p) => ({
			...p,
			isActive: p.id === profileId
		}));
		return { ...current, profiles };
	});
}

/**
 * Create new profile
 */
export function createProfile(name, apiKey, apiBaseUrl, setAsActive = true) {
	profilesStore.update((current) => {
		const newProfile = {
			id: generateId(),
			name,
			apiKey,
			apiBaseUrl,
			isActive: setAsActive,
			createdAt: Date.now()
		};

		let profiles = [...current.profiles, newProfile];

		// If setting as active, deactivate others
		if (setAsActive) {
			profiles = profiles.map((p) => ({
				...p,
				isActive: p.id === newProfile.id
			}));
		}

		return { ...current, profiles };
	});
}

/**
 * Update profile
 */
export function updateProfile(profileId, updates) {
	profilesStore.update((current) => {
		const profiles = current.profiles.map((p) => {
			if (p.id === profileId) {
				return { ...p, ...updates };
			}
			return p;
		});
		return { ...current, profiles };
	});
}

/**
 * Delete profile
 */
export function deleteProfile(profileId) {
	profilesStore.update((current) => {
		// Don't allow deletion if only one profile exists
		if (current.profiles.length <= 1) {
			console.warn('Cannot delete the last profile');
			return current;
		}

		const profiles = current.profiles.filter((p) => p.id !== profileId);

		// If deleted profile was active, activate the first one
		const wasActive = current.profiles.find((p) => p.id === profileId)?.isActive;
		if (wasActive && profiles.length > 0) {
			profiles[0].isActive = true;
		}

		return { ...current, profiles };
	});
}
