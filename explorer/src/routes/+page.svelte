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
    import SectorArc from '$lib/components/SectorArc.svelte';
    import Histogram from '$lib/components/Histogram.svelte';
    import Explainer from '$lib/components/Explainer.svelte';
    import Section from '$lib/components/Section.svelte';
	import type { PageProps } from './$types';
    import { getGeos } from '$lib/utilities';

    let { data }: PageProps = $props();
    const { config, parameters, globals, geojson, year, segment, scenario, hourData, dayData, yearData, sectorData, allYearsData }  = data;
    let geography = $state(data.geography); // Make geography reactive since it's bound to components
    let toggleMap = $state(false);
</script>

<div class="min-h-screen bg-surface-100">
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
        <main class="flex-1 lg:w-2/3 2xl:w-3/5 overflow-y-auto px-6 md:px-12 max-w-screen-2xl mx-auto transition-transform lg:transform-none duration-300 {toggleMap ? '-translate-x-full lg:translate-x-0' : 'translate-x-0'}">
        <Section id="section1">
            <div class="flex flex-col grow">
                <h1 class="text-3xl font-bold pt-24 pb-4">Framtidens elbehov</h1>
                <div class="flex flex-col lg:flex-row w-full gap-4 mt-6">
                    <div class="w-full lg:w-1/2 max-w-prose">
                        <p class="mb-4">
                            Det råder idag en bred konsensus om att vårt elbehov (både effekt och energi) kommer öka markant i framtiden.
                            Det finns dock många sätt att modellera det ökade elbehovet och därför har AI Sweden och Energimyndigheten tillsammans tagit 
                            fram det här verktyget för att visualisera och förklara. Analysen som presenteras här är framtagen av AI Sweden som ett exempel.
                        </p>
                        <p class="mb-4">
                            Elenergibehovet i <GeoSelect parameterData={parameters} bind:geography /> <SelectText items={getGeos((geojson as any)?.features || [])} bind:geography /> väntas i det här scenariot öka med <b><Change {geography} aggregation='sum' {scenario} startYear={(parameters as any)?.years?.[0] || 2025} year={year} {allYearsData} percentage={true} /></b> från år <b><Snippet parameterData={parameters} property="start-year" /></b> till år <b>{year}</b>.
                        </p>
                    </div>
                    <div class="w-full lg:w-1/2 flex items-center justify-center">
                        <div class="w-full h-[300px]">
                            <AreaChart {geography} {year} {scenario} aggregationInit='sum' {allYearsData} />
                        </div>
                    </div>
                </div>
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full">
                    <Explainer content="timeframe" />
                    <Explainer content="geography" />
                    <Explainer content="flex" />
                    <Explainer content="population" />
                    <Explainer content="technology" />
                    <Explainer content="transport-electrification" />
                    <Explainer content="industrial-transition" />

                </div>            
            </div>
        </Section>
        <Section id="section2">
            <div class="grow flex flex-col">
                <h2 class="text-3xl font-bold pt-24 pb-4">Var behövs elen?</h2>
                <p>
                    Behovet av el är inte jämnt fördelat över hela landet. Storstadsområden och industriella regioner förväntas ha en högre efterfrågan på el på grund av tätare 
                    befolkning och högre industriell aktivitet. Samtidigt kan landsbygdsområden se en mer måttlig ökning i elbehov, främst drivet av jordbruk och mindre industrier.
                </p>
                <div class="w-full px-12 mx-auto">
                    <GeoBarChart {yearData} parameterData={parameters} {year} {geography} {scenario} />
                </div>
            </div>
        </Section>
        <Section id="section3">
            <div class="grow">
                <h2 class="text-3xl font-bold pt-24 pb-4">Vem behöver elen?</h2>
                <div class="flex flex-col lg:flex-row w-full">
                    <div class="flex flex-col w-full lg:w-1/2">
                        <p>
                            I framtiden förväntas elbehovet förändras markant inom de tre sektorerna hushåll, industri och transport. 
                            Hushållen kommer sannolikt att se en måttlig ökning av elanvändningen på grund av elektrifiering av uppvärmning, fler eldrivna apparater och en ökad efterfrågan på bekvämlighetstjänster. 
                            Industrin förväntas stå för en av de största ökningarna i elbehov, drivet av elektrifiering av processer som idag använder fossila bränslen, exempelvis inom stål- och kemikalieproduktion. 
                            Samtidigt kommer digitalisering och automatisering att kräva mer el, men också möjliggöra energieffektivisering. 
                            Transportsektorn kommer att förändras mest dramatiskt, då elektrifieringen av fordon och lastbilar snabbt ökar och ersätter fossila bränslen. 
                            Utbyggnaden av laddinfrastruktur och vätgasproduktion för tunga transporter kommer att bidra till ett betydligt högre elbehov, särskilt i takt med att fler länder fasar ut bensin- och dieseldrivna fordon.
                        </p>
                    </div>
                    <div class="flex flex-col w-full lg:w-1/2">
                        <SectorArc yearData={sectorData} {geography} {year} {scenario} />
                    </div>
                </div>
                <h3 class="text-2xl font-bold pt-20 pb-4">Hushållen och övrig bebyggelse</h3>
                <p>
                    Hushållen kommer sannolikt att se en måttlig ökning av elanvändningen på grund av elektrifiering av uppvärmning, fler eldrivna apparater och en ökad efterfrågan på bekvämlighetstjänster. 
                </p>
                <h3 class="text-2xl font-bold pt-20 pb-4">Industribehovet</h3>
                <p>
                    Industrin förväntas stå för en av de största ökningarna i elbehov, drivet av elektrifiering av processer som idag använder fossila bränslen, exempelvis inom stål- och kemikalieproduktion. 
                </p>
                <h3 class="text-2xl font-bold pt-20 pb-4">Den elektrifierade transporten</h3>
                <p>
                    Transportsektorn kommer att förändras mest dramatiskt, då elektrifieringen av fordon och lastbilar snabbt ökar och ersätter fossila bränslen. 
                    Utbyggnaden av laddinfrastruktur och vätgasproduktion för tunga transporter kommer att bidra till ett betydligt högre elbehov, särskilt i takt med att fler länder fasar ut bensin- och dieseldrivna fordon.
                </p>
            </div>
        </Section>
        <Section id="section4">
            <div class="grow">
                <h2 class="text-3xl font-bold pt-24 pb-4">Hur snabbt kan det gå?</h2>
                <div class="flex flex-row w-full">
                    <div class="flex flex-col lg:flex-row w-full">
                        <div class="w-full lg:w-1/2">
                        <p>
                            Elektrifieringstakten kan påverkas av en rad faktorer: pris, ekonomisk utveckling (både i och utanför Sverige), politiska beslut, teknisk utveckling med mera. I den här modellen
                            har vi valt att...
                        </p>
                        </div>
                        <div class="w-full lg:w-1/2 h-[300px]">
                            <AreaChart {geography} {year} {scenario} aggregationInit='sum' {allYearsData} />
                        </div>
                    </div>
                </div>
            </div>
        </Section>
        <Section id="section5">
            <div class="flex flex-col grow">
                <h2 class="text-3xl font-bold pt-24 pb-4">Vilken roll kommer flex att spela?</h2>
                <div class="flex flex-col lg:flex-row w-full">
                    <div class="w-full lg:w-1/2">
                        <p>
                            Flexibilitet i efterfrågan av både energi och effekt kommer spela en allt viktigare roll när andelen av variabel elproduktion från
                            sol- och vindkraft ökar.
                        </p>
                        <p>
                            Flex i efterfrågan är komplext och vi vet egentligen ganska lite vilka lösningar som kommer dominera om 10, 20 eller 30 år.
                            Smarta elnät, ökad lagring, flexmarknader och digitala lösningar kommer alla spela en roll. På lokal nivå kan energigemenskaper komma
                            att påverka behovet från näten. Det vore förvånande om inte AI och inlärning spelade en allt viktigare roll, även på konsumentnivå.
                        </p>
                        <p>
                            Vi behandlar därför flex som en övergripande påverkan på...
                        </p>
                    </div>
                    <div class="w-full lg:w-1/2">
                        <Histogram {hourData} {geography} resolution='1h' sector={segment} aggregation='mean' {year} {scenario} />
                    </div>
                </div>
            </div>
        </Section>
        <Section id="section6">
            <div class="flex flex-col grow w-full">
                <h2 class="text-3xl font-bold pt-24 pb-4">Utforska djupare</h2>
                <div class="flex flex-col lg:flex-row w-full">
                    <div class="w-full lg:w-1/2">
                        <p>
                            Det finns många sätt att dyka djupare i modellen. Bakom varje graf och diagram finns tidsserier uppdelade på scenario och sektor, med en upplösning på {config?.resolution || '1h'}. 
                            På sidan <a href="/charts" target="_blank">Grafer</a> kan du se fler grafer, sätta parametrar och ladda ner visualiseringar för presentationer. Du kan också ladda ner data
                            från vår API.
                        </p>
                    </div>
                    <div class="w-full lg:w-1/2">
                        <h3 class="font-bold">Ladda data från API</h3>
                        <p>
                            Ladda data från API
                        </p>
                    </div>
                </div>
                <TimeLine {dayData} {geography} resolution='1d' sector={segment} aggregation='sum' {year} {scenario} />
            </div>
        </Section>
        </main>

        <!-- Map -->
        <aside class="lg:w-1/3 2xl:w-2/5 lg:sticky lg:top-14 transition-transform lg:transform-none duration-300 {toggleMap ? 'fixed inset-0 z-30 translate-x-0' : 'fixed inset-0 z-30 translate-x-full lg:translate-x-0 lg:relative'}"
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
