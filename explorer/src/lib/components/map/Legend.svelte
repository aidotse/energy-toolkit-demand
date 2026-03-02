<script lang="ts">
    import { formatNumber } from '$lib/utilities';
    import { getEnergyPrefix } from '$lib/stores/units.svelte';
    import { viz } from '$lib/colors';

    let { lower_bound, upper_bound } = $props();

    // Specify demand levels and corresponding colors
    let demandLevels = [
        { value: lower_bound, color: viz.mapGradient[0] },
        { value: lower_bound + (upper_bound - lower_bound) * 0.33, color: viz.mapGradient[1] },
        { value: lower_bound + (upper_bound - lower_bound) * 0.66, color: viz.mapGradient[2] },
        { value: upper_bound, color: viz.mapGradient[3] },
    ];
</script>

<div class="flex flex-col rounded shadow px-2 lg:px-3 pt-3 pb-2 bg-gray-100 text-gray-content">
    <!-- Gradient Bar -->
    <div class="w-full h-3 lg:h-5 rounded mb-1" style="background: linear-gradient(to right, {viz.mapGradient.join(', ')})"></div>

    <!-- Labels -->
    <div class="flex flex-row justify-between w-full">
        {#each demandLevels as level}
            <div class="flex flex-col items-center text-[10px] lg:text-xs px-2">
                <span>{formatNumber(level.value, getEnergyPrefix(), 'Wh')}</span>
            </div>
        {/each}
    </div>
</div>
