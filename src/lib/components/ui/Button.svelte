<script>
	/**
	 * @type {'primary' | 'secondary' | 'accent' | 'ghost'}
	 */
	export let variant = 'primary';

	/**
	 * @type {'xs' | 'sm' | 'md' | 'lg'}
	 */
	export let size = 'md';

	export let loading = false;
	export let disabled = false;
	export let type = 'button';

	const variantClass = {
		primary: 'btn-primary',
		secondary: 'btn-outline border-2 border-primary bg-transparent text-primary hover:bg-primary hover:text-white hover:border-primary',
		accent: 'btn-accent',
		ghost: 'btn-ghost'
	};

	const sizeClass = {
		xs: 'btn-xs',
		sm: 'btn-sm',
		md: '',
		lg: 'btn-lg'
	};
</script>

<button
	{type}
	class="btn {variantClass[variant]} {sizeClass[size]} transition-colors"
	class:loading
	disabled={disabled || loading}
	on:click
>
	<slot />
</button>
