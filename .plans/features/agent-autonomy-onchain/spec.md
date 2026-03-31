# Agent Autonomy And Onchain Reactivity

**Feature**: `agent-autonomy-onchain`
**Status**: Active
**Source Branch**: `feature/agent-autonomy-onchain`
**Created**: `2026-03-26`
**Last Updated**: `2026-03-30`

## Summary

Advance the agent stack from review-only assistance toward a hackathon-ready onchain automation story:

- visible, scoped agent execution with real `agent.json`, `agent_log.json`, and ERC-8004 receipts
- bounded Green Goods automation through session keys for coop-level chores
- Green Goods garden-core skills elevated into an explicit agent-harness skill family
- ritual-configured proactive pool kickoff instead of pretending the agent can infer governance from every meeting artifact
- explicit per-member account lifecycle for garden participation and gardener reconciliation
- a trusted-admin loop for observable, operator-safe onchain chores among trusted coop members
- a participation loop with reminders and notifications so members know when governance action is due
- a narrow advisory execution path so member-facing governance reminders can run for authenticated
  coop members without opening admin or onchain skills to non-operators
- a narrow governance bridge that can support Green Goods signal pools now and conviction-voting work next
- a narrow Cookie Jar exploration path for petty-cash coordination once the authority and contract path are explicit
- Filecoin/FVM follow-through for registry-backed archive or membership receipts when the live path is enabled

The goal is not open-ended autonomy. The goal is a trustworthy operator model that can win
`Agents With Receipts`, strengthen `Crypto`, improve the `AI & Robotics` narrative, and make a
credible attempt at `Let the Agent Cook` without overstating what is autonomous today.

## In Scope

- live ERC-8004 registration, manifest export, feedback writes, and receipt surfacing
- operator-visible automation loops that show observe -> plan -> act -> verify with audit logs
- scoped session execution for Green Goods garden bootstrap and maintenance, including pool creation
- explicit Green Goods skill-family planning for bootstrap, sync, member sync, governance participation, and notifications
- ritual-driven triggers for when pool creation or decision support is due
- per-member smart-account lifecycle quality for garden participation
- gardener reconciliation and add/remove flows aligned with the member-account authority model
- a trusted-admin loop that can queue bounded add/remove/update chores for trusted-node approval or auto-run where safe
- browser-local reminders or notifications for pending garden decisions, conviction refresh, and admin chores
- a narrow runtime eligibility carve-out for `green-goods-governance-window-due` advisory skills so
  member-facing reminders can reach authenticated coop members while admin and action-capable
  skills stay trusted-node only
- a spec for proposal/signal generation around Green Goods governance and future conviction voting
- a proposal-first Cookie Jar lane for request prep, reminders, or bounded execution only if the policy path is explicit
- Filecoin/FVM registry follow-through where it directly supports receipts, archive proof, or membership proof
- explicit acceptance criteria for what is demo-safe versus what remains future-facing

## Out Of Scope

- vague long-range “AI improvement” work with no implementation slice
- unrelated UI redesign outside operator and review surfaces
- inventing a second membership primitive when Green Goods garden identity and Coop member accounts already exist
- replacing the bounded-automation posture with uncontrolled agent execution
- shipping anonymous publish as a headline capability unless proof-backed execution is actually closed

## Current Lanes

- `state.codex.todo.md`
- `contracts.codex.todo.md`
- `qa/qa-claude.todo.md`
- `qa/qa-codex.todo.md`

## Why Now

- The repo already ships the core building blocks: agent harness, ERC-8004 integration, Green Goods
  garden bootstrap, session capabilities, member accounts, and FVM registry scaffolding.
- The remaining risk is not missing primitives. The risk is leaving the onchain story fragmented,
  mock-only, or conceptually inconsistent during hackathon judging.
- `Agents With Receipts` requires real receipts and clearer trust semantics than the current
  reputation-only manifest.
- `Crypto` and `Let the Agent Cook` improve materially if the agent can handle bounded
  governance-adjacent chores around gardens and signal pools on a visible ritual cadence.

## Repo Reality To Build Around

- Per-member smart accounts are already implemented and documented. Counterfactual prediction and
  lazy deployment exist today.
- Session capabilities already cover Green Goods coop-level chores:
  `green-goods-create-garden`, `green-goods-sync-garden-profile`,
  `green-goods-set-garden-domains`, and `green-goods-create-garden-pools`.
- The harness already ships Green Goods skills for garden bootstrap, garden sync, work approval,
  assessment, and GAP admin sync.
- A gardener member-sync proposal path already exists, so member reconciliation can be promoted into
  the skill loop instead of being handled as a one-off admin command.
- Ritual definitions and the `ritual-review-due` observation trigger already exist, so ritual-driven
  pool kickoff can extend an existing cadence model instead of inventing a second scheduler.
- Green Goods gardener reconciliation logic already exists in shared state.
- Browser-local notification infrastructure and sidepanel intent routing already exist, so decision
  reminders can reuse shipped extension primitives.
- The current agent runner only executes coop-scoped observations for trusted-node members, so
  member-facing governance reminders require either a narrow advisory eligibility exception or a
  separate non-agent reminder path.
- ERC-8004 identity, feedback, manifest generation, and log export already exist.
- Bundled executable skills now require `SKILL.md` frontmatter and prompt instructions, so the
  markdown contract is real again at runtime.
- Portability is still limited by Coop-specific manifest fields, fixed output schema refs, and the
  central output-handler registry.
- FVM registry code exists, but deployment mapping and operator configuration are still the live
  gate.
- Conviction voting is part of the Green Goods product narrative, but there is no conviction-voting
  implementation slice in this repo yet.
- Cookie Jar funding or withdrawal automation is not currently part of the shipped Green Goods
  scope, so it should stay future-facing unless a real implementation lane is added.

## Workstreams

### 1. Receipts And Trust

- Make the ERC-8004 path unambiguous in live mode:
  - register agent
  - update manifest when metadata changes
  - write feedback after meaningful actions
  - surface explorer links and exported logs in the operator flow
- Extend the current trust story beyond a flat `reputation` label where feasible, preferably by
  using ERC-8004 validation semantics before introducing new trust systems.

### 2. Green Goods Automation

- Treat session keys as the agentic surface for coop-level chores, not as a general governance key.
- Treat Green Goods as a skill family, not a monolithic integration.
- Current skill family:
  - `green-goods-garden-bootstrap`
  - `green-goods-garden-sync`
  - `green-goods-work-approval`
  - `green-goods-assessment`
  - `green-goods-gap-admin-sync`
- Next skill-family additions to scope:
  - `green-goods-member-sync`
  - `green-goods-governance-participation`
  - `green-goods-governance-reminder`
- Focus on chores that are already bounded and compatible with the current allowlist:
  - garden creation
  - profile sync
  - domain sync
  - pool creation
- Use ritual cadence as the first proactive trigger:
  - when a coop ritual says review or decision time is due, the agent can queue pool-sync or
    proposal-prep work
  - do not depend on freeform meeting inference for the first slice
- Add explicit operator-visible proposals and execution logs so automation reads as intentional,
  auditable work rather than background magic.

### 3. Participation Loop And Reminders

- Fix the governance-participation gap by making pending decisions legible outside the Green Goods
  UI alone.
- Use the existing browser notification and sidepanel-intent infrastructure to surface:
  - ritual-driven pool creation due
  - pending decision windows
  - conviction refresh or participation reminders
  - trusted-admin chores waiting on review
- Make the audience split explicit in runtime behavior:
  - trusted members get the admin reminder surface in `Nest`
  - authenticated non-trusted members get the participation reminder surface in `Roost`
  - this audience split must not broaden execution-capable skills beyond trusted-node scope
- Keep reminders informational by default:
  - notify members that action is due
  - deep-link them into Coop surfaces that explain the decision context
  - only escalate into onchain execution when the action is already bounded and permitted

### 4. Member Accounts And Garden Participation

- Lean into the existing member-account design rather than inventing a new NFT membership layer.
- Ensure join/create flows reliably provision or predict a member account for each coop member.
- Treat coop-member join as the source event for gardener reconciliation:
  - new member joins coop
  - member account is predicted or deployed
  - trusted-admin loop queues gardener add if the garden is missing that participant
- Tighten gardener add/remove routing so the implementation matches the declared authority model.
- Keep garden identity and member identity separate:
  - garden NFT / garden token = coop or garden identity
  - member smart account = participant identity and action origin

### 5. Trusted Admin Loop

- Frame this as an administrative AI loop among trusted coop members, not an invisible daemon.
- The loop should be explicit:
  - observe coop or garden state
  - derive bounded chores
  - propose or auto-run safe actions
  - write receipts and logs
- First chores to support:
  - gardener add or remove reconciliation
  - garden profile and domain maintenance
  - pool creation when ritual cadence says decision support is due
- Use Coop to absorb the nitty-gritty coordination work that is easy to miss in the Green Goods UI:
  - queue member sync
  - queue pool sync
  - remind on pending participation
  - surface what is blocked on operator review
- Governance-adjacent actions should stay proposal-first until the execution path is both narrow and
  clearly permissioned.
- If the runtime eligibility model is widened for participation reminders, keep that widening
  strictly observation-scoped and advisory-only:
  - allow `green-goods-governance-window-due` reminder and participation skills for authenticated
    coop members
  - do not widen gardener sync, session execution, or other action-capable skills beyond
    trusted-node members

### 6. Governance And Conviction Voting

- Scope this as a bridge layer, not a full governance system rewrite.
- First slice:
  - agent notices ritual due state, garden drift, unmet setup, or proposal-worthy state
  - agent drafts pool or governance suggestions
  - operator approves bounded execution where supported
- UX goal:
  - Coop should reduce the “I forgot there was a decision pending” failure mode
  - Coop should not replace the governance mechanism itself
- Exploration slice:
  - define what conviction-voting primitives are needed
  - identify whether Green Goods exposes contracts or APIs we can target directly
  - avoid claiming conviction voting implementation until a real integration path exists

### 7. Cookie Jar Exploration

- Green Goods documents Cookie Jars as petty-cash rails inside the garden funding loop.
- Coop should treat Cookie Jar as a narrow extension, not a blank-check treasury interface.
- First acceptable slice:
  - observe when a garden or coop state implies petty-cash coordination is needed
  - draft or queue a proposal-first action bundle
  - remind trusted members or relevant participants that a request needs attention
- Only expand to execution if all three are true:
  - the target contracts and calldata are explicit
  - authority is clear between Safe, session, and member-account layers
  - policy keeps the action bounded and auditable

### 8. Filecoin / FVM Follow-Through

- Complete the FVM registry deployment path needed for the hackathon demo.
- Keep the slice narrow:
  - archive receipt anchoring
  - membership commitment registration
  - agent or coop proof links that strengthen the receipts narrative
- Reuse the separate `filecoin-cold-storage` feature pack where appropriate instead of duplicating
  its broader storage work.

## Portability Gap Checklist

This is a lane-scoped checklist, not a demand to generalize the entire agent system before the
hackathon. The standard is: do not make the new Green Goods and admin skills less portable than the
current branch already is.

- [ ] Every new bundled executable skill added in this lane ships as a self-contained folder with
  `skill.json` plus `SKILL.md` frontmatter and instruction body.
- [ ] `SKILL.md` remains a first-class runtime input for new Green Goods and admin skills, not just
  a checked-in note beside custom code.
- [ ] New skills avoid hidden prompt behavior in central runner branches unless that branch is
  required for shared context assembly and documented in the lane notes.
- [ ] Any new `outputSchemaRef` added by this lane comes with an explicit note that says whether it
  is Coop-only or portable via an adapter.
- [ ] Reminder-only skills and governance-participation skills stay separable from execution-capable
  skills so another agent could reuse the reminder logic without inheriting Safe execution coupling.
- [ ] Coop-specific observation triggers, action classes, and required capabilities added in this
  lane are documented as adapter vocabulary rather than implied universal skill semantics.
- [ ] Knowledge-skill portability and executable-skill portability are described separately in docs
  and demo language.
- [ ] Docs drift is corrected where it still claims executable `SKILL.md` is not a runtime input on
  the current branch.

## Acceptance Criteria

- [ ] A coop can show a real or explicitly mock-scoped ERC-8004 lifecycle without ambiguity.
- [ ] Live mode can produce explorer-visible ERC-8004 registration and feedback receipts.
- [ ] `agent.json` and `agent_log.json` are first-class demo artifacts, not buried implementation details.
- [ ] Session-key automation for Green Goods chores is visible, bounded, and auditable.
- [ ] Green Goods is framed in the harness as a skill family with current versus planned skills made explicit.
- [ ] Ritual-configured cadence can trigger pool-sync or proposal-prep work without relying on
  freeform meeting inference.
- [ ] Pending garden decisions and conviction-refresh moments can surface through existing Coop
  notification or sidepanel-intent primitives.
- [ ] Governance reminders can reach the intended audience without silently broadening execution
  permissions:
  - trusted members see admin follow-up in `Nest`
  - authenticated non-trusted members can receive participation reminders in `Roost`
- [ ] Member-account provisioning is explicit in the garden participation flow for every coop member.
- [ ] Gardener reconciliation can derive add/remove actions from member-account state and route them through the intended authority path.
- [ ] Coop-member joins can produce trusted-admin gardener-sync chores without manual operator data entry.
- [ ] The Green Goods and admin skills added in this lane do not regress skill portability relative
  to the current branch.
- [ ] The spec clearly distinguishes:
  - coop Safe authority
  - session-executor authority
  - member-account authority
  - privacy identity
- [ ] Governance-adjacent actions remain proposal-first unless a bounded execution path is actually
  implemented and permissioned.
- [ ] Conviction-voting work is either reduced to a concrete integration slice or explicitly left as a post-hackathon follow-up.
- [ ] Cookie Jar work is either reduced to a proposal/reminder lane or implemented as a real authority-bound execution path.
- [ ] Filecoin/FVM work has a concrete live-demo checklist instead of an abstract future note.

## Recommended Hackathon Priority Order

1. ERC-8004 live receipts and trust surfacing
2. Green Goods skill-family completion for garden bootstrap, sync, member sync, and reminders
3. Ritual cadence, pool creation, and governance-participation UX
4. Member-account and gardener-lifecycle alignment
5. FVM registry deployment and narrow proof path
6. Cookie Jar exploration only if the authority path is explicit
7. Anonymous publish only if proof generation is actually closed
