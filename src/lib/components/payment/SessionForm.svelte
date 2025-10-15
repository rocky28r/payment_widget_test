<script>
	import { ApiClient } from '$lib/api/client.js';
	import { configStore } from '$lib/stores/config.js';
	import { sessionStore } from '$lib/stores/session.js';
	import { debugLog } from '$lib/stores/debugLog.js';
	import { validateField } from '$lib/utils/validation.js';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';

	let formData = {
		amount: '',
		scope: 'ECOM',
		referenceText: '',
		customerId: '',
		finionPayCustomerId: '',
		permittedPaymentChoices: [],
		requireDirectDebitSignature: false
	};

	let errors = {};
	let loading = false;
	let successMessage = '';
	let errorMessage = '';

	const paymentMethods = [
		{ value: 'CREDIT_CARD', label: 'Credit Card' },
		{ value: 'SEPA', label: 'SEPA Direct Debit' },
		{ value: 'BACS', label: 'BACS Direct Debit' },
		{ value: 'CH_DD', label: 'CH Direct Debit' },
		{ value: 'LSV', label: 'LSV' },
		{ value: 'PAYPAL', label: 'PayPal' },
		{ value: 'TWINT', label: 'Twint' },
		{ value: 'IDEAL', label: 'iDEAL' },
		{ value: 'BANCONTACT', label: 'Bancontact' },
		{ value: 'CASH', label: 'Cash' },
		{ value: 'BANK_TRANSFER', label: 'Bank Transfer' }
	];

	function validateFormData() {
		errors = {};

		// Validate required fields
		const amountError = validateField('amount', formData.amount);
		if (amountError !== true) {
			errors.amount = amountError;
		}

		const scopeError = validateField('scope', formData.scope);
		if (scopeError !== true) {
			errors.scope = scopeError;
		}

		const referenceTextError = validateField('referenceText', formData.referenceText);
		if (referenceTextError !== true) {
			errors.referenceText = referenceTextError;
		}

		return Object.keys(errors).length === 0;
	}

	async function handleSubmit() {
		successMessage = '';
		errorMessage = '';

		// Validate config first
		if (!$configStore.apiKey || !$configStore.apiBaseUrl) {
			errorMessage = 'Please configure API key and base URL first (click Config button)';
			return;
		}

		if (!validateFormData()) {
			return;
		}

		loading = true;

		try {
			const apiClient = new ApiClient($configStore.apiBaseUrl, $configStore.apiKey);

			const requestBody = {
				amount: parseFloat(formData.amount),
				scope: formData.scope,
				...(formData.referenceText && { referenceText: formData.referenceText }),
				...(formData.customerId && { customerId: parseInt(formData.customerId, 10) }),
				...(formData.finionPayCustomerId && { finionPayCustomerId: formData.finionPayCustomerId }),
				...(formData.permittedPaymentChoices.length > 0 && {
					permittedPaymentChoices: formData.permittedPaymentChoices
				}),
				...(formData.requireDirectDebitSignature && { requireDirectDebitSignature: true })
			};

			console.log('Creating payment session:', requestBody);

			// Log API request
			debugLog.add('request', 'POST /v1/payments/user-session', {
				endpoint: '/v1/payments/user-session',
				method: 'POST',
				body: requestBody
			});

			const response = await apiClient.post('/v1/payments/user-session', requestBody);

			console.log('Payment session created:', response);

			// Log successful response
			debugLog.add('response', 'Session created successfully', {
				token: response.token,
				tokenValidUntil: response.tokenValidUntil,
				finionPayCustomerId: response.finionPayCustomerId
			});

			// Update session store
			sessionStore.setToken(response.token, response.tokenValidUntil, response.finionPayCustomerId);

			successMessage = `Payment session created successfully! Token: ${response.token.substring(0, 20)}...`;
		} catch (error) {
			console.error('Failed to create payment session:', error);

			// Log error
			debugLog.add('error', 'Failed to create payment session', {
				message: error.message,
				stack: error.stack,
				error: error
			});

			errorMessage = error.message || 'Failed to create payment session';
		} finally {
			loading = false;
		}
	}

	function togglePaymentMethod(method) {
		const index = formData.permittedPaymentChoices.indexOf(method);
		if (index > -1) {
			formData.permittedPaymentChoices = formData.permittedPaymentChoices.filter(
				(m) => m !== method
			);
		} else {
			formData.permittedPaymentChoices = [...formData.permittedPaymentChoices, method];
		}
	}
</script>

<Card title="Create Payment Session">
	{#if successMessage}
		<Alert type="success">{successMessage}</Alert>
	{/if}

	{#if errorMessage}
		<Alert type="error">{errorMessage}</Alert>
	{/if}

	<form on:submit|preventDefault={handleSubmit} class="space-y-4">
		<Input
			label="Amount"
			type="number"
			step="0.01"
			bind:value={formData.amount}
			error={errors.amount}
			placeholder="Enter amount (e.g., 10.50)"
			required
		/>

		<div class="form-control">
			<label class="label">
				<span class="label-text">Scope <span class="text-error">*</span></span>
			</label>
			<select bind:value={formData.scope} class="select select-bordered w-full">
				<option value="ECOM">ECOM</option>
				<option value="MEMBER_ACCOUNT">Member Account</option>
			</select>
		</div>

		<Input
			label="Reference Text"
			bind:value={formData.referenceText}
			error={errors.referenceText}
			placeholder="Bank statement reference"
			required
		/>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<Input
				label="Customer ID"
				type="number"
				bind:value={formData.customerId}
				placeholder="Optional ERP Customer ID"
			/>

			<Input
				label="Finion Pay Customer ID"
				bind:value={formData.finionPayCustomerId}
				placeholder="Optional UUID"
			/>
		</div>

		<!-- Payment Methods -->
		<div class="form-control">
			<label class="label">
				<span class="label-text">Permitted Payment Methods (Optional)</span>
			</label>
			<div class="grid grid-cols-2 md:grid-cols-3 gap-2">
				{#each paymentMethods as method}
					<label class="cursor-pointer label justify-start">
						<input
							type="checkbox"
							checked={formData.permittedPaymentChoices.includes(method.value)}
							on:change={() => togglePaymentMethod(method.value)}
							class="checkbox checkbox-sm checkbox-primary"
						/>
						<span class="label-text ml-2 text-sm">{method.label}</span>
					</label>
				{/each}
			</div>
		</div>

		<!-- Direct Debit Signature -->
		<div class="form-control">
			<label class="cursor-pointer label justify-start">
				<input
					type="checkbox"
					bind:checked={formData.requireDirectDebitSignature}
					class="checkbox checkbox-primary"
				/>
				<span class="label-text ml-3">
					<span class="font-semibold">Require Direct Debit Signature</span>
					<span class="block text-xs text-gray-500 mt-1">
						Shows a signature field for SEPA, CH_DD, and LSV payment methods
					</span>
				</span>
			</label>
		</div>

		<div class="card-actions justify-end mt-6">
			<Button type="submit" variant="primary" {loading}>
				{loading ? 'Creating Session...' : 'Create Payment Session'}
			</Button>
		</div>
	</form>
</Card>
