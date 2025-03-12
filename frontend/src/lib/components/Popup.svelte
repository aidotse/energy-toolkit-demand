<script lang="ts">
    import { Button } from 'svelte-ux';
    import { AreaChart } from 'layerchart';

    export let geoName: string;
    // export let geoID: string;
    export let year: number;
    export let demand: string;
    export let sticky: boolean = false;
    export let onClose: () => void = () => {};
</script>

<div>
    {#if sticky}
        <Button class="absolute top-1 right-1" color="danger" size="sm" on:click={onClose}>✕</Button>
    {/if}
    <div class="flex flex-col text-sm">
        <div class="grid grid-cols-2">
            <div class="self-start font-bold">{geoName}</div><div class="place-self-end pr-4"></div>
            <div class="self-start">År</div><div class="place-self-end">{year}</div>
            <div class="self-start">Totalt behov</div><div class="place-self-end">{demand}</div>    
        </div>
    </div>
</div>
