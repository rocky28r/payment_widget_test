<script>
	import { onMount } from 'svelte';
	import { contractFlowStore } from '$lib/stores/contractFlow.js';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	let contractNumber = $contractFlowStore.contractNumber;
	let offer = $contractFlowStore.selectedOffer;

	onMount(() => {
		// Auto-clear session after 5 seconds
		setTimeout(() => {
			console.log('Clearing session after successful contract creation');
			contractFlowStore.reset();
		}, 5000);
	});

	function handleNewContract() {
		contractFlowStore.reset();
	}
</script>

<div class="screen">
	<Card>
		<div class="text-center py-8">
			<!-- Success Icon - More subtle and modern -->
			<div class="flex justify-center mb-6">
				<div class="w-16 h-16 bg-success-50 rounded-full flex items-center justify-center">
					<svg
						class="w-8 h-8 text-success-600"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2.5"
							d="M5 13l4 4L19 7"
						/>
					</svg>
				</div>
			</div>

			<h2 class="text-3xl font-bold text-gray-900 mb-2">Congratulations!</h2>
			<p class="text-lg text-gray-600 mb-8">Your membership has been successfully created.</p>

			{#if contractNumber}
				<div class="mb-6">
					<p class="text-sm font-medium text-gray-500 mb-2">Contract Number</p>
					<p class="text-2xl font-bold text-gray-900">{contractNumber}</p>
				</div>
			{/if}

			{#if offer}
				<div class="text-left bg-gray-50 rounded-lg p-6 mb-6 shadow-soft">
					<h3 class="font-semibold text-gray-900 mb-2">Membership Details</h3>
					<p class="text-gray-700">{offer.name}</p>
				</div>
			{/if}

			<div class="warning-box mb-6">
				<p class="text-sm text-gray-800">
					You will receive a confirmation email shortly with all the details of your membership.
				</p>
			</div>

			<div class="flex justify-center gap-4">
				<Button variant="primary" on:click={handleNewContract}>Create Another Contract</Button>
			</div>
		</div>
	</Card>
</div>
