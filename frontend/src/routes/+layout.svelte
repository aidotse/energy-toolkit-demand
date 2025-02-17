<script lang="ts">
	import "../app.css";
	import Header from '$lib/components/Header.svelte';
	import { i18n } from '$lib/i18n';
	import { ParaglideJS } from '@inlang/paraglide-sveltekit';
	import { ThemeInit, Toggle, Menu, MenuItem, ThemeSwitch, ButtonGroup, Button } from 'svelte-ux';
	let { children } = $props();
</script>

<ParaglideJS {i18n}>
	<div class="flex-1 h-full overflow-hidden">
		<Header />
		<!-- Main Content -->
		<div class="flex-grow">
			{@render children()}
		</div>
	</div>
</ParaglideJS>