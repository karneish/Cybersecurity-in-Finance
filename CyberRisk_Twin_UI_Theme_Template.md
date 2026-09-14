# CyberRisk Twin — Full UI Theme & Template Specification

## Source & Scope

This document is derived from the provided **CyberRisk Platform — Frontend Audit & Specification**. The source describes a React 18.3.1 + Vite SPA with 11 reachable pages, 63 frontend source files, 59 dynamically connected API endpoint methods, and implemented STOMP/SockJS real-time updates.

**Critical instruction:** This document changes **visual theme and UI presentation only**. It must not remove, rename, merge, disable, replace, or alter any existing feature, route, API integration, data flow, form, chart, simulator, authentication flow, or real-time behavior.

The target visual language is:

> **Palantir Foundry + Splunk SOC + Bloomberg Terminal + Linear**

This is a design-reference combination, not a request to copy any product literally.

---

# 1. Design Identity

## Product Design Name

**CyberRisk Twin — Premium Dark Enterprise Cyber Intelligence**

## Design Personality

- Enterprise-grade
- Dark
- Analytical
- Security-focused
- Financially precise
- Dense but organized
- Minimal visual noise
- Operational
- Data-first
- Fast and responsive
- Professional rather than cyberpunk

## Reference Influence

| Reference | UI contribution |
|---|---|
| Palantir Foundry | Object-centric intelligence, relationship graphs, inspectors, operational workspaces |
| Splunk SOC | Security event density, monitoring, alerts, operational tables |
| Bloomberg Terminal | Financial information density, compact analytical numbers, trend context |
| Linear | Navigation, spacing, typography, clean interaction design |

## What NOT to introduce

- No cyberpunk neon overload
- No particle backgrounds
- No unnecessary 3D objects
- No excessive glassmorphism
- No giant rounded cards
- No excessive gradients
- No decorative animation that competes with data
- No replacement of existing functionality

---

# 2. Non-Negotiable Functional Preservation

All existing functionality must remain intact.

Preserve all currently documented routes:

| Route | Existing Page |
|---|---|
| `/login` | LoginPage |
| `/` | ExecutiveDashboard |
| `/security` | SecurityDashboard |
| `/risk` | RiskAnalysis |
| `/assets` | AssetManagement |
| `/vulnerabilities` | VulnerabilityManagement |
| `/simulator` | ScenarioSimulator |
| `/investment` | InvestmentOptimizer |
| `/ai` | AIAssistant |
| `/settings` | Settings |
| `*` | Redirect to `/` |

Preserve:

- JWT authentication
- Protected routes
- Axios API client
- camelCase/snake_case conversion
- 401 handling
- Zustand stores
- STOMP/SockJS connection
- `/topic/risk/updated`
- `/topic/ingestion/event`
- all existing API calls
- all forms
- all tables
- all charts
- all simulations
- all investment optimization behavior
- all AI functionality
- all compliance/audit functionality
- all existing data models

**Theme implementation must sit on top of the existing application logic.**

---

# 3. Global Application Shell

## Desktop target

Primary design targets:

- 1440 × 900
- 1366 × 768
- 1920 × 1080

## Shell

```text
┌─────────────────────────────────────────────────────────────┐
│ TOPBAR                                                      │
├──────────────┬──────────────────────────────────────────────┤
│              │                                              │
│   SIDEBAR    │              MAIN WORKSPACE                  │
│              │                                              │
│              │                                              │
│              │                                              │
│              │                                              │
├──────────────┴──────────────────────────────────────────────┤
│ STATUS BAR                                                  │
└─────────────────────────────────────────────────────────────┘
```

## Dimensions

| Element | Specification |
|---|---|
| Sidebar | 232px |
| Topbar | 60px |
| Main page padding | 24px desktop |
| Dashboard grid gap | 16px |
| Status bar | 30px approximately |
| Inspector | 360–420px when open |

---

# 4. Global Color Tokens

## Background

| Token | Value | Purpose |
|---|---|---|
| `--bg-app` | `#080A0F` | Main application background |
| `--bg-sidebar` | `#0D1117` | Sidebar |
| `--bg-surface` | `#11161E` | Cards and panels |
| `--bg-elevated` | `#161C25` | Elevated panels |
| `--bg-hover` | `#1B222D` | Hover |
| `--bg-input` | `#0D1117` | Inputs |

## Borders

| Token | Value |
|---|---|
| `--border-default` | `#252C37` |
| `--border-subtle` | `#1B212B` |
| `--border-active` | `#38BDF8` |

## Text

| Token | Value |
|---|---|
| `--text-primary` | `#F1F5F9` |
| `--text-secondary` | `#94A3B8` |
| `--text-tertiary` | `#64748B` |
| `--text-disabled` | `#475569` |

## Accent

| Token | Value | Usage |
|---|---|---|
| `--accent-primary` | `#38BDF8` | Interactive/live/selected |
| `--accent-secondary` | `#818CF8` | AI/advanced analytics |

## Semantic Status

| Status | Value |
|---|---|
| Critical | `#F43F5E` |
| High | `#F97316` |
| Medium | `#F59E0B` |
| Low | `#22C55E` |
| Info | `#38BDF8` |
| Live | `#22D3EE` |

The existing semantic severity meanings must remain unchanged. Only the visual treatment changes.

---

# 5. Typography

## Primary Font

**Inter**

Fallback:

```text
Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
```

## Type Scale

| Element | Size | Weight |
|---|---:|---:|
| Page title | 24–28px | 600 |
| Section title | 16px | 600 |
| Card title | 14px | 600 |
| Body | 13–14px | 400 |
| Navigation | 13px | 500 |
| Button | 13px | 500 |
| Metadata | 11–12px | 400 |
| Table body | 12–13px | 400 |
| Table header | 11px | 500 |
| KPI number | 28–32px | 600 |

## Typography rules

- Use compact typography.
- Avoid oversized marketing-style headings.
- Use tabular numerals for financial/risk numbers.
- Use uppercase labels sparingly with 0.06–0.08em tracking.
- Preserve readability at dense dashboard layouts.

---

# 6. Spacing System

Use an 8px-based spacing scale:

```text
4px
8px
12px
16px
20px
24px
32px
40px
48px
64px
```

## Standard usage

| Context | Spacing |
|---|---:|
| Icon/text gap | 4–8px |
| Input horizontal padding | 10–12px |
| Navigation item padding | 8px 10px |
| Compact card padding | 12px |
| Standard card padding | 16px |
| Large card padding | 20px |
| Main page padding | 24px |
| Major section separation | 32px |
| Dashboard grid gap | 16px |

Do not introduce arbitrary spacing values unless the existing component requires them.

---

# 7. Borders, Radius & Shadows

## Border radius

| Component | Radius |
|---|---:|
| Cards | 8px |
| Panels | 8px |
| Inputs | 6px |
| Buttons | 6px |
| Navigation items | 6px |
| Badges | 999px |
| Modals | 10px |

Avoid large 20–30px rounded containers.

## Shadows

Use restrained elevation:

```text
Normal:
0 4px 16px rgba(0,0,0,0.20)

Modal:
0 12px 40px rgba(0,0,0,0.35)
```

Prefer borders and surface contrast over strong shadows.

---

# 8. Sidebar Template

The existing active shell is `MainLayout`. The dead `Sidebar.tsx` must not be accidentally reintroduced as a replacement.

## Visual structure

```text
┌────────────────────────┐
│ ◇ PRODUCT              │
│   CYBERRISK TWIN       │
├────────────────────────┤
│ WORKSPACE              │
│                        │
│ ◉ Command Center       │
│ ◇ Security             │
│ ◇ Risk Analysis        │
│ ◇ Assets               │
│ ◇ Vulnerabilities      │
│ ◇ Scenario Simulator   │
│ ◇ Investment           │
│ ◇ AI Assistant         │
│                        │
│ SYSTEM                 │
│ ◇ Settings             │
│                        │
├────────────────────────┤
│ ● SYSTEM STATUS        │
└────────────────────────┘
```

The labels must correspond to the existing application features/routes rather than inventing new modules.

## Sidebar styling

- Width: 232px
- Background: `#0D1117`
- Padding: 12px
- Border-right: `1px solid #1B212B`
- Navigation item height: 34–36px
- Navigation icon: 16px
- Navigation text: 13px
- Selected background: `#161C25`
- Selected text: `#F1F5F9`
- Active indicator: subtle 2px blue/cyan accent
- Hover background: `#1B222D`

---

# 9. Topbar Template

Height:

```text
60px
```

Structure:

```text
┌──────────────────────────────────────────────────────────────┐
│ Product / Current Page       Search     Live   User   Menu  │
└──────────────────────────────────────────────────────────────┘
```

Visual rules:

- Background: `#0D1117`
- Bottom border: `#1B212B`
- Horizontal padding: 20px
- Compact icon buttons
- User avatar/profile remains functional
- Existing logout/profile behavior must remain unchanged

If the existing application currently exposes profile/logout through `MainLayout`, preserve that behavior exactly.

---

# 10. Command Center / Executive Dashboard Theme

The existing `ExecutiveDashboard` remains the primary executive view.

## Layout

```text
Page Header
     ↓
KPI Strip
     ↓
Primary Risk / Financial Analysis
     ↓
Risk Drivers + Events
     ↓
Secondary Analytics
```

Use a 12-column grid.

Example structural allocation:

```text
KPI:
3 + 3 + 3 + 3

Primary analysis:
8 + 4

Secondary:
6 + 6
```

This is layout guidance only. Existing components and their data sources must remain unchanged.

## Existing components to preserve

- RiskScoreCard
- EALCard
- BudgetCard
- TopRiskCard
- RecentEventsFeed
- RiskTrendChart
- FinancialExposureChart
- VulnerabilityPieChart
- DataQualityCard
- ComplianceCard
- AuditChainPanel
- ForecastChart
- LossDistributionCard
- existing dashboard content

---

# 11. KPI Card Template

Existing KPI cards should receive a unified visual treatment.

```text
┌──────────────────────────────┐
│ METRIC LABEL             ⋯   │
│                              │
│ 00.00                        │
│ ↑ 0.00%                      │
└──────────────────────────────┘
```

Specifications:

- Background: `#11161E`
- Border: `1px solid #252C37`
- Radius: 8px
- Padding: 16px
- Label: 11–12px
- Value: 28–32px / 600
- Delta: 11–12px
- Use semantic color only for the delta/status

Do not add hardcoded values.

---

# 12. Risk Score Visual Treatment

The existing score thresholds remain:

- ≥80: critical
- ≥60: high
- ≥40: medium
- below 40: low

The theme should represent these with restrained accents.

Recommended treatment:

```text
Primary number → white
Status indicator → semantic color
Trend → semantic color
Supporting text → muted gray
```

Do not make the entire card red/orange/green.

---

# 13. EAL / Financial Metric Treatment

Financial numbers should use:

- Inter tabular numerals
- strong primary text
- compact secondary labels
- subtle trend indicators
- INR formatting already implemented by the application

Existing formatting must not be changed.

Use:

```text
Primary:
large financial value

Secondary:
change / period / context

Tertiary:
supporting explanation
```

---

# 14. Risk Trend Chart

Existing `RiskTrendChart` must remain a dual-axis line chart containing the existing Risk Score + EAL data.

Theme:

- Background: transparent
- Grid: `#1B212B`
- Axis labels: `#64748B`
- Main data: primary accent
- Secondary data: restrained secondary accent
- Critical events: semantic red only where needed
- Tooltip: `#161C25`
- Tooltip border: `#252C37`

Avoid decorative gradients.

---

# 15. Financial Exposure Chart

Existing `FinancialExposureChart` remains a horizontal bar chart.

Theme:

- Bars: primary blue/cyan family
- Grid: subtle
- Labels: primary/secondary text
- Tooltip: elevated dark panel
- No rainbow palette

The chart must continue receiving its existing API-driven data.

---

# 16. Vulnerability Pie / Donut

Existing severity mapping remains:

```text
CRITICAL → red
HIGH     → orange
MEDIUM   → amber
LOW      → green
INFO     → blue
```

Use these colors only for semantic severity.

Center/labels should remain neutral and readable.

---

# 17. Risk Matrix

Existing `RiskMatrix` is a 5×5 likelihood × impact matrix.

Theme:

- Base cells: dark neutral
- Increasing severity: progressively stronger semantic accents
- Asset dots: small, high-contrast indicators
- Tooltip: elevated panel
- Selected asset: cyan border
- Hover: subtle surface highlight

Do not change the matrix logic, scale, calculations, or asset data.

---

# 18. Risk Analysis Page

Existing `RiskAnalysis` should visually become a professional analyst workspace.

Suggested structure:

```text
┌──────────────┬─────────────────────────────┬───────────────┐
│ Risk Context │ Risk Matrix / Breakdown     │ Detail        │
│              │                             │ Inspector     │
│ Filters      │                             │               │
│              │                             │               │
└──────────────┴─────────────────────────────┴───────────────┘
```

Preserve:

- RiskMatrix
- RiskBreakdownTree
- RiskTimeline
- RiskDetailModal
- existing `riskApi` calls
- filters
- asset selection
- risk detail behavior

The existing duplicate/dead chart `RiskBreakdownTree` must not be accidentally substituted for the active risk component.

---

# 19. Risk Detail Modal

Style as a compact enterprise analysis modal.

Sections:

```text
Identity
Risk Score
Probability / Impact / EAL
Control Reduction
Residual Risk
Risk Factors
Recommendations
```

Specifications:

- Width: approximately 520–680px depending on content
- Radius: 10px
- Padding: 20px
- Background: `#11161E`
- Border: `#252C37`
- Backdrop: dark translucent overlay
- Close button: 32×32px
- Esc/backdrop behavior must remain intact

---

# 20. Asset Management Template

Existing `AssetManagement` must remain functionally unchanged.

Visual style:

```text
Header
 ↓
Asset Statistics
 ↓
Filter/Search Toolbar
 ↓
Asset Table
 ↓
Dependency Table / Details
```

Table:

- 40–44px row height
- compact headers
- subtle separators
- hover background
- selected row accent
- compact action buttons

Forms:

- 36px input height
- 6px radius
- 10–12px horizontal padding
- clear validation state
- existing CRUD behavior preserved

---

# 21. Vulnerability Management Template

Existing functionality:

- list
- filters
- severity
- status
- pagination
- CRUD
- bulk upload
- stats

Theme:

```text
Vulnerability Header
 ↓
Severity/Status Metrics
 ↓
Filter Toolbar
 ↓
Dense Data Table
 ↓
Bulk Actions
```

Severity badges:

```text
CRITICAL → red
HIGH     → orange
MEDIUM   → amber
LOW      → green
INFO     → blue
```

Do not change severity meanings.

---

# 22. Security Dashboard / SOC Theme

This page should receive the strongest **Splunk SOC influence**.

Visual structure:

```text
┌─────────────────────────────────────────────────────────────┐
│ SECURITY COMMAND CENTER                                     │
├──────────────────────────────┬──────────────────────────────┤
│ Security metrics             │ Live event stream            │
├──────────────────────────────┴──────────────────────────────┤
│ Risk graph / security analysis                              │
├──────────────────────────────┬──────────────────────────────┤
│ Control effectiveness        │ Control coverage             │
└──────────────────────────────┴──────────────────────────────┘
```

Preserve all existing SecurityDashboard API connections.

Use dense but readable event rows rather than large event cards.

---

# 23. Live Event Stream

Existing real-time events should look like an operational SOC feed.

```text
● event
  timestamp
  category / source

● event
  timestamp
  category / source
```

Styling:

- 6px status dot
- compact timestamp
- 13px title
- 11–12px metadata
- subtle separator
- hover highlight
- live events may use a brief highlight animation

Do not simulate additional live data in the UI.

---

# 24. Real-Time State Indicators

Because the frontend already uses STOMP/SockJS, represent connection state visually.

States:

```text
● LIVE
● CONNECTING
● RECONNECTING
● DISCONNECTED
```

Use:

- Live: cyan
- Connecting: amber
- Reconnecting: amber
- Disconnected: red

The displayed state must be connected to actual application state if available. Do not hardcode "LIVE".

Existing WebSocket behavior must remain:

- SockJS
- STOMP
- `/ws`
- authorization header
- reconnect delay
- heartbeat
- risk update topic
- ingestion event topic

---

# 25. Risk Digital-Twin Visual Language

The existing risk graph functionality should be presented as the central intelligence visualization.

Visual concept:

```text
Business / Service
       │
       ▼
     Asset
       │
       ▼
 Security Finding
       │
       ▼
     Control
       │
       ▼
 Financial / Risk Impact
```

Node styling:

- Background: `#11161E`
- Border: `#252C37`
- Radius: 8px
- Selected: cyan border
- Critical: red border/accent
- Connection: `#334155`
- Active connection: `#38BDF8`

Interactions should preserve the existing graph behavior.

---

# 26. Attack Path Panel

Existing `AttackPathPanel` remains intact.

Presentation:

```text
ATTACK PATH
────────────

Node → Node → Node → Node

Probability
Financial exposure
Supporting context
```

Use:

- thin graph lines
- clear selected path
- subtle semantic risk accents
- compact metrics
- right-side contextual information

No fake attack-path data.

---

# 27. Blast Radius Panel

Existing `BlastRadiusPanel` remains intact.

Use an intelligence workspace:

```text
Selected Asset
      ↓
Impacted Nodes
      ↓
Affected Relationships
      ↓
Financial Exposure
```

Visual priority:

1. selected object
2. impacted graph
3. financial/risk metrics
4. supporting asset information

---

# 28. Data Quality Card

Existing `DataQualityCard` should visually emphasize trust.

Structure:

```text
DATA QUALITY

Confidence
[visual gauge]

Coverage / quality indicators

Data gaps
Recommendations
```

Use neutral styling with cyan/amber status accents.

Do not invent additional confidence metrics.

---

# 29. Compliance Card

Existing `ComplianceCard` should be treated as governance intelligence rather than a generic checklist.

Visual hierarchy:

```text
Framework
Coverage
Control Mapping
Risk Context
```

Use compact framework rows and progress indicators.

Do not alter existing framework data.

---

# 30. Audit Chain Panel

Existing `AuditChainPanel` should visually resemble a secure audit workspace.

Structure:

```text
AUDIT CHAIN

Entry
  ↓
Entry
  ↓
Entry

[ Verify ]
```

Visual language:

- hash text: monospace
- small metadata
- subtle chain connectors
- verification state clearly indicated
- action button compact

Preserve existing `getAuditChain` and `verifyAuditChain` behavior.

---

# 31. Forecast Chart

Existing `ForecastChart` should visually distinguish:

```text
Historical / current
        │
        └──── forecast
```

Recommended visual convention:

- current/historical: solid
- forecast: dashed
- uncertainty/context: subtle fill only if already supported
- grid: very subtle

Do not alter forecast calculations or data.

---

# 32. Loss Distribution Card

Existing Monte Carlo loss distribution should have a financial-risk terminal feel.

Use:

```text
Loss Distribution

P5
P50
P95
P99
```

Visual treatment:

- dark surface
- compact percentile labels
- restrained chart colors
- clear primary percentile
- no unnecessary decoration

Preserve the existing 5,000-simulation API parameter behavior.

---

# 33. Scenario Simulator

This is one of the most important workspaces.

Use a **before / simulated-after** visual pattern while preserving all existing controls.

```text
┌──────────────────────────┬──────────────────────────┐
│ CURRENT STATE            │ SIMULATED STATE          │
│                          │                          │
│ Existing metrics        │ Simulated metrics       │
│ Existing view           │ Simulated view           │
└──────────────────────────┴──────────────────────────┘

                 [ RUN SIMULATION ]
```

The exact existing scenario configuration fields must remain.

Use:

- 16px panel gap
- 20px panel padding
- 8px radius
- compact control area
- clear simulation state
- loading/progress state
- result emphasis

---

# 34. Investment Optimizer

Give this page a **Bloomberg-style financial analysis** treatment.

Structure:

```text
Investment Header
 ↓
Budget / Controls
 ↓
Optimization Controls
 ↓
Recommended Result
 ↓
ROSI Analysis
 ↓
Investment Plans
```

Visual priorities:

1. budget
2. optimization objective
3. selected controls
4. financial effect
5. ROSI
6. supporting table

Preserve all existing `investmentApi` behavior.

---

# 35. Investment Table

Use dense financial-table styling:

- compact rows
- aligned numeric columns
- tabular numerals
- subtle separators
- right-align financial numbers
- left-align labels
- hover highlight
- selected row accent

Do not hardcode new values.

---

# 36. ROSI Chart

Existing `InvestmentROSIChart` remains a bar chart.

Use:

- primary accent for normal bars
- semantic highlight for best/worst where appropriate
- neutral axis
- subtle grid
- compact labels

Preserve its existing data source.

---

# 37. AI Assistant

The existing `AIAssistant` should feel like an **embedded enterprise analyst**, not a generic ChatGPT clone.

Structure:

```text
┌─────────────────────────────────────────────┐
│ AI RISK ANALYST                             │
├─────────────────────────────────────────────┤
│                                             │
│ Conversation / response area                │
│                                             │
│                                             │
├─────────────────────────────────────────────┤
│ Ask about risk...                       →   │
└─────────────────────────────────────────────┘
```

AI accent:

`#818CF8`

Use violet only for AI-specific identity.

Preserve:

- `aiApi.query`
- `aiApi.getRecommendations`
- `aiApi.explainAsset`

Do not fabricate AI responses.

---

# 38. AI Response Cards

Use structured response blocks:

```text
Analysis
────────
Response

Relevant context
────────
Context

Recommendation
────────
Recommendation

Action
[ Existing action if supported ]
```

If confidence/source information is already returned by the backend, display it cleanly. Do not invent confidence values.

---

# 39. Settings

Existing Settings page should use the same shell and design system.

Keep it simpler:

```text
Settings
 ├── Profile
 ├── Preferences
 └── Existing settings sections
```

Use standard:

- 36px controls
- 16px section spacing
- 8px card radius
- dark surfaces
- subtle borders

Do not introduce settings that do not exist.

---

# 40. Login Page

Use a premium enterprise security login.

```text
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                CYBERRISK TWIN                               │
│                                                             │
│                Secure Access                                │
│                                                             │
│                Username                                     │
│                [____________________]                       │
│                                                             │
│                Password                                     │
│                [____________________]                       │
│                                                             │
│                [ SIGN IN ]                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

Visual:

- app background: `#080A0F`
- login panel: `#11161E`
- border: `#252C37`
- primary button: cyan/blue
- no excessive security graphics

Preserve the existing login flow and authentication behavior.

---

# 41. Buttons

## Primary

```text
Height: 34–36px
Padding: 0 14px
Radius: 6px
Font: 13px / 500
```

Primary background can use the brand/accent palette.

## Secondary

Dark surface + subtle border.

## Destructive

Use red only for destructive actions.

## Icon button

```text
32 × 32px
Radius: 6px
```

---

# 42. Inputs

```text
Height: 36px
Horizontal padding: 10–12px
Radius: 6px
Background: #0D1117
Border: #252C37
```

Focus:

```text
Border: #38BDF8
```

Error:

```text
Border/accent: #F43F5E
```

Preserve all existing validation and submission behavior.

---

# 43. Filters

Use compact filter controls:

```text
[ Filter ▾ ] [ Status ▾ ] [ Type ▾ ] [ Search... ]
```

Do not turn filters into oversized cards.

Preserve existing filter parameters and API behavior.

---

# 44. Badges

Standard:

```text
Height: 22px
Padding: 0 8px
Radius: 999px
Font: 11px
```

Use semantic colors with subtle backgrounds rather than solid large blocks.

---

# 45. DataTable

The existing generic `DataTable` must remain reusable.

Theme:

- Header: 11px uppercase, muted
- Row: 40–44px
- Border: subtle
- Hover: `#161C25`
- Selected: subtle cyan/blue accent
- Loading: skeleton
- Empty: structured message
- Zebra rows: only if the existing behavior remains useful; theme should not remove functionality

---

# 46. Modal & Drawer System

Use:

```text
Overlay
rgba(0,0,0,0.55–0.70)

Panel
#11161E

Border
#252C37

Radius
8–10px
```

Animations:

```text
150–250ms
```

Preserve all existing close, Escape, backdrop and submit behavior.

---

# 47. Loading States

Use skeletons for data-heavy screens.

For actions such as simulations or calculations, use compact contextual loading messages.

Examples of visual pattern:

```text
Loading data...
```

```text
Calculating...
```

```text
Running simulation...
```

The text must reflect the actual operation and must not imply functionality that doesn't exist.

---

# 48. Empty States

Use clean enterprise empty states:

```text
No records available

Supporting explanation
[ Existing action if applicable ]
```

Do not fill empty states with fake data.

---

# 49. Error States

Use:

```text
Unable to load this view

Short explanation

[ Retry ]
```

Only show Retry where the existing application can actually retry.

Do not alter API error behavior.

---

# 50. Iconography

Use the existing `lucide-react` icon library.

Specifications:

- 16px standard
- 18px prominent
- stroke width approximately 1.75–2
- consistent icon family
- no mixed icon libraries

Icons must communicate function, not decoration.

---

# 51. Animation System

Use subtle motion only.

| Interaction | Duration |
|---|---:|
| Hover | 100–150ms |
| Button state | 100–150ms |
| Drawer | 150–250ms |
| Modal | 150–250ms |
| Graph transition | 250–400ms |

Avoid:

- particle animations
- continuous background animation
- spinning 3D graphics
- bouncing UI
- excessive glow

Live event highlights may briefly animate and then settle.

---

# 52. Responsive Rules

Desktop-first.

At narrower widths:

```text
Sidebar
→ collapse/drawer

Right inspector
→ overlay/drawer

Large multi-column dashboard
→ stacked sections

Tables
→ horizontal scroll or existing responsive strategy
```

Do not remove functionality on smaller screens.

---

# 53. Dark Theme Architecture

The entire active application should use the new dark enterprise theme.

Suggested CSS variable foundation:

```text
--bg-app
--bg-sidebar
--bg-surface
--bg-elevated
--bg-hover
--bg-input

--border-default
--border-subtle
--border-active

--text-primary
--text-secondary
--text-tertiary
--text-disabled

--accent-primary
--accent-secondary

--status-critical
--status-high
--status-medium
--status-low
--status-info
--status-live
```

Prefer centralized variables over repeating arbitrary colors.

However, do not change application logic while introducing these visual tokens.

---

# 54. Theme Application Strategy

The safest implementation strategy is:

```text
Existing React Components
        ↓
Existing Props / State / API
        ↓
Existing Business Logic
        ↓
NEW THEME TOKENS
        ↓
NEW VISUAL COMPONENT STYLING
```

Do not do:

```text
New UI
 ↓
New mock data
 ↓
New API assumptions
```

The redesign is visual only.

---

# 55. Existing Feature Mapping

| Existing Feature | Theme treatment |
|---|---|
| ExecutiveDashboard | Enterprise command center |
| SecurityDashboard | SOC command center |
| RiskAnalysis | Analyst workspace |
| AssetManagement | Intelligence/data workspace |
| VulnerabilityManagement | Dense security operations table |
| ScenarioSimulator | Simulation laboratory |
| InvestmentOptimizer | Financial terminal/workspace |
| AIAssistant | Embedded AI analyst |
| Settings | Clean enterprise settings |
| RiskMatrix | Dark analytical matrix |
| RiskDetailModal | Object inspector/detail modal |
| AttackPathPanel | Attack-path intelligence visualization |
| BlastRadiusPanel | Dependency graph/impact workspace |
| ComplianceCard | Governance intelligence |
| DataQualityCard | Trust/data quality panel |
| AuditChainPanel | Secure audit workspace |
| ForecastChart | Risk forecasting analysis |
| LossDistributionCard | Financial loss analysis |

---

# 56. Real-Time Visual Architecture

The frontend already has real-time STOMP/SockJS functionality.

Preserve:

```text
Backend
  ↓
STOMP/SockJS
  ↓
useWebSocket
  ↓
App handlers
  ↓
notification/risk state
  ↓
riskStore/API refresh
  ↓
Charts / dashboard
```

The UI redesign must only improve how these state changes are visualized.

Do not replace the existing WebSocket implementation during the theme pass.

---

# 57. Notification Visibility Note

The audit reports that `Sidebar.tsx`, `Header.tsx`, and `NotificationBell.tsx` are dead code, while `notificationStore` is still populated by live messages. Therefore:

**Do not silently delete or alter those files during a theme-only pass.**

If notification visibility is addressed later, it should be treated as a separate functional change.

For this theme specification, only the active UI should be styled.

---

# 58. Hardcoded Data Preservation Rule

The audit identified a hardcoded BudgetCard value and a hardcoded profile in dead `Header.tsx`.

A theme-only implementation must **not replace, modify, or hide data merely to make the UI look correct**.

The existing functional/data audit remains the source of truth.

---

# 59. Accessibility

Preserve and improve visual accessibility without changing functionality:

- high text contrast
- visible focus states
- keyboard-friendly controls
- semantic labels
- sufficient target sizes
- do not rely solely on color to communicate severity
- maintain readable chart labels
- respect reduced-motion preferences where possible

---

# 60. Overall Visual Hierarchy

Every important screen should answer:

```text
WHAT?
 ↓
WHY?
 ↓
IMPACT?
 ↓
ACTION?
```

But the UI should achieve this through existing data/components, not new hardcoded content.

---

# 61. Design Quality Target

The finished application should visually feel like:

```text
Palantir
   +
Splunk SOC
   +
Bloomberg
   +
Linear
   ↓
CyberRisk Twin
```

Expected visual result:

- dark enterprise shell
- compact navigation
- strong information hierarchy
- dense but readable tables
- analytical charts
- object/relationship visualization
- restrained semantic colors
- clean typography
- financial-number precision
- subtle real-time activity
- professional AI workspace

---

# 62. Final Implementation Constraint

When applying this specification to the existing frontend:

### MUST preserve

- every existing route
- every existing feature
- every existing component behavior
- every existing API integration
- every existing form
- every existing chart
- every existing table
- every existing simulator
- every existing AI workflow
- every existing authentication flow
- every existing WebSocket flow
- every existing backend contract
- every existing state management behavior

### ONLY change

- colors
- fonts
- spacing
- padding
- margins
- borders
- radii
- shadows
- typography
- layout presentation where it does not change functionality
- visual hierarchy
- icon presentation
- chart styling
- table styling
- component visual states
- loading/empty/error visual presentation

### NEVER introduce

- hardcoded demo data
- fake API responses
- fake real-time events
- fake financial values
- fake vulnerabilities
- fake assets
- fake users
- fake risk scores
- new business logic
- new backend assumptions

---

# 63. Final Visual Definition

## Theme Name

**CyberRisk Twin — Dark Enterprise Intelligence**

## Formula

```text
PALANTIR
Object-centric intelligence
        +
SPLUNK
SOC monitoring
        +
BLOOMBERG
Financial analytics
        +
LINEAR
Minimal interaction design
        ↓
CYBERRISK TWIN
Continuous Cyber Risk Intelligence UI
```

## Core visual tokens

```text
Background:       #080A0F
Surface:          #11161E
Elevated:         #161C25
Border:           #252C37

Primary Text:     #F1F5F9
Secondary Text:   #94A3B8
Muted Text:       #64748B

Primary Accent:   #38BDF8
AI Accent:        #818CF8

Critical:         #F43F5E
High:             #F97316
Medium:           #F59E0B
Low:              #22C55E
Live:             #22D3EE

Font:             Inter

Radius:
Cards             8px
Inputs            6px
Buttons           6px
Badges            999px

Main Padding:     24px
Grid Gap:         16px
Sidebar:          232px
Topbar:           60px
```

---

# 64. Source Audit Reference

The provided audit confirms the existing frontend is a React/Vite SPA with 11 pages, 31 component files, 59 live API endpoint methods, and implemented STOMP/SockJS real-time updates. The source also identifies the active `MainLayout`, existing charts, risk components, dashboard components, insights, and API modules that must remain functionally intact.

Source: provided frontend audit/specification. fileciteturn0file0L27-L49

The documented route and page inventory is the basis for the theme mapping above. fileciteturn0file0L83-L117

The documented component inventory and real-time behavior are preserved by this specification rather than replaced. fileciteturn0file0L122-L179 fileciteturn0file0L184-L194

The audit also confirms the 59 API methods are dynamically connected to the backend, which is why this theme specification explicitly prohibits replacing runtime data with mock UI data. fileciteturn0file0L198-L283

---

# END

**Purpose:** Apply the visual theme to the existing CyberRisk frontend without altering any feature or data behavior.
