<script lang="ts">
	/**
	 * PeriodHeatmap Component - Monthly × Period demand visualization
	 *
	 * Displays electricity demand patterns across months (12 rows) and
	 * time-of-day periods (4 columns). Color intensity shows average demand.
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
		year = 2025,
		exportable = true,
		description = '',
		class: className = ''
	}: {
		geography?: string;
		year?: number;
		exportable?: boolean;
		description?: string;
		class?: string;
	} = $props();

	// State
	let loading = $state(false);
	let error = $state<string | null>(null);
	let heatmapData = $state<PeriodHeatmapCell[]>([]);
	let hoveredCell = $state<PeriodHeatmapCell | null>(null);

	// Constants
	const MONTH_NAMES = [
		'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
		'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'
	];
	const PERIODS = ['night', 'morning', 'afternoon', 'evening'];
	const PERIOD_LABELS = ['Natt\n00-06', 'Morgon\n06-12', 'Eftermiddag\n12-18', 'Kväll\n18-24'];

	// Layout constants
	const labelWidth = 100;
	const headerHeight = 50;
	const cellWidth = 80;
	const cellHeight = 30;
	const gap = 2;
	const width = labelWidth + cellWidth * 4;
	const height = headerHeight + cellHeight * 12;

	// Derived: min/max for color scale
	let valueRange = $derived({
		min: heatmapData.length > 0 ? Math.min(...heatmapData.map(d => d.value)) : 0,
		max: heatmapData.length > 0 ? Math.max(...heatmapData.map(d => d.value)) : 1
	});

	// Get current parameter state for reactive fetching
	const baseScenario = $derived(parameterStore.baseScenario);
	const parameterValues = $derived(parameterStore.parameterValues);

	// Fetch and aggregate when year/geography/scenario changes
	$effect(() => {
		const _baseScenario = baseScenario;
		const _params = parameterValues;
		if (_baseScenario && year && geography) {
			fetchHeatmapData();
		}
	});

	/**
	 * Aggregate hourly data into 48 cells (12 months × 4 periods)
	 */
	function aggregateToHeatmap(hourlyData: DemandRow[]): PeriodHeatmapCell[] {
		const buckets = new Map<string, { sum: number; count: number }>();

		for (const row of hourlyData) {
			const date = row.timestamp instanceof Date ? row.timestamp : new Date(row.timestamp);
			const month = date.getMonth() + 1; // 1-12
			const hour = date.getHours();
			const periodIndex = Math.floor(hour / 6); // 0-3

			const key = `${month}-${periodIndex}`;
			const bucket = buckets.get(key) || { sum: 0, count: 0 };
			bucket.sum += row.value;
			bucket.count += 1;
			buckets.set(key, bucket);
		}

		// Convert to array with labels
		return Array.from(buckets.entries())
			.map(([key, { sum, count }]) => {
				const [month, periodIndex] = key.split('-').map(Number);
				return {
					month,
					monthName: MONTH_NAMES[month - 1],
					period: PERIODS[periodIndex],
					periodLabel: PERIOD_LABELS[periodIndex],
					periodIndex,
					value: sum / count, // Average hourly value (in GW)
					dayCount: count / 6 // 6 hours per period
				};
			})
			.sort((a, b) => a.month - b.month || a.periodIndex - b.periodIndex);
	}

	/**
	 * Get heatmap color based on value
	 */
	function getHeatmapColor(value: number, min: number, max: number): string {
		if (max === min) return 'rgb(136, 197, 217)'; // Mid-range color if no variation
		const t = (value - min) / (max - min); // 0-1 normalized
		// Interpolate from light blue (#e6f3f7) to dark blue (#004d66)
		const r = Math.round(230 - t * 230);
		const g = Math.round(243 - t * 166);
		const b = Math.round(247 - t * 145);
		return `rgb(${r}, ${g}, ${b})`;
	}

	/**
	 * Format value for display (in GW)
	 */
	function formatValue(value: number): string {
		if (value >= 1) {
			return `${value.toFixed(1)} GW`;
		}
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
				segment: 'total',
				baseScenario: parameterStore.baseScenario,
				parameterValues: parameterStore.isDefaultScenario ? parameterStore.parameterValues : undefined
			});

			const data = await fetchDemandData(query);
			heatmapData = aggregateToHeatmap(data);
		} catch (err: any) {
			error = err?.message || 'Ett oväntat fel inträffade';
			console.error('Error fetching heatmap data:', err);
			heatmapData = [];
		} finally {
			loading = false;
		}
	}

	// Prepare export metadata
	let exportMetadata = $derived({
		chartType: 'period-heatmap',
		geography: geography,
		year: year
	});

	// Prepare data for export
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
	title="Elbehov per månad och tid på dygnet"
	{description}
	sizeVariant="standard"
	aspectRatio="auto"
	metadata={exportMetadata}
	chartData={exportData}
	{exportable}
	class={className}
>
	<div class="h-[450px] flex flex-col items-center justify-center">
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
			<div class="relative w-full max-w-[500px] mx-auto">
				<svg viewBox="0 0 {width} {height}" class="w-full" role="img" aria-label="Heatmap över elbehov per månad och tid på dygnet">
					<!-- Column headers -->
					{#each PERIOD_LABELS as label, i}
						{@const lines = label.split('\n')}
						<text
							x={labelWidth + i * cellWidth + cellWidth / 2}
							y={18}
							text-anchor="middle"
							class="text-[10px] fill-gray-700"
						>
							{lines[0]}
						</text>
						<text
							x={labelWidth + i * cellWidth + cellWidth / 2}
							y={32}
							text-anchor="middle"
							class="text-[9px] fill-gray-500"
						>
							{lines[1]}
						</text>
					{/each}

					<!-- Grid cells -->
					{#each heatmapData as cell}
						<rect
							x={labelWidth + cell.periodIndex * cellWidth + gap / 2}
							y={headerHeight + (cell.month - 1) * cellHeight + gap / 2}
							width={cellWidth - gap}
							height={cellHeight - gap}
							fill={getHeatmapColor(cell.value, valueRange.min, valueRange.max)}
							rx="3"
							class="cursor-pointer transition-opacity"
							class:opacity-70={hoveredCell && hoveredCell !== cell}
							onmouseenter={() => (hoveredCell = cell)}
							onmouseleave={() => (hoveredCell = null)}
							role="gridcell"
							aria-label="{cell.monthName}, {cell.periodLabel.replace('\n', ' ')}: {formatValue(cell.value)}"
						/>
					{/each}

					<!-- Row labels (months) -->
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
				</svg>

				<!-- Tooltip -->
				{#if hoveredCell}
					<div
						class="absolute bg-white dark:bg-gray-800 shadow-lg rounded-lg px-3 py-2 text-sm pointer-events-none z-10 border border-gray-200 dark:border-gray-700"
						style="
							left: {labelWidth + hoveredCell.periodIndex * cellWidth + cellWidth / 2}px;
							top: {headerHeight + (hoveredCell.month - 1) * cellHeight - 10}px;
							transform: translate(-50%, -100%);
						"
					>
						<div class="font-medium text-gray-900 dark:text-gray-100">
							{hoveredCell.monthName}
						</div>
						<div class="text-gray-600 dark:text-gray-400">
							{hoveredCell.periodLabel.replace('\n', ' ')}
						</div>
						<div class="font-semibold text-primary mt-1">
							{formatValue(hoveredCell.value)}
						</div>
					</div>
				{/if}

				<!-- Color scale legend -->
				<div class="mt-4 flex items-center justify-center gap-2 text-xs text-gray-600 dark:text-gray-400">
					<span>Lägre</span>
					<div class="flex h-3 w-24">
						<div class="flex-1 rounded-l" style="background: rgb(230, 243, 247);"></div>
						<div class="flex-1" style="background: rgb(136, 197, 217);"></div>
						<div class="flex-1 rounded-r" style="background: rgb(0, 77, 102);"></div>
					</div>
					<span>Högre</span>
				</div>
			</div>
		{/if}
	</div>
</ChartContainer>
