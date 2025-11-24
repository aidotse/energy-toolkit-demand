<script lang="ts">
	/**
	 * ScenarioLegend Component
	 *
	 * Displays a legend showing active scenarios in comparison mode.
	 * Shows scenario names with color indicators, enumeration, and optional difference metrics.
	 * Hover shows full parameter details.
	 *
	 * @component
	 */
	import type { ScenarioObject, ScenarioComparisonMetadata } from '$lib/types/ChartComponent.interface';
	import { formatPercentageDiff, formatAbsoluteDiff } from '$lib/comparisonUtils';

	let {
		scenarios = [],
		metadata,
		showDifferences = false,
		unit = 'Wh',
		placement = 'bottom',
		onHover,
		onClick,
		class: className = ''
	}: {
		scenarios: ScenarioObject[];
		metadata?: ScenarioComparisonMetadata;
		showDifferences?: boolean;
		unit?: string;
		placement?: 'top' | 'bottom' | 'left' | 'right';
		onHover?: (scenarioId: string | null) => void;
		onClick?: (scenarioId: string) => void;
		class?: string;
	} = $props();

	const placementClasses = {
		top: 'flex-row flex-wrap justify-center',
		bottom: 'flex-row flex-wrap justify-center',
		left: 'flex-col',
		right: 'flex-col'
	};

	// Helper to format parameter details for tooltip
	function getParameterTooltip(scenario: ScenarioObject): string {
		const params = scenario.parameters;

		// Show full scenario name first
		let tooltip = scenario.name || 'Scenario';

		// Add parameters if available
		if (params && Object.keys(params).length > 0) {
			tooltip += '\n\nParameters:';
			tooltip += '\n' + Object.entries(params)
				.map(([key, value]) => `  • ${key.replace(/_/g, ' ')}: ${value}`)
				.join('\n');
		}

		// Add description if available
		if (scenario.description) {
			tooltip += '\n\n' + scenario.description;
		}

		return tooltip;
	}
</script>

<div class="scenario-legend flex gap-3 {placementClasses[placement]} {className}">
	{#each scenarios as scenario, index}
		{@const scenarioId = scenario.id || scenario.scenario_id || ''}
		{@const isBaseline = index === 0}
		{@const absoluteDiff = metadata?.differences?.absolute?.[scenarioId]}
		{@const percentageDiff = metadata?.differences?.percentage?.[scenarioId]}
		{@const tooltip = getParameterTooltip(scenario)}

		<button
			class="legend-item flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
			title={tooltip}
			onmouseenter={() => onHover?.(scenarioId)}
			onmouseleave={() => onHover?.(null)}
			onclick={() => onClick?.(scenarioId)}
		>
			<!-- Color indicator -->
			<div
				class="legend-color w-3 h-3 rounded-full flex-shrink-0"
				style="background-color: {scenario.color}"
			></div>

			<!-- Scenario name -->
			<div class="legend-label flex items-center gap-2">
				<span class="text-sm font-medium text-gray-900 dark:text-white">
					Scenario {index + 1}
				</span>

				<!-- Difference indicators -->
				{#if showDifferences && !isBaseline && absoluteDiff !== undefined}
					<span class="text-xs text-gray-600 dark:text-gray-400">
						({formatPercentageDiff(percentageDiff || 0)})
					</span>
				{/if}
			</div>
		</button>
	{/each}
</div>

<style>
	.scenario-legend {
		user-select: none;
	}

	.legend-item {
		border: 2px solid transparent;
		transition: all 0.2s ease-in-out;
	}

	.legend-item:hover {
		border-color: currentColor;
	}

	.legend-item:active {
		transform: scale(0.98);
	}

	.legend-color {
		box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1);
	}
</style>
