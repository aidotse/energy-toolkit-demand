<!--
  MethodologySteps - Vertical numbered pipeline showing the 5 methodology steps.
  Each step has a large circled number, bold title, and gray description.
  Vertical line connects the circles. Owns its data internally.
-->
<script lang="ts">
	import { viz } from '$lib/colors';

	const steps = [
		{
			title: 'Energimyndighetens scenarier',
			desc: 'Tre scenarier för Sveriges framtida elanvändning, uppdelat på fem sektorer och 21 län.'
		},
		{
			title: 'Årsinterpolering',
			desc: 'Från sex femårspunkter till sammanhängande årliga tidsserier med linjär interpolering.'
		},
		{
			title: 'Timprofiler',
			desc: 'Normaliserade lastprofiler ger varje årsvärde en realistisk timfördelning.'
		},
		{
			title: 'Scenarioparametrar',
			desc: 'Tillväxt- och flexkurvor låter användaren utforska variationer kring basscenarierna.'
		},
		{
			title: 'Kvalitetssäkring',
			desc: 'Normalisering, brusaddition och validering säkerställer datakvaliteten.'
		}
	];
</script>

<div class="my-8">
	{#each steps as step, i}
		<div class="flex gap-4 {i < steps.length - 1 ? 'pb-6' : ''}">
			<!-- Number circle + connecting line -->
			<div class="flex flex-col items-center">
				<div
					class="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
					style="background-color: {viz.teal[900]};"
				>
					<span class="text-base font-bold text-white">{i + 1}</span>
				</div>
				{#if i < steps.length - 1}
					<div class="w-0.5 flex-1 mt-1" style="background-color: {viz.teal[900]}; opacity: 0.25;"></div>
				{/if}
			</div>

			<!-- Text -->
			<div class="pt-1.5 pb-1">
				<p class="font-semibold text-gray-900 dark:text-gray-100 leading-tight">{step.title}</p>
				<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">{step.desc}</p>
			</div>
		</div>
	{/each}
</div>
