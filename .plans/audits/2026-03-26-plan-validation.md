# Plan Validation Audit

**Date**: 2026-03-26
**Scope**: Validate migrated plans in `.plans/features/` against the current codebase and current worktree state.

## Current Setup

- `.plans/README.md` is the live entrypoint for active planning.
- Active feature packs live in `.plans/features/<feature-slug>/`.
- Archived source plans live in `.plans/archive/`.
- Queue automation reads lane files from `scripts/plans.ts`.
- QA order is now Codex pass 1, then Claude pass 2:
  - `handoff/qa-codex/<feature-slug>`
  - `handoff/qa-claude/<feature-slug>`

## Queue Snapshot

### Ready now

- Claude UI:
  - `receiver-design-polish`
  - `ui-action-coverage-hardening`
  - `ui-quality-hardening`
- Codex implementation:
  - `agent-autonomy-onchain` (`state`)
  - `media-compression-sharing` (`state`)
  - `ui-action-coverage-hardening` (`state`)
- Docs:
  - `docs-drift` for both Claude and Codex

### Backlog now

- `agent-autonomy-onchain` (`contracts`)
- `filecoin-cold-storage`
- `codex-readiness-cleanup`

### Not yet handoff-ready

- No QA lane is runnable yet because no `handoff/qa-codex/<feature-slug>` branch exists.

## Feature Validation

### Keep active

#### `agent-autonomy-onchain`

- **Decision**: keep active
- **Why**:
  - core agent, session, and authority plumbing exists already
  - planned onchain reactivity and stronger autonomy hooks are still incomplete
  - current worktree changes touch `packages/shared/src/contracts/schema-agent.ts` and `packages/shared/src/modules/agent/agent.ts`
- **Notes**:
  - this looks like a live implementation area
  - do not archive

#### `media-compression-sharing`

- **Decision**: keep active
- **Why**:
  - blob sync, storage, compression, relay fallback, and transcription modules already exist
  - the feature still has meaningful remaining work around integration, attachment resolution, and publish/archive flow confidence
- **Notes**:
  - valid plan
  - not obviously complete

#### `receiver-design-polish`

- **Decision**: keep active, but narrow execution slices
- **Why**:
  - receiver shell and capture/inbox/pair views are present and working
  - the polish goal is still valid
  - related branches already exist:
    - `feat/receiver-shell-polish`
    - `feat/capture-view-polish`
    - `feat/inbox-view-polish`
    - `refactor/pairview-polish`
    - `polish/pwa-animations-boot-screens`
- **Notes**:
  - this is better treated as an umbrella with smaller UI slices beneath it

#### `ui-action-coverage-hardening`

- **Decision**: keep active
- **Why**:
  - popup browser coverage, sidepanel persistence coverage, and sync resilience suites exist
  - there are current worktree changes in `e2e/`, popup tests, sidepanel tests, and `scripts/validate.ts`
- **Notes**:
  - this is the clearest in-progress test hardening area
  - plan should remain near the front of the queue

#### `docs-drift`

- **Decision**: keep active
- **Why**:
  - docs drift is real and recurring
  - the repo already had instruction drift during this migration, including QA-order mismatch
- **Notes**:
  - this should remain an always-on maintenance feature for both agents

### Keep, but re-scope or leave backlog

#### `ui-quality-hardening`

- **Decision**: keep, but reduce scope to remaining work
- **Why**:
  - much of the original plan already landed:
    - visual snapshot suites exist
    - token lint exists
    - several view decompositions already happened
  - the old source plan is too broad to execute as written
- **Notes**:
  - only keep the remaining visual-regression and token-cleanup work live

#### `filecoin-cold-storage`

- **Decision**: keep in backlog
- **Why**:
  - Storacha setup, archive follow-up, retrieval, Filecoin status, and FVM anchoring code already exist
  - the remaining value is in visibility, lifecycle completeness, and product verification rather than first-time implementation
- **Notes**:
  - valid backlog
  - not a first queue target

#### `codex-readiness-cleanup`

- **Decision**: keep as backlog theme, not as a literal execution checklist
- **Why**:
  - the migrated source plan contains point-in-time audit counts and housekeeping assumptions from 2026-03-25
  - some of that decomposition work is already done, and some of the counts will keep drifting
- **Notes**:
  - re-audit before execution
  - do not treat the archived source file as a precise todo list

## Already Implemented And Correctly Archived

- `agent-workflow-guardrails`
- `data-portability`
- `landing-page-animation-flow-polish`
- `popup-capture-features-wiring-polish`
- `popup-optimistic-ui`
- `pwa-native-feel`
- `signaling-to-hono-api`
- `sync-offline-hardening`
- `ui-audit-popup-sidepanel`

## Stale Or Historical

- `tier3-high-effort-improvements`
  - keep archived as stale backlog
- `test-gap-closure-plan`
  - keep archived as historical/demo-era context

## Recommendations

1. Keep the live queue focused on:
   - `agent-autonomy-onchain`
   - `media-compression-sharing`
   - `receiver-design-polish`
   - `ui-action-coverage-hardening`
   - `docs-drift`
2. Leave these as backlog until re-scoped:
   - `filecoin-cold-storage`
   - `codex-readiness-cleanup`
3. `ui-quality-hardening` can stay in the ready queue now that it has been narrowed to current snapshot and token drift work.
4. Do not automatically mark lanes `in_progress` just because `main` has overlapping local changes.
   - update lane status when work is clearly owned in the intended feature branch or worktree
5. Keep completed and stale plans in archive only.

## Validation Commands Run

- `bun run plans validate`
- `bun run plans legacy`
- `bun run plans list`
- `bun run test scripts/__tests__/plans.test.ts`
