<script>
	import { onMount } from 'svelte';
	import { contractFlowStore } from '$lib/stores/contractFlow.js';
	import StepIndicator from '$lib/components/contractFlow/StepIndicator.svelte';
	import Step1OfferSelection from '$lib/components/contractFlow/Step1OfferSelection.svelte';
	import Step2OfferDetails from '$lib/components/contractFlow/Step2OfferDetails.svelte';
	import Step3PersonalInfo from '$lib/components/contractFlow/Step3PersonalInfo.svelte';
	import Step4Payment from '$lib/components/contractFlow/Step4Payment.svelte';
	import Step5Confirmation from '$lib/components/contractFlow/Step5Confirmation.svelte';
	import ContractSummary from '$lib/components/contractFlow/ContractSummary.svelte';

	let currentStep = 1;
	let selectedOffer = null;
	let preview = null;

	$: currentStep = $contractFlowStore.currentStep;
	$: selectedOffer = $contractFlowStore.selectedOffer;
	$: preview = $contractFlowStore.preview;

	onMount(() => {
		// Reset flow on mount
		contractFlowStore.reset();
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
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<!-- Steps Column -->
			<div class="lg:col-span-2">
				<!-- Step 1: Offer Selection -->
				{#if currentStep === 1}
					<Step1OfferSelection />
				{/if}

				<!-- Step 2: Offer Details -->
				{#if currentStep === 2}
					<Step2OfferDetails />
				{/if}

				<!-- Step 3: Personal Information -->
				{#if currentStep === 3}
					<Step3PersonalInfo />
				{/if}

				<!-- Step 4: Payment -->
				{#if currentStep === 4}
					<Step4Payment />
				{/if}

				<!-- Step 5: Confirmation -->
				{#if currentStep === 5}
					<Step5Confirmation />
				{/if}
			</div>

			<!-- Summary Sidebar (visible from step 2 onwards) -->
			{#if currentStep >= 2 && selectedOffer}
				<div class="lg:col-span-1">
					<ContractSummary offer={selectedOffer} {preview} />
				</div>
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
