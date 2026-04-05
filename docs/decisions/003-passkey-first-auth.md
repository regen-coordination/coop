# ADR-003: Passkey-First Authentication

## Status

Accepted

## Date

2026-03-06 (passkey auth module present in initial monorepo scaffold)

## Context

Coop targets communities that include non-crypto-native members. The authentication model must:

- Work without requiring users to install a wallet browser extension
- Avoid seed phrases or private key management by end users
- Bridge to onchain operations (Safe ownership, transaction signing)
- Support the browser extension and PWA receiver contexts
- Derive deterministic addresses from identity for offline use

## Decision

Use WebAuthn passkeys as the primary authentication mechanism:

- `createWebAuthnCredential()` via `viem/account-abstraction` for passkey registration
- `toWebAuthnAccount()` for restoring passkey accounts for signing
- Passkey RP ID resolved from `location.hostname` or `chrome.runtime.id` depending on context
- Deterministic address derivation: `toDeterministicAddress('passkey:{id}:{publicKey}')` using keccak256
- Auth sessions stored locally with Zod-validated `AuthSession` schema
- Passkey accounts serve as Safe owners for onchain operations (coop multisig)
- Local identity records bridge auth sessions to member profiles via `authSessionToLocalIdentity()`

## Alternatives Considered

- **Wallet-first (MetaMask, etc.)**: Familiar to crypto users but creates a hard dependency on browser extension installation. Excludes non-crypto users and creates UX friction for the primary capture workflow.
- **Email/password + custodial keys**: Simple onboarding but introduces a custodial trust model that contradicts local-first principles. Server becomes a single point of compromise.
- **Social login (OAuth + MPC)**: Good UX but depends on third-party identity providers and adds backend infrastructure. Key sharding adds complexity.
- **Magic links / OTP**: No persistent identity without a server. Cannot derive onchain keys.

## Consequences

### Positive

- No wallet extension required — works on any device with platform authenticator support
- No seed phrases or private keys exposed to users
- Passkey credentials are phishing-resistant (bound to RP ID)
- Deterministic address derivation enables offline member identity resolution
- Direct integration with Safe as passkey-based owner

### Negative

- Passkey recovery is platform-dependent (iCloud Keychain, Google Password Manager, etc.)
- Cross-device passkey portability varies by platform and is still maturing
- Extension context (`chrome.runtime.id`) and web context (`location.hostname`) use different RP IDs, requiring careful credential scoping
- WebAuthn API requires secure context (HTTPS or localhost)

### Neutral

- Auth sessions are local-only until explicitly synced through coop membership flows
- Mock mode bypasses real WebAuthn for testing via `setWebAuthnCredentialGetFnOverride()`
