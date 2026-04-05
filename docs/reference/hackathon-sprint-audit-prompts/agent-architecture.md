---
title: "Agent Architecture Audit Prompt"
slug: /reference/hackathon-sprint-audit-prompts/agent-architecture
---

# Agent Architecture Audit Prompt

Copy and run this prompt as-is with a repo-aware agent:

```text
Audit this repo read-only and produce an Audit Memo focused on agent architecture, modularity, and execution seams.

Repo: /Users/afo/Code/greenpill/coop
Date context: April 1, 2026

Current repo facts to use as baseline, not proof:
- Agent contracts and memory helpers live in `packages/shared/src/modules/agent`.
- Agent runtime orchestration lives in `packages/extension/src/runtime`.
- Executable skills live under `packages/extension/src/skills`.
- The current architecture includes large runtime files such as `agent-runner-skills.ts` and `agent-output-handlers.ts`.

Operating rules:
- Stay read-only.
- Read both docs and code before evaluating modularity.
- Distinguish documented intent from current implementation.
- For every material claim, cite at least one file path and one command you ran.
- Recommend modular cuts only when they reduce coupling or clarify ownership without adding ceremony.

Start by reading:
- `/Users/afo/Code/greenpill/coop/AGENTS.md`
- `/Users/afo/Code/greenpill/coop/docs/reference/agent-harness.md`
- `/Users/afo/Code/greenpill/coop/docs/reference/skills-system-deep-dive-2026-03-20.md`
- `/Users/afo/Code/greenpill/coop/docs/reference/agent-os-roadmap.md`
- `/Users/afo/Code/greenpill/coop/packages/shared/src/modules/agent/agent.ts`
- `/Users/afo/Code/greenpill/coop/packages/shared/src/modules/agent/memory.ts`

Then inspect:
- `packages/shared/src/modules/agent`
- `packages/extension/src/runtime/agent*`
- `packages/extension/src/skills/*`
- nearby tests under `packages/shared/src/modules/agent/__tests__` and `packages/extension/src/runtime/__tests__`

Required checks:
1. Map the main data flow from observation to planning to skill execution to output persistence.
2. Review whether contracts in shared are cleanly separated from extension runtime orchestration.
3. Review whether skill registration, skill metadata, evaluation, and prompt assembly are cleanly modularized or overly coupled.
4. Identify large-file concentration and whether it reflects justified orchestration or missing boundaries.
5. Evaluate whether evals, skill manifests, output schemas, and runtime handlers form a coherent architecture.
6. Recommend the highest-leverage modular cuts, but only if they reduce entropy in the end state.

Suggested commands:
- `find packages/shared/src/modules/agent -maxdepth 2 -type f | sort`
- `find packages/extension/src/runtime -maxdepth 1 -type f | sort | grep 'agent'`
- `find packages/extension/src/skills -maxdepth 2 -type f | sort`
- `rg -n "AgentObservation|AgentPlan|SkillManifest|SkillRun|memory" packages/shared/src/modules/agent packages/extension/src/runtime packages/extension/src/skills --glob '!**/dist/**'`
- `wc -l packages/extension/src/runtime/agent-runner-skills.ts packages/extension/src/runtime/agent-output-handlers.ts packages/extension/src/runtime/agent-runner.ts 2>/dev/null`
- `rg -n "(describe\\(|test\\(|it\\()" packages/shared/src/modules/agent packages/extension/src/runtime --glob '!**/dist/**'`

Deliverable format:

# Audit Memo

## Current State
- Summarize the intended agent architecture.
- Summarize the implemented agent architecture.
- Note where the architecture is crisp and where it is blurry.

## Architecture Map
- Describe the main execution path:
  - observation
  - planning
  - skill selection
  - model execution
  - output handling
  - persistence

## Findings
- Order findings by severity.
- Include evidence from contracts, runtime, skills, evals, and tests.

## Strengths Worth Preserving
- Call out what is already well modularized or well typed.

## Gaps Or Unknowns
- List any open questions that could change the recommendations.

## Prioritized Next Steps
- Give the best next steps with short rationale and expected payoff.

Hard requirements:
1. End with top findings ordered by severity.
2. Include strengths worth preserving.
3. Include gaps or unknowns.
4. Include prioritized next steps with short rationale.
5. Explicitly separate documented intent from current implementation.
```
