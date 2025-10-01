<script lang="ts">
	/**
	 * TopNavigationBar Component
	 *
	 * Persistent top navigation with 3-zone layout (logo, links, utilities).
	 * Features glassmorphism effect and responsive behavior.
	 */
	import { ThemeSwitch, Menu, MenuItem } from 'svelte-ux';
	import { Menu as MenuIcon, X } from 'lucide-svelte';
	import { navigationState } from '$lib/stores/navigation.svelte';
	import ScenarioSelectorPill from './ScenarioSelectorPill.svelte';
	import ScenarioDropdown from './ScenarioDropdown.svelte';
	import ScenarioBottomSheet from './ScenarioBottomSheet.svelte';
	import MobileMenu from './MobileMenu.svelte';
	import * as m from '$paraglide/messages';
	import { languageTag, availableLanguageTags, setLanguageTag } from '$paraglide/runtime';

	// Props
	let {
		currentScenario = 'Default Scenario',
		scenarios = [],
		baseScenarios = [],
		parameters = {}
	}: {
		currentScenario?: string;
		scenarios?: any[];
		baseScenarios?: any[];
		parameters?: any;
	} = $props();

	const navigation = [
		{ name: m['explore_page'](), href: '/' },
		{ name: m['graphs_page'](), href: '/charts' },
		{ name: m['about_page'](), href: '/about' },
		{ name: m['contact_page'](), href: '/contact' }
	];
</script>

<!-- Desktop Navigation -->
<nav
	class="fixed top-0 left-0 right-0 z-50 h-14 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-200/10 shadow-sm hidden lg:grid"
>
	<div class="grid grid-cols-3 items-center px-6 h-full max-w-screen-2xl mx-auto w-full">
		<!-- Left: Logo + Brand -->
		<div class="flex items-center gap-3">
			<a href="/" class="flex items-center gap-2 hover:opacity-80 transition-opacity">
				<img src="/logo.svg" alt="Logo" class="h-8" />
				<span class="text-lg font-bold">Behovskartan 2</span>
			</a>
		</div>

		<!-- Center: Navigation Links -->
		<div class="flex items-center justify-center gap-6">
			{#each navigation as link}
				<a
					href={link.href}
					class="text-sm font-medium hover:text-primary transition-colors"
				>
					{link.name}
				</a>
			{/each}
		</div>

		<!-- Right: Scenario Pill + Utilities -->
		<div class="flex items-center justify-end gap-4">
			<!-- Scenario Selector Pill -->
			<ScenarioSelectorPill {currentScenario} />

			<!-- Language Selector -->
			<Menu placement="bottom-end">
				<button
					slot="trigger"
					class="text-sm font-medium px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors uppercase"
				>
					{languageTag()}
				</button>
				{#each availableLanguageTags as lang}
					<MenuItem
						on:click={() => setLanguageTag(lang)}
						class={lang === languageTag() ? 'bg-gray-100 dark:bg-gray-800' : ''}
					>
						<span class="uppercase">{lang}</span>
					</MenuItem>
				{/each}
			</Menu>

			<!-- Theme Switch -->
			<ThemeSwitch />
		</div>
	</div>

	<!-- Scenario Dropdown (Desktop) -->
	<ScenarioDropdown {scenarios} {baseScenarios} {parameters} />

	<!-- Scenario Bottom Sheet (Mobile) -->
	<ScenarioBottomSheet {scenarios} {baseScenarios} {parameters} />
</nav>

<!-- Mobile/Tablet Top Bar -->
<nav
	class="fixed top-0 left-0 right-0 z-50 h-14 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-200/10 shadow-sm lg:hidden"
>
	<div class="flex items-center justify-between px-4 h-full">
		<!-- Left: Hamburger Menu -->
		<button
			onclick={() => navigationState.toggleMobileMenu()}
			class="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
			aria-label="Toggle menu"
		>
			{#if navigationState.mobileMenuOpen}
				<X class="w-6 h-6" />
			{:else}
				<MenuIcon class="w-6 h-6" />
			{/if}
		</button>

		<!-- Center: Scenario Pill (Mobile) -->
		<ScenarioSelectorPill {currentScenario} />

		<!-- Right: Theme Switch -->
		<div class="flex items-center">
			<ThemeSwitch />
		</div>
	</div>

	<!-- Scenario Bottom Sheet (Mobile) -->
	<ScenarioBottomSheet {scenarios} {baseScenarios} {parameters} />
</nav>

<!-- Mobile Menu Drawer -->
<MobileMenu />
