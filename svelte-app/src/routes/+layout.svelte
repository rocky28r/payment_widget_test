<script>
	import '../app.css';
	import Navigation from '$lib/components/layout/Navigation.svelte';
	import ConfigModal from '$lib/components/layout/ConfigModal.svelte';

	let showConfig = false;

	function openConfigModal() {
		showConfig = true;
	}
</script>

<div class="min-h-screen bg-gray-50">
	<Navigation showConfigModal={openConfigModal} />
	<ConfigModal bind:show={showConfig} />

	<main>
		<slot />
	</main>
</div>
