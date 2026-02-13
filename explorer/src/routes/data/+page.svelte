<script lang="ts">
	import { Database, Download, Code, FileJson, Globe, Server, Clock, MapPin, Zap } from 'lucide-svelte';
	import PageContainer from '$lib/components/layout/PageContainer.svelte';
	import ContentCard from '$lib/components/layout/ContentCard.svelte';
</script>

<PageContainer>
	<h1 class="text-3xl font-bold text-gray-900 dark:text-gray-50 mb-3">Data & API</h1>
	<p class="text-base text-gray-600 dark:text-gray-400 mb-8">Tillgang till data och information om hur du anvander vart API</p>

	<!-- Quick access bar + data stats -->
	<div class="flex flex-wrap items-center gap-x-6 gap-y-3 mb-6 text-sm">
		<div class="flex items-center gap-3">
			<span class="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
				<Server class="w-4 h-4" />
				Snabbatkomst:
			</span>
			<a href="http://localhost:4010/scenarios" target="_blank" class="text-primary-600 dark:text-primary-400 hover:underline font-mono">/scenarios</a>
			<a href="http://localhost:4010/geographies" target="_blank" class="text-primary-600 dark:text-primary-400 hover:underline font-mono">/geographies</a>
			<a href="http://localhost:4010/parameters" target="_blank" class="text-primary-600 dark:text-primary-400 hover:underline font-mono">/parameters</a>
			<a href="http://localhost:4010/globals" target="_blank" class="text-primary-600 dark:text-primary-400 hover:underline font-mono">/globals</a>
		</div>
		<span class="hidden sm:inline text-gray-300 dark:text-gray-600">|</span>
		<div class="flex items-center gap-4 text-gray-600 dark:text-gray-400">
			<span class="flex items-center gap-1"><Clock class="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" /> 2025–2050</span>
			<span class="flex items-center gap-1"><MapPin class="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" /> 21 lan + nationellt</span>
			<span class="flex items-center gap-1"><Zap class="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" /> Timupplosning</span>
			<span class="flex items-center gap-1"><FileJson class="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" /> JSON / Parquet / OpenAPI 3.1</span>
		</div>
	</div>

	<!-- Overview Section -->
	<ContentCard title="Om data" class="mb-6">
		{#snippet children()}
			<div class="prose dark:prose-invert max-w-none">
				<p>
					Alla prognoser och scenarier i detta verktyg ar tillgangliga via ett oppet API.
					Data genereras fran historiska tidsserier och parametriserade scenarier som
					modellerar olika utvecklingsbanor for elektrifiering, ekonomisk tillvaxt och
					teknologisk utveckling.
				</p>
				<p>
					API:et ar byggt med OpenAPI 3.1 och anvander DuckDB for snabba fragor mot
					strukturerade Parquet-filer. All data ar tillganglig med olika tidsupplosningar
					(timme, dag, vecka, manad, ar) och kan filtreras pa geografi, segment och scenario.
				</p>
			</div>
		{/snippet}
	</ContentCard>

	<!-- API Endpoints Section -->
	<ContentCard title="API-endpoints" icon={Code} class="mb-6">
		{#snippet children()}

		<!-- Base URL -->
		<div class="mb-6 p-4 bg-gray-100 dark:bg-gray-900 rounded">
			<p class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Base URL:</p>
			<code class="text-sm text-primary-600 dark:text-primary-400 font-mono">
				http://localhost:4010
			</code>
			<p class="text-xs text-gray-500 dark:text-gray-500 mt-2">
				(Produktion: Anvands via denna webbplats)
			</p>
		</div>

		<!-- Static Endpoints -->
		<div class="space-y-4 mb-8">
			<h3 class="text-lg font-semibold text-gray-900 dark:text-white">Statiska endpoints</h3>

			<div class="border border-gray-200 dark:border-gray-700 rounded overflow-hidden">
				<div class="bg-gray-50 dark:bg-gray-900 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
					<code class="text-sm font-mono text-primary-600 dark:text-primary-400">
						GET /scenarios
					</code>
				</div>
				<div class="p-4">
					<p class="text-gray-700 dark:text-gray-300 mb-2">
						Hamtar alla tillgangliga scenarier med metadata och parametrar.
					</p>
					<pre class="text-xs bg-gray-100 dark:bg-gray-950 p-3 rounded overflow-x-auto"><code>{`[
  {
    "id": "base",
    "name": "Basscenario",
    "is_default": true,
    "parameters": { ... }
  }
]`}</code></pre>
				</div>
			</div>

			<div class="border border-gray-200 dark:border-gray-700 rounded overflow-hidden">
				<div class="bg-gray-50 dark:bg-gray-900 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
					<code class="text-sm font-mono text-primary-600 dark:text-primary-400">
						GET /geographies
					</code>
				</div>
				<div class="p-4">
					<p class="text-gray-700 dark:text-gray-300 mb-2">
						Hamtar geografiska omraden med metadata (namn, typ, koordinater).
					</p>
					<pre class="text-xs bg-gray-100 dark:bg-gray-950 p-3 rounded overflow-x-auto"><code>{`[
  {
    "geo_id": "SE01",
    "geo_name": "Stockholm",
    "geo_type": "county"
  }
]`}</code></pre>
				</div>
			</div>

			<div class="border border-gray-200 dark:border-gray-700 rounded overflow-hidden">
				<div class="bg-gray-50 dark:bg-gray-900 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
					<code class="text-sm font-mono text-primary-600 dark:text-primary-400">
						GET /parameters
					</code>
				</div>
				<div class="p-4">
					<p class="text-gray-700 dark:text-gray-300 mb-2">
						Hamtar tillgangliga parameterval (ar, geografier, segment, upplosningar).
					</p>
				</div>
			</div>

			<div class="border border-gray-200 dark:border-gray-700 rounded overflow-hidden">
				<div class="bg-gray-50 dark:bg-gray-900 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
					<code class="text-sm font-mono text-primary-600 dark:text-primary-400">
						GET /globals
					</code>
				</div>
				<div class="p-4">
					<p class="text-gray-700 dark:text-gray-300 mb-2">
						Hamtar globala granser (min/max) for olika aggregeringsniver.
					</p>
				</div>
			</div>
		</div>

		<!-- Dynamic Endpoints -->
		<div class="space-y-4">
			<h3 class="text-lg font-semibold text-gray-900 dark:text-white">Dynamiska endpoints</h3>

			<div class="border border-gray-200 dark:border-gray-700 rounded overflow-hidden">
				<div class="bg-gray-50 dark:bg-gray-900 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
					<code class="text-sm font-mono text-primary-600 dark:text-primary-400">
						GET /demand
					</code>
				</div>
				<div class="p-4">
					<p class="text-gray-700 dark:text-gray-300 mb-3">
						Hamtar energibehovsdata med flexibla filter och aggregeringar.
					</p>

					<div class="space-y-3">
						<div>
							<p class="text-sm font-medium text-gray-900 dark:text-white mb-2">Query parameters:</p>
							<ul class="text-sm space-y-1 text-gray-700 dark:text-gray-300">
								<li><code class="text-xs bg-gray-100 dark:bg-gray-950 px-2 py-1 rounded">start</code> - Startdatum (YYYY eller YYYY-MM-DD)</li>
								<li><code class="text-xs bg-gray-100 dark:bg-gray-950 px-2 py-1 rounded">end</code> - Slutdatum</li>
								<li><code class="text-xs bg-gray-100 dark:bg-gray-950 px-2 py-1 rounded">resolution</code> - Tidsupplosning (1h, 1d, 1w, 1M, 1Y)</li>
								<li><code class="text-xs bg-gray-100 dark:bg-gray-950 px-2 py-1 rounded">aggregation</code> - Aggregeringsmetod (sum, mean, max)</li>
								<li><code class="text-xs bg-gray-100 dark:bg-gray-950 px-2 py-1 rounded">geography</code> - Geografiskt omrade (SE01, total, all)</li>
								<li><code class="text-xs bg-gray-100 dark:bg-gray-950 px-2 py-1 rounded">segment</code> - Sektor (housing, transport, industry, total, all)</li>
								<li><code class="text-xs bg-gray-100 dark:bg-gray-950 px-2 py-1 rounded">scenarioId</code> - Scenario-ID</li>
							</ul>
						</div>

						<div>
							<p class="text-sm font-medium text-gray-900 dark:text-white mb-2">Exempel:</p>
							<pre class="text-xs bg-gray-100 dark:bg-gray-950 p-3 rounded overflow-x-auto"><code>{`GET /demand?start=2030&end=2051&resolution=1Y&aggregation=sum&geography=total&segment=total&scenarioId=base`}</code></pre>
						</div>

						<div>
							<p class="text-sm font-medium text-gray-900 dark:text-white mb-2">Svar:</p>
							<pre class="text-xs bg-gray-100 dark:bg-gray-950 p-3 rounded overflow-x-auto"><code>{`[
  {
    "period": "2030-01-01T00:00:00Z",
    "value": 152340000000,
    "geography": "total",
    "segment": "total"
  },
  ...
]`}</code></pre>
						</div>
					</div>
				</div>
			</div>
		</div>
		{/snippet}
	</ContentCard>

	<!-- Usage Tips -->
	<ContentCard title="Anvandningstips" icon={FileJson} class="mb-6">
		{#snippet children()}

		<div class="space-y-4 text-gray-700 dark:text-gray-300">
			<div class="border-l-4 border-primary-600 dark:border-primary-400 pl-4">
				<h3 class="font-semibold mb-2">Server-side aggregering</h3>
				<p class="text-sm">
					Anvand <code class="text-xs bg-gray-100 dark:bg-gray-950 px-2 py-1 rounded">geography=total</code> och
					<code class="text-xs bg-gray-100 dark:bg-gray-950 px-2 py-1 rounded">segment=total</code> for att fa
					servern att aggregera data at dig. Detta ar mycket snabbare an att hamta all data och aggregera sjalv.
				</p>
			</div>

			<div class="border-l-4 border-primary-600 dark:border-primary-400 pl-4">
				<h3 class="font-semibold mb-2">Upplosning och aggregering</h3>
				<p class="text-sm">
					For arlig data anvand <code class="text-xs bg-gray-100 dark:bg-gray-950 px-2 py-1 rounded">resolution=1Y</code> med
					<code class="text-xs bg-gray-100 dark:bg-gray-950 px-2 py-1 rounded">aggregation=sum</code> for total energi.
					For effekt (power) anvand <code class="text-xs bg-gray-100 dark:bg-gray-950 px-2 py-1 rounded">aggregation=mean</code> eller
					<code class="text-xs bg-gray-100 dark:bg-gray-950 px-2 py-1 rounded">max</code>.
				</p>
			</div>

			<div class="border-l-4 border-primary-600 dark:border-primary-400 pl-4">
				<h3 class="font-semibold mb-2">Prestanda</h3>
				<p class="text-sm">
					API:et anvander pre-aggregerade tabeller for vanliga fragor (arliga totaler, geografiska summor).
					Svarstider ar normalt under 1 sekund. For stora datamangder med hog upplosning, overvag att
					dela upp i mindre fragor.
				</p>
			</div>
		</div>
		{/snippet}
	</ContentCard>

	<!-- OpenAPI Documentation -->
	<ContentCard title="Teknisk dokumentation" icon={Globe} class="mb-6">
		{#snippet children()}

		<div class="prose dark:prose-invert max-w-none">
			<p>
				Full API-dokumentation finns tillganglig i OpenAPI 3.1-format. Specifikationen
				inkluderar detaljerade beskrivningar av alla endpoints, parametrar, svarsformat
				och exempel.
			</p>
			<div class="flex gap-4 mt-4 not-prose">
				<a
					href="https://github.com/yourusername/behovskartan"
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors"
				>
					<Download class="w-4 h-4" />
					<span>OpenAPI Spec (YAML)</span>
				</a>
				<a
					href="https://github.com/yourusername/behovskartan"
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors"
				>
					<Code class="w-4 h-4" />
					<span>GitHub Repository</span>
				</a>
			</div>
		</div>
		{/snippet}
	</ContentCard>

	<!-- Data Format -->
	<ContentCard title="Dataformat">
		{#snippet children()}
			<div class="prose dark:prose-invert max-w-none">
				<p>
					Data lagras i Parquet-format med en nested struktur som separerar basscenarier
					och parametriserade scenarier. Pre-aggregerade tabeller finns for snabbare
					fragor pa nationell, regional och sektorsniva.
				</p>
				<ul>
					<li><strong>Tidsperiod:</strong> 2025-2050</li>
					<li><strong>Tidsupplosning:</strong> Timme (radata), aggregerbar till dag, vecka, manad, ar</li>
					<li><strong>Geografier:</strong> 21 lan plus nationell aggregering</li>
					<li><strong>Segment:</strong> Bostader, transport, industri, ovrigt</li>
					<li><strong>Scenarier:</strong> Basscenario plus parametriserade varianter</li>
				</ul>
			</div>
		{/snippet}
	</ContentCard>
</PageContainer>
