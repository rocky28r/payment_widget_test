<script>
	import { configStore, updateConfig } from '$lib/stores/config.js';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';

	export let show = false;

	let apiKey = '';
	let apiBaseUrl = '';

	// Load current config when modal opens
	$: if (show) {
		apiKey = $configStore.apiKey;
		apiBaseUrl = $configStore.apiBaseUrl;
	}

	function close() {
		show = false;
	}

	function save() {
		updateConfig({
			apiKey,
			apiBaseUrl
		});
		show = false;
	}

	function handleBackdropClick(e) {
		if (e.target === e.currentTarget) {
			close();
		}
	}
</script>

{#if show}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div
		class="fixed inset-0 z-50 overflow-y-auto bg-gray-500 bg-opacity-75"
		on:click={handleBackdropClick}
	>
		<div
			class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0"
		>
			<!-- Modal panel -->
			<div
				class="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6"
			>
				<div class="absolute top-0 right-0 pt-4 pr-4">
					<button
						type="button"
						class="bg-white rounded-md text-gray-400 hover:text-gray-500"
						on:click={close}
					>
						<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>

				<div class="sm:flex sm:items-start">
					<div
						class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10"
					>
						<svg
							class="h-6 w-6 text-blue-600"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
							></path>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
							></path>
						</svg>
					</div>
					<div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
						<h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
							Global API Configuration
						</h3>
						<div class="mt-4 space-y-4">
							<Input
								bind:value={apiKey}
								type="password"
								label="API Key"
								placeholder="Enter your API key"
								required
							/>
							<p class="text-xs text-gray-500 -mt-2">
								Used for X-API-KEY header in all API requests
							</p>

							<Input
								bind:value={apiBaseUrl}
								type="url"
								label="API Base URL"
								placeholder="Enter API base URL"
								required
							/>
						</div>
					</div>
				</div>

				<div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
					<Button variant="primary" on:click={save}>Save Configuration</Button>
					<button
						type="button"
						on:click={close}
						class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:mr-3 sm:w-auto sm:text-sm"
					>
						Cancel
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
