---
title: WebAuthN
slug: /builder/integrations/webauthn
---

# WebAuthN

WebAuthN gives Coop its passkey-first identity story.

## Why Coop Uses It

The product goal is to let members create and join coops without starting from a wallet extension.
Passkeys are the familiar user-facing credential, while the deeper account structure can still bridge
into Safe and ERC-4337 flows.

## What Builders Need To Remember

- RP ID and domain constraints are real; production passkeys must be created on the correct final
  origin
- recovery has to be treated honestly, not hand-waved away
- passkey identity is part of the trust boundary for join, setup, and privileged execution

## Where It Fits

WebAuthN is not only an auth layer. In Coop it is part of the product's broader claim that users can
coordinate with stronger self-sovereignty and less wallet-first friction.
