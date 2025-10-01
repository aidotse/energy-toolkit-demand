<script lang="ts">
	/**
	 * Histogram Component - Distribution visualization of hourly demand data
	 *
	 * Standardized chart component following ChartComponent interface patterns.
	 * Displays frequency distribution of hourly electricity demand values.
	 *
	 * @component
	 */
	import { BarChart } from 'layerchart';
	import { fetchDemandData, calculateHistogram } from '$lib/dataService';
	import { makeDemandQuery } from '$lib/utilities';
	import LoadingSkeleton from '$lib/components/shared/LoadingSkeleton.svelte';
	import ErrorState from '$lib/components/shared/ErrorState.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import type { TimeSeriesChartProps } from '$lib/types/ChartComponent.interface';

	let {
		data: hourData = [],
		geography,
		resolution = '1h',
		segment: sector,
		aggregation = 'mean',
		year,
		scenario,
		class: className = ''
	}: TimeSeriesChartProps & { segment?: string; class?: string } = $props();

	let loading = $state(false);
	let error = $state<string | null>(null);

	// Reactive data fetching when parameters change
	$effect(() => {
		if (!hourData || hourData.length === 0) {
			// Only fetch if no data provided
			fetchHistogramData();
		}
	});

	async function fetchHistogramData() {
		try {
			loading = true;
			error = null;

			const query = makeDemandQuery({
				start: `${year}-01-01`,
				end: `${year + 1}-01-01`,
				resolution: '1h',
				aggregation,
				geography,
				segment: sector || 'housing',
				scenarioId: scenario?.id || scenario?.scenario_id || 'default'
			});

			const data = await fetchDemandData(query);
			hourData = data;
		} catch (err: any) {
			error = err?.message || 'Ett oväntat fel inträffade';
			console.error('Error fetching histogram data:', err);
			hourData = [];
		} finally {
			loading = false;
		}
	}

	let histogramData = $derived(calculateHistogram(hourData || [], 'value', 50));
</script>

<div class="flex flex-col h-full w-full @container {className}">
	<div class="mb-2">
		<span class="text-sm font-medium">Histogram över elbehovet</span>
	</div>

	<div class="h-[300px] ml-8 mb-14 mr-2 mt-1">
		{#if loading}
			<LoadingSkeleton variant="chart" message="Laddar histogram..." />
		{:else if error}
			<ErrorState message="Kunde inte ladda histogram" details={error} onRetry={fetchHistogramData} />
		{:else if !histogramData || histogramData.length === 0}
			<EmptyState
				message="Ingen data tillgänglig"
				description="Ingen data finns för vald tidsperiod och geografi"
			/>
		{:else}
			<BarChart
				data={histogramData}
				x="x0"
				y="length"
				bandPadding={0.2}
				props={{
					xAxis: { tweened: true },
					yAxis: { format: 'metric', tweened: true },
					bars: { tweened: true, radius: 2, stroke: 'none' }
				}}
			/>
		{/if}
	</div>
</div>