<script lang="ts">
	/**
	 * ScenarioSelectorPill Component
	 *
	 * Compact pill-based scenario selector that lives in the top navigation bar.
	 * Shows current scenario(s) in collapsed state, opens dropdown/bottom-sheet for selection.
	 */
	import { ChevronDown } from 'lucide-svelte';
	import { navigationState } from '$lib/stores/navigation.svelte';
	import { browser } from '$app/environment';

	// Props
	let { currentScenario = 'Default Scenario' }: { currentScenario?: string } = $props();

	// Toggle dropdown or bottom sheet based on screen size
	function handleClick() {
		// Check screen size at click time
		const isMobile = browser && window.innerWidth < 1024; // lg breakpoint

		if (isMobile) {
			navigationState.toggleScenarioModal();
		} else {
			navigationState.toggleScenarioDropdown();
		}
	}

	// Truncate scenario name if too long
	const displayName = $derived(
		currentScenario.length > 30 ? currentScenario.substring(0, 27) + '...' : currentScenario
	);
</script>

<button
	onclick={handleClick}
	class="
		inline-flex items-center gap-2
		px-4 py-2 h-9
		max-w-[300px]
		rounded-full
		border border-gray-300 dark:border-gray-600
		bg-white dark:bg-gray-800
		hover:border-primary hover:shadow-sm
		transition-all duration-200
		text-sm font-medium
		whitespace-nowrap
	"
	aria-label="Select scenario"
	aria-expanded={navigationState.scenarioDropdownOpen || navigationState.scenarioModalOpen}
>
	<span class="truncate">{displayName}</span>
	<ChevronDown class="w-4 h-4 flex-shrink-0" />
</button>
