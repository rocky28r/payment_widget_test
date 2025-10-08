<script>
	import { onMount } from 'svelte';
	import { contractFlowStore } from '$lib/stores/contractFlow.js';
	import { configStore } from '$lib/stores/config.js';
	import { ContractFlowApi } from '$lib/api/contractFlow.js';
	import { formatCurrencyDecimal, formatDuration, parsePaymentFrequency } from '$lib/utils/format.js';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';

	let offer = null;
	let loading = false;

	$: offer = $contractFlowStore.selectedOffer;
	$: term = offer?.terms?.[0];

	onMount(async () => {
		if (!offer) {
			contractFlowStore.goToStep(1);
		}
	});

	function handleNext() {
		contractFlowStore.nextStep();
	}

	function handleBack() {
		contractFlowStore.previousStep();
	}
</script>

<div class="screen">
	<Card title="Membership Details">
		{#if offer && term}
			<!-- Hero Summary Card -->
			<div class="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white mb-6">
				<h2 class="text-2xl font-bold mb-2">{offer.name}</h2>
				{#if term.paymentFrequency}
					<div class="flex items-baseline">
						<span class="text-4xl font-bold">
							{formatCurrencyDecimal(term.paymentFrequency.price)}
						</span>
						<span class="text-xl ml-2">
							{parsePaymentFrequency(term.paymentFrequency.paymentFrequency)}
						</span>
					</div>
				{/if}

				{#if term.contractVolumeInformation?.totalContractVolume}
					<p class="mt-4 text-blue-100">
						Total: {formatCurrencyDecimal(term.contractVolumeInformation.totalContractVolume)}
					</p>
				{/if}
			</div>

			<!-- Contract Details -->
			<div class="space-y-4">
				<div class="grid grid-cols-2 gap-4">
					{#if term.initialTerm}
						<div>
							<p class="text-sm text-gray-500">Initial Term</p>
							<p class="font-semibold">{formatDuration(term.initialTerm)}</p>
						</div>
					{/if}

					{#if term.extensionTerm}
						<div>
							<p class="text-sm text-gray-500">Extension Term</p>
							<p class="font-semibold">{formatDuration(term.extensionTerm)}</p>
						</div>
					{/if}

					{#if term.cancelationPeriod}
						<div>
							<p class="text-sm text-gray-500">Cancellation Period</p>
							<p class="font-semibold">{formatDuration(term.cancelationPeriod)}</p>
						</div>
					{/if}
				</div>

				{#if offer.description}
					<div class="mt-4">
						<p class="text-gray-600">{offer.description}</p>
					</div>
				{/if}
			</div>

			<!-- Actions -->
			<div class="flex justify-between mt-6 pt-6 border-t">
				<Button variant="secondary" on:click={handleBack}>← Back</Button>
				<Button variant="primary" on:click={handleNext}>Continue →</Button>
			</div>
		{:else}
			<Alert type="error">No offer selected. Please go back and select an offer.</Alert>
			<Button variant="secondary" on:click={handleBack} class="mt-4">← Back to Selection</Button>
		{/if}
	</Card>
</div>
