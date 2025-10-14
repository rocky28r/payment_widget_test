<script>
	import { formatCurrencyDecimal, formatDuration, parsePaymentFrequency } from '$lib/utils/format.js';

	export let offer = null;
	export let selectedTerm = null;
	export let selectedModules = [];

	$: paymentType = selectedTerm?.paymentFrequency?.type || 'RECURRING';
	$: pricing = calculatePricing(selectedTerm, selectedModules);

	// Helper to get numeric price amount from term
	function getTermPriceAmount(term) {
		// Try paymentFrequency.price first
		if (term.paymentFrequency?.price) {
			return typeof term.paymentFrequency.price === 'object'
				? term.paymentFrequency.price.amount
				: term.paymentFrequency.price;
		}
		// Check termsToPrices for TERM_BASED pricing
		if (term.paymentFrequency?.termsToPrices?.length > 0) {
			const termsPrice = term.paymentFrequency.termsToPrices[0].price;
			return typeof termsPrice === 'object' ? termsPrice.amount : termsPrice;
		}
		// Fallback to rateStartPrice
		if (term.rateStartPrice) {
			return typeof term.rateStartPrice === 'object'
				? term.rateStartPrice.amount
				: term.rateStartPrice;
		}
		// Last resort: try contractVolumeInformation
		const avgMonthly = term.contractVolumeInformation?.averagePaymentVolumePerMonth;
		return avgMonthly ? (typeof avgMonthly === 'object' ? avgMonthly.amount : avgMonthly) : 0;
	}

	// AC-3.1, AC-3.2, AC-3.3: Calculate pricing based on payment type
	function calculatePricing(term, modules) {
		if (!term) {
			return {
				monthlyFee: 0,
				totalCommitment: 0,
				dueToday: 0,
				flatFees: [],
				additionalModuleCost: 0,
				type: 'RECURRING'
			};
		}

		const type = term.paymentFrequency?.type || 'RECURRING';
		let monthlyFee = 0;
		let totalCommitment = 0;
		const flatFees = [];

		// Calculate base monthly fee
		if (type === 'RECURRING') {
			// AC-3.1: Recurring payment
			monthlyFee = getTermPriceAmount(term);

			const totalVolume = term.contractVolumeInformation?.totalContractVolume;
			totalCommitment = totalVolume ? (typeof totalVolume === 'object' ? totalVolume.amount : totalVolume) : 0;
		} else if (type === 'NON_RECURRING') {
			// AC-3.2: Upfront payment
			const totalVolume = term.contractVolumeInformation?.totalContractVolume;
			totalCommitment = totalVolume ? (typeof totalVolume === 'object' ? totalVolume.amount : totalVolume) : 0;
			monthlyFee = 0; // Hide monthly fee section
		} else if (type === 'FREE') {
			// AC-3.3: Free contract
			monthlyFee = 0;
			totalCommitment = 0;
		}

		// Calculate flat fees (one-time payments)
		if (term.flatFees && term.flatFees.length > 0) {
			term.flatFees.forEach(fee => {
				const feeAmount = fee.paymentFrequency?.price?.amount || 0;
				flatFees.push({
					name: fee.name || 'Fee',
					amount: feeAmount
				});
			});
		}

		// AC-3.4: Calculate additional module costs
		let additionalModuleCost = 0;
		if (modules && modules.length > 0) {
			modules.forEach(moduleId => {
				const module = offer?.selectableModules?.find(m => m.id === moduleId);
				if (module && module.additionalMonthlyCost) {
					const cost = typeof module.additionalMonthlyCost === 'object'
						? module.additionalMonthlyCost.amount
						: module.additionalMonthlyCost;
					additionalModuleCost += cost;
				}
			});
		}

		// Calculate total due today
		let dueToday = flatFees.reduce((sum, fee) => sum + fee.amount, 0);
		if (type === 'NON_RECURRING') {
			dueToday += totalCommitment;
		}

		return {
			monthlyFee: monthlyFee + additionalModuleCost,
			baseMonthlyFee: monthlyFee,
			totalCommitment: totalCommitment + (additionalModuleCost * getTotalMonths(term)),
			baseTotalCommitment: totalCommitment,
			dueToday,
			flatFees,
			additionalModuleCost,
			type
		};
	}

	function getTotalMonths(term) {
		if (!term.initialTerm) return 12;

		const { value, unit } = term.initialTerm;
		if (unit === 'MONTHS') return value;
		if (unit === 'YEARS') return value * 12;
		return 12;
	}

	function getTermDuration() {
		if (!selectedTerm?.initialTerm) return '';
		return formatDuration(selectedTerm.initialTerm);
	}
</script>

<!-- AC-2.6: Sticky Order Summary -->
<div class="sticky top-4">
	<div class="card bg-base-100 shadow-xl border-2 border-primary">
		<div class="card-body">
			<h3 class="card-title text-2xl border-b pb-3 mb-4">Order Summary</h3>

			{#if !selectedTerm}
				<p class="text-gray-500 text-center py-8">Select a contract term to see pricing</p>
			{:else}
				<!-- Offer Name -->
				<div class="mb-2">
					<p class="font-semibold text-lg">{offer?.name || ''}</p>
					<p class="text-sm text-gray-600">{getTermDuration()} contract</p>
				</div>

				<div class="divider my-2"></div>

				<!-- AC-3.1: Monthly Fee (for RECURRING) -->
				{#if pricing.type === 'RECURRING' || pricing.type === 'FREE'}
					<div class="mb-4">
						<div class="flex justify-between items-baseline mb-1">
							<span class="text-gray-700">Monthly Fee</span>
							<span class="text-3xl font-bold text-primary">
								{pricing.type === 'FREE' ? 'Free' : formatCurrencyDecimal(pricing.monthlyFee)}
							</span>
						</div>
						{#if pricing.type !== 'FREE'}
							<p class="text-sm text-gray-500 text-right">
								Billed {parsePaymentFrequency(selectedTerm.paymentFrequency?.paymentFrequency || 'MONTHLY')}
							</p>
						{/if}

						<!-- Show breakdown if modules added -->
						{#if pricing.additionalModuleCost > 0}
							<div class="text-xs text-gray-600 mt-2 pl-2 border-l-2 border-gray-300">
								<div class="flex justify-between">
									<span>Base fee:</span>
									<span>{formatCurrencyDecimal(pricing.baseMonthlyFee)}</span>
								</div>
								<div class="flex justify-between">
									<span>Add-ons:</span>
									<span>+{formatCurrencyDecimal(pricing.additionalModuleCost)}</span>
								</div>
							</div>
						{/if}
					</div>

					<!-- Total commitment -->
					{#if pricing.totalCommitment > 0}
						<div class="bg-base-200 rounded-lg p-3 mb-4">
							<p class="text-sm text-gray-600 mb-1">Total Contract Value</p>
							<p class="text-lg font-semibold">
								{formatCurrencyDecimal(pricing.totalCommitment)} over {getTermDuration()}
							</p>
						</div>
					{/if}
				{:else if pricing.type === 'NON_RECURRING'}
					<!-- AC-3.2: One-Time Payment -->
					<div class="mb-4">
						<div class="flex justify-between items-baseline mb-1">
							<span class="text-gray-700">One-Time Payment</span>
							<span class="text-3xl font-bold text-primary">
								{formatCurrencyDecimal(pricing.baseTotalCommitment)}
							</span>
						</div>
						<p class="text-sm text-gray-500 text-right">
							For {getTermDuration()}
						</p>
					</div>
				{/if}

				<!-- Flat Fees -->
				{#if pricing.flatFees.length > 0}
					<div class="divider my-2"></div>
					<div class="mb-4">
						<p class="font-semibold mb-2">One-Time Fees</p>
						{#each pricing.flatFees as fee}
							<div class="flex justify-between text-sm mb-1">
								<span class="text-gray-600">{fee.name}</span>
								<span class="font-medium">{formatCurrencyDecimal(fee.amount)}</span>
							</div>
						{/each}
					</div>
				{/if}

				<!-- Total Due Today -->
				<div class="divider my-2"></div>
				<div class="bg-warning/10 rounded-lg p-4">
					<div class="flex justify-between items-center">
						<span class="font-bold text-lg">Total Due Today</span>
						<span class="text-2xl font-bold">
							{pricing.dueToday > 0 ? formatCurrencyDecimal(pricing.dueToday) : formatCurrencyDecimal(0)}
						</span>
					</div>
				</div>

				<!-- CTA Button -->
				<div class="mt-6">
					<button class="btn btn-primary btn-block btn-lg">
						Proceed to Checkout →
					</button>
				</div>

				<!-- Trust indicator -->
				<div class="text-xs text-gray-500 text-center mt-4">
					<p>✓ Secure checkout</p>
					<p>✓ Cancel anytime during notice period</p>
				</div>
			{/if}
		</div>
	</div>
</div>
