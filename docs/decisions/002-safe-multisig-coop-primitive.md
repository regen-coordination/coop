# ADR-002: Safe Multisig as Coop Primitive

## Status

Accepted

## Date

2026-03-06 (Safe + ERC-4337 integration present in initial monorepo scaffold)

## Context

Each coop is a group of members who collectively manage shared artifacts, treasury, and governance decisions. The onchain identity for a coop needs to:

- Represent group ownership (not a single EOA)
- Support passkey-based signing (no wallet extension required)
- Enable ERC-4337 account abstraction for gasless or sponsored transactions
- Work across Sepolia (dev/test) and Arbitrum One (production)
- Allow modular extension for session keys, scoped permissions, and policy enforcement

## Decision

Use Safe v1.4.1 smart accounts as the onchain identity for each coop, integrated through:

- `permissionless` library for Safe smart account creation via `toSafeSmartAccount()`
- Pimlico bundler for ERC-4337 user operation submission
- Safe7579 module adapter for ERC-7579 modular account compatibility
- Passkey (WebAuthn) accounts as Safe owners via `viem/account-abstraction`
- Deterministic salt nonce derived from coop seed (`toDeterministicBigInt(coopSeed)`)
- Dual-mode operation: `mock` (deterministic fake addresses) and `live` (real Pimlico deployment), controlled by `VITE_COOP_ONCHAIN_MODE`

Chain configuration supports `sepolia` and `arbitrum` with per-chain bundler endpoints.

## Alternatives Considered

- **Custom multisig contract**: Full control over governance logic but loses the security audit history and ecosystem tooling of Safe.
- **DAO frameworks (Moloch, Governor)**: Designed for on-chain governance with proposals and voting, but too heavyweight for a capture-and-publish product loop. Coop governance is primarily local.
- **EOA-based**: Simple but cannot represent group ownership or support passkey signing without a smart account layer.
- **Kernel accounts (standalone)**: Considered for member accounts (and used there), but Safe's multisig model maps more naturally to the coop-as-a-group primitive.

## Consequences

### Positive

- Battle-tested security: Safe is the most widely deployed smart account infrastructure
- ERC-4337 compatibility enables sponsored transactions and passkey-based signing
- ERC-7579 module system allows session keys, smart sessions, and scoped permissions
- Deterministic address derivation from coop seed enables offline address calculation
- Mock mode allows full development and testing without blockchain interaction

### Negative

- Adds onchain deployment cost for each new coop in live mode
- Dependency on Pimlico bundler for user operation relay
- Safe7579 adapter adds complexity compared to native Safe or standalone ERC-4337 accounts
- Requires trusted attester configuration for Safe ERC-7579 launchpad deploys

### Neutral

- Two-chain support (Sepolia + Arbitrum) requires maintaining parallel chain configurations
- Mock/live mode split means onchain features must be tested in both modes
