# Coop Visual Style Guide v0 (Implementation-Ready)

**Version:** v0  
**Date:** 2026-03-08  
**Applies to:** `packages/pwa`, `packages/extension`, `packages/shared`

---

## 1) Design intent

Coop UI should feel:
- **Calm:** dark, low-noise, high-contrast hierarchy.
- **Confident:** clear action priority and state feedback.
- **Fluid:** subtle motion + glass depth, never gimmicky.
- **Functional-first:** polish supports speed and trust.

---

## 2) Token source of truth

Primary token source in code:
- `packages/shared/src/theme/visualTokens.ts`

Use these exports consistently:
- `colors`
- `spacing`
- `typography`
- `borderRadius`
- `shadows`
- `transitions`
- `effects`
- `animations`

> Do not hardcode ad-hoc hex values in feature components unless adding a new semantic token first.

---

## 3) Color usage guidance

### Background layering
- `colors.bg.primary` = app root background.
- `colors.bg.secondary` = standard card/input backgrounds.
- `colors.bg.tertiary` / `quaternary` = hover/active elevations.

### Brand + semantic roles
- `colors.brand[500]` = primary action CTA.
- `colors.brand[400]` = emphasized labels/links.
- `colors.semantic.success|warning|error|info` = state badges/toasts.

### Text hierarchy
- `text.primary` for titles/critical labels.
- `text.secondary` for body copy.
- `text.tertiary` for metadata/hints.
- `text.quaternary` for disabled states.

### Borders
- `border.subtle` default separators.
- `border.light` hover/elevated elements.
- `border.focus` input focus ring and active controls.

---

## 4) Spacing system

Use 4px base scale from tokens.

- Micro gaps: `spacing[1]` / `spacing[2]`
- Standard control padding: `spacing[3]` + `spacing[4]`
- Card inner padding: `spacing[4]`–`spacing[5]`
- Section spacing: `spacing[6]`+

### Practical layout rules
- **Min tap target:** 44px height.
- **Card-to-card gap:** default `spacing[3]` mobile, `spacing[4]` desktop.
- **Section headers:** margin bottom `spacing[3]`.
- **Feed list spacing:** `spacing[3]` per item.

---

## 5) Typography rules

### Type scale (from tokens)
- Labels/meta: `xs`–`sm`
- Body: `sm`–`md`
- Section titles: `md`–`lg`
- Page titles: `xl`–`2xl`

### Weights
- Body defaults to `normal`.
- Interactive controls: `medium`.
- Section headings: `semibold`.
- Hero/title only: `bold`.

### Readability constraints
- Avoid long paragraphs in sidepanel; keep under ~2 lines where possible.
- Use sentence case for body copy, uppercase only for tiny metadata labels.

---

## 6) Motion and effects

### Motion defaults
- Hover/press: `transitions.hover` / `transitions.scale`
- Focus transitions: `transitions.focus`
- Entry transitions: max 200–300ms for panels/cards

### Glass usage
- Standard cards/nav overlays use `effects.glass`.
- Strong overlays (bottom nav, modal backdrops) use `effects.glassStrong`.

### Motion limits
- No continuous animation except explicit states (recording, processing).
- Limit simultaneous animated elements to maintain calm UX.

---

## 7) Component patterns (current → polished spec)

## 7.1 Buttons

**Current:** primary/secondary/ghost/danger variants already present.

**Polished spec:**
- Keep 4 variants, add semantic intent mapping by context.
- Primary button: one per view section where possible.
- Disabled: opacity + no hover transform.

```tsx
<Button variant="primary" size="md" />
<Button variant="secondary" size="md" />
<Button variant="ghost" size="sm" />
<Button variant="danger" size="sm" />
```

## 7.2 Inputs + Select

**Current:** good baseline focus styling.

**Polished spec:**
- Always pair with visible label.
- Use helper/error text below field.
- Share code input uses mono font + increased letter spacing.

## 7.3 Cards (Glass)

**Current:** gradient/glass cards are consistent.

**Polished spec:**
- Keep one dominant card style.
- Use border accent only for meaningful state (offline queue, error).
- Card hover only when clickable.

## 7.4 Status Badges

**Current:** online/offline/connecting badge supported.

**Polished spec:**
- Dot + text format mandatory.
- Color from semantic tokens only.
- Consistent terms: `Online`, `Offline`, `Connected`, `Connecting`, `Disconnected`.

## 7.5 Feed Item

**Polished structure order:**
1. Type + timestamp row
2. Content preview (title/transcript)
3. Action row (`Process`, `Open`, optional `Pin`)
4. Processing state block (if any)
5. Result summary + action chips

## 7.6 Canvas Node Cards

For `CaptureNode` and `InsightNode`:
- Node title: `sm/medium`
- Content preview: `xs|sm secondary`
- Metadata chips: `xs tertiary`
- Selected state: brand glow + stronger border

---

## 8) Accessibility & QA gates

Minimum requirements for v0 polish:
- Text contrast meets WCAG AA for body content.
- Keyboard focus visible on all actionable elements.
- Hit area >= 44x44 on touch targets.
- Toasts/status updates readable and non-blocking.
- Color is not sole indicator (icon/text included for states).

---

## 9) Per-surface style calibration

### Mobile PWA
- Larger touch spacing (`spacing[4]+`).
- Prominent voice capture CTA.
- Keep cards chunky and glanceable.

### Extension sidepanel
- Higher information density but preserve hierarchy.
- Compact cards and controls, avoid tiny text (<11px).
- Prioritize feed readability and quick processing.

### Canvas
- Lower chroma background, emphasize node content.
- Control panels in glass style with restrained shadow depth.
- Selection states should be obvious but not distracting.

---

## 10) Implementation checklist for dev handoff

- [ ] Replace remaining hardcoded visual values with `visualTokens`.
- [ ] Normalize button/input/card primitives across PWA + extension.
- [ ] Add helper/error text styles for all form fields.
- [ ] Introduce standard status badge component usage everywhere.
- [ ] Ensure processing state visual patterns match in feed + detail + canvas inspector.
- [ ] Run visual QA with screenshot-shotlist acceptance criteria.
