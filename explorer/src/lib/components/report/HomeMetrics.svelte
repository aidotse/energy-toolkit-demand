<script lang="ts">
	/**
	 * HomeMetrics - Key metric cards for the home page
	 *
	 * Owns data fetching for time-series and hourly data.
	 * Reads year from viewStore, scenario from parameterStore.
	 */
	import { Zap, TrendingUp, Activity } from 'lucide-svelte';
	import MetricCard from '$lib/components/report/MetricCard.svelte';
	import { viewStore } from '$lib/stores/viewStore.svelte';
	import { parameterStore } from '$lib/stores/parameterStore.svelte';
	import { fetchDemandData } from '$lib/dataService';
	import { makeDemandQuery } from '$lib/utilities';
	import { getSegmentLabel } from '$lib/chartConfig';

	// Reactive metrics that update with scenario and year changes
	let timeSeriesData = $state<Array<{ period: Date; value: number }>>([]);
	let peakPower = $state(0);

	// Loading state: true until BOTH the time-series and hourly-peak fetches
	// have resolved at least once. After that, filter changes re-fetch without
	// flashing the skeleton — the stale numbers stay visible while new data loads.
	let timeSeriesLoaded = $state(false);
	let peakLoaded = $state(false);
	const loading = $derived(!(timeSeriesLoaded && peakLoaded));

	let totalEnergy2025 = $derived(
		timeSeriesData.find((d) => d.period.getFullYear() === 2025)?.value || 0
	);

	let totalEnergySelectedYear = $derived(
		timeSeriesData.find((d) => d.period.getFullYear() === viewStore.year)?.value || 0
	);

	let growthRate = $derived(
		totalEnergy2025 > 0
			? ((totalEnergySelectedYear - totalEnergy2025) / totalEnergy2025) * 100
			: 0
	);

	// Active filters from viewStore — drive both the queries and the filter text.
	// Geography: 'total' means all Sweden; any other value is a geo_id.
	// Segment: viewStore.segment is a string[]; the API accepts a comma-separated
	// list ("housing,transport") so we forward whichever segments the user picked.
	// segmentLabel returns 'total' when nothing specific is selected.
	let activeGeography = $derived(viewStore.geography || 'total');
	let activeSegmentParam = $derived(viewStore.segmentLabel);

	// Fetch time series data when scenario, parameters, geography, or segment change
	$effect(() => {
		const baseScenario = parameterStore.baseScenario;
		const _params = parameterStore.parameterValues;
		const geo = activeGeography;
		const seg = activeSegmentParam;

		if (!baseScenario) return;

		const query = makeDemandQuery({
			start: '2025',
			end: '2051',
			resolution: '1Y',
			aggregation: 'sum',
			geography: geo,
			segment: seg,
			baseScenario: baseScenario,
			parameterValues: parameterStore.isDefaultScenario
				? parameterStore.parameterValues
				: undefined
		});

		fetchDemandData(query).then((data) => {
			if (data.length > 0) {
				// API returns per-segment rows when a comma-separated segment list is
				// passed (the outer query GROUPs BY segment). Collapse back to one row
				// per period by summing across segments.
				const byPeriod = new Map<number, { period: Date; value: number }>();
				for (const row of data) {
					const key = row.period.getTime();
					const existing = byPeriod.get(key);
					if (existing) {
						existing.value += row.value || 0;
					} else {
						byPeriod.set(key, { period: row.period, value: row.value || 0 });
					}
				}
				timeSeriesData = Array.from(byPeriod.values()).sort(
					(a, b) => a.period.getTime() - b.period.getTime()
				);
			}
			timeSeriesLoaded = true;
		});
	});

	// Fetch hourly data for peak power when year / filters change
	$effect(() => {
		const baseScenario = parameterStore.baseScenario;
		const _params = parameterStore.parameterValues;
		const currentYear = viewStore.year;
		const geo = activeGeography;
		const seg = activeSegmentParam;

		if (!baseScenario || !currentYear) return;

		const query = makeDemandQuery({
			start: `${currentYear}-01-01`,
			end: `${currentYear + 1}-01-01`,
			resolution: '1h',
			aggregation: 'sum',
			geography: geo,
			segment: seg,
			baseScenario: baseScenario,
			parameterValues: parameterStore.isDefaultScenario
				? parameterStore.parameterValues
				: undefined
		});

		fetchDemandData(query).then((hourlyData) => {
			if (hourlyData.length > 0) {
				// Sum across segments for each hour before taking the peak, otherwise
				// the max is just the largest single-segment hour, not the combined peak.
				const byHour = new Map<number, number>();
				for (const row of hourlyData) {
					const key = row.period.getTime();
					byHour.set(key, (byHour.get(key) || 0) + (row.value || 0));
				}
				peakPower = Math.max(0, ...byHour.values());
			}
			peakLoaded = true;
		});
	});

	// Build a flowing Swedish description of the active filters:
	//   "Industri och bostäder i Norrbottens län"
	//   "Industri i Stockholms län"
	//   "Industri och bostäder"
	//   "I Norrbottens län"
	// Falsy (empty string) when nothing is filtered — the card hides the line.
	function joinSwedish(parts: string[]): string {
		if (parts.length === 0) return '';
		if (parts.length === 1) return parts[0];
		if (parts.length === 2) return `${parts[0]} och ${parts[1]}`;
		return `${parts.slice(0, -1).join(', ')} och ${parts[parts.length - 1]}`;
	}

	let filterText = $derived.by(() => {
		const segs = viewStore.segment.filter((s) => s && s !== 'total');
		const segmentPhrase = joinSwedish(segs.map((s) => getSegmentLabel(s).toLowerCase()));
		const hasGeo = activeGeography !== 'total' && activeGeography !== '00';
		const geoPhrase = hasGeo ? viewStore.geographyName : '';

		if (segmentPhrase && geoPhrase) {
			// Capitalize the first letter of the segment phrase
			const head = segmentPhrase.charAt(0).toUpperCase() + segmentPhrase.slice(1);
			return `${head} i ${geoPhrase}`;
		}
		if (segmentPhrase) {
			return segmentPhrase.charAt(0).toUpperCase() + segmentPhrase.slice(1);
		}
		if (geoPhrase) {
			return `I ${geoPhrase}`;
		}
		return '';
	});

	// Format numbers for display
	function formatEnergy(value: number): string {
		return `${Math.round(value / 1_000)} TWh`;
	}

	function formatPower(value: number): string {
		if (value >= 1) {
			return `${value.toFixed(1)} GW`;
		} else if (value > 0) {
			return `${Math.round(value * 1000)} MW`;
		}
		return '0 GW';
	}
</script>

<div class="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
	<MetricCard
		value={formatEnergy(totalEnergySelectedYear)}
		label="Totalt energibehov"
		sublabel={`År ${viewStore.year}`}
		icon={Zap}
		trend={growthRate >= 0 ? 'up' : 'down'}
		trendLabel={`${growthRate >= 0 ? '+' : ''}${Math.round(growthRate)}% sedan 2025`}
		{filterText}
		{loading}
	/>
	<MetricCard
		value={`${growthRate >= 0 ? '+' : ''}${Math.round(growthRate)}%`}
		label="Ökning i elbehovet"
		sublabel={`${viewStore.year} jämfört med 2025`}
		icon={TrendingUp}
		trend={growthRate >= 0 ? 'up' : 'down'}
		trendLabel="Elektrifiering driver"
		{filterText}
		{loading}
	/>
	<MetricCard
		value={formatPower(peakPower)}
		label="Maximalt effektbehov"
		sublabel={`År ${viewStore.year}`}
		icon={Activity}
		trend="up"
		trendLabel="Baserat på timdata"
		{filterText}
		{loading}
	/>
</div>
