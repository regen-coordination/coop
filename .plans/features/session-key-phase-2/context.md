# Context — Session Key Phase 2

## Origin

This plan was developed during a rapid dream session (2026-04-05) that explored
all three Greenpill projects in parallel. Key insights that motivated this plan:

1. **Session keys are "inverse Hats"** — Hats define what a member *can* do (role-based pull),
   session keys define what a delegated agent *must stay within* (scope-based push). A hybrid
   model would issue session keys only to Hats wearers with scope ⊆ hat permissions.

2. **The Autonomous Cockpit** — GG's cockpit isn't just a human dashboard; it's a human-agent
   coordination surface. Adding agent session activity makes agent behavior visible and
   controllable through the same interface humans use.

3. **Session-Key Yield Janitor** — Extending session scope to harvest() + splitYield() turns the
   agent into an autonomous yield maintenance worker, bounded by PermissionId commitments.

## Current System (Phase 1)

**4 session-capable actions** (session-constants.ts:7-12):
- `green-goods-create-garden`
- `green-goods-sync-garden-profile`
- `green-goods-set-garden-domains`
- `green-goods-create-garden-pools`

**12-gate validation** (session-validation.ts:29-226):
1. Capability refresh & status
2. Action class in SESSION_CAPABLE_ACTION_CLASSES
3. Status validity (not revoked/expired/exhausted/unusable)
4. Encrypted material exists
5. Pimlico configured
6. Safe address valid
7. Chain matching
8. Safe scope match
9. Action in scope.allowedActions
10. Targets in scope.targetAllowlist
11. TypedAuthorization exists
12. TypedAuthorization metadata matches scope

**Security model**: PermissionId = hash(scope) committed on-chain. Scope cannot drift.
AES-GCM encrypted private key material with per-key salt. Nonce key isolation from owner path.

**Test coverage**: 16 test cases in session.test.ts (1028+ lines). Factory-based:
`makeCapability(overrides)` and `make*Bundle()` per action class.

## Authority Model

Three tiers (authority.ts:7-48):
- **safe-owner**: Treasury, governance, high-stakes (work approval, assessment, hypercert mint)
- **session-executor**: Bounded automation (garden creation, profile sync, domains, pools)
- **member-account**: Individual actions (gardener add/remove, work submission)

Phase 2 promotes 3 actions from safe-owner → session-executor. Member-account stays separate.

## Related Plans

- **agent-autonomy-onchain**: Parent feature pack. Workstream 2 covers Green Goods automation
  with session keys as infrastructure. This plan extends that workstream specifically.
- **agent-evolution**: Covers spending limits, cross-coop messages, runtime skills. Session key
  phase 2 is complementary — different scope.
- **production-readiness**: Pimlico server proxy migration is tracked there as a security concern.

## Key Files (Coop)

| File | LOC | Role |
|------|-----|------|
| `packages/shared/src/modules/session/session-constants.ts` | 46 | Action class + selector definitions |
| `packages/shared/src/modules/session/session-capability.ts` | 274 | Capability lifecycle |
| `packages/shared/src/modules/session/session-validation.ts` | 248 | 12-gate validation |
| `packages/shared/src/modules/session/session-encryption.ts` | 101 | AES-GCM encryption |
| `packages/shared/src/modules/session/session-smart-modules.ts` | 229 | Smart Sessions builder |
| `packages/shared/src/modules/onchain/authority.ts` | ~48 | Authority tier mapping |
| `packages/shared/src/contracts/schema-session.ts` | ~80 | Zod schemas |
| `packages/extension/src/background/handlers/session.ts` | 842 | Handler entry points |
| `packages/extension/src/background/handlers/executors/green-goods-garden.ts` | ~150 | GG executor |
| `packages/shared/src/modules/session/__tests__/session.test.ts` | 1028+ | Unit + integration tests |

## Key Files (Green Goods — Phase 3, 5)

| File | Role |
|------|------|
| `packages/shared/src/types/roles.ts` | Hat → permission mapping (to create) |
| `packages/admin/src/components/Layout/CommandPalette.tsx` | 433 lines, 6 categories → 7 |
| `packages/shared/src/components/Cockpit/FloatingToolbar.tsx` | 209 lines, notification dot |
| `packages/shared/src/components/Cockpit/TopContextBar.tsx` | 118 lines, status indicator |

## Web References (from dream)

- [SmartSessions (Rhinestone + Biconomy)](https://github.com/erc7579/smartsessions) — Session key module spec
- [Biconomy Smart Session Policies](https://docs.biconomy.io/new/smart-sessions/policies) — Policy reference
- [CSA: AI Agent Governance Gap (April 2026)](https://labs.cloudsecurityalliance.org/research/csa-research-note-ai-agent-governance-framework-gap-20260403/) — Governance framework
- [Agentic Digital Twins (Nature, 2025)](https://www.nature.com/articles/s43588-025-00944-0) — Autonomous systems paradigm
