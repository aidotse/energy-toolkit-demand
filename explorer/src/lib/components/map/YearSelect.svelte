<script lang="ts">
    import { RangeField } from 'svelte-ux';
    import { onMount } from 'svelte';
    import * as m from '$paraglide/messages';

    let {
        parameterData,
        year,
        onYearChange,
        embedded = false
    }: {
        parameterData: any;
        year: number;
        onYearChange?: (year: number) => void;
        embedded?: boolean;
    } = $props();

    const minYear = $derived<number>(parameterData?.years?.length > 0 ? Math.min(...parameterData.years) : 2025);
    const maxYear = $derived<number>(parameterData?.years?.length > 0 ? Math.max(...parameterData.years) : 2050);

    let sliderRef: HTMLInputElement;
    let isInitialized = $state(false);
    // svelte-ignore state_referenced_locally
    let tempYear = $state(year); // Local state for immediate slider updates
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    // Sync tempYear when parent year changes
    $effect(() => {
        tempYear = year;
    });

    function handleRangeChange(value: number) {
        tempYear = value; // Update slider position immediately

        // Clear existing timer
        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }

        // Set new timer to notify parent after 300ms
        debounceTimer = setTimeout(() => {
            onYearChange?.(value);
        }, 300);
    }

    function getLabelPosition(): string {
        if (!sliderRef) return '0px';

        const percent = (tempYear - minYear) / (maxYear - minYear);
        const sliderWidth = sliderRef.offsetWidth;

        const thumbSize = 16;
        const labelWidth = 30.9;

        const usableWidth = sliderWidth - thumbSize;
        const thumbX = usableWidth * percent + thumbSize / 2;

        return `${thumbX - labelWidth / 2}px`;
    }

    onMount(() => {
        isInitialized = true;
    });

</script>

<div class="flex flex-col {embedded ? 'w-full' : 'w-40 2xl:w-72 bg-white/90 backdrop-blur-sm rounded-full shadow-sm'} pt-1 px-3 pb-2">
    <div class="relative h-7">
        <input
            bind:this={sliderRef}
            type="range"
            id="year-range"
            min={minYear}
            max={maxYear}
            step="1"
            value={tempYear}
            oninput={(e: Event) => handleRangeChange(Number((e.target as HTMLInputElement).value))}
            class="absolute top-1/2 -translate-y-1/2 w-full accent-blue-500 range-input"
        />
        {#if isInitialized}
            <span
                class="bubble-label absolute -top-[24px] text-[0.625rem] font-semibold whitespace-nowrap bg-chart-900 text-white px-[6px] py-0.5 border border-chart-900 rounded-sm transform -translate-x-1/2 transition-all z-10"
                style="left: {getLabelPosition()}"
            >
                {tempYear}
            </span>
        {/if}
    </div>
</div>

<style>
	.bubble-label {
		position: relative;
		transform: translateX(-50%);
	}

	.bubble-label::before {
		content: "";
		position: absolute;
		bottom: -3.5px;
		left: 50%;
		transform: translateX(-50%) rotate(45deg);
		width: 6px;
		height: 6px;
		/* viz.teal[900] from $lib/colors */
		background: #004d66;
		border: 1px solid #004d66;
		border-top: none;
		border-left: none;
	}

	.bubble-label::after {
		display: none;
	}

	.range-input {
		-webkit-appearance: none;
		appearance: none;
		background: transparent;
		cursor: pointer;
		height: 4px;
	}

	.range-input::-webkit-slider-runnable-track {
		background: #e5e7eb;
		height: 4px;
		border-radius: 2px;
	}

	.range-input::-moz-range-track {
		background: #e5e7eb;
		height: 4px;
		border-radius: 2px;
	}

	.range-input::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		margin-top: -4px;
		background-color: #1f2937;
		height: 12px;
		width: 12px;
		border-radius: 50%;
		border: none;
	}

	:global(.dark) .range-input::-webkit-slider-thumb {
		background-color: #e5e7eb;
	}

	.range-input::-moz-range-thumb {
		background-color: #1f2937;
		height: 12px;
		width: 12px;
		border-radius: 50%;
		border: none;
	}

	:global(.dark) .range-input::-moz-range-thumb {
		background-color: #e5e7eb;
	}

	.range-input:focus {
		outline: none;
	}
</style>