<script>
	import { page } from '$app/stores';

	export let showConfigModal = () => {};

	const routes = [
		{ path: '/', label: 'Payment Widget Test', id: 'payment-test' }
	];

	$: currentPath = $page.url.pathname;
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
					<a
						href={route.path}
						class="px-4 py-2 rounded-md transition"
						class:bg-blue-50={currentPath === route.path}
						class:text-blue-600={currentPath === route.path}
						class:font-semibold={currentPath === route.path}
						class:text-gray-700={currentPath !== route.path}
						class:hover:bg-blue-50={currentPath !== route.path}
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
					<span class="text-sm">Config</span>
				</button>
			</div>
		</div>
	</div>
</nav>

<!-- Spacer to prevent content from going under fixed nav -->
<div class="h-16"></div>
