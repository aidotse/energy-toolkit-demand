<script lang="ts">
	/**
	 * SectorPieChart Component - Pie chart visualization for sector breakdown
	 *
	 * Displays electricity demand by sector as a pie chart with:
	 * - Color-coded segments (darkest to lightest, order from SEGMENT_ORDER)
	 * - Smart label placement (inside for slices ≥10%, outside with leader lines otherwise)
	 * - Custom SVG tooltips with segment details
	 * - Optional side-by-side comparison: year mode (two years) or scenario mode (selected scenario vs default)
	 *
	 * Data flow: fetches demand data via `fetchDemandData` on mount and when
	 * `year`, `geography`, or `parameterValues` change. Uses `parameterStore`
	 * for base scenario and parameter state.
	 *
	 * @component
	 * @prop geography - Geography code to filter data by
	 * @prop year - Target year for the right/main pie
	 * @prop enableComparison - Enable dual-pie comparison mode
	 * @prop comparisonYear - Reference year for the left pie (year mode)
	 * @prop initialComparisonMode - Start in 'year' or 'scenario' comparison
	 * @prop exportable - Whether to show ChartContainer export controls
	 */
	import { formatNumber, makeDemandQuery } from '$lib/utilities';
	import { getEnergyPrefix } from '$lib/stores/units.svelte';
	import { fetchDemandData, calculateSegmentData } from '$lib/dataService';
	import LoadingSkeleton from '$lib/components/shared/LoadingSkeleton.svelte';
	import ErrorState from '$lib/components/shared/ErrorState.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import ChartContainer from '$lib/components/shared/ChartContainer.svelte';
	import { parameterStore } from '$lib/stores/parameterStore.svelte';
	import { viewStore } from '$lib/stores/viewStore.svelte';
	import { getSegmentColor, getSegmentLabel, SEGMENT_ORDER } from '$lib/chartConfig';
	import * as m from '$lib/paraglide/messages';
	import { viz } from '$lib/colors';
	import type { Snippet } from 'svelte';

	interface PieSlice {
		segment: string;
		displayName: string;
		value: number;
		percentage: number;
		startAngle: number;
		endAngle: number;
		midAngle: number;
		bgColor: string;
		textColor: string;
	}

	let {
		geography,
		year,
		exportable = true,
		description = '',
		headerControls,
		class: className = '',
		comparisonYear = 2025,
		enableComparison = false,
		initialComparisonMode = 'year' as 'year' | 'base',
		deltaDisplay = 'percent' as 'percent' | 'absolute',
		baseScenarioOverride,
		parameterValuesOverride
	}: {
		geography?: string;
		year?: number;
		exportable?: boolean;
		description?: string;
		headerControls?: Snippet;
		class?: string;
		comparisonYear?: number;
		enableComparison?: boolean;
		initialComparisonMode?: 'year' | 'base';
		deltaDisplay?: 'percent' | 'absolute';
		baseScenarioOverride?: string;
		parameterValuesOverride?: Record<string, number>;
	} = $props();

	let leftLoading = $state(true);
	let rightLoading = $state(true);
	let error = $state<string | null>(null);
	let leftRawData = $state<any[]>([]);
	let rightRawData = $state<any[]>([]);
	let hoveredSegment = $state<string | null>(null);
	let hoveredPieIndex = $state<number>(-1);
	let tooltipPosition = $state<{ x: number; y: number } | null>(null);
	// svelte-ignore state_referenced_locally
	let comparisonMode = $state<'year' | 'base'>(initialComparisonMode);

	// Per-chart scenario/parameter overrides (fall back to global store)
	const baseScenario = $derived(baseScenarioOverride || parameterStore.baseScenario);
	const parameterValues = $derived(
		parameterValuesOverride ?? (parameterStore.isDefaultScenario ? parameterStore.parameterValues : undefined)
	);

	// Default scenario ID ("Beslutad policy") used as the left-pie reference in base mode
	const defaultScenarioId = $derived(parameterStore.defaultScenario?.id);
	const hasParameterOverrides = $derived(
		parameterValuesOverride
			? Object.values(parameterValuesOverride).some((v) => v > 0)
			: parameterStore.hasActiveParameters
	);

	// Use shared segment order (re-typed as string[] for indexOf checks)
	const segmentOrder: string[] = [...SEGMENT_ORDER];

	// Chart dimensions (constants for SVG rendering)
	const CX = 250;
	const CY = 200;
	const RADIUS = 150;

	// Show loading skeleton only on initial load (no data yet)
	let loading = $derived(leftRawData.length === 0 && leftLoading);

	// Whether to show dual pies
	// Base mode: show only when the selection actually differs from the default reference —
	// either a non-default base scenario is picked, or parameters have been adjusted on the default.
	let showComparison = $derived(
		enableComparison &&
			(comparisonMode === 'year'
				? year !== comparisonYear
				: baseScenario !== defaultScenarioId || hasParameterOverrides)
	);

	// Labels above each pie (scenario names from config, not hardcoded)
	const defaultScenarioName = $derived(
		parameterStore.baseScenarios.find((s) => s.id === defaultScenarioId)?.name || ''
	);
	const activeScenarioName = $derived(
		parameterStore.baseScenarios.find((s) => s.id === baseScenario)?.name || ''
	);
	const rightLabelBase = $derived(
		baseScenario === defaultScenarioId && hasParameterOverrides
			? `${activeScenarioName} (justerat)`
			: activeScenarioName
	);

	let leftLabel = $derived(
		comparisonMode === 'year' ? String(comparisonYear) : defaultScenarioName
	);
	let rightLabel = $derived(
		comparisonMode === 'year' ? String(year) : rightLabelBase
	);

	// Dynamic description based on comparison mode
	const geoName = $derived(viewStore.geographyName);
	let effectiveDescription = $derived.by(() => {
		if (!showComparison) return description;
		if (comparisonMode === 'year') {
			return `Sektorsfördelning för ${geoName} ${comparisonYear} jämfört med ${year} i scenariot ${activeScenarioName}.`;
		}
		return `Sektorsfördelning för ${geoName} år ${year}: ${rightLabelBase} jämfört med ${defaultScenarioName}.`;
	});

	async function fetchForYear(targetYear: number, withParams: boolean, scenarioOverride?: string) {
		const query = makeDemandQuery({
			start: String(targetYear),
			end: String(targetYear + 1),
			resolution: '1Y',
			aggregation: 'sum',
			geography: 'all',
			segment: 'all',
			baseScenario: scenarioOverride || baseScenario,
			parameterValues: withParams ? parameterValues : undefined
		});
		return fetchDemandData(query);
	}

	// Left pie: stable reference data
	// - Year mode: comparisonYear baseline (no params) in the current baseScenario
	// - Base mode: default scenario ("Beslutad policy") at current year, no params
	// - Single mode: current year with params → refetches on any change
	$effect(() => {
		if (!baseScenario) return;

		if (enableComparison && comparisonMode === 'year') {
			// Left = comparisonYear baseline. Does NOT read `year` or `parameterValues`.
			fetchLeftPie(comparisonYear, false);
		} else if (enableComparison && comparisonMode === 'base') {
			// Left = default scenario at current year, no params — always the reference
			if (!year || !defaultScenarioId) return;
			fetchLeftPie(year, false, defaultScenarioId);
		} else {
			// Single mode: read everything
			if (!year) return;
			const _params = parameterValues;
			fetchLeftPie(year, true);
		}
	});

	// Right pie: user's current selection (only when comparing)
	$effect(() => {
		if (!year || !baseScenario || !enableComparison) {
			rightRawData = [];
			return;
		}

		if (comparisonMode === 'year') {
			if (year === comparisonYear) {
				rightRawData = [];
				return;
			}
			const _params = parameterValues;
			fetchRightPie(year, true);
		} else if (comparisonMode === 'base') {
			// Right = current baseScenario with params (params only apply when on default scenario).
			// If selection equals the default and no params are active, showComparison is false and
			// we skip the fetch to keep the reactive graph clean.
			if (baseScenario === defaultScenarioId && !hasParameterOverrides) {
				rightRawData = [];
				return;
			}
			const _params = parameterValues;
			fetchRightPie(year, true);
		}
	});

	async function fetchLeftPie(targetYear: number, withParams: boolean, scenarioOverride?: string) {
		try {
			leftLoading = true;
			error = null;
			const data = await fetchForYear(targetYear, withParams, scenarioOverride);
			leftRawData = data;
		} catch (err: any) {
			error = err?.message || 'Ett oväntat fel inträffade';
			console.error('Error fetching left pie data:', err);
			leftRawData = [];
		} finally {
			leftLoading = false;
		}
	}

	async function fetchRightPie(targetYear: number, withParams: boolean, scenarioOverride?: string) {
		try {
			rightLoading = true;
			error = null;
			const data = await fetchForYear(targetYear, withParams, scenarioOverride);
			rightRawData = data;
		} catch (err: any) {
			error = err?.message || 'Ett oväntat fel inträffade';
			console.error('Error fetching right pie data:', err);
			rightRawData = [];
		} finally {
			rightLoading = false;
		}
	}

	// Build pie slices from raw data
	function buildPieSlices(rawData: any[]): PieSlice[] {
		const segments = calculateSegmentData(rawData || [], geography || '01');
		if (!segments || segments.length === 0) return [];

		const total = segments.reduce((sum, item) => sum + item.value, 0);
		if (total === 0) return [];

		const sorted = [...segments].sort((a, b) => {
			const aIndex = segmentOrder.indexOf(a.segment);
			const bIndex = segmentOrder.indexOf(b.segment);
			if (aIndex === -1 && bIndex === -1) return b.value - a.value;
			if (aIndex === -1) return 1;
			if (bIndex === -1) return -1;
			return aIndex - bIndex;
		});

		let currentAngle = 0;
		return sorted.map((item) => {
			const percentage = (item.value / total) * 100;
			const angle = (item.value / total) * 360;
			const startAngle = currentAngle;
			const endAngle = currentAngle + angle;
			currentAngle = endAngle;

			const colors = getSegmentColor(item.segment);

			return {
				segment: item.segment,
				displayName: getSegmentLabel(item.segment),
				value: item.value,
				percentage,
				startAngle,
				endAngle,
				midAngle: startAngle + angle / 2,
				bgColor: colors.bg,
				textColor: colors.text
			};
		});
	}

	let leftPieSlices = $derived(buildPieSlices(leftRawData));
	let rightPieSlices = $derived(buildPieSlices(rightRawData));

	// Pre-computed label positions with collision resolution
	let leftLabels = $derived(computeLabels(leftPieSlices));
	let rightLabels = $derived(computeLabels(rightPieSlices));

	// Totals for delta summary
	let leftTotal = $derived(leftPieSlices.reduce((sum, s) => sum + s.value, 0));
	let rightTotal = $derived(rightPieSlices.reduce((sum, s) => sum + s.value, 0));
	let totalDelta = $derived(rightTotal - leftTotal);
	let totalPercentChange = $derived(leftTotal > 0 ? (totalDelta / leftTotal) * 100 : 0);

	// Delta calculations between left and right pies
	let deltas = $derived.by(() => {
		if (!showComparison || leftPieSlices.length === 0 || rightPieSlices.length === 0) return [];

		const leftMap = new Map(leftPieSlices.map((s) => [s.segment, s]));
		const rightMap = new Map(rightPieSlices.map((s) => [s.segment, s]));

		const allSegments = [
			...new Set([
				...leftPieSlices.map((s) => s.segment),
				...rightPieSlices.map((s) => s.segment)
			])
		];
		allSegments.sort((a, b) => {
			const ai = segmentOrder.indexOf(a);
			const bi = segmentOrder.indexOf(b);
			if (ai === -1 && bi === -1) return 0;
			if (ai === -1) return 1;
			if (bi === -1) return -1;
			return ai - bi;
		});

		return allSegments.map((seg) => {
			const leftVal = leftMap.get(seg)?.value || 0;
			const rightVal = rightMap.get(seg)?.value || 0;
			const change = rightVal - leftVal;
			const percentChange =
				leftVal > 0
					? ((rightVal - leftVal) / leftVal) * 100
					: rightVal > 0
						? 100
						: 0;
			const colors = getSegmentColor(seg);

			return {
				segment: seg,
				displayName: getSegmentLabel(seg),
				color: colors.bg,
				change,
				percentChange,
				isNew: leftVal === 0 && rightVal > 0
			};
		});
	});

	// SVG helper functions
	function polarToCartesian(
		centerX: number,
		centerY: number,
		radius: number,
		angleInDegrees: number
	) {
		const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
		return {
			x: centerX + radius * Math.cos(angleInRadians),
			y: centerY + radius * Math.sin(angleInRadians)
		};
	}

	function describeArc(
		x: number,
		y: number,
		radius: number,
		startAngle: number,
		endAngle: number
	): string {
		// Handle full circle case
		if (endAngle - startAngle >= 359.99) {
			const halfEnd = startAngle + 180;
			return (
				describeArc(x, y, radius, startAngle, halfEnd) +
				' ' +
				describeArc(x, y, radius, halfEnd, endAngle).replace('M', 'L')
			);
		}

		const start = polarToCartesian(x, y, radius, endAngle);
		const end = polarToCartesian(x, y, radius, startAngle);
		const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

		return ['M', x, y, 'L', start.x, start.y, 'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y, 'Z'].join(
			' '
		);
	}

	// Pre-compute all label positions for a set of slices, resolving overlaps
	// Outside labels alternate direction (up/down) per side to avoid collision
	interface LabelInfo {
		x: number;
		y: number;
		textAnchor: string;
		fitsInside: boolean;
		leaderLine: string | null;
	}

	function computeLabels(slices: PieSlice[]): LabelInfo[] {
		let outsideCount = 0;

		return slices.map((slice) => {
			const fitsInside = slice.percentage >= 10;

			if (fitsInside) {
				const labelRadius = RADIUS * 0.65;
				const pos = polarToCartesian(CX, CY, labelRadius, slice.midAngle);
				return { x: pos.x, y: pos.y, textAnchor: 'middle', fitsInside: true, leaderLine: null };
			}

			// Outside label — alternate horizontal direction so adjacent labels diverge
			const idx = outsideCount++;
			const naturalRight = slice.midAngle < 180;
			// Even indices keep natural side, odd indices flip to opposite
			const isRightSide = idx % 2 === 0 ? naturalRight : !naturalRight;
			const verticalRise = -15;

			const elbowPoint = polarToCartesian(CX, CY, RADIUS * 1.12, slice.midAngle);
			const innerPoint = polarToCartesian(CX, CY, RADIUS * 0.6, slice.midAngle);

			const horizontalLength = 50;
			let endX = isRightSide
				? elbowPoint.x + horizontalLength
				: elbowPoint.x - horizontalLength;
			let endY = elbowPoint.y + verticalRise;

			const padding = 10;
			endX = Math.max(padding, Math.min(500 - padding, endX));
			endY = Math.max(20, Math.min(400, endY));

			return {
				x: endX,
				y: endY,
				textAnchor: isRightSide ? 'start' : 'end',
				fitsInside: false,
				leaderLine: `M ${innerPoint.x} ${innerPoint.y} L ${elbowPoint.x} ${elbowPoint.y} L ${endX} ${endY}`
			};
		});
	}

	// Convert pixel coordinates to SVG viewBox coordinates
	function getSvgCoords(event: MouseEvent): { x: number; y: number } | null {
		const svg = (event.currentTarget as SVGElement).closest('svg');
		if (!svg) return null;
		const rect = svg.getBoundingClientRect();
		if (rect.width === 0 || rect.height === 0) return null;
		return {
			x: (event.clientX - rect.left) * (500 / rect.width),
			y: (event.clientY - rect.top) * (420 / rect.height)
		};
	}

	// Handle mouse events for tooltip
	function handleMouseEnter(segment: string, pieIndex: number, event: MouseEvent) {
		hoveredSegment = segment;
		hoveredPieIndex = pieIndex;
		tooltipPosition = getSvgCoords(event);
	}

	function handleMouseMove(event: MouseEvent) {
		tooltipPosition = getSvgCoords(event);
	}

	function handleMouseLeave() {
		hoveredSegment = null;
		hoveredPieIndex = -1;
		tooltipPosition = null;
	}

	// Get hovered segment data
	let hoveredData = $derived(
		hoveredSegment && hoveredPieIndex >= 0
			? ((hoveredPieIndex === 0 ? leftPieSlices : rightPieSlices).find(
					(d) => d.segment === hoveredSegment
				) ?? null)
			: null
	);

	// Prepare export metadata
	let exportMetadata = $derived({
		chartType: 'sector-pie-chart',
		geography: geography,
		year: year
	});

	// Prepare data for export
	let exportData = $derived(
		showComparison ? [...leftPieSlices, ...rightPieSlices] : leftPieSlices
	);
</script>

{#snippet internalHeaderControls()}
	{#if enableComparison}
		<div class="flex items-center gap-2 flex-wrap">
			<div
				class="inline-flex rounded-full border border-gray-200 overflow-hidden"
			>
				<button
					class="px-3 py-1 text-xs font-medium transition-colors {comparisonMode === 'year'
						? 'bg-gray-900 text-white'
						: 'bg-white text-gray-600 hover:bg-gray-50'}"
					onclick={() => (comparisonMode = 'year')}
				>
					Jmf. tid
				</button>
				<button
					class="px-3 py-1 text-xs font-medium transition-colors {comparisonMode === 'base'
						? 'bg-gray-900 text-white'
						: 'bg-white text-gray-600 hover:bg-gray-50'}"
					onclick={() => (comparisonMode = 'base')}
				>
					Jmf. scenarier
				</button>
			</div>
		</div>
	{/if}
	{#if headerControls}
		{@render headerControls()}
	{/if}
{/snippet}

{#snippet renderPie(slices: PieSlice[], labels: LabelInfo[], label: string, pieIndex: number)}
	<!-- Title above pie -->
	{#if label}
		<text
			x={CX}
			y="-5"
			text-anchor="middle"
			fill={viz.label}
			style="font-size: 20px; font-weight: 500;"
		>
			{label}
		</text>
	{/if}

	<!-- Pie slices -->
	{#each slices as slice}
		<path
			d={describeArc(CX, CY, RADIUS, slice.startAngle, slice.endAngle)}
			fill={slice.bgColor}
			stroke="white"
			stroke-width="2"
			class="cursor-pointer transition-opacity duration-150"
			class:opacity-50={hoveredSegment &&
				hoveredPieIndex === pieIndex &&
				hoveredSegment !== slice.segment}
			onmouseenter={(e) => handleMouseEnter(slice.segment, pieIndex, e)}
			onmousemove={handleMouseMove}
			onmouseleave={handleMouseLeave}
			role="img"
			aria-label="{slice.displayName}: {formatNumber(
				slice.value / 1000,
				'T',
				'Wh'
			)} ({slice.percentage.toFixed(0)}%)"
		/>
	{/each}

	<!-- Labels (pre-computed with collision resolution) -->
	{#each slices as slice, i}
		{@const lbl = labels[i]}

		{#if !lbl.fitsInside && lbl.leaderLine}
			<!-- Leader line for outside labels -->
			<path
				d={lbl.leaderLine}
				fill="none"
				stroke={viz.label}
				stroke-width="1"
			/>
		{/if}

		<!-- Label text -->
		<text
			x={lbl.x}
			y={lbl.y}
			text-anchor={lbl.textAnchor}
			dominant-baseline="middle"
			fill={lbl.fitsInside ? slice.textColor : viz.text}
			class="font-medium pointer-events-none"
			style="font-size: 14px;"
		>
			{#if lbl.fitsInside}
				<tspan x={lbl.x} dy="-0.6em" style="font-size: 14px;">{slice.displayName}</tspan>
				<tspan x={lbl.x} dy="1.4em" style="font-size: 12px;">{Math.round(slice.value / 1000)} TWh</tspan>
			{:else}
				<tspan dy="-0.6em" style="font-size: 13px;">{slice.displayName}</tspan>
				<tspan x={lbl.x} dy="1.4em" style="font-size: 11px;">{Math.round(slice.value / 1000)} TWh</tspan>
			{/if}
		</text>
	{/each}

	<!-- Tooltip -->
	{#if hoveredPieIndex === pieIndex && hoveredData && tooltipPosition}
		{@const tooltipWidth = 150}
		{@const tooltipHeight = 66}
		{@const tooltipX = Math.min(
			Math.max(tooltipPosition.x - tooltipWidth / 2, 10),
			490 - tooltipWidth
		)}
		{@const tooltipY =
			tooltipPosition.y > 250
				? tooltipPosition.y - tooltipHeight - 10
				: tooltipPosition.y + 15}

		<g transform="translate({tooltipX}, {tooltipY})">
			<!-- Tooltip background -->
			<rect
				width={tooltipWidth}
				height={tooltipHeight}
				fill={viz.subtleBg}
				stroke={viz.text}
				stroke-width="1"
				rx="4"
			/>
			<!-- Tooltip content -->
			<text x="10" y="18" fill={viz.text} style="font-size: 13px; font-weight: 600;">
				{hoveredData.displayName}
			</text>
			<text x="10" y="36" fill={viz.label} style="font-size: 12px;">
				{Math.round(hoveredData.value / 1000)} TWh
			</text>
			<text x="10" y="54" fill={viz.label} style="font-size: 12px;">
				{hoveredData.percentage.toFixed(1)}% av totalt
			</text>
		</g>
	{/if}
{/snippet}

<ChartContainer
	title="Sektoruppdelning"
	description={effectiveDescription}
	sizeVariant="none"
	aspectRatio="auto"
	metadata={exportMetadata}
	chartData={exportData}
	{exportable}
	headerControls={internalHeaderControls}
	exportPadding={{ top: 24 }}
	class={className}
>
	<div class="p-2">
		{#if loading}
			<LoadingSkeleton variant="chart" message="Laddar sektoruppdelning..." />
		{:else if error}
			<ErrorState
				message="Kunde inte ladda sektordata"
				details={error}
				onRetry={() => { fetchLeftPie(year!, true); if (showComparison) fetchRightPie(year!, true); }}
			/>
		{:else if leftPieSlices.length === 0}
			<EmptyState
				message="Ingen sektordata tillgänglig"
				description="Ingen data finns för valt år och geografi"
			/>
		{:else if showComparison}
			<!-- Dual pie layout -->
			<div class="flex flex-col sm:flex-row items-center justify-center gap-1">
				<!-- Left pie (reference: 2025 / baseline) -->
				<div class="flex-1 min-w-0 max-w-[360px] mx-auto">
					<svg viewBox="40 -30 420 450" class="w-full h-auto">
						{@render renderPie(leftPieSlices, leftLabels, leftLabel, 0)}
					</svg>
				</div>

				<!-- Delta column (between pies, visible on sm+) -->
				<div
					class="hidden sm:flex flex-col items-center justify-center self-center gap-1.5 px-1 py-4 min-w-[96px]"
				>
					{#each deltas as delta}
						<div class="flex items-center gap-1.5 text-xs whitespace-nowrap">
							<span
								class="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
								style="background-color: {delta.color}"
							></span>
							<span class="text-gray-500 w-16 truncate">{delta.displayName}</span>
							{#if delta.isNew}
								<span class="text-blue-600 font-medium">Ny</span>
							{:else}
								<span
									class={delta.change > 0
										? 'text-amber-600'
										: delta.change < 0
											? 'text-blue-600'
											: 'text-gray-400'}
								>
									{delta.change > 0 ? '↑' : delta.change < 0 ? '↓' : '→'}
									{#if deltaDisplay === 'percent'}
										{Math.abs(Math.round(delta.percentChange))}%
									{:else}
										{Math.abs(Math.round(delta.change / 1000))} TWh
									{/if}
								</span>
							{/if}
						</div>
					{/each}
					<!-- Total change -->
					<div
						class="mt-1.5 pt-1.5 border-t border-gray-200 flex items-center gap-1.5 text-xs font-medium whitespace-nowrap"
					>
						<span class="text-gray-700">Totalt</span>
						<span
							class={totalDelta > 0
								? 'text-amber-600'
								: totalDelta < 0
									? 'text-blue-600'
									: 'text-gray-400'}
						>
							{totalDelta > 0 ? '↑' : totalDelta < 0 ? '↓' : '→'}
							{#if deltaDisplay === 'percent'}
								{Math.abs(Math.round(totalPercentChange))}%
							{:else}
								{Math.abs(Math.round(totalDelta / 1000))} TWh
							{/if}
						</span>
					</div>
				</div>

				<!-- Right pie (selected year / adjusted scenario) -->
				<div class="flex-1 min-w-0 max-w-[360px] mx-auto">
					<svg viewBox="40 -30 420 450" class="w-full h-auto">
						{@render renderPie(rightPieSlices, rightLabels, rightLabel, 1)}
					</svg>
				</div>
			</div>
		{:else}
			<!-- Single pie (original layout) -->
			<div class="relative mx-auto w-full max-w-[440px] h-[280px] sm:h-[320px] lg:h-[360px]">
				<svg viewBox="40 0 420 420" class="w-full h-full">
					{@render renderPie(leftPieSlices, leftLabels, '', 0)}
				</svg>
			</div>
		{/if}
	</div>
</ChartContainer>
