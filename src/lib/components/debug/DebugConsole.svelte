<script>
	import { debugLog, debugConsoleExpanded } from '$lib/stores/debugLog.js';
	import { onMount } from 'svelte';

	let selectedLog = null;
	let logContainer;

	// Use store for expanded state so layout can react to it
	$: expanded = $debugConsoleExpanded;

	// Auto-scroll to bottom when new logs are added
	$: if ($debugLog.length > 0 && logContainer && expanded) {
		setTimeout(() => {
			logContainer.scrollTop = logContainer.scrollHeight;
		}, 0);
	}

	function formatTime(date) {
		return date.toLocaleTimeString('en-US', {
			hour12: false,
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			fractionalSecondDigits: 3
		});
	}

	function getIcon(type) {
		switch (type) {
			case 'request':
				return '🔵';
			case 'response':
				return '✅';
			case 'widget':
				return '🟢';
			case 'error':
				return '❌';
			default:
				return '📝';
		}
	}

	function toggleDetails(log) {
		if (selectedLog?.id === log.id) {
			selectedLog = null;
		} else {
			selectedLog = log;
		}
	}

	function handleClear() {
		debugLog.clear();
		selectedLog = null;
	}
</script>

<div class="fixed bottom-0 left-0 right-0 z-40 bg-base-300 border-t-2 border-base-content/20">
	<!-- Header -->
	<div class="flex items-center justify-between px-4 py-2 bg-base-200 cursor-pointer" on:click={() => debugConsoleExpanded.set(!$debugConsoleExpanded)}>
		<div class="flex items-center gap-2">
			<span class="font-mono font-bold">Debug Console</span>
			<span class="badge badge-sm">{$debugLog.length} logs</span>
		</div>
		<div class="flex items-center gap-2">
			<button
				class="btn btn-xs btn-ghost"
				on:click|stopPropagation={handleClear}
				disabled={$debugLog.length === 0}
			>
				Clear
			</button>
			<button class="btn btn-xs btn-ghost">
				{expanded ? '▼' : '▲'}
			</button>
		</div>
	</div>

	<!-- Log Content -->
	{#if expanded}
		<div class="flex">
			<!-- Log List -->
			<div
				bind:this={logContainer}
				class="flex-1 overflow-y-auto max-h-[400px] bg-base-300"
			>
				{#if $debugLog.length === 0}
					<div class="p-4 text-center text-base-content/50 font-mono text-sm">
						No logs yet. Create a payment session to see logs.
					</div>
				{:else}
					<div class="divide-y divide-base-content/10">
						{#each $debugLog as log (log.id)}
							<div
								class="p-2 hover:bg-base-200 cursor-pointer transition-colors {selectedLog?.id === log.id ? 'bg-base-200' : ''}"
								on:click={() => toggleDetails(log)}
							>
								<div class="flex items-start gap-2 font-mono text-xs">
									<span class="text-base-content/50">
										{formatTime(log.timestamp)}
									</span>
									<span>{getIcon(log.type)}</span>
									<span class="flex-1">
										{log.message}
									</span>
									{#if log.data}
										<span class="text-base-content/50">
											{selectedLog?.id === log.id ? '▼' : '▶'}
										</span>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Details Panel -->
			{#if selectedLog?.data}
				<div class="w-1/2 border-l border-base-content/20 bg-base-200 overflow-y-auto max-h-[400px]">
					<div class="sticky top-0 bg-base-300 px-4 py-2 border-b border-base-content/20 flex justify-between items-center">
						<span class="font-mono text-xs font-bold">Details</span>
						<button
							class="btn btn-xs btn-ghost"
							on:click={() => selectedLog = null}
						>
							✕
						</button>
					</div>
					<pre class="p-4 text-xs font-mono overflow-x-auto">{JSON.stringify(selectedLog.data, null, 2)}</pre>
				</div>
			{/if}
		</div>
	{/if}
</div>
