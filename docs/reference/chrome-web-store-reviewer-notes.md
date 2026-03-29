---
title: Chrome Web Store Reviewer Notes
slug: /reference/chrome-web-store-reviewer-notes
---

# Chrome Web Store Reviewer Notes Template

Date: March 20, 2026

Use this template when submitting the Coop extension for Chrome Web Store review.

## Reviewer Notes

Coop is a Manifest V3 browser extension with a sidepanel-first workflow. It captures browsing
context locally, turns that context into drafts for human review, and only shares material when the
user explicitly publishes or syncs it.

### Entry points

- Browser action opens a popup.
- Sidepanel is the main review and operator surface.
- Context-menu items capture the current tab or a screenshot into local review state.
- Keyboard shortcuts:
  - `Alt+Shift+Y` / `Command+Shift+Y`: open sidepanel
  - `Alt+Shift+U` / `Command+Shift+U`: round up active tab
  - `Alt+Shift+S` / `Command+Shift+S`: capture screenshot

### Permissions justification

- `storage`: local-first persistence for drafts, pairings, preferences, and encrypted capture data
- `alarms`: scheduled capture cadence, archive polling, and agent heartbeat tasks
- `tabs` / `activeTab`: explicit user-triggered tab capture
- `scripting`: receiver bridge content-script behavior on approved receiver origins
- `sidePanel`: main extension interface
- `offscreen`: receiver sync support
- `contextMenus`: tab and screenshot capture shortcuts
- `notifications`: local review reminders and status notifications

### Host permissions

The extension uses an exact origin allowlist for the receiver bridge. The release build should list
only:

- `http://127.0.0.1/*`
- `http://localhost/*`
- release-specific receiver origin, if configured for that build

### Data handling

- Browsing-derived content stays local by default.
- Sensitive local browsing payloads are encrypted at rest.
- Users can clear local encrypted capture history from the extension UI.
- No remote `SKILL.md` import or remote knowledge-shaping feature is shipped in the compliant build.

### Scheduled capture

- Scheduled capture is opt-in.
- Supported modes are `manual`, `30-min`, and `60-min`.
- Scheduled capture runs the same local capture path as the manual capture flow.

### Local AI and model downloads

- Local AI runs in the browser.
- Executable runtime assets are packaged with the extension.
- Open model weights may be downloaded remotely and cached locally by the browser when users opt in.

Fill this section with the actual first-run network trace for the release candidate:

- primary model provider / host:
- fallback model provider / host:
- actual model weight URLs observed:
- actual CDN domains observed:

### Pairing and receiver flow

- The receiver flow is used for explicit device pairing and private intake sync.
- The receiver bridge is restricted to the configured receiver origin allowlist.

### Passkey and identity flow

- Passkey / WebAuthn is used for authentication flows.
- Additional live archive or onchain flows are mode-gated and not required for the default local
  capture and review loop.
