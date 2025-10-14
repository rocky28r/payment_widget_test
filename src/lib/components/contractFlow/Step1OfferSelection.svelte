<script>
	import { onMount } from 'svelte';
	import { contractFlowStore } from '$lib/stores/contractFlow.js';
	import { configStore } from '$lib/stores/config.js';
	import { ContractFlowApi } from '$lib/api/contractFlow.js';
	import { formatCurrencyDecimal, parsePaymentFrequency, formatDuration, extractPrice } from '$lib/utils/format.js';
	import Card from '$lib/components/ui/Card.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';

	let offers = [];
	let loading = true;
	let error = null;

	onMount(async () => {
		await loadOffers();
	});

	async function loadOffers() {
		loading = true;
		error = null;

		try {
			const api = new ContractFlowApi($configStore.apiBaseUrl, $configStore.apiKey);
			const response = await api.getMembershipOffers();
			offers = response.results || response || [];
		} catch (err) {
			error = err.message;
			console.error('Failed to load offers:', err);
		} finally {
			loading = false;
		}
	}

	function selectOffer(offerId, offer) {
		contractFlowStore.selectOffer(offerId, offer);
	}
</script>

<div class="screen">
	<Card title="Select Your Membership">
		{#if loading}
			<div class="space-y-4">
				{#each Array(3) as _}
					<div class="h-32 bg-gray-200 rounded-lg animate-pulse"></div>
				{/each}
			</div>
		{:else if error}
			<Alert type="error">{error}</Alert>
			<button class="btn btn-primary mt-4" on:click={loadOffers}> Try Again </button>
		{:else if offers.length === 0}
			<Alert type="warning">No membership offers available at the moment.</Alert>
		{:else}
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				{#each offers as offer}
					<button
						class="offer-card border-2 border-gray-200 rounded-lg p-6 text-left hover:border-primary hover:shadow-soft transition-all"
						on:click={() => selectOffer(offer.id, offer)}
					>
						<h3 class="text-xl font-bold text-gray-900 mb-2">{offer.name}</h3>
						{#if offer.description}
							<p class="text-gray-600 text-sm mb-4">{offer.description}</p>
						{/if}

						{#if offer.terms && offer.terms.length > 0}
							{@const term = offer.terms[0]}
							{@const paymentType = term.paymentFrequency?.type || 'RECURRING'}
							{@const isRecurring = paymentType === 'RECURRING'}
							{@const isTermBased = paymentType === 'TERM_BASED' || paymentType === 'NON_RECURRING'}

							{@const getPrice = () => {
								// For term-based/prepaid: use termsToPrices for upfront cost
								if (isTermBased && term.paymentFrequency?.termsToPrices?.length > 0) {
									return term.paymentFrequency.termsToPrices[0].price;
								}
								// For recurring: use paymentFrequency.price
								if (term.paymentFrequency?.price) {
									return term.paymentFrequency.price;
								}
								// Fallback to rateStartPrice
								if (term.rateStartPrice) {
									return term.rateStartPrice;
								}
								return 0;
							}}
							{@const price = getPrice()}
							{@const frequency = term.paymentFrequency?.paymentFrequency || 'MONTHLY'}
							{@const contractTerm = term.initialTerm}
							{@const flatFees = term.flatFees || []}
							{@const totalFlatFees = flatFees.reduce((sum, fee) => {
								const { amount } = extractPrice(fee.paymentFrequency?.price || 0);
								return sum + amount;
							}, 0)}

							<div class="mt-4 pt-4 border-t">
								{#if isRecurring}
									<!-- Recurring Plan Display (FR1.1) -->
									<div class="flex items-baseline">
										<span class="text-3xl font-bold text-primary">
											{formatCurrencyDecimal(price)}
										</span>
										<span class="text-gray-500 ml-2">
											{parsePaymentFrequency(frequency)}
										</span>
									</div>
									{#if totalFlatFees > 0}
										<div class="mt-2 text-sm text-gray-600">
											+ {formatCurrencyDecimal(totalFlatFees)} one-time fees
										</div>
									{/if}
								{:else if isTermBased}
									<!-- Term-Based/Prepaid Plan Display (FR1.2) -->
									<div>
										<div class="flex items-baseline">
											<span class="text-3xl font-bold text-primary">
												{formatCurrencyDecimal(price)}
											</span>
										</div>
										{#if contractTerm}
											<div class="text-gray-500 text-sm mt-1">
												for {formatDuration(contractTerm)}
											</div>
										{/if}
										{#if contractTerm?.value && price > 0}
											{@const { amount: priceAmount } = extractPrice(price)}
											{@const effectiveMonthly = priceAmount / contractTerm.value}
											<div class="text-gray-400 text-xs mt-1">
												equals {formatCurrencyDecimal(effectiveMonthly)}/month
											</div>
										{/if}
									</div>
									{#if totalFlatFees > 0}
										<div class="mt-2 text-sm text-gray-600">
											+ {formatCurrencyDecimal(totalFlatFees)} one-time fees
										</div>
									{/if}
								{/if}
							</div>
						{/if}

						<div class="mt-4">
							<span class="text-primary font-semibold">View Details →</span>
						</div>
					</button>
				{/each}
			</div>
		{/if}
	</Card>
</div>

<style>
	.offer-card {
		cursor: pointer;
	}

	.offer-card:hover {
		transform: translateY(-4px);
	}
</style>
