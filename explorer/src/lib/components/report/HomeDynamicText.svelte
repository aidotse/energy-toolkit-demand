<script lang="ts">
	/**
	 * HomeDynamicText - Dynamic intro paragraph for the home page.
	 *
	 * Fetches yearly totals and renders text with reactive values
	 * (target year, TWh, % change) based on the active scenario.
	 */
	import { viewStore } from '$lib/stores/viewStore.svelte';
	import { parameterStore } from '$lib/stores/parameterStore.svelte';
	import { fetchDemandData } from '$lib/dataService';
	import { makeDemandQuery } from '$lib/utilities';

	let totalTargetYear = $state(0);
	let totalChangePercent = $state(0);

	const targetYear = $derived(viewStore.year);

	$effect(() => {
		const baseScenario = parameterStore.baseScenario;
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
			if (data.length === 0) return;
			const val2025 = data.find((d) => d.timestamp.getFullYear() === 2025)?.value || 0;
			const valTarget = data.find((d) => d.timestamp.getFullYear() === viewStore.year)?.value || 0;
			totalTargetYear = Math.round(valTarget / 1_000);
			totalChangePercent = val2025 > 0 ? Math.round(((valTarget - val2025) / val2025) * 100) : 0;
		});
	});
</script>

<div class="prose prose-sm max-w-none">
	<h2>Elbehovet växer — men inte överallt på samma sätt</h2>

	<p>
		Sverige använder idag runt 140 TWh el per år. I det valda scenariot
		ökar det till {totalTargetYear} TWh till {targetYear}. Det är
		en ökning med {totalChangePercent} procent på drygt två decennier.
	</p>

	<p>
		Ökningen sker inte jämnt. Fram till 2030 är förändringen måttlig.
		Därefter accelererar kurvan när storskalig elektrifiering av transporter
		och industri får genomslag.
	</p>
</div>
