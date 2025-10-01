<script lang="ts">
    import { RangeField } from 'svelte-ux';
    import { onMount } from 'svelte';
    import * as m from '$paraglide/messages';

    let {parameterData, year = $bindable()} = $props();

    const minYear:number = parameterData?.years?.length > 0 ? Math.min(...parameterData.years) : 2025;
    const maxYear:number = parameterData?.years?.length > 0 ? Math.max(...parameterData.years) : 2050;

    let sliderRef: HTMLInputElement;
    let isInitialized = $state(false);

    function handleRangeChange(value: number) {
        year = value;
    }

    function getLabelPosition(): string {
        if (!sliderRef) return '0px';

        const percent = (year - minYear) / (maxYear - minYear);
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

<div class="flex flex-col w-32 2xl:w-64 pt-1">
    <div class="relative h-7">
        <input
            bind:this={sliderRef}
            type="range"
            id="year-range"
            min={minYear}
            max={maxYear}
            step="1"
            value={year}
            oninput={(e: Event) => handleRangeChange(Number((e.target as HTMLInputElement).value))}
            class="absolute top-1/2 -translate-y-1/2 w-full accent-blue-500 range-input"
        />
        {#if isInitialized}
            <span
                class="bubble-label absolute -top-[24px] text-[0.625rem] whitespace-nowrap bg-white text-gray-800 px-[4px] py-0.5 border rounded-sm transform -translate-x-1/2 transition-all z-10"
                style="left: {getLabelPosition()}"
            >
                {year}
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
		background: white;
		border: 1px solid rgb(203, 203, 203);
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
		background-color: #3b82f6;
		height: 12px;
		width: 12px;
		border-radius: 50%;
		border: none;
	}

	.range-input::-moz-range-thumb {
		background-color: #3b82f6;
		height: 12px;
		width: 12px;
		border-radius: 50%;
		border: none;
	}

	.range-input:focus {
		outline: none;
	}
</style>