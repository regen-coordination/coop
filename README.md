# Coop

![Coop No more Chickens running loose](https://media.discordapp.net/attachments/1334366927094677575/1483276398956118127/signal-2026-03-11-173838.png?ex=69ba004b&is=69b8aecb&hm=f30d70ad2b2baa3c187601210d55b7a80b89a1e5b4cd9406b45f2f6105535d73&=&format=webp&quality=lossless&width=2240&height=298)

**A browser extension and companion PWA that captures scattered knowledge, refines it into clear opportunities, and gives groups a shared space to act on what matters.**

You have tabs open, voice memos unsaved, photos from a whiteboard session, links shared in a chat. Some of it is a funding lead. Some is a dead end. You won't remember which by Friday. Now multiply that across your whole team.

Coop captures knowledge from wherever it lives -- browser tabs, audio recordings, photos, files, shared links -- refines it into clear opportunities, and gives groups a shared space to act on what matters. Core capture, review, and local analysis stay in the browser. The repo also includes a minimal signaling/API layer for peer discovery and optional Yjs document sync. Raw captures stay on-device until a person chooses to publish or sync.

## How It Works

1. **Capture** -- Round up browser tabs with a shortcut. Record audio, snap photos, attach files, or share links from your phone via the companion PWA.
2. **Refine** -- An in-browser AI agent analyzes captures through a 16-skill pipeline, extracting opportunities, scoring grant fit, clustering themes, and drafting briefs. All inference runs locally via WebGPU/WASM. Nothing leaves the browser.
3. **Review** -- Members review candidates and drafts in the popup and Chickens before anything becomes shared.
4. **Share** -- Publish to a coop -- a shared space backed by a Safe multisig on Arbitrum, syncing through Coop's local-first Yjs layer with direct y-webrtc peers and hosted y-websocket document sync. Archive actions can attach Filecoin-backed receipts via Storacha with full cryptographic provenance. Passkey identity, no wallet required.

In the current extension, the `Popup` handles quick capture and quick review, `Chickens` handles working candidates and drafts, `Coops` handles shared state plus archive and proof, `Roost` handles Green Goods member access and work submission, and `Nest` handles members, operator controls, and settings.

Through its Green Goods integration, coops can also bootstrap on-chain gardens, submit member work, run operator-side approvals and assessments, and package approved work into Hypercert and Karma GAP workflows.

## Use Cases

- **Community coordination groups** -- Bioregional networks, regen communities, and DAO contributor circles can pool knowledge across members and surface funding-ready opportunities without centralizing data on a single platform.
- **Research teams tracking funding leads** -- Grant writers and research coordinators can capture evidence across dozens of sources, let the agent cluster and score it, and produce structured dossiers ready for submission.
- **Capital formation groups** -- Assembling funding packages from scattered evidence, attestations, and contributor work logs into coherent on-chain proposals backed by verifiable provenance.
- **Families and friends** -- Create shared memory capsules: trip planning boards, genealogy collections, community garden documentation, or any group project where everyone contributes pieces.
- **Personal knowledge management** -- Use Coop solo as a local-first capture and archiving tool with durable Filecoin storage, zero-knowledge privacy, and no vendor lock-in.

## Key Features

### Capture
Browser tabs (extension), audio recordings, photos, files, and links (companion PWA). Cross-device receiver lets you capture on your phone and review on desktop.

### AI Agent
16-skill pipeline running a three-tier inference cascade (WebGPU, WASM, heuristics). Opportunity extraction, grant fit scoring, theme clustering, brief drafting, and cross-session memory persistence. No API keys, no hosted inference dependency.

### Sharing
Local-first sync via Yjs CRDTs, y-webrtc, and y-websocket, plus blob relay for larger asset movement. Offline outbox queues publishes when disconnected and flushes on reconnect. Multi-coop publishing with per-coop feeds and board visualization.

### Identity
Passkey-first authentication via WebAuthn, bridged to Safe smart accounts through ERC-4337 account abstraction. No wallet extension required.

### Privacy
Semaphore zero-knowledge membership proofs for anonymous publishing. ERC-5564 stealth addresses for private on-chain interactions. All captures stay local-only until explicit share.

### Archiving
Storacha/Filecoin archive flows with verifiable receipt chains. Every archived artifact carries CID-linked provenance from capture through human review to archive receipt. Archive restore and data portability (import/export) support recovery and migration.

### Governance
Operator console for anchor node management. Policy engine with typed action bundles and approval workflows. Session permits with scoped execution permissions, time-bounded capabilities, and replay protection.

### Green Goods
Garden bootstrap and sync, member work submission, operator approvals and assessments, GAP admin reconciliation, and Hypercert or Karma GAP packaging. On-chain gardens are a bounded coordination substrate rather than an open-ended treasury surface.

### On-chain Agent
ERC-8004 agent registry integration for on-chain agent identity, capability advertisement, and reputation feedback.

## Architecture

Bun monorepo with four runtime packages:

| Package | Description |
|---------|-------------|
| `@coop/shared` | Schemas, flows, sync contracts, and shared modules: agent, app, archive, auth, blob, coop, erc8004, fvm, greengoods, member-account, onchain, operator, permit, policy, privacy, receiver, session, stealth, storage, transcribe |
| `@coop/app` | Landing page + receiver PWA shell (audio, photo, file, link capture) |
| `@coop/extension` | MV3 browser extension — popup (screen router, share menu), sidepanel (tab router, coop selector, filter popover), background handlers, offscreen workers |
| `@coop/api` | Hono + Bun TypeScript signaling relay with optional Yjs document sync persistence, deployed on Fly.io |

Build order: shared -> app -> extension (shared is the dependency root).

## Key Principles

- **Browser-First** -- The extension is the primary product surface; core capture and local analysis do not depend on hosted inference.
- **Local-First** -- All data stays on your device until you explicitly share. Dexie for structured data, Yjs for CRDT sync.
- **Passkey-First** -- No wallet extensions required. WebAuthn passkey identity bridged to on-chain Safe accounts.
- **Offline Capable** -- Works without internet, syncs when connected.
- **Privacy by Design** -- Zero-knowledge membership proofs, stealth addresses, local-only captures by default.

## Standards

ERC-4337 (account abstraction), ERC-1271 (signature validation), EIP-712 (typed structured data), ERC-7579 (modular smart accounts), ERC-5564 (stealth addresses), ERC-8004 (on-chain agent registry), Semaphore (ZK group membership), Storacha/Filecoin (permanent archiving), Yjs CRDTs (conflict-free sync).

## Local Development

Coop pins Node 22 in `.mise.toml`. Bun is the workspace package manager, but the docs site still
depends on a working Node toolchain.

Recommended shell bootstrap:

```bash
mise install
eval "$(mise activate zsh)"
node -v
```

`node -v` should report `v22.x` before you run the docs commands. If your shell still resolves an
older Node first, fix that before running `bun run docs:dev` or `bun run docs:build`.

```bash
bun install              # Install dependencies
bun dev                  # Start app + extension concurrently
bun dev:app              # Start app only
bun dev:extension        # Start extension only (WXT dev + Chromium)
bun dev:api              # Start API server
bun run test             # Run unit tests (vitest)
bun run test:e2e         # Run Playwright E2E tests
bun run test:visual      # Run visual regression tests
bun build                # Build everything (shared -> app -> extension)
bun format && bun lint   # Format (Biome) and lint workspace
bun run validate smoke   # Fast confidence pass
bun run validate:store-readiness
bun run validate:production-readiness
bun run validate:production-live-readiness
bun run validate list    # List all available validation suites
```

> **Note:** Always use `bun run test` (not `bun test`). The former runs vitest with proper environment configuration; the latter uses Bun's built-in runner and ignores vitest config.

## Environment

Single `.env.local` at the repository root (never create package-specific `.env` files).

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_COOP_CHAIN` | Target chain: `sepolia` or `arbitrum` | `sepolia` |
| `VITE_COOP_ONCHAIN_MODE` | On-chain mode: `mock` or `live` | `mock` |
| `VITE_COOP_ARCHIVE_MODE` | Archive mode: `mock` or `live` | `mock` |
| `VITE_COOP_SESSION_MODE` | Session mode: `off`, `mock`, or `live` | `off` |
| `VITE_COOP_SIGNALING_URLS` | Comma-separated WebSocket signaling endpoints | `wss://api.coop.town` |
| `VITE_COOP_RECEIVER_APP_URL` | Receiver PWA base URL | `http://127.0.0.1:3001` |
| `VITE_PIMLICO_API_KEY` | For live Safe/ERC-4337 operations | -- |

For Playwright E2E runs, the repo starts its own local signaling server automatically.

## Release Posture

Coop's current release posture is mock-first.

- Automated mock-first release bar: `bun run test`, `bun run test:coverage`, `bun build`, `bun run validate:store-readiness`, and `bun run validate:production-readiness`
- Remaining public-release blocker: manual Chrome popup QA for real-click `Capture Tab` and `Screenshot`
- Live Safe, archive, and session-key rails remain a second gate behind `bun run validate:production-live-readiness`

For public Chrome Web Store candidates, keep `VITE_COOP_ONCHAIN_MODE`, `VITE_COOP_ARCHIVE_MODE`, and `VITE_COOP_SESSION_MODE` on the mock-first path unless the live-rails gate is intentionally being exercised.

Canonical references:

- [Current Release Status](docs/reference/current-release-status.md)
- [Testing & Validation](docs/reference/testing-and-validation.md)
- [Demo & Deploy Runbook](docs/reference/demo-and-deploy-runbook.md)
- [Live Rails Operator Runbook](docs/reference/live-rails-operator-runbook.md)

## Documentation

Current-state docs:

- [Builder Getting Started](docs/builder/getting-started.md)
- [Architecture](docs/builder/architecture.md)
- [Extension](docs/builder/extension.md)
- [App](docs/builder/app.md)
- [Environment Reference](docs/builder/environment.md)
- [Action Domain Map](docs/reference/action-domain-map.md)
- [Current Release Status](docs/reference/current-release-status.md)
- [Testing & Validation](docs/reference/testing-and-validation.md)
- [Demo & Deploy Runbook](docs/reference/demo-and-deploy-runbook.md)
- [Receiver Pairing & Intake](docs/reference/receiver-pairing-and-intake.md)
- [Live Rails Operator Runbook](docs/reference/live-rails-operator-runbook.md)
- [Extension Install & Distribution](docs/reference/extension-install-and-distribution.md)
- [Chrome Web Store Checklist](docs/reference/chrome-web-store-checklist.md)
- [Chrome Web Store Reviewer Notes](docs/reference/chrome-web-store-reviewer-notes.md)
- [Agent Harness](docs/reference/agent-harness.md)
- [Agent Registry & API Server](docs/reference/erc8004-and-api.md)

Historical or deep reference:

- [Original Introduction](docs/reference/original-introduction.md)
- [Product Requirements](docs/reference/product-requirements.md)
- [Coop OS Architecture vNext](docs/reference/coop-os-architecture-vnext.md)
- [Knowledge Sharing & Scaling](docs/reference/knowledge-sharing-and-scaling.md)
- [Green Goods Integration](docs/reference/green-goods-integration-spec.md)
- [Privacy & Stealth Addresses](docs/reference/privacy-and-stealth.md)
- [Policy, Sessions & Permits](docs/reference/policy-session-permit.md)
- [Scoped Roadmap](docs/reference/scoped-roadmap-2026-03-11.md)
- [EF Mandate Alignment](docs/reference/ethereum-foundation-mandate.md)
- [Design Direction](docs/reference/coop-design-direction.md)
- [Audio & Asset Ops](docs/reference/coop-audio-and-asset-ops.md)

## Regen Coordination Foundation

Coop is the browser-native coordination membrane built on ideas forming across the wider regen-coordination work:

- Local-first collaboration over server-centric products
- Explicit shared memory instead of fragmented chat history
- Durable long-memory archives that communities can keep, fork, and migrate
- Impact, governance, and capital formation as connected workflows
- Green Goods as the on-chain substrate for gardens, attestations, and collective capital flows

The goal is to make it easier for communities to move from context to coordination, from coordination to evidence, and from evidence to capital. Each coop becomes a living knowledge garden with a shared local-first memory membrane, anchor nodes running stronger inference, long-memory publishing into Filecoin, Green Goods garden bindings, and smart-account-mediated execution for proposals, attestations, and treasury flows.

## Brand

Coop uses chicken metaphors throughout. Open browser tabs are **Loose Chickens**. The human review
step is still called the **Roost** in the product story, even though the current sidepanel `Roost`
tab is the Green Goods member workspace. The shared feed is the **Coop Feed**. Creating a new
shared space is **Launching the Coop**. The success chime is the **Rooster Call**.

![Coop Logo](https://media.discordapp.net/attachments/1334366927094677575/1483276397873987786/signal-2026-03-11-143552.png?ex=69ba004b&is=69b8aecb&hm=e2bcc8442bb7287a93a879c5e7e7336f028564053b6cfaa58ffc135383ae0d5e&=&format=webp&quality=lossless&width=1080&height=1080)
