---
title: Green Goods
slug: /builder/integrations/green-goods
---

# Green Goods

Green Goods is the main bounded onchain coordination integration in Coop's current architecture.

## Current Scope

The current integration is still intentionally bounded, but it now spans more than garden bootstrap:

- bootstrap a garden owned by the coop Safe
- sync garden profile and domain metadata
- create the required pool structures
- provision member access for direct work submission
- let trusted operators approve work, create assessments, and reconcile GAP admins
- package approved work and assessments into Hypercert and Karma GAP flows
- keep all execution inside the existing action-bundle and policy path

## What Coop Does Not Treat As A Direct Green Goods Action

- no open-ended financial execution
- no arbitrary contract calls
- no direct Coop-managed member impact-report attestation path

Impact packaging is modeled as operator-side Hypercert and Karma GAP work after approval and
assessment, not as a separate direct member EAS submission.

## Current Authority Split

- `member account`: direct work submission and gardener lifecycle actions
- `session capability`: bounded garden bootstrap and maintenance only
- `safe owner` or trusted operator path: work approvals, assessments, GAP admin sync, and Hypercert
  packaging

## Why This Narrowness Matters

The product is deliberately avoiding open-ended financial execution in the first slice. Green Goods
actions are constrained because bounded behavior is easier to reason about, approve, and audit.

## Runtime Rules

Green Goods actions are only eligible when:

- anchor mode is active
- the action policy allows execution
- the trusted-member context is present

That is the pattern to preserve if this integration expands.
