<script lang="ts">
	/**
	 * ChartEmbed - Resolves a chart name to the actual component
	 *
	 * Used as a leaf directive in markdown content: ::ChartEmbed{chart="area-yearly"}
	 * Reads year/geography from viewStore so charts react to Map interactions.
	 * Generates dynamic descriptions incorporating the active scenario suffix.
	 *
	 * @component
	 * @prop chart - Chart identifier: 'area-yearly' | 'sector-pie' | 'geo-segment' | 'period-heatmap'
	 * @prop exportable - Pass through to child chart's export controls
	 * @prop aggregationInit - Initial aggregation mode for AreaChart
	 * @prop enableComparison - Enable comparison mode for SectorPieChart
	 */
	import AreaChart from '$lib/components/AreaChart.svelte';
	import SectorPieChart from '$lib/components/SectorPieChart.svelte';
	import GeoSegmentChart from '$lib/components/GeoSegmentChart.svelte';
	import PeriodHeatmap from '$lib/components/PeriodHeatmap.svelte';
	import { viewStore } from '$lib/stores/viewStore.svelte';
	import { parameterStore, getParameterLabel } from '$lib/stores/parameterStore.svelte';
	import { SEGMENT_LABELS } from '$lib/chartConfig';
	import { getSegmentLabel } from '$lib/chartConfig';

	let {
		chart,
		exportable = true,
		aggregationInit = 'sum',
		enableComparison = false,
		...rest
	}: {
		chart: string;
		exportable?: boolean;
		aggregationInit?: string;
		enableComparison?: boolean;
		[key: string]: any;
	} = $props();

	function getParamTypeLabel(paramName: string): string {
		const labels: Record<string, string> = { growth: 'tillväxt', flex: 'flex' };
		const type = paramName.split('_').pop() || '';
		return labels[type] || type;
	}

	const scenarioSuffix = $derived.by(() => {
		const name =
			parameterStore.baseScenarios.find((s) => s.id === parameterStore.baseScenario)?.name || '';
		if (!name) return '';

		const entries = Object.entries(parameterStore.parameterValues).filter(([_, v]) => v > 0);
		if (entries.length === 0) return `i scenariot ${name}.`;

		const bySegment = new Map<string, string[]>();
		for (const [pName, index] of entries) {
			const param = parameterStore.getParameter(pName);
			if (!param) continue;
			const type = getParamTypeLabel(pName);
			const label = getParameterLabel(param, index);
			if (!bySegment.has(param.segment)) bySegment.set(param.segment, []);
			bySegment.get(param.segment)!.push(`${label} ${type}`);
		}

		const clauses: string[] = [];
		for (const [segment, params] of bySegment) {
			const segmentName = SEGMENT_LABELS[segment] || segment;
			const paramText =
				params.length === 1
					? params[0]
					: params.slice(0, -1).join(', ') + ' och ' + params[params.length - 1];
			clauses.push(`${paramText} i ${segmentName}`);
		}

		return `i scenariot ${name} med ${clauses.join(', ')}.`;
	});

	// Geography label for descriptions
	const geoLabel = $derived(viewStore.geographyName);

	// Segment label for descriptions (only when filtering to a specific segment)
	const segmentLabel = $derived.by(() => {
		const seg = viewStore.activeSegment;
		if (seg === 'total') return '';
		return `, sektor ${getSegmentLabel(seg).toLowerCase()}`;
	});

	const DESCRIPTIONS: Record<string, (year: number, geo: string, seg: string, suffix: string) => string> = {
		'area-yearly': (y, g, seg, s) => `Årligt elbehov för ${g}${seg} 2025–2050 ${s}`,
		'sector-pie': (y, g, seg, s) => `Sektorsfördelning av elbehov för ${g} år ${y} ${s}`,
		'geo-segment': (y, g, seg, s) => `Sektorernas andel av elbehovet per län år ${y} ${s}`,
		'period-heatmap': (y, g, seg, s) => `Elbehov fördelat på månad och tid på dygnet för ${g}${seg} år ${y} ${s}`
	};

	let description = $derived(DESCRIPTIONS[chart]?.(viewStore.year, geoLabel, segmentLabel, scenarioSuffix) ?? '');
</script>

<div class="pb-6">
	{#if chart === 'area-yearly'}
		<AreaChart
			geography={viewStore.geography}
			segment={viewStore.activeSegment}
			year={viewStore.year}
			{aggregationInit}
			exportable={exportable}
			{description}
			height="h-[450px]"
			contentClass="mx-4 sm:mx-8"
		/>
	{:else if chart === 'sector-pie'}
		<SectorPieChart
			geography={viewStore.geography}
			year={viewStore.year}
			{enableComparison}
			comparisonYear={2025}
			exportable={exportable}
			{description}
		/>
	{:else if chart === 'geo-segment'}
		<GeoSegmentChart
			year={viewStore.year}
			exportable={exportable}
			{description}
		/>
	{:else if chart === 'period-heatmap'}
		<PeriodHeatmap
			geography={viewStore.geography}
			segment={viewStore.activeSegment}
			year={viewStore.year}
			exportable={exportable}
			{description}
		/>
	{/if}
</div>
