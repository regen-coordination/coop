---
title: Green Goods
slug: /builder/integrations/green-goods
---

# Green Goods

Green Goods is the main bounded onchain coordination integration in Coop's current architecture.

## Phase 1 Scope

The current spec keeps Green Goods intentionally narrow:

- bootstrap a garden owned by the coop Safe
- sync garden profile and domain metadata
- create the required pool structures
- keep all execution inside the existing action-bundle and policy path

## Why This Narrowness Matters

The product is deliberately avoiding open-ended financial execution in the first slice. Green Goods
actions are constrained because bounded behavior is easier to reason about, approve, and audit.

## Runtime Rules

Green Goods actions are only eligible when:

- anchor mode is active
- the action policy allows execution
- the trusted-member context is present

That is the pattern to preserve if this integration expands.
