<script>
	import { formatCurrencyDecimal, parsePaymentFrequency, formatDuration } from '$lib/utils/format.js';
	import { contractFlowStore } from '$lib/stores/contractFlow.js';
	import Card from '$lib/components/ui/Card.svelte';

	export let offer = null;
	export let preview = null;
	export let loading = false;
	export let error = null;

	$: selectedTermId = $contractFlowStore.selectedTermId;
	$: term = offer?.terms?.find(t => t.id === selectedTermId) || offer?.terms?.[0];
	$: paymentType = term?.paymentFrequency?.type || 'RECURRING';
	$: isRecurring = paymentType === 'RECURRING';
	$: isTermBased = paymentType === 'TERM_BASED' || paymentType === 'NON_RECURRING';

	$: price = (() => {
		if (!term) return 0;
		// For term-based/prepaid: use termsToPrices for upfront cost
		if (isTermBased && term.paymentFrequency?.termsToPrices?.length > 0) {
			const termsPrice = term.paymentFrequency.termsToPrices[0].price;
			return typeof termsPrice === 'object' ? termsPrice.amount : termsPrice;
		}
		// For recurring: use paymentFrequency.price
		if (term.paymentFrequency?.price) {
			return typeof term.paymentFrequency.price === 'object'
				? term.paymentFrequency.price.amount
				: term.paymentFrequency.price;
		}
		// Fallback to rateStartPrice
		if (term.rateStartPrice) {
			return typeof term.rateStartPrice === 'object'
				? term.rateStartPrice.amount
				: term.rateStartPrice;
		}
		return 0;
	})();

	$: frequency = term?.paymentFrequency?.paymentFrequency || 'MONTHLY';
	$: flatFees = term?.flatFees || [];

	$: totalFlatFees = flatFees.reduce((sum, fee) => {
		const feeAmount = typeof fee.paymentFrequency?.price === 'object'
			? fee.paymentFrequency.price.amount
			: (fee.paymentFrequency?.price || 0);
		return sum + feeAmount;
	}, 0);

	// FR2.2 & FR2.3: Calculate Total Due Today
	$: totalDueToday = (() => {
		// Use preview data if available
		if (preview?.paymentPreview?.dueOnSigningAmount) {
			const amount = preview.paymentPreview.dueOnSigningAmount;
			return typeof amount === 'object' ? amount.amount : amount;
		}

		// Fallback calculation
		if (isRecurring) {
			// Recurring: only flat fees due today
			return totalFlatFees;
		} else if (isTermBased) {
			// Term-based: upfront cost + flat fees
			return price + totalFlatFees;
		}
		return 0;
	})();

	// Get monthly payment from preview or term
	$: monthlyPayment = (() => {
		if (preview?.basePrice !== null && preview?.basePrice !== undefined) {
			return preview.basePrice;
		}
		if (preview?.discountedBasePrice !== null && preview?.discountedBasePrice !== undefined) {
			return preview.discountedBasePrice;
		}
		if (preview?.ageAdjustedPrice !== null && preview?.ageAdjustedPrice !== undefined) {
			return preview.ageAdjustedPrice;
		}
		return price;
	})();

	// Get payment schedule from preview
	$: paymentSchedule = preview?.paymentPreview?.paymentSchedule || [];
</script>

<Card>
	<div slot="title" class="text-lg font-bold">Ihre Vertragsübersicht</div>

	{#if loading}
		<!-- Loading State -->
		<div class="space-y-3 animate-pulse">
			<div class="h-6 bg-gray-200 rounded w-3/4"></div>
			<div class="h-4 bg-gray-200 rounded w-full"></div>
			<div class="h-4 bg-gray-200 rounded w-5/6"></div>
			<div class="h-20 bg-gray-200 rounded mt-4"></div>
		</div>
	{:else if error}
		<!-- Error State -->
		<div class="bg-red-50 border border-red-200 rounded-lg p-4">
			<div class="flex items-start">
				<svg class="w-5 h-5 text-red-500 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
					<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
				</svg>
				<div>
					<p class="text-sm font-semibold text-red-800">Preview-Fehler</p>
					<p class="text-xs text-red-700 mt-1">{error}</p>
				</div>
			</div>
		</div>
	{:else if offer}
		<div class="space-y-4">
				<!-- Offer Name -->
				<div class="pb-3 border-b-2 border-gray-200">
					<h3 class="font-bold text-lg text-gray-900">{offer.name}</h3>
				</div>

				{#if term}
					{#if isRecurring}
						<!-- Recurring Plan Summary (FR2.2) -->
						<div class="space-y-2 text-sm">
							<div class="flex justify-between">
								<span class="text-gray-600">Monatlicher Beitrag:</span>
								<span class="font-semibold">{formatCurrencyDecimal(price)}</span>
							</div>
						</div>

						{#if flatFees.length > 0}
							<div class="pt-2 border-t border-gray-200">
								<p class="text-xs font-semibold text-gray-700 mb-2">Einmalige Gebühren:</p>
								<div class="space-y-1">
									{#each flatFees as fee}
										{@const feeAmount = typeof fee.paymentFrequency?.price === 'object'
											? fee.paymentFrequency.price.amount
											: (fee.paymentFrequency?.price || 0)}
										<div class="flex justify-between text-sm">
											<span class="text-gray-600">{fee.name}:</span>
											<span class="font-semibold">{formatCurrencyDecimal(feeAmount)}</span>
										</div>
									{/each}
								</div>
							</div>
						{/if}

						<div class="pt-4 border-t-2 border-gray-300">
							<div class="flex justify-between items-center mb-2">
								<span class="font-bold text-base text-gray-700">✅ Heute fällig:</span>
								<span class="font-bold text-2xl text-green-600">{formatCurrencyDecimal(totalDueToday)}</span>
							</div>
							<p class="text-sm text-gray-600 font-medium">
								Dann {formatCurrencyDecimal(monthlyPayment)} {parsePaymentFrequency(frequency)}
							</p>
						</div>

						<!-- Payment Schedule (if available from preview) -->
						{#if paymentSchedule.length > 0}
							<div class="pt-4 border-t border-gray-200">
								<p class="text-sm font-semibold text-gray-700 mb-3">📅 Zahlungsplan:</p>
								<div class="space-y-2 max-h-40 overflow-y-auto">
									{#each paymentSchedule.slice(0, 5) as payment, idx}
										{@const amount = typeof payment.amount === 'object' ? payment.amount.amount : payment.amount}
										<div class="flex justify-between text-sm {idx === 0 ? 'text-gray-900 font-semibold' : 'text-gray-600'}">
											<span>{new Date(payment.dueDate).toLocaleDateString('de-DE', { month: 'short', year: 'numeric' })}</span>
											<span>{formatCurrencyDecimal(amount)}</span>
										</div>
									{/each}
									{#if paymentSchedule.length > 5}
										<p class="text-xs text-gray-500 italic mt-2">+ {paymentSchedule.length - 5} weitere Zahlungen</p>
									{/if}
								</div>
							</div>
						{/if}

					{:else if isTermBased}
						<!-- Term-Based Plan Summary (FR2.3) -->
						<div class="space-y-2 text-sm">
							<div class="flex justify-between">
								<span class="text-gray-600">{offer.name}:</span>
								<span class="font-semibold">{formatCurrencyDecimal(price)}</span>
							</div>
							{#if term.initialTerm}
								<div class="flex justify-between text-xs text-gray-500">
									<span>({formatDuration(term.initialTerm)})</span>
								</div>
							{/if}
						</div>

						{#if flatFees.length > 0}
							<div class="pt-2 border-t border-gray-200">
								<p class="text-xs font-semibold text-gray-700 mb-2">Einmalige Gebühren:</p>
								<div class="space-y-1">
									{#each flatFees as fee}
										{@const feeAmount = typeof fee.paymentFrequency?.price === 'object'
											? fee.paymentFrequency.price.amount
											: (fee.paymentFrequency?.price || 0)}
										<div class="flex justify-between text-sm">
											<span class="text-gray-600">{fee.name}:</span>
											<span class="font-semibold">{formatCurrencyDecimal(feeAmount)}</span>
										</div>
									{/each}
								</div>
							</div>
						{/if}

						<div class="pt-4 border-t-2 border-gray-300">
							<div class="flex justify-between items-center mb-2">
								<span class="font-bold text-base text-gray-700">✅ Heute fällig:</span>
								<span class="font-bold text-2xl text-green-600">{formatCurrencyDecimal(totalDueToday)}</span>
							</div>
							<p class="text-sm text-gray-600 font-medium">
								Keine wiederkehrenden Zahlungen
							</p>
						</div>
					{/if}

					<!-- Contract Terms -->
					<div class="pt-4 space-y-2 text-sm border-t border-gray-200">
						{#if term.initialTerm}
							<div class="flex justify-between">
								<span class="text-gray-600">Vertragslaufzeit:</span>
								<span class="font-medium text-gray-900">{formatDuration(term.initialTerm)}</span>
							</div>
						{/if}

						{#if term.cancelationPeriod}
							<div class="flex justify-between">
								<span class="text-gray-600">Kündigungsfrist:</span>
								<span class="font-medium text-gray-900">{formatDuration(term.cancelationPeriod)}</span>
							</div>
						{/if}
					</div>
			{/if}

			<!-- Preview Info -->
			{#if preview}
				<div class="pt-3 border-t border-gray-200">
					<p class="text-xs text-gray-500 mb-2">Vorschau-Information</p>
					<div class="space-y-1 text-xs">
						{#if preview.startDate}
							<div class="flex justify-between">
								<span class="text-gray-600">Startdatum:</span>
								<span class="font-medium">{new Date(preview.startDate).toLocaleDateString('de-DE')}</span>
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	{:else}
		<p class="text-gray-500 text-sm">Kein Angebot ausgewählt</p>
	{/if}
</Card>
