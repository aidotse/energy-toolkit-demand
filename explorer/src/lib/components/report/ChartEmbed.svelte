<script lang="ts">
	/**
	 * ChartEmbed - Resolves a chart name to the actual component
	 *
	 * Used as a leaf directive in markdown content: ::ChartEmbed{chart="area-yearly"}
	 * Reads year/geography from viewStore so charts react to Map interactions.
	 */
	import AreaChart from '$lib/components/AreaChart.svelte';
	import SectorPieChart from '$lib/components/SectorPieChart.svelte';
	import GeoSegmentChart from '$lib/components/GeoSegmentChart.svelte';
	import PeriodHeatmap from '$lib/components/PeriodHeatmap.svelte';
	import { viewStore } from '$lib/stores/viewStore.svelte';
	import { parameterStore, getParameterLabel } from '$lib/stores/parameterStore.svelte';

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

	const SEGMENT_LABELS: Record<string, string> = {
		housing: 'Bostäder',
		transport: 'Transport',
		industry: 'Industri',
		services: 'Service',
		datacenters: 'Datacenter'
	};

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

	const DESCRIPTIONS: Record<string, (year: number, suffix: string) => string> = {
		'area-yearly': (y, s) => `Årligt elbehov för Sverige 2025–2050 ${s}`,
		'sector-pie': (y, s) => `Sektorsfördelning av elbehov år ${y} ${s}`,
		'geo-segment': (y, s) => `Sektorernas andel av elbehovet per län år ${y} ${s}`,
		'period-heatmap': (y, s) => `Elbehov fördelat på månad och tid på dygnet år ${y} ${s}`
	};

	let description = $derived(DESCRIPTIONS[chart]?.(viewStore.year, scenarioSuffix) ?? '');
</script>

<div class="pb-6">
	{#if chart === 'area-yearly'}
		<AreaChart
			geography={viewStore.geography}
			year={viewStore.year}
			{aggregationInit}
			exportable={exportable}
			{description}
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
			parameterData={viewStore.pageData?.parameters}
			exportable={exportable}
			{description}
		/>
	{:else if chart === 'period-heatmap'}
		<PeriodHeatmap
			geography={viewStore.geography}
			year={viewStore.year}
			exportable={exportable}
			{description}
		/>
	{/if}
</div>
