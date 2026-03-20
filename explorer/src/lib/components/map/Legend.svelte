<script lang="ts">
    import { formatNumber } from '$lib/utilities';
    import { getEnergyPrefix } from '$lib/stores/units.svelte';
    import { viz } from '$lib/colors';

    let { lower_bound, upper_bound } = $props();

    // Demand levels at non-linear stop positions matching mapGradient
    let demandLevels = viz.mapStops.map((stop, i) => ({
        value: lower_bound + (upper_bound - lower_bound) * stop,
        color: viz.mapGradient[i],
    }));
</script>

<div class="flex flex-col rounded shadow px-2 lg:px-3 pt-3 pb-2 bg-gray-100 text-gray-content">
    <!-- Gradient Bar -->
    <div class="w-full h-3 lg:h-5 rounded mb-1" style="background: linear-gradient(to right, {viz.mapGradient.join(', ')})"></div>

    <!-- Labels -->
    <div class="flex flex-row justify-between w-full">
        {#each demandLevels as level}
            <div class="flex flex-col items-center text-[10px] lg:text-xs px-2">
                <span>{formatNumber(level.value, getEnergyPrefix(), 'Wh', 0)}</span>
            </div>
        {/each}
    </div>
</div>
