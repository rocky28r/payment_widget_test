<script>
	import { onMount, onDestroy } from 'svelte';
	import { contractFlowStore } from '$lib/stores/contractFlow.js';
	import { configStore } from '$lib/stores/config.js';
	import { widgetConfigStore } from '$lib/stores/widgetConfig.js';
	import { ContractFlowApi } from '$lib/api/contractFlow.js';
	import { debugLog } from '$lib/stores/debugLog.js';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';

	let recurringWidgetInstance = null;
	let upfrontWidgetInstance = null;
	let loading = false;
	let error = null;
	let recurringMounted = false;
	let upfrontMounted = false;
	let showUpfrontSection = false;
	let upfrontAmount = 0;

	let offer = $contractFlowStore.selectedOffer;
	$: preview = $contractFlowStore.preview;
	$: previewLoading = $contractFlowStore.previewLoading;

	let needsRecurring = true;
	let needsUpfront = false;

	onMount(async () => {
		// Check if preview exists before proceeding
		if (!preview && !previewLoading) {
			error = 'Contract preview is required. Please go back and complete Step 3.';
			console.error('No preview available in Step 4');
			return;
		}

		// Analyze payment requirements from preview
		analyzePaymentNeeds();

		// Wait for DOM to be ready
		await new Promise(resolve => setTimeout(resolve, 50));

		// Check if we have stored session tokens (from previous page load)
		const storedRecurringToken = $contractFlowStore.recurringSessionToken;
		const storedUpfrontToken = $contractFlowStore.upfrontSessionToken;
		const storedRecurringPaymentToken = $contractFlowStore.recurringPaymentToken;
		const storedUpfrontPaymentToken = $contractFlowStore.upfrontPaymentToken;

		// Mount appropriate widgets based on payment needs
		if (needsRecurring) {
			// Check if we have a stored recurring token to remount
			if (storedRecurringToken) {
				console.log('Remounting recurring widget from stored session');
				await remountRecurringWidget(storedRecurringToken);

				// If payment was already completed, mark as mounted
				if (storedRecurringPaymentToken) {
					console.log('Recurring payment already completed, marking as mounted');
					recurringMounted = true;
					checkUpfrontPayment();
				}
			} else {
				await mountRecurringWidget();
			}
		} else if (needsUpfront) {
			// Skip directly to upfront if no recurring needed
			// Calculate upfront amount and show section
			const dueOnSigning = preview.paymentPreview?.dueOnSigningAmount;
			upfrontAmount = dueOnSigning ? (typeof dueOnSigning === 'object' ? dueOnSigning.amount : dueOnSigning) : 0;
			showUpfrontSection = true;
			// Wait for DOM to render the upfront section
			await new Promise(resolve => setTimeout(resolve, 100));

			// Check if we have a stored upfront token to remount
			if (storedUpfrontToken) {
				console.log('Remounting upfront widget from stored session');
				await remountUpfrontWidget(storedUpfrontToken);

				// If payment was already completed, mark as mounted
				if (storedUpfrontPaymentToken) {
					console.log('Upfront payment already completed, marking as mounted');
					upfrontMounted = true;
				}
			} else {
				await mountUpfrontWidget();
			}
		} else {
			// No payments needed - skip to review
			console.log('No payments needed, skipping to review');
			contractFlowStore.nextStep();
		}
	});

	function analyzePaymentNeeds() {
		if (!preview) return;

		// Get payment amounts from preview
		const dueOnSigning = preview.paymentPreview?.dueOnSigningAmount;
		const totalContractVolume = preview.contractVolumeInformation?.totalContractVolume;

		const upfrontAmount = dueOnSigning ? (typeof dueOnSigning === 'object' ? dueOnSigning.amount : dueOnSigning) : 0;
		const totalAmount = totalContractVolume ? (typeof totalContractVolume === 'object' ? totalContractVolume.amount : totalContractVolume) : 0;

		console.log('Payment analysis:', {
			upfrontAmount,
			totalAmount,
			preview
		});

		// Scenario 1: Full payment upfront (totalContractVolume = dueOnSigningAmount)
		if (upfrontAmount > 0 && totalAmount > 0 && upfrontAmount === totalAmount) {
			needsRecurring = false;
			needsUpfront = true;
			console.log('Scenario: Full payment upfront - skipping recurring');
		}
		// Scenario 2: No upfront payment needed (dueOnSigningAmount = 0)
		else if (upfrontAmount === 0) {
			needsRecurring = true;
			needsUpfront = false;
			console.log('Scenario: No upfront payment - only recurring');
		}
		// Scenario 3: Both payments needed
		else if (upfrontAmount > 0) {
			needsRecurring = true;
			needsUpfront = true;
			console.log('Scenario: Both payments needed');
		}
		// Scenario 4: No payments (edge case)
		else {
			needsRecurring = false;
			needsUpfront = false;
			console.log('Scenario: No payments needed');
		}
	}

	onDestroy(() => {
		cleanupWidget(recurringWidgetInstance);
		cleanupWidget(upfrontWidgetInstance);
		recurringWidgetInstance = null;
		upfrontWidgetInstance = null;
	});

	function cleanupWidget(instance) {
		if (instance && typeof instance.destroy === 'function') {
			try {
				instance.destroy();
			} catch (err) {
				console.error('Error destroying widget:', err);
			}
		}
	}

	async function mountRecurringWidget() {
		loading = true;
		error = null;

		try {
			// Get container element by ID (stable reference)
			const containerEl = document.getElementById('recurring-payment-container');
			if (!containerEl) {
				throw new Error('Container element not found');
			}

			// Clear container to ensure clean mount
			containerEl.innerHTML = '';

			// Cleanup existing widget
			cleanupWidget(recurringWidgetInstance);
			recurringWidgetInstance = null;

			// Create payment session
			const api = new ContractFlowApi($configStore.apiBaseUrl, $configStore.apiKey);

			// Prepare payment choices - use offer's choices or fallback to defaults
			let permittedPaymentChoices = ['SEPA', 'BACS', 'CREDIT_CARD', 'CASH', 'BANK_TRANSFER'];
			if (offer.allowedPaymentChoices && offer.allowedPaymentChoices.length > 0) {
				permittedPaymentChoices = offer.allowedPaymentChoices;
			}

			const requestBody = {
				amount: 0, // Recurring payment
				scope: 'MEMBER_ACCOUNT',
				referenceText: 'Membership Contract Recurring Payment',
				permittedPaymentChoices: permittedPaymentChoices
			};

			const session = await api.createPaymentSession(requestBody);

			// Store session token for later remount
			contractFlowStore.setRecurringSessionToken(session.token);

			// Store Finion Pay customer ID for upfront payment session
			if (session.finionPayCustomerId) {
				contractFlowStore.setFinionPayCustomerId(session.finionPayCustomerId);
				console.log('Stored finionPayCustomerId:', session.finionPayCustomerId);
			}

			// Check if paymentWidget is available
			if (typeof window.paymentWidget === 'undefined') {
				throw new Error('Payment widget library not loaded');
			}

			console.log('Mounting recurring payment widget with token:', session.token?.substring(0, 20));
			debugLog.add('widget', 'Mounting recurring payment widget', {
				scope: 'MEMBER_ACCOUNT',
				amount: 0,
				tokenPreview: session.token?.substring(0, 20)
			});

			// Mount widget with global configuration
			const widgetConfig = widgetConfigStore.getWidgetConfig({
				userSessionToken: session.token,
				container: containerEl,
				onSuccess: (paymentRequestToken, paymentInstrumentDetails) => {
					console.log('Recurring payment successful:', paymentRequestToken);
					debugLog.add('widget', 'Recurring payment successful', {
						paymentRequestToken: paymentRequestToken?.substring(0, 20),
						paymentInstrumentDetails
					});

					if (paymentInstrumentDetails) {
						console.log('Payment instrument details:', paymentInstrumentDetails);
					}
					contractFlowStore.setRecurringPaymentToken(paymentRequestToken);
					recurringMounted = true;

					// Check if we need upfront payment
					checkUpfrontPayment();
				},
				onError: (err) => {
					console.error('Recurring payment error:', err);
					debugLog.add('error', 'Recurring payment widget error', {
						error: err.message || err,
						scope: 'MEMBER_ACCOUNT'
					});
					error = err.message || 'Payment failed';
					recurringMounted = false;
				}
			});

			recurringWidgetInstance = window.paymentWidget.init(widgetConfig);

			console.log('Recurring payment widget mounted successfully');
			debugLog.add('widget', 'Recurring payment widget mounted', { scope: 'MEMBER_ACCOUNT' });
		} catch (err) {
			error = err.message;
			console.error('Failed to mount recurring widget:', err);
			recurringMounted = false;
		} finally {
			loading = false;
		}
	}

	function checkUpfrontPayment() {
		// Only check if we determined upfront payment is needed
		if (!needsUpfront) {
			console.log('Upfront payment not needed, skipping');
			return;
		}

		// Check if offer has upfront payment requirement
		// First check preview API if available
		const preview = $contractFlowStore.preview;

		if (preview) {
			// Use paymentPreview.dueOnSigningAmount.amount as the primary source
			const dueOnSigning = preview.paymentPreview?.dueOnSigningAmount;
			let upfrontAmountFromPreview = 0;

			if (dueOnSigning) {
				// Extract amount - handle both object {amount: X, currency: Y} and primitive formats
				upfrontAmountFromPreview = typeof dueOnSigning === 'object'
					? (dueOnSigning.amount || 0)
					: dueOnSigning;
			}

			console.log('Upfront payment check from preview:', {
				dueOnSigning,
				upfrontAmountFromPreview,
				preview
			});

			if (upfrontAmountFromPreview && upfrontAmountFromPreview > 0 && !isNaN(upfrontAmountFromPreview)) {
				// Show upfront payment section
				upfrontAmount = upfrontAmountFromPreview;
				showUpfrontSection = true;
				console.log('Upfront payment required from preview:', upfrontAmount);
				// Auto-mount upfront widget
				setTimeout(() => mountUpfrontWidget(), 500);
				return;
			}
		}

		// Fallback: Check offer flatFees for starterPackage
		const term = offer?.terms?.[0];
		console.log('Checking flatFees:', term?.flatFees);

		if (term?.flatFees && term.flatFees.length > 0) {
			let totalUpfront = 0;
			let hasStarterPackage = false;

			term.flatFees.forEach(fee => {
				if (fee.starterPackage) {
					hasStarterPackage = true;
					const feeAmount = fee.paymentFrequency?.price?.amount || 0;
					totalUpfront += feeAmount;
				}
			});

			// If offer has starterPackage, show upfront widget (even if amount is 0)
			// because API may require initialPaymentRequestToken
			if (hasStarterPackage) {
				upfrontAmount = totalUpfront;
				showUpfrontSection = true;
				console.log('Upfront payment required from flatFees (starterPackage):', upfrontAmount);
				// Auto-mount upfront widget
				setTimeout(() => mountUpfrontWidget(), 500);
			} else {
				console.log('No upfront payment needed');
			}
		} else {
			console.log('No flatFees found, no upfront payment needed');
		}
	}

	async function mountUpfrontWidget() {
		if (upfrontMounted) return;

		try {
			const containerEl = document.getElementById('upfront-payment-container');
			if (!containerEl) {
				console.error('Upfront container not found');
				return;
			}

			containerEl.innerHTML = '';
			cleanupWidget(upfrontWidgetInstance);
			upfrontWidgetInstance = null;

			const api = new ContractFlowApi($configStore.apiBaseUrl, $configStore.apiKey);

			// For upfront payments, use ECOM scope and one-time payment methods only
			const requestBody = {
				amount: upfrontAmount,
				scope: 'ECOM',
				referenceText: 'Membership Setup Fee',
				permittedPaymentChoices: ['CREDIT_CARD', 'PAYPAL', 'TWINT', 'IDEAL', 'BANCONTACT']
			};

			// Include finionPayCustomerId if available (from recurring payment)
			const storedCustomerId = $contractFlowStore.finionPayCustomerId;
			if (storedCustomerId) {
				requestBody.finionPayCustomerId = storedCustomerId;
				console.log('Using stored finionPayCustomerId for upfront payment:', storedCustomerId);
			}

			const session = await api.createPaymentSession(requestBody);

			// If this is the first payment session (no stored customer ID), store it now
			if (!storedCustomerId && session.finionPayCustomerId) {
				contractFlowStore.setFinionPayCustomerId(session.finionPayCustomerId);
				console.log('Stored finionPayCustomerId from upfront payment:', session.finionPayCustomerId);
			}

			// Store session token for later remount
			contractFlowStore.setUpfrontSessionToken(session.token);

			if (typeof window.paymentWidget === 'undefined') {
				throw new Error('Payment widget library not loaded');
			}

			console.log('Mounting upfront payment widget');
			debugLog.add('widget', 'Mounting upfront payment widget', {
				scope: 'ECOM',
				amount: upfrontAmount,
				tokenPreview: session.token?.substring(0, 20)
			});

			// Mount widget with global configuration
			const widgetConfig = widgetConfigStore.getWidgetConfig({
				userSessionToken: session.token,
				container: containerEl,
				onSuccess: (paymentRequestToken, paymentInstrumentDetails) => {
					console.log('Upfront payment successful:', paymentRequestToken);
					debugLog.add('widget', 'Upfront payment successful', {
						paymentRequestToken: paymentRequestToken?.substring(0, 20),
						paymentInstrumentDetails,
						amount: upfrontAmount
					});
					contractFlowStore.setUpfrontPaymentToken(paymentRequestToken);
					upfrontMounted = true;
				},
				onError: (err) => {
					console.error('Upfront payment error:', err);
					debugLog.add('error', 'Upfront payment widget error', {
						error: err.message || err,
						scope: 'ECOM',
						amount: upfrontAmount
					});
					error = err.message || 'Upfront payment failed';
				}
			});

			upfrontWidgetInstance = window.paymentWidget.init(widgetConfig);

			console.log('Upfront payment widget mounted successfully');
			debugLog.add('widget', 'Upfront payment widget mounted', {
				scope: 'ECOM',
				amount: upfrontAmount
			});
		} catch (err) {
			console.error('Failed to mount upfront widget:', err);
			error = err.message;
		}
	}

	function handleContinue() {
		// Navigate to review step
		contractFlowStore.nextStep();
	}

	function handleBack() {
		// Go directly to step 2 (Details) since step 3 (Personal Info) is now merged into step 2
		contractFlowStore.goToStep(2);
	}

	// Remount recurring widget from stored session token
	async function remountRecurringWidget(token) {
		const containerEl = document.getElementById('recurring-payment-container');
		if (!containerEl) throw new Error('Container element not found');

		containerEl.innerHTML = '';
		cleanupWidget(recurringWidgetInstance);
		recurringWidgetInstance = null;

		const widgetConfig = widgetConfigStore.getWidgetConfig({
			userSessionToken: token,
			container: containerEl,
			onSuccess: (paymentRequestToken, paymentInstrumentDetails) => {
				console.log('Recurring payment successful:', paymentRequestToken);
				contractFlowStore.setRecurringPaymentToken(paymentRequestToken);
				recurringMounted = true;
				checkUpfrontPayment();
			},
			onError: (err) => {
				console.error('Recurring payment error:', err);
				error = err.message || 'Payment failed';
				recurringMounted = false;
			}
		});

		recurringWidgetInstance = window.paymentWidget.init(widgetConfig);
		console.log('Recurring widget remounted from session');
	}

	// Remount upfront widget from stored session token
	async function remountUpfrontWidget(token) {
		const containerEl = document.getElementById('upfront-payment-container');
		if (!containerEl) return;

		containerEl.innerHTML = '';
		cleanupWidget(upfrontWidgetInstance);
		upfrontWidgetInstance = null;

		const widgetConfig = widgetConfigStore.getWidgetConfig({
			userSessionToken: token,
			container: containerEl,
			onSuccess: (paymentRequestToken, paymentInstrumentDetails) => {
				console.log('Upfront payment successful:', paymentRequestToken);
				contractFlowStore.setUpfrontPaymentToken(paymentRequestToken);
				upfrontMounted = true;
			},
			onError: (err) => {
				console.error('Upfront payment error:', err);
				error = err.message || 'Upfront payment failed';
			}
		});

		upfrontWidgetInstance = window.paymentWidget.init(widgetConfig);
		console.log('Upfront widget remounted from session');
	}

	// Check if we can continue - updated to handle skipped sections
	$: canContinue = (() => {
		if (needsRecurring && needsUpfront) {
			// Both payments needed
			return recurringMounted && upfrontMounted;
		} else if (needsRecurring && !needsUpfront) {
			// Only recurring needed
			return recurringMounted;
		} else if (!needsRecurring && needsUpfront) {
			// Only upfront needed
			return upfrontMounted;
		} else {
			// No payments needed - should have auto-skipped
			return true;
		}
	})();
</script>

<div class="screen">
	<Card title="Payment Setup">
		<p class="text-gray-600 mb-6">
			Set up your payment methods for your membership.
		</p>

		{#if error}
			<Alert type="error" class="mb-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="font-semibold mb-1">Error</p>
						<p>{error}</p>
					</div>
					{#if !preview}
						<Button variant="secondary" size="sm" on:click={handleBack}>
							← Go Back
						</Button>
					{/if}
				</div>
			</Alert>
		{/if}

		<!-- Recurring Payment Section - Only shown if needed -->
		{#if needsRecurring}
		<div class="bg-base-200 rounded-lg p-6 mb-6">
			<div class="flex items-center justify-between mb-4">
				<div>
					<h3 class="text-xl font-bold">{needsUpfront ? 'Step 1: ' : ''}Recurring Payment Method</h3>
					<p class="text-sm text-gray-600 mt-1">Set up payment for your monthly membership fees</p>
				</div>
				{#if recurringMounted}
					<div class="badge badge-success gap-2">
						<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block w-4 h-4 stroke-current"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
						Complete
					</div>
				{/if}
			</div>

			{#if loading && !recurringMounted}
				<div class="text-center py-8">
					<div class="loading loading-spinner loading-lg text-primary"></div>
					<p class="mt-4 text-gray-600">Loading payment options...</p>
				</div>
			{/if}

			<!-- Container always rendered (not conditional) -->
			<div id="recurring-payment-container" class="min-h-[400px]" class:hidden={loading && !recurringMounted}></div>

			{#if recurringMounted}
				<div class="alert alert-success mt-4">
					<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
					<span>Recurring payment method saved!</span>
				</div>
			{/if}
		</div>
		{/if}

		<!-- Upfront Payment Section - Only shown if needed -->
		{#if needsUpfront && showUpfrontSection}
			<div class="bg-base-200 rounded-lg p-6 mb-6">
				<div class="flex items-center justify-between mb-4">
					<div>
						<h3 class="text-xl font-bold">{needsRecurring ? 'Step 2: ' : ''}Upfront Payment</h3>
						<p class="text-sm text-gray-600 mt-1">
							Pay <span class="font-semibold">{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(upfrontAmount)}</span> today
						</p>
					</div>
					{#if upfrontMounted}
						<div class="badge badge-success gap-2">
							<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block w-4 h-4 stroke-current"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
							Complete
						</div>
					{/if}
				</div>

				<div id="upfront-payment-container" class="min-h-[400px]"></div>

				{#if upfrontMounted}
					<div class="alert alert-success mt-4">
						<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
						<span>Payment completed successfully!</span>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Navigation -->
		<div class="flex justify-between mt-6 pt-6 border-t">
			<Button variant="secondary" on:click={handleBack} disabled={loading}>← Back</Button>
			<Button
				variant="primary"
				on:click={handleContinue}
				disabled={!canContinue || loading}
			>
				Continue to Review →
			</Button>
		</div>
	</Card>
</div>
