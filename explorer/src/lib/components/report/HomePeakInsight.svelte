<script lang="ts">
	/**
	 * HomePeakInsight - Dynamic InsightBox about peak power for the home page.
	 *
	 * Fetches hourly peak power data for 2025 and the target year,
	 * calculates % change, and renders an InsightBox with the result.
	 */
	import { viewStore } from '$lib/stores/viewStore.svelte';
	import { parameterStore } from '$lib/stores/parameterStore.svelte';
	import { fetchDemandData } from '$lib/dataService';
	import { makeDemandQuery } from '$lib/utilities';
	import InsightBox from '$lib/components/report/InsightBox.svelte';

	let peakChangePercent = $state(0);

	const targetYear = $derived(viewStore.year);

	$effect(() => {
		const baseScenario = parameterStore.baseScenario;
		const currentYear = viewStore.year;
		if (!baseScenario || !currentYear) return;

		const paramValues = parameterStore.isDefaultScenario
			? parameterStore.parameterValues
			: undefined;

		const query2025 = makeDemandQuery({
			start: '2025-01-01',
			end: '2026-01-01',
			resolution: '1h',
			aggregation: 'sum',
			geography: 'total',
			segment: 'total',
			baseScenario: baseScenario,
			parameterValues: paramValues
		});
		const queryTarget = makeDemandQuery({
			start: `${currentYear}-01-01`,
			end: `${currentYear + 1}-01-01`,
			resolution: '1h',
			aggregation: 'sum',
			geography: 'total',
			segment: 'total',
			baseScenario: baseScenario,
			parameterValues: paramValues
		});

		Promise.all([fetchDemandData(query2025), fetchDemandData(queryTarget)]).then(
			([data2025, dataTarget]) => {
				const peak2025 = data2025.reduce((max, d) => Math.max(max, d.value || 0), 0);
				const peakTarget = dataTarget.reduce((max, d) => Math.max(max, d.value || 0), 0);
				peakChangePercent = peak2025 > 0
					? Math.round(((peakTarget - peak2025) / peak2025) * 100)
					: 0;
			}
		);
	});
</script>

<InsightBox title="Toppeffekten är den verkliga utmaningen">
	Skillnaden mellan energi (TWh per år) och effekt (GW just nu) är
	avgörande. Årsstatistiken kan se hanterbar ut — men en kall vintermorgon
	{targetYear} kan effektbehovet vara {peakChangePercent}
	procent högre än idag. Det är de timmarna som avgör om elnätet klarar sig.
</InsightBox>
