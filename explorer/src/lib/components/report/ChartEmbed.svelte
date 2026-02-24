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

	const DESCRIPTIONS: Record<string, (year: number) => string> = {
		'area-yearly': (y) =>
			`Årligt elbehov för Sverige 2025–2050. Kurvan visar en tydlig uppåtgående trend med en acceleration efter 2030.`,
		'sector-pie': (y) => `Sektorsfördelning av elbehov år ${y}.`,
		'geo-segment': (y) => `Sektorernas andel av elbehovet per län, år ${y}.`,
		'period-heatmap': (y) =>
			`Elbehov fördelat på månad och tid på dygnet, år ${y}. Mörkare färg visar högre genomsnittligt elbehov.`
	};

	let description = $derived(DESCRIPTIONS[chart]?.(viewStore.year) ?? '');
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
