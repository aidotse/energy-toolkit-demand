# Chart Library Page Redesign Plan

**Created:** 2025-10-09
**Status:** Planning

## Overview

Redesign the `/charts` page to support flexible layouts, per-chart parameter overrides, and better visual organization.

## Goals

1. **Flexible Layout**: Support different chart sizes (some full-width, some in 2x2 grids)
2. **Per-Chart Parameters**: Each chart can override global settings with visual indication
3. **Reusable Controls**: Create components that work across different contexts
4. **Map Integration**: Add map component in a card (not fixed to page)
5. **Fix Current Issues**: Debug why only 2 charts are displaying data

---

## Phase 1: Debug and Fix Current Issues ✅ COMPLETE

**Goal:** Identify and fix why charts aren't displaying data

**Tasks:**
- [x] Check browser console for errors when loading /charts page
- [x] Verify all charts are receiving correct props
- [x] Check if data fetching is working (network tab)
- [x] Fix any TypeScript/prop mismatch errors
- [x] Test with different geography/year selections

**Issues Found & Fixed:**
1. Missing `scenario` prop on all charts
2. Charts needed `scenarioState.currentScenario` or explicit scenario prop
3. Wrong geography/segment values: Used `'all'` instead of `'total'`
4. Histogram infinite loop: `hourData` prop being reassigned
5. Stack overflow in `calculateHistogram`: Spread operator on large arrays

**Changes Made:**
- Added scenario derivation logic in +page.svelte
- Changed geography/segment defaults from `'all'` to `'total'`
- Fixed Histogram prop pattern: `data: hourDataProp` → separate `$state()`
- Optimized calculateHistogram to use loop instead of spread operator

---

## Phase 2: Create Reusable Control Components

**Goal:** Build atomic control components that can be used anywhere

### 2.1 YearSelector Component

**File:** `/lib/components/controls/YearSelector.svelte`

**Props:**
```typescript
interface YearSelectorProps {
  value: number;                  // Selected year
  years?: number[];               // Available years (from parameters)
  onChange: (year: number) => void;
  variant?: 'dropdown' | 'slider' | 'pill';
  size?: 'sm' | 'md' | 'lg';
  class?: string;
}
```

**Features:**
- Dropdown: Standard select dropdown
- Slider: Range slider with year labels
- Pill: Compact pill-based selector
- Keyboard navigation support
- ARIA labels for accessibility

---

### 2.2 SegmentSelector Component

**File:** `/lib/components/controls/SegmentSelector.svelte`

**Props:**
```typescript
interface SegmentSelectorProps {
  value: string;                  // Selected segment ('all', 'housing', 'transport', 'industry')
  segments?: string[];            // Available segments (from parameters)
  onChange: (segment: string) => void;
  variant?: 'dropdown' | 'pills' | 'radio';
  size?: 'sm' | 'md' | 'lg';
  class?: string;
}
```

**Features:**
- Dropdown: Standard select dropdown
- Pills: Horizontal pill buttons
- Radio: Radio button group
- Icons for each segment type (house, car, factory)
- Keyboard navigation

---

### 2.3 ResolutionSelector Component

**File:** `/lib/components/controls/ResolutionSelector.svelte`

**Props:**
```typescript
interface ResolutionSelectorProps {
  value: string;                  // Selected resolution ('1h', '1d', '1w', '1M', '1Y')
  resolutions?: string[];         // Available resolutions
  onChange: (resolution: string) => void;
  variant?: 'dropdown' | 'pills';
  size?: 'sm' | 'md' | 'lg';
  class?: string;
}
```

**Features:**
- Display human-readable labels: "Hourly", "Daily", "Weekly", "Monthly", "Yearly"
- Pill variant for compact horizontal display
- Dropdown variant for space-constrained contexts

---

### 2.4 AggregationSelector Component

**File:** `/lib/components/controls/AggregationSelector.svelte`

**Props:**
```typescript
interface AggregationSelectorProps {
  value: string;                  // Selected aggregation ('sum', 'mean', 'max')
  aggregations?: string[];        // Available aggregations
  onChange: (aggregation: string) => void;
  variant?: 'dropdown' | 'pills';
  size?: 'sm' | 'md' | 'lg';
  class?: string;
}
```

**Features:**
- Display: "Sum (Energy)", "Mean (Avg Power)", "Max (Peak Power)"
- Context-aware labels based on resolution
- Tooltips explaining each aggregation type

---

### 2.5 GeographySelector Component (Enhanced)

**File:** `/lib/components/controls/GeographySelector.svelte`

**Notes:** We already have `GeoSelect.svelte`, but may need:
- Pill variant for compact display
- Multi-select mode for comparison
- Search/filter functionality
- Grouped by region (if applicable)

**Reuse existing:** Likely wrap/enhance existing `GeoSelect` component

---

## Phase 3: Chart Parameter Override System

**Goal:** Allow each chart to override global parameters with visual feedback

### 3.1 ChartParameterPill Component

**File:** `/lib/components/charts/ChartParameterPill.svelte`

**Purpose:** Compact pill that shows current parameters and opens editor

**Visual States:**
1. **Default (using global parameters):**
   ```
   [Geography: All | Year: 2030 | Scenario: Default ▼]
   ```
   - Gray/neutral colors
   - Subtle border
   - Chevron down icon

2. **Overridden (chart has custom parameters):**
   ```
   [Geography: Stockholm | Year: 2035 | Scenario: High ⚠ ▼ ✕]
   ```
   - Accent color (blue/green)
   - Warning icon indicating override
   - X button to reset
   - Chevron down to edit

3. **Dropdown Open:**
   - Overlay dropdown panel
   - Grid of parameter controls
   - "Apply" and "Reset to Global" buttons

**Props:**
```typescript
interface ChartParameterPillProps {
  // Global parameters (from page/store)
  globalParams: ChartParameters;

  // Chart-specific overrides (null if using global)
  localParams?: Partial<ChartParameters> | null;

  // Callback when parameters change
  onChange: (params: Partial<ChartParameters> | null) => void;

  // Available options for each parameter
  availableYears?: number[];
  availableSegments?: string[];
  availableGeographies?: string[];
  availableResolutions?: string[];
  availableAggregations?: string[];

  // Visual
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  size?: 'sm' | 'md';
  class?: string;
}

interface ChartParameters {
  geography: string;
  year: number;
  segment?: string;
  resolution?: string;
  aggregation?: string;
  // scenario is handled globally by scenario selector
}
```

**Dropdown Layout:**
```
┌─────────────────────────────────────┐
│ Chart Parameters                    │
├─────────────────────────────────────┤
│ Geography:  [Dropdown ▼]            │
│ Year:       [2025 ←─●───→ 2050]     │
│ Segment:    [All][Housing][Transp.] │
│ Resolution: [1h][1d][1w][1M][1Y]    │
│ Aggregation:[Sum][Mean][Max]        │
├─────────────────────────────────────┤
│ [Reset to Global]     [Apply]       │
└─────────────────────────────────────┘
```

---

### 3.2 Update Chart Components

**Goal:** All chart components accept both global and local parameters

**Pattern:**
```typescript
let {
  // Can receive direct props (for global parameters)
  geography: geographyProp,
  year: yearProp,
  segment: segmentProp,
  resolution: resolutionProp = '1h',
  aggregation: aggregationProp = 'sum',

  // OR receive parameter override object
  parameters,

  // Scenarios always from global store
  scenarios,
  comparisonMode,

  class: className = ''
}: ChartProps = $props();

// Resolve effective parameters (local override takes precedence)
const geography = $derived(parameters?.geography || geographyProp);
const year = $derived(parameters?.year || yearProp);
const segment = $derived(parameters?.segment || segmentProp);
const resolution = $derived(parameters?.resolution || resolutionProp);
const aggregation = $derived(parameters?.aggregation || aggregationProp);
```

**Tasks:**
- [ ] Update `AreaChart.svelte` to accept parameter overrides
- [ ] Update `TimeLine.svelte` to accept parameter overrides
- [ ] Update `Histogram.svelte` to accept parameter overrides
- [ ] Update `SectorArc.svelte` to accept parameter overrides
- [ ] Update `GeoBarChart.svelte` to accept parameter overrides
- [ ] Update `ChartComponent.interface.ts` with new parameter pattern

---

### 3.3 Chart Parameter Store

**File:** `/lib/stores/chartParameters.svelte.ts`

**Purpose:** Store per-chart parameter overrides

```typescript
import { SvelteMap } from 'svelte/reactivity';

class ChartParametersStore {
  // Map of chartId -> parameter overrides
  private overrides = $state(new SvelteMap<string, Partial<ChartParameters>>());

  // Get parameters for a chart (returns null if using global)
  getParameters(chartId: string) {
    return this.overrides.get(chartId) || null;
  }

  // Set parameter overrides for a chart
  setParameters(chartId: string, params: Partial<ChartParameters> | null) {
    if (params === null) {
      this.overrides.delete(chartId);
    } else {
      this.overrides.set(chartId, params);
    }
  }

  // Clear all overrides (reset all charts to global)
  clearAll() {
    this.overrides.clear();
  }

  // Check if a chart has overrides
  hasOverrides(chartId: string) {
    return this.overrides.has(chartId);
  }
}

export const chartParametersStore = new ChartParametersStore();
```

---

## Phase 4: Layout Redesign

**Goal:** Flexible grid layout supporting different chart sizes

### 4.1 New Layout Structure

**File:** `/routes/charts/+page.svelte`

```svelte
<div class="min-h-screen bg-surface-100">
  <div class="max-w-[1920px] mx-auto px-6 @lg:px-12 py-12">

    <!-- Page Header -->
    <div class="mb-8">
      <h1>Chart Library</h1>
      <p>Description text</p>
    </div>

    <!-- Remove old global controls div -->

    <!-- Chart Grid with Flexible Sizing -->
    <div class="grid grid-cols-12 gap-6">

      <!-- Full-width charts (col-span-12) -->
      <div class="col-span-12">
        <ChartCard chartId="area-annual">
          <AreaChart ... />
        </ChartCard>
      </div>

      <!-- Two side-by-side charts (col-span-6 each) -->
      <div class="col-span-12 @lg:col-span-6">
        <ChartCard chartId="timeline-daily">
          <TimeLine ... />
        </ChartCard>
      </div>

      <div class="col-span-12 @lg:col-span-6">
        <ChartCard chartId="histogram-hourly">
          <Histogram ... />
        </ChartCard>
      </div>

      <!-- Three in a row (col-span-4 each) -->
      <div class="col-span-12 @md:col-span-6 @lg:col-span-4">
        <ChartCard chartId="sector-breakdown">
          <SectorArc ... />
        </ChartCard>
      </div>

      <div class="col-span-12 @md:col-span-6 @lg:col-span-4">
        <ChartCard chartId="geo-comparison">
          <GeoBarChart ... />
        </ChartCard>
      </div>

      <div class="col-span-12 @md:col-span-6 @lg:col-span-4">
        <ChartCard chartId="map-view">
          <Map ... />
        </ChartCard>
      </div>

    </div>

  </div>
</div>
```

---

### 4.2 ChartCard Component

**File:** `/lib/components/charts/ChartCard.svelte`

**Purpose:** Wrapper for each chart with parameter pill and consistent styling

```svelte
<script lang="ts">
  import ChartParameterPill from './ChartParameterPill.svelte';
  import { chartParametersStore } from '$lib/stores/chartParameters.svelte';

  let {
    chartId,
    globalParams,
    availableParams,
    children
  }: {
    chartId: string;
    globalParams: ChartParameters;
    availableParams: AvailableParameters;
    children: any;
  } = $props();

  // Get local overrides for this chart
  const localParams = $derived(chartParametersStore.getParameters(chartId));

  // Check if chart has overrides
  const hasOverrides = $derived(chartParametersStore.hasOverrides(chartId));

  function handleParameterChange(params: Partial<ChartParameters> | null) {
    chartParametersStore.setParameters(chartId, params);
  }
</script>

<div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm relative @container">
  <!-- Parameter Pill (top-right corner) -->
  <div class="absolute top-4 right-4 z-10">
    <ChartParameterPill
      {globalParams}
      localParams={localParams}
      onChange={handleParameterChange}
      {...availableParams}
    />
  </div>

  <!-- Chart Content -->
  <div class="p-6">
    {@render children()}
  </div>

  <!-- Visual indicator if overridden -->
  {#if hasOverrides}
    <div class="absolute top-0 left-0 w-1 h-full bg-primary rounded-l-lg"></div>
  {/if}
</div>
```

---

### 4.3 Map Component Integration

**File:** `/lib/components/map/MapCard.svelte`

**Purpose:** Wrap map in a card, not fixed to page

**Differences from current Map:**
- Contained in a card with fixed height
- Not fixed/sticky positioned
- No separate legend panel (integrated into card)
- Responsive height based on container

**Props:**
```typescript
interface MapCardProps {
  geojsonData: any;
  geography: string;
  year: number;
  scenario: string;
  parameters?: Partial<ChartParameters>;
  height?: string; // e.g., "400px", "h-[500px]"
}
```

---

## Phase 5: Integration and Testing

**Goal:** Connect all pieces and test the system

**Tasks:**
- [ ] Update `/routes/charts/+page.svelte` with new layout
- [ ] Pass global parameters from page to all ChartCard components
- [ ] Test parameter overrides on each chart
- [ ] Verify visual indicators work correctly
- [ ] Test reset functionality
- [ ] Test responsive behavior at different breakpoints
- [ ] Verify all charts fetch data correctly with overridden parameters
- [ ] Test scenario comparison mode with parameter overrides
- [ ] Add keyboard shortcuts (e.g., Cmd/Ctrl+R to reset all overrides)

---

## Success Criteria

- ✅ All charts display data correctly
- ✅ Flexible grid layout (some full-width, some in 2x2)
- ✅ Each chart can override global parameters
- ✅ Visual indication when chart has custom parameters
- ✅ Easy reset to global parameters (per-chart and global)
- ✅ Reusable control components work in all contexts
- ✅ Map component integrated in card layout
- ✅ Responsive design works on mobile/tablet/desktop
- ✅ Scenario selector in top nav works with chart overrides
- ✅ Export functionality works with overridden parameters

---

## File Structure

```
/lib/
├── components/
│   ├── controls/                     # NEW: Reusable control components
│   │   ├── YearSelector.svelte
│   │   ├── SegmentSelector.svelte
│   │   ├── ResolutionSelector.svelte
│   │   ├── AggregationSelector.svelte
│   │   └── GeographySelector.svelte  # Enhanced version of GeoSelect
│   ├── charts/                       # NEW: Chart-specific components
│   │   ├── ChartCard.svelte
│   │   └── ChartParameterPill.svelte
│   ├── map/
│   │   └── MapCard.svelte            # NEW: Map in card layout
│   └── [existing chart components]
├── stores/
│   └── chartParameters.svelte.ts     # NEW: Per-chart parameter store
└── types/
    └── controls.ts                   # NEW: Control component types

/routes/
└── charts/
    ├── +page.svelte                  # MAJOR UPDATE: New layout
    └── +page.ts                      # Minor update: Load available parameters
```

---

## Implementation Order

1. **Phase 1: Debug & Fix** (15 min)
   - Fix current data display issues
   - Verify all charts work with current setup

2. **Phase 2: Control Components** (1-2 hours)
   - Build reusable selectors
   - Test in isolation

3. **Phase 3: Parameter Override System** (2-3 hours)
   - Create ChartParameterPill
   - Create chart parameter store
   - Update chart components

4. **Phase 4: Layout** (1 hour)
   - Implement new grid layout
   - Create ChartCard wrapper
   - Integrate Map in card

5. **Phase 5: Integration** (1 hour)
   - Connect all pieces
   - Test thoroughly
   - Fix bugs

**Total Estimated Time:** 5-7 hours

---

## Notes

- Keep scenario selection in global nav (don't duplicate in chart pills)
- Parameter pills should only control: geography, year, segment, resolution, aggregation
- Visual indicators should be subtle but clear
- Mobile layout should stack all charts vertically
- Tablet layout should use 2 columns where appropriate
- Desktop layout can use 3-4 columns for smaller charts
- Consider adding "Copy configuration" button to share specific chart setups
- Export functionality should respect parameter overrides

---

## Future Enhancements (Not in This Phase)

- Save/load chart configurations (presets)
- Bookmark favorite chart configurations
- Share specific chart setup via URL
- Bulk parameter changes (e.g., "Set all charts to year 2035")
- Chart arrangement customization (drag-and-drop reordering)
- Dashboard mode (selected charts only)
