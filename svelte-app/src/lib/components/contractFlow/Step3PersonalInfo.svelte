<script>
	import { contractFlowStore, canProceedToStep4 } from '$lib/stores/contractFlow.js';
	import { configStore } from '$lib/stores/config.js';
	import { ContractFlowApi } from '$lib/api/contractFlow.js';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';

	let personalInfo = $contractFlowStore.personalInfo;

	$: previewLoading = $contractFlowStore.previewLoading;
	$: previewError = $contractFlowStore.previewError;
	$: hasPersonalInfo = personalInfo.firstName && personalInfo.lastName &&
	                     personalInfo.email && personalInfo.street &&
	                     personalInfo.zip && personalInfo.city &&
	                     personalInfo.dateOfBirth && personalInfo.startDate;

	function updateField(field, value) {
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
			updateField(key, value);
		});

		personalInfo = { ...personalInfo, ...testData };
	}

	async function handleNext() {
		if (!hasPersonalInfo) return;

		// Personal info is already saved to store via updateField calls
		// Re-fetch preview with complete personal info (in case user went back and changed anything)
		contractFlowStore.setPreviewLoading(true);
		contractFlowStore.clearPreviewError();

		try {
			const api = new ContractFlowApi($configStore.apiBaseUrl, $configStore.apiKey);
			const termId = $contractFlowStore.selectedTermId;

			if (!termId) {
				throw new Error('No term ID selected. Please go back and select a term.');
			}

			// Build customer object with complete info
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
				contractOfferTermId: termId,
				startDate: personalInfo.startDate
			};

			if (personalInfo.voucherCode) {
				contract.voucherCode = personalInfo.voucherCode;
			}

			const previewRequest = {
				contract: contract,
				customer: customer
			};

			console.log('Re-fetching preview with complete personal info:', previewRequest);

			const preview = await api.createContractPreview(previewRequest);

			console.log('Preview API response:', preview);

			contractFlowStore.setPreview(preview);

			// Proceed to payment step
			contractFlowStore.nextStep();
		} catch (err) {
			console.error('Preview API failed:', err);
			const errorMessage = err.message || 'Failed to load contract preview. Please try again.';
			contractFlowStore.setPreviewError(errorMessage);
		}
	}

	function retryPreview() {
		handleNext();
	}

	function handleBack() {
		contractFlowStore.previousStep();
	}
</script>

<div class="screen">
	<Card title="Personal Information">
		<!-- Preview Error Alert -->
		{#if previewError}
			<Alert type="error" class="mb-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="font-semibold mb-1">Preview Error</p>
						<p>{previewError}</p>
					</div>
					<Button variant="secondary" size="sm" on:click={retryPreview} disabled={previewLoading}>
						{previewLoading ? 'Retrying...' : 'Retry'}
					</Button>
				</div>
			</Alert>
		{/if}

		<form on:submit|preventDefault={handleNext} class="space-y-6">
			<!-- Personal Information Section -->
			<div class="bg-base-200 rounded-lg p-4">
				<div class="flex items-center justify-between mb-4">
					<h3 class="font-bold text-lg">Personal Information</h3>
					<button type="button" class="btn btn-ghost btn-sm" on:click={fillTestData}>
						Fill Test Data
					</button>
				</div>

				<div class="space-y-4">
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Input
							label="First Name"
							bind:value={personalInfo.firstName}
							on:input={(e) => updateField('firstName', e.target.value)}
							required
							placeholder="Max"
						/>
						<Input
							label="Last Name"
							bind:value={personalInfo.lastName}
							on:input={(e) => updateField('lastName', e.target.value)}
							required
							placeholder="Mustermann"
						/>
					</div>

					<Input
						label="Email"
						type="email"
						bind:value={personalInfo.email}
						on:input={(e) => updateField('email', e.target.value)}
						required
						placeholder="max@example.com"
					/>

					<Input
						label="Phone Number"
						type="tel"
						bind:value={personalInfo.phone}
						on:input={(e) => updateField('phone', e.target.value)}
						placeholder="+49 123 456789"
					/>
				</div>
			</div>

			<!-- Address Section -->
			<div class="bg-base-200 rounded-lg p-4">
				<h3 class="font-bold text-lg mb-4">Address</h3>

				<div class="space-y-4">
					<Input
						label="Street Address"
						bind:value={personalInfo.street}
						on:input={(e) => updateField('street', e.target.value)}
						required
						placeholder="Hauptstraße 123"
					/>

					<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div class="md:col-span-2">
							<Input
								label="City"
								bind:value={personalInfo.city}
								on:input={(e) => updateField('city', e.target.value)}
								required
								placeholder="Berlin"
							/>
						</div>
						<Input
							label="Postal Code"
							bind:value={personalInfo.zip}
							on:input={(e) => updateField('zip', e.target.value)}
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
							on:change={(e) => updateField('countryCode', e.target.value)}
							required
							class="select select-bordered w-full"
						>
							<option value="">Select a country</option>
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

			<!-- Actions -->
			<div class="flex justify-between pt-6 border-t">
				<Button type="button" variant="secondary" on:click={handleBack} disabled={previewLoading}>
					← Back
				</Button>
				<Button type="submit" variant="primary" disabled={!hasPersonalInfo || previewLoading}>
					{#if previewLoading}
						<span class="loading loading-spinner loading-sm"></span>
						Loading Preview...
					{:else}
						Continue to Payment →
					{/if}
				</Button>
			</div>
		</form>
	</Card>
</div>
