<script lang="ts">
    import type { ScenarioComponent } from '../../types/index';
    import { onMount } from 'svelte';
    import * as m from '$paraglide/messages';

    let { config, scenario = $bindable(), scenarios } = $props();

    let rangeValues = $state<Record<string, number>>({});
    let sliderRefs: Record<string, HTMLInputElement> = {};
    let isInitialized = $state(false);
    let activeSliders = $state<Record<string, boolean>>({});
    let hideTimeouts: Record<string, number> = {};
    const scenarioConfig = config.scenarios.filter((component: ScenarioComponent) => component.type !== 'constraint')

    function initializeRangeValues() {
        scenarioConfig.forEach((component: ScenarioComponent) => {
            rangeValues[component.name] = component.values.indexOf(component.default);
            scenario[component.name] = component.default;
            activeSliders[component.name] = false;
        });
        isInitialized = true;
    }

    onMount(() => {
        initializeRangeValues();
    });

    function handleRangeChange(component: ScenarioComponent, value: number) {
        rangeValues[component.name] = value;
        scenario[component.name] = component.values[value];
        activeSliders[component.name] = true;
        
        // Clear any existing timeout
        if (hideTimeouts[component.name]) {
            clearTimeout(hideTimeouts[component.name]);
        }
        
        // Set new timeout to hide the bubble after 1 second
        hideTimeouts[component.name] = setTimeout(() => {
            activeSliders[component.name] = false;
        }, 1500);
    }

    function getLabelPosition(component: ScenarioComponent): string {
        const ref = sliderRefs[component.name];
        const value = rangeValues[component.name] ?? component.values.indexOf(component.default);

        if (!ref) return '0px';

        const percent = value / (component.values.length - 1);
        const sliderWidth = ref.offsetWidth;

        // Thumb size compensation (browser-dependent, 16px is a safe default)
        const thumbSize = 16;

        const usableWidth = sliderWidth - thumbSize;
        const thumbX = usableWidth * percent + thumbSize / 2;

        return `${thumbX}px`;
    }

</script>

<section class="mb-6">
    <h3 class="pb-4 font-bold">Scenario</h3>
    {#each scenarioConfig as component}
        <div class="flex flex-col ml-2 mr-6 mb-2">
            <label for={component.name} class="mb-0 text-xs font-bold opacity-100">{m[component.name]()}</label>
            <div class="relative h-8">
                <input
                    bind:this={sliderRefs[component.name]}
                    type="range"
                    id={component.name}
                    min="0"
                    max={component.values.length - 1}
                    step="1"
                    value={rangeValues[component.name] ?? component.values.indexOf(component.default)}
                    oninput={(e: Event) => handleRangeChange(component, Number((e.target as HTMLInputElement).value))}
                    class="absolute top-1/2 -translate-y-1/2 w-full accent-blue-500 range-input"
                />
                {#if isInitialized && activeSliders[component.name]}
                    <span
                        class="bubble-label absolute -top-[19px] text-[0.625rem] whitespace-nowrap bg-white text-gray-800 px-[4px] py-0.5 border rounded-sm transform -translate-x-1/2 transition-all z-10"
                        style="left: {getLabelPosition(component)}"
                    >
                        {m[component.labels[rangeValues[component.name] ?? component.values.indexOf(component.default)]]()}
                    </span>
                {/if}
            </div>
        </div>
    {/each}
</section>

<style>
	.bubble-label {
		position: relative;
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