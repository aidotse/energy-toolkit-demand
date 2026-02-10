<script lang="ts">
    import { formatNumber } from '$lib/utilities';
    import { getEnergyPrefix } from '$lib/stores/units.svelte';

    let { lower_bound, upper_bound } = $props();

    // Specify demand levels and corresponding colors
    let demandLevels = [
        { value: lower_bound, color: '#61bbd9' }, // Light blue
        { value: lower_bound + (upper_bound - lower_bound) * 0.33, color: '#007399' }, // Teal
        { value: lower_bound + (upper_bound - lower_bound) * 0.66, color: '#002a66' }, // Dark navy
        { value: upper_bound, color: '#660042' }, // Burgundy
    ];
</script>

<div class="flex flex-col rounded shadow px-2 lg:px-3 pt-3 pb-2 bg-gray-100 text-gray-content">
    <!-- Gradient Bar -->
    <div class="w-full h-3 lg:h-5 rounded mb-1 legend-gradient"></div>

    <!-- Labels -->
    <div class="flex flex-row justify-between w-full">
        {#each demandLevels as level}
            <div class="flex flex-col items-center text-[10px] lg:text-xs px-2">
                <span>{formatNumber(level.value, getEnergyPrefix(), 'Wh')}</span>
            </div>
        {/each}
    </div>
</div>

<style>
    .legend-gradient {
        background: linear-gradient(to right, #61bbd9, #007399, #002a66, #660042);
    }
</style>
