<script lang="ts">
    import { Button } from 'svelte-ux';
    import { AreaChart } from 'layerchart';

    let { geoName, year, demand, sticky, onClose = () => {} } = $props();

</script>

<div>
    {#if sticky}
        <Button class="absolute top-1 right-1" color="danger" size="sm" onclick={onClose}>✕</Button>
    {/if}
    <div class="flex flex-col text-sm">
        <div class="grid grid-cols-2">
            <div class="self-start font-bold whitespace-nowrap">{geoName}</div><div class="place-self-end pr-4"></div>
            <div class="self-start">År</div><div class="place-self-end">{year}</div>
            <div class="self-start">Totalt behov</div><div class="place-self-end">{demand}</div>    
        </div>
    </div>
</div>
