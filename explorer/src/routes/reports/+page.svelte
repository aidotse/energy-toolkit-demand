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
	<h1 class="text-3xl font-bold text-gray-900 mb-3">Fördjupning</h1>
	<p class="text-base text-gray-600 mb-10 max-w-3xl">
		Detaljerade analyser av Sveriges framtida elbehov. Varje rapport fokuserar på en
		specifik aspekt av prognosen.
	</p>

	<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
		<!-- Effekt -->
		<a
			href="/reports/power"
			class="group block p-6 rounded-xl border-2 border-gray-200 hover:border-amber-400 transition-colors"
		>
			<div class="flex items-center gap-3 mb-3">
				<div class="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
					<Activity class="w-5 h-5 text-amber-600" />
				</div>
				<h2 class="text-xl font-semibold text-gray-900 group-hover:text-amber-600 transition-colors">
					Effekt
				</h2>
			</div>
			<p class="text-sm text-gray-600 leading-relaxed">
				Analys av effektbehov — när toppar efterfrågan, hur stor är variationen
				över dygnet och året, och vad driver effekttopparna?
			</p>
		</a>

		<!-- Flex -->
		<a
			href="/reports/flex"
			class="group block p-6 rounded-xl border-2 border-gray-200 hover:border-green-400 transition-colors"
		>
			<div class="flex items-center gap-3 mb-3">
				<div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
					<SlidersHorizontal class="w-5 h-5 text-green-600" />
				</div>
				<h2 class="text-xl font-semibold text-gray-900 group-hover:text-green-600 transition-colors">
					Flexibilitet
				</h2>
			</div>
			<p class="text-sm text-gray-600 leading-relaxed">
				Vilka segment har flexibel efterfrågan? Hur mycket kan skiftas i tid,
				och vilken potential finns för efterfrågestyrning?
			</p>
		</a>

		<!-- Metodik -->
		<a
			href="/reports/methodology"
			class="group block p-6 rounded-xl border-2 border-gray-200 hover:border-indigo-400 transition-colors"
		>
			<div class="flex items-center gap-3 mb-3">
				<div class="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
					<BookOpen class="w-5 h-5 text-indigo-600" />
				</div>
				<h2 class="text-xl font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
					Metodik
				</h2>
			</div>
			<p class="text-sm text-gray-600 leading-relaxed">
				Hur byggs behovskurvorna för varje segment? Vilka datakällor används,
				vilka antaganden görs, och hur konstrueras profilerna?
			</p>
		</a>
	</div>
</PageContainer>
