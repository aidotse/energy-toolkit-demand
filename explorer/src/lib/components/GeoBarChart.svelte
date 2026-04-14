<script lang="ts">
	/**
	 * GeoBarChart Component - Geographic comparison bar chart
	 *
	 * Standardized chart component following ChartComponent interface patterns.
	 * Displays electricity demand comparison across different geographies.
	 *
	 * @component
	 */
	import { BarChart } from 'layerchart';
	import { makeDemandQuery, formatNumber } from '$lib/utilities';
	import { getEnergyPrefix } from '$lib/stores/units.svelte';
	import { fetchDemandData } from '$lib/dataService';
	import LoadingSkeleton from '$lib/components/shared/LoadingSkeleton.svelte';
	import ErrorState from '$lib/components/shared/ErrorState.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import ScenarioLegend from '$lib/components/shared/ScenarioLegend.svelte';
	import ChartContainer from '$lib/components/shared/ChartContainer.svelte';
	import type { GeographicChartProps} from '$lib/types/ChartComponent.interface';
	import { scenarioState } from '$lib/stores/scenario.svelte';
	import { parameterStore } from '$lib/stores/parameterStore.svelte';
	import {
		getNormalizedScenarios,
		assignScenarioColors,
		createComparisonMetadata,
		hexToRgba
	} from '$lib/comparisonUtils';
	import { viz } from '$lib/colors';
	import { CHART_PADDING } from '$lib/chartConfig';
	import type { Snippet } from 'svelte';

	let {
		data: yearDataProp = [],
		parameterData,
		year,
		segment = 'total',
		scenarios: scenariosProp,
		comparisonMode = false,
		exportable = true,
		description = '',
		headerControls,
		baseScenarioOverride,
		parameterValuesOverride,
		class: className = ''
	}: GeographicChartProps & {
		parameterData?: any;
		exportable?: boolean;
		description?: string;
		headerControls?: Snippet;
		segment?: string;
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

	let loading = $state(true);
	let error = $state<string | null>(null);
	let fetchedYearData = $state<any[]>([]);
	let dataByScenario = $state<Record<string, any[]>>({});
	let hoveredScenarioId = $state<string | null>(null);
	let selectedScenarioId = $state<string | null>(null);

	// Helper to determine opacity based on hover/select state
	function getScenarioOpacity(scenarioId: string): number {
		if (selectedScenarioId) {
			return selectedScenarioId === scenarioId ? 0.9 : 0.1;
		}
		if (hoveredScenarioId) {
			return hoveredScenarioId === scenarioId ? 0.9 : 0.1;
		}
		return 0.5; // Default 50% opacity to see through bars
	}

	function handleHover(scenarioId: string | null) {
		hoveredScenarioId = scenarioId;
	}

	function handleClick(scenarioId: string) {
		selectedScenarioId = selectedScenarioId === scenarioId ? null : scenarioId;
	}

	// Use fetched data in single scenario mode, prop data otherwise
	const yearData = $derived(fetchedYearData.length > 0 ? fetchedYearData : yearDataProp);

	// Per-chart scenario/parameter overrides (fall back to global store)
	const baseScenario = $derived(baseScenarioOverride || parameterStore.baseScenario);
	const parameterValues = $derived(
		parameterValuesOverride ?? (parameterStore.isDefaultScenario ? { ...parameterStore.parameterValues } : undefined)
	);

	// Reactive data fetching when scenarios or filters change
	$effect(() => {
		if (normalizedScenarios.length > 0 && year !== undefined) {
			fetchGeoData();
		} else {
			// No fetch possible — release the skeleton so empty/error states can render.
			loading = false;
		}
	});

	async function fetchGeoData() {
		if (year === undefined) {
			error = 'År måste anges';
			return;
		}

		try {
			loading = true;
			error = null;

			if (normalizedScenarios.length === 1) {
				// Single scenario mode
				const query = makeDemandQuery({
					start: String(year),
					end: String(year + 1),
					resolution: '1Y',
					aggregation: 'sum',
					geography: 'all',
					segment,
					baseScenario,
					parameterValues
				});

				const data = await fetchDemandData(query);
				fetchedYearData = data;
			} else {
				// Comparison mode - fetch data for each scenario
				const fetchPromises = normalizedScenarios.map(async (scenario) => {
					const scenarioId = scenario.id || scenario.scenario_id || 'default';
					const query = makeDemandQuery({
						start: String(year),
						end: String(year + 1),
						resolution: '1Y',
						aggregation: 'sum',
						geography: 'all',
						segment,
						baseScenario: scenarioId,
						parameterValues
					});

					const data = await fetchDemandData(query);
					return { scenarioId, data };
				});

				const results = await Promise.all(fetchPromises);

				// Store data by scenario
				const newDataByScenario: Record<string, any[]> = {};
				for (const { scenarioId, data } of results) {
					newDataByScenario[scenarioId] = data;
				}
				dataByScenario = newDataByScenario;
			}
		} catch (err: any) {
			error = err?.message || 'Ett oväntat fel inträffade';
			console.error('Error fetching geo data:', err);
			fetchedYearData = [];
			dataByScenario = {};
		} finally {
			loading = false;
		}
	}

	// For single scenario mode
	let chartData = $derived.by(() => {
		if (normalizedScenarios.length !== 1) return [];

		const validData = (yearData || [])
			.filter((d) => d && d.geography && d.geography !== '00') // Filter out invalid items
			.map((d) => {
				// Look up geography name - check both geo_id/geo_name and id/name formats
				const geoLookup = parameterData?.geographies?.find(
					(g: any) => g.geo_id === d.geography || g.id === d.geography
				);
				const name = (geoLookup?.geo_name || geoLookup?.name || d.geography).replace(/s? län$/, '');
				return {
					...d,
					total: d.value || d.total || 0,
					name: name || 'Unknown'
				};
			})
			.filter((d) => d.name && d.name !== 'Unknown' && d.name !== 'Sverige' && typeof d.name === 'string')
			.sort((a, b) => b.total - a.total);

		// Final validation - ensure every item has the required properties
		return validData.every(item => item.name && item.total !== undefined) ? validData : [];
	});

	// For comparison mode - merge geographic data from multiple scenarios
	let comparisonGeoData = $derived(
		normalizedScenarios.length > 1
			? (() => {
					// Merge geographic data: combine by geography
					const geoMap = new Map<string, any>();

					// First pass: collect all geographies
					const allGeographies = new Set<string>();
					for (const scenario of normalizedScenarios) {
						const scenarioId = scenario.id || scenario.scenario_id;
						if (!scenarioId) {
							console.warn('[GeoBarChart] Scenario missing ID:', scenario);
							continue;
						}
						const data = dataByScenario[scenarioId] || [];
						for (const item of data.filter((d) => d.geography !== '00')) {
							allGeographies.add(item.geography);
						}
					}

					// Second pass: populate data with all scenarios for each geography
					for (const geoId of allGeographies) {
						// Skip if geoId is invalid
						if (!geoId || geoId === '00') continue;

						// Look up geography name - check both geo_id/geo_name and id/name formats
						const geoLookup = parameterData?.geographies?.find(
							(g: any) => g.geo_id === geoId || g.id === geoId
						);
						const geoName = (geoLookup?.geo_name || geoLookup?.name || geoId).replace(/s? län$/, '');

						// Ensure we have a valid name, skip Sverige (total)
						if (!geoName || typeof geoName !== 'string' || geoName === 'Sverige') {
							continue;
						}

						const geoData: any = {
							geography: geoId,
							name: geoName || 'Unknown'
						};

						// Initialize all scenario values to 0
						for (const scenario of normalizedScenarios) {
							const scenarioId = scenario.id || scenario.scenario_id;
							if (scenarioId) {
								geoData[scenarioId] = 0;
							} else {
								console.warn('[GeoBarChart] Scenario missing ID when initializing:', scenario);
							}
						}

						// Fill in actual values
						for (const scenario of normalizedScenarios) {
							const scenarioId = scenario.id || scenario.scenario_id;
							if (!scenarioId) {
								console.warn('[GeoBarChart] Skipping scenario with no ID:', scenario);
								continue;
							}

							const data = dataByScenario[scenarioId] || [];
							const item = data.find((d) => d.geography === geoId);
							if (item) {
								geoData[scenarioId] = item.value || item.total || 0;
							}
						}

						// Final validation - ensure all required fields exist
						if (geoData.name && geoData.geography && Object.keys(geoData).length > 2) {
							geoMap.set(geoId, geoData);
						} else {
							console.warn('[GeoBarChart] Skipping incomplete geo data:', geoData);
						}
					}

					// Sort by total demand across all scenarios
					const result = Array.from(geoMap.values()).sort((a, b) => {
						const totalA = normalizedScenarios.reduce(
							(sum, s) => {
								const scenarioId = s.id || s.scenario_id;
								return sum + (scenarioId ? (a[scenarioId] || 0) : 0);
							},
							0
						);
						const totalB = normalizedScenarios.reduce(
							(sum, s) => {
								const scenarioId = s.id || s.scenario_id;
								return sum + (scenarioId ? (b[scenarioId] || 0) : 0);
							},
							0
						);
						return totalB - totalA;
					});

					return result;
				})()
			: []
	);

	// Create comparison metadata for legend
	let metadata = $derived(
		normalizedScenarios.length > 1 ? createComparisonMetadata(normalizedScenarios) : null
	);

	// Prepare export metadata
	let exportMetadata = $derived({
		chartType: 'geographic-breakdown',
		year: year,
		scenario: normalizedScenarios.length === 1
			? (normalizedScenarios[0].id || normalizedScenarios[0].scenario_id)
			: undefined,
		scenarios: normalizedScenarios.length > 1
			? normalizedScenarios.map(s => s.id || s.scenario_id || 'unknown')
			: undefined
	});

	// Prepare data for export
	let exportData = $derived(
		normalizedScenarios.length === 1 ? chartData : comparisonGeoData
	);

	// Shared tooltip and highlight props
	const tooltipProps = {
		highlight: { area: { fill: 'rgba(0,0,0,0.05)' } },
		tooltip: {
			root: {
				variant: 'none' as const,
				contained: 'window' as const,
				class: 'text-xs py-1 px-2 rounded shadow-lg bg-white/95 border border-gray-200 backdrop-blur-sm'
			},
			item: {
				label: '',
				format: (v: number) => formatNumber(v, getEnergyPrefix(), 'Wh')
			}
		}
	};
</script>

<ChartContainer
	title="Årlig energiförbrukning per geografi"
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
	<div class="h-[400px]">
	{#if loading}
		<LoadingSkeleton variant="chart" message="Laddar geografisk data..." />
	{:else if error}
		<ErrorState message="Kunde inte ladda geografisk data" details={error} onRetry={fetchGeoData} />
	{:else if chartData.length === 0 && comparisonGeoData.length === 0}
		<EmptyState
			message="Ingen geografisk data tillgänglig"
			description="Ingen data finns för valt år"
		/>
	{:else if normalizedScenarios.length === 1}
		<!-- Single scenario mode -->
		{#if chartData.length > 0}
			<BarChart
				data={chartData}
				x="name"
				y="total"
				padding={CHART_PADDING.rotatedX}
				props={{
					xAxis: { tweened: true, tickLabelProps: { rotate: 315, textAnchor: 'end', fontSize: 11 } },
					yAxis: { format: (v: number) => formatNumber(v, getEnergyPrefix(), 'Wh').replace(/\.\d+/, ''), tweened: true, tickLabelProps: { fontSize: 11 } },
					bars: { tweened: true, radius: 2, stroke: 'none', fill: viz.teal[700] },
					...tooltipProps
				}}
			/>
		{:else}
			<EmptyState
				message="Ingen data tillgänglig"
				description="Laddar geografisk data..."
			/>
		{/if}
	{:else if normalizedScenarios.length > 1}
		<!-- Comparison mode - overlayed bars with transparency -->
		{@const hasRequiredFields = comparisonGeoData.length > 0 &&
			comparisonGeoData.every(d => d && d.name) &&
			normalizedScenarios.every(s => {
				const sid = s.id || s.scenario_id;
				return sid && comparisonGeoData.every(d => d && typeof d[sid] !== 'undefined');
			})}
		{#if hasRequiredFields}
			{@const series = normalizedScenarios.map(scenario => {
				const scenarioId = scenario.id || scenario.scenario_id || '';
				const opacity = getScenarioOpacity(scenarioId);
				const color = hexToRgba(scenario.color || viz.scenario.baseline, opacity);
				return {
					key: scenarioId,
					color,
					props: {
						radius: 2,
						stroke: 'none'
					}
				};
			})}
			<BarChart
				data={comparisonGeoData}
				x="name"
				{series}
				seriesLayout="group"
				padding={CHART_PADDING.rotatedX}
				groupPadding={0.1}
				props={{
					xAxis: { tweened: true, tickLabelProps: { rotate: 315, textAnchor: 'end', fontSize: 11 } },
					yAxis: { format: (v: number) => formatNumber(v, getEnergyPrefix(), 'Wh').replace(/\.\d+/, ''), tweened: true, tickLabelProps: { fontSize: 11 } },
					...tooltipProps
				}}
			/>

			<!-- Scenario Legend -->
			{#if metadata}
				<ScenarioLegend
					scenarios={normalizedScenarios}
					{metadata}
					onHover={handleHover}
					onClick={handleClick}
					class="mt-4"
				/>
			{/if}
		{:else}
			<EmptyState
				message="Väntar på data"
				description="Laddar jämförelsedata..."
			/>
		{/if}
	{/if}
	</div>
</ChartContainer>