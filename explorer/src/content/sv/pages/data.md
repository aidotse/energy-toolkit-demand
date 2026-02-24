---
title: "Data & API"
description: "Tillgång till data och information om hur du använder vårt API"
layout: reports
---

Alla prognoser och scenarier i detta verktyg är tillgängliga via ett öppet API.
Data genereras från historiska tidsserier och parametriserade scenarier som
modellerar olika utvecklingsbanor för elektrifiering, ekonomisk tillväxt och
teknologisk utveckling.

API:et är byggt med OpenAPI 3.1 och använder DuckDB för snabba frågor mot
strukturerade Parquet-filer. All data är tillgänglig med olika tidsupplösningar
(timme, dag, vecka, månad, år) och kan filtreras på geografi, segment och scenario.

## API-endpoints

**Base URL:** `http://localhost:4010`

*(Produktion: Används via denna webbplats)*

### Statiska endpoints

#### `GET /scenarios`
Hämtar alla tillgängliga scenarier med metadata och parametrar.

```json
[
  {
    "id": "base",
    "name": "Basscenario",
    "is_default": true,
    "parameters": { ... }
  }
]
```

#### `GET /geographies`
Hämtar geografiska områden med metadata (namn, typ, koordinater).

```json
[
  {
    "geo_id": "SE01",
    "geo_name": "Stockholm",
    "geo_type": "county"
  }
]
```

#### `GET /parameters`
Hämtar tillgängliga parameterval (år, geografier, segment, upplösningar).

#### `GET /globals`
Hämtar globala gränser (min/max) för olika aggregeringsnivåer.

### Dynamiska endpoints

#### `GET /demand`
Hämtar energibehovsdata med flexibla filter och aggregeringar.

**Query parameters:**

- `start` — Startdatum (YYYY eller YYYY-MM-DD)
- `end` — Slutdatum
- `resolution` — Tidsupplösning (1h, 1d, 1w, 1M, 1Y)
- `aggregation` — Aggregeringsmetod (sum, mean, max)
- `geography` — Geografiskt område (SE01, total, all)
- `segment` — Sektor (housing, transport, industry, total, all)
- `scenarioId` — Scenario-ID

**Exempel:**

```
GET /demand?start=2030&end=2051&resolution=1Y&aggregation=sum&geography=total&segment=total&scenarioId=base
```

**Svar:**

```json
[
  {
    "period": "2030-01-01T00:00:00Z",
    "value": 152340000000,
    "geography": "total",
    "segment": "total"
  },
  ...
]
```

## Användningstips

#### Server-side aggregering
Använd `geography=total` och `segment=total` för att få
servern att aggregera data åt dig. Detta är mycket snabbare än att hämta all data och aggregera själv.

#### Upplösning och aggregering
För årlig data använd `resolution=1Y` med `aggregation=sum` för total energi.
För effekt (power) använd `aggregation=mean` eller `max`.

#### Prestanda
API:et använder pre-aggregerade tabeller för vanliga frågor (årliga totaler, geografiska summor).
Svarstider är normalt under 1 sekund. För stora datamängder med hög upplösning, överväg att
dela upp i mindre frågor.

## Teknisk dokumentation

Full API-dokumentation finns tillgänglig i OpenAPI 3.1-format. Specifikationen
inkluderar detaljerade beskrivningar av alla endpoints, parametrar, svarsformat
och exempel.

[OpenAPI Spec (YAML)](https://github.com/yourusername/behovskartan) · [GitHub Repository](https://github.com/yourusername/behovskartan)

## Dataformat

Data lagras i Parquet-format med en nested struktur som separerar basscenarier
och parametriserade scenarier. Pre-aggregerade tabeller finns för snabbare
frågor på nationell, regional och sektorsnivå.

- **Tidsperiod:** 2025–2050
- **Tidsupplösning:** Timme (rådata), aggregerbar till dag, vecka, månad, år
- **Geografier:** 21 län plus nationell aggregering
- **Segment:** Bostäder, transport, industri, övrigt
- **Scenarier:** Basscenario plus parametriserade varianter
