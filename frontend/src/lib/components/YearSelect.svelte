<script lang="ts">
    import { RangeField } from 'svelte-ux';

    let {parameterData, year = $bindable()} = $props();

    const minYear:number = Math.min(...parameterData.years);
    const maxYear:number = Math.max(...parameterData.years);

</script>

<RangeField id="year-range" class="my-1 opacity-100" value={year} on:change={(e) => year = e.detail.value} min={minYear} max={maxYear} step={1} />    
