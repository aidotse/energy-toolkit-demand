<script lang="ts">
	/**
	 * TopNavigationBar Component
	 *
	 * Persistent top navigation with split 3/5 + 2/5 layout matching page content.
	 * Features glassmorphism effect and responsive behavior.
	 */
	import { Menu, MenuItem } from 'svelte-ux';
	import { Menu as MenuIcon, X, ChevronDown } from 'lucide-svelte';
	import { navigationState } from '$lib/stores/navigation.svelte';
	import ScenarioDropdown from './ScenarioDropdown.svelte';
	import ScenarioBottomSheet from './ScenarioBottomSheet.svelte';
	import MobileMenu from './MobileMenu.svelte';
	import * as m from '$paraglide/messages';
	import { languageTag, availableLanguageTags, setLanguageTag } from '$paraglide/runtime';
	import { page } from '$app/stores';

	type NavLink = { name: string; href: string };
	type NavDropdown = { name: string; children: NavLink[] };
	type NavItem = NavLink | NavDropdown;

	function isDropdown(item: NavItem): item is NavDropdown {
		return 'children' in item;
	}

	const navigation: NavItem[] = [
		{ name: m['explore_page'](), href: '/' },
		{ name: m['graphs_page'](), href: '/charts' },
		{
			name: m['reports_page'](),
			children: [
				{ name: m['report_effekt'](), href: '/reports/power' },
				{ name: m['report_flex'](), href: '/reports/flex' },
				{ name: m['report_metodik'](), href: '/reports/methodology' }
			]
		},
		{ name: m['about_page'](), href: '/about' },
		{ name: m['data_page'](), href: '/data' }
	];

	function isActive(item: NavItem, pathname: string): boolean {
		if (isDropdown(item)) {
			return item.children.some(c => pathname === c.href);
		}
		return item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
	}
</script>

<!-- Desktop Navigation -->
<nav
	class="fixed top-0 left-0 right-0 z-50 h-14 bg-white/95 backdrop-blur-xl border-b border-gray-200/10 shadow-sm hidden lg:flex"
>
	<div class="flex w-full h-full items-center justify-between px-6 lg:px-8">
		<!-- Left: Logo + Brand -->
		<a href="/" class="flex items-center gap-2 hover:opacity-80 transition-opacity">
			<img src="/logo.svg" alt="Logo" class="h-8" />
			<span class="text-lg font-bold">Behovskartan 2</span>
		</a>

		<!-- Center: Navigation Links -->
		<div class="flex items-center gap-10 h-full">
			{#each navigation as item}
				{@const active = isActive(item, $page.url.pathname)}
				{#if isDropdown(item)}
					<div class="nav-dropdown relative h-full flex items-center border-b-[3px] {active ? 'border-chart-600' : 'border-transparent'}">
						<button
							class="flex items-center gap-1 text-base font-medium hover:text-chart-700 transition-colors"
							class:text-chart-700={active}
						>
							{item.name}
							<ChevronDown class="w-4 h-4" />
						</button>
						<div class="nav-dropdown-menu absolute top-full left-0 pt-2 hidden">
							<div class="bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[200px]">
								{#each item.children as child}
									<a
										href={child.href}
										class="block px-4 py-2.5 text-sm hover:bg-gray-100 transition-colors"
										class:font-semibold={$page.url.pathname === child.href}
										class:text-chart-700={$page.url.pathname === child.href}
									>
										{child.name}
									</a>
								{/each}
							</div>
						</div>
					</div>
				{:else}
					<a
						href={item.href}
						class="h-full flex items-center text-base font-medium hover:text-chart-700 transition-colors border-b-[3px] {active ? 'border-chart-600' : 'border-transparent'}"
						class:text-chart-700={active}
					>
						{item.name}
					</a>
				{/if}
			{/each}
		</div>

		<!-- Right: Language -->
		<div class="flex items-center gap-4">
			<!-- Language Selector -->
			<Menu placement="bottom-end">
				<button
					class="text-sm font-medium px-2 py-1 rounded hover:bg-gray-100 transition-colors uppercase"
				>
					{languageTag()}
				</button>
				{#each availableLanguageTags as lang}
					<MenuItem
						on:click={() => setLanguageTag(lang)}
						class={lang === languageTag() ? 'bg-gray-100' : ''}
					>
						<span class="uppercase">{lang}</span>
					</MenuItem>
				{/each}
			</Menu>

		</div>
	</div>

	<!-- Scenario Dropdown (Desktop) -->
	<ScenarioDropdown />

	<!-- Scenario Bottom Sheet (Mobile) -->
	<ScenarioBottomSheet />
</nav>

<!-- Mobile/Tablet Top Bar - transparent overlay -->
<nav
	class="fixed top-0 left-0 right-0 z-50 lg:hidden pointer-events-none"
>
	<div class="flex items-start px-3 pt-3">
		<!-- Hamburger Menu -->
		<button
			onclick={() => navigationState.toggleMobileMenu()}
			class="pointer-events-auto p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-sm"
			aria-label="Toggle menu"
		>
			{#if navigationState.mobileMenuOpen}
				<X class="w-5 h-5" />
			{:else}
				<MenuIcon class="w-5 h-5" />
			{/if}
		</button>
	</div>

	<!-- Scenario Bottom Sheet (Mobile) -->
	<div class="pointer-events-auto">
		<ScenarioBottomSheet />
	</div>
</nav>

<!-- Mobile Menu Drawer -->
<MobileMenu />

<style>
	.nav-dropdown:hover .nav-dropdown-menu {
		display: block;
	}
</style>
