<script lang="ts">
    let {parameterData, geography = $bindable()} = $props();

    const options = parameterData.geographies.map((geo) => ({
        label: geo.geo_name, // The text displayed in the dropdown
        value: geo.geo_id,   // The value associated with the option
    })).sort((a, b) => { // Sort alphabetically by label but put 'Sverige' first
    return a.label === "Sverige" ? -1 
         : b.label === "Sverige" ? 1 
         : a.label.localeCompare(b.label, 'sv'); // Sort alphabetically for others

    }); 

</script>

<select bind:value={geography} class="border-1 border-slate-200 rounded-sm bg-slate-100 py-px pl-px pr-0 inline-block text-sm">
    {#each options as option}
        <option value={option.value}>{option.label}</option>
    {/each}
</select>