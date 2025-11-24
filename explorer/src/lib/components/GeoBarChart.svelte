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
	import { makeDemandQuery } from '$lib/utilities';
	import { fetchDemandData } from '$lib/dataService';
	import LoadingSkeleton from '$lib/components/shared/LoadingSkeleton.svelte';
	import ErrorState from '$lib/components/shared/ErrorState.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import ScenarioLegend from '$lib/components/shared/ScenarioLegend.svelte';
	import ChartContainer from '$lib/components/shared/ChartContainer.svelte';
	import type { GeographicChartProps} from '$lib/types/ChartComponent.interface';
	import { scenarioState } from '$lib/stores/scenario.svelte';
	import {
		getNormalizedScenarios,
		assignScenarioColors,
		createComparisonMetadata,
		hexToRgba
	} from '$lib/comparisonUtils';
	import type { Snippet } from 'svelte';

	let {
		data: yearDataProp = [],
		parameterData,
		year,
		scenarios: scenariosProp,
		comparisonMode = false,
		headerControls,
		class: className = ''
	}: GeographicChartProps & { parameterData?: any; headerControls?: Snippet; class?: string } = $props();

	// Subscribe to global scenario state
	const currentScenario = $derived(scenarioState.currentScenario);

	// Normalize scenarios for comparison mode
	const normalizedScenarios = $derived(
		comparisonMode && scenariosProp
			? assignScenarioColors(scenariosProp)
			: assignScenarioColors(getNormalizedScenarios(currentScenario, scenariosProp))
	);

	let loading = $state(false);
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

	// Reactive data fetching when scenarios change
	$effect(() => {
		if (normalizedScenarios.length > 0 && year !== undefined) {
			fetchGeoData();
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
				// Single scenario mode - use existing pattern
				const query = makeDemandQuery({
					start: String(year),
					end: String(year + 1),
					resolution: '1Y',
					aggregation: 'sum',
					geography: 'all',
					segment: 'housing',
					scenarioId: normalizedScenarios[0].id || normalizedScenarios[0].scenario_id || 'default'
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
						segment: 'housing',
						scenarioId
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
				const name = geoLookup?.geo_name || geoLookup?.name || d.geography;
				return {
					...d,
					total: d.value || d.total || 0,
					name: name || 'Unknown'
				};
			})
			.filter((d) => d.name && d.name !== 'Unknown' && typeof d.name === 'string') // Ensure name is a valid string
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
						const geoName = geoLookup?.geo_name || geoLookup?.name || geoId;

						// Ensure we have a valid name
						if (!geoName || typeof geoName !== 'string') {
							console.warn('[GeoBarChart] Invalid geography name for', geoId, ':', geoName);
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
</script>

<ChartContainer
	title="Årlig energiförbrukning per geografi"
	sizeVariant="standard"
	aspectRatio="auto"
	metadata={exportMetadata}
	chartData={exportData}
	{headerControls}
	class={className}
>
	<div class="h-[300px]">
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
				props={{
					xAxis: { tweened: true, tickLabelProps: { rotate: 315, textAnchor: 'end' } },
					yAxis: { format: 'metric', tweened: true },
					bars: { tweened: true, radius: 2, stroke: 'none' }
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
				const color = hexToRgba(scenario.color || '#6b7280', opacity);
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
				groupPadding={0.1}
				props={{
					xAxis: { tweened: true, tickLabelProps: { rotate: 315, textAnchor: 'end' } },
					yAxis: { format: 'metric', tweened: true }
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