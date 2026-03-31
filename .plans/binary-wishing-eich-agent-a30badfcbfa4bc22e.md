# Roost Tab Optimization: Dual Sub-Tab Layout

## Recommendation: "Focus" + "Garden" (Modified Option B)

After thorough analysis of the codebase, user workflow, and the constraint that Green Goods may not be enabled, I recommend a modified version of Option B with the sub-tab names **"Focus"** and **"Garden"**.

### Why not the other options?

**Option A ("Overview" + "Work")** fails because "Overview" is passive -- it tells you what IS, not what to DO. The user specifically wants action-optimization. The Overview tab becomes a dead screen the user clicks through to get to Work.

**Option C ("Dashboard" + "Contribute")** has the same passivity problem with "Dashboard," and "Contribute" is too narrow -- it only maps to Green Goods contribution, not to the broader actions like reviewing chickens.

**Option B ("Actions" + "Garden")** is closest, but "Actions" is generic and corporate. In the Coop vocabulary, the first tab should feel like a personal workspace cockpit. **"Focus"** captures "here is what needs your attention right now."

### Why 2 sub-tabs, not 3?

The Nest tab uses 3 sub-tabs because it has 3 genuinely distinct domains (members/agent/settings). The Roost tab's content naturally splits into exactly 2 concerns:

1. **Your immediate work** -- signals, drafts, stale items, recent activity, quick actions
2. **Green Goods lifecycle** -- provisioning, work submission, capital/payouts

Adding a third would force an artificial split (e.g., separating stats from actions) that creates more navigation without more clarity. Two tabs also mean each pill gets more horizontal space in the narrow sidepanel, making them easier tap targets.

---

## Sub-Tab 1: "Focus" (DEFAULT)

The Focus tab is the **action cockpit**. It answers: "What should I do right now?"

### Content (top to bottom):

1. **Action Strips** -- a compact row of action buttons that are the primary CTAs
   - "Review Chickens" button (existing `primary-button`, with badge showing `pendingDrafts` count)
   - Conditional: "Review Stale" link (only when `staleObservationCount > 0`)

2. **At-a-Glance Stats** -- the existing `roost-summary-strip` with 3 stat cells (Signals, Drafts, Stale), but moved BELOW the action buttons so action is above-the-fold

3. **Recent Activity** -- the existing top-3 artifacts list (unchanged, already compact)

4. **Quick Capture** -- a minimal "capture this tab" button row (uses existing `tabCapture` from orchestration, only if available). This gives the user a way to feed the coop without leaving the Roost tab.

### Why this ordering:
- Action buttons at the very top = zero-scroll to the most common action
- Stats below reinforce what the buttons address (3 drafts -> "Review Chickens")
- Recent activity provides context without requiring navigation
- Quick capture is a bonus convenience, not the primary flow

### Badge logic for "Focus" pill:
```
focusBadge = (summary?.pendingDrafts ?? 0) + (summary?.staleObservationCount ?? 0)
```
This badge tells the user "you have N things needing attention." It drives urgency on the sub-tab pill.

---

## Sub-Tab 2: "Garden" 

The Garden tab is the **Green Goods workspace**. It answers: "How is my garden account, and can I submit work?"

### Content (top to bottom):

1. **Garden Status** -- the existing `GreenGoodsAccessSummary` (summary strip + detail grid + queued bundles)

2. **Account Provisioning** -- the existing `GreenGoodsProvisionButton`

3. **Work Submission** -- the existing `GreenGoodsWorkSubmissionForm` (conditional on `canSubmitMemberGreenGoodsActions`)

4. **Capital & Payouts** -- the existing stub card (unchanged)

### When Green Goods is NOT enabled:

This is the critical design question. When `activeCoop?.greenGoods` is falsy or `greenGoods.enabled` is false:

- The "Garden" pill still appears but shows **no badge**
- The tab content renders a single calm empty state:
  ```
  <article className="panel-card">
    <h2>Garden</h2>
    <p className="helper-text">
      This coop does not have a Green Goods garden yet. 
      An operator can connect one from the Nest tab.
    </p>
  </article>
  ```
- This is NOT a broken state -- it's the correct state for many coops. The empty state is informative and doesn't waste space.

### Badge logic for "Garden" pill:
```
gardenBadge = memberGardenerBundles.length (queued sync actions for this member)
```
When the member has pending gardener sync actions, the badge draws them to check status.

---

## Default sub-tab: "Focus"

Focus is the default because:
- It is the action cockpit -- the user should land on what needs doing
- It works for ALL coops, whether or not Green Goods is enabled
- It contains the most frequently used action (Review Chickens)
- The NestTab defaults to "members" (its most universal sub-tab) -- same pattern

---

## Component Structure Changes

### New type definition (in RoostTab.tsx):
```typescript
export type RoostSubTab = 'focus' | 'garden';
```

### Props changes to RoostTabProps:

The current RoostTab takes individual props. To support the new layout, we need to **add** `tabCapture` from the orchestration (for the quick-capture button in Focus). Everything else is already available.

```typescript
export interface RoostTabProps {
  // ... all existing props remain ...
  tabCapture: ReturnType<typeof useTabCapture>;  // NEW
}
```

### Updated SidepanelTabRouter.tsx:

Pass `tabCapture` through to RoostTab:
```typescript
case 'roost':
  return (
    <RoostTab
      {...existingProps}
      tabCapture={orchestration.tabCapture}  // NEW
    />
  );
```

### RoostTab internal structure:

```tsx
export function RoostTab({ ...props }: RoostTabProps) {
  const [subTab, setSubTab] = useState<RoostSubTab>('focus');
  
  // Derived state (existing, unchanged)
  const memberAccount = ...;
  const memberBinding = ...;
  const canSubmitMemberGreenGoodsActions = ...;
  const memberGardenerBundles = ...;
  const recentArtifacts = ...;
  
  // Badge counts (NEW)
  const focusBadge = (summary?.pendingDrafts ?? 0) + (summary?.staleObservationCount ?? 0);
  const gardenBadge = memberGardenerBundles.length;
  
  return (
    <section className="stack">
      {/* Sticky subheader: coop filter + sub-tab pills */}
      <SidepanelSubheader>
        <PopupSubheader ... />  {/* existing coop filter */}
        {activeCoop ? (
          <nav className="nest-sub-tabs" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }} aria-label="Roost sections">
            <button className={subTab === 'focus' ? 'is-active' : ''} onClick={() => setSubTab('focus')}>
              Focus
              {focusBadge > 0 ? <span className="nest-badge">{focusBadge > 99 ? '99+' : focusBadge}</span> : null}
            </button>
            <button className={subTab === 'garden' ? 'is-active' : ''} onClick={() => setSubTab('garden')}>
              Garden
              {gardenBadge > 0 ? <span className="nest-badge">{gardenBadge > 99 ? '99+' : gardenBadge}</span> : null}
            </button>
          </nav>
        ) : null}
      </SidepanelSubheader>
      
      {/* Focus sub-tab */}
      {subTab === 'focus' && activeCoop ? ( <RoostFocusContent ... /> ) : null}
      
      {/* Garden sub-tab */}
      {subTab === 'garden' && activeCoop ? ( <RoostGardenContent ... /> ) : null}
    </section>
  );
}
```

Note: We reuse `.nest-sub-tabs` and `.nest-badge` CSS classes directly, with an inline `gridTemplateColumns` override for 2 columns instead of 3. This avoids adding new CSS classes while getting the exact same visual treatment.

### Extracted sub-components (keep in same file or extract to separate files):

**RoostFocusContent** -- extracted for clarity, renders:
- Action strip (Review Chickens button + conditional stale link)
- Summary strip (Signals/Drafts/Stale stats)
- Recent activity list
- Quick capture row (optional, from tabCapture)

**RoostGardenContent** -- extracted for clarity, renders:
- Green Goods section (access summary, provision button)
- Work submission form (conditional)
- Capital & Payouts stub

---

## Footer Nav Badge Update

Currently in `SidepanelApp.tsx` line 248, the Roost badge is hardcoded to `0`:
```typescript
roost: 0,
```

Change to:
```typescript
roost: (dashboard?.summary.pendingDrafts ?? 0) + (dashboard?.summary.staleObservationCount ?? 0),
```

This gives the Roost tab itself a badge in the bottom nav, drawing the user to check their Focus tab. This mirrors how the Nest tab shows pending action counts.

**Wait -- should Roost have a footer badge?** The Chickens tab already badges `pendingDrafts`. If Roost also badges the same count, the user sees the same number in two places. This could be confusing OR could be reinforcing. 

**Recommendation**: Keep `roost: 0` in the footer for now. The sub-tab badges inside Roost are sufficient. The Chickens tab footer badge already tells the user "you have drafts." The Roost Focus badge tells them once they're inside the Roost tab. No need to duplicate in the footer nav. This can be revisited later if users miss actions.

---

## What Moves Where (Migration Map)

| Current Location | Current Section | New Location |
|---|---|---|
| Hero card (lines 125-157) | "Your Workspace" + stats + Review Chickens | **Focus tab**: Action strip (button) + Stats strip |
| Hero card header | Member count, "Your Workspace" title | **Removed** -- the sub-tab pills replace the hero card header. Member count moves to a subtle meta-text near the stats. |
| Recent Activity (lines 159-178) | Top 3 artifacts | **Focus tab**: Unchanged, below stats |
| Green Goods section (lines 180-211) | GG access summary + provision | **Garden tab**: Top section |
| Work Submission (lines 212-222) | GG work submission form | **Garden tab**: Below provisioning |
| Capital & Payouts (lines 224-229) | Stub card | **Garden tab**: Bottom |

---

## File Changes Required

### 1. `packages/extension/src/views/Sidepanel/tabs/RoostTab.tsx` (PRIMARY)
- Add `RoostSubTab` type
- Add `useState<RoostSubTab>('focus')`
- Add sub-tab pill bar in the `SidepanelSubheader` (after PopupSubheader)
- Restructure the body into two conditional blocks
- Reorder Focus content: action buttons first, stats second, activity third
- Add quick-capture button row
- Add `tabCapture` to props interface
- Optionally extract `RoostFocusContent` and `RoostGardenContent` as named functions

### 2. `packages/extension/src/views/Sidepanel/SidepanelTabRouter.tsx`
- Pass `tabCapture: orchestration.tabCapture` to the RoostTab case

### 3. `packages/extension/src/global.css`
- No new CSS classes needed (reuse `.nest-sub-tabs`, `.nest-badge`, `.panel-card`, `.action-row`, etc.)
- The `gridTemplateColumns` override for 2-column layout is applied inline
- Optionally: rename `.nest-sub-tabs` to `.sub-tabs` and `.nest-badge` to `.sub-tab-badge` for semantic correctness since they're now shared. This is a nice-to-have refactor, not required for functionality.

### 4. `packages/extension/src/views/Sidepanel/tabs/__tests__/RoostTab-interactions.test.tsx`
- Update tests to account for sub-tab navigation
- Add test: default sub-tab is "focus"
- Add test: clicking "Garden" shows Green Goods content
- Add test: Focus badge shows draft + stale count
- Add test: Garden badge shows gardener bundle count
- Add test: Garden shows empty state when GG not enabled

### 5. `packages/extension/src/views/Sidepanel/tabs/__tests__/RoostTab-subheader.test.tsx`
- Add test: sub-tab pills render when activeCoop exists
- Add test: sub-tab pills do NOT render when no activeCoop

---

## Implementation Sequence

1. **Phase 1**: Update `RoostTab.tsx` -- add sub-tab state, pill bar, restructure content into Focus/Garden blocks. No new props yet.
2. **Phase 2**: Update `SidepanelTabRouter.tsx` -- pass `tabCapture` to RoostTab.
3. **Phase 3**: Add quick-capture button to Focus tab using `tabCapture`.
4. **Phase 4**: Update tests.
5. **Phase 5** (optional): Rename `.nest-sub-tabs` -> `.sub-tabs` across NestTab.tsx, RoostTab.tsx, and global.css for semantic consistency.

---

## Potential Challenges

1. **Test mocking**: The existing tests mock `GreenGoodsActionCards`. Moving those cards to a different render branch (Garden sub-tab) means tests need to click into the Garden sub-tab first. The mocks themselves stay the same.

2. **Sub-tab pill CSS width**: The `.nest-sub-tabs` class uses `repeat(3, 1fr)`. With 2 pills, each gets 50% width. This actually looks better (more tap-friendly) in the narrow sidepanel. The inline style override handles this cleanly.

3. **Focus tab being empty**: If there are 0 signals, 0 drafts, 0 stale, and 0 artifacts, the Focus tab shows just the "Review Chickens" button and zeroed-out stats. This is fine -- it communicates "nothing needs attention" which is a valid state. The button remains available for proactive review.

4. **Deep linking**: The `SidepanelIntent` system currently navigates to `tab: 'roost'` without specifying a sub-tab. If a future intent wants to navigate directly to the Garden sub-tab, the RoostTab would need to accept an optional `defaultSubTab` prop. Not needed now but worth noting for future architecture.

5. **Quick Capture dependency**: The `tabCapture` hook may return null/undefined states when no tab is capturable. The quick-capture button should only render when capture is available, using the same conditional pattern the ChickensTab uses.
