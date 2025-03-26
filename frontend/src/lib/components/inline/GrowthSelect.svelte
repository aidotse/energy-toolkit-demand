<script lang="ts">
    let {parameterData, scenario = $bindable()} = $props();

    const options = parameterData.scenarios['growth'].map(scenario => ({
        label: scenario.label,
        value: scenario.index
    }));

</script>

<select bind:value={scenario.growth} class="border-1 border-slate-200 rounded-sm bg-slate-100 py-px pl-px text-sm">
    {#each options as option}
        <option value={option.value}>{option.label}</option>
    {/each}
</select>