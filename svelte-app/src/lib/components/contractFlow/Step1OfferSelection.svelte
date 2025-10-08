<script>
	import { onMount } from 'svelte';
	import { contractFlowStore } from '$lib/stores/contractFlow.js';
	import { configStore } from '$lib/stores/config.js';
	import { ContractFlowApi } from '$lib/api/contractFlow.js';
	import { formatCurrencyDecimal, parsePaymentFrequency } from '$lib/utils/format.js';
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
						class="offer-card border-2 border-gray-200 rounded-lg p-6 text-left hover:border-blue-500 hover:shadow-lg transition-all"
						on:click={() => selectOffer(offer.id, offer)}
					>
						<h3 class="text-xl font-bold text-gray-900 mb-2">{offer.name}</h3>
						{#if offer.description}
							<p class="text-gray-600 text-sm mb-4">{offer.description}</p>
						{/if}

						{#if offer.terms && offer.terms.length > 0}
							{@const term = offer.terms[0]}
							{@const getPrice = () => {
								// Try paymentFrequency.price first
								if (term.paymentFrequency?.price) {
									return typeof term.paymentFrequency.price === 'object'
										? term.paymentFrequency.price.amount / 100
										: term.paymentFrequency.price;
								}
								// Check termsToPrices for TERM_BASED pricing
								if (term.paymentFrequency?.termsToPrices?.length > 0) {
									const termsPrice = term.paymentFrequency.termsToPrices[0].price;
									return typeof termsPrice === 'object' ? termsPrice.amount / 100 : termsPrice;
								}
								// Fallback to rateStartPrice
								if (term.rateStartPrice) {
									return typeof term.rateStartPrice === 'object'
										? term.rateStartPrice.amount / 100
										: term.rateStartPrice;
								}
								return 0;
							}}
							{@const price = getPrice()}
							{@const frequency = term.paymentFrequency?.paymentFrequency || 'MONTHLY'}

							<div class="mt-4 pt-4 border-t">
								<div class="flex items-baseline">
									<span class="text-3xl font-bold text-blue-600">
										{formatCurrencyDecimal(price)}
									</span>
									<span class="text-gray-500 ml-2">
										{parsePaymentFrequency(frequency)}
									</span>
								</div>
							</div>
						{/if}

						<div class="mt-4">
							<span class="text-blue-600 font-semibold">View Details →</span>
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
