---
feature: agent-evolution
title: Agent evolution QA pass 2
lane: qa
agent: claude
status: backlog
source_branch: feature/agent-evolution
work_branch: qa/claude/agent-evolution
depends_on:
  - qa-codex.todo.md
skills:
  - qa
  - ui
  - e2e
qa_order: 2
handoff_in: handoff/qa-claude/agent-evolution
updated: 2026-04-05
---

# QA Pass 2 — UX, E2E, Accessibility

Claude runs second QA after Codex QA is done and `handoff/qa-claude/agent-evolution` exists.

## Runtime Skill Creation UX

- [ ] Skill Creator form renders in Agent tab
- [ ] All form fields validate correctly (required fields, prompt template syntax)
- [ ] "Teach the agent" copy is warm and non-technical
- [ ] Created skill appears in library view immediately
- [ ] Edit and delete work for runtime skills
- [ ] Compiled skills show as locked (not editable)
- [ ] Self-extension notification banner appears and links to skill
- [ ] Accessible: keyboard navigation, screen reader labels, contrast

## Agent Message Inbox UX

- [ ] Inbox renders messages with sender, subject, timestamp
- [ ] Unread badge updates on new message
- [ ] Message detail expands with conversation thread
- [ ] Reply action creates response message
- [ ] Send message form validates recipient and body
- [ ] Cross-coop messages show sender coop name
- [ ] Empty state is helpful ("No messages yet")
- [ ] Accessible: ARIA roles, focus management

## Spending Approval UX

- [ ] Spending dashboard shows correct session state
- [ ] Provision/revoke buttons work with confirmation
- [ ] Approval queue renders pending proposals
- [ ] Each proposal shows: action, amount, target, reason, generating skill
- [ ] Approve executes and moves to history
- [ ] Reject logs reason and removes from queue
- [ ] Transaction history shows completed transactions with explorer links
- [ ] Spending limit config in Nest tab persists and reflects in dashboard
- [ ] Spending amounts are clearly formatted (token symbol, decimals)
- [ ] Accessible: approve/reject have distinct visual weight

## E2E Flows

- [ ] Create runtime skill -> agent uses it on next observation -> output in dashboard
- [ ] Send intra-coop message -> recipient sees it in inbox -> reply works
- [ ] Agent proposes spending below threshold -> auto-executes -> appears in history
- [ ] Agent proposes spending above threshold -> queued -> member approves -> executes
- [ ] Two browser profiles: cross-coop message relay end-to-end

## Visual Regression

- [ ] Agent tab layout doesn't break with new sections
- [ ] Nest tab settings page accommodates spending config
- [ ] Dark/light theme works for all new components
- [ ] Mobile-width sidepanel doesn't overflow

## Verification

- [ ] `bun run validate core-loop` passes
- [ ] Visual check of all surfaces in browser (both themes)
- [ ] Findings captured in `../eval/qa-report.md`
