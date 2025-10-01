<script lang="ts">
	/**
	 * TimeLine Component - Time series visualization with multiple chart types
	 *
	 * Standardized chart component following ChartComponent interface patterns.
	 * Displays electricity demand over time with switchable chart types (area, line, bar).
	 *
	 * @component
	 */
	import { AreaChart, LineChart, BarChart } from 'layerchart';
	import { ButtonGroup, Button } from 'svelte-ux';
	import { ChartLine, ChartArea, ChartColumn } from 'lucide-svelte';
	import { fetchDemandData } from '$lib/dataService';
	import { makeDemandQuery } from '$lib/utilities';
	import LoadingSkeleton from '$lib/components/shared/LoadingSkeleton.svelte';
	import ErrorState from '$lib/components/shared/ErrorState.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import type { TimeSeriesChartProps } from '$lib/types/ChartComponent.interface';

	let {
		data: dayData = [],
		geography,
		resolution = '1d',
		segment: sector,
		aggregation = 'sum',
		year,
		scenario,
		class: className = ''
	}: TimeSeriesChartProps & { segment?: string; class?: string } = $props();

	let chartType: 'line' | 'area' | 'bar' = $state('area');
	let loading = $state(false);
	let error = $state<string | null>(null);

	let chartData = $derived(
		(dayData || []).map((d) => ({
			timestamp: d.timestamp,
			total: d.value || d.total || 0
		}))
	);

	// Reactive data fetching when parameters change
	$effect(() => {
		if (!dayData || dayData.length === 0) {
			fetchTimelineData();
		}
	});

	async function fetchTimelineData() {
		try {
			loading = true;
			error = null;

			const query = makeDemandQuery({
				start: `${year}-01-01`,
				end: `${year + 1}-01-01`,
				resolution,
				aggregation,
				geography,
				segment: sector || 'housing',
				scenarioId: scenario?.id || scenario?.scenario_id || 'default'
			});

			const data = await fetchDemandData(query);
			dayData = data;
		} catch (err: any) {
			error = err?.message || 'Ett oväntat fel inträffade';
			console.error('Error fetching timeline data:', err);
			dayData = [];
		} finally {
			loading = false;
		}
	}
</script>

<div class="h-[300px] w-full ml-8 mb-14 mr-2 mt-1 @container {className}">
	{#if loading}
		<LoadingSkeleton variant="chart" message="Laddar tidsserie..." />
	{:else if error}
		<ErrorState message="Kunde inte ladda tidsserie" details={error} onRetry={fetchTimelineData} />
	{:else if !chartData || chartData.length === 0}
		<EmptyState
			message="Ingen data tillgänglig"
			description="Ingen data finns för vald tidsperiod"
		/>
	{:else}
		<div class="flex justify-end mb-4">
			<ButtonGroup>
				<Button
					class="mx-px text-xs"
					variant="fill-light"
					color="primary"
					on:click={() => (chartType = 'area')}
					active={chartType === 'area'}
				>
                    <ChartArea />
                </Button>
                <Button
                    class="mx-px text-xs"
                    variant="fill-light"
                    color="primary"
                    on:click={() => (chartType = 'line')}
                    active={chartType === 'line'}
                >
                    <ChartLine />
                </Button>
                <Button
                    class="mx-px text-xs"
                    variant="fill-light"
                    color="primary"
                    on:click={() => (chartType = 'bar')}
                    active={chartType === 'bar'}
                    disabled={resolution !== '1W' && resolution !== '1ME'}
                >
                    <ChartColumn />
                </Button>
            </ButtonGroup>
        </div>

        {#if chartType === 'line'}
            <LineChart
                data={chartData}
                series={[
                    { name: "Total", key: "total", color: "#47B3FF" }
                ]}
                x="timestamp"
                y="total"
            />
        {:else if chartType === 'area'}
            <AreaChart
                data={chartData}
                x="timestamp"
                y="total"
                color="#47B3FF"
            />
        {:else if chartType === 'bar'}
            <BarChart
                data={chartData}
                x="timestamp"
                y="total"
                props={{
                    xAxis: { tweened: true },
                    yAxis: { format: "metric", tweened: true },
                    bars: {tweened: true, radius: 2, stroke: 'none' },
                }}
            />
        {/if}
    {/if}
</div>