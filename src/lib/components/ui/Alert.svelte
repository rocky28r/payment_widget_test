<script>
	/**
	 * @type {'info' | 'success' | 'warning' | 'error'}
	 */
	export let type = 'info';
	export let dismissible = false;

	const typeClass = {
		info: 'alert-info',
		success: 'alert-success',
		warning: 'alert-warning',
		error: 'alert-error'
	};

	function handleDismiss() {
		// Let parent handle removal
	}
</script>

<div class="alert {typeClass[type]}">
	<div class="flex-1">
		<slot />
	</div>
	{#if dismissible}
		<button class="btn btn-ghost btn-sm" on:click={handleDismiss}>✕</button>
	{/if}
</div>
