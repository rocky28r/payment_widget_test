<script>
	export let title = null;
	export let compact = false;
</script>

<div class="card bg-base-100 shadow-soft" class:card-compact={compact}>
	<div class="card-body">
		{#if title}
			<h2 class="card-title text-gray-900 font-semibold">{title}</h2>
		{:else}
			<slot name="title" />
		{/if}
		<slot />
	</div>
</div>
