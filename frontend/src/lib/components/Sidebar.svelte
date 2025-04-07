<script lang="ts">
    import IndexNavigation from './IndexNavigation.svelte';
    import Scenario from './Scenario.svelte';

    let {index, config, scenarios, scenario = $bindable(), toggleControls = $bindable(), handleAnchorClick} = $props();

    function toggleDrawer() {
        toggleControls = !toggleControls;
    }
</script>

<button class="absolute w-8 left-80 top-20 transform px-3 py-2 rounded bg-slate-100 opacity-95 cursor-pointer transition-transform duration-300 ease-in-out z-30 {toggleControls ? 'translate-x-0' : '-translate-x-80'}" onclick={toggleDrawer}>×</button>

<div class="fixed top-0 left-0 h-full w-80 flex flex-col px-4 py-16 bg-slate-100 opacity-95 transition-transform duration-300 ease-in-out z-30 {toggleControls ? 'translate-x-0' : '-translate-x-full'}">
    <IndexNavigation {index} {handleAnchorClick} />
    <Scenario {config} bind:scenario {scenarios} />
</div>