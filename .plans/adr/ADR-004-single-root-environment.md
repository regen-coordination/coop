# ADR-004: Single Root Environment Configuration

**Status**: Accepted
**Date**: 2026-04-02
**Decision makers**: Coop team

## Context

Coop is a Bun monorepo with four packages (`shared`, `app`, `extension`, `api`) that share configuration for chain targets, signaling URLs, archive modes, and feature flags. Environment variables are baked into frontend bundles at build time by Vite (requiring the `VITE_` prefix).

Early in development, the team encountered issues with scattered `.env` files: a package-level `.env` in the extension would shadow the root config, causing the app and extension to target different chains or signaling servers. Debugging these mismatches was time-consuming and error-prone.

## Decision

Maintain a single `.env.local` file at the repository root. Never create package-specific `.env` files.

### Key Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `VITE_COOP_CHAIN` | Target chain | `sepolia` |
| `VITE_COOP_ONCHAIN_MODE` | Onchain mode | `mock` |
| `VITE_COOP_ARCHIVE_MODE` | Archive mode | `mock` |
| `VITE_COOP_SESSION_MODE` | Session mode | `off` |
| `VITE_COOP_SIGNALING_URLS` | Signaling server URLs | `wss://api.coop.town` |
| `VITE_COOP_RECEIVER_APP_URL` | Receiver PWA URL | `http://127.0.0.1:3001` |

### Rules

- All env vars require the `VITE_` prefix for frontend access (`import.meta.env.VITE_*`)
- Env vars are baked at build time -- a rebuild is required after `.env.local` changes
- `bun dev` automatically sets `VITE_COOP_SIGNALING_URLS` and `VITE_COOP_RECEIVER_APP_URL` for the extension build, including both local and production signaling URLs for fallback
- Full variable reference lives in `docs/builder/environment.md` (30+ vars)

## Consequences

**Positive:**
- Single source of truth: all packages read from the same configuration
- No shadowing bugs: impossible for a package-level `.env` to silently override root config
- Simpler onboarding: new contributors copy one file, not four
- Consistent builds: the extension and app always target the same chain and signaling servers
- Easy mode switching: changing `mock` to `live` in one place affects all packages

**Negative:**
- The API server (Bun runtime, not Vite) must also read from root `.env.local`, which means its non-`VITE_` vars share the same file
- Cannot configure packages independently for testing (e.g., extension on `sepolia` while app targets `arbitrum`). This is intentional but limits some testing scenarios.
- The `.env.local` file grows as new features add variables; the full reference is 30+ vars

## Alternatives Considered

**Per-package `.env` files**: The standard monorepo approach where each package has its own `.env`. Rejected after debugging incidents where the extension and app targeted different chains due to a stale package-level override.

**Environment variable service (Vault, Doppler)**: Centralized secret management with runtime injection. Overkill for a team this size, and adds a runtime dependency that contradicts the local-first principle. Secrets that need protection (API keys for Pimlico, TURN servers) are better handled by the API server, not baked into frontend bundles.

**Build-time injection via CI only**: Variables injected during CI builds, with local development using hardcoded defaults. Rejected because it creates a gap between local and CI environments and makes it harder for contributors to test different configurations.
