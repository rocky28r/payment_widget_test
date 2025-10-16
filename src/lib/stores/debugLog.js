import { writable } from 'svelte/store';

/**
 * Simple debug log store for tracking API calls, widget events, and errors
 */
function createDebugLogStore() {
	const { subscribe, update } = writable([]);

	return {
		subscribe,

		/**
		 * Add a log entry
		 * @param {string} type - 'request' | 'response' | 'widget' | 'error'
		 * @param {string} message - Short log message
		 * @param {object} data - Optional detailed data
		 */
		add: (type, message, data = null) => {
			update((logs) => {
				const entry = {
					id: crypto.randomUUID(),
					timestamp: new Date(),
					type,
					message,
					data
				};
				return [...logs, entry];
			});
		},

		/**
		 * Clear all logs
		 */
		clear: () => {
			update(() => []);
		}
	};
}

/**
 * Store for debug console expanded/collapsed state
 */
export const debugConsoleExpanded = writable(true);

export const debugLog = createDebugLogStore();
