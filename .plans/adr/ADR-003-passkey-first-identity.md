# ADR-003: Passkey-First Identity

**Status**: Accepted
**Date**: 2026-04-02
**Decision makers**: Coop team

## Context

Coop operates onchain (Safe multisig on Arbitrum) but targets a broad audience that includes people unfamiliar with cryptocurrency wallets. The traditional web3 onboarding flow -- install MetaMask, create a wallet, back up a seed phrase, approve connection prompts -- is a significant barrier to adoption and a poor user experience even for crypto-native users.

The team needed an identity system that provides cryptographic key material for onchain operations without requiring users to install or manage a separate wallet extension.

## Decision

Use WebAuthn passkeys as the primary identity mechanism. No wallet-extension-first UX.

- **Passkey creation**: Members create a passkey during onboarding via the browser's native WebAuthn API. The passkey is backed by the device's secure enclave (Touch ID, Windows Hello, or a hardware security key).
- **Deterministic addresses**: Onchain addresses are derived deterministically from passkey credentials, eliminating seed phrases and manual key management.
- **Smart account ownership**: The passkey serves as the owner/signer for the member's ERC-4337 smart account (see ADR-006), which in turn is a Safe signer.

### Identity Flow

1. Member taps "Create Passkey" in the extension
2. Browser prompts for biometric verification (Touch ID / Windows Hello / security key)
3. WebAuthn credential is created and stored by the platform authenticator
4. A deterministic address is derived from the credential's public key
5. This address is used to provision a smart account onchain

The `auth` module in `@coop/shared` handles identity creation, credential storage, and the mapping from passkey to onchain address.

## Consequences

**Positive:**
- Zero external dependencies: no MetaMask, Rabby, or any wallet extension required
- Familiar UX: biometric prompt is something users already understand from banking apps and device unlock
- Phishing-resistant: WebAuthn credentials are origin-bound and cannot be exfiltrated by phishing sites
- Seed-phrase-free: no 12-word backup to lose or mismanage
- Works across devices via platform passkey sync (iCloud Keychain, Google Password Manager)

**Negative:**
- Platform authenticator availability varies (older devices, some Linux setups lack biometric hardware)
- Passkey portability across ecosystems (Apple to Android) is improving but not seamless
- Advanced users who want to use their existing wallet must go through the passkey flow first
- Recovery depends on the platform authenticator's backup mechanism (iCloud, Google account) rather than a user-controlled seed phrase
- WebAuthn API surface differences across browsers require careful testing

## Alternatives Considered

**Wallet-extension-first (MetaMask/Rabby)**: The standard web3 approach. Rejected because it gates onboarding on installing and configuring a separate extension, which is a dealbreaker for non-crypto-native users. Also creates UX friction with connection prompts and transaction signing popups.

**Email/password with server-side key custody**: Simple onboarding but introduces a trusted custodian for keys, which contradicts the local-first and self-sovereign principles. Also creates a high-value attack target on the server.

**Social login (Google/Apple) with MPC key sharding**: Better UX than wallet extensions but adds dependency on third-party OAuth providers and MPC infrastructure. The trust model becomes opaque to users who cannot verify how their key shares are managed.

**Hardware wallet only (Ledger/Trezor)**: Maximum security but extremely high friction for onboarding. Impractical for a consumer-facing product.
