<script lang="ts">
	/**
	 * ScenarioSelectorPill Component
	 *
	 * Compact pill-based scenario selector that lives in the top navigation bar.
	 * Shows current base scenario name.
	 * Opens dropdown (desktop) or bottom-sheet (mobile) for selection.
	 */
	import { ChevronDown } from 'lucide-svelte';
	import { navigationState } from '$lib/stores/navigation.svelte';
	import { parameterStore } from '$lib/stores/parameterStore.svelte';
	import { browser } from '$app/environment';

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

	// Get display name from parameterStore
	const displayName = $derived.by(() => {
		if (!parameterStore.isInitialized) {
			return 'Laddar...';
		}

		const baseScenario = parameterStore.baseScenarios.find(
			s => s.id === parameterStore.baseScenario
		);
		const baseName = baseScenario?.name || 'Välj scenario';

		// Truncate if too long
		const truncatedName = baseName.length > 25 ? baseName.substring(0, 22) + '...' : baseName;

		return truncatedName;
	});

	let { embedded = false }: { embedded?: boolean } = $props();
</script>

<button
	onclick={handleClick}
	class="
		inline-flex items-center gap-2
		py-2 h-9
		{embedded ? 'px-3 w-full bg-transparent hover:bg-gray-100 rounded-l-lg' : 'px-4 max-w-[300px] rounded-full border border-gray-300 bg-white hover:border-primary hover:shadow-sm'}
		transition-all duration-200
		text-sm font-medium
		whitespace-nowrap
	"
	aria-label="Select scenario"
	aria-expanded={navigationState.scenarioDropdownOpen || navigationState.scenarioModalOpen}
>
	<span class="truncate">{displayName}</span>
	<ChevronDown class="w-4 h-4 flex-shrink-0 text-gray-400" />
</button>
