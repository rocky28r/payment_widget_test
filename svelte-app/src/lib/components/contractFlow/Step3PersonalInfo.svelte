<script>
	import { contractFlowStore, canProceedToStep4 } from '$lib/stores/contractFlow.js';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	let personalInfo = $contractFlowStore.personalInfo;

	$: canProceed = $canProceedToStep4;

	function updateField(field, value) {
		personalInfo = { ...personalInfo, [field]: value };
		contractFlowStore.updatePersonalInfo({ [field]: value });
	}

	function fillTestData() {
		const testData = {
			firstName: 'Max',
			lastName: 'Mustermann',
			email: 'max.mustermann@example.com',
			phone: '+49 123 456789',
			street: 'Musterstraße',
			houseNumber: '123',
			zip: '12345',
			city: 'Berlin',
			country: 'DE',
			dateOfBirth: '1990-01-01'
		};

		Object.entries(testData).forEach(([key, value]) => {
			updateField(key, value);
		});

		personalInfo = testData;
	}

	async function handleNext() {
		if (!canProceed) return;

		// Personal info is already saved to store via updateField calls
		// Proceed directly to payment step
		contractFlowStore.nextStep();
	}

	function handleBack() {
		contractFlowStore.previousStep();
	}
</script>

<div class="screen">
	<Card title="Personal Information">
		<form on:submit|preventDefault={handleNext} class="space-y-4">
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
				label="Phone"
				type="tel"
				bind:value={personalInfo.phone}
				on:input={(e) => updateField('phone', e.target.value)}
				placeholder="+49 123 456789"
			/>

			<div class="grid grid-cols-3 gap-4">
				<div class="col-span-2">
					<Input
						label="Street"
						bind:value={personalInfo.street}
						on:input={(e) => updateField('street', e.target.value)}
						required
						placeholder="Musterstraße"
					/>
				</div>
				<Input
					label="Number"
					bind:value={personalInfo.houseNumber}
					on:input={(e) => updateField('houseNumber', e.target.value)}
					placeholder="123"
				/>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<Input
					label="ZIP Code"
					bind:value={personalInfo.zip}
					on:input={(e) => updateField('zip', e.target.value)}
					required
					placeholder="12345"
				/>
				<Input
					label="City"
					bind:value={personalInfo.city}
					on:input={(e) => updateField('city', e.target.value)}
					required
					placeholder="Berlin"
				/>
			</div>

			<Input
				label="Date of Birth"
				type="date"
				bind:value={personalInfo.dateOfBirth}
				on:input={(e) => updateField('dateOfBirth', e.target.value)}
			/>

			<!-- Test Data Button -->
			<div class="pt-4">
				<button type="button" class="btn btn-ghost btn-sm" on:click={fillTestData}>
					Fill Test Data
				</button>
			</div>

			<!-- Actions -->
			<div class="flex justify-between pt-6 border-t">
				<Button type="button" variant="secondary" on:click={handleBack}>← Back</Button>
				<Button type="submit" variant="primary" disabled={!canProceed}>
					Continue →
				</Button>
			</div>
		</form>
	</Card>
</div>
