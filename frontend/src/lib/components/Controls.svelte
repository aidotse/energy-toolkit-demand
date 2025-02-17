<script lang="ts">
    import { RangeField, SelectField, ButtonGroup, Button } from 'svelte-ux';

    let {parameterData, year = $bindable(), chartType = $bindable(), geography = $bindable(), resolution = $bindable(), aggregation = $bindable(), toggleControls = $bindable(), handleAnchorClick} = $props();

    // Set first and last year in range
    const minYear:number = Math.min(...parameterData.years);
    const maxYear:number = Math.max(...parameterData.years);

    const options = parameterData.geographies.map((geo) => ({
        label: geo.geo_name, // The text displayed in the dropdown
        value: geo.geo_id,   // The value associated with the option
    })).sort((a, b) => { // Sort alphabetically by label but put 'Sverige' first
    return a.label === "Sverige" ? -1 
         : b.label === "Sverige" ? 1 
         : a.label.localeCompare(b.label, 'sv'); // Sort alphabetically for others

    }); 

    // Set available resolutions
    const resolutions = parameterData.aggregations
        .filter(entry => entry.resolution !== "1YE")
        .map(entry => entry.resolution);

    // Set variables related to aggregations
    const aggregations = parameterData.aggregations
        .filter(entry => entry.resolution !== "1YE")

    const allAggregations = [...new Set(aggregations.flatMap(agg => agg.aggregation))];

    let availableAggregations = $derived(aggregations.find(agg => agg.resolution === resolution)?.aggregation || []);

    const sections = [
        { id: "section1", text: "Framtidens elbehov" },
        { id: "section2", text: "Vem behöver elen?" },
        { id: "section3", text: "Hur snabbt kan det gå?" },
        { id: "section4", text: "Vilken roll kommer flex spela?" },
        { id: "section5", text: "Utforska djupare" }
    ]

    function toggleDrawer() {
        toggleControls = !toggleControls;
    }

</script>

    <button class="absolute w-8 left-80 top-20 transform px-3 py-2 rounded bg-slate-100 opacity-95 cursor-pointer transition-transform duration-300 ease-in-out z-30 {toggleControls ? 'translate-x-0' : '-translate-x-80'}" on:click={toggleDrawer}>×</button>

    <div class="fixed top-0 left-0 h-full w-80 flex flex-col px-4 py-16 bg-slate-100 opacity-95 transition-transform duration-300 ease-in-out z-30 {toggleControls ? 'translate-x-0' : '-translate-x-full'}">
        <section class="mb-6">
            <h3 class="pb-2 font-bold text-lg text-gray-800">Navigera</h3>
            <ul>
                {#each sections as item}
                    <li>
                        <a href={"#" + item.id} class="group relative flex items-center pl-4 py-1 text-gray-700" on:click={handleAnchorClick}>
                            <span class="absolute left-0 h-[90%] w-px bg-slate-500 transition-all duration-300 opacity-50 group-hover:w-1"></span>
                            {item.text}
                        </a>
                    </li>
                {/each}
            </ul>
        </section>
        <section class="mb-6">
            <h3 class="pb-2 font-bold">Scenario</h3>
            <div class="flex h-40 mr-4 mb-6 bg-slate-200 border justify-center"><p class="my-auto italic">Insert controls: tillväxt</p></div>
            <div class="flex h-40 mr-4 mb-6 bg-slate-200 border justify-center"><p class="my-auto italic">Insert controls: teknik</p></div>
            <div class="flex h-40 mr-4 bg-slate-200 border justify-center"><p class="my-auto italic">Insert controls: flex</p></div>
        </section>
        <section class="flex flex-col mb-6">
            <h3 class="pb-2 font-bold">Fokus</h3>
            <label class="text-xs opacity-100">År</label>
            <RangeField class="my-1 opacity-100" value={year} on:change={(e) => year = e.detail.value} min={minYear} max={maxYear} step={1} />
            <label class="text-xs opacity-100">Geografi</label>
            <SelectField class="my-1 opacity-100" {options} bind:value={geography} clearable={false} />
            <label class="text-xs opacity-100">Upplösning</label>
            <ButtonGroup class="my-1 opacity-100">
                {#each resolutions as res}
                    <Button
                        class="mx-px text-xs opacity-100"
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
            <label class="text-xs opacity-100">Statistik</label>
            <ButtonGroup class="my-1 opacity-100">
                {#each allAggregations as agg}
                    <Button
                        class="mx-px text-xs opacity-100"
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
        </section>
    </div>