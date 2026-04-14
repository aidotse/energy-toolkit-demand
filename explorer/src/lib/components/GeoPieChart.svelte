<script lang="ts">
	/**
	 * GeoPieChart — Top 5 counties by energy consumption + "Övriga"
	 *
	 * Uses layerchart PieChart. Fetches yearly demand for all geographies,
	 * sorts descending, takes top 4, groups the rest as "Övriga".
	 *
	 * @component
	 */
	import { PieChart } from 'layerchart';
	import { formatNumber, makeDemandQuery } from '$lib/utilities';
	import { getEnergyPrefix } from '$lib/stores/units.svelte';
	import { fetchDemandData } from '$lib/dataService';
	import LoadingSkeleton from '$lib/components/shared/LoadingSkeleton.svelte';
	import ErrorState from '$lib/components/shared/ErrorState.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import ChartContainer from '$lib/components/shared/ChartContainer.svelte';
	import { parameterStore } from '$lib/stores/parameterStore.svelte';
	import { viz, GEO_PALETTE } from '$lib/colors';
	import type { Snippet } from 'svelte';

	// Top 5 counties get the first five entries of the shared geo palette
	// (cool blues + the new emerald accent). "Övriga" uses the warm flex orange
	// so it's clearly distinct from the 5th county.
	const GEO_COLORS: readonly string[] = GEO_PALETTE.slice(0, 5);

	let {
		year,
		segment = 'total',
		geographies = [],
		exportable = true,
		description = '',
		headerControls,
		baseScenarioOverride,
		parameterValuesOverride,
		enableComparison = false,
		comparisonYear = 2025,
		initialComparisonMode = 'year' as 'year' | 'base',
		deltaDisplay = 'percent' as 'percent' | 'absolute',
		class: className = ''
	}: {
		year?: number;
		segment?: string;
		geographies?: Array<{ id?: string; geo_id?: string; name?: string; geo_name?: string }>;
		exportable?: boolean;
		description?: string;
		headerControls?: Snippet;
		baseScenarioOverride?: string;
		parameterValuesOverride?: Record<string, number>;
		enableComparison?: boolean;
		comparisonYear?: number;
		initialComparisonMode?: 'year' | 'base';
		deltaDisplay?: 'percent' | 'absolute';
		class?: string;
	} = $props();

	// svelte-ignore state_referenced_locally
	let comparisonMode = $state<'year' | 'base'>(initialComparisonMode);

	const baseScenario = $derived(baseScenarioOverride || parameterStore.baseScenario);
	const parameterValues = $derived(
		parameterValuesOverride ?? (parameterStore.isDefaultScenario ? parameterStore.parameterValues : undefined)
	);

	// Default scenario ("Beslutad policy") — the reference the left pie compares against
	const defaultScenarioId = $derived(parameterStore.defaultScenario?.id);
	const hasParameterOverrides = $derived(
		parameterValuesOverride
			? Object.values(parameterValuesOverride).some((v) => v > 0)
			: parameterStore.hasActiveParameters
	);

	// Show the side-by-side layout when the current selection actually differs
	// from the reference: in year mode, when year !== comparisonYear; in base
	// mode, when a non-default scenario is picked or parameters have been adjusted.
	const showComparison = $derived(
		enableComparison &&
			(comparisonMode === 'year'
				? year !== comparisonYear
				: baseScenario !== defaultScenarioId || hasParameterOverrides)
	);

	let leftLoading = $state(true);
	let rightLoading = $state(true);
	let error = $state<string | null>(null);
	// Left pie: default scenario reference (only populated in comparison mode)
	let leftRawData = $state<any[]>([]);
	// Right pie: current selection in comparison mode; single pie otherwise
	let rawData = $state<any[]>([]);

	function geoName(geoId: string): string {
		if (geoId === 'other') return 'Övriga';
		const g = geographies.find((g: any) => (g.geo_id || g.id) === geoId);
		const name = g?.geo_name || g?.name || geoId;
		return name.replace(/s? län$/, '');
	}

	async function fetchForYear(targetYear: number, scenarioOverride: string | undefined, withParams: boolean) {
		const query = makeDemandQuery({
			start: String(targetYear),
			end: String(targetYear + 1),
			resolution: '1Y',
			aggregation: 'sum',
			geography: 'all',
			segment: segment || 'total',
			baseScenario: scenarioOverride || baseScenario,
			parameterValues: withParams ? parameterValues : undefined
		});
		return fetchDemandData(query);
	}

	async function fetchRight() {
		if (!year || !baseScenario) return;
		rightLoading = true;
		error = null;
		try {
			rawData = await fetchForYear(year, undefined, true);
		} catch (e: any) {
			error = e.message || 'Kunde inte ladda geodata';
			rawData = [];
		} finally {
			rightLoading = false;
		}
	}

	async function fetchLeft(targetYear: number, scenarioOverride: string | undefined, withParams: boolean) {
		leftLoading = true;
		try {
			leftRawData = await fetchForYear(targetYear, scenarioOverride, withParams);
		} catch (e: any) {
			if (!rawData.length) error = e.message || 'Kunde inte ladda geodata';
			leftRawData = [];
		} finally {
			leftLoading = false;
		}
	}

	$effect(() => {
		if (year && baseScenario) {
			const _pv = parameterValues;
			const _seg = segment;
			fetchRight();
		}
	});

	$effect(() => {
		if (!showComparison) {
			leftRawData = [];
			return;
		}
		const _seg = segment;
		if (comparisonMode === 'year') {
			// Left = comparisonYear in current scenario, no params
			fetchLeft(comparisonYear, baseScenario, false);
		} else {
			// Left = current year in default scenario, no params
			if (!year || !defaultScenarioId) return;
			fetchLeft(year, defaultScenarioId, false);
		}
	});

	const loading = $derived(rightLoading && rawData.length === 0);

	// Aggregate raw demand rows into { geoId -> value }, filtering nationwide totals
	function aggregateByGeo(raw: any[]): Map<string, number> {
		const byGeo = new Map<string, number>();
		for (const d of raw || []) {
			const geo = d.geography || 'unknown';
			if (geo === '00' || geo === 'total') continue;
			byGeo.set(geo, (byGeo.get(geo) || 0) + (d.value || 0));
		}
		return byGeo;
	}

	// Top-4 county IDs, determined by the REFERENCE set (left pie in comparison mode,
	// otherwise the right/single pie). Keeping the top-4 stable across both sides guarantees
	// that colors stay bound to the same counties and the delta column compares apples to apples.
	const referenceTopIds = $derived.by(() => {
		const ref = showComparison ? leftRawData : rawData;
		const byGeo = aggregateByGeo(ref);
		return [...byGeo.entries()]
			.sort((a, b) => b[1] - a[1])
			.slice(0, 4)
			.map(([id]) => id);
	});

	function buildEntries(raw: any[]) {
		if (!raw || raw.length === 0) return [] as Array<{ key: string; label: string; value: number; color: string }>;
		const byGeo = aggregateByGeo(raw);
		const topIds = referenceTopIds;

		const entries = topIds.map((id, i) => ({
			key: id,
			label: geoName(id),
			value: byGeo.get(id) || 0,
			color: GEO_COLORS[i]
		}));

		let restValue = 0;
		for (const [id, value] of byGeo) {
			if (!topIds.includes(id)) restValue += value;
		}
		if (restValue > 0) {
			entries.push({ key: 'other', label: 'Övriga', value: restValue, color: viz.flex });
		}
		return entries;
	}

	const chartData = $derived(buildEntries(rawData));
	const leftChartData = $derived(buildEntries(leftRawData));

	// Deltas for the center column — right (selected) vs left (default)
	const deltas = $derived.by(() => {
		if (!showComparison || leftChartData.length === 0 || chartData.length === 0) return [];
		const leftMap = new Map(leftChartData.map((d) => [d.key, d]));
		return chartData.map((d) => {
			const leftVal = leftMap.get(d.key)?.value ?? 0;
			const change = d.value - leftVal;
			const percentChange = leftVal > 0 ? (change / leftVal) * 100 : d.value > 0 ? 100 : 0;
			return {
				key: d.key,
				label: d.label,
				color: d.color,
				change,
				percentChange,
				isNew: leftVal === 0 && d.value > 0
			};
		});
	});

	const leftTotal = $derived(leftChartData.reduce((s, d) => s + d.value, 0));
	const rightTotal = $derived(chartData.reduce((s, d) => s + d.value, 0));
	const totalDelta = $derived(rightTotal - leftTotal);
	const totalPercentChange = $derived(leftTotal > 0 ? (totalDelta / leftTotal) * 100 : 0);

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

	const leftLabel = $derived(
		comparisonMode === 'year' ? String(comparisonYear) : defaultScenarioName
	);
	const rightLabel = $derived(
		comparisonMode === 'year' ? String(year) : rightLabelBase
	);

	const effectiveDescription = $derived.by(() => {
		if (!showComparison) return description;
		if (comparisonMode === 'year') {
			return `Topp 4 län efter elbehov år ${comparisonYear} jämfört med ${year} i scenariot ${activeScenarioName}.`;
		}
		return `Topp 4 län efter elbehov år ${year}: ${rightLabelBase} jämfört med ${defaultScenarioName}.`;
	});

	function setMode(mode: 'year' | 'base') {
		comparisonMode = mode;
	}

	const tooltipProps = {
		tooltip: {
			root: {
				variant: 'none' as const,
				contained: 'window' as const,
				class: 'text-xs py-1 px-2 rounded shadow-lg bg-white/95 border border-gray-200 backdrop-blur-sm whitespace-nowrap'
			},
			item: {
				format: (v: number) => '\u00A0\u00A0\u00A0' + formatNumber(v / 1000, 'T', 'Wh')
			}
		}
	};
</script>

{#snippet internalHeaderControls()}
	{#if enableComparison}
		<div class="inline-flex rounded-full border border-gray-200 overflow-hidden">
			<button
				class="px-3 py-1 text-xs font-medium transition-colors {comparisonMode === 'year'
					? 'bg-gray-900 text-white'
					: 'bg-white text-gray-600 hover:bg-gray-50'}"
				onclick={() => setMode('year')}
			>
				Jmf. tid
			</button>
			<button
				class="px-3 py-1 text-xs font-medium transition-colors {comparisonMode === 'base'
					? 'bg-gray-900 text-white'
					: 'bg-white text-gray-600 hover:bg-gray-50'}"
				onclick={() => setMode('base')}
			>
				Jmf. scenarier
			</button>
		</div>
	{/if}
	{#if headerControls}
		{@render headerControls()}
	{/if}
{/snippet}

<ChartContainer
	title="Topp 4 län"
	description={effectiveDescription}
	sizeVariant="none"
	aspectRatio="auto"
	metadata={{ chartType: 'geo-pie', year, segment }}
	chartData={showComparison ? [...leftChartData, ...chartData] : chartData}
	{exportable}
	headerControls={internalHeaderControls}
	exportPadding={{ top: 24, bottom: 24 }}
	class={className}
>
	{#if loading && chartData.length === 0}
		<div class="h-[240px] my-8">
			<LoadingSkeleton variant="chart" message="Laddar geodata..." />
		</div>
	{:else if error}
		<div class="h-[240px] my-8">
			<ErrorState message="Kunde inte ladda geodata" details={error} onRetry={fetchRight} />
		</div>
	{:else if chartData.length === 0}
		<div class="h-[240px] my-8">
			<EmptyState message="Ingen geodata tillgänglig" description="Ingen data finns för valt år" />
		</div>
	{:else if showComparison && leftChartData.length > 0}
		<!-- Dual pie comparison: default scenario (left) vs current selection (right) -->
		<div class="flex flex-col sm:flex-row items-start gap-2 my-4">
			<div class="flex-1 min-w-0">
				<div class="text-center text-sm font-medium text-gray-700 mb-1 truncate px-2">{leftLabel}</div>
				<div class="h-[220px]">
					<PieChart
						data={leftChartData}
						key="key"
						label="label"
						value="value"
						c="color"
						legend={false}
						props={{ ...tooltipProps }}
					/>
				</div>
			</div>

			<div class="hidden sm:flex flex-col items-center justify-center self-center gap-1.5 px-2 py-4 min-w-[110px]">
				{#each deltas as delta}
					<div class="flex items-center gap-1.5 text-xs whitespace-nowrap">
						<span
							class="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
							style="background-color: {delta.color}"
						></span>
						<span class="text-gray-500 w-16 truncate">{delta.label}</span>
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

			<div class="flex-1 min-w-0">
				<div class="text-center text-sm font-medium text-gray-700 mb-1 truncate px-2">{rightLabel}</div>
				<div class="h-[220px]">
					<PieChart
						data={chartData}
						key="key"
						label="label"
						value="value"
						c="color"
						legend={false}
						props={{ ...tooltipProps }}
					/>
				</div>
			</div>
		</div>
	{:else}
		<div class="h-[240px] my-8">
			<PieChart
				data={chartData}
				key="key"
				label="label"
				value="value"
				c="color"
				legend={false}
				props={{ ...tooltipProps }}
			/>
		</div>
	{/if}

	{#if chartData.length > 0}
		<div class="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-1 pb-2 px-4">
			{#each chartData as item}
				<div class="flex items-center gap-1.5 text-xs">
					<span class="inline-block w-3 h-3 rounded-sm" style="background-color: {item.color}"></span>
					<span class="text-gray-700">{item.label}</span>
				</div>
			{/each}
		</div>
	{/if}
</ChartContainer>
