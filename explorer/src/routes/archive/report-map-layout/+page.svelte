<script lang="ts">
	/**
	 * Report Page with Fixed Map Layout
	 *
	 * Two-column layout:
	 * - Left: Scrollable narrative content with charts
	 * - Right: Fixed map that stays visible while scrolling
	 */
	import { Zap, TrendingUp, Activity, Database } from 'lucide-svelte';
	import MetricCard from '$lib/components/report/MetricCard.svelte';
	import HighlightCard from '$lib/components/report/HighlightCard.svelte';
	import InsightBox from '$lib/components/report/InsightBox.svelte';
	import AreaChart from '$lib/components/AreaChart.svelte';
	import TimeLine from '$lib/components/TimeLine.svelte';
	import Histogram from '$lib/components/Histogram.svelte';
	import SegmentBars from '$lib/components/SegmentBars.svelte';
	import Map from '$lib/components/map/Map.svelte';
	import type { PageData } from './$types';

	// Get data from loader
	let { data }: { data: PageData } = $props();

	// Extract key values for display
	let geography = $state(data.geography);
	let year = $state(data.year);
	let scenarioId = $state(data.scenarioId);

	// Format numbers for display
	// API returns values in MWh, so we divide by 1 million to get TWh
	function formatEnergy(value: number): string {
		return `${Math.round(value / 1_000_000)} TWh`;
	}

	// API returns power values in MW, so we divide by 1000 to get GW
	function formatPower(value: number): string {
		return `${Math.round(value / 1_000)} GW`;
	}
</script>

<div class="report-map-layout min-h-screen bg-gray-50">
	<!-- Hero Section (Full Width) -->
	<div
		class="hero-section bg-gradient-to-br from-primary-600 to-primary-800 text-white py-12 md:py-16"
	>
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<h1 class="text-3xl md:text-4xl lg:text-5xl font-bold mb-3">
				Sveriges framtida elbehov
			</h1>
			<p class="text-lg md:text-xl text-primary-100">
				Prognoser och scenarier 2025–2050
			</p>
		</div>
	</div>

	<!-- Two Column Layout -->
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
			<!-- Left Column: Scrollable Content (2/3 width) -->
			<div class="lg:col-span-2 space-y-12">
				<!-- Executive Summary -->
				<section>
					<div class="mb-6 max-w-3xl">
						<p class="text-base leading-relaxed text-gray-700">
							Det råder idag en bred konsensus om att vårt elbehov kommer öka markant i
							framtiden. Detta verktyg visualiserar och förklarar olika scenarier för Sveriges
							framtida elbehov baserat på historisk data och antaganden om elektrifiering,
							ekonomisk tillväxt och teknologisk utveckling.
						</p>
					</div>

					<!-- Key Metrics Grid -->
					<div class="grid grid-cols-2 gap-4 mb-6">
						<MetricCard
							value={formatEnergy(data.totalEnergy2050)}
							label="Total energi"
							sublabel="År 2050"
							icon={Zap}
							trend="up"
							trendLabel={`+${Math.round(data.growthRate)}% sedan 2025`}
						/>
						<MetricCard
							value={`+${Math.round(data.growthRate)}%`}
							label="Tillväxt"
							sublabel="Jämfört med 2025"
							icon={TrendingUp}
							trend="up"
							trendLabel="Elektrifiering driver"
						/>
						<MetricCard
							value={formatPower(data.peakPower)}
							label="Maxeffekt"
							sublabel={`År ${year}`}
							icon={Activity}
							trend="up"
							trendLabel="Baserat på timdata"
						/>
						<MetricCard
							value={data.scenarioCount}
							label="Scenarier"
							sublabel="Tillgängliga"
							icon={Database}
						/>
					</div>

					<!-- Project Background -->
					<HighlightCard
						title="Om detta verktyg"
						variant="primary"
						linkHref="/about"
						linkText="Läs mer"
					>
						{#snippet children()}
							<p>
								Detta verktyg visualiserar framtidsprognoser för Sveriges elbehov baserat på
								olika scenarier. Prognoserna bygger på historisk data och olika antaganden om
								elektrifiering, ekonomisk tillväxt och teknologisk utveckling.
							</p>
						{/snippet}
					</HighlightCard>
				</section>

				<!-- Time Evolution -->
				<section id="time-evolution">
					<h2 class="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
						Hur utvecklas elbehovet över tid?
					</h2>
					<p class="text-base text-gray-600 mb-6 max-w-3xl">
						Historisk trend och framtidsprojektioner visar en tydlig ökning driven av
						elektrifiering av transporter och industri.
					</p>

					<div class="space-y-8">
						<!-- AreaChart -->
						<div class="space-y-4 pb-6">
							<div class="h-[380px]">
								<AreaChart
									data={data.timeSeriesData}
									geography={geography}
									year={year}
									scenario={scenarioId}
									aggregationInit="sum"
									class="h-full"
								/>
							</div>
							<p class="text-sm text-gray-600 max-w-3xl">
								<strong>Figur 1:</strong> Årligt elbehov för Sverige 2025–2050. Kurvan visar en
								tydlig uppåtgående trend med en acceleration efter 2030.
							</p>
						</div>

						<!-- TimeLine -->
						<div class="space-y-4 pb-6">
							<div class="h-[280px]">
								<TimeLine
									data={data.dailyData}
									geography={geography}
									year={year}
									scenario={scenarioId}
									resolution="1d"
									aggregation="sum"
									class="h-full"
								/>
							</div>
							<p class="text-sm text-gray-600 max-w-3xl">
								<strong>Figur 2:</strong> Dagligt mönster för ett typiskt år visar variationer i
								elbehov över dygnet och mellan säsonger.
							</p>
						</div>

						<!-- Insight -->
						<InsightBox title="Nyckelinsikt: Elektrifiering driver tillväxten">
							{#snippet children()}
								<p>
									Den största ökningen av elbehov kommer från <strong
										>elektrifiering av transporter</strong
									>
									(personbilar och tung trafik) samt
									<strong>industriell omställning</strong> mot fossilfria processer. Detta sker främst
									efter 2030.
								</p>
							{/snippet}
						</InsightBox>
					</div>
				</section>

				<!-- Segmental Drivers -->
				<section id="segmental-drivers">
					<h2 class="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
						Vad driver förändringen?
					</h2>
					<p class="text-base text-gray-600 mb-6 max-w-3xl">
						Olika sektorer bidrar olika mycket till den ökade elefterfrågan.
					</p>

					<div class="space-y-6">
						<!-- Text content -->
						<div class="space-y-3">
							<p class="text-gray-700 leading-relaxed">
								Elektrifieringen av Sverige sker i olika takt inom olika sektorer. <strong
									>Bostäder och service</strong
								>
								utgör basen för elförbrukningen, men det är
								<strong>transport</strong> och <strong>industri</strong> som driver de största förändringarna
								framåt.
							</p>
							<p class="text-gray-700 leading-relaxed">
								Transport elektrifieras snabbast, med elbilar som blir dominant efter 2035. Industrin
								omställer gradvis till elektrifierade processer, särskilt stålproduktion och
								petrokemi.
							</p>
						</div>

						<!-- segmentBars Chart -->
						<div class="space-y-4 pb-6">
							<div class="h-[380px]">
								<SegmentBars
									data={data.segmentData}
									geography={geography}
									year={year}
									scenario={scenarioId}
									class="h-full"
								/>
							</div>
							<p class="text-sm text-gray-600">
								<strong>Figur 3:</strong> Sektorsfördelning av elbehov år {year}.
							</p>
						</div>

						<!-- Insight -->
						<InsightBox variant="info" title="Sektorsfördelning 2050">
							{#snippet children()}
								<ul class="space-y-1">
									<li><strong>Bostäder & Service:</strong> 40% av total energi</li>
									<li><strong>Transport:</strong> 30% (upp från 2% idag)</li>
									<li><strong>Industri:</strong> 25% (inkl. ny fossilfri produktion)</li>
									<li><strong>Övrigt:</strong> 5%</li>
								</ul>
							{/snippet}
						</InsightBox>
					</div>
				</section>

				<!-- Flexibility & Power -->
				<section id="flexibility">
					<h2 class="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
						När behövs elen?
					</h2>
					<p class="text-base text-gray-600 mb-6 max-w-3xl">
						Effektbehov varierar kraftigt över dygnet och året, vilket kräver flexibilitet i
						elsystemet.
					</p>

					<div class="space-y-8">
						<!-- Histogram -->
						<div class="space-y-4 pb-6">
							<div class="h-[330px]">
								<Histogram
									data={data.hourlyData}
									geography={geography}
									year={year}
									scenario={scenarioId}
									segment="total"
									class="h-full"
								/>
							</div>
							<p class="text-sm text-gray-600">
								<strong>Figur 4:</strong> Fördelning av timeffekt under året. Visar hur ofta olika
								effektnivåer förekommer.
							</p>
						</div>

						<!-- Insight -->
						<InsightBox variant="warning" title="Flexibilitetsbehov växer">
							{#snippet children()}
								<p>
									Skillnaden mellan lågast och högst effekt ökar från dagens 25 GW till över 40 GW
									år 2050. Detta kräver:<br />
								</p>
								<ul class="mt-2 space-y-1">
									<li>• Flexibel produktion (vattenkraft, batterier)</li>
									<li>• Efterfrågestyrning (smart laddning av elbilar)</li>
									<li>• Förstärkt överföringskapacitet</li>
								</ul>
							{/snippet}
						</InsightBox>
					</div>
				</section>

				<!-- Conclusions -->
				<section id="conclusions">
					<h2 class="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
						Vad betyder detta?
					</h2>
					<p class="text-base text-gray-600 mb-6 max-w-3xl">
						Sammanfattning och implikationer för Sveriges elsystem
					</p>

					<div class="space-y-6">
						<InsightBox title="Sammanfattning: Fyra nyckelinsikter">
							{#snippet children()}
								<ol class="space-y-3">
									<li>
										<strong>1. Kraftig ökning:</strong> Elbehov ökar med {Math.round(
											data.growthRate
										)}% till 2050, från {formatEnergy(data.totalEnergy2025)} till {formatEnergy(
											data.totalEnergy2050
										)}.
									</li>
									<li>
										<strong>2. Elektrifiering driver:</strong> Transport och industri står för majoriteten
										av ökningen.
									</li>
									<li>
										<strong>3. Regional koncentration:</strong> Storstäder och industriregioner växer
										snabbast.
									</li>
									<li>
										<strong>4. Flexibilitet krävs:</strong> Effektsvängningar ökar från 25 GW till
										över 40 GW.
									</li>
								</ol>
							{/snippet}
						</InsightBox>

						<div class="prose prose-lg max-w-3xl text-gray-700">
							<h3 class="text-xl font-semibold text-gray-900 mb-2">
								Implikationer för elnätet
							</h3>
							<p>
								Denna utveckling innebär stora investeringsbehov i både produktionskapacitet och
								överföringsnät. Särskilt viktigt är att bygga ut flexibla resurser som kan hantera
								de stora variationerna i effektbehov.
							</p>

							<h3 class="text-xl font-semibold text-gray-900 mb-2 mt-6">
								Nästa steg
							</h3>
							<p>
								Utforska olika scenarier i verktyget för att se hur olika antaganden påverkar
								resultaten. Jämför scenarier för att förstå osäkerhetsspannet.
							</p>

							<div class="flex gap-4 mt-6">
								<a
									href="/charts"
									class="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
								>
									Utforska scenarier
								</a>
								<a
									href="/about"
									class="px-6 py-3 border-2 border-gray-300 hover:border-primary-600 rounded-lg font-medium transition-colors"
								>
									Läs mer om metoden
								</a>
							</div>
						</div>
					</div>
				</section>
			</div>

			<!-- Right Column: Fixed Map (1/3 width) -->
			<div class="lg:col-span-1">
				<div class="lg:sticky lg:top-8">
					<div class="bg-white rounded-lg shadow-lg p-4">
						<Map
							geojsonData={data.geojson}
							year={year}
							bind:geography
							yearData={data.geoData}
							parameterData={data.parameters}
							scenario={data.scenario}
							lower_bound={data.globals?.lower_bound || 0}
							upper_bound={data.globals?.upper_bound || 30000000}
							class="h-[500px] lg:h-[calc(100vh-12rem)]"
						/>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	/* Ensure smooth scrolling */
	:global(html) {
		scroll-behavior: smooth;
	}
</style>
