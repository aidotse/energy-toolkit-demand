<script lang="ts">
	/**
	 * MobileMenu Component
	 *
	 * Slide-out drawer menu for mobile and tablet navigation.
	 * Displays main navigation links with expandable sub-items.
	 */
	import { ChevronDown, MapPin, BarChart3, FileText, Info, Database } from 'lucide-svelte';
	import { navigationState } from '$lib/stores/navigation.svelte';
	import * as m from '$paraglide/messages';
	import { page } from '$app/stores';

	type NavLink = { name: string; href: string; icon: typeof MapPin };
	type NavDropdown = { name: string; icon: typeof MapPin; children: { name: string; href: string }[] };
	type NavItem = NavLink | NavDropdown;

	function isDropdown(item: NavItem): item is NavDropdown {
		return 'children' in item;
	}

	const navigation: NavItem[] = [
		{ name: m['explore_page'](), href: '/', icon: MapPin },
		{ name: m['graphs_page'](), href: '/charts', icon: BarChart3 },
		{
			name: m['reports_page'](),
			icon: FileText,
			children: [
				{ name: m['report_effekt'](), href: '/reports/power' },
				{ name: m['report_flex'](), href: '/reports/flex' },
				{ name: m['report_metodik'](), href: '/reports/methodology' }
			]
		},
		{ name: m['about_page'](), href: '/about', icon: Info },
		{ name: m['data_page'](), href: '/data', icon: Database }
	];

	let reportsExpanded = $state(false);

	function closeMenu() {
		navigationState.toggleMobileMenu();
	}
</script>

{#if navigationState.mobileMenuOpen}
	<!-- Backdrop -->
	<button
		onclick={closeMenu}
		class="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity"
		aria-label="Close menu"
	></button>

	<!-- Drawer -->
	<div
		class="fixed top-0 left-0 h-full w-72 bg-gray-50 z-50 lg:hidden shadow-2xl transform transition-transform duration-300"
	>
		<!-- Header with brand -->
		<div class="flex items-center justify-between px-5 h-14 bg-white border-b border-gray-200">
			<div class="flex items-center gap-2">
				<img src="/logo.svg" alt="Logo" class="h-6" />
				<span class="text-base font-bold text-gray-900">Energy Toolkit</span>
			</div>
			<button
				onclick={closeMenu}
				class="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
				aria-label="Close menu"
			>
				<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		<!-- Navigation Links -->
		<nav class="flex flex-col px-3 py-4 space-y-0.5">
			{#each navigation as item}
				{@const Icon = item.icon}
				{#if isDropdown(item)}
					<!-- Expandable section -->
					<button
						onclick={() => reportsExpanded = !reportsExpanded}
						class="flex items-center justify-between px-3 py-3 rounded-xl text-sm font-medium hover:bg-white transition-colors w-full text-left"
						class:bg-white={$page.url.pathname.startsWith('/reports')}
						class:shadow-sm={$page.url.pathname.startsWith('/reports')}
					>
						<span class="flex items-center gap-3">
							<Icon size={18} class="text-gray-400" />
							{item.name}
						</span>
						<ChevronDown
							class="w-4 h-4 text-gray-400 transition-transform duration-200"
							style={reportsExpanded ? 'transform: rotate(180deg)' : ''}
						/>
					</button>
					{#if reportsExpanded}
						<div class="ml-9 flex flex-col space-y-0.5 pb-1">
							{#each item.children as child}
								<a
									href={child.href}
									onclick={closeMenu}
									class="px-3 py-2 rounded-lg text-sm hover:bg-white transition-colors text-gray-600"
									class:text-gray-900={$page.url.pathname === child.href}
									class:font-semibold={$page.url.pathname === child.href}
								>
									{child.name}
								</a>
							{/each}
						</div>
					{/if}
				{:else}
					<a
						href={item.href}
						onclick={closeMenu}
						class="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium hover:bg-white transition-colors"
						class:bg-white={item.href === '/' ? $page.url.pathname === '/' : $page.url.pathname.startsWith(item.href)}
						class:shadow-sm={item.href === '/' ? $page.url.pathname === '/' : $page.url.pathname.startsWith(item.href)}
					>
						<Icon size={18} class="text-gray-400" />
						{item.name}
					</a>
				{/if}
			{/each}
		</nav>
	</div>
{/if}
