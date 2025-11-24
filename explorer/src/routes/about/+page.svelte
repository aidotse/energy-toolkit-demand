<script lang="ts">
	import * as m from '$paraglide/messages';
	import SplitPageContainer from '$lib/components/layout/SplitPageContainer.svelte';
	import ContentCard from '$lib/components/layout/ContentCard.svelte';
	import { Info, Database, Code, Target, Users, BookOpen, Lightbulb, ExternalLink } from 'lucide-svelte';
</script>

<SplitPageContainer>
	{#snippet children()}
		<!-- Hero Section -->
		<div class="bg-gradient-to-br from-primary-600 to-primary-800 dark:from-primary-800 dark:to-primary-950 text-white rounded shadow-sm p-8 sm:p-10 mb-6">
			<h1 class="text-4xl md:text-5xl font-bold mb-4">
				{m['about_page']()}
			</h1>
			<p class="text-xl md:text-2xl text-primary-100 dark:text-primary-200">
				Ett verktyg for att utforska och visualisera Sveriges framtida elbehov
			</p>
		</div>

		<!-- Project Overview -->
		<ContentCard title="Om projektet" icon={Target} class="mb-6">
			{#snippet children()}
				<div class="prose dark:prose-invert max-w-none">
					<p class="text-gray-700 dark:text-gray-300 mb-4">
						Energy Toolkit: Demand ar ett interaktivt verktyg for att utforska och visualisera
						prognoser for Sveriges framtida elbehov. Projektet kombinerar historisk data,
						elektrifieringsscenarier och avancerad visualisering for att ge insikter om hur
						elefterfragan kan utvecklas fram till 2050.
					</p>
					<p class="text-gray-700 dark:text-gray-300">
						Verktyget riktar sig till beslutsfattare, energianalytiker, forskare och alla som ar
						intresserade av Sveriges energiomstallning. Genom att visualisera olika scenarier kan
						anvandare forsta osakerheten i prognoserna och hur olika antaganden paverkar
						resultatet.
					</p>
				</div>
			{/snippet}
		</ContentCard>

		<!-- Methodology -->
		<ContentCard title="Metodik" icon={Database} class="mb-6">
			{#snippet children()}
				<div class="prose dark:prose-invert max-w-none">
					<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
						Datakallor
					</h3>
					<p class="text-gray-700 dark:text-gray-300 mb-4">
						Prognoserna bygger pa historisk data fran SCB, Energimyndigheten och Svenska
						Kraftnat. Tidsserier for elforbrukning kombineras med demografiska prognoser,
						ekonomiska indikatorer och teknologiska utvecklingstrender.
					</p>

					<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
						Scenariobyggnad
					</h3>
					<p class="text-gray-700 dark:text-gray-300 mb-4">
						Varje scenario representerar ett mojligt utvecklingsforlopp med olika antaganden om:
					</p>
					<ul class="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 mb-4">
						<li>Elektrifieringstakt for transporter (personbilar, lastbilar, bussar)</li>
						<li>Industriell omstallning och processelektrifiering</li>
						<li>Befolkningsutveckling och urbanisering</li>
						<li>Energieffektiviseringstakt i byggnader</li>
						<li>Ekonomisk tillvaxt och produktionsutveckling</li>
					</ul>

					<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
						Tidsupplosning
					</h3>
					<p class="text-gray-700 dark:text-gray-300">
						Prognoserna genereras med timupplosning for att fanga variationer i effektbehov over
						dygnet och aret. Detta ar kritiskt for att forsta dimensioneringsbehov for elnatet
						och flexibilitetsresurser.
					</p>
				</div>
			{/snippet}
		</ContentCard>

		<!-- Technical Implementation -->
		<ContentCard title="Teknisk implementation" icon={Code} class="mb-6">
			{#snippet children()}
				<div class="prose dark:prose-invert max-w-none">
					<p class="text-gray-700 dark:text-gray-300 mb-4">
						Projektet ar byggt som en modern webbapplikation med fokus pa prestanda,
						tillganglighet och anvandarvanlighet:
					</p>

					<div class="grid md:grid-cols-2 gap-6">
						<div>
							<h4 class="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
								Frontend
							</h4>
							<ul class="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
								<li>SvelteKit 5 med TypeScript</li>
								<li>LayerChart for visualiseringar</li>
								<li>Tailwind CSS for styling</li>
								<li>Server-side rendering (SSR)</li>
							</ul>
						</div>

						<div>
							<h4 class="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
								Backend & Data
							</h4>
							<ul class="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
								<li>OpenAPI 3.1 REST API</li>
								<li>DuckDB for datalagring</li>
								<li>Python for datagenerering</li>
								<li>Statiska endpoints for prestanda</li>
							</ul>
						</div>
					</div>

					<p class="text-gray-700 dark:text-gray-300 mt-4">
						All kod ar oppen kallkod och tillganglig pa GitHub. Projektet ar strukturerat som en
						monorepo med tydlig separation mellan datagenerering, API och frontend.
					</p>
				</div>
			{/snippet}
		</ContentCard>

		<!-- Attribution & Contact -->
		<ContentCard title="Upphovsratt och kontakt" icon={Users}>
			{#snippet children()}
				<div class="prose dark:prose-invert max-w-none">
					<p class="text-gray-700 dark:text-gray-300 mb-4">
						Detta verktyg utvecklas som ett oppet projekt for att gora energiprognoser mer
						tillgangliga och anvandbara. Projektet ar licensierat under MIT-licensen.
					</p>

					<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
						Att citera verktyget
					</h3>
					<p class="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-4 rounded border border-gray-200 dark:border-gray-700 font-mono">
						Energy Toolkit: Demand (2025). Interaktivt visualiseringsverktyg for Sveriges
						elbehov. https://github.com/yourusername/behovskartan
					</p>

					<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 mt-6">
						Begransningar
					</h3>
					<p class="text-gray-700 dark:text-gray-300 mb-2">
						Prognoserna i detta verktyg ar modellbaserade och innehaller betydande osakerheter.
						De ska anvandas som underlag for diskussion och analys, inte som exakta
						forutsagelser. Anvandare uppmuntras att:
					</p>
					<ul class="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
						<li>Jamfora flera scenarier for att forsta osakerhetsintervallet</li>
						<li>Forsta de antaganden som ligger till grund for varje scenario</li>
						<li>Komplettera med andra analyser och expertbedomningar</li>
					</ul>
				</div>
			{/snippet}
		</ContentCard>
	{/snippet}

	{#snippet rightPanel()}
		<!-- Contextual panel for About page -->
		<div class="h-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 p-6 overflow-y-auto">
			<div class="max-w-xs space-y-6">
				<!-- Quick Links -->
				<div class="bg-white dark:bg-gray-800 rounded shadow-sm p-4">
					<h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
						<BookOpen class="w-4 h-4" />
						Snabblankar
					</h3>
					<nav class="space-y-2">
						<a href="/charts" class="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:underline">
							<ExternalLink class="w-3 h-3" />
							Utforska grafer
						</a>
						<a href="/data" class="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:underline">
							<ExternalLink class="w-3 h-3" />
							Ladda ner data
						</a>
						<a href="/reports/scenario-analysis" class="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:underline">
							<ExternalLink class="w-3 h-3" />
							Scenarioanalys
						</a>
					</nav>
				</div>

				<!-- Key Facts -->
				<div class="bg-white dark:bg-gray-800 rounded shadow-sm p-4">
					<h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
						<Lightbulb class="w-4 h-4" />
						Nyckelfakta
					</h3>
					<ul class="space-y-3 text-sm text-gray-600 dark:text-gray-400">
						<li class="flex items-start gap-2">
							<span class="text-primary-600 dark:text-primary-400 font-bold">2025-2050</span>
							<span>Prognosperiod</span>
						</li>
						<li class="flex items-start gap-2">
							<span class="text-primary-600 dark:text-primary-400 font-bold">Timdata</span>
							<span>Tidsupplosning</span>
						</li>
						<li class="flex items-start gap-2">
							<span class="text-primary-600 dark:text-primary-400 font-bold">290</span>
							<span>Kommuner</span>
						</li>
						<li class="flex items-start gap-2">
							<span class="text-primary-600 dark:text-primary-400 font-bold">5+</span>
							<span>Scenarier</span>
						</li>
					</ul>
				</div>

				<!-- Version Info -->
				<div class="bg-white dark:bg-gray-800 rounded shadow-sm p-4">
					<h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
						<Info class="w-4 h-4" />
						Version
					</h3>
					<p class="text-sm text-gray-600 dark:text-gray-400">
						Behovskartan 2.0
					</p>
					<p class="text-xs text-gray-500 dark:text-gray-500 mt-1">
						MIT License
					</p>
				</div>
			</div>
		</div>
	{/snippet}
</SplitPageContainer>
