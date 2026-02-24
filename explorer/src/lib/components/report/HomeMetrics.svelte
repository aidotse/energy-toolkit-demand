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

	// Reactive metrics that update with scenario and year changes
	let timeSeriesData = $state<Array<{ timestamp: Date; value: number }>>([]);
	let peakPower = $state(0);

	let totalEnergy2025 = $derived(
		timeSeriesData.find((d) => d.timestamp.getFullYear() === 2025)?.value || 0
	);

	let totalEnergySelectedYear = $derived(
		timeSeriesData.find((d) => d.timestamp.getFullYear() === viewStore.year)?.value || 0
	);

	let growthRate = $derived(
		totalEnergy2025 > 0
			? ((totalEnergySelectedYear - totalEnergy2025) / totalEnergy2025) * 100
			: 0
	);

	// Fetch time series data when scenario or parameters change
	$effect(() => {
		const baseScenario = parameterStore.baseScenario;
		const _params = parameterStore.parameterValues;

		if (!baseScenario) return;

		const query = makeDemandQuery({
			start: '2025',
			end: '2051',
			resolution: '1Y',
			aggregation: 'sum',
			geography: 'total',
			segment: 'total',
			baseScenario: baseScenario,
			parameterValues: parameterStore.isDefaultScenario
				? parameterStore.parameterValues
				: undefined
		});

		fetchDemandData(query).then((data) => {
			if (data.length > 0) {
				timeSeriesData = data;
			}
		});
	});

	// Fetch hourly data for peak power when year changes
	$effect(() => {
		const baseScenario = parameterStore.baseScenario;
		const _params = parameterStore.parameterValues;
		const currentYear = viewStore.year;

		if (!baseScenario || !currentYear) return;

		const query = makeDemandQuery({
			start: `${currentYear}-01-01`,
			end: `${currentYear + 1}-01-01`,
			resolution: '1h',
			aggregation: 'sum',
			geography: 'total',
			segment: 'total',
			baseScenario: baseScenario,
			parameterValues: parameterStore.isDefaultScenario
				? parameterStore.parameterValues
				: undefined
		});

		fetchDemandData(query).then((hourlyData) => {
			if (hourlyData.length > 0) {
				peakPower = hourlyData.reduce((max, d) => Math.max(max, d.value || 0), 0);
			}
		});
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
		label="Total energi"
		sublabel={`År ${viewStore.year}`}
		icon={Zap}
		trend={growthRate >= 0 ? 'up' : 'down'}
		trendLabel={`${growthRate >= 0 ? '+' : ''}${Math.round(growthRate)}% sedan 2025`}
	/>
	<MetricCard
		value={`${growthRate >= 0 ? '+' : ''}${Math.round(growthRate)}%`}
		label="Tillväxt"
		sublabel={`${viewStore.year} jämfört med 2025`}
		icon={TrendingUp}
		trend={growthRate >= 0 ? 'up' : 'down'}
		trendLabel="Elektrifiering driver"
	/>
	<MetricCard
		value={formatPower(peakPower)}
		label="Maxeffekt"
		sublabel={`År ${viewStore.year}`}
		icon={Activity}
		trend="up"
		trendLabel="Baserat på timdata"
	/>
</div>
