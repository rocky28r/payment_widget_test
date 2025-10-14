<script>
	export let value = '';
	export let type = 'text';
	export let placeholder = '';
	export let error = null;
	export let label = null;
	export let required = false;
	export let disabled = false;
	export let step = undefined;
</script>

<div class="form-control w-full">
	{#if label}
		<label class="label">
			<span class="label-text">
				{label}
				{#if required}<span class="text-error">*</span>{/if}
			</span>
		</label>
	{/if}

	<input
		{type}
		{placeholder}
		{disabled}
		{step}
		bind:value
		class="input input-bordered w-full"
		class:input-error={error}
		on:blur
		on:input
		on:change
	/>

	{#if error}
		<label class="label">
			<span class="label-text-alt text-error">{error}</span>
		</label>
	{/if}
</div>
