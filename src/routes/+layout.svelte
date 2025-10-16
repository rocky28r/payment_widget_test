<script>
	import '../app.css';
	import Navigation from '$lib/components/layout/Navigation.svelte';
	import ConfigModal from '$lib/components/layout/ConfigModal.svelte';
	import WidgetConfigModal from '$lib/components/layout/WidgetConfigModal.svelte';
	import DebugConsole from '$lib/components/debug/DebugConsole.svelte';
	import { debugConsoleExpanded } from '$lib/stores/debugLog.js';

	let showConfig = false;
	let showWidgetConfig = false;

	function openConfigModal() {
		showConfig = true;
	}

	function openWidgetConfigModal() {
		showWidgetConfig = true;
	}

	// Add padding to main when console is expanded (max-height 400px + header ~48px = ~450px)
	$: mainPaddingBottom = $debugConsoleExpanded ? 'pb-[460px]' : 'pb-16';
</script>

<div class="min-h-screen bg-gray-50">
	<Navigation showConfigModal={openConfigModal} showWidgetConfigModal={openWidgetConfigModal} />
	<ConfigModal bind:show={showConfig} />
	<WidgetConfigModal bind:show={showWidgetConfig} />

	<main class="{mainPaddingBottom}">
		<slot />
	</main>

	<!-- Global Debug Console -->
	<DebugConsole />
</div>
