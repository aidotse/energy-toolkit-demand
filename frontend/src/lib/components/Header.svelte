<script lang="ts">
	import { ThemeInit, Toggle, Menu, MenuItem, ThemeSwitch, ButtonGroup, Button } from 'svelte-ux';
</script>

<header class="h-16 flex items-center pl-[20rem] pr-8 justify-between border-b">
    <!-- Left Section: Logo and Title -->
    <div class="flex items-center space-x-4 pl-8">
        <img src="/logo.svg" alt="Logo" class="h-8" />
        <span class="text-xl font-bold">Behovskartan 2.0</span>
    </div>

    <!-- Right Section: Horizontal Menu and ThemeSwitch -->
    <div class="flex items-center space-x-8">
        <nav class="flex space-x-4">
            <Button href="/" class="font-medium hover:text-primary">Vårt elbehov</Button>
            <Button href="/charts" class="font-medium hover:text-primary">Data & grafer</Button>
            <Button href="/about" class="font-medium hover:text-primary">Om projektet</Button>
            <Button href="/demandkit" class="font-medium hover:text-primary">Demand Toolkit</Button>
            <Button href="/contact" class="font-medium hover:text-primary">Kontakt</Button>
        </nav>
        <ThemeSwitch />
    </div>
</header>