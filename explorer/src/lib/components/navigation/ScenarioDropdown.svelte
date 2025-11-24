<script lang="ts">
	/**
	 * ScenarioDropdown Component
	 *
	 * Desktop dropdown overlay for scenario parameter selection.
	 * Positioned relative to ScenarioSelectorPill with click-outside and ESC handling.
	 */
	import { X } from 'lucide-svelte';
	import { navigationState } from '$lib/stores/navigation.svelte';
	import { scenarioState } from '$lib/stores/scenario.svelte';
	import ParameterGroup from './ParameterGroup.svelte';
	import { browser } from '$app/environment';

	// Props
	let {
		scenarios = [],
		baseScenarios = [],
		parameters = {}
	}: {
		scenarios?: any[];
		baseScenarios?: any[];
		parameters?: any;
	} = $props();

	// Local state
	let dropdownRef: HTMLDivElement | undefined;

	// Get scenario parameter metadata from parameters endpoint
	const scenarioParameters = $derived(parameters?.scenarioParameters || {});

	// Get parameter names in alphabetical order
	const parameterNames = $derived(Object.keys(scenarioParameters).sort());

	// Find matching scenario based on temp parameters
	const matchingScenario = $derived.by(() => {
		// Check if all parameters are selected
		const allSelected = parameterNames.every(
			(param) => navigationState.tempParameters[param] !== undefined
		);

		if (!allSelected) return null;

		return scenarioState.findScenarioByParameters(navigationState.tempParameters);
	});

	const matchingCount = $derived(matchingScenario ? 1 : 0);

	// Click outside handler - use capturing phase and check if dropdown is open
	function handleClickOutside(event: MouseEvent) {
		if (!navigationState.scenarioDropdownOpen) return;

		if (dropdownRef && !dropdownRef.contains(event.target as Node)) {
			// Check if click is on the pill button
			const target = event.target as HTMLElement;
			if (target.closest('[aria-label="Select scenario"]')) {
				return; // Let the pill handle the toggle
			}
			navigationState.toggleScenarioDropdown();
		}
	}

	// ESC key handler
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && navigationState.scenarioDropdownOpen) {
			navigationState.toggleScenarioDropdown();
		}
	}

	// Setup and cleanup event listeners
	$effect(() => {
		if (browser && navigationState.scenarioDropdownOpen) {
			// Add listeners with a slight delay to avoid catching the opening click
			const timeoutId = setTimeout(() => {
				document.addEventListener('click', handleClickOutside, true);
				document.addEventListener('keydown', handleKeydown);
			}, 0);

			return () => {
				clearTimeout(timeoutId);
				document.removeEventListener('click', handleClickOutside, true);
				document.removeEventListener('keydown', handleKeydown);
			};
		}
	});

	// Get default scenario for quick select
	const defaultScenario = $derived(scenarios.find((s) => s.is_default) || scenarios[0]);

	function selectDefaultScenario() {
		scenarioState.setScenario(defaultScenario);
		navigationState.toggleScenarioDropdown();
	}

	function handleApply() {
		if (matchingScenario) {
			scenarioState.setScenario(matchingScenario);
			navigationState.toggleScenarioDropdown();
		}
	}

	function handleReset() {
		navigationState.tempParameters = {};
	}

	function handleAddComparison() {
		if (matchingScenario) {
			scenarioState.addToStaged(matchingScenario);
		}
		// Keep dropdown open to allow adding more scenarios
	}

	function handleApplyComparison() {
		scenarioState.applyComparison();
		navigationState.toggleScenarioDropdown();
	}
</script>

{#if navigationState.scenarioDropdownOpen}
	<div
		bind:this={dropdownRef}
		class="fixed top-16 right-6 w-[600px] max-w-[90vw] max-h-[70vh] bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden flex flex-col"
	>
		<!-- Header -->
		<div
			class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700"
		>
			<h3 class="text-lg font-semibold text-gray-900 dark:text-white">Select Scenario</h3>
			<button
				onclick={() => navigationState.toggleScenarioDropdown()}
				class="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
				aria-label="Close"
			>
				<X class="w-5 h-5" />
			</button>
		</div>

		<!-- Scrollable Content -->
		<div class="flex-1 overflow-y-auto px-6 py-4 space-y-6">
			<!-- Staged Comparison Scenarios Section -->
			{#if scenarioState.stagedComparisonScenarios.length > 0}
				<div>
					<div class="flex items-center justify-between mb-3">
						<h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
							Comparison Queue ({scenarioState.stagedComparisonScenarios.length}/3)
						</h4>
						<button
							onclick={() => scenarioState.clearStaged()}
							class="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
						>
							Clear All
						</button>
					</div>
					<div class="space-y-2">
						{#each scenarioState.stagedComparisonScenarios as scenario, index}
							<div
								class="flex items-center justify-between px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800"
							>
								<div class="flex items-center gap-2">
									<div
										class="w-3 h-3 rounded-full"
										style="background-color: {index === 0 ? '#3b82f6' : index === 1 ? '#10b981' : '#f59e0b'}"
									></div>
									<span class="text-sm font-medium text-gray-900 dark:text-white"
										>{scenario.name}</span
									>
									{#if index === 0}
										<span
											class="text-xs px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
											>baseline</span
										>
									{/if}
								</div>
								<button
									onclick={() => scenarioState.removeFromStaged(scenario)}
									class="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
									aria-label="Remove"
								>
									<X class="w-4 h-4" />
								</button>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Quick Select Section -->
			{#if defaultScenario}
				<div>
					<h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
						Quick Select
					</h4>
					<button
						onclick={selectDefaultScenario}
						class="w-full flex items-center justify-between px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-primary hover:bg-primary/5 transition-all duration-200"
					>
						<span class="font-medium text-gray-900 dark:text-white"
							>{defaultScenario.name}</span
						>
						<div class="w-3 h-3 rounded-full bg-blue-500"></div>
					</button>
				</div>
			{/if}

			<!-- Parameter Groups Section -->
			<div class="space-y-4">
				<h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
					Customize Parameters
				</h4>

				{#each parameterNames as paramName}
					<ParameterGroup
						label={paramName.replace(/_/g, ' ')}
						options={scenarioParameters[paramName]?.options || []}
						selected={navigationState.tempParameters[paramName]}
						onselect={(value) => {
							navigationState.tempParameters = {
								...navigationState.tempParameters,
								[paramName]: value
							};
						}}
					/>
				{/each}
			</div>

			<!-- Matching Indicator -->
			<div class="flex items-center justify-center py-2">
				{#if matchingScenario}
					<span class="text-sm text-green-600 dark:text-green-400 font-medium">
						✓ Scenario found: {matchingScenario.name}
					</span>
				{:else if Object.keys(navigationState.tempParameters).length === parameterNames.length}
					<span class="text-sm text-red-600 dark:text-red-400 font-medium">
						✗ No matching scenario
					</span>
				{:else}
					<span class="text-sm text-gray-600 dark:text-gray-400">
						Select all parameters to find scenario
					</span>
				{/if}
			</div>
		</div>

		<!-- Footer Actions -->
		<div
			class="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
		>
			<button
				onclick={handleReset}
				class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
			>
				Reset
			</button>
			<div class="flex items-center gap-2">
				<button
					onclick={handleAddComparison}
					disabled={!matchingScenario || scenarioState.stagedComparisonScenarios.length >= 3}
					class="px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{#if scenarioState.stagedComparisonScenarios.length >= 3}
						Max 3 Scenarios
					{:else}
						Add to Compare
					{/if}
				</button>
				{#if scenarioState.stagedComparisonScenarios.length >= 2}
					<button
						onclick={handleApplyComparison}
						class="px-6 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
					>
						Apply Comparison
					</button>
				{:else}
					<button
						onclick={handleApply}
						disabled={!matchingScenario}
						class="px-6 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Apply
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}
