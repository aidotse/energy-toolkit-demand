<script lang="ts">
	import MapBox from './MapBox.svelte';
	import Legend from './Legend.svelte';
	import YearSelect from './YearSelect.svelte';

	let {
		geojsonData,
		yearData,
		year,
		geography = $bindable(),
		scenario,
		lower_bound,
		upper_bound,
		parameterData,
		class: className = 'h-full'
	} = $props();

</script>

<div class="relative w-full {className}">
	<div class="absolute z-10 top-20 lg:top-10 left-6">
		<YearSelect {parameterData} bind:year />
	</div>

	<MapBox 
		{geojsonData}
		{year}
		bind:geography
		{yearData}
		{scenario}
		{lower_bound}
		{upper_bound} 
	/>

	<div class="absolute z-10 bottom-2 left-2 legend-overlay">
		<Legend {lower_bound} {upper_bound} />
	</div>
</div>
