<script lang="ts">
	/**
	 * First Page Report Redesign - Prototype
	 *
	 * New narrative-driven structure for the main report page.
	 * This is a prototype showing the new layout before migrating +page.svelte.
	 */
	import { Zap, TrendingUp, Activity, Database } from 'lucide-svelte';
	import ReportSection from '$lib/components/report/ReportSection.svelte';
	import MetricCard from '$lib/components/report/MetricCard.svelte';
	import HighlightCard from '$lib/components/report/HighlightCard.svelte';
	import InsightBox from '$lib/components/report/InsightBox.svelte';
	import AreaChart from '$lib/components/AreaChart.svelte';
	import TimeLine from '$lib/components/TimeLine.svelte';
	import Histogram from '$lib/components/Histogram.svelte';
	import SegmentBars from '$lib/components/SegmentBars.svelte';
	import GeoBarChart from '$lib/components/GeoBarChart.svelte';
	import Map from '$lib/components/map/Map.svelte';
	import type { PageData } from './$types';

	// Get data from loader
	let { data }: { data: PageData } = $props();

	// Extract key values for display
	let geography = $state(data.geography);
	let year = $state(data.year);
	let scenarioId = $state(data.scenarioId);

	// Format numbers for display
	function formatEnergy(value: number): string {
		return `${Math.round(value / 1_000_000_000)} TWh`;
	}

	function formatPower(value: number): string {
		return `${Math.round(value / 1_000_000)} GW`;
	}
</script>

<div class="report-page bg-gray-50 dark:bg-gray-900 min-h-screen">
	<!-- Hero Section -->
	<div class="hero-section bg-gradient-to-br from-primary-600 to-primary-800 dark:from-primary-800 dark:to-primary-950 text-white py-12 md:py-16">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<h1 class="text-4xl md:text-5xl font-bold mb-3">
				Sveriges framtida elbehov
			</h1>
			<p class="text-xl md:text-2xl text-primary-100 dark:text-primary-200">
				Prognoser och scenarier 2025–2050
			</p>
		</div>
	</div>

	<!-- Executive Summary -->
	<ReportSection class="bg-white dark:bg-gray-800 -mt-12 relative z-10">
		<div class="mb-8 max-w-3xl">
			<p class="text-lg leading-relaxed text-gray-700 dark:text-gray-300">
				Det råder idag en bred konsensus om att vårt elbehov kommer öka markant i framtiden.
				Detta verktyg visualiserar och förklarar olika scenarier för Sveriges framtida
				elbehov baserat på historisk data och antaganden om elektrifiering, ekonomisk
				tillväxt och teknologisk utveckling.
			</p>
		</div>

		<!-- Key Metrics Grid -->
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
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

		<!-- Project Background Card -->
		<HighlightCard
			title="Om detta verktyg"
			variant="primary"
			linkHref="/about"
			linkText="Läs mer"
		>
			{#snippet children()}
				<p>
					Detta verktyg visualiserar framtidsprognoser för Sveriges elbehov baserat på olika
					scenarier. Prognoserna bygger på historisk data och olika antaganden om elektrifiering,
					ekonomisk tillväxt och teknologisk utveckling.
				</p>
			{/snippet}
		</HighlightCard>
	</ReportSection>

	<!-- Section 3: Time Evolution -->
	<ReportSection
		id="time-evolution"
		title="Hur utvecklas elbehovet över tid?"
		subtitle="Historisk trend och framtidsprojektioner visar en tydlig ökning driven av elektrifiering av transporter och industri."
	>
		<div class="space-y-8">
			<!-- Two-column layout: Chart + Text -->
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
				<!-- Left column: Chart -->
				<div class="space-y-4 pb-6">
					<div class="h-[420px]">
						<AreaChart
							data={data.timeSeriesData}
							year={year}
							aggregationInit="sum"
							class="h-full"
						/>
					</div>
					<p class="text-sm text-gray-600 dark:text-gray-400">
						<strong>Figur 1:</strong> Årligt elbehov för Sverige 2025–2050. Kurvan visar en
						tydlig uppåtgående trend med en acceleration efter 2030 då elektrifieringen av
						transportsektorn tar fart.
					</p>
				</div>

				<!-- Right column: Text content -->
				<div class="space-y-4">
					<p class="text-gray-700 dark:text-gray-300 leading-relaxed">
						Sveriges elbehov har historiskt sett varit relativt stabilt kring 140 TWh per år
						för hushåll och service, medan industrin stått för ytterligare cirka 50 TWh.
						Detta är på väg att förändras dramatiskt.
					</p>
					<p class="text-gray-700 dark:text-gray-300 leading-relaxed">
						Den viktigaste drivkraften bakom ökningen är <strong>elektrifieringen av
						transportsektorn</strong>. Idag är endast cirka 2% av Sveriges transporter
						eldrivna. När denna andel växer till 80-90% år 2050 innebär det en
						mångdubbling av elbehovet från transporter.
					</p>
					<p class="text-gray-700 dark:text-gray-300 leading-relaxed">
						Samtidigt genomgår industrin en grön omställning. Fossilfri stålproduktion med
						vätgas, elektrifierad petrokemi och andra processer som ersätter fossila bränslen
						med el bidrar kraftigt till den ökade efterfrågan, särskilt i norra Sverige.
					</p>
					<p class="text-gray-700 dark:text-gray-300 leading-relaxed">
						Den totala ökningen från dagens cirka 140 TWh till över 200 TWh år 2050
						motsvarar en tillväxt på mer än 40%. Denna ökning sker inte jämnt över tiden
						utan accelererar kraftigt efter 2030 när elektrifieringen tar fart på allvar.
					</p>
				</div>
			</div>

			<!-- Insight box -->
			<InsightBox title="Nyckelinsikt: Elektrifiering driver tillväxten">
				{#snippet children()}
					<p>
						Den största ökningen av elbehov kommer från <strong>elektrifiering av
						transporter</strong> (personbilar och tung trafik) samt <strong>industriell
						omställning</strong> mot fossilfria processer. Detta sker främst efter 2030.
					</p>
				{/snippet}
			</InsightBox>
		</div>
	</ReportSection>

	<!-- Section 4: Segmental Comparison -->
	<ReportSection
		id="segmental-drivers"
		title="Vad driver förändringen?"
		subtitle="Olika sektorer bidrar olika mycket till den ökade elefterfrågan."
		class="bg-gray-100 dark:bg-gray-900"
	>
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
			<!-- Text content -->
			<div class="space-y-4">
				<p class="text-gray-700 dark:text-gray-300 leading-relaxed">
					Elektrifieringen av Sverige sker i olika takt inom olika sektorer.
					<strong>Bostäder och service</strong> utgör basen för elförbrukningen,
					men det är <strong>transport</strong> och <strong>industri</strong> som
					driver de största förändringarna framåt.
				</p>
				<p class="text-gray-700 dark:text-gray-300 leading-relaxed">
					Transport elektrifieras snabbast, med elbilar som blir dominant efter 2035.
					Industrin omställer gradvis till elektrifierade processer, särskilt stålproduktion
					och petrokemi.
				</p>

				<!-- Insight box -->
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

			<!-- Chart -->
			<div class="space-y-4 pb-6">
				<div class="h-[420px]">
					<SegmentBars
						data={data.segmentData}
						year={year}
						class="h-full"
					/>
				</div>
				<p class="text-sm text-gray-600 dark:text-gray-400">
					<strong>Figur 3:</strong> Sektorsfördelning av elbehov år {year}.
				</p>
			</div>
		</div>
	</ReportSection>

	<!-- Section 5: Geographic Distribution -->
	<ReportSection
		id="geographic-patterns"
		title="Var sker tillväxten?"
		subtitle="Elbehov växer ojämnt över landet, med störst ökning i storstadsregioner och industriområden."
	>
		<div class="space-y-8">
			<!-- Map and bar chart side by side -->
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
				<div class="space-y-4 pb-6">
					<div class="h-[530px]">
						<Map
							geojsonData={data.geojson}
							yearData={data.geoData}
							year={year}
							bind:geography
							scenario={data.scenario}
							lower_bound={data.globals?.lower_bound || 0}
							upper_bound={data.globals?.upper_bound || 30000000}
							parameterData={data.parameters}
							class="h-full"
						/>
					</div>
					<p class="text-sm text-gray-600 dark:text-gray-400">
						<strong>Figur 4:</strong> Geografisk fördelning av elbehov per region.
					</p>
				</div>
				<div class="space-y-4 pb-6">
					<div class="h-[530px]">
						<GeoBarChart
							data={data.geoData}
							parameterData={{ geographies: data.geographies }}
							year={year}
							class="h-full"
						/>
					</div>
					<p class="text-sm text-gray-600 dark:text-gray-400">
						<strong>Figur 5:</strong> Jämförelse mellan regioner.
					</p>
				</div>
			</div>

			<!-- Insight -->
			<InsightBox title="Regional ojämnhet">
				{#snippet children()}
					<p>
						De tre storstadsregionerna (Stockholm, Göteborg, Malmö) står för över 40%
						av den totala ökningen. Norra Sverige ser också kraftig tillväxt driven av
						ny fossilfri industri, särskilt ståltillverkning.
					</p>
				{/snippet}
			</InsightBox>
		</div>
	</ReportSection>

	<!-- Section 6: Flexibility & Power -->
	<ReportSection
		id="flexibility"
		title="När behövs elen?"
		subtitle="Effektbehov varierar kraftigt över dygnet och året, vilket kräver flexibilitet i elsystemet."
		class="bg-gray-100 dark:bg-gray-900"
	>
		<div class="space-y-8">
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
				<!-- Histogram -->
				<div class="space-y-4 pb-6">
					<div class="h-[380px]">
						<Histogram
							data={data.hourlyData}
							geography={geography}
							year={year}
							segment="total"
							aggregation="mean"
							class="h-full"
						/>
					</div>
					<p class="text-sm text-gray-600 dark:text-gray-400">
						<strong>Figur 6:</strong> Fördelning av timeffekt under året.
						Visar hur ofta olika effektnivåer förekommer.
					</p>
				</div>

				<!-- TimeLine for daily patterns -->
				<div class="space-y-4 pb-6">
					<div class="h-[380px]">
						<TimeLine
							data={data.dailyData}
							year={year}
							resolution="1d"
							aggregation="sum"
							class="h-full"
						/>
					</div>
					<p class="text-sm text-gray-600 dark:text-gray-400">
						<strong>Figur 7:</strong> Dygnsvariationer i effektbehov.
					</p>
				</div>
			</div>

			<!-- Insight -->
			<InsightBox variant="warning" title="Flexibilitetsbehov växer">
				{#snippet children()}
					<p>
						Skillnaden mellan lågast och högst effekt ökar från dagens 25 GW till
						över 40 GW år 2050. Detta kräver:<br>
					</p>
					<ul class="mt-2 space-y-1">
						<li>• Flexibel produktion (vattenkraft, batterier)</li>
						<li>• Efterfrågestyrning (smart laddning av elbilar)</li>
						<li>• Förstärkt överföringskapacitet</li>
					</ul>
				{/snippet}
			</InsightBox>
		</div>
	</ReportSection>

	<!-- Section 7: Wrap-up -->
	<ReportSection
		id="conclusions"
		title="Vad betyder detta?"
		subtitle="Sammanfattning och implikationer för Sveriges elsystem"
	>
		<div class="space-y-6">
			<InsightBox title="Sammanfattning: Fyra nyckelinsikter">
				{#snippet children()}
					<ol class="space-y-3">
						<li>
							<strong>1. Kraftig ökning:</strong> Elbehov ökar med 35% till 2050,
							från 330 TWh till 450 TWh.
						</li>
						<li>
							<strong>2. Elektrifiering driver:</strong> Transport och industri står
							för majoriteten av ökningen.
						</li>
						<li>
							<strong>3. Regional koncentration:</strong> Storstäder och industriregioner
							växer snabbast.
						</li>
						<li>
							<strong>4. Flexibilitet krävs:</strong> Effektsvängningar ökar från
							25 GW till över 40 GW.
						</li>
					</ol>
				{/snippet}
			</InsightBox>

			<div class="prose prose-lg dark:prose-invert max-w-4xl text-gray-700 dark:text-gray-300">
				<h3>Implikationer för elnätet</h3>
				<p>
					Denna utveckling innebär stora investeringsbehov i både produktionskapacitet
					och överföringsnät. Särskilt viktigt är att bygga ut flexibla resurser som
					kan hantera de stora variationerna i effektbehov.
				</p>

				<h3>Nästa steg</h3>
				<p>
					Utforska olika scenarier i verktyget för att se hur olika antaganden påverkar
					resultaten. Jämför scenarier för att förstå osäkerhetsspannet.
				</p>

				<div class="flex gap-4 mt-6 not-prose">
					<a
						href="/charts"
						class="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
					>
						Utforska scenarier
					</a>
					<a
						href="/about"
						class="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 hover:border-primary-600 dark:hover:border-primary-400 rounded-lg font-medium transition-colors"
					>
						Läs mer om metoden
					</a>
				</div>
			</div>
		</div>
	</ReportSection>
</div>

<style>
	/* No custom CSS needed - all styling via Tailwind utility classes */
</style>
