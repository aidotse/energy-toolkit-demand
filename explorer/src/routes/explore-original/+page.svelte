<script lang="ts">
    import { Map as MapIcon, Notebook as NotebookIcon } from 'lucide-svelte';
    import GeoSelect from '$lib/components/inline/GeoSelect.svelte';
    import SelectText from '$lib/components/inline/SelectText.svelte';
    import Snippet from '$lib/components/inline/Snippet.svelte';
    import Change from '$lib/components/inline/Change.svelte';
    import Map from '$lib/components/map/Map.svelte';
    import AreaChart from '$lib/components/AreaChart.svelte';
    import GeoBarChart from '$lib/components/GeoBarChart.svelte';
    import TimeLine from '$lib/components/TimeLine.svelte';
    import SegmentBars from '$lib/components/SegmentBars.svelte';
    import Histogram from '$lib/components/Histogram.svelte';
    import Explainer from '$lib/components/Explainer.svelte';
    import Section from '$lib/components/Section.svelte';
	import type { PageProps } from './$types';
    import { getGeos } from '$lib/utilities';
    import { scenarioState } from '$lib/stores/scenario.svelte';

    let { data }: PageProps = $props();
    const { config, parameters, globals, geographies, geojson, year, segment, scenario, hourData, dayData, yearData, segmentData, allYearsData }  = data;
    let geography = $state(data.geography); // Make geography reactive since it's bound to components
    let toggleMap = $state(false);
</script>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Toggle button for mobile map/content switch -->
    <div class="fixed top-16 right-4 z-40 lg:hidden">
        <div class="flex gap-2">
            <button
                onclick={() => toggleMap = false}
                class="p-2 rounded-lg {!toggleMap
                    ? 'bg-primary text-white'
                    : 'bg-white dark:bg-gray-800'} shadow-lg"
            >
                <NotebookIcon class="h-6 w-6" />
            </button>
            <button
                onclick={() => toggleMap = true}
                class="p-2 rounded-lg {toggleMap
                    ? 'bg-primary text-white'
                    : 'bg-white dark:bg-gray-800'} shadow-lg"
            >
                <MapIcon class="h-6 w-6" />
            </button>
        </div>
    </div>

    <!-- Main content container -->
    <div class="flex flex-col lg:flex-row">
        <!-- Main content -->
        <main class="flex-1 lg:w-3/5 overflow-y-auto transition-transform lg:transform-none duration-300 {toggleMap ? '-translate-x-full lg:translate-x-0' : 'translate-x-0'}">
            <!-- Single container wrapper for all sections -->
            <div class="max-w-4xl mx-auto px-8 @lg:px-12 @xl:px-16">
                <Section id="section1">
                    <h1 class="text-2xl @lg:text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">Framtidens elbehov</h1>
                    <div class="flex flex-col @2xl:flex-row gap-8">
                        <!-- Text content with prose-like constraints -->
                        <div class="flex-1 max-w-prose">
                            <p class="mb-4 text-sm @lg:text-base leading-relaxed text-gray-700 dark:text-gray-300">
                                Det råder idag en bred konsensus om att vårt elbehov (både effekt och energi) kommer öka markant i framtiden.
                                Det finns dock många sätt att modellera det ökade elbehovet och därför har AI Sweden och Energimyndigheten tillsammans tagit
                                fram det här verktyget för att visualisera och förklara. Analysen som presenteras här är framtagen av AI Sweden som ett exempel.
                            </p>
                            <p class="mb-4 text-sm @lg:text-base leading-relaxed text-gray-700 dark:text-gray-300">
                                Elenergibehovet i <GeoSelect {geographies} bind:geography /> <SelectText items={getGeos((geojson as any)?.features || [])} bind:geography /> väntas i det här scenariot öka med <b><Change {geography} aggregation='sum' {scenario} startYear={(parameters as any)?.years?.[0] || 2025} year={year} {allYearsData} percentage={true} /></b> från år <b><Snippet parameterData={parameters} property="start-year" /></b> till år <b>{year}</b>.
                            </p>
                        </div>
                        <!-- Chart area -->
                        <div class="flex-1 min-h-[300px] flex items-center">
                            <AreaChart
                                {geography}
                                {year}
                                {scenario}
                                scenarios={scenarioState.comparisonScenarios}
                                comparisonMode={scenarioState.comparisonMode}
                                aggregationInit='sum'
                                data={allYearsData}
                            />
                        </div>
                    </div>

                    <!-- Explainer grid -->
                    <div class="grid grid-cols-1 @lg:grid-cols-2 @2xl:grid-cols-3 gap-6 mt-12">
                    <Explainer content="timeframe" />
                    <Explainer content="geography" />
                    <Explainer content="flex" />
                    <Explainer content="population" />
                        <Explainer content="technology" />
                        <Explainer content="transport-electrification" />
                        <Explainer content="industrial-transition" />
                    </div>
                </Section>

                <Section id="section2">
                    <h2 class="text-xl @lg:text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Var behövs elen?</h2>
                    <p class="max-w-prose text-sm @lg:text-base leading-relaxed mb-8 text-gray-700 dark:text-gray-300">
                        Behovet av el är inte jämnt fördelat över hela landet. Storstadsområden och industriella regioner förväntas ha en högre efterfrågan på el på grund av tätare
                        befolkning och högre industriell aktivitet. Samtidigt kan landsbygdsområden se en mer måttlig ökning i elbehov, främst drivet av jordbruk och mindre industrier.
                    </p>
                    <div>
                <!--
                    <GeoBarChart
                        {yearData}
                        parameterData={parameters}
                        {year}
                        {geography}
                        {scenario}
                        scenarios={scenarioState.comparisonScenarios}
                        comparisonMode={scenarioState.comparisonMode}
                    />
                -->
                    </div>
                </Section>

                <Section id="section3">
                    <h2 class="text-xl @lg:text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Vem behöver elen?</h2>
                    <div class="flex flex-col @2xl:flex-row gap-8">
                        <div class="flex-1 max-w-prose">
                            <p class="text-sm @lg:text-base leading-relaxed text-gray-700 dark:text-gray-300">
                                I framtiden förväntas elbehovet förändras markant inom de tre sektorerna hushåll, industri och transport.
                                Hushållen kommer sannolikt att se en måttlig ökning av elanvändningen på grund av elektrifiering av uppvärmning, fler eldrivna apparater och en ökad efterfrågan på bekvämlighetstjänster.
                                Industrin förväntas stå för en av de största ökningarna i elbehov, drivet av elektrifiering av processer som idag använder fossila bränslen, exempelvis inom stål- och kemikalieproduktion.
                                Samtidigt kommer digitalisering och automatisering att kräva mer el, men också möjliggöra energieffektivisering.
                                Transportsektorn kommer att förändras mest dramatiskt, då elektrifieringen av fordon och lastbilar snabbt ökar och ersätter fossila bränslen.
                                Utbyggnaden av laddinfrastruktur och vätgasproduktion för tunga transporter kommer att bidra till ett betydligt högre elbehov, särskilt i takt med att fler länder fasar ut bensin- och dieseldrivna fordon.
                            </p>
                        </div>
                        <div class="flex-1 min-h-[300px]">
                            <SegmentBars
                                yearData={segmentData}
                                {geography}
                                {year}
                                {scenario}
                                scenarios={scenarioState.comparisonScenarios}
                                comparisonMode={scenarioState.comparisonMode}
                            />
                        </div>
                    </div>

                    <!-- Subsections -->
                    <div class="space-y-8 mt-12">
                        <div class="max-w-prose">
                            <h3 class="text-lg @lg:text-xl font-bold mb-3 text-gray-900 dark:text-gray-100">Hushållen och övrig bebyggelse</h3>
                            <p class="text-sm @lg:text-base leading-relaxed text-gray-700 dark:text-gray-300">
                                Hushållen kommer sannolikt att se en måttlig ökning av elanvändningen på grund av elektrifiering av uppvärmning, fler eldrivna apparater och en ökad efterfrågan på bekvämlighetstjänster.
                            </p>
                        </div>
                        <div class="max-w-prose">
                            <h3 class="text-lg @lg:text-xl font-bold mb-3 text-gray-900 dark:text-gray-100">Industribehovet</h3>
                            <p class="text-sm @lg:text-base leading-relaxed text-gray-700 dark:text-gray-300">
                                Industrin förväntas stå för en av de största ökningarna i elbehov, drivet av elektrifiering av processer som idag använder fossila bränslen, exempelvis inom stål- och kemikalieproduktion.
                            </p>
                        </div>
                        <div class="max-w-prose">
                            <h3 class="text-lg @lg:text-xl font-bold mb-3 text-gray-900 dark:text-gray-100">Den elektrifierade transporten</h3>
                            <p class="text-sm @lg:text-base leading-relaxed text-gray-700 dark:text-gray-300">
                                Transportsektorn kommer att förändras mest dramatiskt, då elektrifieringen av fordon och lastbilar snabbt ökar och ersätter fossila bränslen.
                                Utbyggnaden av laddinfrastruktur och vätgasproduktion för tunga transporter kommer att bidra till ett betydligt högre elbehov, särskilt i takt med att fler länder fasar ut bensin- och dieseldrivna fordon.
                            </p>
                        </div>
                    </div>
                </Section>

                <Section id="section4">
                    <h2 class="text-xl @lg:text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Hur snabbt kan det gå?</h2>
                    <div class="flex flex-col @2xl:flex-row gap-8">
                        <div class="flex-1 max-w-prose">
                            <p class="text-sm @lg:text-base leading-relaxed text-gray-700 dark:text-gray-300">
                                Elektrifieringstakten kan påverkas av en rad faktorer: pris, ekonomisk utveckling (både i och utanför Sverige), politiska beslut, teknisk utveckling med mera. I den här modellen
                                har vi valt att...
                            </p>
                        </div>
                        <div class="flex-1 min-h-[300px] flex items-center">
                            <AreaChart
                                {geography}
                                {year}
                                {scenario}
                                scenarios={scenarioState.comparisonScenarios}
                                comparisonMode={scenarioState.comparisonMode}
                                aggregationInit='sum'
                                {allYearsData}
                            />
                        </div>
                    </div>
                </Section>

                <Section id="section5">
                    <h2 class="text-xl @lg:text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Vilken roll kommer flex att spela?</h2>
                    <div class="flex flex-col @2xl:flex-row gap-8">
                        <div class="flex-1 max-w-prose space-y-4">
                            <p class="text-sm @lg:text-base leading-relaxed text-gray-700 dark:text-gray-300">
                                Flexibilitet i efterfrågan av både energi och effekt kommer spela en allt viktigare roll när andelen av variabel elproduktion från
                                sol- och vindkraft ökar.
                            </p>
                            <p class="text-sm @lg:text-base leading-relaxed text-gray-700 dark:text-gray-300">
                                Flex i efterfrågan är komplext och vi vet egentligen ganska lite vilka lösningar som kommer dominera om 10, 20 eller 30 år.
                                Smarta elnät, ökad lagring, flexmarknader och digitala lösningar kommer alla spela en roll. På lokal nivå kan energigemenskaper komma
                                att påverka behovet från näten. Det vore förvånande om inte AI och inlärning spelade en allt viktigare roll, även på konsumentnivå.
                            </p>
                            <p class="text-sm @lg:text-base leading-relaxed text-gray-700 dark:text-gray-300">
                                Vi behandlar därför flex som en övergripande påverkan på...
                            </p>
                        </div>
                        <div class="flex-1 min-h-[300px]">
                            <Histogram
                                {hourData}
                                {geography}
                                resolution='1h'
                                segment={segment}
                                aggregation='mean'
                                {year}
                                {scenario}
                                scenarios={scenarioState.comparisonScenarios}
                                comparisonMode={scenarioState.comparisonMode}
                            />
                        </div>
                    </div>
                </Section>

                <Section id="section6">
                    <h2 class="text-xl @lg:text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Utforska djupare</h2>
                    <div class="flex flex-col @2xl:flex-row gap-8 mb-8">
                        <div class="flex-1 max-w-prose">
                            <p class="text-sm @lg:text-base leading-relaxed text-gray-700 dark:text-gray-300">
                                Det finns många sätt att dyka djupare i modellen. Bakom varje graf och diagram finns tidsserier uppdelade på scenario och sektor, med en upplösning på {config?.resolution || '1h'}.
                                På sidan <a href="/charts" target="_blank" class="text-primary hover:underline">Grafer</a> kan du se fler grafer, sätta parametrar och ladda ner visualiseringar för presentationer. Du kan också ladda ner data
                                från vår API.
                            </p>
                        </div>
                        <div class="flex-1 max-w-prose">
                            <h3 class="text-base @lg:text-lg font-bold mb-2 text-gray-900 dark:text-gray-100">Ladda data från API</h3>
                            <p class="text-sm @lg:text-base leading-relaxed text-gray-700 dark:text-gray-300">
                                Ladda data från API
                            </p>
                        </div>
                    </div>
                    <div class="mt-8">
                        <TimeLine
                            data={dayData}
                            {geography}
                            resolution='1d'
                            segment={segment}
                            aggregation='sum'
                            {year}
                            {scenario}
                            scenarios={scenarioState.comparisonScenarios}
                            comparisonMode={scenarioState.comparisonMode}
                        />
                    </div>
                </Section>
            </div>
        </main>

        <!-- Map -->
        <aside class="lg:w-2/5 lg:sticky lg:top-14 transition-transform lg:transform-none duration-300 {toggleMap ? 'fixed inset-0 z-30 translate-x-0' : 'fixed inset-0 z-30 translate-x-full lg:translate-x-0 lg:relative'}"
        style="height: calc(100vh - 3.5rem);"
        >
            <Map
                geojsonData={geojson}
                {year}
                bind:geography
                {yearData}
                parameterData={parameters}
                {scenario}
                lower_bound={(globals as any)?.lower_bound || 0}
                upper_bound={(globals as any)?.upper_bound || 1000000}
            />
        </aside>
    </div>
</div>
