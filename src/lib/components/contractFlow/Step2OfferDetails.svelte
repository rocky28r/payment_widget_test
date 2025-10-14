<script>
	import { onMount, tick } from 'svelte';
	import { contractFlowStore } from '$lib/stores/contractFlow.js';
	import { configStore } from '$lib/stores/config.js';
	import { ContractFlowApi } from '$lib/api/contractFlow.js';
	import { formatCurrencyDecimal, formatDuration, parsePaymentFrequency, extractPrice } from '$lib/utils/format.js';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import ContractSummary from '$lib/components/contractFlow/ContractSummary.svelte';

	let offer = null;
	let loading = false;
	let selectedTermId = null;
	let previewLoading = false;
	let previewError = null;
	let preview = null;

	// Fields needed for preview API
	let startDate = $contractFlowStore.personalInfo.startDate || new Date().toISOString().split('T')[0];
	let voucherCode = $contractFlowStore.personalInfo.voucherCode || '';
	let appliedVoucherCode = $contractFlowStore.personalInfo.voucherCode || '';
	let voucherMessage = '';
	let voucherStatus = '';

	// Personal info fields (including dateOfBirth)
	let personalInfo = {
		...$contractFlowStore.personalInfo,
		dateOfBirth: $contractFlowStore.personalInfo.dateOfBirth || ''
	};

	// Debounce timer
	let debounceTimer;

	$: offer = $contractFlowStore.selectedOffer;
	$: selectedTermId = $contractFlowStore.selectedTermId;
	$: terms = offer?.terms || [];
	$: hasMultipleTerms = terms.length > 1;

	// Get the currently selected term
	$: selectedTerm = terms.find(t => t.id === selectedTermId) || terms[0];

	// Fetch preview from API
	async function fetchPreview(debounce = false) {
		if (!selectedTermId) {
			console.warn('No term ID selected, cannot fetch preview');
			return;
		}

		// Clear existing timer if debouncing
		if (debounce) {
			clearTimeout(debounceTimer);
			debounceTimer = setTimeout(() => fetchPreview(false), 500);
			return;
		}

		previewLoading = true;
		previewError = null;

		try {
			const api = new ContractFlowApi($configStore.apiBaseUrl, $configStore.apiKey);

			// Build minimal customer object for preview
			const customer = {
				firstName: 'Preview',
				lastName: 'User',
				email: 'preview@example.com',
				dateOfBirth: personalInfo.dateOfBirth || '1990-01-01',
				street: 'Preview Street',
				city: 'Preview City',
				zipCode: '12345',
				countryCode: 'DE',
				language: {
					languageCode: 'de',
					countryCode: 'DE'
				}
			};

			// Build contract object
			const contract = {
				contractOfferTermId: selectedTermId,
				startDate: startDate || new Date().toISOString().split('T')[0]
			};

			if (appliedVoucherCode) {
				contract.voucherCode = appliedVoucherCode;
			}

			const previewRequest = {
				contract: contract,
				customer: customer
			};

			console.log('Fetching preview with request:', previewRequest);

			preview = await api.createContractPreview(previewRequest);

			console.log('Preview API response:', preview);

			// Save preview to store
			contractFlowStore.setPreview(preview);

			// If voucher was applied, show success message
			if (appliedVoucherCode && preview.voucherSuccessMessage) {
				voucherMessage = preview.voucherSuccessMessage;
				voucherStatus = 'success';
			} else if (appliedVoucherCode && preview.voucherErrorCode) {
				voucherMessage = 'Invalid voucher code';
				voucherStatus = 'error';
				appliedVoucherCode = '';
				contractFlowStore.updatePersonalInfo({ voucherCode: '' });
			}

			previewLoading = false;
		} catch (err) {
			console.error('Preview API failed:', err);
			previewError = err.message || 'Failed to load preview. Please try again.';
			previewLoading = false;
		}
	}

	onMount(async () => {
		// Fetch full offer details including flatFees
		if ($contractFlowStore.selectedOfferId && !offer?.terms?.[0]?.flatFees) {
			loading = true;
			try {
				const api = new ContractFlowApi($configStore.apiBaseUrl, $configStore.apiKey);
				const fullOffer = await api.getMembershipOffer($contractFlowStore.selectedOfferId);
				// Update store with full offer details
				contractFlowStore.selectOffer(fullOffer.id, fullOffer);
			} catch (err) {
				console.error('Failed to fetch full offer details:', err);
			} finally {
				loading = false;
			}
		}

		if (!offer) {
			contractFlowStore.goToStep(1);
		} else {
			// Fetch initial preview
			await fetchPreview();
		}
	});

	// Reactive: Re-fetch preview when term changes
	$: if (selectedTermId) {
		fetchPreview();
	}

	// Reactive: Re-fetch preview when dateOfBirth changes (debounced)
	$: if (personalInfo.dateOfBirth) {
		contractFlowStore.updatePersonalInfo({ dateOfBirth: personalInfo.dateOfBirth });
		fetchPreview(true);
	}

	// Reactive: Re-fetch preview when startDate changes (debounced)
	$: if (startDate) {
		contractFlowStore.updatePersonalInfo({ startDate });
		fetchPreview(true);
	}

	$: term = selectedTerm;
	$: paymentType = term?.paymentFrequency?.type || 'RECURRING';
	$: isRecurring = paymentType === 'RECURRING';
	$: isTermBased = paymentType === 'TERM_BASED' || paymentType === 'NON_RECURRING';

	// Use preview data if available, otherwise fall back to offer data
	// Keep as price object to preserve currency information
	$: price = (() => {
		if (preview?.ageAdjustedPrice !== null && preview?.ageAdjustedPrice !== undefined) {
			return preview.ageAdjustedPrice;
		}
		if (preview?.discountedBasePrice !== null && preview?.discountedBasePrice !== undefined) {
			return preview.discountedBasePrice;
		}
		if (preview?.basePrice !== null && preview?.basePrice !== undefined) {
			return preview.basePrice;
		}

		// Fallback to offer data (keep as price object with currency)
		if (!term) return 0;
		if (isTermBased && term.paymentFrequency?.termsToPrices?.length > 0) {
			return term.paymentFrequency.termsToPrices[0].price;
		}
		if (term.paymentFrequency?.price) {
			return term.paymentFrequency.price;
		}
		if (term.rateStartPrice) {
			return term.rateStartPrice;
		}
		return 0;
	})();

	$: flatFees = preview?.flatFeePreviews || term?.flatFees || [];

	// Use preview data for "Due Today" if available (keep as price object)
	$: totalDueToday = (() => {
		if (preview?.paymentPreview?.dueOnSigningAmount) {
			return preview.paymentPreview.dueOnSigningAmount;
		}

		// Fallback calculation - need to extract amounts for arithmetic
		const { amount: priceAmount } = extractPrice(price);
		const totalFlatFeesAmount = flatFees.reduce((sum, fee) => {
			const { amount } = extractPrice(fee.paymentFrequency?.price || fee.discountedPrice || 0);
			return sum + amount;
		}, 0);

		if (isRecurring) {
			return totalFlatFeesAmount;
		} else if (isTermBased) {
			return priceAmount + totalFlatFeesAmount;
		}
		return 0;
	})();

	$: totalValue = (() => {
		if (preview?.contractVolumeInformation?.totalContractVolume !== null &&
		    preview?.contractVolumeInformation?.totalContractVolume !== undefined) {
			return preview.contractVolumeInformation.totalContractVolume;
		}
		if (!term?.contractVolumeInformation?.totalContractVolume) return 0;
		return term.contractVolumeInformation.totalContractVolume;
	})();

	function handleTermSelect(termId) {
		contractFlowStore.selectTerm(termId);
		// Preview will be fetched automatically via reactive statement
	}

	function applyVoucher() {
		if (!voucherCode.trim()) {
			voucherMessage = 'Please enter a voucher code';
			voucherStatus = 'error';
			return;
		}

		appliedVoucherCode = voucherCode;
		contractFlowStore.updatePersonalInfo({ voucherCode: voucherCode });
		fetchPreview(); // Re-fetch with voucher
	}

	function removeVoucher() {
		voucherCode = '';
		appliedVoucherCode = '';
		voucherMessage = '';
		voucherStatus = '';
		contractFlowStore.updatePersonalInfo({ voucherCode: '' });
		fetchPreview(); // Re-fetch without voucher
	}

	// Check if all required personal info fields are filled
	$: hasPersonalInfo = personalInfo.firstName && personalInfo.lastName &&
	                     personalInfo.email && personalInfo.street &&
	                     personalInfo.zip && personalInfo.city &&
	                     personalInfo.countryCode &&
	                     personalInfo.dateOfBirth && startDate;

	function updatePersonalField(field, value) {
		personalInfo = { ...personalInfo, [field]: value };
		contractFlowStore.updatePersonalInfo({ [field]: value });
	}

	function fillTestData() {
		// Randomize email to avoid duplicate customer checks
		const randomId = Math.floor(Math.random() * 100000);
		const timestamp = Date.now().toString().slice(-6);
		const randomEmail = `max.mustermann+${timestamp}${randomId}@example.com`;

		const testData = {
			firstName: 'Max',
			lastName: 'Mustermann',
			email: randomEmail,
			phone: '+491234567890',
			street: 'Hauptstraße 123',
			houseNumber: '',
			zip: '10115',
			city: 'Berlin',
			countryCode: 'DE',
			dateOfBirth: '2000-01-01'
		};

		Object.entries(testData).forEach(([key, value]) => {
			updatePersonalField(key, value);
		});

		personalInfo = { ...personalInfo, ...testData };
	}

	async function handleNext() {
		if (!hasPersonalInfo) return;

		// Re-fetch preview with complete personal info before proceeding
		previewLoading = true;
		previewError = null;

		try {
			const api = new ContractFlowApi($configStore.apiBaseUrl, $configStore.apiKey);

			// Build complete customer object
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
					languageCode: 'de',
					countryCode: personalInfo.countryCode
				}
			};

			// Build contract object
			const contract = {
				contractOfferTermId: selectedTermId,
				startDate: startDate
			};

			if (appliedVoucherCode) {
				contract.voucherCode = appliedVoucherCode;
			}

			const previewRequest = {
				contract: contract,
				customer: customer
			};

			console.log('Final preview with complete info:', previewRequest);

			preview = await api.createContractPreview(previewRequest);
			contractFlowStore.setPreview(preview);

			// Jump to step 4 (payment), skipping old step 3
			contractFlowStore.goToStep(4);
		} catch (err) {
			console.error('Preview API failed:', err);
			previewError = err.message || 'Failed to load preview. Please try again.';
		} finally {
			previewLoading = false;
		}
	}

	function handleBack() {
		contractFlowStore.previousStep();
	}

	// Helper to get term price for display (keep as price object)
	function getTermPrice(t) {
		if (t.paymentFrequency?.price) {
			return t.paymentFrequency.price;
		}
		if (t.rateStartPrice) {
			return t.rateStartPrice;
		}
		return 0;
	}

	// Helper to get term flat fees total (extract amounts for calculation)
	function getTermFlatFeesTotal(t) {
		return (t.flatFees || []).reduce((sum, fee) => {
			const { amount } = extractPrice(fee.paymentFrequency?.price || 0);
			return sum + amount;
		}, 0);
	}
</script>

<div class="screen">
	<!-- Two-column layout: Form on left, Summary on right (desktop) -->
	<div class="contract-flow-layout">
		<!-- Main Form Column -->
		<div class="form-column">
	<Card title="Membership Details">
		{#if offer && term}
			<!-- Preview Error Alert -->
			{#if previewError}
				<Alert type="error" class="mb-6">
					<div class="flex items-center justify-between">
						<div>
							<p class="font-semibold mb-1">Preview Error</p>
							<p>{previewError}</p>
						</div>
						<Button variant="secondary" size="sm" on:click={() => fetchPreview()} disabled={previewLoading}>
							{previewLoading ? 'Retrying...' : 'Retry'}
						</Button>
					</div>
				</Alert>
			{/if}

			<!-- Voucher Success Message -->
			{#if voucherMessage && voucherStatus === 'success'}
				<Alert type="success" class="mb-6">
					{voucherMessage}
				</Alert>
			{/if}

			<!-- Term Selection (if multiple terms available) -->
			{#if hasMultipleTerms}
				<div class="mb-6">
					<h3 class="text-lg font-semibold mb-3">Select Your Contract Duration</h3>
					<div class="grid grid-cols-1 gap-4">
						{#each terms as t (t.id)}
							{@const termPrice = getTermPrice(t)}
							{@const termFlatFees = getTermFlatFeesTotal(t)}
							{@const isSelected = t.id === selectedTermId}
							<button
								type="button"
								on:click={() => handleTermSelect(t.id)}
								class="relative p-4 rounded-lg border-2 transition-all text-left {isSelected
									? 'border-primary bg-primary bg-opacity-10 shadow-md'
									: 'border-gray-200 hover:border-primary hover:shadow-sm'}"
							>
								{#if isSelected}
									<div class="absolute top-2 right-2">
										<svg class="w-6 h-6 text-primary" fill="currentColor" viewBox="0 0 20 20">
											<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
										</svg>
									</div>
								{/if}

								<div class="mb-2">
									<div class="text-2xl font-bold text-gray-900">{formatCurrencyDecimal(termPrice)}</div>
									<div class="text-sm text-gray-600">per month</div>
								</div>

								{#if termFlatFees > 0}
									<div class="text-sm text-gray-700 mb-2">
										+ {formatCurrencyDecimal(termFlatFees)} Setup
									</div>
								{/if}

								<div class="space-y-1 text-xs text-gray-600">
									{#if t.initialTerm}
										<div>📅 Duration: {formatDuration(t.initialTerm)}</div>
									{/if}
									{#if t.extensionTerm}
										<div>🔄 Extension: {formatDuration(t.extensionTerm)}</div>
									{/if}
									{#if t.cancelationPeriod}
										<div>⏱️ Cancellation: {formatDuration(t.cancelationPeriod)}</div>
									{/if}
								</div>
							</button>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Contract Configuration Fields -->
			<div class="bg-base-200 rounded-lg p-6 mb-6">
				<h3 class="font-bold text-lg mb-4">📋 Contract Details</h3>

				<div class="space-y-4">
					<Input
						label="Contract Start"
						type="date"
						bind:value={startDate}
						required
						helpText="Your membership starts on this date"
					/>

					<div>
						<label class="block text-sm font-medium mb-1">
							Voucher Code (Optional)
						</label>
						<div class="flex gap-3">
							<input
								type="text"
								bind:value={voucherCode}
								placeholder="Enter code"
								class="input input-bordered flex-1"
								disabled={!!appliedVoucherCode || previewLoading}
							/>
							{#if appliedVoucherCode}
								<button
									type="button"
									on:click={removeVoucher}
									class="btn btn-error"
									disabled={previewLoading}
								>
									Remove
								</button>
							{:else}
								<button
									type="button"
									on:click={applyVoucher}
									class="btn btn-success"
									disabled={previewLoading || !voucherCode.trim()}
								>
									Apply
								</button>
							{/if}
						</div>
						{#if voucherMessage && voucherStatus === 'error'}
							<p class="text-sm text-error mt-1">{voucherMessage}</p>
						{/if}
						{#if appliedVoucherCode}
							<div class="mt-2 badge badge-success gap-2">
								<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block w-4 h-4 stroke-current">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
								</svg>
								Voucher: {appliedVoucherCode}
							</div>
						{/if}
					</div>
				</div>
			</div>

			<!-- Personal Information Section -->
			<div class="bg-base-200 rounded-lg p-6 mb-6">
				<div class="flex items-center justify-between mb-4">
					<h3 class="font-bold text-lg">👤 Personal Information</h3>
					<button type="button" class="btn btn-ghost btn-sm" on:click={fillTestData}>
						Fill Test Data
					</button>
				</div>

				<div class="space-y-4">
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Input
							label="First Name"
							bind:value={personalInfo.firstName}
							on:input={(e) => updatePersonalField('firstName', e.target.value)}
							required
							placeholder="Max"
						/>
						<Input
							label="Last Name"
							bind:value={personalInfo.lastName}
							on:input={(e) => updatePersonalField('lastName', e.target.value)}
							required
							placeholder="Mustermann"
						/>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Input
							label="Date of Birth"
							type="date"
							bind:value={personalInfo.dateOfBirth}
							on:input={(e) => updatePersonalField('dateOfBirth', e.target.value)}
							required
							placeholder="YYYY-MM-DD"
							helpText="Required for age-based pricing"
						/>
						<Input
							label="Email"
							type="email"
							bind:value={personalInfo.email}
							on:input={(e) => updatePersonalField('email', e.target.value)}
							required
							placeholder="max@example.com"
						/>
					</div>

					<Input
						label="Phone Number"
						type="tel"
						bind:value={personalInfo.phone}
						on:input={(e) => updatePersonalField('phone', e.target.value)}
						placeholder="+49 123 456789"
					/>
				</div>
			</div>

			<!-- Address Section -->
			<div class="bg-base-200 rounded-lg p-6 mb-6">
				<h3 class="font-bold text-lg mb-4">📍 Address</h3>

				<div class="space-y-4">
					<Input
						label="Street and House Number"
						bind:value={personalInfo.street}
						on:input={(e) => updatePersonalField('street', e.target.value)}
						required
						placeholder="Hauptstraße 123"
					/>

					<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div class="md:col-span-2">
							<Input
								label="City"
								bind:value={personalInfo.city}
								on:input={(e) => updatePersonalField('city', e.target.value)}
								required
								placeholder="Berlin"
							/>
						</div>
						<Input
							label="Postal Code"
							bind:value={personalInfo.zip}
							on:input={(e) => updatePersonalField('zip', e.target.value)}
							required
							placeholder="10115"
						/>
					</div>

					<div>
						<label for="countryCode" class="block text-sm font-medium mb-1">
							Country <span class="text-error">*</span>
						</label>
						<select
							id="countryCode"
							bind:value={personalInfo.countryCode}
							on:change={(e) => updatePersonalField('countryCode', e.target.value)}
							required
							class="select select-bordered w-full"
						>
							<option value="">Select country</option>
							<option value="DE">Germany</option>
							<option value="AT">Austria</option>
							<option value="CH">Switzerland</option>
							<option value="FR">France</option>
							<option value="IT">Italy</option>
							<option value="ES">Spain</option>
							<option value="NL">Netherlands</option>
							<option value="BE">Belgium</option>
							<option value="GB">United Kingdom</option>
							<option value="US">United States</option>
						</select>
					</div>
				</div>
			</div>

			<!-- Contract Details -->
			<div class="space-y-6">
				{#if offer.description}
					<div>
						<h3 class="text-sm font-semibold text-gray-700 mb-2">Description</h3>
						<p class="text-gray-600">{offer.description}</p>
					</div>
				{/if}

				<div>
					<h3 class="text-sm font-semibold text-gray-700 mb-3">Contract Details</h3>
					<div class="grid grid-cols-2 gap-4">
						{#if term.initialTerm}
							<div>
								<p class="text-xs text-gray-500">Contract Duration</p>
								<p class="font-semibold">{formatDuration(term.initialTerm)}</p>
							</div>
						{/if}

						{#if term.extensionTerm}
							<div>
								<p class="text-xs text-gray-500">Extension</p>
								<p class="font-semibold">{formatDuration(term.extensionTerm)}</p>
							</div>
						{/if}

						{#if term.cancelationPeriod}
							<div>
								<p class="text-xs text-gray-500">Cancellation Period</p>
								<p class="font-semibold">{formatDuration(term.cancelationPeriod)}</p>
							</div>
						{/if}

						{#if totalValue > 0}
							<div>
								<p class="text-xs text-gray-500">Total Value</p>
								<p class="font-semibold text-primary">{formatCurrencyDecimal(totalValue)}</p>
							</div>
						{/if}
					</div>
				</div>
			</div>

			<!-- Actions -->
			<div class="flex justify-between mt-6 pt-6 border-t">
				<Button variant="secondary" on:click={handleBack} disabled={previewLoading}>← Back</Button>
				<Button
					variant="primary"
					on:click={handleNext}
					disabled={previewLoading || !hasPersonalInfo || !!previewError}
				>
					{#if previewLoading}
						<span class="loading loading-spinner loading-sm"></span>
						Loading...
					{:else}
						Continue to Payment →
					{/if}
				</Button>
			</div>
		{:else}
			<Alert type="error">No offer selected. Please go back and select an offer.</Alert>
			<Button variant="secondary" on:click={handleBack} class="mt-4">← Back to Selection</Button>
		{/if}
	</Card>
		</div>

		<!-- Summary Sidebar Column -->
		<div class="summary-column">
			<ContractSummary {offer} {preview} loading={previewLoading} error={previewError} />
		</div>
	</div>
</div>

<style>
	/* Desktop: Two-column layout with sticky sidebar */
	.contract-flow-layout {
		display: flex;
		gap: 2rem;
		align-items: flex-start;
	}

	.form-column {
		flex: 2;
		min-width: 0;
	}

	.summary-column {
		flex: 1;
		max-width: 400px;
		min-width: 320px;
		position: sticky;
		top: 1.5rem;
		align-self: flex-start;
	}

	/* Mobile: Single column, summary on top */
	@media (max-width: 991px) {
		.contract-flow-layout {
			flex-direction: column-reverse;
		}

		.summary-column {
			position: static;
			max-width: 100%;
			width: 100%;
			order: -1;
			margin-bottom: 1.5rem;
		}

		.form-column {
			width: 100%;
		}
	}
</style>
