---
title: Dexie
slug: /builder/integrations/dexie
---

# Dexie

Dexie is the structured local persistence layer for Coop's browser state.

## What It Stores

Dexie is used for the kinds of state that need shape, indexes, and local durability:

- review drafts
- tab candidates and page extracts
- receiver captures and blobs
- agent observations and logs
- privacy, permit, and capability records

## Why It Matters

Dexie is the reason Coop can keep meaningful work local by default. Before anything reaches shared
state, it usually spends time in Dexie-backed local tables.

## Builder Implications

- schema changes need migration discipline
- large local assets such as receiver blobs need quota awareness
- logs and drafts are product features, not disposable debug leftovers

Dexie is not only an implementation detail. It is part of the privacy and offline story.
