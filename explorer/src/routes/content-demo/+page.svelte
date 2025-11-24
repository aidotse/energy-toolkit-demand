<script lang="ts">
	/**
	 * Content System Demonstration Page
	 *
	 * Shows how to use the content management components:
	 * - ContentBlock for markdown rendering
	 * - GlossaryTerm for inline definitions
	 * - MethodologyLink for expandable sections
	 */
	import ContentBlock from '$lib/components/content/ContentBlock.svelte';
	import GlossaryTerm from '$lib/components/content/GlossaryTerm.svelte';
	import MethodologyLink from '$lib/components/content/MethodologyLink.svelte';
	import { loadContent } from '$lib/contentLoader';
	import { onMount } from 'svelte';

	let introContent = $state<any>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	onMount(async () => {
		try {
			const content = await loadContent('sv', 'introduction');
			if (content) {
				introContent = content;
			} else {
				error = 'Kunde inte ladda innehåll';
			}
		} catch (err: any) {
			error = err?.message || 'Ett fel inträffade';
			console.error('Error loading content:', err);
		} finally {
			loading = false;
		}
	});
</script>

<div class="container mx-auto px-4 py-8 max-w-4xl">
	<h1 class="text-4xl font-bold mb-8">Content System Demo</h1>

	<!-- Section 1: ContentBlock with loaded markdown -->
	<section class="mb-12">
		<h2 class="text-2xl font-semibold mb-4">1. ContentBlock Component (Loaded Markdown)</h2>
		{#if loading}
			<p class="text-gray-600">Laddar innehåll...</p>
		{:else if error}
			<p class="text-red-600">{error}</p>
		{:else if introContent}
			<ContentBlock>
				<svelte:component this={introContent.default} />
			</ContentBlock>
		{/if}
	</section>

	<!-- Section 2: GlossaryTerm Component -->
	<section class="mb-12">
		<h2 class="text-2xl font-semibold mb-4">2. GlossaryTerm Component</h2>
		<ContentBlock maxWidth="prose-lg">
			<p>
				I detta verktyg använder vi olika{' '}
				<GlossaryTerm
					term="scenarier"
					definition="Ett scenario är en kombination av parametrar som beskriver en möjlig framtid, t.ex. elektrifieringsgrad och tillväxttakt."
				/>
				{' '}för att visa framtida elbehov. Varje scenario baseras på{' '}
				<GlossaryTerm
					term="historisk data"
					definition="Uppmätt elförbrukning från tidigare år som används som bas för prognoser."
				/>
				{' '}och tillämpar olika{' '}
				<GlossaryTerm
					term="transformationer"
					definition="Matematiska funktioner som modifierar historisk data för att skapa framtidsprognoser, t.ex. tillväxt eller elektrifiering."
				/>.
			</p>
		</ContentBlock>
	</section>

	<!-- Section 3: MethodologyLink Component -->
	<section class="mb-12">
		<h2 class="text-2xl font-semibold mb-4">3. MethodologyLink Component</h2>
		<ContentBlock maxWidth="prose-lg">
			<p>
				Våra prognoser bygger på en väletablerad metodik för energimodellering. Varje scenario
				skapas genom att tillämpa specifika transformationer på historisk data.
			</p>

			<MethodologyLink title="Läs mer om prognosmetodik">
				<p>
					Prognosmetodiken består av tre huvudsteg:
				</p>
				<ol>
					<li>
						<strong>Datainsamling:</strong> Historisk elförbrukning samlas in från olika källor
						och valideras.
					</li>
					<li>
						<strong>Transformation:</strong> Olika parametrar appliceras på historisk data:
						<ul>
							<li>Elektrifieringsgrad för bostäder, transport och industri</li>
							<li>Ekonomisk tillväxttakt</li>
							<li>Effektiviseringstakt</li>
						</ul>
					</li>
					<li>
						<strong>Aggregering:</strong> Resultaten aggregeras till olika geografiska nivåer och
						tidsupplösningar.
					</li>
				</ol>
				<p>
					Alla beräkningar dokumenteras och kan replikeras. Källkoden finns tillgänglig i
					projektets repository.
				</p>
			</MethodologyLink>

			<p class="mt-4">
				Metoden har validerats mot historiska prognoser och visar god överensstämmelse med
				faktisk utveckling.
			</p>
		</ContentBlock>
	</section>

	<!-- Section 4: Combined Usage Example -->
	<section class="mb-12">
		<h2 class="text-2xl font-semibold mb-4">4. Combined Example</h2>
		<ContentBlock maxWidth="prose-lg">
			<h3>Scenario-baserad prognosmodellering</h3>
			<p>
				I vårt system definierar vi{' '}
				<GlossaryTerm
					term="parametriska scenarier"
					definition="Scenarier där varje parameter kan varieras oberoende för att utforska olika framtidsalternativ."
				/>
				{' '}som kombinationer av flera dimensioner. Detta möjliggör systematisk utforskning av
				framtidsalternativ.
			</p>

			<MethodologyLink title="Teknisk specifikation: Scenario-parametrar">
				<p>
					Ett scenario definieras av följande parametrar:
				</p>
				<ul>
					<li><code>housing_electrification</code>: 0-5 (elektrifieringsgrad bostäder)</li>
					<li><code>transport_electrification</code>: 0-5 (elektrifieringsgrad transport)</li>
					<li><code>industry_transition</code>: 0-5 (industriell omställning)</li>
				</ul>
				<p>
					Varje parameter påverkar efterfrågan på olika sätt. Elektrifiering ökar elbehovet
					medan effektiviseringsåtgärder minskar det. Nettoeffekten beräknas genom att
					tillämpa alla transformationer sekventiellt.
				</p>
			</MethodologyLink>

			<p>
				Genom att använda{' '}
				<GlossaryTerm
					term="pre-beräknade aggregeringar"
					definition="Data som är beräknad i förväg för snabba visualiseringar, t.ex. årssummor per geografi."
				/>
				{' '}kan vi visa interaktiva visualiseringar i realtid.
			</p>
		</ContentBlock>
	</section>

	<!-- Usage instructions -->
	<section class="mb-12 bg-gray-100 dark:bg-gray-800 p-6 rounded-lg">
		<h2 class="text-2xl font-semibold mb-4">How to Use This System</h2>
		<div class="space-y-4 text-sm">
			<div>
				<h3 class="font-semibold mb-2">1. Create Markdown Content</h3>
				<p>Place markdown files in <code class="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">src/content/sv/</code> or <code class="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">src/content/en/</code></p>
			</div>

			<div>
				<h3 class="font-semibold mb-2">2. Load Content</h3>
				<pre class="bg-gray-200 dark:bg-gray-700 p-3 rounded overflow-x-auto"><code>import &#123; loadContent &#125; from '$lib/contentLoader';

const content = await loadContent('sv', 'introduction');</code></pre>
			</div>

			<div>
				<h3 class="font-semibold mb-2">3. Render with ContentBlock</h3>
				<pre class="bg-gray-200 dark:bg-gray-700 p-3 rounded overflow-x-auto"><code>&lt;ContentBlock&gt;
  &lt;svelte:component this=&#123;content.default&#125; /&gt;
&lt;/ContentBlock&gt;</code></pre>
			</div>

			<div>
				<h3 class="font-semibold mb-2">4. Add Inline Definitions</h3>
				<pre class="bg-gray-200 dark:bg-gray-700 p-3 rounded overflow-x-auto"><code>&lt;GlossaryTerm
  term="scenario"
  definition="A combination of parameters..."
/&gt;</code></pre>
			</div>

			<div>
				<h3 class="font-semibold mb-2">5. Add Expandable Sections</h3>
				<pre class="bg-gray-200 dark:bg-gray-700 p-3 rounded overflow-x-auto"><code>&lt;MethodologyLink title="Learn more"&gt;
  &#123;#snippet children()&#125;
    &lt;p&gt;Detailed explanation...&lt;/p&gt;
  &#123;/snippet&#125;
&lt;/MethodologyLink&gt;</code></pre>
			</div>
		</div>
	</section>
</div>

<style>
	code {
		@apply font-mono text-sm;
	}
</style>
