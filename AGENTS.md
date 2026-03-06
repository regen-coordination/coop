# Coop Agent Guide

Coop is a monorepo for a browser-first knowledge commons focused on local community coordination.

## Purpose

- Build a Chromium extension + PWA for low-friction knowledge capture.
- Run Anchor Node services for stronger AI inference and integrations.
- Provide shared skills for impact reporting, coordination, governance, and capital formation.

## Repository Layout

- `packages/extension`: Chromium extension (Manifest V3).
- `packages/pwa`: Mobile companion PWA.
- `packages/anchor`: Anchor node backend and skill runner.
- `packages/shared`: Shared types, protocol contracts, storage abstractions.
- `packages/contracts`: On-chain registry contracts and integration helpers.
- `packages/org-os`: Imported organizational OS schemas and scaffolding.
- `skills`: Coop-native skill definitions.
- `docs`: Architecture, onboarding, pitch material, and component development plans.

## Planning

- **[docs/coop-component-plans.md](docs/coop-component-plans.md)** — Seven individual development plans (extension, anchor, PWA, shared, contracts, org-os, skills) with gaps, implementation tasks, and key files.

## Working Conventions

- Keep MVP scope focused on core capture -> process -> share loops.
- Prefer local-first storage and explicit sync boundaries.
- Use markdown artifacts for all generated planning and demo assets.
