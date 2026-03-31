# Context

- Migrated from `.plans/agent-autonomy-roadmap.todo.md`
- Archived source snapshot: `.plans/archive/migrated/agent-autonomy-roadmap.todo.md`

## Existing References

- `docs/reference/agent-harness.md`
- `docs/reference/erc8004-and-api.md`
- `docs/reference/policy-session-permit.md`
- `docs/reference/green-goods-integration-spec.md`
- `docs/reference/coop-greengoods-onchain-research-2026-03-20.md`
- `docs/reference/current-release-status.md`
- `docs/builder/onchain-identity.md`
- `.plans/features/filecoin-cold-storage/spec.md`
- `.plans/features/hackathon-release-readiness/spec.md`

## Key Codepaths

### Agent And Operator Surfaces

- `packages/shared/src/modules/agent/`
- `packages/shared/src/contracts/schema-agent.ts`
- `packages/shared/src/contracts/schema-content.ts`
- `packages/extension/src/background/handlers/agent.ts`
- `packages/extension/src/background/handlers/agent-observation-conditions.ts`
- `packages/extension/src/background/handlers/agent-reconciliation.ts`
- `packages/extension/src/background/handlers/actions.ts`
- `packages/extension/src/background/dashboard.ts`
- `packages/extension/src/background/context.ts`
- `packages/extension/src/skills/green-goods-*/`
- `packages/extension/src/views/Sidepanel/`

### ERC-8004 And Onchain Trust

- `packages/shared/src/modules/erc8004/erc8004.ts`
- `packages/shared/src/contracts/schema-erc8004.ts`
- `packages/extension/src/background/handlers/archive.ts`
- `packages/extension/src/background/handlers/agent-reconciliation.ts`

### Green Goods, Member Accounts, And Sessions

- `packages/shared/src/modules/greengoods/`
- `packages/shared/src/modules/member-account/`
- `packages/shared/src/modules/onchain/authority.ts`
- `packages/shared/src/modules/session/session.ts`
- `packages/extension/src/background/handlers/member-account.ts`
- `packages/extension/src/background/handlers/executors/green-goods.ts`
- `packages/extension/src/views/Sidepanel/cards/GreenGoodsActionCards.tsx`
- `packages/extension/src/views/Sidepanel/operator-sections/SessionCapabilitySection.tsx`

### Filecoin / FVM

- `packages/shared/src/modules/fvm/fvm.ts`
- `packages/contracts/src/CoopRegistry.sol`
- `packages/shared/src/modules/archive/`

## Current Verified Facts

- Member smart-account provisioning is already implemented with passkey-backed Kernel accounts and
  counterfactual address prediction.
- Join flow already attempts to auto-predict a member account for the joining member.
- Green Goods garden bootstrap returns both `gardenAddress` and `tokenId`, so the garden already
  has an NFT-like onchain identity.
- Session-capable Green Goods actions are currently limited to garden bootstrap and maintenance.
- The harness already has Green Goods skills for bootstrap, sync, approval, assessment, and GAP
  admin sync.
- Ritual definitions already exist and can declare review cadence or named moments.
- `ritual-review-due` is already a first-class observation trigger in the agent state model.
- A `queue-green-goods-member-sync` path already exists and produces gardener add/remove proposals.
- Gardener reconciliation logic exists, but implementation routing should be checked against the
  intended member-account authority model.
- Green Goods pool creation is already framed in the repo as a bounded sync chore, not a freeform
  governance engine.
- Browser-local notification infrastructure already exists and can carry decision reminders or
  follow-up nudges into the Coop UI.
- The current agent runner filters coop-scoped observations to trusted-node members, so
  member-facing governance reminders will not naturally reach regular members without a narrow
  advisory-only eligibility adjustment.
- Bundled executable skills are validated for `SKILL.md` frontmatter and loaded with instruction
  text at runtime.
- The prompt builder now injects bundled `SKILL.md` instructions into execution prompts.
- ERC-8004 currently advertises `supportedTrust: ['reputation']`.
- FVM registry deployment addresses are still empty until the live deployment step is completed.
- Conviction voting has no implementation slice in this repo yet.
- Cookie Jar funding and withdrawal flows are currently outside the shipped Green Goods scope.
- The remaining portability bottlenecks are the custom manifest schema, fixed `outputSchemaRef`
  enum, and central output-handler registry.

## External Product Assumptions To Respect

- Green Goods documentation frames gardens as the organizational unit with onchain identity.
- Green Goods documentation also frames `Gardens V2 conviction voting` as the community signaling
  model and uses Hats Protocol roles for owner/operator/evaluator/gardener/funder/community.
- Green Goods documentation frames Cookie Jars as petty-cash payout rails within the broader garden
  funding loop.
- Hackathon judging favors real receipts, bounded autonomy, and trustworthy operator models over
  hand-wavy protocol ambition.

## Implementation Notes

- Prefer extending the existing Green Goods and member-account stacks instead of adding parallel
  membership abstractions.
- Prefer extending the existing Green Goods skill family before inventing a second governance
  orchestration layer.
- Prefer ritual-driven proactive chores over trying to infer governance needs directly from raw
  captured meeting artifacts in the first hackathon slice.
- If a “garden membership NFT” story is needed for demo framing, anchor it to the existing garden
  token or garden-pass flow rather than inventing a second asset type during the sprint.
- For the hackathon, a narrow live path is better than a wide partial one:
  - real ERC-8004 receipts
  - real FVM registry deployment
  - real bounded session automation
- Trusted-admin chores should stay legible and operator-safe:
  - auto-run only idempotent, bounded maintenance
  - proposal-first for governance-adjacent work
- If member-facing governance reminders are part of this lane, the cleanest repo-aligned path is a
  narrow runtime exception for `green-goods-governance-window-due`:
  - reminder and participation-draft skills may run for any authenticated coop member
  - execution-capable Green Goods skills remain trusted-node only
- Cookie Jar work should start as observation, reminder, or proposal-prep work unless a bounded
  contract integration is actually implemented.
- Portability work in this lane should be opportunistic:
  - improve the contract for new Green Goods and admin skills
  - avoid broad platform rewrites that do not help the hackathon slice
- Anonymous publish is lower priority unless the offscreen Semaphore proof path becomes concrete.

## Notes

- This is mainly Codex-owned implementation work.
- Claude QA should verify operator UX and review flow clarity before Codex runs the second QA pass.
