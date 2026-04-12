---
title: Sveriges framtida elbehov
description: Hur mycket el kommer Sverige att behöva år 2050 — och var och
  när behövs den? Det här verktyget visualiserar framtidens elanvändning
  uppdelat på regioner, sektorer och tid. Utforska olika scenarier för att
  se hur elektrifiering, industriomställning och ny teknik förändrar bilden.
---

::HomeMetrics{}

::HomeDynamicText{}

::ChartEmbed{chart="area-yearly" aggregationInit="sum" exportable={false}}

:::InsightBox{title="Ny el till nya behov"}
I scenarierna kommer nästan hela ökningen från sektorer som idag knappt
använder el. Det handlar inte om mer el till samma saker — utan om att
transporter, industri och datacenter kan tillkomma som stora nya elanvändare.
:::

<!-- -->

## Vilka sektorer driver förändringen?

Idag dominerar bostäder och service elanvändningen. I scenarierna går
transportsektorn — personbilar, lastbilar, bussar — från marginell
elanvändning till att kunna stå för en betydande andel. Industrin
elektrifierar processer som tidigare drevs av fossila bränslen, och
datacenter kan växa som en helt ny kategori.

Bostädernas absoluta elanvändning bedöms vara relativt stabil. Deras
_andel_ av den totala förbrukningen kan däremot minska, i takt med att
andra sektorer växer snabbare.

::ChartEmbed{chart="sector-pie" enableComparison={true} exportable={false}}

:::InsightBox{title="Bostäderna driver inte ökningen"}
Trots värmepumpar och ökad digitalisering pekar scenarierna på att
bostadssektorn inte är den som driver det växande elbehovet. Det är
snarare transporter och industri som kan stå för de stora volymökningarna.
:::

<!-- -->

## Regional variation

Sektorsfördelningen varierar kraftigt mellan länen. I Stockholm och
Västra Götaland dominerar bostäder och service. I Norrbotten och
Västernorrland utgör industrin en övervägande del. Det innebär att
olika regioner kan möta helt olika utmaningar om elbehovet växer.
Utforska kartan för att se ditt län.

::ChartEmbed{chart="geo-segment" exportable={false}}

:::InsightBox{title="Ojämn geografi"}
Norra Sverige har produktionsöverskott men kan komma att möta stor ny
efterfrågan från datacenter och grön industri. Södra Sverige har redan
idag kapacitetsutmaningar — och det är där merparten av befolkningen bor.
:::

<!-- -->

## När behövs elen?

Total årsförbrukning berättar bara halva historien. Lika viktigt är
_när_ elen behövs. Skillnaderna kan vara stora: en kall vintermorgon kan
effektbehovet vara flera gånger högre än en sommarnatt.

Värmekurvan i diagrammet nedan visar dessa mönster. Vintern har tydliga
toppar morgon och kväll — drivet av uppvärmning, belysning och
matlagning. Sommaren är jämnare och lägre. Det är vintertopparna som
tenderar att dimensionera elnätet, inte sommarens lugna profil.

::ChartEmbed{chart="period-heatmap" exportable={false}}

::HomePeakInsight{}

## Flexibilitet kan jämna ut topparna

En del av elbehovet kan potentiellt flyttas i tid utan att påverka
slutanvändaren. Elbilsladdning kan styras till natten. Värmepumpar kan
förvärma hus under timmar med lägre efterfrågan. Vissa industriprocesser
kan schemaläggas flexibelt.

Om denna flexibilitet utnyttjas skulle gapet mellan topp och dal kunna
minska. Det kan innebära att elnätet dimensioneras smalare, att mindre
reservkapacitet behövs och att förnybar el i högre grad kan användas när
den produceras som mest — inte bara när den efterfrågas som mest.

::ChartEmbed{chart="flex-peak-bars" exportable={false}}

:::Comparison{value=6.9 unit="GW" unitValue=1.15 unitLabel="kärnreaktorer"}
Baserat på genomsnittlig kapacitet för Sveriges sex reaktorer (~1,15 GW per reaktor).
:::

::HomeFooterCTA{}

::HomeFooter{}
