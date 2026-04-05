# ADR-005: Barrel Imports for Module Boundaries

**Status**: Accepted
**Date**: 2026-04-02
**Decision makers**: Coop team

## Context

The `@coop/shared` package contains 20+ domain modules (auth, coop, storage, onchain, agent, etc.) each with their own internal structure of files, types, and utilities. Without a clear import boundary, consumers (extension, app) would import directly from deep source paths like `@coop/shared/src/modules/auth/identity.ts`, creating tight coupling to internal file organization.

This coupling makes refactoring dangerous: renaming or restructuring a module's internals would break imports across the extension and app packages. It also makes it unclear which APIs are public contracts versus internal implementation details.

## Decision

Consumers import from two barrel surfaces only:

1. **`@coop/shared`** -- The primary surface for the extension and most consumers. Exports all public domain APIs.
2. **`@coop/shared/app`** -- A narrower surface for the app shell (landing page + receiver PWA). Exports only what the app package needs.

Never import from deep source paths.

```typescript
// Correct
import { createCoop, joinCoop } from '@coop/shared';
import { useReceiverSync } from '@coop/shared/app';

// Wrong -- deep path coupling
import { createCoop } from '@coop/shared/src/modules/coop/coop';
import { identity } from '@coop/shared/src/modules/auth/identity';
```

### Responsibilities

- **Module authors** (shared package): Export public APIs from the barrel. Internal helpers, types, and utilities stay unexported.
- **Module consumers** (extension, app): Import only from barrel surfaces. If something is not exported, it is not public.
- **New public APIs**: When adding a new public function or type, update the barrel exports. This is an explicit step that forces consideration of what should be public.

## Consequences

**Positive:**
- Clear public API surface: what is exported from the barrel is the contract; everything else is internal
- Safe refactoring: internal module restructuring does not break consumers as long as barrel exports are stable
- Discoverability: consumers can see all available APIs by inspecting the barrel file
- Enforced encapsulation: internal utilities cannot be accidentally used by extension or app code
- Tree-shaking friendly: Vite can eliminate unused exports from the barrel during builds

**Negative:**
- Barrel files must be maintained: adding a new public API requires updating the barrel, which is easy to forget
- Barrel re-exports can obscure where code actually lives, making "go to definition" jump to the barrel rather than the source (mitigated by TypeScript's "go to source definition")
- Large barrel files can slow TypeScript's type checking if not managed carefully
- Two barrel surfaces (`@coop/shared` and `@coop/shared/app`) require judgment about which surface an API belongs on

## Alternatives Considered

**No barrel, direct imports**: Let consumers import from any path. Simple and explicit about file locations but creates tight coupling to internal structure. A single file rename could break dozens of imports across packages.

**Per-module barrels** (e.g., `@coop/shared/auth`, `@coop/shared/coop`): Finer-grained surfaces per domain module. Considered but adds too many entry points to maintain and makes it less clear which surface a consumer should use. The two-surface model (full vs. app) is simpler.

**Package-per-module**: Split each domain module into its own npm package (`@coop/auth`, `@coop/coop`, etc.). Maximum encapsulation but adds significant overhead: separate package.json files, build steps, version management, and workspace configuration for 20+ packages. The barrel approach achieves most of the encapsulation benefit without the operational cost.
