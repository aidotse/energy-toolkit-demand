<script lang="ts">
	/**
	 * PeriodHeatmap Component - Monthly × Period demand visualization
	 *
	 * Displays electricity demand patterns across months (12 rows) and
	 * time-of-day periods (4 columns) as horizontal bars.
	 * Bar length encodes average demand. Period colors encode time of day.
	 *
	 * Supports multi-scenario comparison via side-by-side heatmap panels.
	 *
	 * @component
	 */
	import { fetchDemandData } from '$lib/dataService';
	import { makeDemandQuery } from '$lib/utilities';
	import LoadingSkeleton from '$lib/components/shared/LoadingSkeleton.svelte';
	import ErrorState from '$lib/components/shared/ErrorState.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import ChartContainer from '$lib/components/shared/ChartContainer.svelte';
	import ScenarioLegend from '$lib/components/shared/ScenarioLegend.svelte';
	import { parameterStore } from '$lib/stores/parameterStore.svelte';
	import { scenarioState } from '$lib/stores/scenario.svelte';
	import {
		getNormalizedScenarios,
		assignScenarioColors,
		createComparisonMetadata
	} from '$lib/comparisonUtils';
	import { viz } from '$lib/colors';
	import type { DemandRow } from '$lib/dataService';
	import type { ScenarioObject } from '$lib/types/ChartComponent.interface';

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
		headerControls?: import('svelte').Snippet;
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

	let loading = $state(true);
	let error = $state<string | null>(null);
	let heatmapData = $state<PeriodHeatmapCell[]>([]);
	let dataByScenario = $state<Record<string, PeriodHeatmapCell[]>>({});
	let hoveredCell = $state<PeriodHeatmapCell | null>(null);
	let hoveredScenarioId = $state<string | null>(null);
	let selectedScenarioId = $state<string | null>(null);

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
	const width = labelWidth + cellWidth * 4 + labelWidth;
	const height = headerHeight + cellHeight * 12;

	// For single scenario mode
	let maxValue = $derived(
		heatmapData.length > 0 ? Math.max(...heatmapData.map(d => d.value)) : 1
	);

	// For comparison mode - global max across all scenarios for comparable bar lengths
	let globalMaxValue = $derived.by(() => {
		if (normalizedScenarios.length <= 1) return maxValue;
		let max = 0;
		for (const cells of Object.values(dataByScenario)) {
			for (const cell of cells) {
				if (cell.value > max) max = cell.value;
			}
		}
		return max || 1;
	});

	function getBarLength(value: number, maxLen: number, maxVal?: number): number {
		const mv = maxVal ?? maxValue;
		if (mv === 0) return 2;
		return Math.max(2, (value / mv) * (maxLen - gap));
	}

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

	const baseScenario = $derived(baseScenarioOverride || parameterStore.baseScenario);
	const parameterValues = $derived(
		parameterValuesOverride ?? (parameterStore.isDefaultScenario ? parameterStore.parameterValues : undefined)
	);

	$effect(() => {
		const _baseScenario = baseScenario;
		const _params = parameterValues;
		const _seg = segment;
		if (normalizedScenarios.length > 0 && year && geography && _baseScenario) {
			fetchHeatmapData();
		}
	});

	function aggregateToHeatmap(hourlyData: DemandRow[]): PeriodHeatmapCell[] {
		const buckets = new Map<string, { sum: number; count: number }>();

		for (const row of hourlyData) {
			const date = row.period instanceof Date ? row.period : new Date(row.period);
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

			if (normalizedScenarios.length === 1) {
				// Single scenario mode
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
			} else {
				// Comparison mode - fetch data for each scenario
				const fetchPromises = normalizedScenarios.map(async (scenario) => {
					const scenarioId = scenario.id || scenario.scenario_id || 'default';
					const query = makeDemandQuery({
						start: `${year}-01-01`,
						end: `${year + 1}-01-01`,
						resolution: '1h',
						aggregation: 'sum',
						geography: geography,
						segment,
						baseScenario: scenarioId
					});

					const data = await fetchDemandData(query);
					return { scenarioId, data: aggregateToHeatmap(data) };
				});

				const results = await Promise.all(fetchPromises);

				const newDataByScenario: Record<string, PeriodHeatmapCell[]> = {};
				for (const { scenarioId, data } of results) {
					newDataByScenario[scenarioId] = data;
				}
				dataByScenario = newDataByScenario;
			}
		} catch (err: any) {
			error = err?.message || 'Ett oväntat fel inträffade';
			heatmapData = [];
			dataByScenario = {};
		} finally {
			loading = false;
		}
	}

	// Comparison metadata for legend
	let comparisonMetadata = $derived.by(() => {
		if (normalizedScenarios.length <= 1) return null;
		// Build simple metadata - no time-series merging needed for heatmap
		return {
			scenarios: normalizedScenarios,
			colors: normalizedScenarios.map(s => s.color || '')
		};
	});

	let isComparisonActive = $derived(normalizedScenarios.length > 1 && Object.keys(dataByScenario).length > 0);

	let exportMetadata = $derived({
		chartType: 'period-heatmap',
		geography: geography,
		year: year,
		scenarios: normalizedScenarios.length > 1
			? normalizedScenarios.map(s => s.id || s.scenario_id || 'unknown')
			: undefined
	});

	let exportData = $derived(
		isComparisonActive
			? Object.entries(dataByScenario).flatMap(([scenarioId, cells]) =>
				cells.map(cell => ({
					scenarioId,
					month: cell.month,
					monthName: cell.monthName,
					period: cell.period,
					periodLabel: cell.periodLabel.replace('\n', ' '),
					averageGW: cell.value.toFixed(2)
				}))
			)
			: heatmapData.map(cell => ({
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
	exportPadding={{ top: 24, bottom: 24 }}
	class={className}
>
	<div class="flex flex-col items-center justify-center">
		{#if loading}
			<LoadingSkeleton variant="chart" message="Laddar dygnsvariation..." />
		{:else if error}
			<ErrorState message="Kunde inte ladda data" details={error} onRetry={fetchHeatmapData} />
		{:else if !isComparisonActive && heatmapData.length === 0}
			<EmptyState
				message="Ingen data tillgänglig"
				description="Ingen data finns för valt år"
			/>
		{:else if isComparisonActive}
			<!-- Comparison mode: side-by-side heatmap panels -->
			<div class="grid gap-4 w-full" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));">
				{#each normalizedScenarios as scenario, index}
					{@const scenarioId = scenario.id || scenario.scenario_id || ''}
					{@const scenarioData = dataByScenario[scenarioId] || []}
					{@const opacity = getScenarioOpacity(scenarioId)}
					<div
						class="relative transition-opacity duration-200"
						style="opacity: {opacity};"
					>
						<!-- Panel header with scenario color -->
						<div class="flex items-center gap-2 mb-1 px-1">
							<div
								class="w-3 h-3 rounded-full flex-shrink-0"
								style="background-color: {scenario.color}; box-shadow: 0 0 0 1px rgba(0,0,0,0.1);"
							></div>
							<span class="text-xs font-medium text-gray-700">Scenario {index + 1}</span>
						</div>
						<svg viewBox="0 0 {width} {height}" class="w-full" role="img" aria-label="Scenario {index + 1}: Effektbehov per månad och tid på dygnet">
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
							{#each scenarioData as cell}
								{@const cellX = labelWidth + cell.periodIndex * cellWidth + gap / 2}
								{@const cellY = headerHeight + (cell.month - 1) * cellHeight + gap / 2}
								{@const availW = cellWidth - gap}
								{@const availH = cellHeight - gap}
								{@const barLen = getBarLength(cell.value, availW, globalMaxValue)}
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
									tabindex="-1"
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
					</div>
				{/each}
			</div>

			<!-- Scenario Legend -->
			{#if comparisonMetadata}
				<ScenarioLegend
					scenarios={normalizedScenarios}
					metadata={comparisonMetadata}
					onHover={handleHover}
					onClick={handleClick}
					class="mt-4"
				/>
			{/if}
		{:else}
			<!-- Single scenario mode -->
			<div class="relative w-full max-w-3xl mx-auto">
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
							tabindex="-1"
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
						class="absolute bg-white/95 shadow-lg rounded px-2 py-1 text-xs pointer-events-none z-10 border border-gray-200 backdrop-blur-sm"
						style="
							left: {labelWidth + hoveredCell.periodIndex * cellWidth + cellWidth / 2}px;
							top: {headerHeight + (hoveredCell.month - 1) * cellHeight - 10}px;
							transform: translate(-50%, -100%);
						"
					>
						<div class="font-semibold text-gray-900">
							{hoveredCell.monthName}
						</div>
						<div class="text-gray-600">
							{hoveredCell.periodLabel.replace('\n', ' ')}
						</div>
						<div class="font-semibold text-primary">
							{formatValue(hoveredCell.value)}
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</ChartContainer>
