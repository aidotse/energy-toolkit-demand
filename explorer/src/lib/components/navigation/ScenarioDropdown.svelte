<script lang="ts">
	/**
	 * ScenarioDropdown Component
	 *
	 * Desktop dropdown overlay for Strategy 2 parameter selection.
	 * Uses ParameterControls for base scenario and parameter sliders.
	 * Supports pluggable slider components via snippet.
	 */
	import { X } from 'lucide-svelte';
	import { navigationState } from '$lib/stores/navigation.svelte';
	import { parameterStore } from '$lib/stores/parameterStore.svelte';
	import ParameterControls from './ParameterControls.svelte';
	import { browser } from '$app/environment';
	import type { Strategy2Parameter } from '$lib/dataService';
	import type { Snippet } from 'svelte';

	// Props
	let {
		sliderComponent
	}: {
		sliderComponent?: Snippet<[Strategy2Parameter, number, (value: number) => void]>;
	} = $props();

	// Local state
	let dropdownRef: HTMLDivElement | undefined;

	// Click outside handler
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

	// Get current scenario label for display
	const currentBaseLabel = $derived(
		parameterStore.baseScenarios.find(s => s.id === parameterStore.baseScenario)?.name || 'Välj scenario'
	);
</script>

{#if navigationState.scenarioDropdownOpen}
	<div
		bind:this={dropdownRef}
		class="fixed top-32 lg:top-36 right-4 lg:right-auto lg:left-2/3 w-[320px] max-w-[90vw] max-h-[70vh] bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden flex flex-col"
	>
		<!-- Header -->
		<div
			class="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
		>
			<div>
				<h3 class="text-sm font-semibold text-gray-900 dark:text-white">Scenarioinställningar</h3>
				<p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
					{currentBaseLabel}
					{#if parameterStore.activeParameterCount > 0}
						<span class="text-primary-600 dark:text-primary-400">
							+{parameterStore.activeParameterCount} justeringar
						</span>
					{/if}
				</p>
			</div>
			<button
				onclick={() => navigationState.toggleScenarioDropdown()}
				class="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
				aria-label="Stäng"
			>
				<X class="w-4 h-4" />
			</button>
		</div>

		<!-- Scrollable Content -->
		<div class="flex-1 overflow-y-auto px-3 py-3">
			<ParameterControls
				compact={false}
				showReset={true}
				showSummary={false}
				{sliderComponent}
			/>
		</div>
	</div>
{/if}
