---
title: "Data & API"
description: "Tillgång till data och information om hur du använder vårt API"
layout: reports
---

Alla scenarier i detta verktyg är tillgängliga via ett öppet API.
Data genereras från historiska tidsserier och parametriserade scenarier som
modellerar olika utvecklingsbanor för elektrifiering, ekonomisk tillväxt och
teknologisk utveckling.

API:et är byggt med OpenAPI 3.1 och använder DuckDB för snabba frågor mot
strukturerade Parquet-filer. All data är tillgänglig med olika tidsupplösningar
och kan filtreras på geografi, segment och scenario.

## API-dokumentation

Fullständig, interaktiv API-dokumentation finns tillgänglig med alla endpoints,
parametrar, svarsformat och exempel:

**[Öppna API-dokumentation →](/api-docs)**

## Snabbstart

1. **`GET /parameters`** — Hämta tillgängliga parametervärden (år, geografier, segment, upplösningar)
2. **`GET /scenarios`** — Hämta tillgängliga scenarier
3. **`GET /demand`** — Hämta tidsserier med valfria filter

### Exempelfråga

```
GET /demand?start=2030&end=2051&resolution=1Y&aggregation=sum&geography=total&segment=total
```

## Användningstips

#### Server-side aggregering
Använd `geography=total` och `segment=total` för att få
servern att aggregera data åt dig. Detta är mycket snabbare än att hämta all data och aggregera själv.

#### Upplösning och aggregering
För årlig data använd `resolution=1Y` med `aggregation=sum` för total energi.
För effekt (power) använd `aggregation=mean` eller `max`.

#### Svarsformat
API:et stöder både JSON och CSV (`?format=csv`). Geografiendpointen stöder även GeoJSON (`?format=geojson`).

## Dataformat

- **Tidsperiod:** 2025–2050
- **Tidsupplösning:** Timme (rådata), aggregerbar till dag, vecka, månad, år
- **Geografier:** 21 län plus nationell aggregering
- **Segment:** Bostäder, transport, industri, tjänster, datacenter
- **Scenarier:** Basscenarier plus parametriserade varianter

## Källkod

[GitHub Repository](https://github.com/aidotse/behovskartan)
