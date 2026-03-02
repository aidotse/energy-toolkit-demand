<script lang="ts">
	/**
	 * GeoSegmentChart Component - 100% Stacked Column Chart
	 *
	 * Shows electricity demand composition by segment for each county.
	 * Each bar represents 100% of a county's demand, with segments showing proportions.
	 * Counties are ordered by county code (geo_id).
	 *
	 * @component
	 */
	import { BarChart } from 'layerchart';
	import { makeDemandQuery } from '$lib/utilities';
	import { fetchDemandData } from '$lib/dataService';
	import LoadingSkeleton from '$lib/components/shared/LoadingSkeleton.svelte';
	import ErrorState from '$lib/components/shared/ErrorState.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import ChartContainer from '$lib/components/shared/ChartContainer.svelte';
	import { parameterStore } from '$lib/stores/parameterStore.svelte';
	import { viewStore } from '$lib/stores/viewStore.svelte';
	import { getSegmentColor, getSegmentLabel, SEGMENT_ORDER } from '$lib/chartConfig';
	import type { Snippet } from 'svelte';

	let {
		year,
		exportable = true,
		description = '',
		headerControls,
		class: className = ''
	}: {
		year?: number;
		exportable?: boolean;
		description?: string;
		headerControls?: Snippet;
		class?: string;
	} = $props();

	let loading = $state(false);
	let error = $state<string | null>(null);
	let fetchedData = $state<any[]>([]);

	// Get current parameter state for reactive fetching
	const baseScenario = $derived(parameterStore.baseScenario);
	const parameterValues = $derived(parameterStore.parameterValues);

	// Geography lookup from viewStore (set by page loader)
	const geographies = $derived((viewStore.pageData as any)?.geographies || []);

	// Reactive data fetching when parameters change
	$effect(() => {
		if (year && baseScenario) {
			const _params = parameterValues;
			fetchGeoSegmentData();
		}
	});

	async function fetchGeoSegmentData() {
		if (!year) {
			error = 'Year must be specified';
			return;
		}

		try {
			loading = true;
			error = null;

			const query = makeDemandQuery({
				start: String(year),
				end: String(year + 1),
				resolution: '1Y',
				aggregation: 'sum',
				geography: 'all',
				segment: 'all',
				baseScenario: parameterStore.baseScenario,
				parameterValues: parameterStore.isDefaultScenario ? parameterStore.parameterValues : undefined
			});

			const data = await fetchDemandData(query);
			fetchedData = data;
		} catch (err: any) {
			error = err?.message || 'An unexpected error occurred';
			console.error('Error fetching geo segment data:', err);
			fetchedData = [];
		} finally {
			loading = false;
		}
	}

	// Transform data into 100% stacked format
	let chartData = $derived.by(() => {
		if (!fetchedData || fetchedData.length === 0 || !geographies.length) {
			return [];
		}

		// Group data by geography
		const geoMap = new Map<string, { total: number; segments: Record<string, number> }>();

		for (const row of fetchedData) {
			// Skip 'total' geography and segment
			if (row.geography === '00' || row.geography === 'total' || row.segment === 'total') {
				continue;
			}

			if (!geoMap.has(row.geography)) {
				geoMap.set(row.geography, { total: 0, segments: {} });
			}

			const geoData = geoMap.get(row.geography)!;
			geoData.segments[row.segment] = (geoData.segments[row.segment] || 0) + row.value;
			geoData.total += row.value;
		}

		// Transform to chart format with percentages
		const result: any[] = [];

		for (const [geoId, data] of geoMap.entries()) {
			// Look up geography name
			const geoLookup = geographies.find(
				(g: any) => g.geo_id === geoId || g.id === geoId
			);
			const geoName = (geoLookup?.geo_name || geoLookup?.name || geoId).replace(/s? län$/, '');

			// Skip if no valid name or 'Sverige' (total)
			if (!geoName || geoName === 'Sverige') {
				continue;
			}

			const entry: any = {
				geo_id: geoId,
				name: geoName,
				total: data.total
			};

			// Calculate percentage for each segment
			for (const segment of SEGMENT_ORDER) {
				const value = data.segments[segment] || 0;
				entry[segment] = data.total > 0 ? (value / data.total) * 100 : 0;
			}

			result.push(entry);
		}

		// Sort by geo_id (county code) ascending
		result.sort((a, b) => a.geo_id.localeCompare(b.geo_id));

		return result;
	});

	// Create series configuration for stacked bars
	let series = $derived(
		SEGMENT_ORDER.map(segment => ({
			key: segment,
			color: getSegmentColor(segment).bg,
			label: getSegmentLabel(segment)
		}))
	);

	// Prepare export metadata
	let exportMetadata = $derived({
		chartType: 'geo-segment-composition',
		year: year
	});
</script>

<ChartContainer
	title="Sektorernas andel per län"
	{description}
	sizeVariant="standard"
	aspectRatio="auto"
	metadata={exportMetadata}
	chartData={chartData}
	{exportable}
	{headerControls}
	class={className}
>
	<div class="h-[380px]">
		{#if loading}
			<LoadingSkeleton variant="chart" message="Laddar sektoruppdelning per län..." />
		{:else if error}
			<ErrorState
				message="Kunde inte ladda data"
				details={error}
				onRetry={fetchGeoSegmentData}
			/>
		{:else if chartData.length === 0}
			<EmptyState
				message="Ingen data tillgänglig"
				description="Ingen data finns för valt år"
			/>
		{:else}
			<div class="h-[400px] overflow-visible">
				<BarChart
					data={chartData}
					x="name"
					{series}
					seriesLayout="stack"
					padding={{ top: 4, bottom: 80, left: 48, right: 4 }}
					props={{
						xAxis: {
							tweened: false,
							tickLabelProps: { rotate: 315, textAnchor: 'end', fontSize: 11 }
						},
						yAxis: {
							tweened: false,
							format: (v: number) => `${Math.round(v)}%`
						},
						bars: { radius: 0, stroke: 'none' },
						highlight: {
							area: { fill: 'rgba(0,0,0,0.05)' }
						},
						tooltip: {
							hideTotal: true,
							root: {
								variant: 'none',
								contained: 'window',
								class: 'text-xs py-1 px-2 rounded shadow-lg bg-white/95 dark:bg-gray-800/95 border border-gray-200 dark:border-gray-700 backdrop-blur-sm'
							},
							item: {
								format: (v: number) => `${Math.round(v)}%`
							}
						}
					}}
				/>
			</div>

			<!-- Legend -->
			<div class="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2 text-sm">
				{#each SEGMENT_ORDER as segment}
					{@const colors = getSegmentColor(segment)}
					<div class="flex items-center gap-1.5">
						<div
							class="w-3 h-3 rounded-sm"
							style="background-color: {colors.bg};"
						></div>
						<span class="text-gray-700 dark:text-gray-300">{getSegmentLabel(segment)}</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</ChartContainer>
