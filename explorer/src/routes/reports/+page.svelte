<script lang="ts">
	/**
	 * Reports Index Page
	 *
	 * Lists all available deep-dive reports with descriptions and links.
	 */
	import { Activity, SlidersHorizontal, BookOpen } from 'lucide-svelte';
	import PageContainer from '$lib/components/layout/PageContainer.svelte';
</script>

<PageContainer>
	<h1 class="text-3xl font-bold text-gray-900 dark:text-gray-50 mb-3">Fördjupning</h1>
	<p class="text-base text-gray-600 dark:text-gray-400 mb-10 max-w-3xl">
		Detaljerade analyser av Sveriges framtida elbehov. Varje rapport fokuserar på en
		specifik aspekt av prognosen.
	</p>

	<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
		<!-- Effekt -->
		<a
			href="/reports/power"
			class="group block p-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-amber-400 dark:hover:border-amber-600 transition-colors"
		>
			<div class="flex items-center gap-3 mb-3">
				<div class="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
					<Activity class="w-5 h-5 text-amber-600 dark:text-amber-400" />
				</div>
				<h2 class="text-xl font-semibold text-gray-900 dark:text-gray-50 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
					Effekt
				</h2>
			</div>
			<p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
				Analys av effektbehov — när toppar efterfrågan, hur stor är variationen
				över dygnet och året, och vad driver effekttopparna?
			</p>
		</a>

		<!-- Flex -->
		<a
			href="/reports/flex"
			class="group block p-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-green-400 dark:hover:border-green-600 transition-colors"
		>
			<div class="flex items-center gap-3 mb-3">
				<div class="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
					<SlidersHorizontal class="w-5 h-5 text-green-600 dark:text-green-400" />
				</div>
				<h2 class="text-xl font-semibold text-gray-900 dark:text-gray-50 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
					Flexibilitet
				</h2>
			</div>
			<p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
				Vilka segment har flexibel efterfrågan? Hur mycket kan skiftas i tid,
				och vilken potential finns för efterfrågestyrning?
			</p>
		</a>

		<!-- Metodik -->
		<a
			href="/reports/methodology"
			class="group block p-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors"
		>
			<div class="flex items-center gap-3 mb-3">
				<div class="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
					<BookOpen class="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
				</div>
				<h2 class="text-xl font-semibold text-gray-900 dark:text-gray-50 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
					Metodik
				</h2>
			</div>
			<p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
				Hur byggs behovskurvorna för varje segment? Vilka datakällor används,
				vilka antaganden görs, och hur konstrueras profilerna?
			</p>
		</a>
	</div>
</PageContainer>
