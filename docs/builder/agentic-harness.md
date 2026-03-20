---
title: Agentic Harness
slug: /builder/agentic-harness
---

# Agentic Harness

Coop runs a browser-native observe → plan → act loop inside the extension. The harness is designed
to be useful before it is fully autonomous.

## Core Loop

Each cycle does six things:

1. observe local state for actionable triggers
2. deduplicate observations by fingerprint
3. plan skill execution through a dependency graph
4. execute skills through the inference cascade
5. emit drafts or action proposals
6. log trace data for review and debugging

## Skill System

The harness currently documents 14 registered skills. Skills declare:

- triggers
- dependencies
- output schema references
- approval modes
- timeout and skip conditions

The planner topologically sorts them with deterministic ordering so that skill execution stays
predictable.

## Inference Cascade

The current cascade is:

- WebLLM on WebGPU when available
- transformers.js on WASM as the next fallback
- heuristic rules when models are unavailable or deterministic behavior is preferable

The design goal is graceful degradation, not maximum model ambition at any cost.

## Approval Model

The harness supports three approval tiers:

- `advisory`
- `proposal`
- `auto-run-eligible`

Even the last tier is still bounded by user opt-in and policy.

## Observability

Structured logs are written to Dexie with correlated traces and spans. This matters because browser
agents are otherwise difficult to debug, especially when failures happen in background contexts.

## Current Gaps

The reference roadmap still calls out several active limitations:

- no systematic evaluation harness
- fixed-interval polling instead of a fuller event-driven model
- large runtime files that need more modularity
- broader portability work still ahead

Read [R&D](/builder/rd) for the current evolution lanes.
