<script lang="ts">
	/**
	 * ReportHeaderNav - Prev/next navigation links at the top of report pages
	 *
	 * Determines previous and next reports from the current URL path.
	 * Navigation is circular (last wraps to first).
	 */
	import { ChevronLeft, ChevronRight } from 'lucide-svelte';
	import { page } from '$app/stores';

	const reports = [
		{ href: '/reports/power', title: 'Effekt och energi' },
		{ href: '/reports/flex', title: 'Flexibilitet' },
		{ href: '/reports/methodology', title: 'Metodik' }
	];

	const currentIndex = $derived(reports.findIndex((r) => r.href === $page.url.pathname));
	const prev = $derived(reports[(currentIndex - 1 + reports.length) % reports.length]);
	const next = $derived(reports[(currentIndex + 1) % reports.length]);
</script>

<nav class="flex items-center justify-between mb-6" aria-label="Navigera mellan fördjupningar">
	<a
		href={prev.href}
		class="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
	>
		<ChevronLeft class="w-4 h-4" />
		<span>Fördjupning: {prev.title}</span>
	</a>
	<a
		href={next.href}
		class="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
	>
		<span>Fördjupning: {next.title}</span>
		<ChevronRight class="w-4 h-4" />
	</a>
</nav>
