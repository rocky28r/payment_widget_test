<script>
	import {
		profilesStore,
		setActiveProfile,
		createProfile,
		updateProfile,
		deleteProfile
	} from '$lib/stores/config.js';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';

	export let show = false;

	let view = 'list'; // 'list' or 'form'
	let editingProfileId = null;
	let formName = '';
	let formApiKey = '';
	let formBaseUrl = '';
	let showDeleteConfirm = false;
	let profileToDelete = null;

	// Reset view when modal opens
	$: if (show) {
		view = 'list';
		editingProfileId = null;
		showDeleteConfirm = false;
		profileToDelete = null;
	}

	function close() {
		show = false;
	}

	function handleBackdropClick(e) {
		if (e.target === e.currentTarget) {
			close();
		}
	}

	function switchToProfile(profileId) {
		setActiveProfile(profileId);
	}

	function showCreateForm() {
		view = 'form';
		editingProfileId = null;
		formName = '';
		formApiKey = '';
		formBaseUrl = '';
	}

	function showEditForm(profile) {
		view = 'form';
		editingProfileId = profile.id;
		formName = profile.name;
		formApiKey = profile.apiKey;
		formBaseUrl = profile.apiBaseUrl;
	}

	function backToList() {
		view = 'list';
		editingProfileId = null;
	}

	function saveProfile() {
		// Validate
		if (!formName.trim()) {
			alert('Profile name is required');
			return;
		}

		// Check for duplicate names (excluding current profile if editing)
		const isDuplicate = $profilesStore.profiles.some(
			(p) => p.name.toLowerCase() === formName.trim().toLowerCase() && p.id !== editingProfileId
		);

		if (isDuplicate) {
			alert('A profile with this name already exists');
			return;
		}

		if (editingProfileId) {
			// Update existing profile
			updateProfile(editingProfileId, {
				name: formName.trim(),
				apiKey: formApiKey.trim(),
				apiBaseUrl: formBaseUrl.trim()
			});
		} else {
			// Create new profile
			createProfile(formName.trim(), formApiKey.trim(), formBaseUrl.trim(), true);
		}

		backToList();
	}

	function confirmDelete(profile) {
		if ($profilesStore.profiles.length <= 1) {
			alert('Cannot delete the last profile');
			return;
		}
		profileToDelete = profile;
		showDeleteConfirm = true;
	}

	function handleDelete() {
		if (profileToDelete) {
			deleteProfile(profileToDelete.id);
			showDeleteConfirm = false;
			profileToDelete = null;
		}
	}

	function cancelDelete() {
		showDeleteConfirm = false;
		profileToDelete = null;
	}

	function truncateUrl(url) {
		if (url.length > 40) {
			return url.substring(0, 37) + '...';
		}
		return url;
	}
</script>

{#if show}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div
		class="fixed inset-0 z-50 overflow-y-auto bg-gray-500 bg-opacity-75"
		on:click={handleBackdropClick}
	>
		<div
			class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0"
		>
			<!-- Modal panel -->
			<div
				class="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6"
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

				{#if view === 'list'}
					<!-- Profile List View -->
					<div>
						<div class="sm:flex sm:items-start">
							<div
								class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10"
							>
								<svg
									class="h-6 w-6 text-blue-600"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
									></path>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
									></path>
								</svg>
							</div>
							<div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
								<h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
									API Configuration Profiles
								</h3>
							</div>
						</div>

						<!-- Profiles List -->
						<div class="mt-4 space-y-2 max-h-96 overflow-y-auto">
							{#each $profilesStore.profiles as profile (profile.id)}
								<div
									class="border rounded-lg p-3 transition-colors"
									class:bg-blue-50={profile.isActive}
									class:border-blue-300={profile.isActive}
									class:bg-white={!profile.isActive}
									class:border-gray-200={!profile.isActive}
								>
									<div class="flex items-start justify-between">
										<button
											class="flex-1 text-left flex items-center space-x-2"
											on:click={() => switchToProfile(profile.id)}
										>
											<!-- Radio button -->
											<div class="flex-shrink-0">
												{#if profile.isActive}
													<svg
														class="w-5 h-5 text-blue-600"
														fill="currentColor"
														viewBox="0 0 20 20"
													>
														<circle cx="10" cy="10" r="8" />
													</svg>
												{:else}
													<svg
														class="w-5 h-5 text-gray-400"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 20 20"
													>
														<circle cx="10" cy="10" r="8" stroke-width="2" />
													</svg>
												{/if}
											</div>

											<div class="flex-1 min-w-0">
												<div class="flex items-center space-x-2">
													<span
														class="font-medium"
														class:text-blue-900={profile.isActive}
														class:text-gray-900={!profile.isActive}
													>
														{profile.name}
													</span>
													{#if profile.isActive}
														<span class="text-lg">⭐</span>
													{/if}
												</div>
												<p
													class="text-xs truncate"
													class:text-blue-700={profile.isActive}
													class:text-gray-500={!profile.isActive}
													title={profile.apiBaseUrl}
												>
													{truncateUrl(profile.apiBaseUrl)}
												</p>
											</div>
										</button>

										<!-- Action buttons -->
										<div class="flex items-center space-x-1 ml-2">
											<button
												on:click={() => showEditForm(profile)}
												class="p-1.5 rounded hover:bg-gray-200 text-gray-600"
												title="Edit profile"
											>
												<svg
													class="w-4 h-4"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
													/>
												</svg>
											</button>
											<button
												on:click={() => confirmDelete(profile)}
												class="p-1.5 rounded hover:bg-red-100 text-red-600"
												title="Delete profile"
												disabled={$profilesStore.profiles.length <= 1}
												class:opacity-50={$profilesStore.profiles.length <= 1}
												class:cursor-not-allowed={$profilesStore.profiles.length <= 1}
											>
												<svg
													class="w-4 h-4"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M6 18L18 6M6 6l12 12"
													/>
												</svg>
											</button>
										</div>
									</div>
								</div>
							{/each}
						</div>

						<!-- Actions -->
						<div class="mt-5 flex justify-between items-center">
							<button
								on:click={showCreateForm}
								class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
							>
								<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 4v16m8-8H4"
									/>
								</svg>
								Create New Profile
							</button>
							<Button variant="secondary" on:click={close}>Close</Button>
						</div>
					</div>
				{:else if view === 'form'}
					<!-- Profile Form View -->
					<div>
						<button
							on:click={backToList}
							class="mb-4 inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
						>
							<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M15 19l-7-7 7-7"
								/>
							</svg>
							Back to Profiles
						</button>

						<div class="sm:flex sm:items-start">
							<div
								class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10"
							>
								<svg
									class="h-6 w-6 text-blue-600"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
									/>
								</svg>
							</div>
							<div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
								<h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
									{editingProfileId ? 'Edit Profile' : 'Create New Profile'}
								</h3>
								<div class="mt-4 space-y-4">
									<Input
										bind:value={formName}
										type="text"
										label="Profile Name"
										placeholder="e.g., Development, Staging, Production"
										required
									/>

									<Input
										bind:value={formApiKey}
										type="password"
										label="API Key"
										placeholder="Enter your API key"
										required
									/>
									<p class="text-xs text-gray-500 -mt-2">
										Used for X-API-KEY header in all API requests
									</p>

									<Input
										bind:value={formBaseUrl}
										type="url"
										label="API Base URL"
										placeholder="Enter API base URL"
										required
									/>
								</div>
							</div>
						</div>

						<div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
							<Button variant="primary" on:click={saveProfile}>
								{editingProfileId ? 'Save Changes' : 'Create Profile'}
							</Button>
							<button
								type="button"
								on:click={backToList}
								class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:mr-3 sm:w-auto sm:text-sm"
							>
								Cancel
							</button>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Delete Confirmation Dialog -->
	{#if showDeleteConfirm && profileToDelete}
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<div class="fixed inset-0 z-[60] overflow-y-auto bg-gray-900 bg-opacity-50">
			<div class="flex items-center justify-center min-h-screen px-4">
				<div class="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl">
					<h3 class="text-lg font-medium text-gray-900 mb-2">Delete Profile</h3>
					<p class="text-sm text-gray-600 mb-4">
						Are you sure you want to delete "{profileToDelete.name}"? This action cannot be
						undone.
					</p>
					<div class="flex justify-end space-x-3">
						<button
							on:click={cancelDelete}
							class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
						>
							Cancel
						</button>
						<button
							on:click={handleDelete}
							class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
						>
							Delete
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
{/if}
