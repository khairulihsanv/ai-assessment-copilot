---
name: Cognitive Nexus
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#434655'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#006398'
  on-secondary: '#ffffff'
  secondary-container: '#5bb8fe'
  on-secondary-container: '#00476e'
  tertiary: '#6a1edb'
  on-tertiary: '#ffffff'
  tertiary-container: '#8343f4'
  on-tertiary-container: '#f7edff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#cce5ff'
  secondary-fixed-dim: '#93ccff'
  on-secondary-fixed: '#001d31'
  on-secondary-fixed-variant: '#004b73'
  tertiary-fixed: '#eaddff'
  tertiary-fixed-dim: '#d2bbff'
  on-tertiary-fixed: '#25005a'
  on-tertiary-fixed-variant: '#5a00c6'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
  canvas-light: '#F8FAFC'
  surface-white: '#FFFFFF'
  border-subtle: '#E2E8F0'
  text-slate-dark: '#0F172A'
  ai-cyan-glow: '#38BDF8'
  ai-violet-glow: '#A855F7'
  status-success: '#10B981'
typography:
  headline-xl:
    fontFamily: Space Grotesk
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Space Grotesk
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  code-data:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: -0.01em
  code-badge:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 0.75rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

The design system embodies precision, analytical clarity, and intelligent co-creation. Merging the focused velocity of modern software tooling with the accessibility of modern collaborative suites, it is built for educators, evaluators, and candidates navigating advanced AI-assisted assessment workflows.

The visual tone is calm, luminous, and authoritative. It combines strict structural alignment, restrained slate surfaces, crisp boundary lines, and vibrant chromatic accents denoting automated intelligence versus human oversight. The interface rejects visual clutter in favor of high information density, razor-sharp typographic hierarchy, and purposeful subtle glows that elevate autonomous AI feedback mechanisms.

## Colors

The palette operates on a crisp slate foundation anchored by royal blue (`#2563EB`) as the primary interactive driver and refined sky blue (`#0284C7`) for analytical actions. Deep slate (`#0F172A`) commands headings, high-priority contrast elements, and dark mode containers.

AI-driven behaviors and algorithmic evaluation insights are surfaced through a dedicated chromatic pairing: `ai-cyan-glow` (`#38BDF8`) and `ai-violet-glow` (`#A855F7`), deployed strictly within high-salience chips, subtle border gradients, and telemetry indicators. Human-in-the-loop review queues and validation checkpoints rely on emerald green (`#10B981`) for confirmed validation, while neutral slate tiers establish structural borders (`#E2E8F0`) and canvas stratification (`#F8FAFC` to `#FFFFFF`).

## Typography

Typography establishes an intentional contrast between technological rigor and utilitarian readability:

- **Headlines (Space Grotesk):** Provides structured, geometric cadence for module titles, performance scores, and dashboard headers with tight tracking.
- **Body & Controls (Inter):** Ensures optimal legibility for assessment rubrics, candidate responses, and complex configuration panels.
- **Data, Badges & AI Metadata (JetBrains Mono):** Dedicated to confidence metrics, response timings, model checkpoints, and human-in-the-loop audit logs.

## Layout & Spacing

The layout adopts a flexible 12-column grid system paired with a persistent 4px baseline rhythm. 

- **Desktop (>= 1280px):** 12 columns with 24px (`1.5rem`) gutters and 32px (`2rem`) outer margin. The primary cockpit structure uses a dual-pane or tri-pane model (Navigation, Core Assessment Surface, AI Copilot Inspector).
- **Tablet (768px - 1279px):** 8 columns with 16px gutters; side inspection panels collapse into dynamic slide-out drawers.
- **Mobile (< 768px):** 4 columns with 12px (`0.75rem`) gutters and 16px (`1rem`) margin. AI telemetry docks to contextual bottom sheets.

## Elevation & Depth

Visual hierarchy leverages crisp boundary containment combined with subtle atmospheric luminescence rather than traditional heavy drop shadows:

- **Base Layer (Level 0):** Flat background `#F8FAFC`.
- **Panel & Card Layer (Level 1):** Solid `#FFFFFF` fill resting on a single 1px hairline border of `#E2E8F0`. Shadow is an ultra-fine ambient falloff: `0 1px 2px 0 rgba(15, 23, 42, 0.04)`.
- **Interactive Floating Layer (Level 2):** Elevated menus, popovers, and candidate answer focus cards use `0 8px 24px -4px rgba(15, 23, 42, 0.08), 0 2px 6px -1px rgba(15, 23, 42, 0.04)` over a 1px `#CBD5E1` outline.
- **AI Accent Glow (Luminous Layer):** AI evaluation cards and active prompt helpers utilize a dual-ring treatment: an inner border tinted with `#38BDF8` (at 40% opacity) accompanied by an outer diffused glow `0 0 16px -2px rgba(56, 189, 248, 0.18)`.

## Shapes

The design system implements balanced geometric cornering (`roundedness: 2`):

- **Standard Containers & Cards (`rounded-xl` / 1.5rem):** Assessment modules, AI suggestion panels, and scorecards.
- **Form Controls & Action Triggers (`rounded-lg` / 1rem):** Input inputs, code editors, select dropdowns, and button groups.
- **Micro-Elements (`rounded` / 0.5rem):** Score badges, inline pills, and keyboard shortcut indicators.
- **Status Indicators & Avatars:** Fully circular (`rounded-full`) to immediately contrast against structural rectilinearity.

## Components

### Buttons
- **Primary:** Solid `#2563EB` fill with white text, crisp 1px tone-on-tone border (`#1D4ED8`), subtly transitioning to `#1D4ED8` on hover. Padding is `space-sm` vertical by `space-md` horizontal, `rounded-lg`.
- **Secondary / Ghost:** Luminous white background with `#0F172A` label, framed with a 1px `#E2E8F0` border. Hover introduces `#F1F5F9` surface fill.
- **AI Action Button:** Subtle gradient background from `#2563EB` to `#0284C7`, framed with an inner border glow and leading micro-sparkle icon.

### Chips & Data Pills
- **Standard Metric Pill:** Compact JetBrains Mono font (`code-badge`), high-contrast dark slate fill (`#0F172A`) with white text, or pale slate (`#F1F5F9`) with `#334155` text.
- **AI Insight Badge:** Soft cyan or violet tint (`#F0F9FF` or `#FAF5FF`) bound by 1px colored outlines (`#BAE6FD` / `#E9D5FF`), accompanied by a pulsating 6px status dot.

### Human-in-the-Loop Indicator
- Dedicated interactive component featuring a segmented state badge: AI Drafted (Violet/Cyan pulse) $\rightarrow$ Review Needed (Amber `#F59E0B`) $\rightarrow$ Verified by Human (Emerald `#10B981` check badge). Includes attribution label specifying the reviewer and confidence threshold.

### Input Fields & Rubric Editors
- Clean `#FFFFFF` fill with an inset border of `#CBD5E1` and 12px horizontal padding. On focus, transitions cleanly to a 1px `#2563EB` border with a 3px outer `#DBEAFE` halo. Includes integrated character and token counting powered by `code-data`.

### Cards & Evaluation Modules
- Built on `#FFFFFF` with `rounded-xl` corners and a structural `#E2E8F0` boundary. Header sections demarcate candidate metadata with clean horizontal hairpins, keeping metrics prominently docked in the top-right quadrant.