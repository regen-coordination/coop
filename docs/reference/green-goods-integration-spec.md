---
title: "Green Goods Integration"
slug: /reference/green-goods-integration-spec
---

# Green Goods Integration Spec

This document describes the current Green Goods integration in Coop.

## Current Scope

Coop uses Green Goods as a bounded onchain coordination layer, not as an open-ended execution
surface.

The current integration supports:

- coop-owned garden bootstrap
- garden profile, domain, and pool maintenance
- member-account provisioning for garden participation
- direct member work submission
- trusted-operator work approvals and assessments
- GAP admin reconciliation through the Karma GAP module
- Hypercert and Karma GAP packaging after work has already been approved and assessed

The current integration explicitly does **not** support:

- open-ended treasury execution
- arbitrary contract calls
- a direct Coop-managed member impact-report attestation path

## Current Surfaces

- `Roost` is the Green Goods member workspace. It shows member access state, account provisioning,
  and direct work submission.
- `Nest` is where trusted members and operators queue or execute protected Green Goods work such as
  assessments, approvals, GAP admin sync, and garden maintenance.

## Coop State

Each coop may optionally carry a `greenGoods` state block with:

- enablement and lifecycle status
- requested, provisioning, linked, and error timestamps
- linked `gardenAddress` and `tokenId`
- desired profile fields such as name, description, location, banner image, and metadata
- desired governance fields such as `openJoining`, `maxGardeners`, and `weightScheme`
- inferred domains and computed `domainMask`
- member bindings and gardener reconciliation state
- last sync timestamps for profile, domains, pools, GAP admins, and member bindings
- last transaction hash and last error

## Action Groups

### Session-Capable Safe Actions

These are bounded maintenance actions authorized through Smart Sessions:

- `green-goods-create-garden`
- `green-goods-sync-garden-profile`
- `green-goods-set-garden-domains`
- `green-goods-create-garden-pools`

### Member-Account Actions

These are individualized actions executed through a member account:

- `green-goods-submit-work-submission`
- `green-goods-add-gardener`
- `green-goods-remove-gardener`

### Proposal-First Safe Owner Or Trusted Operator Actions

These remain protected actions in the approval and action-bundle path:

- `green-goods-submit-work-approval`
- `green-goods-create-assessment`
- `green-goods-sync-gap-admins`
- `green-goods-mint-hypercert`

### Legacy Or Unsupported Path

`green-goods-submit-impact-report` still exists as a legacy action class in the policy schema, but
it is not the current supported Green Goods model in Coop. Impact packaging now happens through
Hypercert and Karma GAP workflows instead.

## Schemas And Packaging

The Green Goods attestation model currently relies on three EAS schemas:

- `work`
- `work approval`
- `assessment`

Coop does not treat impact as a fourth direct Green Goods EAS schema. Instead:

- members submit work
- trusted operators approve work and create assessments
- approved work and assessments are bundled into Hypercert and Karma GAP packaging flows

## Execution Model

Green Goods uses the same bounded execution stack as the rest of Coop's privileged work:

- background runtime detects or queues action candidates
- shared modules build deterministic payloads
- policies decide whether approval is required
- action bundles, replay protection, permits, and session checks enforce scope
- approved executions target the appropriate Green Goods, EAS, Hypercert, or GAP contracts

## Safety Posture

The integration stays narrow for a reason:

- member actions are individualized and bounded
- trusted operator actions stay proposal-first unless policy intentionally relaxes them
- session capabilities are restricted to garden bootstrap and maintenance only
- Hypercert and Karma GAP packaging happens after earlier Green Goods work has already been reviewed
  and approved

That posture keeps Coop aligned with explicit human approval, bounded automation, and auditable
execution.
