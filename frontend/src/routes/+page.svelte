<script lang="ts">
    import GeoSelectText from '$lib/components/GeoSelectText.svelte';
    import GoTo from '$lib/components/GoTo.svelte';
    import Mapbox from '$lib/components/MapBox.svelte';
    import Controls from '$lib/components/Controls.svelte';
    import Legend from '$lib/components/Legend.svelte';
    import AreaChart from '$lib/components/AreaChart.svelte';
    import TimeLine from '$lib/components/TimeLine.svelte';
    import SectorArc from '$lib/components/SectorArc.svelte';
    import Histogram from '$lib/components/Histogram.svelte';
    import { fetchTimeseries, fetchYearly, fetchAllYears, calculateSectorData, calculateHistogram } from '$lib/dataService';
	import type { PageProps } from './$types';

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    let { data }: PageProps = $props();
    const { parameterData, globalsData, geojsonData }  = data;
	let { year, geography, growth, resolution, sector, aggregation, timeseriesData, yearlyData, allYearsData, sectorData, histogramData } = $state(data);
    let chartType: 'line' | 'area' | 'bar' = $state('area');
    let toggleControls = $state(true);

    $effect(async () => {
        try {
            timeseriesData = await fetchTimeseries(`${API_BASE_URL}/demand_t?geography=${geography}&resolution=${resolution}&sector=${sector}&aggregation=${aggregation}&year=${year}&growth=${growth}`);
        } catch (error) {
            console.error('Error updating data:', error.message);
        }
    });

    $effect(async () => {
        try {
            yearlyData = await fetchYearly(`${API_BASE_URL}/demand?geography=${'all'}&resolution=1YE&sector=all&aggregation=${'sum'}&year=${year}&growth=${growth}`);
        } catch (error) {
            console.error('Error updating data:', error.message);
        }
    });

    $effect(async () => {
        fetchAllYears(`${API_BASE_URL}/demand?geography=${geography}&resolution=1YE&sector=all&aggregation=${aggregation}&year=all&growth=${growth}`)
        .then(data => { allYearsData = data; })
        .catch(error => console.error('Error fetching all years data:', error.message));
    });

    $effect(async () => {
        const yrlData = await yearlyData;
        sectorData = calculateSectorData(yrlData, geography)
    });
    
    $effect(async () => {
        const tsData = await timeseriesData;
        histogramData = calculateHistogram(tsData, 'total', 50)
    })

    function handleAnchorClick(event) {
		event.preventDefault()
		const link = event.currentTarget
		const anchorId = new URL(link.href).hash.replace('#', '')
		const anchor = document.getElementById(anchorId)
        const marginTop = parseFloat(getComputedStyle(anchor).marginTop);
        const mainElement = document.querySelector("main");
        console.log(marginTop)
		mainElement.scrollTo({
			top: anchor.offsetTop - 35,
			behavior: 'smooth'
		})
	}    

</script>

<div class="flex w-full h-[calc(100vh-4rem)] overflow-hidden">
    <Controls
        {parameterData}
        bind:toggleControls
        bind:year
        bind:growth
        bind:chartType
        bind:geography
        bind:resolution
        bind:aggregation
        {handleAnchorClick}
    />
    <!-- Left Column -->
    <main class="flex flex-col w-[60%] 2xl:w-[60%] bg-surface-100 text-surface-content max-h-screen overflow-y-scroll scrollbar-none pl-64 pr-16">
        <section id="section1" class="min-h-full flex flex-col pl-24">
            <div class="grow">
                <h1 class="text-3xl font-bold pt-24 pb-4">Framtidens elbehov</h1>
                <div class="flex flex-row gap-4 mt-6">
                    <div class="max-w-prose">
                        <p class="mb-4">
                            Det råder idag en bred konsensus om att vårt elbehov (både effekt och energi) kommer öka markant i framtiden.
                            Det finns dock många sätt att modellera det ökade elbehovet och därför har AI Sweden och Energimyndigheten tillsammans tagit 
                            fram det här verktyget för att visualisera och förklara. Analysen som presenteras här är framtagen av AI Sweden som ett exempel.
                        </p>
                        <p class="mb-4">
                            Elenergibehovet i <GeoSelectText {parameterData} bind:geography /> väntas öka med <b>100%</b> från år <b>2025</b> till år <b>2045</b>. 
                        </p>
                    </div>
                    <div class="w-full pl-16 aspect-square">
                        <AreaChart {geography} {growth} aggregationInit={aggregation} {allYearsData} />
                    </div>
                </div>    
            </div>
            <div class="flex mb-8 justify-center">
                <GoTo anchor="#section2" {handleAnchorClick}/>
            </div>
        </section>
        <section id="section2" class="min-h-full flex flex-col pl-24">
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
                        <SectorArc {sectorData} />
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
                <GoTo anchor="#section3" {handleAnchorClick} />
            </div>
        </section>
        <section id="section3" class="min-h-full flex flex-col pl-24">
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
                <GoTo anchor="#section4" {handleAnchorClick} />
            </div>
        </section>
        <section id="section4" class="min-h-full flex flex-col pl-24">
            <div class="grow">
                <h2 class="text-3xl font-bold pt-24 pb-4">Vilken roll kommer flex att spela?</h2>
                <div class="flex flex-row w-full">
                    <div class="w-1/2">
                        <p>
                            Flexibilitet i efterfrågan av både energi och effekt kommer spela en allt viktigare roll när andelen av variabel elproduktion från
                            sol- och vindkraft ökar.
                        </p>
                    </div>
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
            </div>
            <div class="flex mb-8 justify-center">
                <GoTo anchor="#section5" {handleAnchorClick} />
            </div>
        </section>
        <section id="section5" class="min-h-full flex flex-col pl-24">
            <div class="grow">
                <h2 class="text-3xl font-bold pt-24 pb-4">Utforska djupare</h2>
                <TimeLine {resolution} {aggregation} {timeseriesData} bind:chartType />
                <Histogram {histogramData} />
            </div>
            <div class="flex mb-8 justify-center">
                <GoTo anchor="#section1" {handleAnchorClick} />
            </div>
        </section>
    </main>

    <!-- Right Column -->
    <div class="absolute top-16 left-[60%] 2xl:left-[60%] w-[40%] 2xl:w-[40%] h-[calc(100vh-4rem)] overflow-y-hidden">
        <div class="absolute z-10 bottom-10 right-4 legend-overlay">
            <Legend lower_bound={globalsData['lower_bound']} upper_bound={globalsData['upper_bound']} />
        </div>
        <Mapbox 
            {geojsonData}
            {year}
            bind:geography
            {yearlyData}
            lower_bound={globalsData['lower_bound']}
            upper_bound={globalsData['upper_bound']} 
        />
    </div>
</div>
