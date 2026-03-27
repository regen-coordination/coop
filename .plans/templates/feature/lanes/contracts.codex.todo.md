---
feature: <feature-slug>
title: <Feature Title> contracts lane
lane: contracts
agent: codex
status: backlog
source_branch: <source-branch>
work_branch: codex/contracts/<feature-slug>
depends_on:
  - ../spec.md
skills:
  - contracts
  - onchain
  - permissions
updated: <YYYY-MM-DD>
---

# Contracts Lane

## Objective

Describe the onchain, permit, schema, or typed-intent work Codex should own.

## Files

- `packages/shared/src/modules/onchain/...`
- `packages/shared/src/modules/policy/...`
- `packages/shared/src/modules/session/...`

## Tasks

- [ ] Update schemas and typed contracts first
- [ ] Implement contract-facing logic
- [ ] Add or update targeted tests
- [ ] Document any live-probe follow-up

## Verification

- [ ] Appropriate validation tier was run
- [ ] Contract or schema behavior is covered

## Handoff Notes

State any replay, permission, or chain-mode risks for QA.
