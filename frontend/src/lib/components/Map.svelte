<script lang="ts">
	import MapBox from './MapBox.svelte';
	import Legend from './Legend.svelte';
	import YearSelect from './YearSelect.svelte';

	let { geojsonData, yearData, year, geography = $bindable(), scenario, lower_bound, upper_bound, parameterData } = $props();
</script>

<div class="relative w-full h-full">
	<div class="absolute z-10 top-10 left-4">
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

	<div class="absolute z-10 bottom-10 right-4 legend-overlay">
		<Legend {lower_bound} {upper_bound} />
	</div>
</div>
