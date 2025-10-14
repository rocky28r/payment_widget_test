<script>
	import { contractFlowStore } from '$lib/stores/contractFlow.js';
	import { configStore } from '$lib/stores/config.js';
	import { ContractFlowApi } from '$lib/api/contractFlow.js';
	import { formatCurrencyDecimal, parsePaymentFrequency, formatDuration, formatDate } from '$lib/utils/format.js';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';

	let loading = false;
	let error = null;

	$: offer = $contractFlowStore.selectedOffer;
	$: personalInfo = $contractFlowStore.personalInfo;
	$: term = offer?.terms?.[0];
	$: price = (() => {
		if (!term) return 0;
		if (term.paymentFrequency?.price) {
			return typeof term.paymentFrequency.price === 'object'
				? term.paymentFrequency.price.amount
				: term.paymentFrequency.price;
		}
		if (term.paymentFrequency?.termsToPrices?.length > 0) {
			const termsPrice = term.paymentFrequency.termsToPrices[0].price;
			return typeof termsPrice === 'object' ? termsPrice.amount : termsPrice;
		}
		if (term.rateStartPrice) {
			return typeof term.rateStartPrice === 'object'
				? term.rateStartPrice.amount
				: term.rateStartPrice;
		}
		return 0;
	})();

	async function handleSubmit() {
		loading = true;
		error = null;

		try {
			const api = new ContractFlowApi($configStore.apiBaseUrl, $configStore.apiKey);

			// Build signup request matching API structure
			const termId = offer?.terms?.[0]?.id;
			if (!termId) {
				throw new Error('No term ID found for selected offer');
			}

			// Build contract object
			const contract = {
				contractOfferTermId: termId,
				startDate: personalInfo.startDate || new Date().toISOString().split('T')[0]
			};

			// Add optional contract fields
			if (personalInfo.voucherCode) {
				contract.voucherCode = personalInfo.voucherCode;
			}

			if ($contractFlowStore.upfrontPaymentToken) {
				contract.initialPaymentRequestToken = $contractFlowStore.upfrontPaymentToken;
			}

			// Build customer object
			const customer = {
				firstName: personalInfo.firstName,
				lastName: personalInfo.lastName,
				email: personalInfo.email,
				dateOfBirth: personalInfo.dateOfBirth,
				phoneNumberMobile: personalInfo.phone || undefined,
				street: personalInfo.street,
				city: personalInfo.city,
				zipCode: personalInfo.zip,
				countryCode: personalInfo.countryCode,
				language: {
					languageCode: 'en', // Could be from config
					countryCode: personalInfo.countryCode
				}
			};

			// Add recurring payment token if exists
			if ($contractFlowStore.recurringPaymentToken) {
				customer.paymentRequestToken = $contractFlowStore.recurringPaymentToken;
			}

			const signupRequest = {
				contract,
				customer
			};

			console.log('Submitting signup request:', signupRequest);

			const response = await api.createMembership(signupRequest);

			console.log('Membership created:', response);

			// Extract customer/contract ID from response
			const customerId = response.customerId || response.customer?.id || response.id;
			contractFlowStore.setContract(customerId, customerId);
			contractFlowStore.nextStep();
		} catch (err) {
			error = err.message || 'Failed to create membership';
			console.error('Failed to create membership:', err);
		} finally {
			loading = false;
		}
	}

	function handleBack() {
		contractFlowStore.previousStep();
	}
</script>

<div class="screen">
	<Card title="Review & Confirm">
		<p class="text-gray-600 mb-6">
			Please review your information before submitting your membership contract.
		</p>

		{#if error}
			<Alert type="error" class="mb-6">{error}</Alert>
		{/if}

		<div class="space-y-6">
			<!-- Membership Details -->
			<div class="bg-base-200 rounded-lg p-6">
				<h3 class="text-xl font-bold mb-4">Membership Details</h3>
				<div class="space-y-3">
					<div class="flex justify-between">
						<span class="text-gray-600">Plan:</span>
						<span class="font-semibold">{offer?.name || 'N/A'}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-gray-600">Price:</span>
						<span class="font-semibold">
							{formatCurrencyDecimal(price)} {term?.paymentFrequency ? parsePaymentFrequency(term.paymentFrequency.paymentFrequency) : ''}
						</span>
					</div>
					{#if term?.initialTerm}
						<div class="flex justify-between">
							<span class="text-gray-600">Initial Term:</span>
							<span class="font-semibold">{formatDuration(term.initialTerm)}</span>
						</div>
					{/if}
					{#if term?.cancelationPeriod}
						<div class="flex justify-between">
							<span class="text-gray-600">Cancellation Period:</span>
							<span class="font-semibold">{formatDuration(term.cancelationPeriod)}</span>
						</div>
					{/if}
					{#if personalInfo.startDate}
						<div class="flex justify-between">
							<span class="text-gray-600">Start Date:</span>
							<span class="font-semibold">{formatDate(personalInfo.startDate)}</span>
						</div>
					{/if}
					{#if personalInfo.voucherCode}
						<div class="flex justify-between">
							<span class="text-gray-600">Voucher Code:</span>
							<span class="badge badge-success">{personalInfo.voucherCode}</span>
						</div>
					{/if}
				</div>
			</div>

			<!-- Personal Information -->
			<div class="bg-base-200 rounded-lg p-6">
				<h3 class="text-xl font-bold mb-4">Personal Information</h3>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
					<div>
						<span class="text-gray-600 text-sm">Name:</span>
						<p class="font-semibold">{personalInfo.firstName} {personalInfo.lastName}</p>
					</div>
					<div>
						<span class="text-gray-600 text-sm">Email:</span>
						<p class="font-semibold">{personalInfo.email}</p>
					</div>
					<div>
						<span class="text-gray-600 text-sm">Date of Birth:</span>
						<p class="font-semibold">{formatDate(personalInfo.dateOfBirth)}</p>
					</div>
					{#if personalInfo.phone}
						<div>
							<span class="text-gray-600 text-sm">Phone:</span>
							<p class="font-semibold">{personalInfo.phone}</p>
						</div>
					{/if}
				</div>
			</div>

			<!-- Address -->
			<div class="bg-base-200 rounded-lg p-6">
				<h3 class="text-xl font-bold mb-4">Address</h3>
				<div class="space-y-2">
					<p class="font-semibold">{personalInfo.street}</p>
					<p class="font-semibold">{personalInfo.zip} {personalInfo.city}</p>
					<p class="font-semibold">{personalInfo.countryCode}</p>
				</div>
			</div>

			<!-- Payment Information -->
			<div class="bg-base-200 rounded-lg p-6">
				<h3 class="text-xl font-bold mb-4">Payment Information</h3>
				<div class="space-y-3">
					<div class="flex items-center gap-2">
						<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="w-5 h-5 text-success stroke-current">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
						</svg>
						<span class="font-semibold">Recurring payment method configured</span>
					</div>
					{#if $contractFlowStore.upfrontPaymentToken}
						<div class="flex items-center gap-2">
							<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="w-5 h-5 text-success stroke-current">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
							</svg>
							<span class="font-semibold">Upfront payment completed</span>
						</div>
					{/if}
				</div>
			</div>

			<!-- Terms Acceptance -->
			<div class="bg-warning/10 border border-warning rounded-lg p-4">
				<div class="flex items-start gap-3">
					<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="w-6 h-6 text-warning stroke-current flex-shrink-0">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
					</svg>
					<div>
						<p class="font-semibold mb-1">Important</p>
						<p class="text-sm text-gray-600">
							By clicking "Submit Contract", you agree to our terms and conditions and authorize us to charge your payment method according to the membership terms.
						</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Navigation -->
		<div class="flex justify-between mt-8 pt-6 border-t">
			<Button variant="secondary" on:click={handleBack} disabled={loading}>
				← Back to Payment
			</Button>
			<Button variant="primary" on:click={handleSubmit} disabled={loading}>
				{#if loading}
					<span class="loading loading-spinner loading-sm"></span>
					Submitting...
				{:else}
					Submit Contract →
				{/if}
			</Button>
		</div>
	</Card>
</div>
