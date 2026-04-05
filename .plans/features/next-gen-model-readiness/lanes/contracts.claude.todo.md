---
feature: next-gen-model-readiness
title: Close the development agent dispatch loop
lane: contracts
agent: claude
status: backlog
source_branch: main
work_branch: feature/dev-agent-dispatch
depends_on:
  - ../spec.md
  - state.claude.todo.md
  - api.claude.todo.md
owned_paths:
  - scripts/plans.ts
done_when:
  - --json
  - dispatchLane
  - dynamicLaneAssignment
skills:
  - architecture
updated: 2026-04-02
---

# Phase 4: Close the Development Agent Dispatch Loop

Target: Structured output from plans.ts commands. Dispatch loop for autonomous task allocation. Dynamic lane assignment.

**Status**: Backlog — depends on Phases 2 (eval consolidation) and 3 (tool definitions).

**Note**: This phase is forward-looking. It prepares the Planning OS for a world where the planner model can self-organize work. The current system (manual queue → human dispatches to Claude/Codex) continues working. This adds a machine-readable layer on top.

## Step 1: Add `--json` flag to `bun run plans queue`

Modify `scripts/plans.ts` `queueCommand()` to accept a `--json` flag:

```typescript
// Current output (human-readable):
// ┌ Ready lanes for claude:
// │  feature/foo → lanes/ui.claude.todo.md (ready)
// └

// With --json:
// [
//   {
//     "feature": "foo",
//     "lane": "ui",
//     "agent": "claude",
//     "status": "ready",
//     "workBranch": "codex/state/foo",
//     "ownedPaths": ["packages/app/src/views/"],
//     "doneWhen": ["FooComponent("],
//     "dependsOn": ["../spec.md"],
//     "dependenciesMet": true,
//     "skills": ["react", "testing"]
//   }
// ]
```

The JSON output includes everything a planner model needs to decide what to work on, in what order, and with what tools.

**Verify**: `bun run plans queue --agent claude --json` outputs valid JSON. `bun run plans queue --agent claude` still shows human-readable output (backward compatible).

## Step 2: Add `--json` flag to `bun run plans reconcile`

Modify `scripts/plans.ts` `reconcileCommand()` to accept a `--json` flag:

```typescript
// With --json:
// {
//   "feature": "foo",
//   "lane": "state",
//   "status": "done",
//   "evidenceFound": ["reconcileReceiverCapture("],
//   "evidenceMissing": [],
//   "allEvidenceMet": true,
//   "recommendation": "mark-done"
// }
```

Recommendations: `mark-done` | `needs-work` | `blocked` | `stale`

**Verify**: `bun run plans reconcile --agent codex --json` outputs valid JSON with pass/fail signals.

## Step 3: Add structured lane metadata to queue output

Enhance the JSON output with execution-relevant metadata:

```typescript
{
  // ... existing fields ...
  "estimatedEffort": "medium",     // inferred from task count and file scope
  "fileCount": 4,                  // files in owned_paths
  "testCount": 12,                 // test files covering owned_paths
  "evalCommand": "bun run validate smoke",  // recommended eval after completion
  "contextFiles": [                // files the agent should read first
    ".plans/features/foo/spec.md",
    ".plans/features/foo/context.md"
  ]
}
```

This gives a planner model everything it needs to dispatch work without reading the lane file manually.

**Verify**: JSON output includes all metadata fields. Values are accurate (cross-reference with actual file counts).

## Step 4: Build the dispatch function

Add `dispatchLane()` to `scripts/plans.ts`:

```typescript
async function dispatchLane(lane: QueuedLane, options: {
  agent: 'claude' | 'codex';
  dryRun?: boolean;
  evalAfter?: string;
}): Promise<DispatchResult> {
  // 1. Check dependencies met (from reconcile)
  // 2. Create work branch if needed
  // 3. Emit structured task definition
  // 4. [If codex] Generate codex exec command with lane content piped
  // 5. [If claude] Generate claude --task command with lane content
  // 6. After execution: run eval command
  // 7. Run reconcile to check done_when evidence
  // 8. Return { status, evidenceFound, evalPassed }
}
```

**Dry-run first**: `bun run plans dispatch --lane state --agent codex --dry-run` shows what would happen without executing.

**Verify**: Dry-run output is accurate. Actual dispatch creates the work branch and generates the correct command.

## Step 5: Dynamic lane assignment

Add `dynamicLaneAssignment()` to `scripts/plans.ts`:

```typescript
async function dynamicLaneAssignment(lanes: QueuedLane[]): LaneAssignment[] {
  // Instead of static Claude=UI/Codex=state:
  // 1. Assess each lane's requirements:
  //    - Needs visual verification? → prefer Claude (has browser MCP)
  //    - Pure logic/state? → either agent works
  //    - Needs deep file exploration? → prefer Claude (interactive)
  //    - Deterministic with clear done_when? → prefer Codex (non-interactive)
  // 2. Return assignment recommendations with reasoning
  return lanes.map(lane => ({
    lane,
    recommendedAgent: assessBestAgent(lane),
    reasoning: explainAssignment(lane),
    overrideable: true,
  }));
}
```

This is advisory — the planner model or human can override. The function encodes the heuristics that currently live in the spec as static assignments.

**Verify**: `bun run plans assign --feature foo --json` outputs lane assignments with reasoning.

## Step 6: Add dispatch monitoring

Add `monitorDispatch()` for tracking dispatched lanes:

```typescript
async function monitorDispatch(dispatch: DispatchResult): MonitorResult {
  // 1. Check if work branch has new commits
  // 2. Run reconcile to check done_when evidence
  // 3. Run eval command if evidence is found
  // 4. Return { status, commits, evidenceStatus, evalStatus }
}
```

This closes the loop: dispatch → monitor → reconcile → report.

**Verify**: After a test dispatch, `bun run plans monitor --lane state --feature foo` shows accurate status.

## Future Considerations (not in this plan)

- **Full autonomous loop**: A planner model reads queue, dispatches all ready lanes, monitors completion, handles failures. This is the ultimate goal but requires trust in the model's planning ability.
- **Cross-lane conflict detection**: Automatic detection when two dispatched lanes modify the same file.
- **Cost-aware routing**: Route tasks to cheaper models when complexity is low.
- **Learning from dispatch history**: Track which assignments worked well and feed back into `dynamicLaneAssignment()`.

## Final Verification

- [ ] `bun run plans queue --json` outputs valid, complete JSON
- [ ] `bun run plans reconcile --json` outputs pass/fail signals
- [ ] `bun run plans dispatch --dry-run` shows accurate execution plan
- [ ] `bun run plans assign` provides reasonable lane assignments
- [ ] All existing `bun run plans` commands still work (backward compatible)
- [ ] `bun run validate quick` passes
