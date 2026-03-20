---
title: Glossary
slug: /glossary
---

# Glossary

This page is shared across the Community and Builder navigation. The first section keeps the product
language plain. The second groups the more technical terms that show up in architecture and runtime
docs.

## Community Terms

### Coop

A shared space where a group captures, reviews, publishes, and remembers knowledge together.

### Loose Chickens

The working metaphor for browser tabs and other scattered context that has not been organized yet.

### Roost

The review queue where drafts are edited, evaluated, and prepared before publish.

### Coop Feed

The shared feed of published artifacts inside a coop.

### Launching The Coop

The product phrase for creating a new coop and running its setup ritual.

### Trusted Member

A member with elevated responsibility for more sensitive or bounded operations.

### Receiver

The companion app surface used for mobile or secondary-device capture such as audio, photos, files,
and links.

### Archive Receipt

A receipt that records the outcome of a durable archive action so the provenance trail remains
visible.

### Seed Contribution

The initial piece of context a creator or joining member adds so the coop starts with real material
rather than an empty shell.

## Builder Terms {#builder-terms}

### Action Bundle

A typed, policy-governed envelope for privileged actions, including digest, replay protection, and
approval state.

### Permit

Scoped off-chain authorization used for bounded delegated actions such as archive-related work.

### Session

A time-bounded capability for constrained onchain execution, usually paired with allowlists and
limits.

### Anchor Mode

The trusted-node or operator posture that allows the runtime to handle privileged jobs when policies
and roles allow it.

### Signaling Relay

The lightweight server that helps peers discover each other so WebRTC connections for sync can be
formed.

### Yjs

The CRDT layer used for shared coop state and peer replication.

### Dexie

The IndexedDB wrapper used for structured local persistence in the browser.

### WebLLM

The browser-side WebGPU inference layer used for higher-value local synthesis when the device can
support it.

### Safe

The smart-account structure Coop uses for group identity and bounded onchain execution.

### Storacha

The delegated upload layer Coop uses to push archive data toward Filecoin-backed durability.

### Filecoin

The durable archive substrate used for long-memory, provenance, and verifiable receipt chains.
