<script>
	import { contractFlowStore } from '$lib/stores/contractFlow.js';

	export let currentStep = 1;

	// Step 3 (Personal Info) has been merged into Step 2
	// Internal steps: 1, 2, 4, 5, 6 -> Display steps: 1, 2, 3, 4, 5
	const steps = [
		{ number: 1, displayNumber: 1, label: 'Select Membership' },
		{ number: 2, displayNumber: 2, label: 'Details' },
		{ number: 4, displayNumber: 3, label: 'Payment' },
		{ number: 5, displayNumber: 4, label: 'Review' },
		{ number: 6, displayNumber: 5, label: 'Confirmation' }
	];

	// Navigate to a completed step
	function handleStepClick(step) {
		// Only allow backwards navigation to completed steps
		if (currentStep > step.number) {
			contractFlowStore.goToStep(step.number);
		}
	}

	// Check if a step is clickable (completed and not current)
	function isClickable(step) {
		return currentStep > step.number;
	}
</script>

<div class="flex items-center justify-center space-x-4">
	{#each steps as step, index}
		<div class="flex items-center">
			<!-- Step Circle -->
			<div class="flex flex-col items-center">
				<button
					type="button"
					on:click={() => handleStepClick(step)}
					disabled={!isClickable(step)}
					class="w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all {currentStep >=
					step.number
						? 'bg-primary text-white'
						: 'bg-gray-200 text-gray-500'} {isClickable(step)
						? 'cursor-pointer hover:scale-110 hover:shadow-lg'
						: 'cursor-default'}"
					aria-label="Go to {step.label}"
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
						{step.displayNumber}
					{/if}
				</button>
				<span
					class="text-xs mt-1 font-medium {currentStep === step.number
						? 'text-primary'
						: 'text-gray-500'} {isClickable(step) ? 'cursor-pointer' : ''}"
					on:click={() => handleStepClick(step)}
					on:keydown={(e) => e.key === 'Enter' && handleStepClick(step)}
					role={isClickable(step) ? 'button' : 'text'}
					tabindex={isClickable(step) ? 0 : -1}
				>
					{step.label}
				</span>
			</div>

			<!-- Connector Line -->
			{#if index < steps.length - 1}
				<div
					class="w-12 h-1 mx-2 {currentStep > step.number ? 'bg-primary' : 'bg-gray-200'}"
				></div>
			{/if}
		</div>
	{/each}
</div>
