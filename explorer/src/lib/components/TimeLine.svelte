<script lang="ts">
	/**
	 * TimeLine Component - Time series line chart visualization
	 *
	 * Supports single or multiple segments and geographies as overlapping
	 * colored line series. Optional mini-chart brush for zooming.
	 * Backward-compatible: single segment/geography string props still work.
	 *
	 * @component
	 */
	import { LineChart } from 'layerchart';
	import { fetchDemandData } from '$lib/dataService';
	import { makeDemandQuery, formatNumber } from '$lib/utilities';
	import { getPowerPrefix } from '$lib/stores/units.svelte';
	import LoadingSkeleton from '$lib/components/shared/LoadingSkeleton.svelte';
	import ErrorState from '$lib/components/shared/ErrorState.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import ScenarioLegend from '$lib/components/shared/ScenarioLegend.svelte';
	import ChartContainer from '$lib/components/shared/ChartContainer.svelte';
	import type { TimeSeriesChartProps } from '$lib/types/ChartComponent.interface';
	import { scenarioState } from '$lib/stores/scenario.svelte';
	import { parameterStore } from '$lib/stores/parameterStore.svelte';
	import {
		getNormalizedScenarios,
		assignScenarioColors,
		mergeScenarioData,
		createComparisonMetadata,
		hexToRgba
	} from '$lib/comparisonUtils';
	import { viz, SEGMENT_COLORS, GEO_PALETTE } from '$lib/colors';
	import { CHART_PADDING } from '$lib/chartConfig';
	import { getSegmentLabel } from '$lib/chartConfig';
	import type { Snippet } from 'svelte';

	let {
		data: dayDataProp = [],
		geography,
		geographies,
		resolution = '1d',
		segment,
		segments,
		aggregation = 'sum',
		year,
		scenarios: scenariosProp,
		comparisonMode = false,
		brushable = false,
		exportable = true,
		description = '',
		headerControls,
		baseScenarioOverride,
		parameterValuesOverride,
		class: className = ''
	}: TimeSeriesChartProps & {
		segment?: string;
		segments?: string | string[];
		geographies?: string | string[];
		brushable?: boolean;
		exportable?: boolean;
		description?: string;
		headerControls?: Snippet;
		baseScenarioOverride?: string;
		parameterValuesOverride?: Record<string, number>;
		class?: string;
	} = $props();

	// --- Normalize segments and geographies into arrays ---
	const resolvedSegments = $derived.by(() => {
		if (segments) {
			return Array.isArray(segments) ? segments : [segments];
		}
		if (segment) return [segment];
		return ['total'];
	});

	const resolvedGeographies = $derived.by(() => {
		if (geographies) {
			return Array.isArray(geographies) ? geographies : [geographies];
		}
		if (geography) return [geography];
		return ['total'];
	});

	const isMultiSeries = $derived(resolvedSegments.length > 1 || resolvedGeographies.length > 1);

	// Separate state for fetched data
	let rawData = $state<any[]>([]);

	// Subscribe to global scenario state
	const currentScenario = $derived(scenarioState.currentScenario);

	// Normalize scenarios for comparison mode
	const normalizedScenarios = $derived(
		comparisonMode && scenariosProp
			? assignScenarioColors(scenariosProp)
			: assignScenarioColors(getNormalizedScenarios(currentScenario ?? undefined, scenariosProp))
	);

	let loading = $state(false);
	let error = $state<string | null>(null);
	let dataByScenario = $state<Record<string, any[]>>({});

	// --- Hover/click highlighting for series and scenarios ---
	let hoveredSeriesId = $state<string | null>(null);
	let selectedSeriesId = $state<string | null>(null);

	function getSeriesOpacity(seriesId: string): number {
		if (selectedSeriesId) {
			return selectedSeriesId === seriesId ? 1.0 : 0.15;
		}
		if (hoveredSeriesId) {
			return hoveredSeriesId === seriesId ? 1.0 : 0.15;
		}
		return 1.0;
	}

	function handleLegendHover(seriesId: string | null) {
		hoveredSeriesId = seriesId;
	}

	function handleLegendClick(seriesId: string) {
		selectedSeriesId = selectedSeriesId === seriesId ? null : seriesId;
	}

	// --- Brush config ---
	// Integrated brush on the main chart: drag to zoom, click background to reset.
	let isZoomed = $state(false);
	// Incrementing key forces AreaChart to re-mount, resetting its internal xDomain
	let chartKey = $state(0);

	function resetZoom() {
		isZoomed = false;
		chartKey++;
	}

	const brushConfig = {
		axis: 'x' as const,
		resetOnEnd: true,
		range: { style: 'background: rgba(22, 144, 184, 0.15); border-left: 2px solid rgba(22, 144, 184, 0.4); border-right: 2px solid rgba(22, 144, 184, 0.4);' },
		handle: { style: 'background: rgba(22, 144, 184, 0.5); border-radius: 2px;' },
		onbrushend: () => { isZoomed = true; },
		onreset: () => { isZoomed = false; }
	};

	// Multi-geo color palette is sourced from $lib/colors so a single edit there
	// propagates to TimeLine, GeoPieChart, and any other consumer.

	// --- Build series key and color for each (segment, geography) pair ---
	function seriesKey(seg: string, geo: string): string {
		if (resolvedSegments.length > 1 && resolvedGeographies.length > 1) {
			return `${seg}/${geo}`;
		}
		if (resolvedSegments.length > 1) return seg;
		if (resolvedGeographies.length > 1) return geo;
		return 'default';
	}

	function seriesColor(seg: string, geo: string): string {
		if (resolvedSegments.length > 1 && resolvedGeographies.length <= 1) {
			return SEGMENT_COLORS[seg]?.bg || viz.fallback;
		}
		if (resolvedGeographies.length > 1 && resolvedSegments.length <= 1) {
			const geoIdx = resolvedGeographies.indexOf(geo);
			return GEO_PALETTE[geoIdx % GEO_PALETTE.length];
		}
		// Cross-product: segment color, varied by geo opacity handled elsewhere
		return SEGMENT_COLORS[seg]?.bg || GEO_PALETTE[resolvedGeographies.indexOf(geo) % GEO_PALETTE.length];
	}

	function seriesLabel(seg: string, geo: string): string {
		const segLabel = seg === 'total' ? 'Alla' : getSegmentLabel(seg);
		const geoLabel = geo === 'total' ? 'Sverige' : geo;
		if (resolvedSegments.length > 1 && resolvedGeographies.length > 1) {
			return `${segLabel} \u2014 ${geoLabel}`;
		}
		if (resolvedSegments.length > 1) return segLabel;
		if (resolvedGeographies.length > 1) return geoLabel;
		return segLabel;
	}

	// --- Compute all series keys ---
	const allSeriesKeys = $derived.by(() => {
		const keys: { key: string; seg: string; geo: string }[] = [];
		for (const seg of resolvedSegments) {
			for (const geo of resolvedGeographies) {
				keys.push({ key: seriesKey(seg, geo), seg, geo });
			}
		}
		return keys;
	});

	// --- Pivot raw data into chart-ready format ---
	// Single-series: [{ timestamp, total }]
	// Multi-series: [{ timestamp, "housing": val, "transport": val, ... }]
	let pivotedData = $derived.by(() => {
		if (!rawData || rawData.length === 0) return [];

		if (!isMultiSeries) {
			return rawData.map((d) => ({
				timestamp: d.period,
				total: d.value || d.total || 0
			}));
		}

		// Group by timestamp
		const byTime = new Map<string, Record<string, any>>();
		for (const d of rawData) {
			const ts = d.period;
			const tsKey = ts instanceof Date ? ts.toISOString() : String(ts);
			const seg = d.segment || 'total';
			const geo = d.geography || 'total';
			const key = seriesKey(seg, geo);

			if (!byTime.has(tsKey)) {
				byTime.set(tsKey, { timestamp: ts });
			}
			byTime.get(tsKey)![key] = d.value || d.total || 0;
		}

		return Array.from(byTime.values()).sort((a, b) => {
			const ta = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
			const tb = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
			return ta - tb;
		});
	});

	// --- Build LayerChart series array for multi-series mode ---
	let chartSeries = $derived.by(() => {
		if (!isMultiSeries) return [];
		return allSeriesKeys.map(({ key, seg, geo }) => {
			const color = seriesColor(seg, geo);
			const opacity = getSeriesOpacity(key);
			return {
				key,
				label: seriesLabel(seg, geo),
				value: key,
				color: 'transparent',
				props: {
					fill: 'none',
					stroke: hexToRgba(color, opacity),
					strokeWidth: 2
				}
			};
		});
	});

	// --- Scenario comparison data (existing logic, preserved) ---
	let comparisonData = $derived(
		normalizedScenarios.length > 1
			? mergeScenarioData(
					Object.fromEntries(
						Object.entries(dataByScenario).map(([scenarioId, data]) => [
							scenarioId,
							data.map((d) => ({
								timestamp: d.period instanceof Date ? d.period : new Date(d.period),
								value: d.value || d.total || 0
							}))
						])
					),
					normalizedScenarios
				)
			: []
	);

	let metadata = $derived(
		normalizedScenarios.length > 1
			? createComparisonMetadata(normalizedScenarios, comparisonData)
			: normalizedScenarios.length === 1
				? { scenarios: normalizedScenarios, colors: normalizedScenarios.map(s => s.color || '') }
				: null
	);

	// Get current parameter state for reactive fetching
	const baseScenario = $derived(baseScenarioOverride || parameterStore.baseScenario);
	const parameterValues = $derived(parameterValuesOverride || parameterStore.parameterValues);

	// Use prop data if provided (hybrid pattern)
	$effect(() => {
		if (dayDataProp && dayDataProp.length > 0) {
			rawData = dayDataProp;
			return;
		}
		if (normalizedScenarios.length > 0 && resolvedGeographies.length > 0 && year && resolution && resolvedSegments.length > 0 && baseScenario) {
			const _params = parameterValues;
			fetchTimelineData();
		}
	});

	async function fetchTimelineData() {
		if (!year || !resolution) {
			error = 'Saknar obligatoriska parametrar (år, upplösning)';
			return;
		}

		try {
			loading = true;
			error = null;

			if (normalizedScenarios.length === 1) {
				// Single scenario mode
				const segmentParam = resolvedSegments.length === 1
					? resolvedSegments[0]
					: resolvedSegments.join(',');

				const res = resolution as '1h' | '1d' | '1M' | '1Y';

				if (resolvedGeographies.length === 1) {
					// Single geography — one API call
					const query = makeDemandQuery({
						start: `${year}-01-01`,
						end: `${year + 1}-01-01`,
						resolution: res,
						aggregation,
						geography: resolvedGeographies[0],
						segment: segmentParam,
						baseScenario,
						parameterValues
					});
					rawData = await fetchDemandData(query);
				} else {
					// Multiple geographies — parallel fetches per geo
					const results = await Promise.all(
						resolvedGeographies.map(async (geo) => {
							const query = makeDemandQuery({
								start: `${year}-01-01`,
								end: `${year + 1}-01-01`,
								resolution: res,
								aggregation,
								geography: geo,
								segment: segmentParam,
								baseScenario,
								parameterValues
							});
							const data = await fetchDemandData(query);
							return data.map((d: any) => ({ ...d, geography: geo }));
						})
					);
					rawData = results.flat();
				}
			} else {
				// Comparison mode — fetch per scenario (existing logic)
				const res = resolution as '1h' | '1d' | '1M' | '1Y';
				const fetchPromises = normalizedScenarios.map(async (scenario) => {
					const scenarioId = scenario.id || scenario.scenario_id || 'default';
					const query = makeDemandQuery({
						start: `${year}-01-01`,
						end: `${year + 1}-01-01`,
						resolution: res,
						aggregation,
						geography: resolvedGeographies[0],
						segment: resolvedSegments[0],
						baseScenario: scenarioId
					});
					const data = await fetchDemandData(query);
					return { scenarioId, data };
				});

				const results = await Promise.all(fetchPromises);
				const newDataByScenario: Record<string, any[]> = {};
				for (const { scenarioId, data } of results) {
					newDataByScenario[scenarioId] = data;
				}
				dataByScenario = newDataByScenario;
			}
		} catch (err: any) {
			error = err?.message || 'Ett oväntat fel inträffade';
			console.error('Error fetching timeline data:', err);
			rawData = [];
			dataByScenario = {};
		} finally {
			loading = false;
		}
	}

	// Prepare export metadata
	let exportMetadata = $derived({
		chartType: 'timeline',
		geography: resolvedGeographies.join(','),
		year: year,
		scenario: normalizedScenarios.length === 1
			? (normalizedScenarios[0].id || normalizedScenarios[0].scenario_id)
			: undefined,
		scenarios: normalizedScenarios.length > 1
			? normalizedScenarios.map(s => s.id || s.scenario_id || 'unknown')
			: undefined
	});

	let exportData = $derived(
		normalizedScenarios.length > 1 ? comparisonData : pivotedData
	);

	// Format timestamp for tooltip — includes hour when data is hourly
	function formatTimestamp(ts: any): string {
		if (ts instanceof Date) {
			return ts.toLocaleString('sv-SE', {
				year: 'numeric', month: 'short', day: 'numeric',
				hour: '2-digit', minute: '2-digit'
			});
		}
		if (typeof ts === 'string' && ts.includes('T')) {
			return new Date(ts).toLocaleString('sv-SE', {
				year: 'numeric', month: 'short', day: 'numeric',
				hour: '2-digit', minute: '2-digit'
			});
		}
		return String(ts);
	}

	// Tooltip config — shared base, with single-series variant that hides "value" label
	const tooltipBase = {
		highlight: { area: { fill: 'rgba(0,0,0,0.05)' } },
		tooltip: {
			root: {
				variant: 'none' as const,
				contained: 'window' as const,
				class: 'text-xs py-1 px-2 rounded shadow-lg bg-white/95 border border-gray-200 backdrop-blur-sm'
			},
			header: {
				format: (v: any) => formatTimestamp(v)
			},
			item: {
				format: (v: number) => '\u00A0' + formatNumber(v, getPowerPrefix(), 'W')
			}
		}
	};
	// Single-series: show "Alla" as the label
	const tooltipSingle = {
		...tooltipBase,
		tooltip: {
			...tooltipBase.tooltip,
			item: {
				...tooltipBase.tooltip.item,
				label: 'Alla'
			}
		}
	};
	// Multi-series: labels come from series[].label automatically
	const tooltipMulti = tooltipBase;

	// Adaptive x-axis format — uses a stateful tracker to detect tick spacing
	// The format function receives individual tick values; we compare consecutive
	// ticks to determine the visible time span and pick the right granularity.
	let lastTickMs = $state(0);
	let tickSpanMs = $state(365 * 24 * 60 * 60 * 1000);

	function formatXTick(ts: any): string {
		const d = ts instanceof Date ? ts : new Date(ts);
		if (isNaN(d.getTime())) return String(ts);

		const ms = d.getTime();
		if (lastTickMs > 0 && ms !== lastTickMs) {
			tickSpanMs = Math.abs(ms - lastTickMs);
		}
		lastTickMs = ms;

		const spanDays = tickSpanMs / (1000 * 60 * 60 * 24);

		if (spanDays < 0.5) {
			// Sub-day tick spacing → show hours
			return d.toLocaleString('sv-SE', { hour: '2-digit', minute: '2-digit' });
		} else if (spanDays < 5) {
			// Few days between ticks → show day + month
			return d.toLocaleString('sv-SE', { day: 'numeric', month: 'short' });
		} else if (spanDays < 40) {
			// Weeks between ticks → show day + month
			return d.toLocaleString('sv-SE', { day: 'numeric', month: 'short' });
		} else {
			// Months between ticks → just month
			return d.toLocaleString('sv-SE', { month: 'short' });
		}
	}

	// Shared axis props
	const axisProps = {
		yAxis: { format: (v: number) => formatNumber(v, getPowerPrefix(), 'W').replace(/\.\d+/, ''), tickLabelProps: { fontSize: 11 } },
		xAxis: { format: formatXTick, tickLabelProps: { fontSize: 11 } }
	};

	// Scenario comparison helpers (reused from existing code)
	function getScenarioOpacity(scenarioId: string): number {
		if (selectedSeriesId) {
			return selectedSeriesId === scenarioId ? 0.9 : 0.1;
		}
		if (hoveredSeriesId) {
			return hoveredSeriesId === scenarioId ? 0.9 : 0.1;
		}
		return 0.5;
	}

	const hasData = $derived(pivotedData.length > 0 || comparisonData.length > 0);
</script>

<ChartContainer
	title="Tidslinje"
	{description}
	sizeVariant="none"
	aspectRatio="auto"
	metadata={exportMetadata}
	chartData={exportData}
	{exportable}
	{headerControls}
	exportPadding={{ left: 32, right: 32 }}
	class={className}
>
	{#if brushable && isZoomed}
		<div class="flex justify-end mb-1">
			<button
				onclick={resetZoom}
				class="inline-flex items-center gap-1 px-2 py-0.5 text-xs text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
			>
				<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" /></svg>
				Visa allt
			</button>
		</div>
	{/if}
	{#if brushable && !isZoomed}
		<p class="export-hide text-right text-xs text-gray-400 mb-1">Dra i diagrammet för att zooma in</p>
	{/if}
	<div class="h-[300px]">
	{#if loading}
		<LoadingSkeleton variant="chart" message="Laddar tidsserie..." />
	{:else if error}
		<ErrorState message="Kunde inte ladda tidsserie" details={error} onRetry={fetchTimelineData} />
	{:else if !hasData}
		<EmptyState
			message="Ingen data tillgänglig"
			description="Ingen data finns för vald tidsperiod"
		/>
	{:else if normalizedScenarios.length > 1}
		<!-- Comparison mode - multiple scenarios -->
		{@const hasRequiredFields = comparisonData.length > 0 &&
			comparisonData.every(d => d && d.timestamp && d.values) &&
			normalizedScenarios.every(s => {
				const sid = s.id || s.scenario_id;
				return sid && comparisonData.every(d => d.values && typeof d.values[sid] !== 'undefined');
			})}
		{#if hasRequiredFields}
			{@const lineSeries = normalizedScenarios.map(scenario => {
				const scenarioId = scenario.id || scenario.scenario_id || '';
				const opacity = getScenarioOpacity(scenarioId);
				return {
					key: scenarioId,
					value: scenarioId,
					color: 'transparent',
					props: {
						fill: 'none',
						stroke: hexToRgba(scenario.color || viz.scenario.baseline, opacity),
						strokeWidth: 2
					}
				};
			})}
			{#key chartKey}
				<LineChart
					data={comparisonData.map((d) => ({ timestamp: d.timestamp, ...d.values }))}
					x="timestamp"
					series={lineSeries}
					padding={CHART_PADDING.standard}
					brush={brushable ? brushConfig : false}
					props={{
						...axisProps,
						...tooltipMulti
					}}
				/>
			{/key}
		{/if}

	{:else if isMultiSeries}
		<!-- Multi-segment / multi-geography mode -->
		{#key chartKey}
			<LineChart
				data={pivotedData}
				x="timestamp"
				series={chartSeries}
				padding={CHART_PADDING.standard}
				brush={brushable ? brushConfig : false}
				props={{
					...axisProps,
					...tooltipMulti
				}}
			/>
		{/key}

	{:else}
		<!-- Single series mode (default / backward compatible) -->
		{#key chartKey}
			<LineChart
				data={pivotedData}
				x="timestamp"
				y="total"
				padding={CHART_PADDING.standard}
				brush={brushable ? brushConfig : false}
				props={{
					spline: { fill: 'none', stroke: viz.teal[900], strokeWidth: 2 },
					...axisProps,
					...tooltipSingle
				}}
			/>
		{/key}
	{/if}
	</div>

	{#if metadata && !isMultiSeries && !loading && hasData}
		<div class="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-1 pb-2 px-4">
			{#each normalizedScenarios as scenario, index}
				{@const scenarioId = scenario.id || scenario.scenario_id || ''}
				<button
					class="flex items-center gap-1.5 text-[11px] transition-opacity cursor-pointer"
					style="opacity: {getScenarioOpacity(scenarioId)}"
					title={scenario.name || `Scenario ${index + 1}`}
					onmouseenter={() => handleLegendHover(scenarioId)}
					onmouseleave={() => handleLegendHover(null)}
					onclick={() => handleLegendClick(scenarioId)}
				>
					<span
						class="w-3 h-2 rounded-sm inline-block"
						style="background: {scenario.color}"
					></span>
					<span class="text-gray-700">{normalizedScenarios.length === 1 ? 'Alla' : `Scenario ${index + 1}`}</span>
				</button>
			{/each}
		</div>
	{/if}

	{#if isMultiSeries && !loading && hasData}
		<div class="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-1 pb-2 px-4">
			{#each allSeriesKeys as { key, seg, geo }}
				<button
					class="flex items-center gap-1.5 text-[11px] transition-opacity cursor-pointer"
					style="opacity: {getSeriesOpacity(key)}"
					onmouseenter={() => handleLegendHover(key)}
					onmouseleave={() => handleLegendHover(null)}
					onclick={() => handleLegendClick(key)}
				>
					<span
						class="w-3 h-2 rounded-sm inline-block"
						style="background: {seriesColor(seg, geo)}"
					></span>
					<span class="text-gray-700">{seriesLabel(seg, geo)}</span>
				</button>
			{/each}
		</div>
	{/if}

</ChartContainer>
