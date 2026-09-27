# Design System & Visual Specification: AI Educational Tool (Dribbble Gapsy Studio)

> **Core Directive:** *Full redesign across all pages matching the Gapsy Studio Dribbble reference (Forest Green `#1E4D3B`, Warm Amber `#F59E0B`, Cerulean Blue `#2563EB`, Lavender Purple `#8B5CF6`, Soft Mint `#E2EFE9`, Warm Cream `#F4F3ED`, Light Canvas `#F3F4F6`, and Peach radial glow `#FFA07A`). Strictly eliminate AI slop.*

---

## 1. Palette & Semantic Color Tokens

```css
:root {
  /* Core Brand Tokens */
  --brand-forest: #1E4D3B;        /* Primary Deep Forest Green */
  --brand-forest-dark: #143528;
  --brand-forest-light: #2D5A47;
  
  /* Container Accents */
  --brand-mint: #E2EFE9;          /* Soft Mint Container */
  --brand-cream: #F4F3ED;         /* Warm Cream Container */
  --brand-peach: #FFA07A;         /* Peach Radial Glow Accent */

  /* Vibrant Metric Cards */
  --brand-amber: #F59E0B;         /* Warm Amber / Gold Card */
  --brand-blue: #2563EB;          /* Cerulean Blue Card */
  --brand-purple: #8B5CF6;        /* Lavender Purple Card */

  /* Surfaces & Canvas */
  --canvas-base: #F3F4F6;         /* Clean Campus Slate/Gray Canvas */
  --surface-card: #FFFFFF;        /* Pure White Card */
  --surface-subtle: #F9FAFB;      /* Subtle Neutral Hover */
  --border-clean: #E5E7EB;        /* Crisp Divider */
  
  /* Typography */
  --text-heading: #111827;        /* Slate 900 high contrast */
  --text-body: #4B5563;           /* Slate 600 */
  --text-muted: #6B7280;          /* Slate 500 */
}
```

---

## 2. Geometry, Shape Language & Micro-Interactions

- **Borders & Radii:** 
  - Cards: `rounded-3xl` (24px - 28px) with subtle 1px border `border-[#E5E7EB]`.
  - Buttons & Chips: `rounded-full` pills (e.g. `+ Buat Tugas Baru`, `Weekly / Monthly`, filter chips).
- **Navigation Dock:**
  - Floating vertical dock (`w-[76px]` or `w-64`), circular brand emblem in `#1E4D3B` with custom clover logo.
  - Active item indicator: soft peach/coral blur glow (`rgba(255, 160, 122, 0.25)`) and mint background `#E2EFE9`.
- **Hero Banners:**
  - Deep Forest Green `#1E4D3B` gradient, high-contrast white typography, 3D pastel geometric vector illustrations (twisted ribbon, pink sphere).

---

## 3. Anti-AI Slop Quality Floor

- **No Rainbow Text Gradients:** Text uses authoritative solid colors (`text-white`, `text-[#111827]`, `text-[#1E4D3B]`).
- **No Random Float/Glass Fluff:** Glass effects are limited to sticky topbars with crisp borders and opaque backdrop blurs.
- **Authentic Data Density:** Clear task status, student counts, deadlines, segmented progress bars, and transparent grading criteria.
