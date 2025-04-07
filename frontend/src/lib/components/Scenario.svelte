<script lang="ts">
    import type { ScenarioComponent } from '../../types/index';
    import { onMount } from 'svelte';

    let { config, scenario = $bindable(), scenarios } = $props();

    let rangeValues = $state<Record<string, number>>({});
    let sliderRefs: Record<string, HTMLInputElement> = {};
    let isInitialized = $state(false);
    const scenarioConfig = config.scenarios.filter((component: ScenarioComponent) => component.type !== 'constraint')

    function initializeRangeValues() {
        scenarioConfig.forEach((component: ScenarioComponent) => {
            rangeValues[component.name] = component.values.indexOf(component.default);
            scenario[component.name] = component.default;
        });
        isInitialized = true;
    }

    onMount(() => {
        initializeRangeValues();
    });

    function handleRangeChange(component: ScenarioComponent, value: number) {
        rangeValues[component.name] = value;
        scenario[component.name] = component.values[value];
    }

    function getLabelPosition(component: ScenarioComponent): string {
        const ref = sliderRefs[component.name];
        const value = rangeValues[component.name] ?? component.values.indexOf(component.default);

        if (!ref) return '0px';

        const percent = (value / (component.values.length - 1));
        const sliderWidth = ref.offsetWidth;

        // Position in pixels, offset a bit to center the label over the thumb
        const thumbX = sliderWidth * percent;
        return `calc(${thumbX}px - 10px)`; // adjust -12px to fine-tune centering
    }

</script>

<section class="mb-6">
    <h3 class="pb-2 font-bold">Scenario</h3>
    {#each scenarioConfig as component}
        <div class="flex flex-col mr-4 mb-2">
            <label for={component.name} class="mb-2 text-xs opacity-100">{component.name}</label>
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
                    class="absolute top-1/2 -translate-y-1/2 w-full accent-blue-500"
                />
                {#if isInitialized}
                    <span class="absolute -top-3 text-xs" style="left: {getLabelPosition(component)}">{component.labels[rangeValues[component.name] ?? component.values.indexOf(component.default)]}</span>
                {/if}
            </div>
        </div>
    {/each}
</section>
