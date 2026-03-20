<script lang="ts">
	/**
	 * MonthlyWeekProfile - Average weekly hourly profile per month
	 *
	 * Shows 12 lines (one per month) of the average hourly demand
	 * across a week (Monday–Sunday, 168 hours). Reveals both intraday
	 * patterns and seasonal differences.
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
	import { parameterStore } from '$lib/stores/parameterStore.svelte';
	import { viz } from '$lib/colors';
	import type { DemandRow } from '$lib/dataService';
	import type { Snippet } from 'svelte';

	type WeekProfilePoint = {
		month: number;
		monthName: string;
		weekHour: number; // 0-167
		value: number;    // average GW
	};

	let {
		geography = 'total',
		segment = 'total',
		year = 2025,
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
		exportable?: boolean;
		description?: string;
		headerControls?: Snippet;
		class?: string;
		baseScenarioOverride?: string;
		parameterValuesOverride?: Record<string, number>;
	} = $props();

	// State
	let loading = $state(false);
	let error = $state<string | null>(null);
	let profileData = $state<WeekProfilePoint[]>([]);
	let hoveredMonth = $state<number | null>(null);

	// Constants
	const MONTH_NAMES = [
		'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
		'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'
	];
	const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
	const DAY_LABELS = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];

	// Seasonal color palette: cold→spring→warm→autumn→cold
	const MONTH_COLORS = [
		'#1e3a5f', '#2b5c8a', '#3a7ca5', '#48a999',
		'#5cb85c', '#8cc63f', '#ffc107', '#ff9800',
		'#e65100', '#c62828', '#6a1b9a', '#283593',
	];

	// SVG layout
	const svgWidth = 800;
	const svgHeight = 400;
	const margin = { top: 20, right: 20, bottom: 35, left: 55 };
	const chartWidth = svgWidth - margin.left - margin.right;
	const chartHeight = svgHeight - margin.top - margin.bottom;

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
		if (_bs && year && geography) {
			fetchData();
		}
	});

	function aggregateToWeekProfile(hourlyData: DemandRow[]): WeekProfilePoint[] {
		const buckets = new Map<string, { sum: number; count: number }>();

		for (const row of hourlyData) {
			const date = row.timestamp instanceof Date ? row.timestamp : new Date(row.timestamp);
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

	async function fetchData() {
		if (!year || !geography) return;

		try {
			loading = true;
			error = null;

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
		} catch (err: any) {
			error = err?.message || 'Ett oväntat fel inträffade';
			profileData = [];
		} finally {
			loading = false;
		}
	}

	// Group data by month
	let monthGroups = $derived.by(() => {
		const groups = new Map<number, WeekProfilePoint[]>();
		for (const point of profileData) {
			if (!groups.has(point.month)) groups.set(point.month, []);
			groups.get(point.month)!.push(point);
		}
		return groups;
	});

	// Y-axis max
	let yMax = $derived(
		profileData.length > 0 ? Math.max(...profileData.map(d => d.value)) * 1.05 : 1
	);

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

	let exportMetadata = $derived({
		chartType: 'weekly-profile',
		geography,
		year
	});

	let exportData = $derived(
		profileData.map(p => ({
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
	class={className}
>
	<div class="flex flex-col">
		{#if loading && profileData.length === 0}
			<LoadingSkeleton variant="chart" message="Laddar veckoprofil..." />
		{:else if error}
			<ErrorState message="Kunde inte ladda data" details={error} onRetry={fetchData} />
		{:else if profileData.length === 0}
			<EmptyState message="Ingen data tillgänglig" description="Ingen timdata för valt år" />
		{:else}
			<svg viewBox="0 0 {svgWidth} {svgHeight}" class="w-full h-[400px]" preserveAspectRatio="xMidYMid meet">
				<!-- Y-axis gridlines and labels -->
				{#each yTicks as tick}
					{@const y = yScale(tick)}
					<line x1={margin.left} y1={y} x2={svgWidth - margin.right} y2={y} stroke="#e5e7eb" stroke-width="1" />
					<text x={margin.left - 8} y={y} text-anchor="end" dominant-baseline="middle" fill={viz.label} style="font-size: 11px;">
						{formatGW(tick)}
					</text>
				{/each}

				<!-- Day boundary gridlines and labels -->
				{#each DAY_LABELS as day, i}
					{@const x = xScale(i * 24)}
					<line x1={x} y1={margin.top} x2={x} y2={margin.top + chartHeight} stroke="#e5e7eb" stroke-width="1" stroke-dasharray={i === 5 ? '4 2' : 'none'} />
					{@const xMid = xScale(i * 24 + 12)}
					<text x={xMid} y={svgHeight - margin.bottom + 18} text-anchor="middle" fill={viz.label} style="font-size: 12px;">
						{day}
					</text>
				{/each}
				<!-- Right boundary -->
				<line x1={xScale(167)} y1={margin.top} x2={xScale(167)} y2={margin.top + chartHeight} stroke="#e5e7eb" stroke-width="1" />

				<!-- Weekend shading -->
				<rect
					x={xScale(5 * 24)}
					y={margin.top}
					width={xScale(167) - xScale(5 * 24)}
					height={chartHeight}
					fill="#f3f4f6"
					opacity="0.5"
				/>

				<!-- X-axis line -->
				<line x1={margin.left} y1={margin.top + chartHeight} x2={svgWidth - margin.right} y2={margin.top + chartHeight} stroke="black" stroke-width="1.5" />

				<!-- Month lines -->
				{#each Array.from(monthGroups.entries()) as [month, points]}
					<path
						d={monthPath(points)}
						fill="none"
						stroke={MONTH_COLORS[month - 1]}
						stroke-width={hoveredMonth === month ? 3 : 1.5}
						class="transition-opacity duration-150"
						opacity={hoveredMonth !== null && hoveredMonth !== month ? 0.15 : 1}
						onmouseenter={() => hoveredMonth = month}
						onmouseleave={() => hoveredMonth = null}
						style="cursor: pointer; pointer-events: stroke;"
					/>
				{/each}
			</svg>

			<!-- Legend -->
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
	</div>
</ChartContainer>
