<script lang="ts">
    import { formatNumber } from '$lib/utilities';

    export let minDemandValue: number;
    export let maxDemandValue: number;

    // Specify demand levels and corresponding colors
    let demandLevels = [
        { value: minDemandValue, color: '#0000FF' }, // Blue
        { value: minDemandValue + (maxDemandValue - minDemandValue) * 0.025, color: '#00FF7F' }, // Green
        { value: minDemandValue + (maxDemandValue - minDemandValue) * 0.25, color: '#FFFF00' }, // Yellow
        { value: minDemandValue + (maxDemandValue - minDemandValue) * 0.75, color: '#FFA500' }, // Orange
        { value: maxDemandValue, color: '#df4217' }, // Red
    ];
</script>

<div class="flex flex-col rounded shadow p-4 bg-surface-100 text-surface-content">
    <!-- Gradient Bar -->
    <div class="w-full h-5 rounded mb-4 legend-gradient"></div>

    <!-- Labels -->
    <div class="flex flex-row justify-between w-100">
        {#each demandLevels as level}
            <div class="flex flex-col items-center text-xs px-2">
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
