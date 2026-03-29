# Sidepanel UI Audit — 6 Fixes

## Context

Visual UI audit of the sidepanel uncovered 6 issues: popup not closing on sidepanel open, banner causing content shift, filter overflow on Chickens tab, Coops list not top-aligned, CoopCard too sparse, and Nest tab header needing a single-row layout.

---

## Fix 1: Close popup when opening sidepanel

**File:** `packages/extension/src/views/Popup/hooks/usePopupOrchestration.ts`

Add `window.close()` after `chrome.sidePanel.open()` succeeds (line ~589) and after the fallback `chrome.tabs.create` (line ~596). This is safe — `window.close()` in a Chrome extension popup simply dismisses it.

```ts
// After line 589: updateWorkspaceFallbackState(true);
window.close();

// After line 596: await chrome.tabs.create(...)
window.close();
```

---

## Fix 2: NotificationBanner overlays instead of shifting content

**Files:** `SidepanelApp.tsx`, `global.css`

Wrap the two `NotificationBanner` instances (lines 204-222 in SidepanelApp.tsx) in a `<div className="sidepanel-banner-overlay">`.

CSS for the overlay wrapper:
```css
.sidepanel-banner-overlay {
  position: sticky;
  top: 0;
  z-index: 2; /* above subheader's z-index: 1 */
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

`height: 0` removes it from flow so no content shift occurs. `overflow: visible` lets the banners visually overlay the subheader. When all banners are dismissed (return `null`), the wrapper is `:empty` and collapses.

**Test note:** `SidepanelApp.test.tsx` mocks NotificationBanner as `() => null` — the wrapper becomes `:empty`. No breakage.

---

## Fix 3: Chickens tab filter overflow

**Files:** `global.css`

Two CSS changes to make filters fit:

1. Allow filter pill triggers to shrink:
```css
.filter-popover__trigger {
  flex-shrink: 1;        /* was 0 */
  min-width: 48px;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

2. Reduce filter trigger padding for compactness:
```css
.filter-popover__trigger {
  padding: 0.25rem 0.5rem;  /* was 0.3rem 0.65rem */
  font-size: 0.78rem;       /* was 0.8rem */
}
```

**Test note:** No DOM structure change, just CSS. Tests pass.

---

## Fix 4: Coops page vertical positioning

**File:** `global.css` line ~961

Add `align-content: start` to `.sidepanel-content`:

```css
.sidepanel-content {
  /* existing properties... */
  align-content: start;
}
```

This ensures grid children stack from the top rather than stretching to fill the 1fr row.

---

## Fix 5: Enrich CoopCard

**Files:** `packages/extension/src/views/Sidepanel/cards/CoopCard.tsx`, `global.css`

Add to the card:
1. **Purpose snippet** — first ~60 chars of `coop.profile.purpose` (field confirmed in schema)
2. **Member initials row** — up to 4 small circles with initials, "+N" overflow

New JSX elements between name-row and stat-lines:
```tsx
{purpose ? <span className="coop-card__purpose">{truncated}</span> : null}
```

After meta-line:
```tsx
<span className="coop-card__members-row">
  {visibleMembers.map(m => <span className="coop-card__member-pip">{initials}</span>)}
  {overflow > 0 ? <span className="coop-card__member-pip--overflow">+{n}</span> : null}
</span>
```

CSS additions:
- `.coop-card-button` gap: `0.3rem` (was `0.15rem`)
- `.coop-card__purpose` — single-line truncated, 0.78rem, soft brown
- `.coop-card__members-row` — flex row, 0.2rem gap
- `.coop-card__member-pip` — 22px circles, mist background, 0.6rem initials

---

## Fix 6: Nest tab — filters + actions on same row

**Files:** `packages/extension/src/views/Sidepanel/tabs/NestTab.tsx`, `global.css`

Merge the `PopupSubheader` (coop filter pills) and action buttons (refresh/invite) into a single `sidepanel-action-row`:

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

CSS addition to let the subheader pills fill available width:
```css
.sidepanel-action-row > .popup-subheader {
  flex: 1;
  min-width: 0;
}
```

**Test note:** `nest-subheader-integration.test.tsx`:
- Line 382: checks `.popup-subheader` doesn't contain `.nest-sub-tabs` — **still passes** (they're in different containers)
- Line 406: scopes to `.sidepanel-action-row` for invite button — **still passes** (button remains in action row)

---

## Verification

```bash
# Unit tests for affected components
bun run test packages/extension/src/views/Sidepanel/__tests__/SidepanelApp.test.tsx
bun run test packages/extension/src/views/Sidepanel/__tests__/nest-subheader-integration.test.tsx
bun run test packages/extension/src/views/Sidepanel/tabs/__tests__/ChickensTab-subheader.test.tsx
bun run test packages/extension/src/views/Sidepanel/tabs/__tests__/CoopsTab-subheader.test.tsx

# Smoke validation (includes build)
bun run validate smoke

# Visual verification: build extension, load in Chrome, check each tab
cd packages/extension && bun run build
```

## Critical Files
- `packages/extension/src/global.css` — fixes 2, 3, 4, 5, 6
- `packages/extension/src/views/Sidepanel/SidepanelApp.tsx` — fix 2
- `packages/extension/src/views/Sidepanel/tabs/NestTab.tsx` — fix 6
- `packages/extension/src/views/Sidepanel/cards/CoopCard.tsx` — fix 5
- `packages/extension/src/views/Popup/hooks/usePopupOrchestration.ts` — fix 1
