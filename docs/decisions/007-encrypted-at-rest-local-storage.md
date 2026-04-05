# ADR-007: Encrypted-at-Rest Local Storage

## Status

Accepted

## Date

2026-03-12 (encryption layer added to storage module)

## Context

Coop stores sensitive data locally in IndexedDB via Dexie: passkey metadata, session keys, privacy identities (Semaphore), stealth key pairs, and content payloads (tab candidates, page extracts, review drafts). While browsers sandbox IndexedDB per origin, the data is not encrypted by default — browser extensions, DevTools, or filesystem access to the profile directory can read it in plaintext.

Given Coop's local-first principle (ADR-005), where data stays on-device until explicit publish, protecting the local store is essential to the privacy guarantee.

## Decision

Encrypt sensitive records at rest using the Web Crypto API, implemented in `packages/shared/src/modules/storage/db-encryption.ts`:

- **Key derivation**: PBKDF2 with a user-provided secret and per-record salt, producing AES-256-GCM keys via `crypto.subtle.deriveKey()`
- **Encryption**: AES-GCM with random IV per record via `crypto.subtle.encrypt()`
- **Storage**: Encrypted payloads stored in a dedicated `encryptedLocalPayloads` Dexie table alongside redacted metadata records in their original tables
- **Decryption**: On-demand when the record is accessed, falling back to the redacted record if decryption fails (e.g., secret rotation)

Encrypted entity types include: tab candidates, page extracts, review drafts, privacy identities, stealth key pairs, and FVM records. Each CRUD function in `db-crud-content.ts`, `db-crud-privacy.ts`, and `db-crud-fvm.ts` writes both the redacted record and the encrypted payload within a single Dexie transaction.

## Alternatives Considered

- **No encryption (trust browser sandbox)**: Simplest approach, but leaves data exposed to any process with filesystem access to the browser profile. Insufficient for privacy-sensitive content.
- **Full-disk encryption only**: Relies on OS-level protection. Not all users enable it, and it doesn't protect against other extensions or browser-level access.
- **Server-side storage**: Move sensitive data off-device entirely. Contradicts the local-first principle and creates a server dependency.
- **Web Crypto with passkey-derived keys directly**: Use the passkey assertion response as key material. WebAuthn assertions are not deterministic across ceremonies, making stable key derivation unreliable.

## Consequences

### Positive

- Sensitive data is protected even if IndexedDB is accessed directly via filesystem or DevTools
- Redacted fallback records allow the UI to show metadata (existence, timestamps) without exposing content
- Standard Web Crypto primitives — no custom cryptography or external dependencies
- Transactional writes ensure encrypted payload and redacted record stay in sync

### Negative

- Key management complexity: the encryption secret must be available at read time, and secret rotation requires re-encryption of all records
- Performance overhead for encrypt/decrypt on every sensitive read/write, though AES-GCM is hardware-accelerated in modern browsers
- If the user loses their encryption secret, encrypted payloads become permanently inaccessible (by design, but a UX risk)

### Neutral

- The `encryptedLocalPayloads` table is a flat key-value store; the encryption layer is transparent to the rest of the storage module
- Maintenance functions in `db-maintenance.ts` handle cleanup of orphaned encrypted payloads
