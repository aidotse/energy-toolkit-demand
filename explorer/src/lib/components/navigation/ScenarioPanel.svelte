<script lang="ts">
	/**
	 * ScenarioPanel Component
	 *
	 * Collapsible panel for scenario parameter selection.
	 * Sits below TopNavigationBar with smooth transitions.
	 */
	import { ChevronDown, ChevronUp } from 'lucide-svelte';
	import { navigationState } from '$lib/stores/navigation.svelte';

	// TODO: Wire up with real scenario data from props
	let { scenarios = [] }: { scenarios?: any[] } = $props();

	const currentScenarioName = $derived('Default Scenario'); // TODO: Get from store
</script>

<div
	class="sticky top-14 z-40 bg-gray-50 dark:bg-gray-800 border-b border-gray-200/10 transition-all duration-300 {navigationState.panelExpanded
		? 'h-32'
		: 'h-8'}"
>
	<div class="max-w-screen-2xl mx-auto h-full">
		{#if navigationState.panelExpanded}
			<!-- Expanded State: Full Parameter Controls -->
			<div class="px-6 py-4 h-full">
				<div class="flex items-center justify-between mb-3">
					<h2 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
						Scenario Selection
					</h2>
					<button
						onclick={() => navigationState.togglePanel()}
						class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
						aria-label="Collapse panel"
					>
						<ChevronUp class="w-5 h-5" />
					</button>
				</div>

				<!-- Parameter Controls Placeholder -->
				<div class="space-y-2">
					<div class="flex items-center gap-2">
						<span class="text-xs uppercase font-medium text-gray-600 dark:text-gray-400">
							Current:
						</span>
						<div
							class="inline-flex items-center px-3 h-8 rounded-full border-2 border-primary bg-primary text-white text-sm font-medium"
						>
							{currentScenarioName}
						</div>
					</div>

					<!-- Placeholder for parameter chips -->
					<div class="text-xs text-gray-500 dark:text-gray-400">
						Scenario controls coming soon...
					</div>
				</div>
			</div>
		{:else}
			<!-- Collapsed State: Just Scenario Name + Expand Icon -->
			<button
				onclick={() => navigationState.togglePanel()}
				class="flex items-center justify-between px-6 h-full w-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
			>
				<span class="text-sm font-medium text-gray-700 dark:text-gray-300">
					{currentScenarioName}
				</span>
				<ChevronDown class="w-5 h-5 text-gray-500" />
			</button>
		{/if}
	</div>
</div>
