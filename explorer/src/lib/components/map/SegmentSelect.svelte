<script lang="ts">
    import { getSegmentLabel, SEGMENT_ORDER } from '$lib/chartConfig';

    let { segments = $bindable(['total']), embedded = false }: { segments: string[]; embedded?: boolean } = $props();

    let expanded = $state(false);

    const AVAILABLE_SEGMENTS = [
        { id: 'total', label: 'Total' },
        ...SEGMENT_ORDER.map(id => ({ id, label: getSegmentLabel(id) }))
    ];

    // Display text when collapsed
    let displayText = $derived(
        segments.includes('total')
            ? 'Total'
            : segments.map(s => getSegmentLabel(s) || s).join(', ')
    );

    function toggleSegment(segmentId: string) {
        if (segmentId === 'total') {
            // Selecting total clears other selections
            segments = ['total'];
        } else {
            // Remove 'total' if selecting specific segments
            let newSegments = segments.filter(s => s !== 'total');
            if (newSegments.includes(segmentId)) {
                newSegments = newSegments.filter(s => s !== segmentId);
            } else {
                newSegments = [...newSegments, segmentId];
            }
            // If nothing selected, default to total
            segments = newSegments.length > 0 ? newSegments : ['total'];
        }
    }

    function handleClickOutside(event: MouseEvent) {
        const target = event.target as HTMLElement;
        if (!target.closest('.segment-select')) {
            expanded = false;
        }
    }
</script>

<svelte:window onclick={handleClickOutside} />

<div class="segment-select relative">
    <button
        type="button"
        onclick={() => expanded = !expanded}
        class="flex items-center gap-2 {embedded ? 'w-full bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 rounded-r-lg' : 'w-40 2xl:w-72 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-full shadow-sm hover:bg-white dark:hover:bg-gray-700'} px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors"
    >
        <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" />
        </svg>
        <span class="truncate flex-1 text-left">{displayText}</span>
        <svg class="w-4 h-4 flex-shrink-0 transition-transform {expanded ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
    </button>

    {#if expanded}
        <div class="absolute top-full left-0 mt-1 w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
            {#each AVAILABLE_SEGMENTS as segment}
                <button
                    type="button"
                    onclick={() => toggleSegment(segment.id)}
                    class="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                    <span class="w-4 h-4 flex items-center justify-center border border-gray-300 dark:border-gray-600 rounded {segments.includes(segment.id) ? 'bg-chart-900 border-chart-900' : ''}">
                        {#if segments.includes(segment.id)}
                            <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                            </svg>
                        {/if}
                    </span>
                    <span class="text-gray-700 dark:text-gray-200">{segment.label}</span>
                </button>
            {/each}
        </div>
    {/if}
</div>
