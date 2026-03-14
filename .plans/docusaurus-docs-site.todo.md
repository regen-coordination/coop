# Polished Docusaurus Docs Site

**Branch**: `feature/docs-site`
**Status**: ACTIVE
**Created**: 2026-03-13
**Last Updated**: 2026-03-13

## Decision Log

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | `docs-site/` at repo root, outside `packages/` | Not a runtime dependency — keeps workspace clean, avoids build-order entanglement |
| 2 | Reference `../docs/` via Docusaurus `path` config | Existing docs stay where they are, no duplication, single source of truth |
| 3 | Map `--coop-*` → `--ifm-*` in custom.css | Reuse exact design tokens, zero drift from app/extension branding |
| 4 | Vanilla CSS only (no Tailwind) | Matches codebase convention — all packages use CSS custom properties |
| 5 | Custom Prism theme with earthy palette | Default themes (dracula, github) are cold — warm browns/greens/oranges match Coop |
| 6 | Custom React landing page, not default docs index | Polished scope — hero with scattered→organized animation, branded feel |
| 7 | MDX CoopCard component | Reusable callout block matching nest-card visual pattern |
| 8 | Add to root workspaces but keep build independent | `docs:dev` and `docs:build` scripts at root, not part of main `bun build` chain |

## Requirements Coverage

| Requirement | Planned Step | Status |
|-------------|--------------|--------|
| Scaffold Docusaurus | Step 1 | |
| Token → IFM mapping | Step 2 | |
| Navbar with wordmark | Step 2 | |
| Warm Prism code theme | Step 3 | |
| Styled admonitions | Step 3 | |
| Grid backdrop pattern | Step 2 | |
| Custom landing page | Step 4 | |
| CoopCard MDX component | Step 5 | |
| Eyebrow category styling | Step 3 | |
| Organize existing docs | Step 6 | |
| Root scripts (docs:dev, docs:build) | Step 7 | |
| Footer with links | Step 2 | |

## CLAUDE.md Compliance
- [x] Not a shared module — no barrel import concerns
- [x] Single root .env (Docusaurus has no env needs)
- [x] Does not affect build order (shared → app → extension)

## Impact Analysis

### Files to Create
- `docs-site/package.json` — Docusaurus package config
- `docs-site/docusaurus.config.ts` — Site config (navbar, footer, theme, path to docs)
- `docs-site/sidebars.ts` — Sidebar structure mapping doc categories
- `docs-site/src/css/custom.css` — Token bridge + branded overrides + grid backdrop
- `docs-site/src/css/coop-prism-theme.ts` — Warm earthy code syntax theme
- `docs-site/src/components/CoopCard/index.tsx` — MDX callout component
- `docs-site/src/components/CoopCard/styles.module.css` — Card styles
- `docs-site/src/pages/index.tsx` — Custom landing page
- `docs-site/src/pages/index.module.css` — Landing page styles
- `docs-site/static/branding/` — Copy of key branding assets (wordmark, mark, favicon)
- `docs-site/tsconfig.json` — TypeScript config

### Files to Modify
- `package.json` (root) — Add `docs:dev` and `docs:build` scripts
- `docs/*.md` (10 files) — Add Docusaurus frontmatter (title, sidebar_position, sidebar_label)

### Files NOT Modified
- `packages/shared/src/styles/tokens.css` — Referenced, not changed
- `packages/shared/src/styles/a11y.css` — Referenced, not changed

## Test Strategy
- **Manual**: `bun docs:dev` serves the site, all pages render, navigation works
- **Build**: `bun docs:build` produces static output without errors
- **Visual**: Landing page animation matches app landing pattern, code blocks use warm theme

## Implementation Steps

### Step 1: Scaffold Docusaurus
**Files**: `docs-site/package.json`, `docs-site/tsconfig.json`, `docs-site/docusaurus.config.ts`, `docs-site/sidebars.ts`
**Details**:
- Initialize Docusaurus with `@docusaurus/preset-classic`
- Configure `docs.path` to `../docs` so existing markdown is served directly
- Set up TypeScript support
- Configure navbar: logo = `coop-wordmark-flat.png`, items = doc sections
- Configure footer: minimal, links to GitHub and app
- Set `colorMode.disableSwitch: true` (light-only, matches Coop brand — warm palette has no dark variant)
**Verify**: `cd docs-site && npx docusaurus start` loads without errors

### Step 2: Brand Integration — Custom CSS + Token Bridge
**Files**: `docs-site/src/css/custom.css`, `docs-site/static/branding/*`
**Details**:
- Copy tokens inline (can't import from `../packages/shared` due to Docusaurus build isolation)
- Map all `--coop-*` tokens to corresponding `--ifm-*` Docusaurus variables:
  - `--ifm-color-primary` → `--coop-green` (#5a7d10) for links, active sidebar
  - `--ifm-color-primary-dark/darker/darkest` → green scale
  - `--ifm-color-primary-light/lighter/lightest` → green scale
  - `--ifm-background-color` → `--coop-cream` (#fcf5ef)
  - `--ifm-font-family-base` → `--coop-font-body` (Avenir Next stack)
  - `--ifm-font-family-monospace` → `--coop-font-mono` (SFMono/JetBrains)
  - `--ifm-heading-font-family` → `--coop-font-display` (Gill Sans stack)
  - `--ifm-navbar-background-color` → cream with backdrop-filter blur
  - `--ifm-footer-background-color` → `--coop-brown`
  - `--ifm-footer-color` → white
- Add grid backdrop pattern (48px grid, brown 7% opacity, mask-image fade) to `html` or layout wrapper
- Style navbar with frosted glass effect (`backdrop-filter: blur(12px)`)
- Style sidebar: active item gets pill-shaped green highlight
- Override heading styles: brown color, display font, fluid sizing
- Override link colors: green primary, brown hover
- Copy branding assets to `docs-site/static/branding/`: `coop-wordmark-flat.png`, `coop-mark-flat.png`
**Verify**: Site renders with cream background, brown text, green links, wordmark in navbar

### Step 3: Warm Prism Theme + Admonitions + Eyebrows
**Files**: `docs-site/src/css/coop-prism-theme.ts`, `docs-site/src/css/custom.css` (additions)
**Details**:
- Create custom Prism theme object:
  - Background: `#faf5ee` (warm cream, slightly darker than page)
  - Plain text: `--coop-brown` (#4f2e1f)
  - Keywords: `--coop-orange` (#fd8a01)
  - Strings: `--coop-green` (#5a7d10)
  - Comments: `--coop-brown-soft` (#6b4a36) italic
  - Functions: `--coop-ink` (#27140e)
  - Numbers/booleans: `--coop-orange`
  - Operators: `--coop-brown-soft`
  - Border-radius on code blocks: `--coop-radius-input` (16px)
- Style admonitions as Coop cards:
  - All: `border-radius: var(--coop-radius-input)`, soft shadow, cream bg
  - Tip: green left border + green heading
  - Warning/caution: orange left border + orange heading
  - Danger: error red left border + red heading
  - Info/note: brown-soft left border + brown heading
- Style category labels as eyebrow text:
  - Sidebar category headings: uppercase, 0.78rem, letter-spacing 0.12em, green color, font-weight 700
**Verify**: Code blocks render warm, admonitions look like Coop cards, category labels are styled

### Step 4: Custom Landing Page
**Files**: `docs-site/src/pages/index.tsx`, `docs-site/src/pages/index.module.css`
**Details**:
- Hero section inspired by app landing page:
  - Wordmark or mark-glow as hero image
  - Eyebrow: "Documentation"
  - Headline: "Build with Coop" (display font, brown, fluid clamp sizing)
  - Subtitle: brief description in brown-soft body font
  - Two CTA buttons: "Get Started" (brown primary pill) → /docs/intro, "GitHub" (secondary outlined pill) → repo
- Scattered→organized animation section:
  - 3-column grid: scattered cards (dashed border, rotated, 70% opacity) → Coop mark center → organized cards (green-tinted, solid, shadow)
  - Matches existing `.hero-flow` pattern from app landing
  - Uses `rise-in` animation (480ms ease, fade + slide-up)
- Quick links grid (3 cards matching nest-card pattern):
  - "Architecture" — overview of modules and packages
  - "Guides" — getting started, testing, demo
  - "Product" — PRD, roadmap, EF mandate
  - Each card: `border-radius: 24px`, `backdrop-filter: blur(12px)`, brown shadow, cream bg
- Radial gradient background (green top-left, orange top-right, matching app body)
- Grid backdrop overlay
- Respect `prefers-reduced-motion`: disable animations
**Verify**: Landing page renders with animation, cards link to doc sections, responsive at mobile breakpoints

### Step 5: CoopCard MDX Component
**Files**: `docs-site/src/components/CoopCard/index.tsx`, `docs-site/src/components/CoopCard/styles.module.css`
**Details**:
- React component accepting `title`, `children`, optional `variant` (default | highlight | warning)
- Styled as nest-card pattern:
  - `border: 1px solid var(--coop-line)`
  - `border-radius: 24px`
  - `background: rgba(255, 252, 249, 0.8)`
  - `box-shadow: var(--coop-shadow-md)`
  - `backdrop-filter: blur(12px)`
  - `padding: 1.4rem`
- Title rendered as h3 with brown color
- `highlight` variant: green-tinted border + background (like `.is-organized` cards)
- `warning` variant: orange-tinted border + background
- Register as global MDX component via `@theme/MDXComponents` swizzle
- Usage in docs: `<CoopCard title="Important">Content here</CoopCard>`
**Verify**: Component renders in MDX docs with correct styling

### Step 6: Organize Existing Docs with Frontmatter
**Files**: 10 docs in `docs/` directory
**Details**:
- Add YAML frontmatter to each doc file (title, sidebar_position, sidebar_label, optional description)
- Create `docs/intro.md` as the landing doc (derived from README.md, trimmed to essentials: what is Coop, local dev setup, link to extension install)
- Mapping:

  ```
  docs/
  ├── intro.md                              (new — sidebar_position: 1, label: "Introduction")
  ├── getting-started/
  │   ├── _category_.json                   (label: "Getting Started", position: 2)
  │   └── extension-install-and-distribution.md  (position: 1, label: "Install Extension")
  ├── architecture/
  │   ├── _category_.json                   (label: "Architecture", position: 3)
  │   ├── coop-os-architecture-vnext.md     (position: 1, label: "System Overview")
  │   └── green-goods-integration-spec.md   (position: 2, label: "Green Goods Integration")
  ├── guides/
  │   ├── _category_.json                   (label: "Guides", position: 4)
  │   ├── demo-and-deploy-runbook.md        (position: 1, label: "Demo & Deploy")
  │   ├── testing-and-validation.md         (position: 2, label: "Testing")
  │   ├── coop-design-direction.md          (position: 3, label: "Design Direction")
  │   └── coop-audio-and-asset-ops.md       (position: 4, label: "Audio & Assets")
  ├── product/
  │   ├── _category_.json                   (label: "Product", position: 5)
  │   ├── prd.md                            (position: 1, label: "PRD")
  │   ├── scoped-roadmap-2026-03-11.md      (position: 2, label: "Roadmap")
  │   └── ethereum-foundation-mandate.md    (position: 3, label: "EF Mandate")
  ```

- Skip ephemeral docs (ui-review-issues, meeting-followups, current-state) — not doc-worthy
- Create `_category_.json` files for each subfolder (controls sidebar grouping + eyebrow labels)
- Move files into subdirectories as mapped above
**Verify**: Sidebar renders with correct hierarchy, all doc pages load

### Step 7: Root Integration — Scripts + Workspace
**Files**: `package.json` (root)
**Details**:
- Add scripts:
  - `"docs:dev": "cd docs-site && npx docusaurus start"`
  - `"docs:build": "cd docs-site && npx docusaurus build"`
  - `"docs:serve": "cd docs-site && npx docusaurus serve"`
- Do NOT add `docs-site` to workspaces (it uses npm/npx, not bun workspace protocol — Docusaurus has npm-specific tooling)
- Add `docs-site/` to `.gitignore` entries if needed (build output: `docs-site/build/`)
**Verify**: `bun docs:dev` starts the dev server from repo root

## Validation
- [ ] `bun docs:dev` starts without errors
- [ ] `bun docs:build` produces static output
- [ ] Landing page renders with hero animation and quick-link cards
- [ ] All 10 docs render at their expected URLs
- [ ] Sidebar shows correct hierarchy with eyebrow-styled category labels
- [ ] Code blocks use warm Prism theme
- [ ] Admonitions styled as Coop cards
- [ ] CoopCard MDX component works in docs
- [ ] Navbar shows wordmark, footer shows links
- [ ] Existing `bun build` still works (docs-site doesn't interfere)
- [ ] Responsive: mobile breakpoints don't break layout
