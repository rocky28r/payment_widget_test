<script>
	import { onMount } from 'svelte';
	import { contractFlowStore } from '$lib/stores/contractFlow.js';
	import { configStore } from '$lib/stores/config.js';
	import { ContractFlowApi } from '$lib/api/contractFlow.js';
	import StepIndicator from '$lib/components/contractFlow/StepIndicator.svelte';
	import Step1OfferSelection from '$lib/components/contractFlow/Step1OfferSelection.svelte';
	import Step2OfferDetails from '$lib/components/contractFlow/Step2OfferDetails.svelte';
	import Step4Payment from '$lib/components/contractFlow/Step4Payment.svelte';
	import Step5Review from '$lib/components/contractFlow/Step5Review.svelte';
	import Step6Confirmation from '$lib/components/contractFlow/Step6Confirmation.svelte';

	let currentStep = 1;
	let selectedOffer = null;
	let preview = null;

	$: currentStep = $contractFlowStore.currentStep;
	$: selectedOffer = $contractFlowStore.selectedOffer;
	$: preview = $contractFlowStore.preview;

	onMount(async () => {
		const currentState = $contractFlowStore;

		// If we have a session, restore missing data
		if (currentState.selectedOfferId && !currentState.selectedOffer) {
			// Refetch offer by ID (in case it was lost)
			try {
				const api = new ContractFlowApi($configStore.apiBaseUrl, $configStore.apiKey);
				const offer = await api.getMembershipOffer(currentState.selectedOfferId);
				contractFlowStore.selectOffer(currentState.selectedOfferId, offer);
				console.log('Offer restored');
			} catch (error) {
				console.error('Failed to restore offer:', error);
				contractFlowStore.reset();
			}
		}

		// If we're past step 3 and missing preview, rebuild it
		if (currentState.currentStep >= 3 && currentState.selectedTermId && !currentState.preview) {
			try {
				const api = new ContractFlowApi($configStore.apiBaseUrl, $configStore.apiKey);
				const termId = currentState.selectedTermId;
				if (termId) {
					const previewData = {
						contractOfferTermId: termId,
						startDate: currentState.personalInfo.startDate || currentState.customStartDate,
						voucherCode: currentState.personalInfo.voucherCode || undefined
					};
					const preview = await api.createContractPreview(previewData);
					contractFlowStore.setPreview(preview);
					console.log('Preview restored');
				}
			} catch (error) {
				console.error('Failed to restore preview:', error);
			}
		}

		console.log(`Session restored at step ${currentState.currentStep}`);
	});
</script>

<svelte:head>
	<title>Membership Signup - Svelte</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<div class="bg-white border-b">
		<div class="container mx-auto px-4 py-6">
			<h1 class="text-3xl font-bold text-gray-900">Membership Signup</h1>
			<p class="text-gray-600 mt-1">Complete your membership registration in just a few steps</p>
		</div>
	</div>

	<!-- Step Indicator -->
	<div class="bg-white border-b">
		<div class="container mx-auto px-4 py-4">
			<StepIndicator {currentStep} />
		</div>
	</div>

	<!-- Main Content -->
	<div class="container mx-auto px-4 py-8">
		<div class="max-w-6xl mx-auto">
			<!-- Step 1: Offer Selection -->
			{#if currentStep === 1}
				<Step1OfferSelection />
			{/if}

			<!-- Step 2: Offer Details & Personal Info (Combined) -->
			{#if currentStep === 2}
				<Step2OfferDetails />
			{/if}

			<!-- Step 3: Payment (was Step 4) -->
			{#if currentStep === 3 || currentStep === 4}
				<Step4Payment />
			{/if}

			<!-- Step 4: Review & Confirm (was Step 5) -->
			{#if currentStep === 5}
				<Step5Review />
			{/if}

			<!-- Step 5: Confirmation (was Step 6) -->
			{#if currentStep === 6}
				<Step6Confirmation />
			{/if}
		</div>
	</div>
</div>

<style>
	/* Screen transitions */
	:global(.screen) {
		animation: fadeIn 0.3s ease-in;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
