<script>
	export let title = null;
	export let compact = false;
</script>

<div class="card bg-base-100 shadow-xl" class:card-compact={compact}>
	<div class="card-body">
		{#if title}
			<h2 class="card-title">{title}</h2>
		{/if}
		<slot />
	</div>
</div>
