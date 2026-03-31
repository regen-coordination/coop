---
feature: agent-autonomy-onchain
title: Agent autonomy and onchain reactivity state lane
lane: state
agent: codex
status: ready
source_branch: feature/agent-autonomy-onchain
work_branch: codex/state/agent-autonomy-onchain
depends_on:
  - ../spec.md
owned_paths:
  - packages/shared/src/modules/agent
  - packages/extension/src/skills
  - packages/extension/src/background/handlers
  - packages/extension/src/runtime
  - packages/shared/src/modules/coop
done_when:
  - recordHumanReviewFeedback(
  - deriveObservationTriggers(
skills:
  - shared
  - state-logic
  - storage
updated: 2026-03-30
---

# State Lane

- Make the operator-visible automation loop feel intentional and hackathon-demo ready.
- Add observation triggers for:
  - ERC-8004 registration due
  - Green Goods garden maintenance drift
  - ritual-driven pool creation due or missing pool setup
  - governance participation or conviction refresh reminders
  - member-account or gardener reconciliation work
- Model the trusted-admin loop explicitly:
  - coop-member join or removal should be able to generate gardener-sync chores
  - ritual cadence should be able to generate proposal-prep or pool-sync chores
  - existing Green Goods actions should be grouped into a clearer garden-core skill family
  - reminders should reuse existing notification and sidepanel-intent primitives
  - keep governance-adjacent work proposal-first unless execution is already bounded and permitted
- Close the current runtime-audience gap explicitly:
  - the runner currently scopes coop observations to trusted-node members
  - if `green-goods-governance-window-due` should power member-facing reminders, add a narrow
    advisory-only path for authenticated coop members
  - do not widen member-sync or other action-capable Green Goods observations beyond trusted-node
    scope
- Portability checklist for this lane:
  - every new Green Goods or admin skill should have valid `SKILL.md` frontmatter and a meaningful instruction body
  - avoid introducing new hidden prompt branches when the skill contract can live in `SKILL.md` plus manifest metadata
  - if a new trigger, capability, or output schema is Coop-only, note that explicitly in the lane work
  - keep reminder skills logically separate from execution skills
- Keep Cookie Jar state work observational or proposal-first until a real execution path exists.
- Prefer bounded slices that can be verified with targeted shared/runtime tests.
- If conviction-voting work starts here, keep it to proposal drafting and state detection, not a
  speculative contract integration.
