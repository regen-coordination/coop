# Principles Audit Report - 2026-04-02 (v2)

## Executive Summary
- **Packages analyzed**: shared, extension, app, api
- **Mode**: Single-agent
- **Principle groups audited**: SOLID, DRY/KISS/YAGNI/SOC, EDA/ADR/C4, ACID/BASE/CAP
- **Previous principles audit**: 2026-04-02 (v1 — same day re-audit after fixes)

### Scorecard

| Principle | Score | Top Issue | Effort |
|-----------|-------|-----------|--------|
| S (SRP) | YELLOW | archive.ts handler at 1483 LOC with 15 exports and 20 log calls | M |
| O (OCP) | GREEN | action-payload-parsers.ts refactored to spec registry | - |
| L (LSP) | GREEN | Mock/live mode boundaries are clean and behaviorally equivalent | - |
| I (ISP) | YELLOW | `@coop/shared` barrel re-exports entire module surface to all consumers | S |
| D (DIP) | GREEN | Shared modules depend on abstractions; extension goes through runtime messages | - |
| DRY | YELLOW | onInstalled/onStartup have identical 14-line bodies; v2 Y.Map sync logic duplicated | S |
| KISS | GREEN | Complexity is generally justified by domain requirements | - |
| YAGNI | GREEN | No significant dead scaffolding; mock/live boundaries serve real purpose | - |
| SOC | YELLOW | Landing page component at 1554 LOC mixes 25+ refs, animation, forms, speech | M |
| EDA | GREEN | Handler registry pattern fully implemented with compile-time exhaustiveness | - |
| ADR | YELLOW | 4 of 8 key ADRs created; remaining 4 still missing | M |
| C4 | YELLOW | Container boundaries are clear but L3/L4 documentation is missing | M |
| ACID | GREEN | Multi-table Dexie writes consistently use `db.transaction('rw', ...)` | - |
| BASE | GREEN | Yjs transact blocks used for compound CRDT mutations; UI handles soft state | - |
| CAP | GREEN | Data paths correctly positioned; no CAP mismatches found | - |

---

## Previous Findings Status

_Tracked from: 2026-04-02 (v1)_

| ID | Finding | Status | Notes |
|----|---------|--------|-------|
| S1 | background.ts 825-LOC message router monolith | FIXED | Refactored to `handler-registry.ts` with compile-time exhaustiveness. background.ts now 233 LOC. |
| S2 | NestTab.tsx 1372 LOC mixed concerns | FIXED | Extracted `NestMembersSection` (755 LOC). NestTab.tsx now 656 LOC, delegates to 4 sub-sections. |
| S3 | agent-runner-skills.ts 1565 LOC single file | FIXED | Split into `skills/` directory with 8 focused modules. agent-runner-skills.ts is now a 12-line barrel re-export. |
| O1 | action-payload-parsers.ts switch requires source edit | FIXED | Refactored to spec registry pattern (`ACTION_SPECS` + `FIELD_READERS` + `resolveFromSpec`). Only 4 custom handlers remain for edge cases. |
| O2 | inference.ts parallel switches for refine tasks | FIXED | Refactored to `REFINE_TASK_HANDLERS` record with per-task `{ buildPrompt, parseOutput, heuristic }`. |
| DRY1 | Repetitive payload parsing in action-payload-parsers | FIXED | Declarative field specs with generic resolver. See O1 fix. |
| DRY2 | Memory extraction patterns duplicated across skill refs | PERSISTS | Still a switch in `skills/memories.ts:30` with per-case memory construction. Structurally cleaner but same pattern. Reclassified LOW. |
| SOC1 | NestTab members content inline | FIXED | Extracted to `NestMembersSection`. See S2 fix. |
| SOC2 | usePopupOrchestration 1173 LOC orchestration hook | PERSISTS | Still 1173 LOC. Classified INFO — conscious architectural choice with good sub-hook delegation. |
| EDA1 | background.ts ad-hoc message dispatch | FIXED | `handler-registry.ts` implements `HandlerRecord` type that causes compile errors for unhandled message types. |
| EDA2 | Yjs observer cleanup well-managed | PERSISTS | Still positive — no regressions. |
| EDA3 | chrome.runtime listener cleanup | PERSISTS | Still positive — no regressions. |
| ADR1 | No formal ADRs exist | PARTIALLY FIXED | 4 ADRs created in `docs/decisions/`: Yjs, Safe multisig, passkey-first, browser extension. 4 remaining. |
| C4-1 | L3/L4 documentation sparse | PERSISTS | No change. |
| ACID1 | Dexie transactions consistent | PERSISTS | Still positive — no regressions. 15+ transaction sites verified. |
| ACID2 | Single-table agent writes lack atomic error handling | PERSISTS | Still LOW — error handling is at call site. |
| BASE1 | Yjs compound mutations use transact | PERSISTS | Still positive — 6 transact sites verified. |
| BASE2 | Three-format artifact sync complexity | PERSISTS | Still LOW — v2/v1/legacy write paths maintained for backward compat. |
| CAP1 | Data paths correctly positioned | PERSISTS | Still positive — no regressions. |
| I1 | @coop/shared barrel exports entire surface | PERSISTS | Still LOW — tree-shaking mitigates runtime impact. |

---

## Findings by Principle

### SOLID

#### S1. archive.ts handler is a 1483-LOC module with 15 exports — MEDIUM
- **Principle**: SRP
- **File**: `packages/extension/src/background/handlers/archive.ts` (1483 LOC)
- **Issue**: This single file handles: artifact archiving, snapshot archiving, archive status refresh, archive bundle retrieval, archive space provisioning, archive config management, archive CID anchoring, FVM registration, export (snapshot, artifact, receipt), and periodic polling for unsealed receipts. It has 15 exported functions and 20 `logPrivilegedAction` calls with repetitive error-handling boilerplate. Each handler follows a similar pattern: load coop, check config, create client, perform operation, log, notify, refresh badge.
- **Evidence**: Exports span lines 252-1483. Functions like `handleArchiveArtifact` (line 363, ~140 LOC), `handleRefreshArchiveStatus` (line 671, ~230 LOC), and `handleAnchorArchiveCid` (line 1055, ~180 LOC) each contain significant inline logic.
- **Recommendation**: Split into domain-focused files: `archive-upload.ts` (artifact + snapshot archiving), `archive-status.ts` (refresh + polling), `archive-config.ts` (provision, set, remove), `archive-export.ts` (export functions), `archive-anchor.ts` (CID anchoring + FVM). Extract the shared `loadArchiveReadyCoop` + `logPrivilegedAction` + `createStorachaArchiveClient` boilerplate into an `archive-context.ts` helper.

#### S2. Landing page component is 1554 LOC with 25+ refs — MEDIUM
- **Principle**: SRP
- **File**: `packages/app/src/views/Landing/index.tsx` (1554 LOC)
- **Issue**: `LandingPageContent` is a single component that manages: parallax scene refs (25+ `useRef` calls for hills, clouds, chickens, etc.), speech recognition, form state, transcript recording, GSAP animation setup, audience selection, ritual lens interaction, and setup packet construction. It renders the entire landing page (hero, story journey, ritual section, arrival section, footer).
- **Evidence**: Lines 72-97 show 25+ ref declarations for scene elements. The component mixes animation concerns (GSAP refs), data concerns (form state, transcripts), and I/O concerns (speech recognition) in a single function.
- **Recommendation**: Extract scene sections into focused components: `HeroSection`, `StoryJourneyScene`, `RitualSection`, `ArrivalJourneyScene`. Each would own its own refs and GSAP setup. The speech recognition + transcript logic could move to a `useSpeechCapture` hook. Data helpers are already in `landing-data.ts` which is good.

#### S3. agent-output-handlers.ts has 905 LOC with boilerplate-heavy handlers — LOW
- **Principle**: SRP
- **File**: `packages/extension/src/runtime/agent-output-handlers.ts` (905 LOC)
- **Issue**: The `skillOutputHandlers` map contains 15 handler functions, many following a nearly identical pattern: check `!input.context.coop`, call `queueActionProposals`, return the result. The "no-coop early return" pattern is duplicated 10 times (lines 298, 336, 397, 453, 509, 563, 640, 689, 739, 796) with identical return objects.
- **Evidence**: Compare `green-goods-work-approval-output` (line 639-688) with `green-goods-assessment-output` (line 689-738) — structurally identical except for the output type and payload builder.
- **Recommendation**: Extract a `createActionProposalHandler(config)` factory that takes the output type, payload builder, and guard conditions, reducing each Green Goods handler to a 5-line registration. LOW because the current code is correct and readable, just verbose.

---

### Code Quality (DRY / KISS / YAGNI / SOC)

#### DRY1. onInstalled and onStartup have identical 14-line bodies — MEDIUM
- **Principle**: DRY
- **File**: `packages/extension/src/background.ts:115-145`
- **Issue**: `chrome.runtime.onInstalled` (lines 115-129) and `chrome.runtime.onStartup` (lines 131-145) contain the exact same 14-line initialization sequence: `ensureDbReady`, `ensureDefaults`, `runLocalDataMaintenance`, `registerContextMenus`, `warmTabCache`, `syncAgentCadenceAlarm`, `syncCaptureAlarm`, two `chrome.alarms.create` calls, `ensureReceiverSyncOffscreenDocument`, `syncAgentObservations`, `setPanelBehavior`, and `refreshBadge`. Any change to the initialization sequence must be made in both places.
- **Evidence**: Lines 116-128 are character-for-character identical to lines 132-144.
- **Recommendation**: Extract a shared `initializeBackground()` async function and call it from both listeners. This is a 2-minute fix with zero risk.

#### DRY2. Yjs v2 Y.Map write logic duplicated for artifacts and members — LOW
- **Principle**: DRY
- **File**: `packages/shared/src/modules/coop/sync.ts:229-277`
- **Issue**: The v2 format write logic for artifacts (lines 229-250) and members (lines 255-277) follows the exact same pattern: iterate items, delete stale keys from Y.Map, create/get nested Y.Map per item, filter undefined entries, sync field keys and values. The only difference is the source array and the top-level Y.Map key.
- **Evidence**: Lines 234-250 (artifacts) and lines 261-277 (members) are structurally identical with different variable names.
- **Recommendation**: Extract a `syncV2Map(parentMap, items, getId)` helper. LOW because this is within a single `transact` block and the duplication is local.

#### DRY3. "No-coop early return" pattern repeated 10 times in agent-output-handlers — LOW
- **Principle**: DRY
- **File**: `packages/extension/src/runtime/agent-output-handlers.ts`
- **Issue**: The pattern `if (!input.context.coop) { return { plan: input.plan, context: input.context, output: input.output, createdDraftIds: [], autoExecutedActionCount: 0, errors: [] }; }` appears 10 times across skill output handlers.
- **Evidence**: Identical 8-line return blocks at lines 298-306, 336-344, 397-404, 453-461, 509-517, 563-571, 640-648, 689-697, 739-747, 796-804.
- **Recommendation**: Extract `createNoopResult(input)` helper. LOW because it's within a single file and readability is acceptable.

#### SOC1. Landing page mixes scene animation refs, speech I/O, and form state — MEDIUM
- **Principle**: SOC
- **File**: `packages/app/src/views/Landing/index.tsx:59-97`
- **Issue**: The `LandingPageContent` component declares 25+ refs for scene elements, manages speech recognition lifecycle, handles form state + persistence, and orchestrates GSAP animations — all in a single function body. Animation concerns (parallax scene), input concerns (speech recognition), and data concerns (form state, localStorage) are interleaved.
- **Evidence**: Lines 72-97 mix scene refs (`storySunRef`, `storyHillBackRef`, etc.) with data-state refs (`recognitionRef`, `recognitionHadErrorRef`). The helper data is properly extracted to `landing-data.ts`, but the component itself still mixes concerns.
- **Recommendation**: Same as S2 — extract scene sections and speech capture into focused components/hooks.

---

### Architecture (EDA / ADR / C4)

#### EDA1. Handler registry is fully implemented with exhaustiveness — INFO (POSITIVE)
- **Principle**: EDA
- **File**: `packages/extension/src/background/handler-registry.ts`
- **Issue**: No issue — positive finding. The `HandlerRecord` type at line 157-159 maps `[K in RegistryRequest['type']]` to handler functions. Adding a new `RuntimeRequest` variant without a handler entry causes a TypeScript compile error. The previous ad-hoc switch has been fully replaced.
- **Evidence**: `handlerRegistry` object (lines 185-521) covers all non-capture message types. `dispatchRegistryMessage` at line 531 delegates cleanly. The capture messages are handled separately via `dispatchCaptureRuntimeMessage` with their own typed dispatch.

#### EDA2. Yjs observer and sync provider listeners remain well-managed — INFO (POSITIVE)
- **Principle**: EDA
- **File**: Multiple view components
- **Issue**: No issue — all event listener registrations in views have corresponding cleanup in useEffect returns. Verified: `PopupHeader.tsx:96-101`, `ShareMenu.tsx:115`, `useDashboard.ts:348-349`, `SidepanelApp.tsx:195-196`.

#### ADR1. 4 of 8 key ADRs created; 4 remaining — MEDIUM
- **Principle**: ADR
- **File**: `docs/decisions/`
- **Issue**: Four well-written ADRs now exist:
  1. `001-yjs-over-automerge.md` — CRDT choice
  2. `002-safe-multisig-coop-primitive.md` — Coop onchain model
  3. `003-passkey-first-auth.md` — Identity approach
  4. `004-browser-extension-primary-surface.md` — Primary surface decision

  Four remaining decisions still lack formal ADRs:
  5. **Local-first with explicit publish** over auto-sync
  6. **Three-format artifact sync** (legacy/v1/v2 Y.Map) migration strategy
  7. **Encrypted-at-rest local storage** with redacted records + encrypted payloads
  8. **ERC-4337 account abstraction** over direct EOA transactions
- **Evidence**: `docs/decisions/` contains 4 files (241 lines total). Each follows proper ADR format: Status, Date, Context, Decision, Alternatives Considered, Consequences.
- **Recommendation**: Create ADR 005-008 for the remaining decisions. The existing 4 are high quality and serve as good templates. Effort is medium because each requires researching the rationale.

#### C4-1. Container (L2) boundaries clear; Component (L3) documentation sparse — MEDIUM
- **Principle**: C4
- **File**: `CLAUDE.md`, `docs/builder/architecture.md`
- **Issue**: Same as previous audit. L1 and L2 are well-documented. L3 module interactions within `shared` are not diagrammed. A new developer cannot easily determine that `coop/flows.ts` depends on `member-account`, `onchain`, `greengoods`, and `coop/sync` without reading import graphs. L4 enforcement is excellent (barrel exports universally used, no deep imports found).
- **Recommendation**: Add a Mermaid module dependency diagram to `docs/builder/architecture.md`.

---

### Data (ACID / BASE / CAP)

#### ACID1. Multi-table Dexie writes consistently use transactions — INFO (POSITIVE)
- **Principle**: ACID
- **File**: `packages/shared/src/modules/storage/db-crud-*.ts`
- **Issue**: No issue — positive finding. Re-verified 15+ transaction sites across 6 CRUD modules: `db-crud-coop.ts:183,218`, `db-crud-receiver.ts:34,91,169,177`, `db-crud-privacy.ts:26,67`, `db-crud-agent.ts:192,215,224`, `db-crud-content.ts:38`, `db-maintenance.ts:30,114`, `portability.ts:326`. No un-transacted multi-table writes found.

#### BASE1. Yjs compound mutations consistently use transact — INFO (POSITIVE)
- **Principle**: BASE
- **File**: `packages/shared/src/modules/coop/sync.ts`, `receiver/sync.ts`, `storage/db-maintenance.ts`
- **Issue**: No issue — positive finding. 6 `doc.transact()` call sites verified: `sync.ts:210,761`, `receiver/sync.ts:26,75,99`, `db-maintenance.ts:269`. All compound CRDT mutations are atomic from the observer perspective.

#### CAP1. Data paths correctly positioned on the CAP spectrum — INFO (POSITIVE)
- **Principle**: CAP
- **Verification**:

| Data Path | Expected Position | Verified |
|-----------|------------------|----------|
| Local Dexie store | CP (single node) | Correct — transactions ensure consistency |
| Yjs peer sync | AP (eventually consistent) | Correct — CRDTs merge deterministically |
| Onchain state (Safe) | CP (consistent on-chain) | Correct — `createUnavailableOnchainState` handles chain partitions |
| API/signaling layer | AP (stateless pub/sub) | Correct — rooms reconstructed from client state |

No CAP mismatches found.

---

## Priority Queue

Top 10 highest-impact fixes across all principles, ordered by severity and effort:

1. **DRY1 — Extract shared background initialization function** — DRY — `packages/extension/src/background.ts:115-145` — Effort: S
2. **S1 — Split archive handler into focused modules** — SRP — `packages/extension/src/background/handlers/archive.ts` — Effort: M
3. **ADR1 — Create remaining 4 architecture decision records** — ADR — `docs/decisions/` — Effort: M
4. **S2 — Extract landing page into section components** — SRP — `packages/app/src/views/Landing/index.tsx` — Effort: M
5. **SOC1 — Separate landing page concerns** — SOC — same file as S2 — Effort: M (same work as S2)
6. **C4-1 — Add module dependency diagram** — C4 — `docs/builder/architecture.md` — Effort: S
7. **DRY2 — Extract v2 Y.Map sync helper** — DRY — `packages/shared/src/modules/coop/sync.ts:229-277` — Effort: S
8. **S3 — Factory for action proposal skill handlers** — SRP — `packages/extension/src/runtime/agent-output-handlers.ts` — Effort: S
9. **DRY3 — Extract no-coop early return helper** — DRY — `packages/extension/src/runtime/agent-output-handlers.ts` — Effort: S
10. **I1 — Sub-path exports for @coop/shared** — ISP — `packages/shared/src/modules/index.ts` — Effort: S

_Note: Items 4+5 are the same work. Actual unique work items: 9._

---

## Trend (last N audits)

| Principle | 2026-04-02 (v1) | 2026-04-02 (v2) |
|-----------|-----------------|-----------------|
| S (SRP) | YELLOW | YELLOW (3 old findings FIXED, 2 new found) |
| O (OCP) | YELLOW | GREEN (both findings FIXED) |
| L (LSP) | GREEN | GREEN |
| I (ISP) | YELLOW | YELLOW (unchanged) |
| D (DIP) | GREEN | GREEN |
| DRY | YELLOW | YELLOW (old finding FIXED, new finding found) |
| KISS | GREEN | GREEN |
| YAGNI | GREEN | GREEN |
| SOC | YELLOW | YELLOW (old finding FIXED, new finding found) |
| EDA | YELLOW | GREEN (handler registry fully implemented) |
| ADR | RED | YELLOW (4 of 8 ADRs created) |
| C4 | YELLOW | YELLOW (unchanged) |
| ACID | GREEN | GREEN |
| BASE | GREEN | GREEN |
| CAP | GREEN | GREEN |

**Improvement summary**: 3 principles improved (OCP YELLOW->GREEN, EDA YELLOW->GREEN, ADR RED->YELLOW). 0 regressed. 7 of 11 v1 findings fully resolved.

---

## Positive Findings Summary

The codebase has made significant strides since the v1 audit:

- **Handler Registry (EDA)**: The 60+ case switch statement in background.ts has been replaced with a typed handler registry (`HandlerRecord`) that enforces exhaustiveness at compile time. This is a textbook OCP + EDA improvement.
- **Spec Registry (OCP)**: action-payload-parsers.ts was refactored from a 15+ case switch to a declarative `ACTION_SPECS` registry with `FIELD_READERS` dispatch and a generic `resolveFromSpec` resolver. Adding a new action class now requires only a registry entry, not source modification.
- **Inference Handlers (OCP)**: inference.ts was refactored from parallel switches to a `REFINE_TASK_HANDLERS` record with per-task `{ buildPrompt, parseOutput, heuristic }` — exactly the recommendation from v1.
- **Skills Split (SRP)**: agent-runner-skills.ts was split from 1565 LOC into 8 focused modules in a `skills/` directory. The original file is now a 12-line barrel re-export.
- **NestTab Extraction (SRP+SOC)**: NestTab.tsx went from 1372 LOC to 656 LOC by extracting `NestMembersSection`. All 4 sub-tabs now follow the same section-component pattern.
- **ADR Creation (ADR)**: 4 high-quality ADRs created covering the most impactful decisions. Each follows proper format with alternatives and consequences.
- **LSP**: Mock/live boundaries remain clean — `createMockOnchainState` and `deployCoopSafeAccount` both produce `onchainStateSchema`-validated output.
- **DIP**: No deep imports from `@coop/shared/src/modules/...` — barrel imports universally enforced.
- **ACID**: Every multi-table Dexie write uses transactions — 15+ sites verified.
- **Event Cleanup**: All view-layer listeners have matching cleanup in useEffect returns.

---

## Next Steps

> **This audit is read-only.** To apply fixes, reply with:
> - `fix critical` — address Critical findings only (none in this audit)
> - `fix all` — address all findings by priority
> - `fix DRY1` — extract shared background initialization (easiest win)
> - `fix S1` — split archive handler into focused modules
> - `fix ADR1` — create remaining architecture decision records
> - `fix S2, SOC1` — extract landing page section components
