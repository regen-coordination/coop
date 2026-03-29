# Sidepanel UI Audit — 6 Fixes

## Context

Visual UI audit of the sidepanel uncovered 6 issues: popup not closing on sidepanel open, banner causing content shift, filter overflow on Chickens tab, Coops list not top-aligned, CoopCard too sparse, and Nest tab header needing a single-row layout.

---

## Fix 1: Close popup when opening sidepanel

**File:** `packages/extension/src/views/Popup/hooks/usePopupOrchestration.ts`

Add `window.close()` after `chrome.sidePanel.open()` succeeds (line ~589) and after the fallback `chrome.tabs.create` (line ~596).

---

## Fix 2: Banner covers filters (no content shift)

**Files:** `SidepanelApp.tsx`, `global.css`

Banner overlays directly on top of the sticky subheader. When dismissed, filters are revealed — no content shift.

Wrap the two `NotificationBanner` instances (lines 204-222) in `<div className="sidepanel-banner-overlay">`.

CSS:
```css
.sidepanel-banner-overlay {
  position: sticky;
  top: 0;
  z-index: 2; /* above subheader z-index: 1 */
  height: 0;
  overflow: visible;
  margin: -0.5rem -0.75rem 0;
}

.sidepanel-banner-overlay > .notification-banner {
  margin: 0.5rem 0.75rem;
}

.sidepanel-banner-overlay:empty {
  display: none;
}
```

`height: 0` removes from flow. `overflow: visible` lets banners cover the subheader. `:empty` collapses when all dismissed.

---

## Fix 3: Chickens tab filter overflow

**File:** `global.css`

Allow filter pills to shrink and reduce padding:
```css
.filter-popover__trigger {
  flex-shrink: 1;              /* was 0 */
  min-width: 48px;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0.25rem 0.5rem;    /* was 0.3rem 0.65rem */
  font-size: 0.78rem;         /* was 0.8rem */
}
```

---

## Fix 4: Coops top-alignment + denser cards

**Files:** `global.css`, `CoopCard.tsx`

### 4a. Top-align content
Add `align-content: start` to `.sidepanel-content` so grid children stack from top.

### 4b. Enrich CoopCard
Add to the card:
1. **Purpose snippet** — first ~60 chars of `coop.profile.purpose`
2. **Member initials row** — up to 4 circles with initials, "+N" overflow

CSS additions:
- `.coop-card-button` gap: `0.3rem` (was `0.15rem`)
- `.coop-card__purpose` — single-line truncated, 0.78rem, soft brown
- `.coop-card__members-row` — flex row, 0.2rem gap
- `.coop-card__member-pip` — 22px circles, mist bg, 0.6rem initials

---

## Fix 5: Nest tab — single row with scrolling pills

**Files:** `NestTab.tsx`, `global.css`

Merge filter pills and action buttons into one `sidepanel-action-row`. Pills take available space (`flex: 1`, overflow scroll), action buttons pinned right.

```tsx
<SidepanelSubheader>
  <div className="sidepanel-action-row">
    {coopTags.length > 0 ? <PopupSubheader ... /> : null}
    {activeCoop ? (
      <>
        <Tooltip content="Refresh">...</Tooltip>
        {nestSubTab === 'members' ? <Tooltip content="Invite member">...</Tooltip> : null}
      </>
    ) : null}
  </div>
  {activeCoop ? <nav className="nest-sub-tabs">...</nav> : null}
</SidepanelSubheader>
```

CSS:
```css
.sidepanel-action-row > .popup-subheader {
  flex: 1;
  min-width: 0;
}
```

---

## Verification

```bash
bun run test packages/extension/src/views/Sidepanel/__tests__/SidepanelApp.test.tsx
bun run test packages/extension/src/views/Sidepanel/__tests__/nest-subheader-integration.test.tsx
bun run test packages/extension/src/views/Sidepanel/tabs/__tests__/ChickensTab-subheader.test.tsx
bun run test packages/extension/src/views/Sidepanel/tabs/__tests__/CoopsTab-subheader.test.tsx
bun run validate smoke
cd packages/extension && bun run build
```

## Critical Files
- `packages/extension/src/global.css` — fixes 2, 3, 4, 5
- `packages/extension/src/views/Sidepanel/SidepanelApp.tsx` — fix 2
- `packages/extension/src/views/Sidepanel/tabs/NestTab.tsx` — fix 5
- `packages/extension/src/views/Sidepanel/cards/CoopCard.tsx` — fix 4b
- `packages/extension/src/views/Popup/hooks/usePopupOrchestration.ts` — fix 1
