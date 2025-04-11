<script lang="ts">
    import { Button, ThemeSwitch } from 'svelte-ux';
    import * as m from '$paraglide/messages';

    let {toggleControls = $bindable()} = $props();

    function toggleDrawer() {
        toggleControls = !toggleControls;
    }
</script>

<div class="absolute top-6 left-6 z-50 flex flex-row items-center space-x-4 pl-1 pb-4">
    <button class="cursor-pointer" onclick={toggleDrawer}><img src="/logo.svg" alt="Logo" class="h-8" /></button>
    <span class="text-2xl font-bold transition-opacity duration-300 ease-in-out" class:opacity-0={!toggleControls} class:opacity-100={toggleControls}>Behovskartan 2</span>
</div>

<nav class="fixed top-0 left-0 h-full w-72 2xl:w-80 flex flex-col items-start px-5 pt-6 pb-4 bg-slate-100 transition-transform duration-300 ease-in-out z-30 {toggleControls ? 'translate-x-0' : '-translate-x-full'}">
    <div class="flex flex-col gap-0.5 2xl:gap-2 mt-16 mb-4 2xl:mb-8">
        <a href="/" class="hover:text-primary">{m['explore_page']()}</a>
        <slot name="index" />
        <a href="/charts" class="hover:text-primary">{m['graphs_page']()}</a>
        <a href="/about" class="hover:text-primary">{m['about_page']()}</a>
        <a href="/contact" class="hover:text-primary">{m['contact_page']()}</a>
    </div>
    <slot name="scenario" />
    <div class="absolute bottom-5 left-6 w-[85%] flex justify-between">
        <a href="/demandkit" class="text-sm italic hover:text-primary">{m['toolkit_page']()}</a>
        <ThemeSwitch />
    </div>
</nav>