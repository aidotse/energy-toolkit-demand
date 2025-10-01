<script lang="ts">
	/**
	 * SectorArc Component - Sector/segment breakdown visualization
	 *
	 * Standardized chart component following ChartComponent interface patterns.
	 * Displays breakdown of electricity demand by sector (buildings, transport, industry).
	 *
	 * @component
	 */
	import { BarChart, Text } from 'layerchart';
	import { formatNumber, makeDemandQuery } from '$lib/utilities';
	import { fetchDemandData, calculateSectorData } from '$lib/dataService';
	import LoadingSkeleton from '$lib/components/shared/LoadingSkeleton.svelte';
	import ErrorState from '$lib/components/shared/ErrorState.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import type { SectorChartProps } from '$lib/types/ChartComponent.interface';

	let {
		data: yearData = null,
		geography,
		year,
		scenario,
		class: className = ''
	}: SectorChartProps & { class?: string } = $props();

	let loading = $state(false);
	let error = $state<string | null>(null);

	// Reactive data fetching when parameters change
	$effect(() => {
		if (yearData === null && year && scenario) {
			// Only fetch if no data provided and params exist
			fetchSectorData();
		}
	});

	async function fetchSectorData() {
		try {
			loading = true;
			error = null;

			const query = makeDemandQuery({
				start: String(year),
				end: String(year + 1),
				resolution: '1Y',
				aggregation: 'sum',
				geography: 'all', // Get all geographies for sector breakdown
				segment: 'housing', // Default segment
				scenarioId: scenario?.id || scenario?.scenario_id || 'default'
			});

			const data = await fetchDemandData(query);
			yearData = data;
		} catch (err: any) {
			error = err?.message || 'Ett oväntat fel inträffade';
			console.error('Error fetching sector data:', err);
			yearData = [];
		} finally {
			loading = false;
		}
	}

	let sectorData = $derived(calculateSectorData(yearData || [], geography || '01'));

	let chartData = $derived(
		!sectorData || sectorData.length === 0
			? []
			: sectorData.map((item) => ({
					sector: item.sector,
					value: item.value
				}))
	);
</script>

<div class="h-[300px] p-4 @container {className}">
	{#if loading}
		<LoadingSkeleton variant="chart" message="Laddar sektoruppdelning..." />
	{:else if error}
		<ErrorState
			message="Kunde inte ladda sektordata"
			details={error}
			onRetry={fetchSectorData}
		/>
	{:else if !chartData || chartData.length === 0}
		<EmptyState
			message="Ingen sektordata tillgänglig"
			description="Ingen data finns för valt år och geografi"
		/>
	{:else}
		<div class="mb-4">
			<h3 class="text-lg font-medium">Sektoruppdelning</h3>
			<p class="text-sm text-gray-600">
				Total: {formatNumber(
					sectorData.reduce((sum, item) => sum + item.value, 0),
					'M',
					'Wh'
				)}
			</p>
		</div>
		<BarChart
			data={chartData}
			x="sector"
			y="value"
			props={{
                xAxis: { tweened: true },
                yAxis: { format: "metric", tweened: true },
                bars: {tweened: true, radius: 2, stroke: 'none' },
            }}
        />
    {/if}
</div>