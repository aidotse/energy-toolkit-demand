<script lang="ts">
    import { ChevronDown, ChevronUp } from 'lucide-svelte';

    let {anchor, handleAnchorClick} = $props();
</script>

{#if anchor === "#section1"}
<a href={anchor} on:click={handleAnchorClick}><ChevronUp size={36} class="animate-bounce" /></a>
{:else}
<a href={anchor} on:click={handleAnchorClick}><ChevronDown size={36} class="animate-bounce" /></a>
{/if}