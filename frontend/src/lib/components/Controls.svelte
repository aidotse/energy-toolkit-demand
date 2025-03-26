<script lang="ts">
    import { RangeField, SelectField, ButtonGroup, Button } from 'svelte-ux';

    let {parameterData, scenario = $bindable(), toggleControls = $bindable(), handleAnchorClick} = $props();

    const growthScenarios = parameterData.scenarios['growth'].map(scenario => ({
        label: scenario.label,
        value: scenario.index
    }));

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

    <button class="absolute w-8 left-80 top-20 transform px-3 py-2 rounded bg-slate-100 opacity-95 cursor-pointer transition-transform duration-300 ease-in-out z-30 {toggleControls ? 'translate-x-0' : '-translate-x-80'}" onclick={toggleDrawer}>×</button>

    <div class="fixed top-0 left-0 h-full w-80 flex flex-col px-4 py-16 bg-slate-100 opacity-95 transition-transform duration-300 ease-in-out z-30 {toggleControls ? 'translate-x-0' : '-translate-x-full'}">
        <section class="mb-6">
            <h3 class="pb-2 font-bold text-lg text-gray-800">Navigera</h3>
            <ul>
                {#each sections as item}
                    <li>
                        <a href={"#" + item.id} class="group relative flex items-center pl-4 py-1 text-gray-700" onclick={handleAnchorClick}>
                            <span class="absolute left-0 h-[90%] w-px bg-slate-500 transition-all duration-300 opacity-50 group-hover:w-1"></span>
                            {item.text}
                        </a>
                    </li>
                {/each}
            </ul>
        </section>
        <section class="mb-6">
            <h3 class="pb-2 font-bold">Scenario</h3>
            <div class="flex flex-col mr-4 mb-6">
                <label for="growth-select" class="text-xs opacity-100">Tillväxtscenario</label>
                <SelectField id="growth-select" class="my-1 opacity-100" options={growthScenarios} bind:value={scenario.growth} clearable={false} />
            </div>
            <div class="flex h-40 mr-4 mb-6 bg-slate-200 border justify-center"><p class="my-auto italic">Insert controls: teknik</p></div>
            <div class="flex h-40 mr-4 bg-slate-200 border justify-center"><p class="my-auto italic">Insert controls: flex</p></div>
        </section>
    </div>