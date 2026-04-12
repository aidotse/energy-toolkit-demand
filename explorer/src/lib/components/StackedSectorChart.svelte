<script lang="ts">
	/**
	 * StackedSectorChart - Stacked area chart showing sector breakdown over time
	 *
	 * Displays electricity demand by sector (2025–2050) as stacked areas,
	 * with an optional geography filter.
	 *
	 * In comparison mode, shows baseline stacked areas with total-demand
	 * overlay lines for each comparison scenario.
	 *
	 * @component
	 */
	import { formatNumber, makeDemandQuery } from '$lib/utilities';
	import { getEnergyPrefix } from '$lib/stores/units.svelte';
	import { fetchDemandData } from '$lib/dataService';
	import LoadingSkeleton from '$lib/components/shared/LoadingSkeleton.svelte';
	import ErrorState from '$lib/components/shared/ErrorState.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import ChartContainer from '$lib/components/shared/ChartContainer.svelte';
	import ScenarioLegend from '$lib/components/shared/ScenarioLegend.svelte';
	import { parameterStore } from '$lib/stores/parameterStore.svelte';
	import { scenarioState } from '$lib/stores/scenario.svelte';
	import {
		getNormalizedScenarios,
		assignScenarioColors
	} from '$lib/comparisonUtils';
	import { SEGMENT_ORDER, getSegmentLabel, getSegmentColor } from '$lib/chartConfig';
	import { viz } from '$lib/colors';
	import type { Snippet } from 'svelte';
	import type { ScenarioObject } from '$lib/types/ChartComponent.interface';

	let {
		geography = 'total',
		scenarios: scenariosProp,
		comparisonMode = false,
		exportable = true,
		description = '',
		headerControls,
		baseScenarioOverride,
		parameterValuesOverride,
		class: className = ''
	}: {
		geography?: string;
		scenarios?: ScenarioObject[];
		comparisonMode?: boolean;
		exportable?: boolean;
		description?: string;
		headerControls?: Snippet;
		baseScenarioOverride?: string;
		parameterValuesOverride?: Record<string, number>;
		class?: string;
	} = $props();

	// Subscribe to global scenario state
	const currentScenario = $derived(scenarioState.currentScenario);

	// Normalize scenarios for comparison mode
	const normalizedScenarios = $derived(
		comparisonMode && scenariosProp
			? assignScenarioColors(scenariosProp)
			: assignScenarioColors(getNormalizedScenarios(currentScenario, scenariosProp))
	);

	let loading = $state(false);
	let error = $state<string | null>(null);
	let rawData = $state<any[]>([]);
	let dataByScenario = $state<Record<string, any[]>>({});
	let hoveredScenarioId = $state<string | null>(null);
	let selectedScenarioId = $state<string | null>(null);

	let containerEl = $state<HTMLDivElement | null>(null);
	let chartWidth = $state(600);

	$effect(() => {
		if (!containerEl || typeof ResizeObserver === 'undefined') return;
		const ro = new ResizeObserver(([entry]) => {
			const w = entry.contentRect.width;
			if (w > 0) chartWidth = Math.round(w);
		});
		ro.observe(containerEl);
		return () => ro.disconnect();
	});

	const baseScenario = $derived(baseScenarioOverride || parameterStore.baseScenario);
	const parameterValues = $derived(
		parameterValuesOverride ?? (parameterStore.isDefaultScenario ? parameterStore.parameterValues : undefined)
	);

	// Fetch all segments for the selected geography, yearly
	$effect(() => {
		const _bs = baseScenario;
		const _pv = parameterValues;
		const _geo = geography;
		if (normalizedScenarios.length > 0 && _bs) {
			fetchData();
		}
	});

	async function fetchData() {
		try {
			loading = true;
			error = null;

			if (normalizedScenarios.length === 1) {
				// Single scenario mode
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
			} else {
				// Comparison mode - fetch for each scenario
				const fetchPromises = normalizedScenarios.map(async (scenario) => {
					const scenarioId = scenario.id || scenario.scenario_id || 'default';
					const query = makeDemandQuery({
						start: '2025',
						end: '2051',
						resolution: '1Y',
						aggregation: 'sum',
						geography,
						segment: 'all',
						baseScenario: scenarioId
					});

					const data = await fetchDemandData(query);
					return { scenarioId, data };
				});

				const results = await Promise.all(fetchPromises);

				// First scenario's raw data becomes the stacked baseline
				const baselineId = normalizedScenarios[0].id || normalizedScenarios[0].scenario_id || 'default';
				const baselineResult = results.find(r => r.scenarioId === baselineId);
				if (baselineResult) {
					rawData = baselineResult.data;
				}

				const newDataByScenario: Record<string, any[]> = {};
				for (const { scenarioId, data } of results) {
					newDataByScenario[scenarioId] = data;
				}
				dataByScenario = newDataByScenario;
			}
		} catch (err: any) {
			error = err?.message || 'Ett oväntat fel inträffade';
			rawData = [];
			dataByScenario = {};
		} finally {
			loading = false;
		}
	}

	// Transform raw data into stacked format: [{ year, industry, housing, ... }]
	let stackedData = $derived.by(() => {
		if (rawData.length === 0) return [];

		const byYear = new Map<number, Record<string, number>>();

		for (const row of rawData) {
			const yr = row.period instanceof Date ? row.period.getFullYear() : new Date(row.period).getFullYear();
			const seg = row.segment;
			if (!seg || seg === 'total') continue;

			if (!byYear.has(yr)) byYear.set(yr, { year: yr });
			const entry = byYear.get(yr)!;
			entry[seg] = (entry[seg] || 0) + (row.value || 0);
		}

		return Array.from(byYear.values()).sort((a, b) => a.year - b.year);
	});

	// Compute total demand per year for each comparison scenario (overlay lines)
	let scenarioTotals = $derived.by(() => {
		if (normalizedScenarios.length <= 1) return {};

		const result: Record<string, { year: number; total: number }[]> = {};

		for (const scenario of normalizedScenarios) {
			const scenarioId = scenario.id || scenario.scenario_id || '';
			const data = dataByScenario[scenarioId] || [];

			const byYear = new Map<number, number>();
			for (const row of data) {
				const yr = row.period instanceof Date ? row.period.getFullYear() : new Date(row.period).getFullYear();
				const seg = row.segment;
				if (!seg || seg === 'total') continue;
				byYear.set(yr, (byYear.get(yr) || 0) + (row.value || 0));
			}

			result[scenarioId] = Array.from(byYear.entries())
				.map(([year, total]) => ({ year, total }))
				.sort((a, b) => a.year - b.year);
		}

		return result;
	});

	let isComparisonActive = $derived(normalizedScenarios.length > 1 && Object.keys(dataByScenario).length > 0);

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

	// Y domain: max of stacked total OR max of any scenario total
	let yMax = $derived.by(() => {
		let max = 0;
		// Max from stacked baseline
		for (const row of stackedData) {
			let sum = 0;
			for (const seg of activeSegments) {
				sum += row[seg] || 0;
			}
			if (sum > max) max = sum;
		}
		// Also check comparison scenario totals
		if (isComparisonActive) {
			for (const totals of Object.values(scenarioTotals)) {
				for (const point of totals) {
					if (point.total > max) max = point.total;
				}
			}
		}
		return max;
	});

	// Hovered segment for legend
	let hoveredSegment = $state<string | null>(null);

	function getScenarioOpacity(scenarioId: string): number {
		if (selectedScenarioId) {
			return selectedScenarioId === scenarioId ? 1 : 0.2;
		}
		if (hoveredScenarioId) {
			return hoveredScenarioId === scenarioId ? 1 : 0.2;
		}
		return 1;
	}

	function handleScenarioHover(scenarioId: string | null) {
		hoveredScenarioId = scenarioId;
	}

	function handleScenarioClick(scenarioId: string) {
		selectedScenarioId = selectedScenarioId === scenarioId ? null : scenarioId;
	}

	// Comparison metadata for legend
	let comparisonMetadata = $derived.by(() => {
		if (!isComparisonActive) return null;
		return {
			scenarios: normalizedScenarios,
			colors: normalizedScenarios.map(s => s.color || '')
		};
	});

	let exportMetadata = $derived({
		chartType: 'stacked-sector-chart',
		geography,
		scenarios: normalizedScenarios.length > 1
			? normalizedScenarios.map(s => s.id || s.scenario_id || 'unknown')
			: undefined
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
	<div bind:this={containerEl} class="h-[250px] sm:h-[300px] lg:h-[350px] w-full">
		{#if loading && stackedData.length === 0}
			<LoadingSkeleton variant="chart" message="Laddar sektordata..." />
		{:else if error}
			<ErrorState message="Kunde inte ladda sektordata" details={error} onRetry={fetchData} />
		{:else if stackedData.length === 0}
			<EmptyState message="Ingen data tillgänglig" description="Ingen sektordata för vald geografi" />
		{:else}
			<!-- Custom stacked area using SVG -->
			{@const padding = { top: 20, right: 20, bottom: 30, left: 60 }}
			{@const chartHeight = 350}
			{@const plotWidth = chartWidth - padding.left - padding.right}
			{@const plotHeight = chartHeight - padding.top - padding.bottom}

			<svg viewBox="0 0 {chartWidth} {chartHeight}" class="w-full h-full" preserveAspectRatio="xMidYMid meet">
				<g transform="translate({padding.left}, {padding.top})">
					<!-- Y-axis gridlines -->
					{#each Array.from({length: 5}, (_, i) => yMax * (i / 4)) as tick}
						{@const y = plotHeight - (tick / yMax) * plotHeight}
						<line x1="0" y1={y} x2={plotWidth} y2={y} stroke={viz.grid} stroke-width="1" />
						<text x="-8" y={y} text-anchor="end" dominant-baseline="middle" fill={viz.label} style="font-size: 10px;">
							{formatNumber(tick, getEnergyPrefix(), 'Wh').replace(/\.\d+/, '')}
						</text>
					{/each}

					<!-- Stacked areas (baseline scenario) -->
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
							fill-opacity={hoveredSegment && hoveredSegment !== segment ? 0.3 : isComparisonActive ? 0.6 : 0.8}
							stroke={colors.bg}
							stroke-width="1"
							class="transition-opacity duration-150 cursor-pointer"
							onmouseenter={() => hoveredSegment = segment}
							onmouseleave={() => hoveredSegment = null}
							role="img"
							aria-label={getSegmentLabel(segment)}
						/>
					{/each}

					<!-- Comparison mode: overlay total-demand lines for each scenario -->
					{#if isComparisonActive}
						{#each normalizedScenarios as scenario}
							{@const scenarioId = scenario.id || scenario.scenario_id || ''}
							{@const totals = scenarioTotals[scenarioId] || []}
							{#if totals.length > 0}
								{@const linePath = totals.map((p, i) => {
									const x = (i / Math.max(totals.length - 1, 1)) * plotWidth;
									const y = plotHeight - (p.total / yMax) * plotHeight;
									return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
								}).join(' ')}
								<path
									d={linePath}
									fill="none"
									stroke={scenario.color}
									stroke-width={hoveredScenarioId === scenarioId || selectedScenarioId === scenarioId ? 3.5 : 2.5}
									stroke-dasharray="6 3"
									class="transition-opacity duration-150"
									opacity={getScenarioOpacity(scenarioId)}
									role="button"
									tabindex="0"
									aria-label={`Scenario ${scenario.name}`}
									onmouseenter={() => handleScenarioHover(scenarioId)}
									onmouseleave={() => handleScenarioHover(null)}
									onclick={() => handleScenarioClick(scenarioId)}
									onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleScenarioClick(scenarioId); } }}
									style="cursor: pointer; pointer-events: stroke;"
								/>
							{/if}
						{/each}
					{/if}

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

		{/if}
	</div>

	<!-- Legends (outside fixed-height container) -->
	{#if stackedData.length > 0}
		<div class="flex flex-col gap-2 mt-1 pb-2 px-4">
			<div class="flex flex-wrap gap-3 justify-center">
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

			{#if isComparisonActive && comparisonMetadata}
				<ScenarioLegend
					scenarios={normalizedScenarios}
					metadata={comparisonMetadata}
					onHover={handleScenarioHover}
					onClick={handleScenarioClick}
				/>
			{/if}
		</div>
	{/if}
</ChartContainer>
