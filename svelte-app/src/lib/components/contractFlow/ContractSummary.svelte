<script>
	import { formatCurrencyDecimal, parsePaymentFrequency, formatDuration } from '$lib/utils/format.js';
	import Card from '$lib/components/ui/Card.svelte';

	export let offer = null;
	export let preview = null;

	$: term = offer?.terms?.[0];
	$: price = term?.paymentFrequency?.price || term?.rateStartPrice || 0;
	$: frequency = term?.paymentFrequency?.paymentFrequency || 'MONTHLY';
</script>

<div class="sticky top-24">
	<Card title="Contract Summary">
		{#if offer}
			<div class="space-y-4">
				<!-- Offer Name -->
				<div>
					<h3 class="font-bold text-lg text-gray-900">{offer.name}</h3>
				</div>

				<!-- Pricing -->
				{#if term}
					<div class="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white">
						<p class="text-sm opacity-90 mb-1">Monthly Price</p>
						<div class="flex items-baseline">
							<span class="text-3xl font-bold">{formatCurrencyDecimal(price)}</span>
							<span class="text-sm ml-2">{parsePaymentFrequency(frequency)}</span>
						</div>
					</div>

					<!-- Contract Terms -->
					<div class="space-y-2 text-sm">
						{#if term.initialTerm}
							<div class="flex justify-between">
								<span class="text-gray-600">Initial Term:</span>
								<span class="font-semibold">{formatDuration(term.initialTerm)}</span>
							</div>
						{/if}

						{#if term.cancelationPeriod}
							<div class="flex justify-between">
								<span class="text-gray-600">Cancellation:</span>
								<span class="font-semibold">{formatDuration(term.cancelationPeriod)}</span>
							</div>
						{/if}

						{#if term.contractVolumeInformation?.totalContractVolume}
							<div class="flex justify-between pt-2 border-t">
								<span class="text-gray-600">Total Value:</span>
								<span class="font-bold text-blue-600">
									{formatCurrencyDecimal(term.contractVolumeInformation.totalContractVolume)}
								</span>
							</div>
						{/if}
					</div>
				{/if}

				<!-- Preview Info -->
				{#if preview}
					<div class="pt-4 border-t">
						<p class="text-xs text-gray-500 mb-2">Preview Information</p>
						<div class="space-y-1 text-sm">
							{#if preview.startDate}
								<div class="flex justify-between">
									<span class="text-gray-600">Start Date:</span>
									<span class="font-semibold">{new Date(preview.startDate).toLocaleDateString()}</span>
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		{:else}
			<p class="text-gray-500 text-sm">No offer selected</p>
		{/if}
	</Card>
</div>
