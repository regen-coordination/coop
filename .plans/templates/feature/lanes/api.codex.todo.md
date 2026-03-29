---
feature: <feature-slug>
title: <Feature Title> API lane
lane: api
agent: codex
status: backlog
source_branch: <source-branch>
work_branch: codex/api/<feature-slug>
depends_on:
  - ../spec.md
skills:
  - api
  - hono
  - contracts
updated: <YYYY-MM-DD>
---

# API Lane

## Objective

Describe the API/server/message-contract work Codex should own.

## Files

- `packages/api/...`
- Shared request/response contracts
- Runtime message handlers if affected

## Tasks

- [ ] Update request/response contracts
- [ ] Implement route or handler changes
- [ ] Add or update API tests
- [ ] Capture any migration or rollout notes

## Verification

- [ ] Appropriate validation tier was run
- [ ] Message/route contracts are tested

## Handoff Notes

Anything QA should verify from client to server boundary.
