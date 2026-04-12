<script lang="ts">
	/**
	 * ReportFooterNav - Visual navigation to other reports at the bottom of report pages
	 *
	 * Shows cards for sibling reports (excluding the current one).
	 * Matches the visual style of the reports index page cards.
	 */
	import { Activity, SlidersHorizontal, BookOpen } from 'lucide-svelte';
	import { page } from '$app/stores';

	const reports = [
		{
			href: '/reports/power',
			title: 'Effekt',
			description: 'Analys av effektbehov \u2014 toppar, variation \u00f6ver dygnet och \u00e5ret, och vad driver effekttopparna.',
			icon: Activity,
			color: 'amber'
		},
		{
			href: '/reports/flex',
			title: 'Flexibilitet',
			description: 'Vilka segment har flexibel efterfr\u00e5gan? Hur mycket kan skiftas i tid?',
			icon: SlidersHorizontal,
			color: 'green'
		},
		{
			href: '/reports/methodology',
			title: 'Metodik',
			description: 'Hur byggs behovskurvorna? Datakällor, antaganden och profilkonstruktion.',
			icon: BookOpen,
			color: 'indigo'
		}
	];

	const otherReports = $derived(reports.filter(r => r.href !== $page.url.pathname));
</script>

<div class="mt-16 pt-10 border-t border-gray-200">
	<p class="text-sm font-medium text-gray-500 uppercase tracking-wide mb-5">
		Fler f\u00f6rdjupningar
	</p>

	<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
		{#each otherReports as report}
			{@const colorClasses = ({
				amber: {
					bg: 'bg-amber-100',
					icon: 'text-amber-600',
					border: 'hover:border-amber-400',
					title: 'group-hover:text-amber-600'
				},
				green: {
					bg: 'bg-green-100',
					icon: 'text-green-600',
					border: 'hover:border-green-400',
					title: 'group-hover:text-green-600'
				},
				indigo: {
					bg: 'bg-indigo-100',
					icon: 'text-indigo-600',
					border: 'hover:border-indigo-400',
					title: 'group-hover:text-indigo-600'
				}
			} as Record<string, { bg: string; icon: string; border: string; title: string }>)[report.color]!}
			<a
				href={report.href}
				class="group flex items-start gap-4 p-5 rounded-xl border border-gray-200 {colorClasses.border} transition-colors"
			>
				<div class="w-10 h-10 rounded-full {colorClasses.bg} flex items-center justify-center flex-shrink-0">
					<report.icon class="w-5 h-5 {colorClasses.icon}" />
				</div>
				<div class="min-w-0">
					<h3 class="text-base font-semibold text-gray-900 {colorClasses.title} transition-colors">
						{report.title}
					</h3>
					<p class="text-sm text-gray-500 leading-relaxed mt-1">
						{report.description}
					</p>
				</div>
			</a>
		{/each}
	</div>
</div>
