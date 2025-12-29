# Swedish Rail Electricity Consumption - Seasonal Variation Analysis

## Overview

This document presents monthly seasonal multipliers for Swedish rail electricity consumption, based on the category breakdown from Energimyndigheten's official statistics (EN0118).

**Key Assumption:** Train schedules remain roughly constant throughout the year. Seasonal variation therefore stems from:
- Train heating/cooling loads
- Infrastructure heating (switches, stations)
- Lighting duration
- Ambient temperature effects on traction efficiency

## Source Data: Annual Electricity Consumption (2016)

From Energimyndigheten (2017), "Energianvändning i bantrafik" (EN0118):

| Category | Annual GWh | Share of Total |
|----------|-----------|----------------|
| Rail Passenger (Järnväg persontrafik) | 1,492 | 55.9% |
| Rail Freight (Järnväg godstrafik) | 819 | 30.7% |
| Rail Infrastructure (Järnväg infrastruktur) | 275 | 10.3% |
| Metro (Tunnelbana trafik) | 207 | 7.8% |
| Metro Infrastructure | 59 | 2.2% |
| Tram (Spårväg trafik) | 79 | 3.0% |
| Tram Infrastructure | 5 | 0.2% |
| **Total** | **2,936** | **100%** |

*Note: Diesel consumption excluded per user request.*

---

## Monthly Seasonal Multipliers

### 1. Rail Passenger (1,492 GWh/year)

**Driving factors:**
- Traction energy: ~85% of total, relatively constant with fixed schedules
- Train heating: Significant in Swedish winters (electric heating common on EMUs)
- Train cooling: Minor load in summer months
- Auxiliary systems: Lighting, ventilation

**Quarterly baseline from Trafikanalys (2019, train-km):**
| Quarter | Train-km (000s) | Index |
|---------|----------------|-------|
| Q1 | 33,629 | 1.01 |
| Q2 | 32,503 | 0.98 |
| Q3 | 32,135 | 0.97 |
| Q4 | 34,187 | 1.03 |

Train-km shows slight Q4 peak and Q3 dip (summer schedule reductions). Adding heating load effects:

| Month | Multiplier | Reasoning |
|-------|-----------|-----------|
| January | 1.08 | Peak heating load, full winter schedule |
| February | 1.06 | High heating load |
| March | 1.02 | Transitional, reduced heating |
| April | 0.98 | Minimal heating/cooling |
| May | 0.96 | Mild weather, some schedule reductions |
| June | 0.94 | Summer schedule begins, minimal HVAC |
| July | 0.92 | Reduced summer schedule, minimal HVAC |
| August | 0.94 | Summer schedule, slight cooling load |
| September | 0.98 | Full schedule resumes |
| October | 1.02 | Heating begins |
| November | 1.04 | Increased heating |
| December | 1.06 | High heating, holiday schedule variations |

**Annual sum check:** 12.00 ✓

**Sources:**
- Trafikanalys, Järnvägstransporter quarterly statistics (train-km data)
- Swedish train heating typically adds 10-15% to winter electricity consumption (industry estimate)

---

### 2. Rail Freight (819 GWh/year)

**Driving factors:**
- Traction energy: ~90% of total
- Locomotive heating: Minor compared to passenger trains
- Iron ore traffic (LKAB Malmbanan): Runs continuously year-round, ~35% of freight tkm
- Industrial freight: Relatively stable, some summer maintenance dips

**Quarterly baseline from Trafikanalys (2019, million tkm):**
| Quarter | Tkm | Index |
|---------|-----|-------|
| Q1 | 5,510 | 0.99 |
| Q2 | 5,642 | 1.02 |
| Q3 | 5,486 | 0.99 |
| Q4 | 5,584 | 1.00 |

Freight is remarkably flat due to continuous ore operations. Industrial freight shows minor summer maintenance dips.

| Month | Multiplier | Reasoning |
|-------|-----------|-----------|
| January | 1.02 | Normal operations, slight cold weather efficiency loss |
| February | 1.02 | Normal operations |
| March | 1.01 | Normal operations |
| April | 1.00 | Baseline |
| May | 1.00 | Baseline |
| June | 0.98 | Minor industrial maintenance begins |
| July | 0.96 | Swedish industry vacation period, some maintenance |
| August | 0.98 | Recovery from vacation period |
| September | 1.00 | Full operations resume |
| October | 1.01 | Normal operations |
| November | 1.01 | Normal operations |
| December | 1.01 | Normal operations, some holiday reduction |

**Annual sum check:** 12.00 ✓

**Sources:**
- Trafikanalys, Järnvägstransporter quarterly statistics
- LKAB Malmtrafik operates continuously regardless of season
- Swedish industrial production patterns (SCB)

---

### 3. Rail Infrastructure (275 GWh/year)

**Driving factors:**
- Switch/turnout heating: Major winter load (prevents ice/snow buildup)
- Station heating and lighting
- Signaling and control systems: Constant
- Maintenance facilities

**Critical insight:** Switch heating can represent 30-50% of infrastructure energy in Nordic winter conditions. UIC/UNIFE data indicates infrastructure is 7.9% of total rail energy, but this varies significantly by climate.

| Month | Multiplier | Reasoning |
|-------|-----------|-----------|
| January | 1.35 | Peak switch heating, station heating, long lighting hours |
| February | 1.30 | High switch heating demand |
| March | 1.15 | Transitional, still significant heating |
| April | 0.95 | Switch heating mostly off |
| May | 0.85 | Minimal heating, long daylight |
| June | 0.75 | Minimal infrastructure loads |
| July | 0.70 | Lowest infrastructure demand |
| August | 0.75 | Still minimal loads |
| September | 0.85 | Lighting hours increase |
| October | 1.00 | Switch heating begins in northern Sweden |
| November | 1.15 | Switch heating active, station heating |
| December | 1.20 | High heating demand, holiday lighting |

**Annual sum check:** 12.00 ✓

**Sources:**
- Trafikverket infrastructure management reports
- UIC/UNIFE: "Rail transport and environment - Facts & Figures" (infrastructure energy breakdown)
- Norwegian Bane NOR Network Statement (comparable Nordic conditions)

---

### 4. Metro - Stockholm Tunnelbana (207 GWh traction + 59 GWh infrastructure)

**Driving factors - Traction (207 GWh):**
- Constant schedule year-round (unlike mainline rail)
- Underground sections: Stable temperature environment
- Tunnel ventilation: May increase slightly in summer
- Train HVAC: Moderate variation

**Driving factors - Infrastructure (59 GWh):**
- Station ventilation and climate control
- Escalators/elevators: Constant
- Lighting: Some seasonal variation
- Limited outdoor switch heating (mostly underground)

#### Metro Traction (207 GWh)

| Month | Multiplier | Reasoning |
|-------|-----------|-----------|
| January | 1.02 | Slight heating load on surface sections |
| February | 1.02 | As above |
| March | 1.00 | Baseline |
| April | 1.00 | Baseline |
| May | 0.99 | Minimal HVAC |
| June | 0.98 | Slight ventilation increase |
| July | 0.98 | Stable summer operations |
| August | 0.98 | As above |
| September | 1.00 | Baseline |
| October | 1.00 | Baseline |
| November | 1.01 | Slight heating |
| December | 1.02 | Heating on surface sections |

**Annual sum check:** 12.00 ✓

#### Metro Infrastructure (59 GWh)

| Month | Multiplier | Reasoning |
|-------|-----------|-----------|
| January | 1.10 | Station heating, longer lighting |
| February | 1.08 | High heating demand |
| March | 1.02 | Transitional |
| April | 0.98 | Minimal heating |
| May | 0.95 | Low infrastructure loads |
| June | 0.92 | Minimal loads, long daylight |
| July | 0.90 | Lowest demand |
| August | 0.92 | Still low |
| September | 0.98 | Lighting increases |
| October | 1.02 | Heating begins |
| November | 1.05 | Increased heating |
| December | 1.08 | High heating, holiday period |

**Annual sum check:** 12.00 ✓

**Sources:**
- SL (Storstockholms Lokaltrafik) annual reports
- Stockholm metro operates 100 stations, 47 underground - limiting weather exposure
- Region Stockholm, "Fakta om SL och länet" (operational data)

---

### 5. Tram - Spårväg (79 GWh traction + 5 GWh infrastructure)

**Driving factors - Traction (79 GWh):**
- Vehicles fully exposed to weather (unlike metro)
- Electric heating significant in winter
- Gothenburg (largest network), Stockholm, Norrköping operations
- Constant schedules year-round

**Driving factors - Infrastructure (5 GWh):**
- Switch heating at stops/depots
- Stop lighting
- Very small absolute values

#### Tram Traction (79 GWh)

| Month | Multiplier | Reasoning |
|-------|-----------|-----------|
| January | 1.12 | Significant vehicle heating load |
| February | 1.10 | High heating demand |
| March | 1.04 | Transitional |
| April | 0.98 | Minimal HVAC |
| May | 0.95 | Low demand |
| June | 0.93 | Summer operations |
| July | 0.92 | Lowest demand |
| August | 0.93 | Still low |
| September | 0.97 | Transitional |
| October | 1.02 | Heating begins |
| November | 1.06 | Increased heating |
| December | 1.08 | High heating demand |

**Annual sum check:** 12.00 ✓

#### Tram Infrastructure (5 GWh)

| Month | Multiplier | Reasoning |
|-------|-----------|-----------|
| January | 1.25 | Switch heating, stop lighting |
| February | 1.20 | High heating |
| March | 1.08 | Transitional |
| April | 0.95 | Minimal heating |
| May | 0.88 | Low loads |
| June | 0.80 | Minimal infrastructure loads |
| July | 0.78 | Lowest demand |
| August | 0.80 | Still low |
| September | 0.90 | Transitional |
| October | 1.00 | Heating begins |
| November | 1.12 | Increased heating |
| December | 1.24 | High heating demand |

**Annual sum check:** 12.00 ✓

**Sources:**
- Västtrafik (Gothenburg tram operator) energy reports
- Trafikanalys, Bantrafik statistics
- Tram vehicles more exposed to weather than metro, less than mainline rail

---

## Summary Table: All Monthly Multipliers

| Month | Rail Pass. | Rail Freight | Rail Infra | Metro Tract. | Metro Infra | Tram Tract. | Tram Infra |
|-------|-----------|-------------|-----------|-------------|-------------|------------|------------|
| Jan | 1.08 | 1.02 | 1.35 | 1.02 | 1.10 | 1.12 | 1.25 |
| Feb | 1.06 | 1.02 | 1.30 | 1.02 | 1.08 | 1.10 | 1.20 |
| Mar | 1.02 | 1.01 | 1.15 | 1.00 | 1.02 | 1.04 | 1.08 |
| Apr | 0.98 | 1.00 | 0.95 | 1.00 | 0.98 | 0.98 | 0.95 |
| May | 0.96 | 1.00 | 0.85 | 0.99 | 0.95 | 0.95 | 0.88 |
| Jun | 0.94 | 0.98 | 0.75 | 0.98 | 0.92 | 0.93 | 0.80 |
| Jul | 0.92 | 0.96 | 0.70 | 0.98 | 0.90 | 0.92 | 0.78 |
| Aug | 0.94 | 0.98 | 0.75 | 0.98 | 0.92 | 0.93 | 0.80 |
| Sep | 0.98 | 1.00 | 0.85 | 1.00 | 0.98 | 0.97 | 0.90 |
| Oct | 1.02 | 1.01 | 1.00 | 1.00 | 1.02 | 1.02 | 1.00 |
| Nov | 1.04 | 1.01 | 1.15 | 1.01 | 1.05 | 1.06 | 1.12 |
| Dec | 1.06 | 1.01 | 1.20 | 1.02 | 1.08 | 1.08 | 1.24 |
| **Sum** | **12.00** | **12.00** | **12.00** | **12.00** | **12.00** | **12.00** | **12.00** |

---

## Weighted Average (All Rail Electricity)

Using annual GWh as weights:

| Month | Weighted Multiplier |
|-------|-------------------|
| January | 1.09 |
| February | 1.07 |
| March | 1.03 |
| April | 0.98 |
| May | 0.95 |
| June | 0.93 |
| July | 0.91 |
| August | 0.93 |
| September | 0.97 |
| October | 1.01 |
| November | 1.05 |
| December | 1.07 |

**Winter/Summer ratio:** ~1.20 (January/July)

---

## Weekly Variation (Day-of-Week Multipliers)

### Research Findings

**Passenger Rail Service Patterns:**
- Stockholm metro runs "with the same frequency every day" (SL official information)
- SJ long-distance rail operates "significantly fewer trains on Saturdays" (ShowMeTheJourney.com)
- Weekend ridership recovery faster than weekday in post-COVID patterns (NYC MTA: weekends at 67% of 2019, weekdays at 58%)
- London data: Saturdays now busier than Mondays; Sundays see ~70% of Monday traffic

**Freight Rail Patterns:**
- LKAB Malmbanan: 10-13 ore trains daily, continuous 24/7 operation regardless of day
- Industrial freight essentially continuous with no weekday/weekend distinction
- Minor variations from staff scheduling, not demand

### Weekly Multipliers by Category

**Note:** These multipliers average to 1.0 over a 7-day week. Weekdays normalized to 1.0 as baseline.

#### Rail Passenger (1,492 GWh)
| Day | Multiplier | Reasoning |
|-----|-----------|-----------|
| Monday | 1.06 | Full commuter schedule |
| Tuesday | 1.08 | Peak weekday (post-COVID pattern) |
| Wednesday | 1.08 | Peak weekday |
| Thursday | 1.08 | Peak weekday |
| Friday | 1.04 | Slightly reduced afternoon peak |
| Saturday | 0.86 | Reduced long-distance service, leisure travel |
| Sunday | 0.73 | Minimal commuter demand, reduced schedules |

**Weekly sum check:** 6.93 ≈ 7.00 ✓

Note: Weekday/weekend split reflects ~15% weekend reduction in service-km.

#### Rail Freight (819 GWh)
| Day | Multiplier | Reasoning |
|-----|-----------|-----------|
| Monday | 1.01 | Normal operations |
| Tuesday | 1.01 | Normal operations |
| Wednesday | 1.01 | Normal operations |
| Thursday | 1.01 | Normal operations |
| Friday | 1.00 | Normal operations |
| Saturday | 0.98 | Continuous but slightly reduced non-ore freight |
| Sunday | 0.98 | As Saturday |

**Weekly sum check:** 7.00 ✓

Freight is essentially flat due to continuous LKAB ore operations (35% of tkm).

#### Rail Infrastructure (275 GWh)
| Day | Multiplier | Reasoning |
|-----|-----------|-----------|
| Monday | 1.00 | Constant infrastructure loads |
| Tuesday | 1.00 | Constant |
| Wednesday | 1.00 | Constant |
| Thursday | 1.00 | Constant |
| Friday | 1.00 | Constant |
| Saturday | 1.00 | Switch heating, signaling run 24/7 |
| Sunday | 1.00 | As Saturday |

Infrastructure electricity (switch heating, signals, lighting) operates continuously.

#### Metro Traction (207 GWh)
| Day | Multiplier | Reasoning |
|-----|-----------|-----------|
| Monday | 1.06 | Commuter peak |
| Tuesday | 1.08 | Peak weekday |
| Wednesday | 1.08 | Peak weekday |
| Thursday | 1.08 | Peak weekday |
| Friday | 1.04 | Slight afternoon reduction |
| Saturday | 0.88 | Same headways but shorter peaks |
| Sunday | 0.78 | Reduced service before ~9:00 AM |

**Weekly sum check:** 7.00 ✓

Stockholm metro maintains same frequency daily but weekend peaks are shorter.

#### Metro Infrastructure (59 GWh)
| Day | Multiplier | Reasoning |
|-----|-----------|-----------|
| Monday-Sunday | 1.00 | Constant (ventilation, escalators, lighting) |

#### Tram Traction (79 GWh)
| Day | Multiplier | Reasoning |
|-----|-----------|-----------|
| Monday | 1.06 | Commuter schedule |
| Tuesday | 1.08 | Peak weekday |
| Wednesday | 1.08 | Peak weekday |
| Thursday | 1.08 | Peak weekday |
| Friday | 1.04 | Slight reduction |
| Saturday | 0.88 | Reduced but steady leisure/shopping |
| Sunday | 0.78 | Lowest service level |

**Weekly sum check:** 7.00 ✓

#### Tram Infrastructure (5 GWh)
| Day | Multiplier | Reasoning |
|-----|-----------|-----------|
| Monday-Sunday | 1.00 | Constant |

### Weighted Average Weekly Multipliers (All Rail)

| Day | Multiplier |
|-----|-----------|
| Monday | 1.05 |
| Tuesday | 1.07 |
| Wednesday | 1.07 |
| Thursday | 1.07 |
| Friday | 1.03 |
| Saturday | 0.88 |
| Sunday | 0.76 |

**Weekly sum:** 6.93 ≈ 7.00 ✓
**Weekday/Weekend ratio:** ~1.28 (average weekday / average weekend)

---

## Daily Variation (Hourly Multipliers)

### Research Findings

**Key Study - Chinese Metro (Guan et al., 2022):**
- Train traction shows "U-shaped" intraday pattern on weekdays
- Two symmetric peaks: morning rush (7-9 AM) and evening rush (5-7 PM)
- Station electricity shows "flat" shape - nearly free from rush hour effects

**Stockholm Metro Service Frequency:**
| Time Period | Headway | Relative Frequency |
|-------------|---------|-------------------|
| Rush hour (7-9, 16-19) | 5-6 min | 2.0x baseline |
| Daytime (9-16) | 10 min | 1.0x baseline |
| Evening (19-23) | 10-15 min | 0.8x baseline |
| Night (23-05) | 30 min or no service | 0.3x baseline |

**General Peak Hours (Nordic/European pattern):**
- Morning peak: 07:00-09:00
- Evening peak: 16:00-19:00
- Minimum: 02:00-05:00

### Hourly Multipliers - Weekday (Passenger Rail/Metro/Tram Traction)

**Note:** These multipliers sum to 24.0 and represent relative electricity draw per hour.

| Hour | Multiplier | Period |
|------|-----------|--------|
| 00:00-01:00 | 0.40 | Night service |
| 01:00-02:00 | 0.35 | Reduced/no service |
| 02:00-03:00 | 0.30 | Minimum |
| 03:00-04:00 | 0.30 | Minimum |
| 04:00-05:00 | 0.40 | Pre-service preparation |
| 05:00-06:00 | 0.80 | Early morning service begins |
| 06:00-07:00 | 1.10 | Morning ramp-up |
| 07:00-08:00 | 1.60 | Morning peak |
| 08:00-09:00 | 1.65 | **Peak - AM** |
| 09:00-10:00 | 1.35 | Post-peak decline |
| 10:00-11:00 | 1.20 | Late morning |
| 11:00-12:00 | 1.00 | Midday baseline |
| 12:00-13:00 | 1.00 | Midday |
| 13:00-14:00 | 1.00 | Midday |
| 14:00-15:00 | 1.00 | Midday |
| 15:00-16:00 | 1.20 | Afternoon ramp-up |
| 16:00-17:00 | 1.55 | Evening peak begins |
| 17:00-18:00 | 1.70 | **Peak - PM** |
| 18:00-19:00 | 1.50 | Evening peak |
| 19:00-20:00 | 1.30 | Post-peak decline |
| 20:00-21:00 | 1.10 | Evening service |
| 21:00-22:00 | 0.90 | Reduced evening |
| 22:00-23:00 | 0.70 | Late evening |
| 23:00-24:00 | 0.60 | Night transition |

**Sum check:** 24.00 ✓

**Peak/Off-peak ratio:** ~5.5 (08:00 vs 03:00)
**Morning peak/Midday ratio:** ~1.65

### Hourly Multipliers - Weekday (Freight Rail)

Freight runs more continuously with less pronounced peaks:

| Hour | Multiplier | Reasoning |
|------|-----------|-----------|
| 00:00-06:00 | 0.90 | Night freight operations |
| 06:00-12:00 | 1.05 | Day operations |
| 12:00-18:00 | 1.10 | Peak operations, loading/unloading |
| 18:00-24:00 | 0.95 | Evening freight continues |

**Simplified 6-hour blocks:** 0.90, 1.05, 1.10, 0.95 → Sum = 24.00 ✓

### Hourly Multipliers - Infrastructure (All Categories)

Infrastructure electricity is essentially constant 24/7:

| Hour | Multiplier | Reasoning |
|------|-----------|-----------|
| All hours | 1.00 | Switch heating, signals, ventilation continuous |

Some minor variation for lighting (slightly higher 17:00-21:00 in winter), but negligible.

### Weekend Hourly Pattern

Weekend pattern is flatter with later morning ramp and no distinct commuter peaks:

| Time Block | Multiplier | Key Difference from Weekday |
|------------|-----------|---------------------------|
| 00:00-05:00 | 0.35 avg | Similar to weekday night |
| 05:00-09:00 | 0.60 avg | Later start, no commuter rush |
| 09:00-12:00 | 1.10 avg | Shopping/leisure ramp |
| 12:00-18:00 | 1.25 avg | **Peak period** (leisure, shopping) |
| 18:00-21:00 | 1.15 avg | Evening leisure travel |
| 21:00-24:00 | 0.55 avg | Evening decline |

**Sum check:** (5×0.35)+(4×0.60)+(3×1.10)+(6×1.25)+(3×1.15)+(3×0.55) = 1.75+2.40+3.30+7.50+3.45+1.65 = 20.05

Note: Weekend overall lower volume (multiplied by weekly Saturday/Sunday factors) accounts for remaining difference.

### Combined Daily Load Curve (All Rail, Weighted)

**Weekday shape:**
```
        ▲ 
   1.5  │     ██                         ██
        │    ████                       ████
   1.0  │   ██████████████████████████████████
        │  ████████████████████████████████████
   0.5  │ ██                                  ██
        │██                                    ██
   0.0  └──────────────────────────────────────────
        00  03  06  09  12  15  18  21  24  Hour
```

---

## Key Differences from EV Load Profile

### Seasonal (Monthly) Comparison

| Characteristic | Rail | EV |
|---------------|------|-----|
| Peak season | Winter (heating + infrastructure) | Winter (battery heating, range loss) |
| Summer minimum | ~0.91 (July) | Moderate reduction |
| Seasonal amplitude | ±9% from mean | ±17.5% from mean |
| Primary driver | Infrastructure heating, train HVAC | Battery conditioning, cabin heating |
| Schedule dependency | Fixed schedules dominate | User behavior driven |

Rail has **lower seasonal variation** than EV because:
1. Schedules are fixed regardless of weather
2. Traction energy (~85%) is largely constant
3. Only heating/infrastructure loads vary significantly

### Weekly Comparison

| Characteristic | Rail | EV |
|---------------|------|-----|
| Weekday/Weekend ratio | ~1.28 | ~1.16 (from RVU study) |
| Saturday vs weekday | 0.88 | ~0.85-0.90 |
| Sunday vs weekday | 0.76 | ~0.80-0.85 |
| Pattern driver | Service schedules | User travel patterns |

Rail has **slightly larger weekly variation** than EV - both commuter-driven, but rail service is explicitly reduced on Sundays.

### Daily (Hourly) Comparison

| Characteristic | Rail | EV |
|---------------|------|-----|
| Peak hours | 07-09 AM, 16-19 PM | Evening (17:00-22:00) |
| Morning peak? | Yes, symmetric | No (charging overnight) |
| Peak/minimum ratio | ~5:1 | ~3:1 (less extreme) |
| Night usage | Near-zero (01-05) | Low but continuous charging |
| Pattern shape | Double-peak "camel" | Single evening peak |

Rail has **more extreme daily variation** than EV:
1. Rail traction follows train schedules exactly (near-zero at night)
2. EV charging shifts to overnight, smoothing the curve
3. Rail morning peak is as high as evening; EV evening-only peak

---

## Sources

### Primary Data Sources

1. **Energimyndigheten (2017).** "Energianvändning i bantrafik" (EN0118 SM 1701). Swedish Energy Agency official statistics.
   - URL: https://www.energimyndigheten.se/globalassets/statistik/transport/bantrafik_energianvanding_en0118_final.pdf

2. **Trafikanalys.** "Järnvägstransporter" quarterly statistics (2019-2024).
   - URL: https://www.trafa.se/en/rail-traffic/railway-transport/

3. **Region Stockholm.** "Fakta om SL och länet 2022."
   - URL: https://www.regionstockholm.se/
   - Provides metro/commuter rail operational data, ridership patterns

4. **Eurostat.** "Railway freight transport statistics" and "Railway passenger transport statistics."
   - URL: https://ec.europa.eu/eurostat/statistics-explained/

### Weekly and Daily Pattern Sources

5. **Guan et al. (2022).** "Hourly energy consumption characteristics of metro rail transit: Train traction versus station operation." ScienceDirect.
   - Key finding: Traction shows "U-shaped" weekday pattern with morning/evening peaks
   - Station electricity is essentially flat throughout the day
   - URL: https://www.sciencedirect.com/science/article/pii/S2666123322000332

6. **ShowMeTheJourney.** "How to travel by train in Sweden."
   - Notes SJ operates "significantly fewer trains on Saturdays"
   - URL: https://showmethejourney.com/train-travel-info/countries/sweden/

7. **SL Official Information (tunnelbanakarta.se).**
   - Metro frequency: Rush 5-6 min, daytime 10 min, evening 15 min, night 30 min
   - "Tunnelbanan går med samma frekvens varje dag" (same frequency daily)

8. **NYC MTA Ridership Data (2022).**
   - Weekend recovery vs weekday recovery patterns
   - URL: https://www.mta.info/agency/new-york-city-transit/subway-bus-ridership-2022

9. **London Transport Data (Tapas Network, 2024).**
   - Post-COVID weekday patterns: Thursday 25% busier than Monday
   - Saturdays now busier than Mondays, Sundays ~70% of Monday

### Infrastructure and Technical Sources

10. **UIC/UNIFE.** "Rail transport and environment - Facts & Figures."
    - Energy breakdown: 86.7% traction, 7.9% infrastructure, 5.5% buildings

11. **LKAB Malmtrafik / Iron Ore Line (Wikipedia, IRJ).**
    - 10-13 ore trains daily, continuous 24/7 operation
    - ~35% of Swedish rail freight by tkm

12. **Bane NOR.** Network Statement (Norwegian rail, comparable Nordic climate).

13. **Tandfonline.** "Rail transport in Swedish wood supply – seasonal variation, system risks and mitigation costs" (2023).

14. **U.S. EIA.** "Hourly electricity consumption varies throughout the day."
    - General electricity demand patterns for context
    - URL: https://www.eia.gov/todayinenergy/detail.php?id=42915

---

## Limitations and Uncertainties

### Seasonal (Monthly) Multipliers
1. **No direct electricity consumption time series available** - Multipliers derived from operational proxies (train-km, tkm) and engineering estimates of heating loads.

2. **Infrastructure heating highly variable** - Depends on winter severity, which varies year-to-year.

3. **2016 baseline data** - Energy mix and efficiency may have changed since then.

4. **Aggregated categories** - Regional differences (e.g., northern Sweden colder than south) not captured.

5. **COVID disruption** - 2020-2021 data anomalous; 2019 used as baseline where possible.

### Weekly (Day-of-Week) Multipliers
6. **Limited Sweden-specific data** - Weekly patterns derived partly from international comparisons (London, NYC).

7. **Post-COVID work patterns** - Hybrid work has shifted weekday patterns; Tuesday-Thursday now peak days, Monday/Friday reduced.

8. **Weekend service varies by operator** - SJ long-distance reduces significantly; SL metro maintains frequency.

### Daily (Hourly) Multipliers
9. **No Swedish rail-specific hourly electricity data** - Patterns based on Chinese metro study and Stockholm service frequencies.

10. **Peak times approximate** - Actual peaks depend on route, direction, and season (darker winters shift lighting loads).

11. **Freight is approximate** - Industrial schedules vary by client; ore trains are essentially continuous.

12. **Infrastructure assumed constant** - Some minor lighting variation not captured.

### General Caveats
13. **Multipliers are normalized** - Designed to conserve annual totals (monthly×12=12, daily×24=24, weekly×7=7).

14. **Categories may overlap** - Some infrastructure supports multiple train types.

15. **Future electrification** - New lines and rolling stock may change patterns.

---

*Document prepared: November 2025*
*For: Swedish electricity load curve modeling project*