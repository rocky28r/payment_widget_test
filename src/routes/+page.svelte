<script>
	import SessionForm from '$lib/components/payment/SessionForm.svelte';
	import WidgetContainer from '$lib/components/payment/WidgetContainer.svelte';
</script>

<svelte:head>
	<title>Universal Payment Component Test</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<h1 class="text-3xl font-bold mb-8">Universal Payment Component Test Suite</h1>

	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Session Creation -->
		<div>
			<SessionForm />
		</div>

		<!-- Component Container -->
		<div>
			<WidgetContainer />
		</div>
	</div>

	<!-- Instructions -->
	<div class="mt-8">
		<div class="alert alert-info">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				class="stroke-current shrink-0 w-6 h-6"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
				></path>
			</svg>
			<div>
				<h3 class="font-bold">How to use:</h3>
				<ol class="list-decimal list-inside mt-2 space-y-1">
					<li>Click the "Config" button in the navigation to set your API key and base URL</li>
					<li>Fill in the payment session form (amount and scope are required)</li>
					<li>Click "Create Payment Session" to generate a session token</li>
					<li>The universal payment component will automatically mount in the right panel</li>
				</ol>
			</div>
		</div>
	</div>
</div>
