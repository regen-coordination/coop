# Plans

`.plans/` is the single live planning space for active work.

- Active feature work lives in `.plans/features/<feature-slug>/`
- Archived or superseded plan files live in `.plans/archive/`
- Long-lived product and architecture docs stay in `docs/reference/`

## What Automations Should Read

Default queues:

- Claude implementation: `bun run plans queue --agent claude --json`
- Codex implementation: `bun run plans queue --agent codex --json`
- Codex reconciliation preflight: `bun run plans reconcile --agent codex --automation-id codex-core-queue --json`
- Claude docs maintenance: `bun run plans queue --agent claude --lane docs --json`
- Codex docs maintenance: `bun run plans queue --agent codex --lane docs --json`
- Codex QA pass 1: `bun run plans queue --agent codex --lane qa --handoff-ready --json`
- Claude QA pass 2: `bun run plans queue --agent claude --lane qa --handoff-ready --json`

Default ownership:

- Claude: `ui`
- Codex: `state`, `api`, `contracts`
- Both: `docs`
- QA: `qa`

Historical lane files may still exist with non-default agent suffixes when they were created before
the current ownership rules or migrated from older planning flows. Treat those as historical
exceptions, not as a template for new work.

## Feature Pack Shape

```text
.plans/features/<feature-slug>/
  spec.md
  context.md
  status.json          # Machine-readable lane state (see below)
  lanes/
    <lane>.<agent>.todo.md
  qa/
    qa-codex.todo.md
    qa-claude.todo.md
  eval/
    implementation-notes.md
    qa-report.md
```

Template: `.plans/templates/status.json`

Supported lanes:

- `ui`
- `state`
- `api`
- `contracts`
- `docs`
- `qa`

## Statuses

- `todo` — not started
- `n/a` — lane not applicable for this feature
- `in_progress` — work underway
- `blocked` — waiting on dependencies
- `in_review` — work complete, awaiting review
- `done` — lane finished and verified
- `archived` — feature archived

## status.json

Machine-readable state for each feature hub. Enables CI polling and automatic lane transitions.

```json
{
  "feature": "my-feature",
  "title": "My Feature",
  "stage": "active",
  "lanes": {
    "ui": {
      "owner": "claude",
      "status": "in_progress",
      "depends_on": [],
      "branch": "claude/ui/my-feature",
      "ready_when_dependencies_met": true
    },
    "qa_pass_1": {
      "owner": "codex",
      "status": "blocked",
      "depends_on": ["ui", "state"],
      "branch": "handoff/qa-codex/my-feature",
      "branch_trigger": "handoff/qa-codex/my-feature",
      "ready_when_dependencies_met": true
    }
  },
  "decisions": [
    { "id": "D1", "choice": "Use Yjs for sync", "rationale": "CRDT fits local-first model" }
  ],
  "updated_at": "2026-04-02"
}
```

### Fields

- **`stage`**: `active` | `backlog` | `archived`
- **`lanes.*.status`**: `todo` | `n/a` | `in_progress` | `blocked` | `in_review` | `done`
- **`lanes.*.depends_on`**: Array of lane names that must complete first
- **`lanes.*.branch_trigger`**: Branch name that, when it exists, signals this lane can start
- **`lanes.*.ready_when_dependencies_met`**: Auto-transition from `blocked` → `todo` when all deps are `done`
- **`decisions`**: Array of `{ id, choice, rationale }` — architecture decision log for the feature

### Usage

Update status.json when changing lane state:

```bash
# List features with available work for an agent
bun run plans queue --agent claude --lane ui

# After completing a lane, update status.json and push the handoff branch
# The branch_trigger for the next lane will unblock it automatically
```

## Sequential QA

Use handoff branches:

- `handoff/qa-codex/<feature-slug>`
- `handoff/qa-claude/<feature-slug>`

Codex QA creates the Claude handoff branch when pass 2 should start.

## Commands

```bash
bun run plans validate
bun run plans legacy
bun run plans queue --agent claude
bun run plans queue --agent codex
bun run plans reconcile --agent codex --automation-id codex-core-queue --json
bun run plans queue --agent claude --lane docs
bun run plans queue --agent codex --lane docs
bun run plans queue --agent claude --lane qa --handoff-ready
bun run plans queue --agent codex --lane qa --handoff-ready
```

## Implementation Lane Metadata

Implementation lanes (`state`, `api`, `contracts`) must include:

- `owned_paths`: repo-relative files or directories that define the lane's primary code surface
- `done_when`: concrete, searchable evidence strings that should exist under `owned_paths` once the lane is complete

Automations should use `bun run plans reconcile ...` before implementation so stale `ready` lanes can be marked `done`, ambiguous ones can be blocked for review, and environment failures can surface as inbox items instead of false completion.
