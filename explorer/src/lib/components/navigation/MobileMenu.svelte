<script lang="ts">
	/**
	 * MobileMenu Component
	 *
	 * Slide-out drawer menu for mobile and tablet navigation.
	 * Displays main navigation links and language selector.
	 */
	import { ThemeSwitch, Menu, MenuItem } from 'svelte-ux';
	import { navigationState } from '$lib/stores/navigation.svelte';
	import * as m from '$paraglide/messages';
	import { languageTag, availableLanguageTags, setLanguageTag } from '$paraglide/runtime';

	const navigation = [
		{ name: m['explore_page'](), href: '/' },
		{ name: m['graphs_page'](), href: '/charts' },
		{ name: m['about_page'](), href: '/about' },
		{ name: m['contact_page'](), href: '/contact' }
	];

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
		class="fixed top-0 left-0 h-full w-72 bg-white dark:bg-gray-900 z-50 lg:hidden shadow-2xl transform transition-transform duration-300"
	>
		<!-- Header -->
		<div class="flex items-center justify-between px-6 h-14 border-b border-gray-200 dark:border-gray-700">
			<span class="text-lg font-bold">Menu</span>
			<button
				onclick={closeMenu}
				class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
				aria-label="Close menu"
			>
				<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		<!-- Navigation Links -->
		<nav class="flex flex-col px-4 py-6 space-y-2">
			{#each navigation as link}
				<a
					href={link.href}
					onclick={closeMenu}
					class="px-4 py-3 rounded-lg text-base font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
				>
					{link.name}
				</a>
			{/each}
		</nav>

		<!-- Bottom Section -->
		<div class="absolute bottom-0 left-0 right-0 px-6 py-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
			<!-- Language Selector -->
			<div class="flex items-center justify-between">
				<span class="text-sm font-medium text-gray-700 dark:text-gray-300">Language</span>
				<Menu placement="top-end">
					<button
						slot="trigger"
						class="text-sm font-medium px-3 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors uppercase"
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
			</div>

			<!-- Theme Toggle -->
			<div class="flex items-center justify-between">
				<span class="text-sm font-medium text-gray-700 dark:text-gray-300">Theme</span>
				<ThemeSwitch />
			</div>
		</div>
	</div>
{/if}
