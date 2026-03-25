<script lang="ts">
	/**
	 * FlexImpactChart — Power duration curve comparing baseline vs 15% flex
	 *
	 * Uses the multi-series AreaChart pattern from AreaChart.svelte lines 372-420.
	 * Compares baseline (no flex) vs 15% flex as two overlaid duration curves.
	 *
	 * @component
	 */
	import { AreaChart, Tooltip } from 'layerchart';
	import { fetchDemandData } from '$lib/dataService';
	import { makeDemandQuery, formatNumber } from '$lib/utilities';
	import { getPowerPrefix } from '$lib/stores/units.svelte';
	import LoadingSkeleton from '$lib/components/shared/LoadingSkeleton.svelte';
	import ChartContainer from '$lib/components/shared/ChartContainer.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import { parameterStore } from '$lib/stores/parameterStore.svelte';
	import { hexToRgba } from '$lib/comparisonUtils';
	import { viz } from '$lib/colors';
	import { CHART_PADDING } from '$lib/chartConfig';
	import type { Snippet } from 'svelte';

	const FLEX_PARAMS = [
		'housing_flex', 'transport_flex', 'industry_flex', 'services_flex', 'datacenters_flex'
	] as const;

	const SEGMENT_TO_FLEX: Record<string, string> = {
		housing: 'housing_flex', transport: 'transport_flex', industry: 'industry_flex',
		services: 'services_flex', datacenters: 'datacenters_flex'
	};

	let {
		geography,
		year,
		segment = 'total',
		exportable = true,
		description = '',
		headerControls,
		baseScenarioOverride,
		parameterValuesOverride,
		class: className = ''
	}: {
		geography?: string;
		year?: number;
		segment?: string;
		exportable?: boolean;
		description?: string;
		headerControls?: Snippet;
		baseScenarioOverride?: string;
		parameterValuesOverride?: Record<string, number>;
		class?: string;
	} = $props();

	const baseScenario = $derived(baseScenarioOverride || parameterStore.baseScenario);
	const parameterValues = $derived(parameterValuesOverride || parameterStore.parameterValues);

	let loading = $state(false);
	let error = $state<string | null>(null);
	let durationData = $state<{ rank: number; baseline: number; flex: number }[]>([]);
	let baselinePeak = $state(0);
	let flexPeak = $state(0);
	let peakReduction = $state(0);

	function buildFlexParams(base: Record<string, number>, flexIndex: number): Record<string, number> {
		const result = { ...base };
		if (segment === 'total') {
			for (const fp of FLEX_PARAMS) { result[fp] = flexIndex; }
		} else if (SEGMENT_TO_FLEX[segment]) {
			result[SEGMENT_TO_FLEX[segment]] = flexIndex;
		}
		return result;
	}

	async function fetchFlexData() {
		if (!geography || !year || !baseScenario) return;
		loading = true;
		error = null;
		try {
			const start = `${year}-01-01`;
			const end = `${year + 1}-01-01`;
			const seg = segment || 'total';

			const baselineParams = buildFlexParams(parameterValues, 0);
			const flexParams = buildFlexParams(parameterValues, 2);

			const [baselineData, flexData] = await Promise.all([
				fetchDemandData(makeDemandQuery({ start, end, resolution: '1h', aggregation: 'sum', geography, segment: seg, baseScenario, parameterValues: baselineParams })),
				fetchDemandData(makeDemandQuery({ start, end, resolution: '1h', aggregation: 'sum', geography, segment: seg, baseScenario, parameterValues: flexParams }))
			]);

			if (!baselineData.length || !flexData.length) {
				durationData = []; baselinePeak = 0; flexPeak = 0; peakReduction = 0;
				return;
			}

			const baselineValues = baselineData.map(d => d.value || 0).sort((a, b) => b - a);
			const flexValues = flexData.map(d => d.value || 0).sort((a, b) => b - a);

			const totalHours = Math.min(baselineValues.length, flexValues.length);
			const step = Math.max(1, Math.floor(totalHours / 500));
			const sampled: { rank: number; baseline: number; flex: number }[] = [];
			for (let i = 0; i < totalHours; i += step) {
				sampled.push({ rank: i, baseline: baselineValues[i], flex: flexValues[i] });
			}
			if (sampled.length > 0 && sampled[sampled.length - 1].rank !== totalHours - 1) {
				sampled.push({ rank: totalHours - 1, baseline: baselineValues[totalHours - 1], flex: flexValues[totalHours - 1] });
			}
			durationData = sampled;
			baselinePeak = baselineValues[0] || 0;
			flexPeak = flexValues[0] || 0;
			peakReduction = baselinePeak > 0 ? ((baselinePeak - flexPeak) / baselinePeak) * 100 : 0;
		} catch (e: any) {
			error = e.message || 'Kunde inte ladda flexdata';
			durationData = [];
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (geography && year && baseScenario) {
			const _pv = parameterValues;
			const _seg = segment;
			fetchFlexData();
		}
	});

	// Series colors — distinct enough to read clearly
	const BASELINE_COLOR = viz.teal[900];   // dark teal
	const FLEX_COLOR = '#e67e22';           // warm orange

	// Series config — copied from AreaChart.svelte multi-series pattern (lines 356-370)
	const series = [
		{
			key: 'baseline',
			value: 'baseline',
			color: hexToRgba(BASELINE_COLOR, 0.15),
			props: {
				line: { fill: 'none', stroke: BASELINE_COLOR, strokeWidth: 2 }
			}
		},
		{
			key: 'flex',
			value: 'flex',
			color: hexToRgba(FLEX_COLOR, 0.15),
			props: {
				line: { fill: 'none', stroke: FLEX_COLOR, strokeWidth: 2 }
			}
		}
	];

	const SERIES_LABELS: Record<string, string> = {
		baseline: 'Utan flex',
		flex: 'Med 15% flex'
	};
	const SERIES_COLORS: Record<string, string> = {
		baseline: BASELINE_COLOR,
		flex: FLEX_COLOR
	};
</script>

<ChartContainer
	title="Effekt av flexibilitet"
	{description}
	sizeVariant="none"
	aspectRatio="auto"
	metadata={{ chartType: 'flex-impact', geography, year, segment }}
	chartData={durationData}
	{exportable}
	{headerControls}
	class={className}
>

	<div class="h-[300px]">
	{#if loading}
		<LoadingSkeleton variant="chart" message="Laddar varaktighetskurva..." />
	{:else if error}
		<div class="text-red-600 text-sm p-4">{error}</div>
	{:else if durationData.length === 0}
		<EmptyState message="Ingen data tillgänglig" description="Ingen data finns för valt år och geografi" />
	{:else}
		<AreaChart
			data={durationData}
			x="rank"
			{series}
			padding={CHART_PADDING.standard}
			grid={false}
			props={{
				highlight: {
					lines: { class: 'stroke-black [stroke-width:1.5px] [stroke-dasharray:6_4]' },
					axis: 'both',
					points: { class: '!fill-transparent !stroke-black ![stroke-width:1.5px]' }
				},
				rule: { class: 'stroke-black [stroke-width:1.5px]' }
			}}
		>
			<svelte:fragment slot="tooltip" let:x let:y let:height let:padding let:data>
				{#if data}
				<Tooltip.Root
					x="data"
					y={height}
					anchor="top"
					class="text-[10px] font-semibold text-white bg-chart-900 mt-[2px] px-2 py-[2px] border border-chart-900 rounded whitespace-nowrap"
					contained={false}
				>
					{x(data)}h
				</Tooltip.Root>
				{/if}
				{#each ['baseline', 'flex'] as key}
					{@const value = data?.[key]}
					{#if value !== undefined}
						<Tooltip.Root
							x={padding.left}
							y={() => y({ [key]: value })}
							anchor="right"
							contained={false}
							class="text-[10px] font-semibold text-white bg-chart-900 mt-[2px] px-1 py-[2px] border border-chart-900 rounded whitespace-nowrap"
						>
							{SERIES_LABELS[key]}: {formatNumber(value, getPowerPrefix(), 'W')}
						</Tooltip.Root>
					{/if}
				{/each}
			</svelte:fragment>
		</AreaChart>
	{/if}
	</div>

	{#if !loading && !error && durationData.length > 0}
		<div class="flex flex-wrap justify-center gap-x-5 gap-y-1 mt-3 px-1 text-xs text-gray-600">
			<div class="flex items-center gap-1.5">
				<span class="w-3 h-0.5 rounded" style="background: {BASELINE_COLOR}"></span>
				Utan flex: <span class="font-semibold text-gray-900">{formatNumber(baselinePeak, getPowerPrefix(), 'W')}</span>
			</div>
			<div class="flex items-center gap-1.5">
				<span class="w-3 h-0.5 rounded" style="background: {FLEX_COLOR}"></span>
				Med 15% flex: <span class="font-semibold text-gray-900">{formatNumber(flexPeak, getPowerPrefix(), 'W')}</span>
			</div>
			<div>
				Minskning: <span class="font-semibold text-red-700">-{peakReduction.toFixed(1)}%</span>
			</div>
		</div>
	{/if}
</ChartContainer>
