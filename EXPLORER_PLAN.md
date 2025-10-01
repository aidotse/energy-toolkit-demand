## Strategic Plan for Explorer Frontend Enhancement

### Core Design Philosophy

The Explorer application serves pre-computed energy demand forecast data to three distinct user groups: general public seeking overview insights, energy professionals needing detailed analysis, and decision-makers requiring presentation-ready visualizations. With 3 base scenarios plus combinations of 7-10 parameters (potentially hundreds of total scenarios), the application must excel at scenario discovery, comparison, and visualization.

### Component Standardization Philosophy

All components must follow strict standardization patterns to ensure consistency, maintainability, and predictable behavior across the application. Every chart, visualization, and data display component should implement the same interfaces, use the same data handling patterns, and respond to viewport changes in consistent ways. This standardization reduces cognitive load for both developers and users - once you understand one component, you understand them all.

Components should share:
- Common data loading patterns (props with fallback to self-fetching)
- Standardized loading, error, and empty states
- Consistent responsive behavior using container queries
- Uniform export capabilities
- Same accessibility patterns
- Identical interaction patterns (hover, click, zoom)

### Content Management Strategy

**Approach: Git-Based Markdown Files**

Store all text content as Markdown files directly in the repository under `/explorer/content/`. This zero-infrastructure approach maintains complete flexibility while enabling version control and collaboration.

**Content Structure:**
- `/content/reports/` - Main page narrative sections
- `/content/insights/` - Analytical narratives and explanations  
- `/content/glossary/` - Energy sector terminology
- `/content/help/` - User guides and documentation

**Content Format:**
Use frontmatter for metadata and Markdown for content. Include template variables using `{{variable_name}}` syntax for dynamic data that gets replaced with actual values from the selected scenario. This enables scenario-aware content without additional infrastructure.

**Why This Approach:**
- No additional infrastructure required
- Works offline and locally  
- Version controlled with the code
- Can be edited with any text editor
- Natural collaboration through Git
- Deployable anywhere (static, server, local)

### 1. First Report Page - Architecture and Flow

#### Layout Strategy

**Desktop Design**: Maintain the successful split-screen approach with 40% report content on the left (scrollable) and 60% interactive map on the right. This preserves the map as a primary feature while providing adequate space for narrative content. The report side should feel like reading a high-quality analytical report, not a dashboard.

**Mobile Design**: Implement a tab-based interface with swipeable panels. The three tabs would be "Report", "Map", and "Data". This respects mobile interaction patterns while maintaining access to all content. The map shouldn't be forced into a small space on mobile - give it full screen when selected.

#### Scenario Management Philosophy

Implement a "Focus + Compare" pattern. Users always have one primary scenario driving all visualizations, clearly indicated in a persistent top bar. Optionally, they can activate comparison mode to add 1-2 additional scenarios. This prevents overwhelming users while enabling sophisticated analysis.

Create a hierarchical organization: Base scenarios (the 3 main ones) get prominent placement as they represent official/recommended projections. Parametric scenarios are accessible through an advanced selector with intelligent filtering. Users should be able to filter by individual parameters to narrow down from potentially hundreds of combinations.

#### Content Flow and Narrative Structure

Structure the report as a guided narrative journey rather than a dashboard:

1. **Executive Summary**: Start with three key metrics that tell the main story - peak demand change, total consumption growth, and dominant driver of change. These should be large, impossible to miss, with clear context about what they mean.

2. **Temporal Evolution**: Show how demand evolves from today to 2050. This isn't just a chart - it's a story about transformation. Include milestone annotations for major expected transitions.

3. **Sectoral Transformation**: Visualize how different sectors (housing, transport, industry) contribute to demand change. Use transitional visualizations showing current state transforming to future state, not just static comparisons.

4. **Geographic Insights**: Highlight regional variations and their causes. Which regions drive growth? Why? This connects the abstract numbers to real places.

5. **Load Pattern Changes**: Show how daily/seasonal patterns evolve. This is crucial for grid operators and energy planners.

6. **Uncertainty Communication**: If comparing scenarios, clearly communicate what drives differences. Use sensitivity analysis visualizations to show which parameters matter most.

#### Visual Design Principles

Adopt modern web application aesthetics: generous whitespace, card-based layouts with subtle shadows and gradients, smooth transitions between states. Use color purposefully - establish a consistent color language where each sector has its color, scenarios have their palette, and changes are shown with intuitive green/red schemes.

Implement "progressive disclosure" - start with simplified views and let users dive deeper through expandable sections, tooltips, and modal dialogs. Every number should be questionable - users should be able to click/hover to understand sources, assumptions, and calculations.

### 2. Chart Library Page - Professional Visualization Center

#### Core Purpose

The chart library serves as a "Visualization Configurator" where professionals create perfect visualizations of pre-computed data for their presentations and reports. It's a tool for communication excellence, not just data exploration.

#### User Workflow

1. **Browse Templates**: Users start by browsing visualization types organized by use case (executive presentation, technical analysis, public communication). Each template shows a preview with real data.

2. **Configure Parameters**: Users select from existing scenarios, geographies, time ranges, and resolutions. Show live preview updates as parameters change. Include helpful presets like "Compare all base scenarios" or "Show maximum change scenario".

3. **Customize Appearance**: Allow title editing, color scheme selection, axis adjustments, and annotation additions. Professional users need charts that match their organization's style guides.

4. **Export Professionally**: Provide multiple export options optimized for different uses:
   - PowerPoint: Properly sized images with editable text layers
   - Word/PDF: High-resolution images with proper margins
   - Web: Embed codes and responsive configurations
   - Data: Underlying data in Excel/CSV format

#### Template System

Create 10-15 professional templates covering common energy sector needs:
- Executive dashboards (KPI-focused)
- Scenario comparison matrices
- Regional deep-dives
- Sectoral transformation stories
- Sensitivity analysis waterfalls
- Load duration curves
- Seasonal pattern analyses

Each template should be more than just a chart type - it should encode best practices for communicating specific insights.

#### Export Excellence

The export functionality must be flawless. Energy professionals will judge the entire system by whether they can get a chart into PowerPoint without quality loss. Implement smart clipboard integration where possible - users should be able to copy a chart and paste directly into their presentation with proper resolution and formatting.

### 3. Standardized Component Architecture

#### Data Handling Pattern

Every visualization component must implement the same data interface:
- Accept data via props OR fetch its own data if props are empty/undefined
- Implement identical loading states (skeleton screens matching component layout)
- Show consistent error states with retry capabilities
- Handle empty data gracefully with informative messages
- Use the same data transformation utilities
- Cache responses using the same strategy

#### Responsive Behavior Standard

All components must follow a unified responsive strategy:
- Use container queries, not media queries, for component-level responsiveness
- Define standard breakpoints: compact (<400px), standard (400-800px), expanded (>800px)
- Components must be width-agnostic - they should work at any width
- Text sizing, padding, and margins scale proportionally using CSS custom properties
- Interactive elements maintain minimum touch target sizes (44x44px on mobile)
- Charts reflow rather than shrink - changing aspect ratios and label strategies

#### Interaction Standards

Establish consistent interaction patterns across all components:
- Hover states reveal additional information (desktop) or are accessible via long-press (mobile)
- Click/tap behavior is predictable - always drills down or opens details
- Zoom/pan behavior is uniform across all spatial visualizations
- Keyboard navigation follows the same patterns
- Focus states are visually consistent
- Loading states use the same skeleton patterns

#### Export Interface Standard

Every component that displays data must support export:
- Common export menu accessible via three-dot menu in top-right
- Standard export formats: PNG, SVG, CSV data, JSON data
- Export includes metadata (scenario, date range, parameters)
- Consistent naming convention for exported files
- Same quality settings for image exports
- Batch export capability for component collections

#### Configuration Interface Standard

Components that accept configuration must use standardized controls:
- Parameter panels slide in from the right
- Configuration changes show live preview
- Reset button to restore defaults
- Save/Load configuration presets
- Undo/redo for configuration changes
- Keyboard shortcuts for common operations

### 4. Additional Features to Complete the Platform

#### A. Scenario Explorer (Discovery Tool)

Create an intelligent interface for discovering relevant scenarios among hundreds of pre-computed options. Use a parameter space visualization where users can see all scenarios plotted by their parameters, colored by outcomes. Include:

- Scatter plot matrix showing scenario distribution across parameter pairs
- Filtering system that updates in real-time
- "Similar scenarios" recommendation when viewing any scenario
- Saved search functionality for common queries
- Scenario bookmarking for quick access

#### B. Difference Analyzer (Comparison Tool)

Build a dedicated comparison environment that goes beyond side-by-side charts. When comparing two scenarios:
- Show parameter differences clearly
- Waterfall chart breaking down impact of each parameter change
- Time-aligned animations showing divergence points
- Statistical summary of differences (max delta, average change, etc.)
- Export comparison reports as complete packages

#### C. Insights Hub (Guided Analysis)

Create curated analytical narratives that guide users through complex topics:
- "Electrification Impact Story" - animated walkthrough of what electrification means
- "Regional Winners and Losers" - interactive exploration of geographic impacts
- "Peak vs. Energy" - educational content about grid challenges
- Each insight should combine text, visualizations, and interactions

#### D. Data Access Center (Professional Tools)

Provide direct data access for analysts:
- Bulk download interface for multiple scenarios
- API documentation with code examples
- Pre-configured Jupyter notebooks for common analyses
- Excel templates with data connections
- R/Python script library for standard visualizations

### 5. Responsive Design Strategy

#### Breakpoint Philosophy

Design for three distinct experiences:
- **Mobile (< 640px)**: Information seeking, quick checks, sharing
- **Tablet (640-1024px)**: Report reading, casual exploration
- **Desktop (> 1024px)**: Professional analysis, chart creation, exports

Don't just shrink desktop features for mobile. Some features (chart library export functions) can be desktop-only, clearly marked as such.

#### Component Behavior

Charts should be container-aware, not screen-aware. Use container queries to ensure charts look good whether they're full-screen on mobile or in a small multiple on desktop. 

Maps need special attention - they're powerful on all screen sizes but need different interaction patterns (touch vs. mouse, zoom controls vs. scroll wheel).

Navigation should transform, not just collapse. Mobile gets a bottom tab bar for thumb-friendly navigation. Tablet gets a collapsible sidebar. Desktop gets a persistent top bar with dropdowns.

### 6. Technical Implementation Priorities

#### Performance Optimization

With hundreds of scenarios and potentially large datasets:
- Implement aggressive caching for all static data
- Use virtual scrolling for long scenario lists
- Lazy load visualizations below the fold
- Pre-fetch likely next scenarios based on user behavior
- Consider IndexedDB for offline capability

#### State Management

Scenario selection is global state that affects multiple components. Implement a clean state management pattern where:
- Current scenario is accessible everywhere
- Comparison scenarios are optional additions
- Filter states persist during navigation
- URL reflects current state for sharing

#### Component Testing Standards

Standardized components enable standardized testing:
- Every component must have unit tests for data transformations
- Responsive behavior tests at all breakpoints
- Interaction tests for all user inputs
- Export functionality tests
- Performance benchmarks for rendering with large datasets
- Accessibility tests for keyboard navigation and screen readers

#### Documentation and Onboarding

Create contextual help throughout:
- First-time user tour highlighting key features
- Tooltips explaining energy sector terminology
- Methodology modals for transparency
- Video tutorials for complex features
- Glossary of terms accessible everywhere

### 7. Success Metrics and Quality Markers

The application succeeds when:
- A minister can understand the main insights in 2 minutes
- An analyst can create a presentation-ready chart in 30 seconds
- A journalist can find and verify a specific fact quickly
- The general public feels informed, not overwhelmed
- Every visualization is "screenshot worthy" - beautiful enough to share
- Any developer can add a new component by following the standard patterns
- Components are reusable across different pages and contexts

Focus on removing friction from common tasks. If users regularly need to compare three scenarios, make that a one-click action. If they always export to PowerPoint, optimize that path relentlessly.

The Explorer should feel like a premium product - smooth animations, thoughtful interactions, and zero rough edges. This is representing important national infrastructure data and should convey appropriate gravitas while remaining accessible.

The standardization of components should be invisible to users but invaluable to developers. Users experience consistency and reliability. Developers experience predictability and reusability. This standardization is the foundation that enables the application to scale elegantly as new visualizations and features are added.