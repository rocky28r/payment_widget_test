<script>
	import { onMount, onDestroy } from 'svelte';
	import { contractFlowStore } from '$lib/stores/contractFlow.js';
	import { configStore } from '$lib/stores/config.js';
	import { ContractFlowApi } from '$lib/api/contractFlow.js';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';

	let widgetContainer;
	let widgetInstance = null;
	let loading = false;
	let error = null;
	let mounted = false;

	let offer = $contractFlowStore.selectedOffer;
	let preview = $contractFlowStore.preview;

	onMount(async () => {
		// Wait a tick to ensure DOM is ready
		await new Promise(resolve => setTimeout(resolve, 100));
		if (widgetContainer && !mounted) {
			mountPaymentWidget();
		}
	});

	onDestroy(() => {
		if (widgetInstance) {
			try {
				widgetInstance.destroy();
			} catch (err) {
				console.error('Error destroying widget:', err);
			}
			widgetInstance = null;
		}
		mounted = false;
	});

	async function mountPaymentWidget() {
		if (mounted || !widgetContainer) return;

		loading = true;
		error = null;

		try {
			// Unmount existing widget first
			if (widgetInstance) {
				try {
					await widgetInstance.destroy();
				} catch (e) {
					console.error('Error destroying previous widget:', e);
				}
				widgetInstance = null;
			}

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
				referenceText: 'Membership Contract Payment',
				permittedPaymentChoices: permittedPaymentChoices
			};

			const session = await api.createPaymentSession(requestBody);

			// Check if paymentWidget is available
			if (typeof window.paymentWidget === 'undefined') {
				throw new Error('Payment widget library not loaded');
			}

			console.log('Mounting payment widget with token:', session.token?.substring(0, 20));

			widgetInstance = window.paymentWidget.init({
				userSessionToken: session.token,
				container: widgetContainer,
				environment: 'sandbox',
				countryCode: 'DE',
				locale: 'en',
				onSuccess: (paymentRequestToken) => {
					console.log('Payment successful:', paymentRequestToken);
					contractFlowStore.setRecurringPaymentToken(paymentRequestToken);
					handleSubmitContract();
				},
				onError: (err) => {
					console.error('Payment error:', err);
					error = err.message || 'Payment failed';
				}
			});

			mounted = true;
			console.log('Payment widget mounted successfully');
		} catch (err) {
			error = err.message;
			console.error('Failed to mount widget:', err);
			mounted = false;
		} finally {
			loading = false;
		}
	}

	async function handleSubmitContract() {
		loading = true;
		error = null;

		try {
			const api = new ContractFlowApi($configStore.apiBaseUrl, $configStore.apiKey);

			const contractData = {
				...$contractFlowStore.personalInfo,
				recurringPaymentToken: $contractFlowStore.recurringPaymentToken
			};

			const contract = await api.createContract($contractFlowStore.selectedOfferId, contractData);

			contractFlowStore.setContract(contract.id, contract.contractNumber);
			contractFlowStore.nextStep();
		} catch (err) {
			error = err.message;
			console.error('Failed to create contract:', err);
		} finally {
			loading = false;
		}
	}

	function handleBack() {
		contractFlowStore.previousStep();
	}
</script>

<div class="screen">
	<Card title="Payment Setup">
		<p class="text-gray-600 mb-6">
			Please select your recurring payment method for your membership fees.
		</p>

		{#if error}
			<Alert type="error">{error}</Alert>
		{/if}

		{#if loading && !mounted}
			<div class="text-center py-8">
				<div class="loading loading-spinner loading-lg text-primary"></div>
				<p class="mt-4 text-gray-600">Loading payment widget...</p>
			</div>
		{:else}
			<div bind:this={widgetContainer} id="contract-flow-payment-widget" class="min-h-[400px]"></div>
		{/if}

		<div class="mt-6 pt-6 border-t">
			<Button variant="secondary" on:click={handleBack}>← Back</Button>
		</div>
	</Card>
</div>
