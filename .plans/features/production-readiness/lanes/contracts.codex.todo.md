---
feature: production-readiness
title: Production readiness release-contract lane
lane: contracts
agent: codex
status: ready
source_branch: main
work_branch: codex/contracts/production-readiness
depends_on:
  - ../spec.md
skills:
  - architecture
  - testing
updated: 2026-03-27
---

# Contracts Lane

- Separate staged-launch requirements from live-rails activation in the release docs.
- Document the live-rails env matrix explicitly:
  - `VITE_COOP_SESSION_MODE=live`
  - `VITE_COOP_TRUSTED_NODE_ARCHIVE_SPACE_DID`
  - `VITE_COOP_TRUSTED_NODE_ARCHIVE_DELEGATION_ISSUER`
  - `VITE_COOP_TRUSTED_NODE_ARCHIVE_SPACE_DELEGATION`
  - any operator-only credentials that must stay out of public builds
- Treat `bun run validate:production-live-readiness` as a deferred promotion gate, not part of the
  staged launch sign-off.
