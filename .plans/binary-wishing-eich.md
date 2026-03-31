# Roost Tab: Focus + Agent + Garden

## Context

The Roost tab is the member's home screen. It was split into Focus + Garden sub-tabs, but further exploration revealed significant hidden data (16 RuntimeSummary fields, agent state, sync health, receiver intake) and the need for a 3rd sub-tab to keep content digestible.

**Decision**: Three sub-tabs — **Focus** (default), **Agent**, **Garden**.

---

## Sub-Tab Layout

### Focus (default) — "What needs your attention"

Action-first home. Every element is either a decision or context for a decision.

1. **Sync health strip** — one-line status bar, not a card
   - `● Synced · Last capture 3m ago · 2 peers connected` (green)
   - `◐ Syncing (4 pending) · Last capture 2h ago · No peers` (amber)
   - Uses `summary.syncState`, `summary.syncTone`, `summary.lastCaptureAt`, `summary.pendingOutboxCount`

2. **What's Next card** — prioritized action list replacing passive stats
   - Each row is a decision with an inline action button
   - Priority order: pending agent approvals → drafts → stale observations → insights
   - Rows:
     - `3 drafts ready for review` → [Review →] (navigates to Chickens review)
     - `Agent wants to archive 2 artifacts` → [Approve / Dismiss] (inline approval)
     - `1 stale observation needs refresh` → [Run Agent →] (triggers agent cycle)
     - `2 insight drafts to review` → [Review →]
   - Empty state: "All caught up." (rewarding, calm)
   - Badge source: total row count

3. **Receiver intake preview** — only when `receiverIntake.length > 0`
   - Shows top 3 receiver captures (photos/audio from companion app)
   - Each row: icon (camera/mic) + description + time ago
   - [Review All →] navigates to Nest → Members or dedicated intake view

4. **Recent Activity** — existing card, top 3 artifacts, unchanged

### Agent — "What your AI is doing"

Lightweight agent visibility. NOT the full operator console (that's Nest → Agent). This is the everyday member view: "is my AI working? what did it find? do I need to approve anything?"

1. **Agent heartbeat card**
   - Last cycle: "12 min ago — routed 3 tabs, created 1 insight"
   - Next cycle: "~4 min" (derived from `summary.agentCadenceMinutes`)
   - [Run Now] button — triggers `handleRunAgentCycle`
   - Running state: "Processing..." with activity indicator

2. **Plans needing approval** — only when pending plans exist
   - Each plan: title + brief description + [Approve] [Reject] buttons
   - Uses `agentDashboard.plans.filter(p => p.approvalStatus === 'pending')`
   - Inline approval without navigating to Nest

3. **Recent observations** — top 5 recent agent observations
   - Title + triggered time + status (pending/processing/done/failed)
   - Gives users a sense of what the agent is noticing
   - Uses `agentDashboard.observations`

4. **Agent memories** — collapsible, top 3 recent
   - What the agent has learned about this coop
   - Type badge (fact/insight/pattern)
   - Uses `agentDashboard.memories`

### Garden — "Impact & contributions"

Green Goods workspace + member contribution tracking. Renamed conceptually from pure "Green Goods" to a broader contributions frame.

1. **Green Goods section** (when enabled)
   - Access summary (existing `GreenGoodsAccessSummary`)
   - Provision button (existing `GreenGoodsProvisionButton`)
   - Work submission form (existing `GreenGoodsWorkSubmissionForm`)

2. **Empty state** (when Green Goods not enabled)
   - "Green Goods is not enabled for this coop. Set up a garden in the Nest tab to start submitting impact work."

3. **Member commitments** — what this member signed up to do
   - From `activeCoop.memberCommitments`
   - Gives context for work submissions

4. **Coop rituals** — upcoming rhythms
   - From `activeCoop.rituals`
   - "Weekly review is Thursday" style display

5. **Capital & Payouts** — existing stub card

---

## Badge Logic

- **Focus**: total "What's Next" row count (drafts + stale + pending actions + insights)
- **Agent**: pending plan approvals count
- **Garden**: `memberGardenerBundles.length` (pending sync actions)

---

## Design Principles

1. **Action over information** — every card should lead to a decision or action, not just display data
2. **Progressive disclosure** — Focus shows the minimum needed to orient; Agent and Garden go deeper
3. **Agent as first-class citizen** — the AI assistant is the product's differentiator, give it a home
4. **One-line health** — sync/capture status as ambient context, not a card that demands attention
5. **Empty states are rewarding** — "All caught up" feels good, not empty

## Distinction from Nest → Agent

| Roost → Agent | Nest → Agent |
|---|---|
| Member-facing, everyday | Operator/creator-facing, power user |
| Heartbeat + approve/reject | Full console (skills, policies, permits, sessions) |
| "What is the agent doing for me?" | "How do I configure the agent?" |
| Lightweight, 4 sections max | 8+ collapsible operator sections |

---

## New Props Needed for RoostTab

From `SidepanelTabRouter`, thread additional data:

```typescript
// Already in orchestration, not yet passed to Roost:
agentDashboard: AgentDashboard | null;
receiverIntake: ReceiverCapture[];
inferenceState: InferenceBridgeState;
handleRunAgentCycle: () => Promise<void>;
handleApproveAgentPlan: (planId: string) => Promise<void>;
handleRejectAgentPlan: (planId: string, reason?: string) => Promise<void>;
```

From `RuntimeSummary`, use additional fields:
- `syncState`, `syncTone`, `syncLabel`, `syncDetail`
- `lastCaptureAt`
- `pendingOutboxCount`
- `pendingActions`
- `insightDrafts`
- `agentCadenceMinutes`
- `iconState`

---

## Implementation Order

### Phase 1: Three-tab structure + sync strip
- Add `RoostSubTab = 'focus' | 'agent' | 'garden'`
- Reuse `.nest-sub-tabs` with `repeat(3, 1fr)` (matches Nest exactly)
- Add sync health strip to Focus (one line, uses existing summary fields)
- Move existing Focus and Garden content into new 3-tab structure

### Phase 2: What's Next card
- Replace hero card with prioritized action list
- Derive rows from `summary.pendingDrafts`, `summary.staleObservationCount`, `summary.pendingActions`, `summary.insightDrafts`
- Each row: label + count + action button
- Empty state: "All caught up."

### Phase 3: Agent sub-tab
- Thread `agentDashboard` + handlers through router
- Agent heartbeat card with "Run Now"
- Pending plan approvals with inline approve/reject
- Recent observations list
- Agent memories (collapsible)

### Phase 4: Receiver intake + Garden enrichment
- Surface `receiverIntake` preview in Focus
- Add member commitments and rituals to Garden

---

## Files to Modify

1. `packages/extension/src/views/Sidepanel/tabs/RoostTab.tsx` — main component
2. `packages/extension/src/views/Sidepanel/SidepanelTabRouter.tsx` — thread new props
3. `packages/extension/src/views/Sidepanel/tabs/__tests__/RoostTab-interactions.test.tsx`
4. `packages/extension/src/views/Sidepanel/tabs/__tests__/RoostTab-subheader.test.tsx`

## Verification

1. `bun run validate typecheck` — type-check passes
2. `bun run test -- packages/extension/src/views/Sidepanel/tabs/__tests__/RoostTab` — unit tests pass
3. `cd packages/extension && bun run build` — extension builds
4. Visual: verify 3 sub-tab pills render correctly
5. Visual: verify Focus shows sync strip + What's Next + recent activity
6. Visual: verify Agent shows heartbeat + plans + observations
7. Visual: verify Garden content unchanged from previous implementation
