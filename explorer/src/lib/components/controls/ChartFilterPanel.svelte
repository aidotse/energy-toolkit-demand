<script lang="ts">
	/**
	 * ChartFilterPanel - Filter panel for per-chart parameter control.
	 *
	 * Renders in the page sidebar (desktop) or bottom sheet (mobile).
	 * Contains geography combobox, year slider, segment dropdown, and
	 * per-chart scenario/parameter controls. All state is stored in
	 * chartParametersStore so changes only affect the active chart.
	 */
	import { X, SlidersHorizontal, Copy, RotateCcw } from 'lucide-svelte';
	import GeographyCombobox from './GeographyCombobox.svelte';
	import SegmentDropdown from './SegmentDropdown.svelte';
	import YearSelector from './YearSelector.svelte';
	import ParameterSlider from '$lib/components/navigation/ParameterSlider.svelte';
	import { chartParametersStore } from '$lib/stores/chartParameters.svelte';
	import { parameterStore, getParameterLabel } from '$lib/stores/parameterStore.svelte';
	import { SEGMENT_LABELS } from '$lib/chartConfig';
	import type { ChartParameters, AvailableParameters } from '$lib/types/controls';

	let {
		chartId,
		chartTitle = 'Filter',
		globalParameters,
		availableParameters,
		geographiesMetadata = [],
		allChartIds = [],
		onClose,
		onApplyToAll
	}: {
		chartId: string;
		chartTitle?: string;
		globalParameters: ChartParameters;
		availableParameters: AvailableParameters;
		geographiesMetadata?: Array<{ id: string; name: string; type?: string }>;
		allChartIds?: string[];
		onClose: () => void;
		onApplyToAll?: () => void;
	} = $props();

	const overrides = $derived(chartParametersStore.getParameters(chartId));

	function effectiveValue<K extends keyof ChartParameters>(key: K): ChartParameters[K] {
		return overrides[key] ?? globalParameters[key];
	}

	function setParam<K extends keyof ChartParameters>(key: K, value: ChartParameters[K]) {
		if (value === globalParameters[key]) {
			chartParametersStore.clearParameter(chartId, key);
		} else {
			chartParametersStore.setParameter(chartId, key, value);
		}
	}

	// Segment: stored as string[] to preserve multiselect state
	const segmentValues = $derived.by(() => {
		const seg = effectiveValue('segment');
		if (Array.isArray(seg)) return seg;
		if (!seg || seg === 'total') return ['total'];
		return [seg];
	});

	function handleSegmentChange(values: string[]) {
		setParam('segment', values);
	}

	// Per-chart scenario: read from overrides or fall back to global parameterStore
	const effectiveScenarioId = $derived(
		overrides.scenarioId ?? parameterStore.baseScenario
	);

	const effectiveParamValues = $derived(
		overrides.parameterValues ?? { ...parameterStore.parameterValues }
	);

	const defaultScenarioId = $derived(
		parameterStore.defaultScenario?.id || 'beslutad_policy'
	);

	const isDefaultScenario = $derived(effectiveScenarioId === defaultScenarioId);

	function handleBaseScenarioChange(scenarioId: string) {
		if (scenarioId === parameterStore.baseScenario) {
			// Same as global — clear the override
			chartParametersStore.clearParameter(chartId, 'scenarioId');
			chartParametersStore.clearParameter(chartId, 'parameterValues');
		} else {
			chartParametersStore.setParameter(chartId, 'scenarioId', scenarioId);
			// When switching scenario, reset parameter overrides for this chart
			chartParametersStore.clearParameter(chartId, 'parameterValues');
		}
	}

	function handleParameterChange(paramName: string, value: number) {
		// Build new parameterValues based on current effective values
		const updated = { ...effectiveParamValues, [paramName]: value };
		chartParametersStore.setParameter(chartId, 'parameterValues', updated);
	}

	function resetParameters() {
		chartParametersStore.clearParameter(chartId, 'parameterValues');
	}

	// Helper for parameter type label
	function getParamTypeLabel(paramName: string): string {
		const labels: Record<string, string> = {
			growth: 'Tillväxt',
			flex: 'Flexibilitet'
		};
		const type = paramName.split('_').pop() || '';
		return labels[type] || type;
	}

	// Check if any per-chart parameter overrides are active
	const hasParamOverrides = $derived.by(() => {
		if (!overrides.parameterValues) return false;
		return Object.values(overrides.parameterValues).some(v => v > 0);
	});

	function resetAll() {
		chartParametersStore.clearAll();
	}

	function handleApplyToAll() {
		if (onApplyToAll) {
			onApplyToAll();
		}
	}

	const hasOverrides = $derived(chartParametersStore.hasOverrides(chartId));
</script>

<div class="space-y-5">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h3 class="text-xs font-semibold text-gray-900 uppercase tracking-wide flex items-center gap-1.5">
				<SlidersHorizontal class="w-3.5 h-3.5" />
				Filter
			</h3>
			<p class="text-xs text-gray-500 mt-0.5">{chartTitle}</p>
		</div>
		<button
			onclick={onClose}
			class="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
		>
			<X class="w-4 h-4" />
		</button>
	</div>

	<!-- Geography -->
	<div>
		<span class="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
			Geografi
		</span>
		<GeographyCombobox
			value={effectiveValue('geography') || 'total'}
			geographies={availableParameters.geographies || ['total']}
			{geographiesMetadata}
			onChange={(v) => setParam('geography', v)}
		/>
	</div>

	<!-- Year (slider) -->
	<div>
		<span class="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
			År
		</span>
		<YearSelector
			value={effectiveValue('year') || 2030}
			years={availableParameters.years}
			onChange={(v) => setParam('year', v)}
			variant="slider"
			size="sm"
		/>
	</div>

	<!-- Segment (multiselect dropdown) -->
	<div>
		<span class="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
			Sektor
		</span>
		<SegmentDropdown
			values={segmentValues}
			segments={availableParameters.segments || ['total', 'housing', 'transport', 'industry', 'services', 'datacenters']}
			onChange={handleSegmentChange}
		/>
	</div>

	<!-- Scenario (per-chart, writes to chartParametersStore) -->
	{#if parameterStore.isInitialized}
		<div>
			<span class="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
				Scenario
			</span>
			<div class="flex flex-col gap-1">
				{#each parameterStore.baseScenarios as scenario}
					<button
						onclick={() => handleBaseScenarioChange(scenario.id)}
						class="w-full px-3 py-1.5 text-left text-xs rounded-md transition-colors
							{effectiveScenarioId === scenario.id
							? 'bg-chart-100 text-chart-900 font-medium'
							: 'bg-gray-50 text-gray-700 hover:bg-gray-100'}"
					>
						{scenario.name}
						{#if scenario.default}
							<span class="text-[10px] text-gray-400 ml-1">(Standard)</span>
						{/if}
					</button>
				{/each}
			</div>
		</div>

		<!-- Parameter sliders (only for default scenario) -->
		{#if isDefaultScenario}
			<div>
				<div class="flex items-center justify-between mb-1.5">
					<span class="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
						Parametrar
					</span>
					{#if hasParamOverrides}
						<button
							onclick={resetParameters}
							class="text-[10px] text-gray-500 hover:text-gray-700 flex items-center gap-0.5"
						>
							<RotateCcw class="w-2.5 h-2.5" />
							Återställ
						</button>
					{/if}
				</div>

				<div class="space-y-3">
					{#each Object.entries(parameterStore.parametersBySegment) as [segment, params]}
						<div class="space-y-1.5">
							<span class="text-[10px] font-medium text-gray-500">
								{SEGMENT_LABELS[segment] || segment}
							</span>
							{#each params as param}
								{@const currentValue = effectiveParamValues[param.name] ?? 0}
								<div class="space-y-0.5">
									<div class="flex items-center justify-between text-[10px]">
										<span class="text-gray-600">
											{getParamTypeLabel(param.name)}
										</span>
										<span class="font-medium text-gray-900">
											{getParameterLabel(param, currentValue)}
										</span>
									</div>
									<ParameterSlider
										parameter={param}
										value={currentValue}
										onchange={(v) => handleParameterChange(param.name, v)}
										compact={true}
									/>
								</div>
							{/each}
						</div>
					{/each}
				</div>
			</div>
		{:else}
			<div class="p-2 bg-gray-50 rounded-md">
				<p class="text-[10px] text-gray-500">
					Parametrar kan justeras för <strong>{parameterStore.defaultScenario?.name || 'Beslutad Policy'}</strong>.
				</p>
			</div>
		{/if}
	{/if}

	<!-- Actions -->
	<div class="space-y-2 pt-2 border-t border-gray-200">
		{#if allChartIds.length > 1}
			<button
				onclick={handleApplyToAll}
				class="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium
					text-chart-900 bg-chart-700/10 hover:bg-chart-700/20
					rounded-md transition-colors"
			>
				<Copy class="w-3.5 h-3.5" />
				Tillämpa på alla diagram
			</button>
		{/if}

		{#if hasOverrides}
			<button
				onclick={resetAll}
				class="w-full px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
			>
				Återställ alla
			</button>
		{/if}
	</div>
</div>
