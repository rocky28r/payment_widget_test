<script>
	import {
		widgetConfigStore,
		STYLING_PRESETS,
		ENVIRONMENTS,
		COUNTRIES,
		LOCALES
	} from '$lib/stores/widgetConfig.js';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';

	export let show = false;

	let environment = '';
	let countryCode = '';
	let locale = '';
	let selectedPreset = '';
	let customStyling = {};
	let useRubiksUI = false;
	let devMode = false;

	// Load current config when modal opens
	$: if (show) {
		environment = $widgetConfigStore.environment;
		countryCode = $widgetConfigStore.countryCode;
		locale = $widgetConfigStore.locale;
		selectedPreset = $widgetConfigStore.selectedPreset;
		customStyling = { ...$widgetConfigStore.customStyling };
		useRubiksUI = $widgetConfigStore.featureFlags.useRubiksUI;
		devMode = $widgetConfigStore.devMode;
	}

	function close() {
		show = false;
	}

	function save() {
		// Save all settings
		widgetConfigStore.setEnvironment(environment);
		widgetConfigStore.setCountryCode(countryCode);
		widgetConfigStore.setLocale(locale);
		widgetConfigStore.setPreset(selectedPreset);
		widgetConfigStore.setFeatureFlag('useRubiksUI', useRubiksUI);
		widgetConfigStore.setDevMode(devMode);

		// If custom preset, save custom styling
		if (selectedPreset === 'custom') {
			widgetConfigStore.updateStyling(customStyling);
		}

		show = false;
	}

	function reset() {
		if (confirm('Are you sure you want to reset widget configuration to defaults?')) {
			widgetConfigStore.reset();
			close();
		}
	}

	function handleBackdropClick(e) {
		if (e.target === e.currentTarget) {
			close();
		}
	}

	// Update custom styling when preset changes
	$: if (selectedPreset !== 'custom' && STYLING_PRESETS[selectedPreset]) {
		customStyling = { ...STYLING_PRESETS[selectedPreset].colors };
	}
</script>

{#if show}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div
		class="fixed inset-0 z-50 overflow-y-auto bg-gray-500 bg-opacity-75"
		on:click={handleBackdropClick}
	>
		<div class="flex items-center justify-center min-h-screen px-4 py-8 text-center sm:block sm:p-0">
			<!-- Modal panel -->
			<div
				class="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full sm:p-6"
			>
				<div class="absolute top-0 right-0 pt-4 pr-4">
					<button
						type="button"
						class="bg-white rounded-md text-gray-400 hover:text-gray-500"
						on:click={close}
					>
						<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>

				<div class="sm:flex sm:items-start">
					<div
						class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-purple-100 sm:mx-0 sm:h-10 sm:w-10"
					>
						<svg
							class="h-6 w-6 text-purple-600"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
							></path>
						</svg>
					</div>
					<div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
						<h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
							Payment Widget Configuration
						</h3>

						<div class="mt-4 space-y-6 max-h-[70vh] overflow-y-auto pr-2">
							<!-- Base Settings -->
							<div class="bg-gray-50 p-4 rounded-lg">
								<h4 class="text-md font-semibold mb-3">Base Settings</h4>
								<div class="space-y-4">
									<div>
										<label class="block text-sm font-medium text-gray-700 mb-2">
											Environment
										</label>
										<select
											bind:value={environment}
											class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
										>
											{#each ENVIRONMENTS as env}
												<option value={env}>{env}</option>
											{/each}
										</select>
										<p class="text-xs text-gray-500 mt-1">
											Select payment environment (test, sandbox, or live)
										</p>
									</div>

									<div>
										<label class="block text-sm font-medium text-gray-700 mb-2">
											Country Code
										</label>
										<select
											bind:value={countryCode}
											class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
										>
											{#each COUNTRIES as country}
												<option value={country.code}>{country.name} ({country.code})</option>
											{/each}
										</select>
										<p class="text-xs text-gray-500 mt-1">ISO country code for payment methods</p>
									</div>

									<div>
										<label class="block text-sm font-medium text-gray-700 mb-2">Locale</label>
										<select
											bind:value={locale}
											class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
										>
											{#each LOCALES as loc}
												<option value={loc.code}>{loc.name} ({loc.code})</option>
											{/each}
										</select>
										<p class="text-xs text-gray-500 mt-1">Language and region format</p>
									</div>
								</div>
							</div>

							<!-- Styling Presets -->
							<div class="bg-gray-50 p-4 rounded-lg">
								<h4 class="text-md font-semibold mb-3">Styling</h4>

								<div class="mb-4">
									<label class="block text-sm font-medium text-gray-700 mb-2">
										Styling Preset
									</label>
									<div class="grid grid-cols-2 gap-2">
										{#each Object.entries(STYLING_PRESETS) as [key, preset]}
											<button
												type="button"
												class="px-4 py-3 border-2 rounded-lg text-left transition-all hover:border-purple-300"
												class:border-purple-500={selectedPreset === key}
												class:bg-purple-50={selectedPreset === key}
												class:border-gray-300={selectedPreset !== key}
												on:click={() => (selectedPreset = key)}
											>
												<div class="font-semibold">{preset.name}</div>
												<div class="flex gap-1 mt-2">
													<div
														class="w-6 h-6 rounded border"
														style="background-color: {preset.colors.primaryColor}"
														title="Primary"
													></div>
													<div
														class="w-6 h-6 rounded border"
														style="background-color: {preset.colors.secondaryColor}"
														title="Secondary"
													></div>
													<div
														class="w-6 h-6 rounded border"
														style="background-color: {preset.colors.textColorMain}"
														title="Text Main"
													></div>
												</div>
											</button>
										{/each}
										<button
											type="button"
											class="px-4 py-3 border-2 rounded-lg text-left transition-all hover:border-purple-300"
											class:border-purple-500={selectedPreset === 'custom'}
											class:bg-purple-50={selectedPreset === 'custom'}
											class:border-gray-300={selectedPreset !== 'custom'}
											on:click={() => (selectedPreset = 'custom')}
										>
											<div class="font-semibold">Custom</div>
											<div class="text-sm text-gray-600">Configure manually</div>
										</button>
									</div>
								</div>

								<!-- Custom Styling Details -->
								{#if selectedPreset === 'custom'}
									<div class="border-t pt-4 mt-4 space-y-3">
										<h5 class="text-sm font-semibold text-gray-700 mb-2">Custom Colors</h5>
										<div class="grid grid-cols-2 gap-3">
											<div>
												<label class="block text-xs font-medium text-gray-700 mb-1">
													Primary Color
												</label>
												<input
													type="color"
													bind:value={customStyling.primaryColor}
													class="w-full h-10 rounded border border-gray-300"
												/>
											</div>
											<div>
												<label class="block text-xs font-medium text-gray-700 mb-1">
													Secondary Color
												</label>
												<input
													type="color"
													bind:value={customStyling.secondaryColor}
													class="w-full h-10 rounded border border-gray-300"
												/>
											</div>
											<div>
												<label class="block text-xs font-medium text-gray-700 mb-1">
													Main Text Color
												</label>
												<input
													type="color"
													bind:value={customStyling.textColorMain}
													class="w-full h-10 rounded border border-gray-300"
												/>
											</div>
											<div>
												<label class="block text-xs font-medium text-gray-700 mb-1">
													Secondary Text Color
												</label>
												<input
													type="color"
													bind:value={customStyling.textColorSecondary}
													class="w-full h-10 rounded border border-gray-300"
												/>
											</div>
											<div>
												<label class="block text-xs font-medium text-gray-700 mb-1">
													Border Color
												</label>
												<input
													type="color"
													bind:value={customStyling.borderColor}
													class="w-full h-10 rounded border border-gray-300"
												/>
											</div>
										</div>
										<div class="grid grid-cols-2 gap-3">
											<div>
												<label class="block text-xs font-medium text-gray-700 mb-1">
													Border Radius
												</label>
												<input
													type="text"
													bind:value={customStyling.borderRadius}
													placeholder="4px"
													class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
												/>
											</div>
											<div>
												<label class="block text-xs font-medium text-gray-700 mb-1">
													Box Shadow
												</label>
												<input
													type="text"
													bind:value={customStyling.boxShadow}
													placeholder="0 2px 4px rgba(0,0,0,0.1)"
													class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
												/>
											</div>
										</div>
									</div>
								{:else}
									<!-- Show current preset colors -->
									<div class="border-t pt-4 mt-4">
										<h5 class="text-sm font-semibold text-gray-700 mb-2">Preview Colors</h5>
										<div class="grid grid-cols-3 gap-2 text-xs">
											<div>
												<div
													class="w-full h-8 rounded border mb-1"
													style="background-color: {customStyling.primaryColor}"
												></div>
												<div class="text-gray-600">Primary</div>
											</div>
											<div>
												<div
													class="w-full h-8 rounded border mb-1"
													style="background-color: {customStyling.secondaryColor}"
												></div>
												<div class="text-gray-600">Secondary</div>
											</div>
											<div>
												<div
													class="w-full h-8 rounded border mb-1"
													style="background-color: {customStyling.textColorMain}"
												></div>
												<div class="text-gray-600">Text Main</div>
											</div>
											<div>
												<div
													class="w-full h-8 rounded border mb-1"
													style="background-color: {customStyling.textColorSecondary}"
												></div>
												<div class="text-gray-600">Text Secondary</div>
											</div>
											<div>
												<div
													class="w-full h-8 rounded border mb-1"
													style="background-color: {customStyling.borderColor}"
												></div>
												<div class="text-gray-600">Border</div>
											</div>
										</div>
										<div class="mt-3 text-xs text-gray-600">
											<div><strong>Border Radius:</strong> {customStyling.borderRadius}</div>
											<div><strong>Box Shadow:</strong> {customStyling.boxShadow || 'none'}</div>
										</div>
									</div>
								{/if}
							</div>

							<!-- Feature Flags -->
							<div class="bg-gray-50 p-4 rounded-lg">
								<h4 class="text-md font-semibold mb-3">Feature Flags</h4>
								<div class="space-y-3">
									<label class="flex items-center space-x-3 cursor-pointer">
										<input type="checkbox" bind:checked={useRubiksUI} class="w-4 h-4" />
										<div>
											<div class="font-medium text-sm">Use Rubiks UI</div>
											<div class="text-xs text-gray-600">
												Enable Rubiks Styleguide components (modern design system)
											</div>
										</div>
									</label>
								</div>
							</div>

							<!-- Developer Options -->
							<div class="bg-gray-50 p-4 rounded-lg">
								<h4 class="text-md font-semibold mb-3">Developer Options</h4>
								<div class="space-y-3">
									<label class="flex items-center space-x-3 cursor-pointer">
										<input type="checkbox" bind:checked={devMode} class="w-4 h-4" />
										<div>
											<div class="font-medium text-sm">Development Mode</div>
											<div class="text-xs text-gray-600">
												Show i18n keys instead of translated text (debugging)
											</div>
										</div>
									</label>
								</div>
							</div>
						</div>
					</div>
				</div>

				<div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-2">
					<Button variant="primary" on:click={save}>Save Configuration</Button>
					<button
						type="button"
						on:click={reset}
						class="inline-flex justify-center rounded-md border border-red-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:w-auto sm:text-sm"
					>
						Reset to Defaults
					</button>
					<button
						type="button"
						on:click={close}
						class="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:w-auto sm:text-sm"
					>
						Cancel
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
