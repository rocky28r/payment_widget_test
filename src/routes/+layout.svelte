<script>
	import '../app.css';
	import Navigation from '$lib/components/layout/Navigation.svelte';
	import ConfigModal from '$lib/components/layout/ConfigModal.svelte';
	import WidgetConfigModal from '$lib/components/layout/WidgetConfigModal.svelte';

	let showConfig = false;
	let showWidgetConfig = false;

	function openConfigModal() {
		showConfig = true;
	}

	function openWidgetConfigModal() {
		showWidgetConfig = true;
	}
</script>

<div class="min-h-screen bg-gray-50">
	<Navigation showConfigModal={openConfigModal} showWidgetConfigModal={openWidgetConfigModal} />
	<ConfigModal bind:show={showConfig} />
	<WidgetConfigModal bind:show={showWidgetConfig} />

	<main>
		<slot />
	</main>
</div>
