---
feature: agent-evolution
title: Agent evolution UI lane
lane: ui
agent: claude
status: blocked
source_branch: feature/agent-evolution
work_branch: claude/ui/agent-evolution
depends_on:
  - ../spec.md
  - state.codex.todo.md
owned_paths:
  - packages/extension/src/views
  - packages/extension/src/skills
  - packages/extension/src/global.css
done_when:
  - SkillCreator component
  - AgentInbox component
  - SpendingApproval component
skills:
  - ui
  - react
  - accessibility
handoff_out: handoff/qa-codex/agent-evolution
updated: 2026-04-05
---

# UI Lane — Agent Evolution

## Objective

Build the member-facing surfaces for skill creation, agent messaging, and spending
approval — all integrated into the existing Agent tab in the Roost sidepanel.

> **Blocked on**: State lane (schemas, runtime skill registry, message types, spending types)

## Phase 1: Runtime Skill Creation UI

### 1.1 Skill Creator component
- [ ] Create `SkillCreator.tsx` in Agent tab views
- [ ] Form fields:
  - Name (text input, required)
  - Description (textarea, required)
  - Domain tag (select: general, ecology, community, finance, governance, custom)
  - Prompt template (textarea with `{{observation}}`, `{{context}}`, `{{coopState}}` placeholders)
  - Trigger types (multi-select from observation trigger values)
  - Output format (select: freeform text, structured JSON with schema builder)
- [ ] "Teach the agent" framing — warm, approachable copy
- [ ] Preview panel: shows how skill would process a sample observation
- [ ] Save -> `db.knowledgeSkills.put()` with manifest
- [ ] Use existing `.panel-card` and form patterns from global.css
- **Verify**: component renders, validates, persists to Dexie

### 1.2 Skill library view
- [ ] List all skills (compiled + runtime) in Agent tab
- [ ] Compiled skills: locked (stdlib badge), name + description
- [ ] Runtime skills: editable, enable/disable toggle, delete
- [ ] Per-coop override toggle (uses coopKnowledgeSkillOverrides)
- [ ] Import from URL button (reuses `importKnowledgeSkill` flow)
- [ ] Skill run history: last run, success/failure count
- **Verify**: compiled and runtime skills render correctly

### 1.3 Agent self-extension notification
- [ ] When agent creates a runtime skill, show NotificationBanner:
  "Your agent learned a new skill: [name]. Review it?"
- [ ] Link to skill in library for review/edit/disable
- [ ] Use existing `NotificationBanner.tsx`
- **Verify**: notification appears after agent-initiated creation

## Phase 2: Agent Message Inbox

### 2.1 Message inbox component
- [ ] Create `AgentInbox.tsx` in Agent tab
- [ ] Message list: sender identity, coop name, subject, timestamp, status badge
- [ ] Message detail (expandable card): full body, conversation thread, reply/dismiss
- [ ] Unread count badge on Agent tab
- [ ] Use existing `.draft-card` pattern for message cards
- **Verify**: messages render from Yjs, unread badge updates

### 2.2 Send message UI
- [ ] "Message another coop" action button
- [ ] Recipient: select from known coops or enter agentId
- [ ] Subject + body fields, message type selector
- [ ] Send -> Y.Doc write (intra-coop) or relay queue (cross-coop)
- **Verify**: message appears in recipient inbox

### 2.3 Message notifications
- [ ] Browser notification on incoming message (if permission granted)
- [ ] Badge on extension icon for unread messages
- [ ] Sound option (Rooster Call pattern for important messages)
- **Verify**: notification on new cross-coop message

## Phase 3: Spending Approval UX

### 3.1 Spending dashboard
- [ ] Create `SpendingDashboard.tsx` in Agent tab
- [ ] Shows: session key status, limits (per-action/daily), today's spending, expiry
- [ ] Provision / revoke session key buttons
- [ ] Use `.state-pill` for status indicators
- **Verify**: dashboard renders correct session state

### 3.2 Spending approval queue
- [ ] Create `SpendingApprovalQueue.tsx`
- [ ] Pending proposals above auto-execute threshold
- [ ] Card: action description, token + amount, target, agent reason, generating skill
- [ ] Approve / Reject buttons
- [ ] Approve -> execute via session key; Reject -> log to agent memory
- **Verify**: approval flow works in mock mode

### 3.3 Transaction history
- [ ] Completed agent transactions in Agent tab
- [ ] Each: timestamp, action, amount, tx hash (explorer link)
- [ ] Filter by action type, date, status
- [ ] Running total
- **Verify**: history populates after mock transactions

### 3.4 Spending limit configuration (Nest tab)
- [ ] Operator settings in Nest -> Agent Settings
- [ ] Configure: per-action max, daily cap, auto-execute threshold, allowed tokens, session duration
- [ ] Changes trigger session key re-provisioning
- [ ] Use existing Nest settings patterns
- **Verify**: config persists, reflects in spending dashboard

## Verification

- [ ] `cd packages/extension && bun run build` succeeds
- [ ] Visual check of all three surfaces in browser
- [ ] `bun run validate smoke` before handoff

## Handoff Notes

- Skill Creator needs the "teaching" metaphor — not a developer tool
- Spending approval must be unmissable: no silent auto-spend without prior consent
- Agent tab is already dense (Focus/Agent/Garden split) — new surfaces must fit
- All new components should reuse existing CSS classes from global.css
