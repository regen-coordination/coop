# ADR-006: Safe + ERC-4337 Onchain Integration

**Status**: Accepted
**Date**: 2026-04-02
**Decision makers**: Coop team

## Context

Coop needs onchain infrastructure for three purposes:

1. **Group ownership**: A coop is a group that collectively owns shared resources (published artifacts, archives, proofs). This requires a multi-party account that can hold assets and execute transactions with member approval.
2. **Gasless UX**: Members should not need to hold ETH to interact with the coop. The onboarding flow must not include "buy ETH and fund your wallet."
3. **Passkey signing**: Per ADR-003, members authenticate with WebAuthn passkeys, not wallet extensions. The onchain layer must accept passkey-derived signatures.

## Decision

Use Safe multisig accounts for group ownership, ERC-4337 (account abstraction) for gasless transactions, and passkey-derived credentials as Safe signers.

### Architecture

- **Safe**: Each coop is backed by a Safe smart account on Arbitrum (production) or Sepolia (dev/test). The Safe holds group assets and enforces multi-sig approval policies.
- **ERC-4337**: Member operations are submitted as UserOperations to a bundler, which pays gas on behalf of the user via a paymaster. Members never need to hold ETH.
- **Passkey signers**: Each member's passkey credential generates a deterministic address that is added as a Safe owner. The `member-account` module provisions an ERC-4337 smart account per member.
- **Session keys**: The `session` module provides time-bounded, scoped execution permissions so that routine operations (sync, minor updates) do not require repeated biometric prompts.

### Configuration

| Variable | Values | Default |
|----------|--------|---------|
| `VITE_COOP_CHAIN` | `sepolia`, `arbitrum` | `sepolia` |
| `VITE_COOP_ONCHAIN_MODE` | `mock`, `live` | `mock` |

- **Mock mode** (default): All onchain operations are simulated locally. No real transactions, no gas costs. Used for development and testing.
- **Live mode**: Real transactions on the configured chain. Requires Pimlico bundler/paymaster API keys.

### Module Responsibilities

- `onchain`: Safe creation, ERC-4337 UserOperation construction, contract interactions, provider factory, signature utilities
- `member-account`: Smart account provisioning and execution per member
- `session`: Scoped execution permits with time bounds and replay protection
- `policy`: Action approval workflows and typed action bundles
- `auth`: Passkey-to-address derivation and credential management

## Consequences

**Positive:**
- Group ownership with battle-tested multisig (Safe has secured billions in assets)
- Gasless UX via paymaster: members interact without holding ETH
- Passkey signing eliminates wallet extension dependency
- Mock mode enables full development and testing without real transactions
- Session keys reduce biometric prompt fatigue for routine operations
- Arbitrum L2 provides low transaction costs for production

**Negative:**
- Complex stack: Safe SDK + permissionless (ERC-4337) + WebAuthn creates a deep dependency tree
- Bundler/paymaster dependency in live mode (Pimlico) introduces a third-party runtime dependency
- Safe contract deployment costs per coop (mitigated by L2 fees)
- Mock/live mode divergence can mask bugs that only appear with real contracts
- Session key security requires careful scope bounding to prevent privilege escalation

## Alternatives Considered

**Plain EOA wallets**: Each member uses a regular Ethereum account. Simplest onchain model but no group ownership, no gasless UX, and requires wallet extensions (contradicts ADR-003).

**Gnosis Safe without ERC-4337**: Safe for group ownership but members must hold ETH to submit transactions. Acceptable for crypto-native users but a dealbreaker for the target audience.

**Custom multisig contract**: Purpose-built for Coop's needs. Rejected because Safe's audited, battle-tested contracts provide stronger security guarantees than a custom implementation. The ecosystem tooling (Safe SDK, transaction service) also reduces development effort.

**Solana or other L1**: Lower fees and faster finality than Ethereum L1, but Arbitrum provides the EVM compatibility needed for Safe contracts and the ERC-4337 ecosystem. The L2 fee profile is comparable to alternative L1s.

**MPC (multi-party computation) wallets**: Distribute key shares across parties for group signing. More complex key management, less transparent than Safe's on-chain multisig, and lacks the mature tooling ecosystem.
