# Explorer TODO

**Updated:** 2025-11-24
**Status:** Active Development on `explorer-next-step` branch

## Summary of Remaining Work

### From PLANS.md

**Completed Phases:**
- ✅ Phase 0: Scenario Store Integration
- ✅ Phase 1: Component Standardization Foundation
- ✅ Phase 1.5: Scenario Comparison Support
- ✅ Phase 2: Chart Export System (mostly - PNG has axis label issues)
- ✅ Phase 4: Content Management (core system complete)

**In Progress / Remaining:**

#### Phase 2 (Export) - Minor Issues:
- [ ] Fix PNG export missing axis labels (LayerChart complexity)
- [ ] Responsive design testing at all breakpoints
- [ ] Quality testing for exports

#### Phase 3 (Enhanced Chart Library) - Significant Work:
- [ ] Chart categorization and navigation
- [ ] Chart configurator component (per-chart parameter controls)
- [ ] Customization panel (title editing, colors, annotations)
- [ ] Export optimization (presets, clipboard, ZIP download)
- [ ] Chart templates (10-15 professional templates)

#### Phase 4 (Content) - Migration Deferred:
- [ ] Convert existing Swedish text to markdown
- [ ] Add English translations
- [ ] Create glossary (50+ terms)
- [ ] Integrate content components into main page

---

### From CHART_LIBRARY_REDESIGN.md

**Completed:**
- ✅ Phase 1: Debug and fix chart display issues

**Remaining:**

#### Phase 2: Reusable Control Components
- [ ] `YearSelector.svelte` (dropdown/slider/pill variants)
- [ ] `SegmentSelector.svelte` (dropdown/pills/radio variants)
- [ ] `ResolutionSelector.svelte`
- [ ] `AggregationSelector.svelte`
- [ ] Enhanced `GeographySelector.svelte`

#### Phase 3: Chart Parameter Override System
- [ ] `ChartParameterPill.svelte` (compact pill to edit chart params)
- [ ] `chartParameters.svelte.ts` store for per-chart overrides
- [ ] Update all chart components to accept parameter overrides

#### Phase 4: Layout Redesign
- [ ] `ChartCard.svelte` wrapper with parameter pill
- [ ] Flexible 12-column grid layout
- [ ] `MapCard.svelte` (map in card, not fixed)

#### Phase 5: Integration and Testing
- [ ] Connect all pieces
- [ ] Test parameter overrides
- [ ] Test responsive behavior
- [ ] Keyboard shortcuts

---

### From EXPLORER_PLAN.md (Strategic Vision)

These are higher-level features not yet started:

- [ ] **Scenario Explorer** - Discovery tool for finding scenarios
- [ ] **Difference Analyzer** - Dedicated comparison environment
- [ ] **Insights Hub** - Curated analytical narratives
- [ ] **Data Access Center** - Bulk download, API docs, notebooks

---

## Priority Recommendation

**Most impactful next steps:**

1. **Phase 2: Control Components** - Foundation for chart customization
2. **Phase 3: Parameter Override System** - Per-chart controls users expect
3. **Content Migration** - Move hardcoded text to markdown
