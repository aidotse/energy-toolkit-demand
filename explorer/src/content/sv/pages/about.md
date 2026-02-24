---
title: "Om projektet"
description: "Ett verktyg för att utforska och visualisera Sveriges framtida elbehov"
layout: reports
---

Energy Toolkit: Demand är ett interaktivt verktyg för att utforska och visualisera
prognoser för Sveriges framtida elbehov. Projektet kombinerar historisk data,
elektrifieringsscenarier och avancerad visualisering för att ge insikter om hur
elefterfrågan kan utvecklas fram till 2050.

Verktyget riktar sig till beslutsfattare, energianalytiker, forskare och alla som är
intresserade av Sveriges energiomställning. Genom att visualisera olika scenarier kan
användare förstå osäkerheten i prognoserna och hur olika antaganden påverkar
resultatet.

## Metodik

#### Datakällor

Prognoserna bygger på historisk data från SCB, Energimyndigheten och Svenska
Kraftnät. Tidsserier för elförbrukning kombineras med demografiska prognoser,
ekonomiska indikatorer och teknologiska utvecklingstrender.

#### Scenariobyggnad

Varje scenario representerar ett möjligt utvecklingsförlopp med olika antaganden om:

- Elektrifieringstakt för transporter (personbilar, lastbilar, bussar)
- Industriell omställning och processelektrifiering
- Befolkningsutveckling och urbanisering
- Energieffektiviseringstakt i byggnader
- Ekonomisk tillväxt och produktionsutveckling

#### Tidsupplösning

Prognoserna genereras med timupplösning för att fånga variationer i effektbehov över
dygnet och året. Detta är kritiskt för att förstå dimensioneringsbehov för elnätet
och flexibilitetsresurser.

## Teknisk implementation

Projektet är byggt som en modern webbapplikation med fokus på prestanda,
tillgänglighet och användarvänlighet:

#### Frontend

- SvelteKit 5 med TypeScript
- LayerChart för visualiseringar
- Tailwind CSS för styling
- Server-side rendering (SSR)

#### Backend & Data

- OpenAPI 3.1 REST API
- DuckDB för datalagring
- Python för datagenerering
- Statiska endpoints för prestanda

All kod är öppen källkod och tillgänglig på GitHub. Projektet är strukturerat som en
monorepo med tydlig separation mellan datagenerering, API och frontend.

## Upphovsrätt och kontakt

Detta verktyg utvecklas som ett öppet projekt för att göra energiprognoser mer
tillgängliga och användbara. Projektet är licensierat under MIT-licensen.

#### Att citera verktyget

> Energy Toolkit: Demand (2025). Interaktivt visualiseringsverktyg för Sveriges
> elbehov. https://github.com/yourusername/behovskartan

#### Begränsningar

Prognoserna i detta verktyg är modellbaserade och innehåller betydande osäkerheter.
De ska användas som underlag för diskussion och analys, inte som exakta
förutsägelser. Användare uppmuntras att:

- Jämföra flera scenarier för att förstå osäkerhetsintervallet
- Förstå de antaganden som ligger till grund för varje scenario
- Komplettera med andra analyser och expertbedömningar
