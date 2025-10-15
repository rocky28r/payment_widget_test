<script>
	import { onMount, onDestroy } from 'svelte';
	import { sessionStore } from '$lib/stores/session.js';
	import { widgetConfigStore } from '$lib/stores/widgetConfig.js';
	import { debugLog } from '$lib/stores/debugLog.js';
	import Card from '$lib/components/ui/Card.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';

	let widgetInstance = null;
	let container;
	let mounted = false;
	let currentToken = null;

	// Reactive statement: mount widget when session token changes
	$: if ($sessionStore.token && container) {
		// If token has changed, remount the widget
		if (currentToken !== $sessionStore.token) {
			currentToken = $sessionStore.token;
			mountWidget();
		}
	}

	async function mountWidget() {
		if (!container) return;

		// Check if paymentWidget is available
		if (typeof window.paymentWidget === 'undefined') {
			console.error('Payment widget library not loaded');
			debugLog.add('error', 'Payment widget library not loaded', {
				message: 'window.paymentWidget is undefined'
			});
			return;
		}

		// Unmount existing widget first
		if (widgetInstance) {
			try {
				await widgetInstance.destroy();
				debugLog.add('widget', 'Widget destroyed before remount', null);
			} catch (e) {
				console.error('Error destroying widget:', e);
			}
		}

		try {
			console.log('Mounting payment widget with token:', $sessionStore.token?.substring(0, 20));

			// Mount widget with global configuration
			const widgetConfig = widgetConfigStore.getWidgetConfig({
				userSessionToken: $sessionStore.token,
				container: container,
				onSuccess: (paymentRequestToken, paymentInstrumentDetails) => {
					console.log('Payment success!', paymentRequestToken);
					console.log('Payment details:', paymentInstrumentDetails);

					// Log success callback
					debugLog.add('widget', 'Payment success callback', {
						paymentRequestToken,
						paymentInstrumentDetails
					});

					alert(`Payment successful! Token: ${paymentRequestToken}`);
				},
				onError: (error) => {
					console.error('Payment error:', error);

					// Log error callback
					debugLog.add('error', 'Payment error callback', {
						message: error.message || 'Unknown error',
						error
					});

					alert(`Payment error: ${error.message || 'Unknown error'}`);
				}
			});

			// Log widget initialization
			debugLog.add('widget', 'Initializing payment widget', {
				config: {
					environment: widgetConfig.environment,
					countryCode: widgetConfig.countryCode,
					locale: widgetConfig.locale,
					userSessionToken: widgetConfig.userSessionToken?.substring(0, 20) + '...'
				}
			});

			widgetInstance = window.paymentWidget.init(widgetConfig);

			mounted = true;
			console.log('Payment widget mounted successfully');

			// Log successful mount
			debugLog.add('widget', 'Widget mounted successfully', null);
		} catch (error) {
			console.error('Failed to mount payment widget:', error);

			// Log mount error
			debugLog.add('error', 'Failed to mount widget', {
				message: error.message,
				stack: error.stack,
				error
			});

			mounted = false;
		}
	}

	onDestroy(() => {
		if (widgetInstance && widgetInstance.destroy) {
			try {
				const destroyResult = widgetInstance.destroy();
				// Only call .catch() if destroy() returns a Promise
				if (destroyResult && typeof destroyResult.catch === 'function') {
					destroyResult.catch((e) => console.error('Error destroying widget:', e));
				}
			} catch (e) {
				console.error('Error destroying widget:', e);
			}
		}
	});

	// Watch for token changes
	$: if (!$sessionStore.token) {
		mounted = false;
		currentToken = null;
	}
</script>

<Card title="Payment Widget">
	{#if !$sessionStore.token}
		<Alert type="info">
			<div class="flex items-center">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					class="stroke-current shrink-0 w-6 h-6 mr-2"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					></path>
				</svg>
				<span>Create a payment session first to mount the widget</span>
			</div>
		</Alert>
	{:else}
		<div bind:this={container} id="payment-widget-container" class="min-h-[400px]"></div>

		{#if $sessionStore.expiry}
			<div class="mt-4 text-sm text-gray-500">
				Token expires: {new Date($sessionStore.expiry).toLocaleString()}
			</div>
		{/if}
	{/if}
</Card>
