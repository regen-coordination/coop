---
title: "Extension Install & Distribution"
slug: /reference/extension-install-and-distribution
---

# Coop Extension Install And Distribution

Date: March 28, 2026

This document covers extension-specific install and rollout. The full local demo, peer pairing, and
production deployment flow lives in [Demo & Deploy Runbook](/reference/demo-and-deploy-runbook).
The current public-release boundary lives in
[Current Release Status](/reference/current-release-status).

## Local Developer Install

Use the repo-root `.env.local`. Do not create package-specific env files.

Recommended local defaults:

```bash
VITE_COOP_CHAIN=sepolia
VITE_COOP_ONCHAIN_MODE=mock
VITE_COOP_ARCHIVE_MODE=mock
VITE_COOP_SESSION_MODE=off
VITE_COOP_RECEIVER_APP_URL=http://127.0.0.1:3001
VITE_COOP_SIGNALING_URLS=ws://127.0.0.1:4444
```

Build and load:

```bash
bun install
bun run dev:extension
```

For local live Sepolia rehearsals without editing `.env.local`:

```bash
bun run dev:app
bun run dev:api
bun run dev:extension:local-live-sepolia
```

That profile enables live onchain/archive/session rails while keeping the receiver and signaling
origins local to your machine.

Optional supporting processes:

```bash
bun run dev:app
bun run dev:api
```

Then in Chrome:

1. Open `chrome://extensions`.
2. Turn on `Developer mode`.
3. Click `Load unpacked`.
4. Select `packages/extension/.output/chrome-mv3`.
5. Reload the extension after each rebuild.

## Local Extension + Production PWA

This is the preferred peer-demo mode when the extension is under active development.

Set:

```bash
VITE_COOP_RECEIVER_APP_URL=https://coop.town
VITE_COOP_SIGNALING_URLS=wss://api.coop.town
```

Then rebuild the extension and reload it in Chrome. The receiver bridge content script is patched at
build time so the extension can inject on the configured production PWA origin.

The canonical receiver protocol, route ownership, and member-private intake flow now live in
[Receiver Pairing & Intake](/reference/receiver-pairing-and-intake).

## Early Access Distribution

For trusted testers outside the Chrome Web Store:

1. Build the extension.
2. Zip the contents of `packages/extension/.output/chrome-mv3`.
3. Share the archive plus manual install instructions.

Commands:

```bash
cd packages/extension
bun run build
cd .output/chrome-mv3
zip -r ../coop-extension.zip .
```

Early-access users still need to:

1. download the archive
2. unzip it locally
3. open `chrome://extensions`
4. turn on `Developer mode`
5. click `Load unpacked`
6. choose the extracted folder

## Chrome Web Store Rollout

Use this order:

1. `Unlisted`
2. `Public`

Release checklist:

1. Set `VITE_COOP_RECEIVER_APP_URL` to the exact production HTTPS receiver origin for the release candidate.
2. Preferred one-command public extension release: `bun run release:extension:public-release`
3. If you want the manual split instead, use `bun run validate:public-release`, `bun run validate:store-readiness`, and `bun run package:extension:public-release`.
4. If the build enables live Safe, session-key, or archive rails, use `bun run package:extension:operator-live` and `bun run validate:operator-live`.
5. Built archives land in `packages/extension/dist/archives/`.
6. Raw unpacked extension output lands in `packages/extension/dist/chrome-mv3`.
7. Record the first-run local-AI network trace for reviewer notes.
8. Upload the generated archive to the Chrome Web Store dashboard, or share it directly with trusted testers for manual unpacked install.
9. Add reviewer notes for sidepanel entry, passkey setup, receiver pairing and private intake,
   mock vs live modes, Smart Session limits for Green Goods actions, opt-in scheduled capture, and
   local-first data handling.

`VITE_COOP_RECEIVER_APP_URL` is not just a runtime convenience. `store-readiness` validates that it
produces the exact `host_permissions` and receiver-bridge content-script matches for the packaged
extension, so keep it on the final production HTTPS origin for release builds.

Profile overlays live at:

- `config/env/profiles/local-live-sepolia.env`
- `config/env/profiles/public-release.env`
- `config/env/profiles/operator-live.env`

Release note for manual verification:

- Automation now covers popup roundup, popup manual-gate errors, file review/save, audio retry,
  publish/archive handoff, receiver sync, and mock-path sidepanel member-account plus garden-pass
  flows.
- Successful popup `Capture Tab` and `Screenshot` saves still need a real-click manual check in
  Chrome because the popup `activeTab` grant is not reproducible under Playwright.
- Remote knowledge-skill import remains quarantined from the shipped build and should stay that way
  unless the dedicated re-enable checklist is completed.

Do not ship `VITE_COOP_FVM_OPERATOR_KEY` in a public Chrome Web Store build. The current Filecoin
registry registration path is suitable only for operator-controlled builds because `VITE_` env vars
are baked into the extension bundle.

## Coop-Specific Review Notes

The extension requests broad capabilities and will likely receive extra review attention:

- `tabs`
- `activeTab`
- `scripting`
- `sidePanel`
- `offscreen`
- exact receiver-origin host permissions for the receiver bridge

Keep the listing, reviewer notes, and privacy answers unusually clear.

## Related Docs

- [Demo & Deploy Runbook](/reference/demo-and-deploy-runbook)
- [Current Release Status](/reference/current-release-status)
- [Receiver Pairing & Intake](/reference/receiver-pairing-and-intake)
- [Testing & Validation](/reference/testing-and-validation)
- [Chrome Web Store Checklist](/reference/chrome-web-store-checklist)
- [Chrome Web Store Reviewer Notes](/reference/chrome-web-store-reviewer-notes)
- [Coop Privacy Policy](/privacy-policy)
- [Remote Knowledge Skill Re-Enable Checklist](/reference/remote-knowledge-skill-reenable-checklist)
