<script lang="ts">
	/**
	 * ChartParameterPill Component
	 *
	 * Displays a pill that shows parameter override status for a chart.
	 * Clicking opens a dropdown with parameter controls.
	 * Shows visual indicator when chart has overridden parameters.
	 *
	 * @component
	 */
	import { SlidersHorizontal, X } from 'lucide-svelte';
	import { chartParametersStore } from '$lib/stores/chartParameters.svelte';
	import type { ChartParameters, AvailableParameters } from '$lib/types/controls';

	// Control components
	import YearSelector from './YearSelector.svelte';
	import SegmentSelector from './SegmentSelector.svelte';
	import ResolutionSelector from './ResolutionSelector.svelte';
	import AggregationSelector from './AggregationSelector.svelte';
	import GeographySelector from './GeographySelector.svelte';

	let {
		chartId,
		globalParameters,
		availableParameters,
		geographiesMetadata = [],
		supportedParameters = ['geography', 'year', 'segment', 'resolution', 'aggregation'],
		onChange
	}: {
		chartId: string;
		globalParameters: ChartParameters;
		availableParameters: AvailableParameters;
		geographiesMetadata?: Array<{ id: string; name: string; type?: string }>;
		supportedParameters?: Array<keyof ChartParameters>;
		onChange: (parameters: ChartParameters) => void;
	} = $props();

	// Get chart-specific overrides
	const chartOverrides = $derived(chartParametersStore.getParameters(chartId));
	const hasOverrides = $derived(chartParametersStore.hasOverrides(chartId));
	const overrideCount = $derived(chartParametersStore.getOverrideCount(chartId));

	// Merge global and chart-specific parameters
	const effectiveParameters = $derived({
		...globalParameters,
		...chartOverrides
	});

	let open = $state(false);
	let dropdownRef: HTMLDivElement | undefined = $state();

	function handleParameterChange<K extends keyof ChartParameters>(
		key: K,
		value: ChartParameters[K]
	) {
		// Only set override if different from global
		if (value !== globalParameters[key]) {
			chartParametersStore.setParameter(chartId, key, value);
		} else {
			chartParametersStore.clearParameter(chartId, key);
		}
		// Notify parent of change
		onChange(chartParametersStore.getParameters(chartId));
	}

	function handleReset() {
		chartParametersStore.clearChart(chartId);
		onChange({});
		open = false;
	}

	function handleClickOutside(event: MouseEvent) {
		if (dropdownRef && !dropdownRef.contains(event.target as Node)) {
			open = false;
		}
	}

	$effect(() => {
		if (open) {
			document.addEventListener('click', handleClickOutside);
			return () => {
				document.removeEventListener('click', handleClickOutside);
			};
		}
	});
</script>

<div class="relative" bind:this={dropdownRef}>
	<button
		type="button"
		onclick={() => (open = !open)}
		class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all
		       {hasOverrides
			? 'bg-primary text-white shadow-sm hover:shadow-md'
			: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}
		       focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
		title={hasOverrides ? `Diagramparametrar (${overrideCount} anpassade)` : 'Diagramparametrar'}
		aria-label="Chart parameters"
	>
		<SlidersHorizontal class="w-3.5 h-3.5" />
		{#if hasOverrides}
			<span class="px-1.5 py-0.5 bg-white/20 rounded-full text-[10px] font-bold">
				{overrideCount}
			</span>
		{/if}
	</button>

	{#if open}
		<div
			class="absolute right-0 top-full mt-2 w-80 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50"
		>
		<div class="flex items-center justify-between mb-4">
			<h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
				Diagramparametrar
			</h3>
			{#if hasOverrides}
				<button
					type="button"
					onclick={handleReset}
					class="text-xs text-gray-600 dark:text-gray-400 hover:text-primary hover:underline"
				>
					Återställ
				</button>
			{/if}
		</div>

		<div class="space-y-4">
			{#if supportedParameters.includes('geography')}
				<div>
					<label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
						Geografi
						{#if chartOverrides.geography !== undefined}
							<span class="ml-1 text-primary">●</span>
						{/if}
					</label>
					<GeographySelector
						value={effectiveParameters.geography || 'total'}
						geographies={availableParameters.geographies}
						{geographiesMetadata}
						onChange={(val) => handleParameterChange('geography', val)}
						variant="dropdown"
						size="sm"
					/>
				</div>
			{/if}

			{#if supportedParameters.includes('year')}
				<div>
					<label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
						År
						{#if chartOverrides.year !== undefined}
							<span class="ml-1 text-primary">●</span>
						{/if}
					</label>
					<YearSelector
						value={effectiveParameters.year || 2025}
						years={availableParameters.years}
						onChange={(val) => handleParameterChange('year', val)}
						variant="dropdown"
						size="sm"
					/>
				</div>
			{/if}

			{#if supportedParameters.includes('segment')}
				<div>
					<label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
						Segment
						{#if chartOverrides.segment !== undefined}
							<span class="ml-1 text-primary">●</span>
						{/if}
					</label>
					<SegmentSelector
						value={effectiveParameters.segment || 'total'}
						segments={availableParameters.segments}
						onChange={(val) => handleParameterChange('segment', val)}
						variant="dropdown"
						size="sm"
					/>
				</div>
			{/if}

			{#if supportedParameters.includes('resolution')}
				<div>
					<label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
						Upplösning
						{#if chartOverrides.resolution !== undefined}
							<span class="ml-1 text-primary">●</span>
						{/if}
					</label>
					<ResolutionSelector
						value={effectiveParameters.resolution || '1h'}
						resolutions={availableParameters.resolutions}
						onChange={(val) => handleParameterChange('resolution', val)}
						variant="dropdown"
						size="sm"
					/>
				</div>
			{/if}

			{#if supportedParameters.includes('aggregation')}
				<div>
					<label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
						Aggregering
						{#if chartOverrides.aggregation !== undefined}
							<span class="ml-1 text-primary">●</span>
						{/if}
					</label>
					<AggregationSelector
						value={effectiveParameters.aggregation || 'sum'}
						aggregations={availableParameters.aggregations}
						onChange={(val) => handleParameterChange('aggregation', val)}
						variant="dropdown"
						size="sm"
						context="energy"
					/>
				</div>
			{/if}
		</div>

			<div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
				<button
					type="button"
					onclick={() => (open = false)}
					class="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
				>
					Stäng
				</button>
			</div>
		</div>
	{/if}
</div>
