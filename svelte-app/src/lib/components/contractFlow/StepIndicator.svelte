<script>
	export let currentStep = 1;

	const steps = [
		{ number: 1, label: 'Select Membership' },
		{ number: 2, label: 'Details' },
		{ number: 3, label: 'Personal Info' },
		{ number: 4, label: 'Payment' },
		{ number: 5, label: 'Confirmation' }
	];
</script>

<div class="flex items-center justify-center space-x-4">
	{#each steps as step, index}
		<div class="flex items-center">
			<!-- Step Circle -->
			<div class="flex flex-col items-center">
				<div
					class="w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all {currentStep >=
					step.number
						? 'bg-blue-600 text-white'
						: 'bg-gray-200 text-gray-500'}"
				>
					{#if currentStep > step.number}
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M5 13l4 4L19 7"
							/>
						</svg>
					{:else}
						{step.number}
					{/if}
				</div>
				<span
					class="text-xs mt-1 font-medium {currentStep === step.number
						? 'text-blue-600'
						: 'text-gray-500'}"
				>
					{step.label}
				</span>
			</div>

			<!-- Connector Line -->
			{#if index < steps.length - 1}
				<div
					class="w-12 h-1 mx-2 {currentStep > step.number ? 'bg-blue-600' : 'bg-gray-200'}"
				></div>
			{/if}
		</div>
	{/each}
</div>
