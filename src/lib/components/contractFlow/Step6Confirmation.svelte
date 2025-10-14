<script>
	import { onMount } from 'svelte';
	import { contractFlowStore } from '$lib/stores/contractFlow.js';
	import { configStore } from '$lib/stores/config.js';
	import { constructCustomerManagementUrl } from '$lib/utils/format.js';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	let contractNumber = $contractFlowStore.contractNumber;
	let offer = $contractFlowStore.selectedOffer;

	// Construct customer management URL
	$: customerManagementUrl = contractNumber
		? constructCustomerManagementUrl($configStore.apiBaseUrl, contractNumber)
		: null;

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
					<p class="text-sm font-medium text-gray-500 mb-2">Customer ID</p>
					<p class="text-2xl font-bold text-gray-900 mb-3">{contractNumber}</p>

					{#if customerManagementUrl}
						<a
							href={customerManagementUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex items-center gap-2 text-primary hover:text-primary-focus underline text-sm font-medium"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="1.5"
								stroke="currentColor"
								class="w-4 h-4"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
								/>
							</svg>
							Open Customer Account
						</a>
					{/if}
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
