<script lang="ts">
    import { formatNumber } from '$lib/utilities';

    let { lower_bound, upper_bound } = $props();

    // Specify demand levels and corresponding colors
    let demandLevels = [
        { value: lower_bound, color: '#0000FF' }, // Blue
        { value: lower_bound + (upper_bound - lower_bound) * 0.025, color: '#00FF7F' }, // Green
        { value: lower_bound + (upper_bound - lower_bound) * 0.75, color: '#FFA500' }, // Orange
        { value: upper_bound, color: '#df4217' }, // Red
    ];
</script>

<div class="flex flex-col rounded shadow px-2 lg:px-3 pt-3 pb-2 bg-surface-100 text-surface-content">
    <!-- Gradient Bar -->
    <div class="w-full h-3 lg:h-5 rounded mb-1 legend-gradient"></div>

    <!-- Labels -->
    <div class="flex flex-row justify-between w-full">
        {#each demandLevels as level}
            <div class="flex flex-col items-center text-[10px] lg:text-xs px-2">
                <span>{formatNumber(level.value, 'M', 'Wh')}</span>
            </div>
        {/each}
    </div>
</div>

<style>
    .legend-gradient {
        background: linear-gradient(to right, #0000FF, #00FF7F, #FFFF00, #FFA500, #df4217);
    }
</style>
