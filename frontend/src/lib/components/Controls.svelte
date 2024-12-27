<script lang="ts">
    import { Card, RangeField, SelectField, ButtonGroup, Button } from 'svelte-ux';

    export let parameterData: object;
    export let selectedYear: number;

    export let chartType: string;
    export let geography: string;
    export let resolution: string;
    export let aggregation: string;

    // Set first and last year in range
    const minYear:number = Math.min(...parameterData.years);
    const maxYear:number = Math.max(...parameterData.years);

    const options = parameterData.geographies.map((geo) => ({
        label: geo.name, // The text displayed in the dropdown
        value: geo.id,   // The value associated with the option
    })).sort((a, b) => a.label.localeCompare(b.label, 'sv')); // Sort alphabetically by label

    // Set available resolutions
    const resolutions = parameterData.aggregations
        .filter(entry => entry.resolution !== "1YE")
        .map(entry => entry.resolution);

    // Set variables related to aggregations
    const aggregations = parameterData.aggregations
        .filter(entry => entry.resolution !== "1YE")

    const allAggregations = [...new Set(aggregations.flatMap(agg => agg.aggregation))];

    $: availableAggregations = aggregations.find(agg => agg.resolution === resolution)?.aggregation || [];

</script>

<Card class="p-4 rounded-sm">
    <RangeField class="my-1" value={selectedYear} on:change={(e) => selectedYear = e.detail.value} min={minYear} max={maxYear} step={1} />
    <SelectField class="my-1" {options} bind:value={geography} clearable={false} />
    <ButtonGroup class="my-1">
        {#each resolutions as res}
            <Button
                class="mx-px text-xs"
                variant="fill-light"
                color="primary"
                on:click={() => resolution = res}
                active={resolution === res}
                disabled={chartType === 'bar' && (res === '1h' || res === '3h' || res === '1d')}
            >
            {res}
            </Button>
        {/each}
    </ButtonGroup>
    <ButtonGroup class="my-1">
        {#each allAggregations as agg}
            <Button
                class="mx-px text-xs"
                variant="fill-light"
                color="primary"
                on:click={() => aggregation = agg}
                active={aggregation === agg}
                disabled={!availableAggregations.includes(agg)}
                >
            {agg}
            </Button>
        {/each}
    </ButtonGroup>
</Card>
