<script lang="ts">
	import "../app.css";
	import { i18n } from '$lib/i18n';
	import { ParaglideJS } from '@inlang/paraglide-sveltekit';
	import { ThemeInit, Toggle, Menu, MenuItem, ThemeSwitch, ButtonGroup, Button } from 'svelte-ux';
	let { children } = $props();
</script>

<ParaglideJS {i18n}>
	<div class="h-screen flex flex-col">
		<!-- Header -->
		<header class="h-16 bg-surface-100 text-surface-content flex items-center px-8 justify-between">
			<!-- Left Section: Logo and Title -->
			<div class="flex items-center space-x-4">
				<a href="/"><img src="/logo.svg" alt="Logo" class="h-8" /></a>
				<a href="/"><span class="text-xl font-bold">Behovskartan 2.0</span></a>
			</div>
		
			<!-- Right Section: Horizontal Menu and ThemeSwitch -->
			<div class="flex items-center space-x-8">
				<nav class="flex space-x-4">
					<Button href="/about" class="font-medium hover:text-primary">Om</Button>
					<Button href="/demandkit" class="font-medium hover:text-primary">DemandKit</Button>
					<Button href="/contact" class="font-medium hover:text-primary">Kontakt</Button>
				</nav>
				<ThemeSwitch />
			</div>
		</header>
		
	
		<!-- Main Content -->
		<main class="flex-grow">
			{@render children()}
		</main>
	</div>
</ParaglideJS>