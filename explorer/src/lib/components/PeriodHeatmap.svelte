<script lang="ts">
	/**
	 * PeriodHeatmap Component - Monthly × Period demand visualization
	 *
	 * Displays electricity demand patterns across months (12 rows) and
	 * time-of-day periods (4 columns) as horizontal bars.
	 * Bar length encodes average demand. Period colors encode time of day.
	 *
	 * @component
	 */
	import { fetchDemandData } from '$lib/dataService';
	import { makeDemandQuery } from '$lib/utilities';
	import LoadingSkeleton from '$lib/components/shared/LoadingSkeleton.svelte';
	import ErrorState from '$lib/components/shared/ErrorState.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import ChartContainer from '$lib/components/shared/ChartContainer.svelte';
	import { parameterStore } from '$lib/stores/parameterStore.svelte';
	import { viz } from '$lib/colors';
	import type { DemandRow } from '$lib/dataService';

	type PeriodHeatmapCell = {
		month: number;
		monthName: string;
		period: string;
		periodLabel: string;
		periodIndex: number;
		value: number;
		dayCount: number;
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
		headerControls?: import('svelte').Snippet;
		class?: string;
		baseScenarioOverride?: string;
		parameterValuesOverride?: Record<string, number>;
	} = $props();

	let loading = $state(false);
	let error = $state<string | null>(null);
	let heatmapData = $state<PeriodHeatmapCell[]>([]);
	let hoveredCell = $state<PeriodHeatmapCell | null>(null);

	const MONTH_NAMES = [
		'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
		'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'
	];
	const PERIODS = ['night', 'morning', 'afternoon', 'evening'];
	const PERIOD_LABELS = ['Natt\n00-06', 'Morgon\n06-12', 'Eftermiddag\n12-18', 'Kväll\n18-24'];

	const PERIOD_COLORS = [
		viz.teal[900], // Natt — darkest
		viz.teal[500], // Morgon
		viz.teal[300], // Eftermiddag — lightest
		viz.teal[700], // Kväll — dark
	];

	const labelWidth = 100;
	const headerHeight = 50;
	const cellWidth = 80;
	const cellHeight = 30;
	const gap = 2;
	const barThickness = 14;
	const width = labelWidth + cellWidth * 4;
	const height = headerHeight + cellHeight * 12;

	let maxValue = $derived(
		heatmapData.length > 0 ? Math.max(...heatmapData.map(d => d.value)) : 1
	);

	function getBarLength(value: number, maxLen: number): number {
		if (maxValue === 0) return 2;
		return Math.max(2, (value / maxValue) * (maxLen - gap));
	}

	const baseScenario = $derived(baseScenarioOverride || parameterStore.baseScenario);
	const parameterValues = $derived(
		parameterValuesOverride ?? (parameterStore.isDefaultScenario ? parameterStore.parameterValues : undefined)
	);

	$effect(() => {
		const _baseScenario = baseScenario;
		const _params = parameterValues;
		const _seg = segment;
		if (_baseScenario && year && geography) {
			fetchHeatmapData();
		}
	});

	function aggregateToHeatmap(hourlyData: DemandRow[]): PeriodHeatmapCell[] {
		const buckets = new Map<string, { sum: number; count: number }>();

		for (const row of hourlyData) {
			const date = row.timestamp instanceof Date ? row.timestamp : new Date(row.timestamp);
			const month = date.getMonth() + 1;
			const hour = date.getHours();
			const periodIndex = Math.floor(hour / 6);

			const key = `${month}-${periodIndex}`;
			const bucket = buckets.get(key) || { sum: 0, count: 0 };
			bucket.sum += row.value;
			bucket.count += 1;
			buckets.set(key, bucket);
		}

		return Array.from(buckets.entries())
			.map(([key, { sum, count }]) => {
				const [month, periodIndex] = key.split('-').map(Number);
				return {
					month,
					monthName: MONTH_NAMES[month - 1],
					period: PERIODS[periodIndex],
					periodLabel: PERIOD_LABELS[periodIndex],
					periodIndex,
					value: sum / count,
					dayCount: count / 6
				};
			})
			.sort((a, b) => a.month - b.month || a.periodIndex - b.periodIndex);
	}

	function formatValue(value: number): string {
		if (value >= 1) return `${value.toFixed(1)} GW`;
		return `${Math.round(value * 1000)} MW`;
	}

	async function fetchHeatmapData() {
		if (!year || !geography) {
			error = 'Saknar obligatoriska parametrar (år, geografi)';
			return;
		}

		try {
			loading = true;
			error = null;

			const query = makeDemandQuery({
				start: `${year}-01-01`,
				end: `${year + 1}-01-01`,
				resolution: '1h',
				aggregation: 'sum',
				geography: geography,
				segment,
				baseScenario,
				parameterValues
			});

			const data = await fetchDemandData(query);
			heatmapData = aggregateToHeatmap(data);
		} catch (err: any) {
			error = err?.message || 'Ett oväntat fel inträffade';
			heatmapData = [];
		} finally {
			loading = false;
		}
	}

	let exportMetadata = $derived({
		chartType: 'period-heatmap',
		geography: geography,
		year: year
	});

	let exportData = $derived(
		heatmapData.map(cell => ({
			month: cell.month,
			monthName: cell.monthName,
			period: cell.period,
			periodLabel: cell.periodLabel.replace('\n', ' '),
			averageGW: cell.value.toFixed(2)
		}))
	);
</script>

<ChartContainer
	title="Effektbehov per månad och tid på dygnet"
	{description}
	sizeVariant="none"
	aspectRatio="auto"
	metadata={exportMetadata}
	chartData={exportData}
	{exportable}
	{headerControls}
	class={className}
>
	<div class="flex flex-col items-center justify-center">
		{#if loading}
			<LoadingSkeleton variant="chart" message="Laddar dygnsvariation..." />
		{:else if error}
			<ErrorState message="Kunde inte ladda data" details={error} onRetry={fetchHeatmapData} />
		{:else if heatmapData.length === 0}
			<EmptyState
				message="Ingen data tillgänglig"
				description="Ingen data finns för valt år"
			/>
		{:else}
			<div class="relative w-full max-w-md mx-auto">
				<svg viewBox="0 0 {width} {height}" class="w-full" role="img" aria-label="Effektbehov per månad och tid på dygnet">
					<!-- Column headers -->
					{#each PERIOD_LABELS as label, i}
						{@const lines = label.split('\n')}
						<text
							x={labelWidth + i * cellWidth + gap / 2}
							y={18}
							text-anchor="start"
							class="text-[10px] fill-gray-700"
						>
							{lines[0]}
						</text>
						<text
							x={labelWidth + i * cellWidth + gap / 2}
							y={32}
							text-anchor="start"
							class="text-[9px] fill-gray-500"
						>
							{lines[1]}
						</text>
					{/each}

					<!-- Row labels -->
					{#each MONTH_NAMES as name, i}
						<text
							x={labelWidth - 8}
							y={headerHeight + i * cellHeight + cellHeight / 2 + 4}
							text-anchor="end"
							class="text-[10px] fill-gray-700"
						>
							{name}
						</text>
					{/each}

					<!-- Horizontal bars -->
					{#each heatmapData as cell}
						{@const cellX = labelWidth + cell.periodIndex * cellWidth + gap / 2}
						{@const cellY = headerHeight + (cell.month - 1) * cellHeight + gap / 2}
						{@const availW = cellWidth - gap}
						{@const availH = cellHeight - gap}
						{@const barLen = getBarLength(cell.value, availW)}
						{@const color = PERIOD_COLORS[cell.periodIndex]}

						<rect
							x={cellX}
							y={cellY}
							width={availW}
							height={availH}
							fill="transparent"
							class="cursor-pointer"
							onmouseenter={() => (hoveredCell = cell)}
							onmouseleave={() => (hoveredCell = null)}
							role="gridcell"
							aria-label="{cell.monthName}, {cell.periodLabel.replace('\n', ' ')}: {formatValue(cell.value)}"
						/>
						<rect
							x={cellX}
							y={cellY + (availH - barThickness) / 2}
							width={barLen}
							height={barThickness}
							fill={color}
							rx="2"
							class="pointer-events-none transition-opacity"
							class:opacity-30={hoveredCell && hoveredCell !== cell}
						/>
					{/each}
				</svg>

				<!-- Tooltip -->
				{#if hoveredCell}
					<div
						class="absolute bg-white shadow-lg rounded-lg px-3 py-2 text-sm pointer-events-none z-10 border border-gray-200"
						style="
							left: {labelWidth + hoveredCell.periodIndex * cellWidth + cellWidth / 2}px;
							top: {headerHeight + (hoveredCell.month - 1) * cellHeight - 10}px;
							transform: translate(-50%, -100%);
						"
					>
						<div class="font-medium text-gray-900">
							{hoveredCell.monthName}
						</div>
						<div class="text-gray-600">
							{hoveredCell.periodLabel.replace('\n', ' ')}
						</div>
						<div class="font-semibold text-primary mt-1">
							{formatValue(hoveredCell.value)}
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</ChartContainer>
