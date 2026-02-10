<script lang="ts">
	/**
	 * Report Page with Card Layout
	 *
	 * Two-column layout inspired by main page:
	 * - Left: Scrollable card-based content
	 * - Right: Fixed background map
	 */
	import { Zap, TrendingUp, Activity } from 'lucide-svelte';
	import MetricCard from '$lib/components/report/MetricCard.svelte';
	import InsightBox from '$lib/components/report/InsightBox.svelte';
	import AreaChart from '$lib/components/AreaChart.svelte';
	import SectorPieChart from '$lib/components/SectorPieChart.svelte';
	import GeoSegmentChart from '$lib/components/GeoSegmentChart.svelte';
	import PeriodHeatmap from '$lib/components/PeriodHeatmap.svelte';
	import Map from '$lib/components/map/Map.svelte';
	import { fetchDemandData } from '$lib/dataService';
	import { makeDemandQuery } from '$lib/utilities';
	import { parameterStore } from '$lib/stores/parameterStore.svelte';
	import type { PageData } from './$types';

	// Get data from loader
	let { data }: { data: PageData } = $props();

	// Extract key values for display
	let geography = $state(data.geography);
	let year = $state(data.year);

	// Reactive metrics that update with scenario and year changes
	let timeSeriesData = $state<Array<{timestamp: Date, value: number}>>([]);
	let peakPower = $state(0);

	// Calculate metrics from time series data based on selected year
	let totalEnergy2025 = $derived(
		timeSeriesData.find(d => d.timestamp.getFullYear() === 2025)?.value || 0
	);

	let totalEnergySelectedYear = $derived(
		timeSeriesData.find(d => d.timestamp.getFullYear() === year)?.value || 0
	);

	let growthRate = $derived(
		totalEnergy2025 > 0 ? ((totalEnergySelectedYear - totalEnergy2025) / totalEnergy2025) * 100 : 0
	);

	// Fetch time series data when scenario or parameters change
	$effect(() => {
		// Access store values to create reactive dependencies
		const baseScenario = parameterStore.baseScenario;
		const _params = parameterStore.parameterValues;

		if (!baseScenario) return;

		// Fetch time series data for energy metrics
		const timeSeriesQuery = makeDemandQuery({
			start: '2025',
			end: '2051',
			resolution: '1Y',
			aggregation: 'sum',
			geography: 'total',
			segment: 'total',
			baseScenario: baseScenario,
			parameterValues: parameterStore.isDefaultScenario ? parameterStore.parameterValues : undefined
		});

		fetchDemandData(timeSeriesQuery).then(data => {
			if (data.length > 0) {
				timeSeriesData = data;
			}
		});
	});

	// Fetch hourly data for peak power when year changes
	$effect(() => {
		// Access store values and year to create reactive dependencies
		const baseScenario = parameterStore.baseScenario;
		const _params = parameterStore.parameterValues;
		const currentYear = year;

		if (!baseScenario || !currentYear) return;

		const hourlyQuery = makeDemandQuery({
			start: `${currentYear}-01-01`,
			end: `${currentYear + 1}-01-01`,
			resolution: '1h',
			aggregation: 'sum',
			geography: 'total',
			segment: 'total',
			baseScenario: baseScenario,
			parameterValues: parameterStore.isDefaultScenario ? parameterStore.parameterValues : undefined
		});

		fetchDemandData(hourlyQuery).then(hourlyData => {
			if (hourlyData.length > 0) {
				peakPower = hourlyData.reduce((max, d) => Math.max(max, d.value || 0), 0);
			}
		});
	});

	// Format numbers for display
	// API returns values in GWh (yearly energy), so we divide by 1000 to get TWh
	function formatEnergy(value: number): string {
		return `${Math.round(value / 1_000)} TWh`;
	}

	// API returns power values in GW (hourly mean power)
	function formatPower(value: number): string {
		if (value >= 1) {
			return `${value.toFixed(1)} GW`;
		} else if (value > 0) {
			return `${Math.round(value * 1000)} MW`;
		}
		return '0 GW';
	}
</script>

<div class="min-h-screen dark:bg-gray-900" style="background-color: #ededed;">
	<!-- Main content container -->
	<div class="flex flex-col lg:flex-row">
		<!-- Left Column: Scrollable Card Content (3/5 width) -->
		<main class="flex-1 lg:w-3/5 overflow-y-auto p-4 sm:p-6 lg:p-8">
			<div class="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-3xl shadow-sm px-10 py-6 sm:px-14 sm:py-8">
			<!-- Title Section -->
			<div class="mb-12">
				<!-- Partner logos - right-aligned, at top -->
				<div class="flex justify-end mb-6">
					<div class="flex flex-col items-start gap-2">
						<p class="text-sm text-gray-900 dark:text-gray-100">
							Utvecklat med stöd av
						</p>
						<a href="https://www.energimyndigheten.se/" target="_blank" rel="noopener noreferrer" class="transition-opacity hover:opacity-80">
							<img
								src="/SV Primär Energimyndigheten logo EM-SVART png (RGB).png"
								alt="Energimyndigheten"
								class="h-8 w-auto"
							/>
						</a>
					</div>
				</div>
				<h1 class="text-3xl font-bold text-gray-900 dark:text-gray-50 mt-10 mb-6">
					Sveriges framtida elbehov
				</h1>
				<p class="text-base text-gray-600 dark:text-gray-400">
					Det här verktyget ger en samlad bild av Sveriges förväntade elbehov fram till år 2050.
					Det omfattar bostäder, transport, industri och andra samhällssektorer som tillsammans
					formar framtidens elförbrukning. Genom att utforska olika scenarier kan du se hur
					olika antaganden om elektrifiering, teknikutveckling och samhällsförändringar påverkar
					det totala elbehovet. Verktyget visar både hur mycket el som kommer att behövas och
					när den behövs som mest under året.
				</p>
			</div>

			<!-- Key Metrics Grid -->
				<div class="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
					<MetricCard
						value={formatEnergy(totalEnergySelectedYear)}
						label="Total energi"
						sublabel={`År ${year}`}
						icon={Zap}
						trend={growthRate >= 0 ? "up" : "down"}
						trendLabel={`${growthRate >= 0 ? '+' : ''}${Math.round(growthRate)}% sedan 2025`}
					/>
					<MetricCard
						value={`${growthRate >= 0 ? '+' : ''}${Math.round(growthRate)}%`}
						label="Tillväxt"
						sublabel={`${year} jämfört med 2025`}
						icon={TrendingUp}
						trend={growthRate >= 0 ? "up" : "down"}
						trendLabel="Elektrifiering driver"
					/>
					<MetricCard
						value={formatPower(peakPower)}
						label="Maxeffekt"
						sublabel={`År ${year}`}
						icon={Activity}
						trend="up"
						trendLabel="Baserat på timdata"
					/>
				</div>

			<!-- Current State / Time Evolution Section -->
			<div class="pt-12 mt-12">
				<h2 class="text-xl font-bold text-gray-900 dark:text-gray-50 mb-3">
					Växande elbehov
				</h2>
				<p class="text-base text-gray-600 dark:text-gray-400 mb-8">
					Sveriges elbehov förväntas öka betydligt under de kommande decennierna. Denna utveckling
					drivs av en bred elektrifiering av samhället där fossila bränslen successivt fasas ut
					och ersätts med el. Transportsektorn ställer om till eldrift, industrin elektrifierar
					sina processer och nya användningsområden för el tillkommer. Förändringen accelererar
					efter 2030 när elektrifieringen når allt fler sektorer och tekniker mognar.
				</p>

				<div class="space-y-8">
					<!-- AreaChart -->
					<div class="pb-6">
						<AreaChart
							geography={geography}
							year={year}
							aggregationInit="sum"
							exportable={false}
							description="Årligt elbehov för Sverige 2025–2050. Kurvan visar en tydlig uppåtgående trend med en acceleration efter 2030."
							contentClass="mx-4 sm:mx-8"
						/>
					</div>
				</div>
			</div>

			<!-- Sectoral Drivers Section -->
			<div class="pt-12 mt-12">
				<h2 class="text-xl font-bold text-gray-900 dark:text-gray-50 mb-3">
					Vad driver förändringen?
				</h2>
				<p class="text-base text-gray-600 dark:text-gray-400 mb-8">
					Förändringen av Sveriges elbehov drivs av flera samverkande faktorer. Transportsektorn
					genomgår en omfattande elektrifiering där personbilar, lastbilar och bussar övergår
					till eldrift. Industrin ställer om från fossila bränslen till el för att nå klimatmål,
					vilket inkluderar både befintliga processer och helt nya industriella satsningar.
					Bostäder och lokaler behåller en stabil bas men påverkas av värmepumpar och ökad
					digitalisering. Sammantaget bidrar alla sektorer till den växande efterfrågan på el.
				</p>

				<div class="space-y-6">

					<!-- Sector Pie Chart -->
					<div class="pb-6">
						<SectorPieChart
							geography={geography}
							year={year}
							enableComparison={true}
							comparisonYear={2025}
							exportable={false}
							description={`Sektorsfördelning av elbehov år ${year}.`}
						/>
					</div>

					<p class="text-base text-gray-600 dark:text-gray-400">
						Fördelningen mellan sektorer varierar kraftigt mellan olika län. I storstadsregioner
						dominerar bostäder och service, medan industritäta län som Norrbotten och Västernorrland
						har en betydligt högre andel industriell elanvändning. Denna geografiska ojämnhet innebär
						att olika delar av landet har olika utmaningar när elbehovet växer. Använd kartan för
						att utforska hur sektorernas fördelning skiljer sig åt mellan länen.
					</p>

					<!-- Geo Segment Chart -->
					<div class="pb-6">
						<GeoSegmentChart
							{year}
							parameterData={data.parameters}
							exportable={false}
							description={`Sektorernas andel av elbehovet per län, år ${year}.`}
						/>
					</div>

				</div>
			</div>

			<!-- Temporal Patterns Section -->
			<div class="pt-12 mt-12">
				<h2 class="text-xl font-bold text-gray-900 dark:text-gray-50 mb-3">
					När behövs elen?
				</h2>
				<p class="text-base text-gray-600 dark:text-gray-400 mb-8">
					Elbehovet varierar kraftigt över dygnet och året. Under vintermånaderna är efterfrågan
					som störst, drivet av uppvärmning och belysning. Vardagar har tydliga toppar på morgonen
					och kvällen när hushåll och arbetsplatser är som mest aktiva. Att förstå dessa mönster
					är avgörande för att planera elnätet och säkerställa att produktionen möter behovet
					även under de mest krävande timmarna.
				</p>

				<p class="text-base text-gray-600 dark:text-gray-400 mb-8">
					Flexibilitet spelar en viktig roll för att hantera variationen i elbehovet. Genom att
					flytta förbrukning från höglasttimmar till perioder med lägre efterfrågan kan topparna
					jämnas ut. Exempel på flexibla laster är laddning av elbilar, uppvärmning av byggnader
					med värmepumpar och industriella processer som kan schemaläggas. Med ökad flexibilitet
					minskar behovet av dyr reservkapacitet och elnätet kan utnyttjas mer effektivt.
				</p>

				<div class="space-y-6">
					<PeriodHeatmap
						geography={geography}
						year={year}
						exportable={false}
						description={`Elbehov fördelat på månad och tid på dygnet, år ${year}. Mörkare färg visar högre genomsnittligt elbehov.`}
					/>
				</div>
			</div>

			<!-- Flexibility Section -->
			<div class="pt-12 mt-12">
				<h2 class="text-xl font-bold text-gray-900 dark:text-gray-50 mb-3">
					Flexibilitet i behovet
				</h2>
				<p class="text-base text-gray-600 dark:text-gray-400 mb-8">
					En del av elbehovet kan flyttas i tid utan att påverka slutanvändaren. Laddning av
					elbilar, uppvärmning med värmepumpar och vissa industriprocesser kan schemaläggas till
					timmar med lägre efterfrågan. Denna flexibilitet minskar belastningen under topptimmar
					och gör det möjligt att bättre utnyttja förnybara energikällor när de producerar som mest.
				</p>
			</div>

			<!-- Insight -->
			<div class="pt-12 mt-12">
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

				</div>
		</main>

		<!-- Right Column: Fixed Background Map (2/5 width) -->
		<aside
			class="lg:w-2/5 lg:sticky lg:top-14"
			style="height: calc(100vh - 3.5rem);"
		>
			<Map
				geojsonData={data.geojson}
				year={year}
				onYearChange={(newYear: number) => year = newYear}
				bind:geography
				yearData={data.geoData}
				parameterData={data.parameters}
				scenario={data.scenario}
				lower_bound={data.globals?.lower_bound || 0}
				upper_bound={data.globals?.upper_bound || 30000000}
			/>
		</aside>
	</div>
</div>
