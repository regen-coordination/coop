---
title: Coop Extension
slug: /builder/extension
---

# Coop Extension

The extension is the primary Coop runtime. It is where most creation, review, publish, and operator
actions happen.

## Main Surfaces

The MV3 package is split across three user-facing or runtime-facing surfaces:

- **Sidepanel** for the main coop workspace
- **Popup** for quick status and actions
- **Offscreen document** for background sync and agent work that needs a long-lived browser context

The background service worker coordinates message routing, storage access, and privileged handlers.

## What The Extension Owns

The extension is the home for:

- tab round-up capture
- the Roost review queue
- coop creation and join flows
- feed and board publishing actions
- sync bindings and signaling configuration
- operator, policy, permit, and session controls

## Capture Model

Capture can be manual or scheduled. The intended posture is that automatic capture creates candidates
and drafts, but does not auto-publish them.

This keeps the product aligned with its explicit-publish privacy model.

## State And Feedback

The extension also owns the user-facing state cues:

- icon states such as idle, watching, and review-needed
- sound and feedback moments such as the Rooster Call
- runtime status surfaces for sync, archive, onchain mode, and session mode

## Install And Distribution Posture

The reference install doc describes three practical paths:

- local developer install from `packages/extension/dist`
- trusted early-access distribution outside the Chrome Web Store
- Chrome Web Store rollout once the extension is ready for broader release

The extension asks for broad capabilities, so review notes and privacy explanations need to stay
unusually clear.

## Builder Advice

- test the sidepanel and the offscreen/runtime path together when changing sync or agent behavior
- keep the extension as the primary product surface unless a task explicitly moves responsibilities
- avoid pushing shared-domain logic into background-only helpers when it belongs in `@coop/shared`
