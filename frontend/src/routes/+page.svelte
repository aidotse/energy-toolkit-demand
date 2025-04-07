<script lang="ts">
    import GeoSelect from '$lib/components/inline/GeoSelect.svelte';
    import GrowthSelect from '$lib/components/inline/GrowthSelect.svelte';
    import Snippet from '$lib/components/inline/Snippet.svelte';
    import Change from '$lib/components/inline/Change.svelte';
    import GoTo from '$lib/components/GoTo.svelte';
    import Map from '$lib/components/Map.svelte';
    import Sidebar from '$lib/components/Sidebar.svelte';
    import AreaChart from '$lib/components/AreaChart.svelte';
    import GeoBarChart from '$lib/components/GeoBarChart.svelte';
    import TimeLine from '$lib/components/TimeLine.svelte';
    import SectorArc from '$lib/components/SectorArc.svelte';
    import Histogram from '$lib/components/Histogram.svelte';
    import Explainer from '$lib/components/Explainer.svelte';
	import type { PageProps } from './$types';
    import { handleAnchorClick } from '$lib/utilities';

    let { data }: PageProps = $props();
    const { config, scenarios, parameterData, globalsData, geojsonData }  = data;
	let { year, geography, sector, hourData, dayData, yearData, allYearsData } = $state(data);
    let toggleControls = $state(true);
    let scenario = $state(scenarios.find((s: any) => s.default));

    const index = [
        { id: "section1", text: "Framtidens elbehov" },
        { id: "section2", text: "Vem behöver elen?" },
        { id: "section3", text: "Hur snabbt kan det gå?" },
        { id: "section4", text: "Vilken roll kommer flex spela?" },
        { id: "section5", text: "Utforska djupare" }
    ]

</script>

<div class="flex w-full h-[calc(100vh-4rem)] overflow-hidden">
    <Sidebar
        {index}
        {config}
        {scenarios}
        bind:toggleControls
        bind:scenario
        {handleAnchorClick}
    />
    <!-- Left Column -->
    <main class="flex flex-col w-[60%] 2xl:w-[60%] bg-surface-100 text-surface-content max-h-screen overflow-y-scroll scrollbar-none pl-64 pr-16">
        <section id="section1" class="min-h-full flex flex-col pl-24">
            <div class="flex flex-col grow">
                <h1 class="text-3xl font-bold pt-24 pb-4">Framtidens elbehov</h1>
                <div class="flex flex-row w-full gap-4 mt-6">
                    <div class="w-1/2 max-w-prose">
                        <p class="mb-4">
                            Det råder idag en bred konsensus om att vårt elbehov (både effekt och energi) kommer öka markant i framtiden.
                            Det finns dock många sätt att modellera det ökade elbehovet och därför har AI Sweden och Energimyndigheten tillsammans tagit 
                            fram det här verktyget för att visualisera och förklara. Analysen som presenteras här är framtagen av AI Sweden som ett exempel.
                        </p>
                        <p class="mb-4">
                            Elenergibehovet i <GeoSelect {parameterData} bind:geography /> väntas i scenario <GrowthSelect {parameterData} bind:scenario /> öka med <b><Change {geography} aggregation='sum' {scenario} startYear={parameterData['years'][0]} year={year} {allYearsData} percentage={true} /></b> från år <b><Snippet {parameterData} property="start-year" /></b> till år <b>{year}</b>. 
                        </p>
                    </div>
                    <div class="w-1/2 flex items-center justify-center">
                        <div class="w-full h-[300px]">
                            <AreaChart {geography} {year} {scenario} aggregationInit='sum' {allYearsData} />
                        </div>
                    </div>
                </div>
                <div class="grid grid-cols-3 gap-4 w-full">
                    <Explainer content="timeframe" />
                    <Explainer content="geography" />
                    <Explainer content="flex" />
                    <Explainer content="population" />
                    <Explainer content="technology" />
                    <Explainer content="transport-electrification" />
                    <Explainer content="industrial-transition" />

                </div>            
            </div>
            <div class="flex mb-8 justify-center">
                <GoTo anchor="#section2" {handleAnchorClick}/>
            </div>
        </section>
        <section id="section2" class="min-h-full flex flex-col pl-24">
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
            <div class="flex mb-8 justify-center">
                <GoTo anchor="#section3" {handleAnchorClick} />
            </div>
        </section>
        <section id="section3" class="min-h-full flex flex-col pl-24">
            <div class="grow">
                <h2 class="text-3xl font-bold pt-24 pb-4">Vem behöver elen?</h2>
                <div class="flex flex-row w-full">
                    <div class="flex flex-col w-1/2">
                        <p>
                            I framtiden förväntas elbehovet förändras markant inom de tre sektorerna hushåll, industri och transport. 
                            Hushållen kommer sannolikt att se en måttlig ökning av elanvändningen på grund av elektrifiering av uppvärmning, fler eldrivna apparater och en ökad efterfrågan på bekvämlighetstjänster. 
                            Industrin förväntas stå för en av de största ökningarna i elbehov, drivet av elektrifiering av processer som idag använder fossila bränslen, exempelvis inom stål- och kemikalieproduktion. 
                            Samtidigt kommer digitalisering och automatisering att kräva mer el, men också möjliggöra energieffektivisering. 
                            Transportsektorn kommer att förändras mest dramatiskt, då elektrifieringen av fordon och lastbilar snabbt ökar och ersätter fossila bränslen. 
                            Utbyggnaden av laddinfrastruktur och vätgasproduktion för tunga transporter kommer att bidra till ett betydligt högre elbehov, särskilt i takt med att fler länder fasar ut bensin- och dieseldrivna fordon.
                        </p>
                    </div>
                    <div class="flex flex-col w-1/2">
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
            <div class="flex mb-8 justify-center">
                <GoTo anchor="#section4" {handleAnchorClick} />
            </div>
        </section>
        <section id="section4" class="min-h-full flex flex-col pl-24">
            <div class="grow">
                <h2 class="text-3xl font-bold pt-24 pb-4">Hur snabbt kan det gå?</h2>
                <div class="flex flex-row w-full">
                    <div class="flex flex-col w-1/2">
                        <p>

                        </p>
                    </div>
                </div>
            </div>
            <div class="flex mb-8 justify-center">
                <GoTo anchor="#section5" {handleAnchorClick} />
            </div>
        </section>
        <section id="section5" class="min-h-full flex flex-col pl-24">
            <div class="flex flex-col grow">
                <h2 class="text-3xl font-bold pt-24 pb-4">Vilken roll kommer flex att spela?</h2>
                <div class="flex flex-row w-full">
                    <div class="w-1/2">
                        <p>
                            Flexibilitet i efterfrågan av både energi och effekt kommer spela en allt viktigare roll när andelen av variabel elproduktion från
                            sol- och vindkraft ökar.
                        </p>
                    </div>
                    <div class="w-1/2 border-1 rounded-lg">
                        <h2>Hur har vi modellerat flexibilitet?</h2>
                        <p>
                            Flex i efterfrågan är komplext och vi vet egentligen ganska lite vilka lösningar som kommer dominera om 10, 20 eller 30 år.
                            Smarta elnät, ökad lagring, flexmarknader och digitala lösningar kommer alla spela en roll. På lokal nivå kan energigemenskaper komma
                            att påverka behovet från näten. Det vore förvånande om inte AI och inlärning spelade en allt viktigare roll, även på konsumentnivå.
                        </p>
                        <p>
                            Vi behandlar därför flex som en övergripande påverkan på...
                        </p>
                    </div>
                    <div class="w-full">
                        <Histogram {hourData} {geography} resolution='1h' {sector} aggregation='mean' {year} {scenario} />
                    </div>
                </div>
            </div>
            <div class="flex mb-8 justify-center">
                <GoTo anchor="#section6" {handleAnchorClick} />
            </div>
        </section>
        <section id="section6" class="min-h-full flex flex-col pl-24">
            <div class="grow">
                <h2 class="text-3xl font-bold pt-24 pb-4">Utforska djupare</h2>
                <TimeLine {dayData} {geography} resolution='1d' {sector} aggregation='sum' {year} {scenario} />
            </div>
            <div class="flex mb-8 justify-center">
                <GoTo anchor="#section1" {handleAnchorClick} />
            </div>
        </section>
    </main>

    <!-- Right Column -->
    <div class="absolute top-16 left-[60%] 2xl:left-[60%] w-[40%] 2xl:w-[40%] h-[calc(100vh-4rem)] overflow-y-hidden">
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
