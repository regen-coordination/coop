# Sidepanel Chickens Tab & Notification Audit

## Context

The sidepanel notification system and Chickens tab are too noisy and information-dense. Badge numbers are misleading (badge says "22" but banner says "4 to review"), the Coops badge shows membership count (not actionable), synthesis cards show ~400-500px of info each (only 1 visible without scrolling), and there's redundant filtering at two levels. The user confirmed "Why it matched" and "Next move" are valuable — everything else needs to be stripped down or hidden.

### Confirmed Decisions
- **Chickens badge** → drafts only (matches banner)
- **Coops badge** → remove entirely (not actionable)
- **Card pieces** → 4 pieces: title, insight, tags, push action
- **Tab structure** → 2 segments only: **Review** (signals + drafts + stale merged) and **Shared**
- **Time grouping** → Apple Finder-style sections: Today, Yesterday, Previous 7 Days, 30 Days, 90 Days, Year
- **Design feel** → Notion-like calm: clean whitespace, subtle typography, intentional and unhurried
- **Design ethos** → playful, friendly, all-ages approachable; minimize text; trust loop = quality insight → quick push
- **Push action** → single "Push →" button with coop picker dropdown
- **Dedup** → include tab dedup fix in this pass
- **Action buttons** → remove Round Up, Capture Tab, Screenshot from Chickens subheader (pure review tab)
- **Time headers** → subtle uppercase with thin divider line ("─── TODAY ───"), not sticky

---

## Part 1: Fix Notification Badges

**File:** `packages/extension/src/views/Sidepanel/SidepanelApp.tsx` (lines 245-261)

| Tab | Current | Problem | New |
|-----|---------|---------|-----|
| **Chickens** | `pendingAttentionCount` (drafts + signals + stale) | "22" when only 4 drafts to review | `pendingDrafts` only |
| **Coops** | `coops.length` | "1" just means you're in 1 coop — not actionable | `0` (remove badge) |
| **Roost** | Green Goods policy actions | Subset of Nest badge — redundant | `0` (remove badge) |
| **Nest** | Policy actions + pending plans | Genuinely actionable | Keep as-is |

**Result:** Only Chickens (draft count) and Nest (pending actions) show badges. The Chickens badge will match the banner number.

---

## Part 2: Fix Notification Banner Positioning

**File:** `packages/extension/src/global.css` — `.sidepanel-banner-overlay`

Current: `position: sticky; top: 0; height: 0; overflow: visible` — floats over content, obscures what user is reading.

**Change:** Remove `height: 0; overflow: visible`. Keep sticky behavior but give the banner real height so it pushes content down instead of overlapping:

```css
.sidepanel-banner-overlay {
  position: sticky;
  top: 0;
  z-index: 2;
  margin: 0 -0.75rem;
  padding: 0.25rem 0.75rem;
  background: var(--coop-surface);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
```

Banner still sticks at top on scroll, but now occupies layout space — no overlap.

---

## Part 3: Redesign Chickens Tab Structure

**File:** `packages/extension/src/views/Sidepanel/tabs/ChickensTab.tsx`

### Remove the "Synthesis Queue" wrapper
- Delete the `<article className="panel-card synthesis-queue-card">` wrapper, `<h2>Synthesis Queue</h2>`, and helper text paragraph — the Chickens tab IS the queue, no label needed.

### Two segments only: Review | Shared
- Replace the 3 segment tabs (Signals | Drafts | Stale) with just **2 segments** in the sticky subheader: **Review** and **Shared**
- **Review** merges signals, drafts, and stale observations into one unified feed, sorted by recency
- **Shared** shows artifacts already pushed to coops
- Remove the Status filter popover entirely — the 2 segments replace it
- Remove Time filter popover — time grouping replaces it (see below)
- Keep Category filter only
- **Remove action buttons** (Round Up, Capture Tab, Screenshot) from Chickens subheader — the Chickens tab is pure review, not capture. These actions live elsewhere (popup, keyboard shortcuts).

### Apple Finder-style time grouping
Within each segment, items are grouped into time sections with sticky section headers:
- **Today**
- **Yesterday**
- **Previous 7 Days**
- **Previous 30 Days**
- **Previous 90 Days**
- **This Year** / **Older**

Empty sections are hidden. This replaces the Time filter popover — no need to filter by time when you can see the temporal structure at a glance.

### Flatten content
- No nested card wrappers. Section headers → flat list of compact cards within each time group.

---

## Part 4: Compact Synthesis Cards

**Design philosophy:** Playful, friendly, approachable for all ages. A teenager making a coop for game ideas should find this easy. Minimize text — lots of info gets blurry and hard to contextualize. Think in 3-4 pieces of info per card.

**Goal:** ~120-140px per card so 3-4 are visible without scrolling (currently ~400-500px, only 1 visible).

### Card anatomy (both signals and drafts share this layout)

**The 4 pieces — always visible:**
1. **Title** — what is this (single line, ellipsis)
2. **Insight** — why it's relevant (1-2 line clamp, combines "why it matched" into a single concise line)
3. **Tags** — 2-3 small pills for cross-card connection (helps you spot patterns across the queue)
4. **Suggested coop** — badge showing which coop to send it to + inline push action

**Inline action:** Single "Push →" button at bottom-right of card. Tapping it opens a small coop picker dropdown (list of matched coops). One tap to push, no need to expand the card. This is the trust loop: quality insight → quick action.

**Header line:** Category pill + relative time (right-aligned). Subtle, not competing with the 4 pieces.

**Behind progressive disclosure (`<details>` expand):**
- Full "Why it matched" + "Next move" text (untruncated)
- Source URL and domain
- Support list (memories, drafts, artifacts)
- Ritual lenses
- Edit form and secondary actions
- Match %, confidence, provenance metadata

**Removed entirely (not even behind expand):**
- Coop count badge (redundant with suggested coop)
- "Focused" / "draft linked" text pills (keep border highlight via `data-focused`)
- "Worth saving" badge and helper text
- Rationale text block
- Provenance badge

### StaleObservationCard — Already compact, keep as-is.

### Dedup fix (included in this pass)
Tabs that stay open get re-captured, creating duplicate cards. Need to fix the capture/dashboard pipeline so that if a tab URL is already represented by an existing candidate (same `canonicalUrl` or `canonicalUrlHash`), it updates the existing candidate's timestamp rather than creating a new one. Investigation needed in `background/dashboard.ts` (`buildSummary`) and the capture handler to identify where dedup should be enforced.

---

## Part 5: CSS Changes

**File:** `packages/extension/src/global.css`

1. **New `.compact-card` styles** — reduced padding (0.65rem), tighter gap (0.3rem), friendly rounded feel
2. **`.compact-card__title`** — single line, `text-overflow: ellipsis`, slightly larger weight for scanability
3. **`.compact-card__insight`** — single line or 2-line clamp, subtle color, easy on eyes
4. **`.compact-card .badge-row`** — smaller tag pills (0.72rem font, 0.2rem padding), playful rounded style
5. **`.compact-card__coop-suggest`** — inline coop badge + push button, right-aligned or bottom row
6. **Delete `.synthesis-queue-card`** rule block
7. **Update `.popup-subheader--equal`** — support 2 segments (`repeat(2, 1fr)`)
8. **New `.time-group` styles** — section headers for time grouping (Notion-like calm)
   - `.time-group__header` — subtle uppercase label (e.g. "TODAY") with thin divider line extending to the right
   - Muted brown-soft color, small font (0.7rem), letter-spacing for readability
   - Top margin for breathing room between sections
   - Not sticky (keeps it minimal — the label is visible as you scroll into each section)

**File:** `packages/extension/src/views/Popup/popup.css`
- Update equal-width subheader grid for 2 segments.

**Design feel:** Notion-like calm — clean whitespace, subtle typography, unhurried. Cards should have generous spacing between them. The cream/brown/green palette already supports this warmth. Use `frontend-design` skill during implementation for polish.

---

## Part 6: Filter Simplification

**File:** `packages/extension/src/views/Sidepanel/tabs/chickens-filters.ts`

- Remove `status` from `ChickensFilterState` — replaced by segment tabs
- Remove `timeRange` — replaced by Apple Finder-style time grouping (no filtering, just visual sections)
- Keep `category` as the only active filter
- Update `applyChickensFilters` and `isFilterActive`
- Add time-grouping utility: function that takes a sorted list of items and returns `{ label: string; items: T[] }[]` groups based on the date buckets (Today, Yesterday, Previous 7 Days, etc.)

---

## Implementation Order

1. **Badge fixes** (SidepanelApp.tsx) — smallest change, immediate clarity win
2. **Banner repositioning** (global.css) — CSS-only, no component changes
3. **Tab structure** (ChickensTab.tsx) — remove wrapper, promote segments, remove Status filter
4. **Compact cards** (ChickensTab.tsx + cards.tsx + global.css) — use `frontend-design` skill for polished compact layout; include coop picker dropdown on Push button
5. **Filter cleanup** (chickens-filters.ts) — remove dead status filter code
6. **Dedup fix** (background/dashboard.ts + capture handler) — prevent re-capture of same open tab URL
7. **Test updates** — update ChickensTab tests for new structure + dedup tests

---

## Critical Files

| File | Changes |
|------|---------|
| `packages/extension/src/views/Sidepanel/SidepanelApp.tsx` | Badge calculation (lines 245-261) |
| `packages/extension/src/global.css` | Banner overlay, compact card styles, delete synthesis-queue-card |
| `packages/extension/src/views/Sidepanel/tabs/ChickensTab.tsx` | Major restructure: remove wrapper, promote tabs, compact cards |
| `packages/extension/src/views/Sidepanel/cards.tsx` | DraftCard compact variant for Chickens context |
| `packages/extension/src/views/Sidepanel/tabs/chickens-filters.ts` | Remove status filter |
| `packages/extension/src/views/Popup/popup.css` | Subheader grid update for 4 segments |

---

## Verification

1. `bun run validate typecheck` after each step
2. `bun run validate smoke` after steps 3-4 (cross-component changes)
3. Build extension (`cd packages/extension && bun run build`) and visually verify:
   - Only Chickens + Nest tabs show badges
   - Chickens badge number matches banner number
   - Banner pushes content down, doesn't overlap
   - 3-4 compact cards visible without scrolling
   - Each card shows: title, insight, tags, push action — nothing else by default
   - Progressive disclosure expands to show full details
   - 2 segment tabs (Review | Shared) work correctly
   - Time grouping sections (Today, Yesterday, etc.) render with sticky headers
   - Empty time groups are hidden
   - Push button opens coop picker dropdown
4. Run existing tests: `bun run test -- --grep Chickens`
