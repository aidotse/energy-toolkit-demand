<script lang="ts">
    import { Map as MapIcon, Notebook as NotebookIcon } from 'lucide-svelte';
    import GeoSelect from '$lib/components/inline/GeoSelect.svelte';
    import SelectText from '$lib/components/inline/SelectText.svelte';
    import GrowthSelect from '$lib/components/inline/GrowthSelect.svelte';
    import Snippet from '$lib/components/inline/Snippet.svelte';
    import Change from '$lib/components/inline/Change.svelte';
    import GoTo from '$lib/components/GoTo.svelte';
    import Map from '$lib/components/map/Map.svelte';
    import Sidebar from '$lib/components/sidebar/Sidebar.svelte';
    import IndexNavigation from '$lib/components/sidebar/IndexNavigation.svelte';
    import Scenario from '$lib/components/sidebar/Scenario.svelte';   
    import AreaChart from '$lib/components/AreaChart.svelte';
    import GeoBarChart from '$lib/components/GeoBarChart.svelte';
    import TimeLine from '$lib/components/TimeLine.svelte';
    import SectorArc from '$lib/components/SectorArc.svelte';
    import Histogram from '$lib/components/Histogram.svelte';
    import Explainer from '$lib/components/Explainer.svelte';
    import Section from '$lib/components/Section.svelte';
	import type { PageProps } from './$types';
    import { handleAnchorClick, getGeos } from '$lib/utilities';
    import { fade, slide } from 'svelte/transition';

    let { data }: PageProps = $props();
    const { config, scenarios, parameters, globals, geojson }  = data;
	let { year, geography, segment, scenario, hourData, dayData, yearData, allYearsData } = $state(data);
    let toggleControls = $state(false);
    let toggleMap = $state(false);

    const index = [
        { id: "section1", text: "Framtidens elbehov" },
        { id: "section2", text: "Vem behöver elen?" },
        { id: "section3", text: "Hur snabbt kan det gå?" },
        { id: "section4", text: "Vilken roll kommer flex spela?" },
        { id: "section5", text: "Utforska djupare" }
    ]

    console.log(parameters, scenarios, scenario)

</script>

<div class="flex w-full h-[calc(100vh)] overflow-hidden">
    <Sidebar bind:toggleControls>
        <svelte:fragment slot="index">
            <IndexNavigation {index} {handleAnchorClick} />
        </svelte:fragment>
        <svelte:fragment slot="scenario">
            <Scenario {parameters} bind:scenario {scenarios} />
        </svelte:fragment>
    </Sidebar>

    <!-- Toggle button for small screens -->
    <div class="absolute top-6 right-8 z-50 md:hidden overflow-hidden w-8">
        <div class="flex transition-transform duration-300 ease-in-out"
            style="transform: translateX({toggleMap ? '-100%' : '0'})"
        >
            <div class="flex-shrink-0">
                <MapIcon class="h-8 w-8" onclick={() => toggleMap = true}/>
            </div>
            <div class="flex-shrink-0">
                <NotebookIcon class="h-8 w-8" onclick={() => toggleMap = false} />
            </div>
        </div>
    </div>

    <!-- Main content -->
    <main class="flex flex-col w-full lg:w-[67%] 2xl:w-[60%] bg-surface-100 text-surface-content max-h-screen overflow-y-scroll scrollbar-none transition-transform lg:transform-none duration-300 ease-in-out {toggleMap ? '-translate-x-full' : 'translate-x-0'} mb-12">
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
                            Elenergibehovet i <GeoSelect {parameterData} bind:geography /> <SelectText items={getGeos(parameterData.geographies)} bind:geography /> väntas i det här scenariot öka med <b><Change {geography} aggregation='sum' {scenario} startYear={parameterData['years'][0]} year={year} {allYearsData} percentage={true} /></b> från år <b><Snippet {parameterData} property="start-year" /></b> till år <b>{year}</b>. 
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
                    <GeoBarChart {yearData} {parameterData} {year} {geography} {scenario} />
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
                        <SectorArc {yearData} {geography} {year} {scenario} />
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
                        <Histogram {hourData} {geography} resolution='1h' {sector} aggregation='mean' {year} {scenario} />
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
                            Det finns många sätt att dyka djupare i modellen. Bakom varje graf och diagram finns tidsserier uppdelade på scenario och sektor, med en upplösning på {config['resolution']}. 
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
                <TimeLine {dayData} {geography} resolution='1d' {sector} aggregation='sum' {year} {scenario} />
            </div>
        </Section>
    </main>

    <!-- Map -->
    <div class="fixed top-0 right-0 w-full lg:absolute lg:top-0 lg:left-[67%] lg:w-[33%] 2xl:left-[60%] 2xl:w-[40%] h-[calc(100vh)] overflow-y-hidden transition-transform lg:transform-none duration-300 ease-in-out {toggleMap ? 'translate-x-0' : 'translate-x-full'}"
    >
        <Map 
            {geojsonData}
            {year}
            bind:geography
            {yearData}
            {parameterData}
            {scenario}
            lower_bound={globalsData['lower_bound']}
            upper_bound={globalsData['upper_bound']} 
        />    
    </div>
</div>
