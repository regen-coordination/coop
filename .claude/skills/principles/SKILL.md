---
name: principles
description: Software engineering principles audit — SOLID, DRY, KISS, YAGNI, SOC, EDA, ADR, C4, ACID, BASE, CAP. Use when the user wants to check adherence to industry best practices or says 'principles audit'.
argument-hint: "[package-name | --team]"
context: fork
version: "1.0.0"
status: active
packages: ["all"]
dependencies: ["audit", "architecture"]
last_updated: "2026-04-02"
last_verified: "2026-04-02"
---

# Principles Audit Skill

Systematic audit of codebase adherence to established software engineering principles.

**References**: See `CLAUDE.md` for codebase patterns. See `/audit` for dead code and dependency health.

**Context mode**: `context: fork` means this skill runs in an isolated subagent context. The agent gets a read-only snapshot of the codebase — it should never edit files during an audit. If findings require fixes, report them in the output and let the user decide when to act.

---

## Scope Lock (ENFORCED)

**Audits are strictly read-only.** This is non-negotiable:
- Do NOT use Edit, Write, or any file-modifying tool during an audit
- Do NOT let sub-agents edit files — all agents must be read-only
- If a finding requires a fix, describe it in the report with file:line references
- Implementation is **gated behind explicit user approval** — the report must be delivered and reviewed before any fixes begin

---

## Activation

### Audit (read-only)

| Trigger | Action |
|---------|--------|
| `/principles` | Full codebase principles audit |
| `/principles [package]` | Targeted package audit |
| `/principles --team` | Parallel team audit (worktree-isolated agents) |
| `/principles solid` | SOLID-only audit |
| `/principles data` | ACID + BASE + CAP audit |
| `/principles arch` | EDA + ADR + C4 audit |

### Execute (after audit)

| Trigger | Action |
|---------|--------|
| `fix latest` | Load the most recent report, implement all findings by priority |
| `fix latest critical` | Load the most recent report, implement CRITICAL findings only |
| `fix latest S1, EDA1` | Load the most recent report, implement specific findings |
| `fix [date]` | Load report from a specific date (e.g., `fix 2026-04-02`) |
| `fix [date] critical` | Specific report, CRITICAL findings only |
| `fix [date] S1, EDA1` | Specific report, specific findings |
| `fix critical` | Alias for `fix latest critical` |
| `fix all` | Alias for `fix latest` |
| `fix S1, EDA1` | Alias for `fix latest S1, EDA1` |

---

## Scope Confirmation (REQUIRED)

Before starting analysis, echo back the scope to the user:

```
Principles audit scope: [package or "full codebase"]
Mode: [single-agent | team]
Principle groups: [all | subset if specified]
Previous audit: [date or "none found"]

Proceed? [y/n]
```

---

## Audit Packages (Priority Order)

1. `packages/shared/src/` — domain modules (highest surface area)
2. `packages/extension/src/` — MV3 browser extension
3. `packages/app/src/` — PWA shell
4. `packages/api/src/` — Hono API server

---

## Part 0: Previous Findings Verification

Check `.plans/audits/*-principles.md` for prior reports. Re-verify all Critical and High findings. Apply the same escalation rules as `/audit` (3+ cycles = escalate one level, 5+ cycles = flag as chronic in Executive Summary).

---

## Part 1: SOLID Principles

### S — Single Responsibility Principle

For each module in `packages/shared/src/modules/`:
- Does each module/class/function have exactly one reason to change?
- Identify god-modules that mix domain logic with I/O, UI concerns, or transport — focus on *mixed concerns*, not raw line count (LOC thresholds are covered by `/audit` Part 4)
- Check if React components in extension/app mix data fetching, business logic, and presentation
- A 200-line file mixing I/O + domain logic is a worse SRP violation than a 400-line file with one clear responsibility

### O — Open/Closed Principle

- Are modules extensible without modification?
- Look for switch/if-else chains on type discriminators that would need editing to add a new variant
- Check if the agent skill pipeline, flow board, and sync layer use plugin/strategy patterns or hardcoded branches
- Flag enum-driven dispatch that requires source modification to add new cases

### L — Liskov Substitution Principle

- Where interfaces or abstract types are used, can every implementation be substituted without breaking callers?
- Check mock vs. live mode implementations (onchain, archive, session) for behavioral parity
- Verify that `VITE_COOP_ONCHAIN_MODE=mock` and `VITE_COOP_ONCHAIN_MODE=live` are truly interchangeable at runtime

### I — Interface Segregation Principle

- Are consumers forced to depend on interfaces larger than what they use?
- Check `@coop/shared` barrel exports — do downstream packages import large surfaces when they only need a few symbols?
- Look for "fat" type definitions that force consumers to implement or handle fields they never use

### D — Dependency Inversion Principle

- Do high-level modules depend on abstractions or on concrete implementations?
- Check if extension/app directly instantiate shared internals or go through factory/provider patterns
- Verify that onchain, archive, and sync layers depend on abstractions, not concrete providers

---

## Part 2: Code Quality Principles

### DRY — Don't Repeat Yourself

- Search for duplicated logic across packages (especially shared <-> extension, shared <-> app)
- Check for repeated patterns in: error handling, state machine transitions, Yjs document access, Safe/onchain call construction, Dexie queries
- Flag copy-pasted utility functions that should be consolidated
- Note: some duplication across package boundaries is acceptable if it avoids tight coupling — call these out but classify as INFO, not violation

### KISS — Keep It Simple, Stupid

- Identify over-engineered abstractions: wrapper classes that add no value, deeply nested generics, unnecessary indirection layers
- Flag premature optimization (memoization without profiling evidence, complex caching where simple fetch-on-demand works)
- Check for overly complex type gymnastics in TypeScript that could be simplified
- Look for functions with cyclomatic complexity > 10

### YAGNI — You Ain't Gonna Need It

> **Dead code detection** (unused exports, files, deps) is handled by `/audit` Part 3 via `knip`. Do not duplicate that work here. Focus on *design-level* speculation.

- Find speculative abstractions: interfaces with exactly one implementation that don't serve a mock/test boundary
- Check for config options or parameters that are never varied in practice
- Flag any "future-proofing" scaffolding that has no current consumer
- Identify over-parameterized functions where most callers pass the same values

### SOC — Separation of Concerns

> **Layer violations** (business logic in app/extension instead of shared, package .env files) are detected by `/audit` Part 4. Do not re-run those greps here. Focus on *concern leakage patterns* and cross-cutting concern design.

- **Vertical**: Does each shared module own its domain without leaking into adjacent modules? Check for circular dependencies between modules
- **Horizontal**: Are concerns cleanly separated within components? Look for hooks that mix data fetching, transformation, and side effects in a single function
- **Cross-cutting**: How are logging, error handling, and auth threaded through? Are they scattered or channeled through a consistent pattern?

---

## Part 3: Architectural Principles

### EDA — Event-Driven Architecture

- Map the current event/message flow: background worker <-> popup <-> sidepanel <-> content scripts
- Check for tight coupling via direct function calls where events would be more appropriate
- Evaluate Yjs awareness and CRDT update propagation — are observers properly cleaned up? Are there race conditions in event ordering?
- Review the WebSocket/WebRTC signaling layer: is the event contract well-defined or ad-hoc?
- Check for event handler leaks (addEventListener without removeEventListener, Yjs observers without cleanup)

### ADR — Architecture Decision Records

- Check if significant architectural decisions are documented (in `docs/`, `.plans/`, or inline)
- Identify undocumented decisions that should have ADRs:
  - Choice of Yjs over other CRDTs
  - Safe multisig as coop primitive
  - Passkey-first auth over wallet-extension-first
  - The agent skill pipeline design
  - Mock/live mode split
  - Browser extension as primary surface (vs. standalone app)
  - Local-first with explicit publish (vs. auto-sync)
- For each gap, note what the decision was (as inferred from code) and why an ADR would help

### C4 Model — Architectural Clarity

- **Context (L1)**: Is the system boundary clear? Can a new developer understand what Coop interacts with externally (blockchain, Filecoin, signaling server, TURN, browser APIs)?
- **Containers (L2)**: Are the four packages (shared, extension, app, api) well-defined containers with clear responsibilities, or do boundaries blur?
- **Components (L3)**: Within each container, are the major components identifiable and their interactions documented?
- **Code (L4)**: At the code level, are module boundaries enforced (barrel exports, no deep imports)?

---

## Part 4: Data Principles

### ACID (where applicable)

- **Atomicity**: Are multi-step Dexie/IndexedDB writes wrapped in transactions? Can a crash mid-write leave the local DB in an inconsistent state?
- **Consistency**: Are Yjs compound CRDT operations atomic (transact blocks)? Are there partial updates that could violate invariants?
- **Isolation**: Can concurrent tab/worker operations interfere with each other's data?
- **Durability**: Is persisted data resilient to crash recovery? Check Dexie transaction boundaries and Yjs persistence provider configuration.

### BASE — Basically Available, Soft state, Eventually consistent

- Review the Yjs sync model: how does the system handle conflicting edits across peers?
- Check if the UI correctly reflects soft state (optimistic updates with rollback on conflict)
- Identify any places where the code assumes strong consistency but the underlying system provides eventual consistency
- Verify that the offline-first model gracefully handles stale reads and delayed writes

### CAP Theorem Positioning

Document where the system sits on the CAP spectrum for each data path:

| Data Path | Expected Position | Verify |
|-----------|------------------|--------|
| Local Dexie store | CP (consistent + partition-tolerant, single node) | No distributed conflict possible |
| Yjs peer sync | AP (available + partition-tolerant, eventually consistent) | Check merge semantics |
| Onchain state (Safe) | CP (consistent on-chain, unavailable during partitions) | Check how UI handles chain unavailability |
| API/signaling layer | ? | Determine actual tradeoff |

Flag any mismatch where code assumes a CAP property that the underlying system doesn't guarantee.

---

## Part 5: Self-Validation (REQUIRED before report)

Before generating the final report, re-verify EVERY finding:

1. **Re-read** the flagged file at the cited line number
2. **Confirm** the code matches what you described in the finding
3. **Check context** — read 10 lines above/below for guards, comments, or patterns that invalidate the finding
4. **Assign confidence**: `HIGH` (verified in code) / `MEDIUM` (likely but context unclear)
5. **Drop findings below HIGH confidence** — only include verified findings

---

## Part 6: Report Generation

Create at `.plans/audits/[date]-principles.md`:

```markdown
# Principles Audit Report - [Date]

## Executive Summary
- **Packages analyzed**: [list]
- **Mode**: Single-agent | Team
- **Principle groups audited**: [list]

### Scorecard

| Principle | Score | Top Issue | Effort |
|-----------|-------|-----------|--------|
| S (SRP) | GREEN/YELLOW/RED | ... | S/M/L |
| O (OCP) | ... | ... | ... |
| L (LSP) | ... | ... | ... |
| I (ISP) | ... | ... | ... |
| D (DIP) | ... | ... | ... |
| DRY | ... | ... | ... |
| KISS | ... | ... | ... |
| YAGNI | ... | ... | ... |
| SOC | ... | ... | ... |
| EDA | ... | ... | ... |
| ADR | ... | ... | ... |
| C4 | ... | ... | ... |
| ACID | ... | ... | ... |
| BASE | ... | ... | ... |
| CAP | ... | ... | ... |

---

## Previous Findings Status

_Tracked from: [previous audit date or "first audit"]_

| ID | Finding | Status | Notes |
|----|---------|--------|-------|

---

## Findings by Principle

### SOLID

#### S1. [Title] — [severity: CRITICAL | HIGH | MEDIUM | LOW]
- **Principle**: SRP
- **File**: `package/path/to/file.ts:line`
- **Issue**: [Description]
- **Evidence**: [Code snippet or reference]
- **Recommendation**: [Actionable fix]

...

### Code Quality (DRY / KISS / YAGNI / SOC)

...

### Architecture (EDA / ADR / C4)

...

### Data (ACID / BASE / CAP)

...

---

## Priority Queue

Top 10 highest-impact fixes across all principles, ordered by severity and effort:

1. **[Fix title]** — [Principle] — `file:line` — [Effort: S/M/L]
2. ...

---

## Trend (last N audits)

| Principle | [date1] | [current] |
|-----------|---------|-----------|
| S (SRP) | ... | ... |
| ... | ... | ... |

---

## Next Steps

> **This audit is read-only.** To apply fixes, reply with:
> - `fix critical` — address Critical findings only
> - `fix all` — address all findings by priority
> - `fix S1, D3` — address specific findings by ID
```

---

## Part 6b: Chat Output (REQUIRED)

After writing the report file, output a detailed summary to the user in chat. This is what they see — make it count.

### Format

````markdown
## Principles Audit — [Date]

### Scorecard

| Principle | Score | Top Issue |
|-----------|-------|-----------|
| S (SRP) | GREEN/YELLOW/RED | One-line summary or "—" if green |
| O (OCP) | ... | ... |
| ... (all 15 principles) | ... | ... |

### Findings

For EACH non-INFO finding, output a block like:

#### [ID]. [Title] — [SEVERITY]
**[Principle]** · `file:line` · Effort: [S/M/L]
[2-3 sentence description of the issue and its impact]
**Fix**: [Concrete recommendation in 1-2 sentences]

Group findings under their principle category headers (SOLID, Code Quality, Architecture, Data).

### Positive Findings
- [Bullet list of things the codebase does well — include principle name and evidence location]

### Action Items

Numbered list of unique work items (bundle findings that share the same fix), ordered by impact:

```
1. [Fix title] — fixes [IDs] — Effort: [S/M/L]
   [One sentence: what to do and where]
2. ...
```

Then show the fix commands:

> Reply with:
> - `fix critical` — address Critical findings only
> - `fix all` — address all findings by priority
> - `fix S1, EDA1` — address specific findings by ID
> - `fix S1, EDA1` can also be combined for overlapping fixes
````

### Rules

- **Always show all 15 principles** in the scorecard, even if GREEN
- **Never skip findings** — every non-INFO finding from the report must appear in chat
- **Include file:line references** — the user navigates from this output
- **Bundle overlapping fixes** in Action Items (e.g. "fixes S1 + EDA1" when they're the same work)
- **Keep finding descriptions concise** but include the "why it matters" — not just what's wrong

---

## Part 7: Team Mode

When `--team` is passed, spawn parallel agents:

```
Lead (Part 0 + Parts 5-6 — validation, report)
  solid-auditor        (Part 1 — SOLID principles across all packages)
  quality-auditor      (Part 2 — DRY, KISS, YAGNI, SOC)
  arch-auditor         (Part 3 — EDA, ADR, C4)
  data-auditor         (Part 4 — ACID, BASE, CAP)
```

All agents use `isolation: worktree` and are read-only. Lead re-verifies all findings before synthesis.

### Spawn Prompts

**solid-auditor:**
```
Audit the codebase for SOLID principles compliance. Check all packages in order:
shared, extension, app, api. For each module, evaluate SRP (files >300 LOC,
functions >50 LOC, mixed concerns), OCP (hardcoded switch/if-else chains),
LSP (mock/live behavioral parity), ISP (fat barrel exports), DIP (concrete
vs abstract dependencies). Report findings with severity and file:line.
Do NOT edit any files.
```

**quality-auditor:**
```
Audit the codebase for DRY, KISS, YAGNI, and SOC compliance. Check all packages
in order: shared, extension, app, api. Find duplicated logic across packages,
over-engineered abstractions, dead code and speculative scaffolding, and concern
leaks between layers. Report findings with severity and file:line.
Do NOT edit any files.
```

**arch-auditor:**
```
Audit the codebase for EDA, ADR, and C4 model compliance. Map event flows in the
extension (background <-> popup <-> sidepanel). Identify undocumented architecture
decisions. Evaluate C4 clarity at all four levels. Check for event handler leaks
and ad-hoc message contracts. Report findings with severity and file:line.
Do NOT edit any files.
```

**data-auditor:**
```
Audit the codebase for ACID, BASE, and CAP compliance. Check Dexie transaction
boundaries, Yjs transact usage, onchain multi-step operation resilience. Evaluate
eventual consistency handling in the UI. Map each data path to its CAP position
and flag mismatches. Report findings with severity and file:line.
Do NOT edit any files.
```

---

## Part 8: Execute Findings

When the user replies with `fix [IDs]`, `fix critical`, or `fix all` after an audit, this phase activates.

### Activation

| Trigger | Scope |
|---------|-------|
| `fix critical` | All CRITICAL findings from the most recent report |
| `fix all` | All findings from the most recent report, by priority queue order |
| `fix S1, EDA1` | Specific finding IDs (bundle overlapping fixes automatically) |
| `fix S1` | Single finding |

### Batch Size Limit

**Max 3 findings per fix run.** This prevents context exhaustion and ensures each run completes reliably.

- If the selected scope (e.g., `fix all`, `fix critical`) resolves to more than 3 findings, pick the **top 3 by priority queue order** and tell the user how many remain:
  ```
  Batch 1 of N: fixing [ID1], [ID2], [ID3] (M remaining — run `fix` again after this batch)
  ```
- Explicit ID lists (`fix S1, EDA1, D3`) are exempt from the cap — the user chose them intentionally
- After a batch completes, the user runs `fix` again to process the next 3

### Step 0: Load Report

Resolve which report to use:

1. **`fix latest`** (or bare `fix all`, `fix critical`, `fix S1`): Glob `.plans/audits/*-principles.md`, sort by date descending, use the newest.
2. **`fix [date]`** (e.g., `fix 2026-04-02`): Load `.plans/audits/[date]-principles.md` exactly.
3. **No report found**: Tell the user to run `/principles` first.

After loading, echo the report being used:

```
Loaded report: .plans/audits/2026-04-02-principles.md
Findings: [N total, X critical, Y high, Z medium]
Scope: [what the fix trigger selected — all / critical / specific IDs]
Batch: [X of Y] (if capped)
```

### Step 1: Plan

For each finding in the current batch (or bundle of overlapping findings), generate an implementation plan:

1. **Re-verify** the finding still applies — **skip this if the report is less than 24 hours old** (the audit's Part 5 self-validation already confirmed every finding at cited line numbers; re-reading is redundant unless the code has changed since)
2. **Identify the fix type** using the routing table below
3. **List files that will be modified** and files that must NOT be touched
4. **Estimate blast radius** — which packages are affected? Does this need `smoke` or just `typecheck`?
5. **Output the plan to the user** and wait for approval before proceeding

### Step 2: Route to Agent

Each finding type maps to the best-fit agent and supporting skills:

| Finding Type | Agent | Skills Loaded | Isolation |
|-------------|-------|---------------|-----------|
| **SRP extraction** (split large files into focused modules) | `cracked-coder` | `architecture`, `testing` | `worktree` |
| **OCP refactor** (switch → registry/strategy pattern) | `cracked-coder` | `architecture`, `testing` | `worktree` |
| **DRY consolidation** (extract shared utilities/factories) | `cracked-coder` | `architecture`, `testing` | `worktree` |
| **SOC extraction** (extract components/hooks from large files) | `cracked-coder` | `react`, `testing` | `worktree` |
| **EDA refactor** (handler registry, typed dispatch) | `cracked-coder` | `architecture`, `data-layer`, `testing` | `worktree` |
| **ADR creation** (write architecture decision records) | `oracle` | `architecture` | none (docs only) |
| **C4 documentation** (diagrams, module maps) | `oracle` | `architecture` | none (docs only) |
| **ISP refactor** (sub-path exports, interface splitting) | `migration` | `architecture`, `testing` | `worktree` |
| **ACID/BASE fix** (transaction boundaries, transact blocks) | `cracked-coder` | `data-layer`, `testing` | `worktree` |
| **CAP alignment** (consistency model corrections) | `cracked-coder` | `data-layer`, `testing` | `worktree` |

### Step 3: Agent Prompt Construction

Each agent gets a prompt that includes:

```
## Task
[Finding ID]: [Finding title]

## Context
[Full finding text from the report including file:line, evidence, and recommendation]

## Constraints
- Files in scope: [list from plan]
- Files NOT in scope: [list from plan]
- Verification tier: [typecheck | quick | smoke based on blast radius]
- Follow TDD: write/update tests that prove the fix, then implement

## Success Criteria
- [Specific measurable outcome from the finding's recommendation]
- All existing tests still pass
- No new lint errors
- Verification tier passes
```

### Step 4: Parallel Execution

When fixing multiple findings:

- **Independent findings** (different files, no overlap): spawn agents in parallel with `isolation: worktree`
- **Overlapping findings** (e.g., S1 + EDA1 both touch `background.ts`): bundle into a single agent prompt
- **Sequential dependencies** (e.g., ISP refactor before DRY consolidation of the split exports): run in order

### Step 5: Post-Agent Regression Review

After all agents complete, run the mandatory regression review from CLAUDE.md:

1. **Scope check**: Verify each changed file was in the agent's assigned scope
2. **Conflict check**: Flag any file modified by more than one agent
3. **Build gate**: Run verification tier from the plan (minimum `quick`, `smoke` for cross-package)
4. **Test gate**: Run `bun run test` — confirm no regressions
5. **Code review**: Spawn `code-reviewer` agent on the combined diff
6. **Simplify pass**: Run `/simplify` on changed files to catch over-engineering in the fix itself
7. **Summary**: Output all changes with before/after test counts

### Step 6: Report Update

After successful fixes, update the audit report:

1. In the **Previous Findings Status** table, mark fixed findings as `FIXED` with the date
2. In the **Trend** table, note which principles improved
3. Do NOT remove the original finding text — it serves as history

### Chat Output After Execution

```markdown
## Fixes Applied

| ID | Finding | Status | Files Changed |
|----|---------|--------|---------------|
| S1 | background.ts handler registry | FIXED | background.ts, handlers/registry.ts |
| EDA1 | typed dispatch | FIXED | (same as S1) |
| ... | ... | ... | ... |

### Verification
- Verification tier: [tier] — [PASS/FAIL]
- Tests: [X passing, Y failing] (was: [A passing, B failing])
- Lint: [PASS/FAIL]
- Code review: [APPROVE / REQUEST_CHANGES with summary]

### Remaining Findings
[List any findings not addressed in this run]
```

---

## Anti-Patterns

| Don't | Why |
|-------|-----|
| Run knip or grep for unused exports | That's `/audit` Part 3 — principles focuses on design, not dead code |
| Flag files purely for LOC thresholds | That's `/audit` Part 4 — principles SRP focuses on mixed concerns |
| Re-run layer-violation greps (business logic in app/ext) | That's `/audit` Part 4 — principles SOC focuses on concern leakage patterns |
| Flag all duplication as DRY violations | Some cross-package duplication avoids coupling — classify as INFO |
| Report YAGNI on mock/live boundaries | These serve a real test purpose |
| Judge CAP position without checking the actual transport | Code may look CP but run over an AP channel |
| Include findings below HIGH confidence | Self-validation gate exists for a reason |
| Edit files during an audit | Read-only mode; report findings, let user decide |
| Skip re-reading files before reporting | Stale reads = false findings |
| Execute fixes without user plan approval | Step 1 outputs a plan — wait for explicit go-ahead |
| Fix more than 3 findings in one run (unless user listed IDs explicitly) | Context exhaustion causes loops — batch and iterate |
| Re-verify findings from a report less than 24h old | Part 5 already validated; redundant reads waste context |
| Skip regression review after agents finish | CLAUDE.md mandates post-agent review before commit |
| Let an agent touch files outside its scope | Each agent gets an explicit file allowlist |
| Run overlapping findings as separate agents | Bundle them — two agents editing the same file = conflicts |
| Skip `/simplify` on agent output | Agents sometimes over-engineer the fix itself |

---

## Key Principles

- **Complete all packages** — never skip
- **Read-only mode** — don't edit during audit
- **Evidence-based** — every finding needs file:line and code evidence
- **Contextual scoring** — GREEN/YELLOW/RED per principle, not just pass/fail
- **Actionable** — every finding has a concrete recommendation

## Related Skills

- `audit` — Dead code detection, unused exports, dependency health, LOC/god-object thresholds, layer-violation greps. Principles defers all quantitative/tooling-driven checks to `/audit` and focuses on design-level judgment.
- `architecture` — Module boundary design and entropy reduction
- `review` — PR-scoped review for specific changes
- `security` — Security-focused audit
