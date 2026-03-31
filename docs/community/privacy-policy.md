---
title: Privacy Policy
slug: /privacy-policy
---

# Coop Privacy Policy

Date: March 30, 2026

This policy describes how the Coop browser extension and related Coop browser surfaces handle user
data.

## Summary

Coop is local-first. The extension stores and processes capture data on the device by default. Coop
does **not** run a hosted application API that stores your tab captures, screenshots, drafts, or
agent memory by default.

## What Coop Collects Locally

When you use the extension, Coop may store the following on your device:

- captured tab metadata such as titles, URLs, favicons, and timestamps
- automatically extracted page content including headings, paragraphs, meta descriptions, and social
  preview images from captured tabs
- review drafts you create or edit
- screenshots captured via the extension
- audio recordings and their local transcriptions (via on-device Whisper model)
- photos, files, and links received from paired companion devices
- local agent memory, observation records, and cross-session context that the in-browser AI agent
  builds over time based on your browsing patterns and captured content
- local coop configuration, device pairing state, and UI preferences
- local privacy material such as membership-proof identities and stealth key pairs

If you enable the optional passive capture feature (capture on tab close), Coop may also capture tab
metadata when you close browser tabs, without requiring an explicit capture action each time. This
feature is off by default and can be toggled in extension settings.

Sensitive browsing-derived payloads are stored in encrypted form in the extension's local database.
Privacy identities, stealth key material, and other sensitive local payloads are also stored in
encrypted form. Operational metadata needed for ordering, sync state, and UI rendering may remain
in plaintext.

## What Leaves The Device

By default, Coop keeps captured browsing content local until you explicitly choose to share or
publish it.

Data may leave the device in the following cases:

- when you publish a draft or artifact into shared coop state
- when you pair with a receiver device and explicitly sync data to it
- when you use signaling infrastructure needed for peer sync
- when you opt into local AI features that need to download open model weights into the browser
  cache

Coop's signaling runtime is transport infrastructure. It is not intended to be a durable store for
your capture history.

## Third-Party Services

Coop may contact third-party infrastructure in the following cases:

- **Signaling servers** (`api.coop.town`) that relay peer-sync traffic for WebRTC connection setup
- **Google STUN servers** (`stun.l.google.com`, `stun1.l.google.com`) used for WebRTC NAT
  traversal — these servers receive your IP address but no captured content
- **WebSocket document sync** (`api.coop.town/yws`) used as a fallback when direct peer connections
  are not available — shared coop state (published artifacts, member info) passes through this
  server with TLS encryption in transit
- **Browser platform services** such as passkeys / WebAuthn
- **Model hosts** that serve open model weights for local browser inference, including HuggingFace
  (`huggingface.co`) and MLC AI (`mlc.ai`) — model weights are downloaded once and cached locally

When optional modes are enabled:

- **Pimlico** (`api.pimlico.io`) — contacted for ERC-4337 bundler and paymaster services when
  onchain mode is set to `live`; receives transaction data
- **Storacha** (`storacha.link`) — contacted for IPFS/Filecoin uploads when archive mode is set to
  `live`; receives the content you choose to archive

The exact model-download endpoints used for a given release are also recorded in the Chrome Web
Store reviewer notes for that release.

## Encryption And Retention

- Sensitive local browsing payloads are encrypted at rest with a locally generated secret.
- Orphaned raw blobs and stale encrypted browsing payloads are pruned automatically after 30 days.
- You can clear encrypted local capture history from the extension UI.

## Permissions

The extension requests access to your browser tabs, active tab content, storage, notifications, and
a side panel. It also requests optional broad host permissions (`http://*/*`, `https://*/*`) that are
not granted by default — Chrome prompts you individually when the extension needs to read content
from a specific site for tab capture. You can review and revoke these permissions at any time in
Chrome's extension settings.

## Authentication And Identity

Coop uses passkey-first identity flows. Passkey material is handled through browser platform APIs.
If you enable additional live archive or onchain features, those modes may introduce extra local
credentials and external network calls consistent with the mode you selected.

## Your Choices

You can:

- keep using Coop locally without publishing captured material
- disable or avoid optional local AI features
- clear local capture history from the extension
- uninstall the extension and remove its local storage

## Contact

Questions about this policy can be directed through the Coop repository and project channels listed
at [GitHub](https://github.com/greenpill-dev-guild/coop).
