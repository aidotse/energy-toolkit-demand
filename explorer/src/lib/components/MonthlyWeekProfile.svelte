<script lang="ts">
	/**
	 * MonthlyWeekProfile - Average weekly hourly profile per month
	 *
	 * Shows 12 lines (one per month) of the average hourly demand
	 * across a week (Monday–Sunday, 168 hours). Reveals both intraday
	 * patterns and seasonal differences.
	 *
	 * In comparison mode, collapses months into one yearly-average
	 * weekly profile per scenario, with colored overlay lines.
	 *
	 * @component
	 */
	import { fetchDemandData } from '$lib/dataService';
	import { makeDemandQuery, formatNumber } from '$lib/utilities';
	import { getEnergyPrefix } from '$lib/stores/units.svelte';
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
	import { viz, MONTHLY_PALETTE } from '$lib/colors';
	import type { DemandRow } from '$lib/dataService';
	import type { Snippet } from 'svelte';
	import type { ScenarioObject } from '$lib/types/ChartComponent.interface';

	type WeekProfilePoint = {
		month: number;
		monthName: string;
		weekHour: number; // 0-167
		value: number;    // average GW
	};

	type AggregatedWeekProfilePoint = {
		weekHour: number; // 0-167
		value: number;    // average GW across all months
	};

	let {
		geography = 'total',
		segment = 'total',
		year = 2025,
		scenarios: scenariosProp,
		comparisonMode = false,
		exportable = true,
		description = '',
		headerControls,
		class: className = '',
		baseScenarioOverride,
		parameterValuesOverride
	}: {
		geography?: string;
		segment?: string;
		year?: number;
		scenarios?: ScenarioObject[];
		comparisonMode?: boolean;
		exportable?: boolean;
		description?: string;
		headerControls?: Snippet;
		class?: string;
		baseScenarioOverride?: string;
		parameterValuesOverride?: Record<string, number>;
	} = $props();

	// Subscribe to global scenario state
	const currentScenario = $derived(scenarioState.currentScenario);

	// Normalize scenarios for comparison mode
	const normalizedScenarios = $derived(
		comparisonMode && scenariosProp
			? assignScenarioColors(scenariosProp)
			: assignScenarioColors(getNormalizedScenarios(currentScenario, scenariosProp))
	);

	// State
	let loading = $state(false);
	let error = $state<string | null>(null);
	let profileData = $state<WeekProfilePoint[]>([]);
	let dataByScenario = $state<Record<string, AggregatedWeekProfilePoint[]>>({});
	let hoveredMonth = $state<number | null>(null);
	let hoveredScenarioId = $state<string | null>(null);
	let selectedScenarioId = $state<string | null>(null);

	// Constants
	const MONTH_NAMES = [
		'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
		'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'
	];
	const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
	const DAY_LABELS = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];

	// Seasonal color palette comes from $lib/colors so editing the seasonal scheme
	// is a one-line change in colors.ts.
	const MONTH_COLORS = MONTHLY_PALETTE;

	// SVG layout
	let svgWidth = $state(800);
	const svgHeight = 400;
	const margin = { top: 20, right: 20, bottom: 35, left: 55 };
	const chartWidth = $derived(svgWidth - margin.left - margin.right);
	const chartHeight = svgHeight - margin.top - margin.bottom;

	let containerEl = $state<HTMLDivElement | null>(null);

	$effect(() => {
		if (!containerEl || typeof ResizeObserver === 'undefined') return;
		const ro = new ResizeObserver(([entry]) => {
			const w = entry.contentRect.width;
			if (w > 0) svgWidth = Math.round(w);
		});
		ro.observe(containerEl);
		return () => ro.disconnect();
	});

	// Per-chart scenario/parameter overrides
	const baseScenario = $derived(baseScenarioOverride || parameterStore.baseScenario);
	const parameterValues = $derived(
		parameterValuesOverride ?? (parameterStore.isDefaultScenario ? parameterStore.parameterValues : undefined)
	);

	// Reactive fetch
	$effect(() => {
		const _bs = baseScenario;
		const _pv = parameterValues;
		const _seg = segment;
		if (normalizedScenarios.length > 0 && year && geography && _bs) {
			fetchData();
		}
	});

	function aggregateToWeekProfile(hourlyData: DemandRow[]): WeekProfilePoint[] {
		const buckets = new Map<string, { sum: number; count: number }>();

		for (const row of hourlyData) {
			const date = row.period instanceof Date ? row.period : new Date(row.period);
			const month = date.getMonth() + 1;
			const dow = (date.getDay() + 6) % 7; // Mon=0, Sun=6
			const hour = date.getHours();
			const key = `${month}-${dow}-${hour}`;
			const bucket = buckets.get(key) || { sum: 0, count: 0 };
			bucket.sum += row.value;
			bucket.count += 1;
			buckets.set(key, bucket);
		}

		const result: WeekProfilePoint[] = [];
		for (const [key, { sum, count }] of buckets) {
			const [month, dow, hour] = key.split('-').map(Number);
			result.push({
				month,
				monthName: MONTH_NAMES[month - 1],
				weekHour: dow * 24 + hour,
				value: sum / count
			});
		}
		return result.sort((a, b) => a.month - b.month || a.weekHour - b.weekHour);
	}

	/** Collapse all months into a single yearly-average 168-hour profile */
	function aggregateToTotalWeekProfile(hourlyData: DemandRow[]): AggregatedWeekProfilePoint[] {
		const buckets = new Map<number, { sum: number; count: number }>();

		for (const row of hourlyData) {
			const date = row.period instanceof Date ? row.period : new Date(row.period);
			const dow = (date.getDay() + 6) % 7; // Mon=0, Sun=6
			const hour = date.getHours();
			const weekHour = dow * 24 + hour;
			const bucket = buckets.get(weekHour) || { sum: 0, count: 0 };
			bucket.sum += row.value;
			bucket.count += 1;
			buckets.set(weekHour, bucket);
		}

		return Array.from(buckets.entries())
			.map(([weekHour, { sum, count }]) => ({
				weekHour,
				value: sum / count
			}))
			.sort((a, b) => a.weekHour - b.weekHour);
	}

	async function fetchData() {
		if (!year || !geography) return;

		try {
			loading = true;
			error = null;

			if (normalizedScenarios.length === 1) {
				// Single scenario mode - per-month breakdown
				const query = makeDemandQuery({
					start: `${year}-01-01`,
					end: `${year + 1}-01-01`,
					resolution: '1h',
					aggregation: 'sum',
					geography,
					segment,
					baseScenario,
					parameterValues
				});

				const data = await fetchDemandData(query);
				profileData = aggregateToWeekProfile(data);
			} else {
				// Comparison mode - aggregated yearly profile per scenario
				const fetchPromises = normalizedScenarios.map(async (scenario) => {
					const scenarioId = scenario.id || scenario.scenario_id || 'default';
					const query = makeDemandQuery({
						start: `${year}-01-01`,
						end: `${year + 1}-01-01`,
						resolution: '1h',
						aggregation: 'sum',
						geography,
						segment,
						baseScenario: scenarioId
					});

					const data = await fetchDemandData(query);
					return { scenarioId, data: aggregateToTotalWeekProfile(data) };
				});

				const results = await Promise.all(fetchPromises);

				const newDataByScenario: Record<string, AggregatedWeekProfilePoint[]> = {};
				for (const { scenarioId, data } of results) {
					newDataByScenario[scenarioId] = data;
				}
				dataByScenario = newDataByScenario;
			}
		} catch (err: any) {
			error = err?.message || 'Ett oväntat fel inträffade';
			profileData = [];
			dataByScenario = {};
		} finally {
			loading = false;
		}
	}

	// Group data by month (single scenario mode)
	let monthGroups = $derived.by(() => {
		const groups = new Map<number, WeekProfilePoint[]>();
		for (const point of profileData) {
			if (!groups.has(point.month)) groups.set(point.month, []);
			groups.get(point.month)!.push(point);
		}
		return groups;
	});

	// Y-axis max - accounts for both modes
	let yMax = $derived.by(() => {
		if (normalizedScenarios.length > 1 && Object.keys(dataByScenario).length > 0) {
			let max = 0;
			for (const points of Object.values(dataByScenario)) {
				for (const p of points) {
					if (p.value > max) max = p.value;
				}
			}
			return max * 1.05 || 1;
		}
		return profileData.length > 0 ? Math.max(...profileData.map(d => d.value)) * 1.05 : 1;
	});

	let isComparisonActive = $derived(normalizedScenarios.length > 1 && Object.keys(dataByScenario).length > 0);

	function getScenarioOpacity(scenarioId: string): number {
		if (selectedScenarioId) {
			return selectedScenarioId === scenarioId ? 1 : 0.15;
		}
		if (hoveredScenarioId) {
			return hoveredScenarioId === scenarioId ? 1 : 0.15;
		}
		return 1;
	}

	function handleHover(scenarioId: string | null) {
		hoveredScenarioId = scenarioId;
	}

	function handleClick(scenarioId: string) {
		selectedScenarioId = selectedScenarioId === scenarioId ? null : scenarioId;
	}

	// Scale functions
	function xScale(weekHour: number): number {
		return margin.left + (weekHour / 167) * chartWidth;
	}

	function yScale(value: number): number {
		return margin.top + chartHeight - (value / yMax) * chartHeight;
	}

	// Generate SVG path for one month's data
	function monthPath(points: WeekProfilePoint[]): string {
		return points
			.map((p, i) => `${i === 0 ? 'M' : 'L'}${xScale(p.weekHour).toFixed(1)},${yScale(p.value).toFixed(1)}`)
			.join(' ');
	}

	// Generate SVG path for aggregated profile
	function aggregatedPath(points: AggregatedWeekProfilePoint[]): string {
		return points
			.map((p, i) => `${i === 0 ? 'M' : 'L'}${xScale(p.weekHour).toFixed(1)},${yScale(p.value).toFixed(1)}`)
			.join(' ');
	}

	// Y-axis ticks
	let yTicks = $derived.by(() => {
		const count = 5;
		const ticks: number[] = [];
		for (let i = 0; i <= count; i++) {
			ticks.push((yMax / count) * i);
		}
		return ticks;
	});

	// Format GW value for axis
	function formatGW(value: number): string {
		if (value >= 1) return `${value.toFixed(0)} GW`;
		if (value > 0) return `${Math.round(value * 1000)} MW`;
		return '0';
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
		chartType: 'weekly-profile',
		geography,
		year,
		scenarios: normalizedScenarios.length > 1
			? normalizedScenarios.map(s => s.id || s.scenario_id || 'unknown')
			: undefined
	});

	let exportData = $derived(
		isComparisonActive
			? Object.entries(dataByScenario).flatMap(([scenarioId, points]) =>
				points.map(p => ({
					scenarioId,
					weekHour: p.weekHour,
					dayOfWeek: DAY_LABELS[Math.floor(p.weekHour / 24)],
					hour: p.weekHour % 24,
					averageGW: p.value.toFixed(3)
				}))
			)
			: profileData.map(p => ({
				month: p.month,
				monthName: p.monthName,
				weekHour: p.weekHour,
				dayOfWeek: DAY_LABELS[Math.floor(p.weekHour / 24)],
				hour: p.weekHour % 24,
				averageGW: p.value.toFixed(3)
			}))
	);
</script>

<ChartContainer
	title="Veckobelastning per månad"
	{description}
	sizeVariant="none"
	aspectRatio="auto"
	metadata={exportMetadata}
	chartData={exportData}
	{exportable}
	{headerControls}
	exportPadding={{ left: 32 }}
	class={className}
>
	<div bind:this={containerEl} class="flex flex-col w-full">
		{#if loading && profileData.length === 0 && Object.keys(dataByScenario).length === 0}
			<LoadingSkeleton variant="chart" message="Laddar veckoprofil..." />
		{:else if error}
			<ErrorState message="Kunde inte ladda data" details={error} onRetry={fetchData} />
		{:else if !isComparisonActive && profileData.length === 0}
			<EmptyState message="Ingen data tillgänglig" description="Ingen timdata för valt år" />
		{:else}
			<svg viewBox="0 0 {svgWidth} {svgHeight}" class="w-full h-[400px]" preserveAspectRatio="xMidYMid meet">
				<!-- Y-axis gridlines and labels -->
				{#each yTicks as tick}
					{@const y = yScale(tick)}
					<line x1={margin.left} y1={y} x2={svgWidth - margin.right} y2={y} stroke={viz.grid} stroke-width="1" />
					<text x={margin.left - 8} y={y} text-anchor="end" dominant-baseline="middle" fill={viz.label} style="font-size: 11px;">
						{formatGW(tick)}
					</text>
				{/each}

				<!-- Day boundary gridlines and labels -->
				{#each DAY_LABELS as day, i}
					{@const x = xScale(i * 24)}
					<line x1={x} y1={margin.top} x2={x} y2={margin.top + chartHeight} stroke={viz.grid} stroke-width="1" stroke-dasharray={i === 5 ? '4 2' : 'none'} />
					{@const xMid = xScale(i * 24 + 12)}
					<text x={xMid} y={svgHeight - margin.bottom + 18} text-anchor="middle" fill={viz.label} style="font-size: 12px;">
						{day}
					</text>
				{/each}
				<!-- Right boundary -->
				<line x1={xScale(167)} y1={margin.top} x2={xScale(167)} y2={margin.top + chartHeight} stroke={viz.grid} stroke-width="1" />

				<!-- Weekend shading -->
				<rect
					x={xScale(5 * 24)}
					y={margin.top}
					width={xScale(167) - xScale(5 * 24)}
					height={chartHeight}
					fill={viz.subtleBg}
					opacity="0.5"
				/>

				<!-- X-axis line -->
				<line x1={margin.left} y1={margin.top + chartHeight} x2={svgWidth - margin.right} y2={margin.top + chartHeight} stroke="black" stroke-width="1.5" />

				{#if isComparisonActive}
					<!-- Comparison mode: one line per scenario -->
					{#each normalizedScenarios as scenario}
						{@const scenarioId = scenario.id || scenario.scenario_id || ''}
						{@const points = dataByScenario[scenarioId] || []}
						{#if points.length > 0}
							<path
								d={aggregatedPath(points)}
								fill="none"
								stroke={scenario.color}
								stroke-width={hoveredScenarioId === scenarioId || selectedScenarioId === scenarioId ? 3 : 2}
								class="transition-opacity duration-150"
								opacity={getScenarioOpacity(scenarioId)}
								role="button"
								tabindex="0"
								aria-label={`Scenario ${scenario.name}`}
								onmouseenter={() => handleHover(scenarioId)}
								onmouseleave={() => handleHover(null)}
								onclick={() => handleClick(scenarioId)}
								onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(scenarioId); } }}
								style="cursor: pointer; pointer-events: stroke;"
							/>
						{/if}
					{/each}
				{:else}
					<!-- Single scenario mode: one line per month -->
					{#each Array.from(monthGroups.entries()) as [month, points]}
						<path
							d={monthPath(points)}
							fill="none"
							stroke={MONTH_COLORS[month - 1]}
							stroke-width={hoveredMonth === month ? 3 : 1.5}
							class="transition-opacity duration-150"
							opacity={hoveredMonth !== null && hoveredMonth !== month ? 0.15 : 1}
							role="img"
							aria-label={`Month ${month}`}
							onmouseenter={() => hoveredMonth = month}
							onmouseleave={() => hoveredMonth = null}
							style="cursor: pointer; pointer-events: stroke;"
						/>
					{/each}
				{/if}
			</svg>

			{#if isComparisonActive}
				<!-- Scenario Legend -->
				{#if comparisonMetadata}
					<ScenarioLegend
						scenarios={normalizedScenarios}
						metadata={comparisonMetadata}
						onHover={handleHover}
						onClick={handleClick}
						class="mt-1"
					/>
				{/if}
			{:else}
				<!-- Month Legend -->
				<div class="flex flex-wrap gap-x-3 gap-y-1 justify-center mt-1 pb-2 px-4">
					{#each MONTH_ABBR as name, i}
						<button
							class="flex items-center gap-1 text-xs transition-opacity {hoveredMonth !== null && hoveredMonth !== i + 1 ? 'opacity-30' : ''}"
							onmouseenter={() => hoveredMonth = i + 1}
							onmouseleave={() => hoveredMonth = null}
						>
							<span class="inline-block w-3 h-0.5 rounded-full" style="background-color: {MONTH_COLORS[i]}"></span>
							{name}
						</button>
					{/each}
				</div>
			{/if}
		{/if}
	</div>
</ChartContainer>
