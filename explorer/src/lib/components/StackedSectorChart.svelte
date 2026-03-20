<script lang="ts">
	/**
	 * StackedSectorChart - Stacked area chart showing sector breakdown over time
	 *
	 * Displays electricity demand by sector (2025–2050) as stacked areas,
	 * with an optional geography filter.
	 *
	 * @component
	 */
	import { AreaChart } from 'layerchart';
	import { formatNumber, makeDemandQuery } from '$lib/utilities';
	import { getEnergyPrefix } from '$lib/stores/units.svelte';
	import { fetchDemandData } from '$lib/dataService';
	import LoadingSkeleton from '$lib/components/shared/LoadingSkeleton.svelte';
	import ErrorState from '$lib/components/shared/ErrorState.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import ChartContainer from '$lib/components/shared/ChartContainer.svelte';
	import { parameterStore } from '$lib/stores/parameterStore.svelte';
	import { SEGMENT_ORDER, getSegmentLabel, getSegmentColor, CHART_PADDING } from '$lib/chartConfig';
	import { getTimeSeriesAxisConfig } from '$lib/chartConfig';
	import { viz } from '$lib/colors';
	import type { Snippet } from 'svelte';

	let {
		geography = 'total',
		exportable = true,
		description = '',
		headerControls,
		baseScenarioOverride,
		parameterValuesOverride,
		class: className = ''
	}: {
		geography?: string;
		exportable?: boolean;
		description?: string;
		headerControls?: Snippet;
		baseScenarioOverride?: string;
		parameterValuesOverride?: Record<string, number>;
		class?: string;
	} = $props();

	let loading = $state(false);
	let error = $state<string | null>(null);
	let rawData = $state<any[]>([]);

	const baseScenario = $derived(baseScenarioOverride || parameterStore.baseScenario);
	const parameterValues = $derived(
		parameterValuesOverride ?? (parameterStore.isDefaultScenario ? parameterStore.parameterValues : undefined)
	);

	// Fetch all segments for the selected geography, yearly
	$effect(() => {
		const _bs = baseScenario;
		const _pv = parameterValues;
		const _geo = geography;
		if (!_bs) return;
		fetchData();
	});

	async function fetchData() {
		try {
			loading = true;
			error = null;

			const query = makeDemandQuery({
				start: '2025',
				end: '2051',
				resolution: '1Y',
				aggregation: 'sum',
				geography,
				segment: 'all',
				baseScenario,
				parameterValues
			});

			const data = await fetchDemandData(query);
			rawData = data;
		} catch (err: any) {
			error = err?.message || 'Ett oväntat fel inträffade';
			rawData = [];
		} finally {
			loading = false;
		}
	}

	// Transform raw data into stacked format: [{ year, industry, housing, ... }]
	let stackedData = $derived.by(() => {
		if (rawData.length === 0) return [];

		const byYear = new Map<number, Record<string, number>>();

		for (const row of rawData) {
			const yr = row.timestamp?.getFullYear?.() || new Date(row.period).getFullYear();
			const seg = row.segment;
			if (!seg || seg === 'total') continue;

			if (!byYear.has(yr)) byYear.set(yr, { year: yr });
			const entry = byYear.get(yr)!;
			entry[seg] = (entry[seg] || 0) + (row.value || 0);
		}

		return Array.from(byYear.values()).sort((a, b) => a.year - b.year);
	});

	// Segments present in the data
	let activeSegments = $derived.by(() => {
		const segs = new Set<string>();
		for (const row of stackedData) {
			for (const key of Object.keys(row)) {
				if (key !== 'year' && SEGMENT_ORDER.includes(key as any)) segs.add(key);
			}
		}
		return [...SEGMENT_ORDER].filter(s => segs.has(s));
	});

	// Y domain: max of stacked total
	let yMax = $derived.by(() => {
		let max = 0;
		for (const row of stackedData) {
			let sum = 0;
			for (const seg of activeSegments) {
				sum += row[seg] || 0;
			}
			if (sum > max) max = sum;
		}
		return max;
	});

	let xMin = $derived(stackedData.length > 0 ? stackedData[0].year : 2025);
	let xMax = $derived(stackedData.length > 0 ? stackedData[stackedData.length - 1].year : 2050);

	// Hovered segment for legend
	let hoveredSegment = $state<string | null>(null);

	let exportMetadata = $derived({
		chartType: 'stacked-sector-chart',
		geography
	});
</script>

<ChartContainer
	title="Sektorer över tid"
	{description}
	sizeVariant="none"
	aspectRatio="auto"
	metadata={exportMetadata}
	chartData={stackedData}
	{exportable}
	{headerControls}
	class={className}
>
	<div class="h-[250px] sm:h-[300px] lg:h-[350px]">
		{#if loading && stackedData.length === 0}
			<LoadingSkeleton variant="chart" message="Laddar sektordata..." />
		{:else if error}
			<ErrorState message="Kunde inte ladda sektordata" details={error} onRetry={fetchData} />
		{:else if stackedData.length === 0}
			<EmptyState message="Ingen data tillgänglig" description="Ingen sektordata för vald geografi" />
		{:else}
			<!-- Custom stacked area using SVG -->
			{@const padding = { top: 20, right: 20, bottom: 30, left: 60 }}
			{@const chartWidth = 600}
			{@const chartHeight = 350}
			{@const plotWidth = chartWidth - padding.left - padding.right}
			{@const plotHeight = chartHeight - padding.top - padding.bottom}

			<svg viewBox="0 0 {chartWidth} {chartHeight}" class="w-full h-full" preserveAspectRatio="xMidYMid meet">
				<g transform="translate({padding.left}, {padding.top})">
					<!-- Y-axis gridlines -->
					{#each Array.from({length: 5}, (_, i) => yMax * (i / 4)) as tick}
						{@const y = plotHeight - (tick / yMax) * plotHeight}
						<line x1="0" y1={y} x2={plotWidth} y2={y} stroke="#e5e7eb" stroke-width="1" />
						<text x="-8" y={y} text-anchor="end" dominant-baseline="middle" fill={viz.label} style="font-size: 10px;">
							{formatNumber(tick, getEnergyPrefix(), 'Wh').replace(/\.\d+/, '')}
						</text>
					{/each}

					<!-- Stacked areas -->
					{#each activeSegments.toReversed() as segment, layerIdx}
						{@const colors = getSegmentColor(segment)}
						{@const points = stackedData.map((d, i) => {
							const x = (i / Math.max(stackedData.length - 1, 1)) * plotWidth;
							// Calculate cumulative y for this segment and all below
							let cumBelow = 0;
							let cumAbove = 0;
							for (let si = activeSegments.length - 1; si >= 0; si--) {
								const s = activeSegments[si];
								const val = d[s] || 0;
								if (si > activeSegments.length - 1 - layerIdx) {
									cumBelow += val;
								} else if (si === activeSegments.length - 1 - layerIdx) {
									cumAbove = cumBelow + val;
								}
							}
							const yTop = plotHeight - (cumAbove / yMax) * plotHeight;
							const yBot = plotHeight - (cumBelow / yMax) * plotHeight;
							return { x, yTop, yBot };
						})}
						{@const pathTop = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.yTop}`).join(' ')}
						{@const pathBot = points.toReversed().map((p, i) => `${i === 0 ? 'L' : 'L'} ${p.x} ${p.yBot}`).join(' ')}
						<path
							d="{pathTop} {pathBot} Z"
							fill={colors.bg}
							fill-opacity={hoveredSegment && hoveredSegment !== segment ? 0.3 : 0.8}
							stroke={colors.bg}
							stroke-width="1"
							class="transition-opacity duration-150 cursor-pointer"
							onmouseenter={() => hoveredSegment = segment}
							onmouseleave={() => hoveredSegment = null}
							role="img"
							aria-label={getSegmentLabel(segment)}
						/>
					{/each}

					<!-- X-axis labels -->
					{#each stackedData.filter((_, i) => i % 5 === 0 || i === stackedData.length - 1) as d, i}
						{@const x = (stackedData.indexOf(d) / Math.max(stackedData.length - 1, 1)) * plotWidth}
						<text x={x} y={plotHeight + 18} text-anchor="middle" fill={viz.label} style="font-size: 10px;">
							{d.year}
						</text>
					{/each}

					<!-- X-axis line -->
					<line x1="0" y1={plotHeight} x2={plotWidth} y2={plotHeight} stroke="black" stroke-width="1.5" />
				</g>
			</svg>

			<!-- Legend -->
			<div class="flex flex-wrap gap-3 justify-center mt-2 px-4">
				{#each activeSegments as segment}
					{@const colors = getSegmentColor(segment)}
					<button
						class="flex items-center gap-1.5 text-xs transition-opacity {hoveredSegment && hoveredSegment !== segment ? 'opacity-40' : ''}"
						onmouseenter={() => hoveredSegment = segment}
						onmouseleave={() => hoveredSegment = null}
					>
						<span class="inline-block w-3 h-3 rounded-sm" style="background-color: {colors.bg}"></span>
						{getSegmentLabel(segment)}
					</button>
				{/each}
			</div>
		{/if}
	</div>
</ChartContainer>
