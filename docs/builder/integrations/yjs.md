---
title: Yjs
slug: /builder/integrations/yjs
---

# Yjs

Yjs is Coop's shared CRDT layer.

## Why It Is In The Stack

Coop needs peer-replicated shared state that can tolerate offline work and later convergence. Yjs is
the mechanism that makes feed, membership, and archive-receipt replication possible without a central
database owning the truth.

## Current Risk

The main risk called out in the reference docs is not "Yjs does not scale." It is that some current
writes serialize full arrays into a Yjs map value. That weakens merge semantics and creates silent
last-writer-wins behavior where the product wants finer-grained CRDT updates.

## What The Next Iteration Needs

- nested document structures by ID rather than JSON blobs
- clearer compaction and growth strategy
- tighter modeling of shared versus local-only state

That is why Yjs sits at the center of the current R&D and scaling work.
