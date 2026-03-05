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
	import { getSegmentColor, getSegmentLabel, SEGMENT_ORDER, CHART_PADDING } from '$lib/chartConfig';
	import type { Snippet } from 'svelte';

	let {
		year,
		segment = 'all',
		exportable = true,
		description = '',
		headerControls,
		class: className = '',
		baseScenarioOverride,
		parameterValuesOverride,
		parameterData
	}: {
		year?: number;
		segment?: string;
		exportable?: boolean;
		description?: string;
		headerControls?: Snippet;
		class?: string;
		baseScenarioOverride?: string;
		parameterValuesOverride?: Record<string, number>;
		parameterData?: { geographies?: any[] };
	} = $props();

	// Parse which segments to display (always fetch all, filter display)
	const activeSegments = $derived.by(() => {
		if (!segment || segment === 'all' || segment === 'total') return SEGMENT_ORDER;
		return segment.split(',').map(s => s.trim()).filter(s => SEGMENT_ORDER.includes(s));
	});

	let loading = $state(false);
	let error = $state<string | null>(null);
	let fetchedData = $state<any[]>([]);

	// Per-chart scenario/parameter overrides (fall back to global store)
	const baseScenario = $derived(baseScenarioOverride || parameterStore.baseScenario);
	const parameterValues = $derived(
		parameterValuesOverride ?? (parameterStore.isDefaultScenario ? parameterStore.parameterValues : undefined)
	);

	// Geography lookup: prefer prop, fall back to viewStore (set by page loader)
	const geographies = $derived(parameterData?.geographies || (viewStore.pageData as any)?.geographies || []);

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
				baseScenario,
				parameterValues
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
			// Skip segments not in the active filter
			if (!activeSegments.includes(row.segment)) continue;

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

			// Calculate percentage for each active segment
			for (const seg of activeSegments) {
				const value = data.segments[seg] || 0;
				entry[seg] = data.total > 0 ? (value / data.total) * 100 : 0;
			}

			result.push(entry);
		}

		// Sort by geo_id (county code) ascending
		result.sort((a, b) => a.geo_id.localeCompare(b.geo_id));

		return result;
	});

	// Create series configuration for stacked bars (only active segments)
	let series = $derived(
		activeSegments.map(seg => ({
			key: seg,
			color: getSegmentColor(seg).bg,
			label: getSegmentLabel(seg)
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
	sizeVariant="none"
	aspectRatio="auto"
	metadata={exportMetadata}
	chartData={chartData}
	{exportable}
	{headerControls}
	class={className}
>
	<div>
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
					padding={CHART_PADDING.rotatedX}
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
				{#each activeSegments as seg}
					{@const colors = getSegmentColor(seg)}
					<div class="flex items-center gap-1.5">
						<div
							class="w-3 h-3 rounded-sm"
							style="background-color: {colors.bg};"
						></div>
						<span class="text-gray-700 dark:text-gray-300">{getSegmentLabel(seg)}</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</ChartContainer>
