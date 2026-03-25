<script lang="ts">
	/**
	 * FlexPeakBars — Two-bar comparison of peak demand with/without flexibility
	 *
	 * Shows hatched "ghost" zone for shaved capacity, bracket annotation,
	 * and context row with reactor equivalents.
	 *
	 * @component
	 */
	import { fetchDemandData } from '$lib/dataService';
	import { makeDemandQuery, formatNumber } from '$lib/utilities';
	import { getPowerPrefix } from '$lib/stores/units.svelte';
	import LoadingSkeleton from '$lib/components/shared/LoadingSkeleton.svelte';
	import ChartContainer from '$lib/components/shared/ChartContainer.svelte';
	import { parameterStore } from '$lib/stores/parameterStore.svelte';
	import { viz } from '$lib/colors';
	import type { Snippet } from 'svelte';

	const FLEX_PARAMS = [
		'housing_flex', 'transport_flex', 'industry_flex', 'services_flex', 'datacenters_flex'
	] as const;

	const SEGMENT_TO_FLEX: Record<string, string> = {
		housing: 'housing_flex', transport: 'transport_flex', industry: 'industry_flex',
		services: 'services_flex', datacenters: 'datacenters_flex'
	};

	let {
		geography,
		year,
		segment = 'total',
		exportable = true,
		description = '',
		headerControls,
		baseScenarioOverride,
		parameterValuesOverride,
		class: className = ''
	}: {
		geography?: string;
		year?: number;
		segment?: string;
		exportable?: boolean;
		description?: string;
		headerControls?: Snippet;
		baseScenarioOverride?: string;
		parameterValuesOverride?: Record<string, number>;
		class?: string;
	} = $props();

	const baseScenario = $derived(baseScenarioOverride || parameterStore.baseScenario);
	const parameterValues = $derived(parameterValuesOverride || parameterStore.parameterValues);

	let loading = $state(false);
	let error = $state<string | null>(null);
	let baselinePeak = $state(0);
	let flexPeak = $state(0);

	const delta = $derived(baselinePeak - flexPeak);
	const pct = $derived(baselinePeak > 0 ? (delta / baselinePeak) * 100 : 0);

	function buildFlexParams(base: Record<string, number>, flexIndex: number): Record<string, number> {
		const result = { ...base };
		if (segment === 'total') {
			for (const fp of FLEX_PARAMS) { result[fp] = flexIndex; }
		} else if (SEGMENT_TO_FLEX[segment]) {
			result[SEGMENT_TO_FLEX[segment]] = flexIndex;
		}
		return result;
	}

	async function fetchPeakData() {
		if (!geography || !year || !baseScenario) return;
		loading = true;
		error = null;
		try {
			const start = `${year}-01-01`;
			const end = `${year + 1}-01-01`;
			const seg = segment || 'total';

			const baselineParams = buildFlexParams(parameterValues, 0);
			const flexParams = buildFlexParams(parameterValues, 2);

			const [baselineData, flexData] = await Promise.all([
				fetchDemandData(makeDemandQuery({ start, end, resolution: '1h', aggregation: 'sum', geography, segment: seg, baseScenario, parameterValues: baselineParams })),
				fetchDemandData(makeDemandQuery({ start, end, resolution: '1h', aggregation: 'sum', geography, segment: seg, baseScenario, parameterValues: flexParams }))
			]);

			baselinePeak = baselineData.length > 0
				? Math.max(...baselineData.map(d => d.value || 0))
				: 0;
			flexPeak = flexData.length > 0
				? Math.max(...flexData.map(d => d.value || 0))
				: 0;
		} catch (e: any) {
			error = e.message || 'Kunde inte ladda data';
			baselinePeak = 0;
			flexPeak = 0;
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (geography && year && baseScenario) {
			const _pv = parameterValues;
			const _seg = segment;
			fetchPeakData();
		}
	});

	// SVG layout constants
	const W = 400;
	const H = 260;
	const BAR_W = 70;
	const GAP = 60;
	const TOP = 20;
	const BOTTOM = 70;   // space for labels below bars
	const BAR_AREA_H = H - TOP - BOTTOM;

	const BASELINE_COLOR = viz.teal[900];
	const FLEX_COLOR = '#e67e22';

	// Bar geometry (derived from data)
	const barLeftX = $derived((W - BAR_W * 2 - GAP) / 2);
	const barRightX = $derived(barLeftX + BAR_W + GAP);
	const maxVal = $derived(Math.max(baselinePeak, 1));
	const baselineH = $derived(BAR_AREA_H);
	const flexH = $derived(baselinePeak > 0 ? (flexPeak / baselinePeak) * BAR_AREA_H : BAR_AREA_H);
	const baselineY = $derived(TOP + BAR_AREA_H - baselineH);
	const flexY = $derived(TOP + BAR_AREA_H - flexH);
	const hatchY = $derived(TOP + BAR_AREA_H - baselineH);  // same as baselineY
	const hatchH = $derived(baselineH - flexH);

	// Bracket annotation position (right side of hatched zone)
	const bracketX = $derived(barRightX + BAR_W + 12);
	const bracketMidY = $derived(hatchY + hatchH / 2);
</script>

<ChartContainer
	title="Toppeffekt med flexibilitet"
	{description}
	sizeVariant="none"
	aspectRatio="auto"
	metadata={{ chartType: 'flex-peak-bars', geography, year, segment }}
	chartData={[{ baselinePeak, flexPeak, delta, pct }]}
	{exportable}
	{headerControls}
	class={className}
>
	<div class="flex justify-center">
	{#if loading}
		<div class="h-[300px] w-full">
			<LoadingSkeleton variant="chart" message="Laddar toppeffekt..." />
		</div>
	{:else if error}
		<div class="text-red-600 text-sm p-4">{error}</div>
	{:else if baselinePeak === 0}
		<div class="flex items-center justify-center h-[300px] text-gray-400 text-sm">Ingen data tillgänglig</div>
	{:else}
		<svg viewBox="0 0 {W} {H}" class="w-full max-w-md" preserveAspectRatio="xMidYMid meet">
			<defs>
				<pattern id="peak-hatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
					<line x1="0" y1="0" x2="0" y2="6" stroke="#dc2626" stroke-width="1.5" opacity="0.3" />
				</pattern>
			</defs>

			<!-- Left bar: baseline (full height) -->
			<rect
				x={barLeftX} y={baselineY}
				width={BAR_W} height={baselineH}
				fill={BASELINE_COLOR} rx="3"
			/>

			<!-- Right bar: flex (shorter) -->
			<rect
				x={barRightX} y={flexY}
				width={BAR_W} height={flexH}
				fill={FLEX_COLOR} rx="3"
			/>

			<!-- Hatched ghost zone on right bar (shaved capacity) -->
			{#if hatchH > 0}
				<rect
					x={barRightX} y={hatchY}
					width={BAR_W} height={hatchH}
					fill="url(#peak-hatch)"
					stroke="#dc2626" stroke-width="1" stroke-dasharray="4 2" opacity="0.6"
					rx="3"
				/>

				<!-- Bracket annotation -->
				<!-- Vertical line -->
				<line
					x1={bracketX} y1={hatchY + 2}
					x2={bracketX} y2={hatchY + hatchH - 2}
					stroke="#dc2626" stroke-width="1.5"
				/>
				<!-- Top tick -->
				<line
					x1={bracketX - 4} y1={hatchY + 2}
					x2={bracketX + 2} y2={hatchY + 2}
					stroke="#dc2626" stroke-width="1.5"
				/>
				<!-- Bottom tick -->
				<line
					x1={bracketX - 4} y1={hatchY + hatchH - 2}
					x2={bracketX + 2} y2={hatchY + hatchH - 2}
					stroke="#dc2626" stroke-width="1.5"
				/>
				<!-- Delta text -->
				<text
					x={bracketX + 8} y={bracketMidY + 4}
					font-size="12" font-weight="700" fill="#dc2626"
				>
					−{delta.toFixed(1)} GW
				</text>
			{/if}

			<!-- Value labels below bars -->
			<text
				x={barLeftX + BAR_W / 2} y={TOP + BAR_AREA_H + 22}
				text-anchor="middle" font-size="16" font-weight="700" fill={BASELINE_COLOR}
			>
				{baselinePeak.toFixed(1)} GW
			</text>
			<text
				x={barLeftX + BAR_W / 2} y={TOP + BAR_AREA_H + 38}
				text-anchor="middle" font-size="10" fill="#6b7280"
			>
				Utan flexibilitet
			</text>

			<text
				x={barRightX + BAR_W / 2} y={TOP + BAR_AREA_H + 22}
				text-anchor="middle" font-size="16" font-weight="700" fill={FLEX_COLOR}
			>
				{flexPeak.toFixed(1)} GW
			</text>
			<text
				x={barRightX + BAR_W / 2} y={TOP + BAR_AREA_H + 38}
				text-anchor="middle" font-size="10" fill="#6b7280"
			>
				Med 15 % flexibilitet
			</text>
		</svg>
	{/if}
	</div>

</ChartContainer>
