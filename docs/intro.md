---
title: "Introduction"
sidebar_label: "Introduction"
sidebar_position: 1
slug: /intro
---

# Coop

**Browser-first, local-first knowledge commons for communities to coordinate and form shared intelligence.**

Coop helps groups catch useful tabs, notes, and signals before they scatter — then review and share what matters together.

## What is Coop?

Coop is a browser extension and companion app that turns scattered browsing into shared group memory:

1. **Create a coop** — Set up a coordination space backed by a real Safe multisig
2. **Round up context** — The extension notices relevant tabs and captures them locally
3. **Review in the Roost** — Shape drafts collaboratively before publishing
4. **Share what matters** — Publish approved finds into the shared coop feed
5. **Sync between peers** — Live peer-to-peer sync via Yjs + y-webrtc
6. **Archive to Filecoin** — Permanent storage via Storacha/IPFS

## Key Principles

- **Browser-First** — The extension is the primary product surface
- **Local-First** — All data stays local until you explicitly share
- **Passkey-First** — No wallet extensions required; passkey-based identity
- **Offline Capable** — Works without internet, syncs when connected

## Packages

| Package | Description |
|---------|-------------|
| `@coop/shared` | Schemas, flows, sync contracts, and shared modules |
| `@coop/app` | Landing page + receiver PWA shell |
| `@coop/extension` | MV3 browser extension (popup, sidepanel, background) |

## Local Development

```bash
# Install dependencies
bun install

# Start app + extension concurrently
bun dev

# Run tests
bun run test

# Build everything
bun build
```

## Learn More

- [Install the Extension](/docs/getting-started/extension-install-and-distribution)
- [Architecture Overview](/docs/architecture/coop-os-architecture-vnext)
- [Product Requirements](/docs/product/prd)
- [EF Mandate](/docs/product/ethereum-foundation-mandate)
