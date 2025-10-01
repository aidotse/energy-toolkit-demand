<script lang="ts">
	/**
	 * GeoBarChart Component - Geographic comparison bar chart
	 *
	 * Standardized chart component following ChartComponent interface patterns.
	 * Displays electricity demand comparison across different geographies.
	 *
	 * @component
	 */
	import { BarChart } from 'layerchart';
	import { makeDemandQuery } from '$lib/utilities';
	import { fetchDemandData } from '$lib/dataService';
	import LoadingSkeleton from '$lib/components/shared/LoadingSkeleton.svelte';
	import ErrorState from '$lib/components/shared/ErrorState.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import type { GeographicChartProps } from '$lib/types/ChartComponent.interface';

	let {
		data: yearData = [],
		parameterData,
		year,
		geography,
		scenario,
		class: className = ''
	}: GeographicChartProps & { parameterData?: any; class?: string } = $props();

	let loading = $state(false);
	let error = $state<string | null>(null);

	$effect(() => {
		if ((!yearData || yearData.length === 0) && year && scenario) {
			fetchGeoData();
		}
	});

	async function fetchGeoData() {
		try {
			loading = true;
			error = null;

			const query = makeDemandQuery({
				start: String(year),
				end: String(year + 1),
				resolution: '1Y',
				aggregation: 'sum',
				geography: 'all',
				segment: 'housing',
				scenarioId: scenario?.id || scenario?.scenario_id || 'default'
			});

			const data = await fetchDemandData(query);
			yearData = data;
		} catch (err: any) {
			error = err?.message || 'Ett oväntat fel inträffade';
			console.error('Error fetching geo data:', err);
			yearData = [];
		} finally {
			loading = false;
		}
	}

	let chartData = $derived(
		(yearData || [])
			.filter((d) => d.geography !== '00')
			.map((d) => ({
				...d,
				total: d.value || d.total || 0,
				name:
					parameterData?.geographies?.find((g: any) => g.geo_id === d.geography)?.geo_name ||
					d.geography
			}))
			.sort((a, b) => b.total - a.total)
	);
</script>

<div class="h-[300px] @container {className}">
	{#if loading}
		<LoadingSkeleton variant="chart" message="Laddar geografisk data..." />
	{:else if error}
		<ErrorState message="Kunde inte ladda geografisk data" details={error} onRetry={fetchGeoData} />
	{:else if !chartData || chartData.length === 0}
		<EmptyState
			message="Ingen geografisk data tillgänglig"
			description="Ingen data finns för valt år"
		/>
	{:else}
		<div class="mb-2">
			<span class="text-sm font-medium">Årlig energiförbrukning per geografi</span>
		</div>
		<BarChart
			data={chartData}
			x="name"
			y="total"
			props={{
				xAxis: { tweened: true, tickLabelProps: { rotate: 315, textAnchor: 'end' } },
				yAxis: { format: 'metric', tweened: true },
				bars: { tweened: true, radius: 2, stroke: 'none' }
			}}
		/>
	{/if}
</div>