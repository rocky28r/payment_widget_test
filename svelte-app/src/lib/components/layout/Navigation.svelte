<script>
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { contractFlowStore } from '$lib/stores/contractFlow.js';

	export let showConfigModal = () => {};
	export let showWidgetConfigModal = () => {};

	const routes = [
		{ path: '/', label: 'Payment Widget Test', id: 'payment-test' },
		{ path: '/contract-flow', label: 'Contract Flow', id: 'contract-flow' }
	];

	$: currentPath = $page.url.pathname;

	function isRouteActive(route) {
		if (route.path === '/') {
			return currentPath === '/';
		}
		return currentPath.startsWith(route.path);
	}

	function handleStartOver() {
		contractFlowStore.reset();
		goto('/contract-flow');
	}
</script>

<nav class="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="flex items-center justify-between h-16">
			<!-- Logo/Brand -->
			<div class="flex items-center space-x-2">
				<svg
					class="w-8 h-8 text-blue-600"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
					></path>
				</svg>
				<span class="text-lg font-semibold">Payment Test Bench (Svelte)</span>
			</div>

			<!-- Navigation Links -->
			<div class="flex items-center space-x-4">
				{#each routes as route}
					{@const isActive = isRouteActive(route)}
					<a
						href={route.path}
						class="px-4 py-2 rounded-md transition"
						class:bg-blue-50={isActive}
						class:text-blue-600={isActive}
						class:font-semibold={isActive}
						class:text-gray-700={!isActive}
						class:hover:bg-blue-50={!isActive}
					>
						{route.label}
					</a>
				{/each}

				<!-- Global API Configuration Button -->
				<button
					on:click={showConfigModal}
					class="px-3 py-2 rounded-md transition hover:bg-gray-100 text-gray-700 flex items-center space-x-1"
					title="Global API Configuration"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
					<span class="text-sm">API Config</span>
				</button>

				<!-- Widget Configuration Button -->
				<button
					on:click={showWidgetConfigModal}
					class="px-3 py-2 rounded-md transition hover:bg-purple-100 text-purple-700 flex items-center space-x-1"
					title="Payment Widget Configuration"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
						></path>
					</svg>
					<span class="text-sm">Widget Config</span>
				</button>

				<!-- Start Over Button (only show in contract flow) -->
				{#if currentPath === '/contract-flow'}
					<button
						on:click={handleStartOver}
						class="px-3 py-2 rounded-md transition hover:bg-red-100 text-red-700 flex items-center space-x-1"
						title="Start over - clear all data"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
							class="w-5 h-5"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
							/>
						</svg>
						<span class="text-sm">Start Over</span>
					</button>
				{/if}
			</div>
		</div>
	</div>
</nav>

<!-- Spacer to prevent content from going under fixed nav -->
<div class="h-16"></div>
