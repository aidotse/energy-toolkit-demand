---
title: "Metodik"
description: "Så bygger vi prognoserna – från Energimyndighetens officiella scenarier till detaljerade timkurvor för varje län, segment och scenario. Hela kedjan är öppen och reproducerbar."
lastUpdated: "2026-03-03"
layout: reports
---

Prognoserna bygger på en kedja i fem steg. Varje steg förädlar data från det
föregående — från grova femårsprognoser till detaljerade timvärden som kan utforskas
per län, segment och scenario.

::MethodologySteps{}

:::InsightBox{variant="insight" title="Nyckelprincipen"}
Alla prognoser utgår från Energimyndighetens officiella scenarier. Vi lägger inte till egna
antaganden om energiutvecklingen — vi förädlar befintlig data till högre tidsupplösning och
gör den möjlig att utforska interaktivt.
:::
<!-- -->

## Steg 1: Energimyndighetens scenarier

Grunden är Energimyndighetens långtidsscenarier för elanvändning, publicerade i rapporten
*Scenarier över Sveriges energisystem* (ER 2025:13). Scenarierna togs fram genom att kombinera
två osäkerhetsdimensioner — graden av globalisering och graden av miljöhänsyn — vilket ger
fyra principiella utvecklingsvägar. Tre av dessa valdes ut för regional nedbrytning, utförd
av Profu på uppdrag av Energimyndigheten.

Scenarierna innehåller värden för sex tidpunkter (2025, 2030, 2035, 2040, 2045, 2050),
uppdelade på fem sektorer och alla 21 svenska län.

#### De tre scenarierna

**Beslutad politik** är baserat på redan beslutade styrmedel och industrins egna deklarationer.
Det används som referensscenario i Sveriges klimatrapportering och representerar ingen
utforskande framtidsbild utan en utgångspunkt — vad händer om inga nya beslut fattas?

**Lokal miljöhänsyn** kombinerar lägre globalisering med högre miljöhänsyn. Begränsad
acceptans för att exploatera naturresurser leder till restriktiv vindkraftsutbyggnad och
högre elpriser. Scenariot ger den lägsta elanvändningen av de tre — en konservativ
utvecklingsväg där Sverige fokuserar inåt.

**Internationell tillväxt** kombinerar hög globalisering med lägre miljöhänsyn. Stark
industriexpansion, vätgasproduktion och goda förutsättningar för förnybar utbyggnad ger
den högsta elanvändningen. Trots högst efterfrågan blir elpriserna lägst tack vare
omfattande utbyggnad. Sverige blir en exportör av fossilfria produkter.

:::InsightBox{variant="info" title="Scenarierna beskriver möjligheter, inte sannolikheter"}
Inget av scenarierna ska ses som mer eller mindre sannolikt. De visar möjliga
utvecklingsvägar under olika antaganden om omvärlden och politiken.
:::
<!-- -->

#### Fem sektorer

Elanvändningen delas upp i fem sektorer som var och en har sina egna drivkrafter
och förbrukningsmönster:

- **Bostäder** — Hushållens elanvändning: uppvärmning, belysning, hushållsapparater
- **Service** — Kontor, handel, sjukvård, skolor och andra lokaler
- **Industri** — Tillverkningsindustri, processindustri och byggsektorn
- **Transport** — Elfordon, tåg och övrig elektrifierad transport
- **Datacenter** — Serverhallar och molntjänster: ett snabbt växande segment

#### Regional upplösning

Prognoserna finns för alla 21 svenska län samt ett aggregerat riksvärde. Den regionala
fördelningen varierar efter sektor: industrins placering bygger på befintliga
industrianläggningar, bostäder och service fördelas efter befolkningsunderlag,
datacenter efter inventering av planerade och befintliga anläggningar, och transport
efter regionala elektrifieringsprognoser.

## Steg 2: Från femårsdata till årsdata

Energimyndighetens data innehåller värden för vart femte år. För att kunna visa
utvecklingen år för år och koppla på timprofiler behöver vi värden för varje enskilt
år.

Vi använder linjär interpolering — en enkel metod som drar en rak linje mellan varje
par av femårspunkter. Om Energimyndigheten anger 140 TWh för 2025 och 155 TWh för
2030, antar vi 143 TWh för 2026, 146 TWh för 2027, och så vidare.

::InterpolationChart{}

Resultatet: 6 femårspunkter blir 26 sammanhängande årsvärden (2025–2050), per
scenario, sektor och län.

:::InsightBox{variant="insight" title="Medveten enkelhet"}
Linjär interpolering valdes för sin transparens. Inga dolda antaganden om
tillväxttakt eller trendbrott — kurvan följer exakt de officiella datapunkterna.
:::
<!-- -->

## Steg 3: Från årsenergi till timeffekt

Årsenergi i TWh säger oss *hur mycket* el som behövs, men inte *när*. För nätplanering
är det timvariationen som avgör: när inträffar topparna? När är dalarna? Hur ser
belastningen ut en vintermorgon jämfört med en sommarnatt?

Normaliserade lastprofiler fördelar årsenergin över 8 760 timmar. En normaliserad profil
summerar till 1,0 över hela året — multiplicera med årsenergimängden så får du timvärden
i MW.

Det här är inte en prognos för en specifik timme 25 år framåt. Det är en del av
scenariometodiken — vi visar ett exempel på hur timmönster *kan* se ut, baserat på
dagens uppmätta data.

#### Dygnsmönster per sektor

Diagrammet nedan visar det genomsnittliga dygnsmönstret för varje sektor —
hur förbrukningen fördelar sig över dygnets 24 timmar.

::LoadProfileChart{}

#### Bostäder

Baserad på uppmätt timdata från svenska energibolag (Skövderegionen, 2024). Profilen
visar tydliga morgon- och kvällstoppar när hushållen är som mest aktiva — matlagning,
belysning, hushållsapparater. Vintermånaderna har högre total förbrukning på grund av
uppvärmning (värmepumpar, direktverkande el). Dygnsrytmen följer ett förutsägbart
mönster: låg förbrukning nattetid, morgonuppgång runt kl 06, en middagssvacka, sedan
kvällstopp kring kl 17–19. Helger har en något förskjuten morgonstart.

#### Service

Från samma datakälla (SNI-kod D–K, M–N, S: kontor, handel, sjukvård, skolor).
Följer kontorstider med topp under dagtid (08–17). Lägre kvällar och helger. Högre
basbelastning än bostäder — vissa verksamheter körs dygnet runt (sjukhus,
köpcentrum). Kylbehov ger en sommarkomponent i vissa fastigheter.

#### Industri

Uppmätt data för tillverkningsindustri (SNI C). Relativt jämn profil som speglar
kontinuerlig drift. Skiftmönster syns men dygnsvariationen är mindre än för bostäder.
Hög basbelastning — processindustrier körs dygnet runt. Veckoprofilen visar svag
minskning på helger för icke-kontinuerliga verksamheter.

#### Transport

Sammansatt profil av tre delsegment, viktade efter årlig energianvändning:

- *Personbilar (49 %)*: Laddningsmönster från svensk forskning. Topp sen kväll/natt
  när bilar laddas efter arbetsdagen. Stark säsongsvariation — vintern 28 % över
  sommar (batteri- och kupéuppvärmning). Vardagar har högre efterfrågan.
- *Tunga lastbilar (32 %)*: Baserat på AI Swedens 40 %-elektrifieringsscenario med
  data från 1 556 geografiska hexagoner. Middagstopp (depå- och möjlighetsladdning
  under raster). Mycket stark vardagsprofil — vardagsefterfrågan cirka 3× helg.
  Juli–augusti-dipp speglar minskad logistik under sommaren.
- *Tåg (18 %)*: Dubbla toppar vardagar (pendlartopp morgon och eftermiddag), jämnare
  dagsplatå helger. Säsongsvariation följer pendlingsmönster.

#### Datacenter

Nästan helt jämn profil dygnet runt, året runt — servrar körs 24/7 oavsett tid eller
dag. Den enda variationen kommer från kylning: under sommarmånaderna (juni–augusti)
skapar kompressorbaserad kylning ett temperaturföljande mönster med topp kring kl 13.
Under vinterhalvåret (september–maj) ger frikyla en perfekt jämn profil. Ingen
veckovariation överhuvudtaget.

:::InsightBox{variant="info" title="8 760 timmar × 26 år × 21 län × 5 sektorer × 3 scenarier"}
Totalt cirka 72 miljoner datapunkter.
:::
<!-- -->

## Steg 4: Scenarioparametrar

Energimyndighetens tre scenarier beskriver möjliga utvecklingsbanor. För enkelhetens
skull har vi valt *Beslutad politik* som standardscenario. Parametersystemet låter
användaren skapa egna variationer — vad händer om en sektor växer snabbare eller
långsammare än prognosen?

#### Tillväxtkurvor

Varje sektor kan justeras med en tillväxtparameter som ökar eller minskar
energianvändningen. Justeringen följer en S-kurva — förändringen börjar
långsamt, accelererar, och planar sedan ut. Det speglar hur teknologiska
förändringar och beteendeskiften faktiskt sprids i samhället. Omställningen
är centrerad kring 2037.

::GrowthLevelGrid{}

#### Flexkurvor

Flexparametern flyttar förbrukning *inom* dygnet utan att ändra den totala
energimängden. Det modellerar efterfrågeflexibilitet — till exempel att elbilar
laddas nattetid istället för kvällstid, eller att industri förskjuter processer
till timmar med lägre belastning.

Effekten är att topparna kapas och dalarna fylls ut, vilket ger en jämnare
belastningskurva. Det kan minska behovet av nätförstärkning och dyra
effekttoppar.

:::InsightBox{variant="info" title="Parametrarna ändrar inte basantagandena"}
Tillväxt- och flexparametrarna appliceras ovanpå Energimyndighetens scenarier.
De ersätter aldrig grundprognosen — de låter dig utforska hur resultat påverkas av
rimliga avvikelser från baslinjen.
:::
<!-- -->

## Steg 5: Kvalitetssäkring

Varje steg i kedjan har inbyggda kontroller för att säkerställa att den förädlade
datan är konsistent med källorna.

#### Normalisering bevarar årstotaler

Efter att timprofiler applicerats normaliseras resultatet så att summan av alla
8 760 timmar exakt motsvarar årsenergin. Ingen energi tillkommer eller försvinner
i omvandlingen.

#### Kontrollerat brus för realism

Ett litet slumpmässigt brus (±2 %, reproducerbart med fast slumpfrö) läggs till
timvärdena för att undvika orealistiskt jämna mönster. Bruset appliceras *före*
normaliseringen, så årstotalerna bevaras exakt.

#### Skottårshantering

Källprofilerna från 2024 (skottår, 8 784 timmar) justeras till 8 760 timmar genom
att 29 februari tas bort.

#### Transportaggregering

Tre delsegment (personbilar 49 %, lastbilar 32 %, tåg 18 %) kombineras genom
efterfrågeviktad medelvärdesbildning till en sammansatt transportprofil.

#### Profilförlängning

Profiler från källåret (2024) förlängs till att täcka 2025–2050 med
veckodagsmedveten mappning — vardagar matchas mot vardagar, helger mot helger —
för att bevara realistiska mönster.

:::InsightBox{variant="insight" title="Transparens genom hela kedjan"}
All kod, alla datakällor och alla antaganden är öppna. Varje steg kan granskas,
ifrågasättas och förbättras. Det är en medveten designprincip — prognoser som inte
kan förklaras bör inte användas för beslut.
:::
