---
title: Gnosis Safe
slug: /builder/integrations/gnosis-safe
---

# Gnosis Safe

Safe gives Coop a real shared onchain account boundary for coops.

## Why It Is Used

The product wants a group identity and execution layer that can support bounded actions without
forcing every member into a wallet-first onboarding flow. Safe provides the account model, while
passkeys and ERC-4337 support the user-facing and execution story.

## What It Does In Coop

- creates a deterministic or live coop account path
- anchors group identity onchain
- acts as the execution boundary for privileged actions
- supports mock and live modes for development and demos

## Important Design Point

Coop is not using Safe as a generic web3 flourish. It is part of the cooperative execution model.
Actions still flow through policy, approval, session, and permit layers before they become sendable.
