<script lang="ts">
  import { RangeField } from 'svelte-ux';

  let { component, handleRangeChange } = $props();
</script>

<div class="flex flex-col mr-4 mb-6">
  <label for={component.name} class="text-xs opacity-100">{component.name}</label>
  <RangeField
      min={0}
      max={component.values.length - 1}
      step={1}
      value={rangeValues[component.name] ?? component.values.indexOf(component.default)}
      on:change={(e: CustomEvent<{ value: number }>) => handleRangeChange(component, e.detail.value)}
      format={(i: number) => component.labels[i]}
  />
</div>