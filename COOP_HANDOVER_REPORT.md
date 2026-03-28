# Coop Handover Report

Date: 2026-03-28
Repo: `/Users/afo/Code/greenpill/coop`

## Latest Validation Snapshot

Fresh validation work on 2026-03-28 produced this current-state result:

- `bun run build`: passed
- `bun run validate:store-readiness`: passed
- `bun run validate:production-readiness`: passed

What changed during this pass:

- fixed a popup accessibility/test regression by making popup overlay initial focus synchronous in
  [`packages/extension/src/views/Popup/hooks/usePopupOverlayFocusTrap.ts`](/Users/afo/Code/greenpill/coop/packages/extension/src/views/Popup/hooks/usePopupOverlayFocusTrap.ts)
- fixed a stale Playwright test signature in
  [`e2e/extension.spec.cjs`](/Users/afo/Code/greenpill/coop/e2e/extension.spec.cjs)
- stabilized the extension coop-creation wait seam in
  [`e2e/extension.spec.cjs`](/Users/afo/Code/greenpill/coop/e2e/extension.spec.cjs) by waiting on
  the lightweight popup snapshot written during `refreshBadge()` before confirming against the full
  dashboard payload
- made the shared extension E2E build helper mock-first even when root `.env.local` loads live
  `VITE_` modes in
  [`e2e/helpers/extension-build.cjs`](/Users/afo/Code/greenpill/coop/e2e/helpers/extension-build.cjs),
  with explicit live opt-in preserved for
  [`e2e/member-account-live.spec.cjs`](/Users/afo/Code/greenpill/coop/e2e/member-account-live.spec.cjs)
- stabilized receiver pairing coverage in
  [`e2e/receiver-sync.spec.cjs`](/Users/afo/Code/greenpill/coop/e2e/receiver-sync.spec.cjs) by
  waiting on extension private-intake state instead of the app-side sync pill before opening the
  review surface, and by relaxing teardown timeouts for heavy browser shutdowns
- aligned mobile landing assertions to the current landing-page markup in
  [`e2e/app.spec.cjs`](/Users/afo/Code/greenpill/coop/e2e/app.spec.cjs)

What still blocks the staged launch bar after those fixes:

- nothing in the automated staged mock-first bar; the latest full
  `bun run validate:production-readiness` passed cleanly
- the remaining release risks are coverage threshold shortfall and manual popup permission QA in
  real Chrome
- live onchain/archive/session rails remain a second gate after the staged mock-first bar

Build-time note from the same pass:

- the extension build is still expensive because it packages local model/runtime assets
- cold `bun run build` took roughly 15 minutes when stale Vitest worker processes were also present
- warm extension builds during later validation runs were roughly 24-64 seconds
- if port `3001` is already occupied locally, run validation on clean overrides such as
  `COOP_PLAYWRIGHT_APP_PORT=3002` and `COOP_PLAYWRIGHT_API_PORT=4445`

## Executive Summary

Coop is no longer a bare prototype. The repo has a real product shape, a working local-first core
loop, meaningful automated coverage, and clear release documentation. The browser extension is the
center of the product, the receiver PWA is implemented, the board view exists, the signaling API
exists, and the repo has dedicated validation suites for popup, sidepanel, receiver sync, archive,
agent loop, onchain UI, and store-readiness.

That said, Coop is not yet at a clean public-production bar.

The most accurate label today is:

- strong pre-release build
- suitable for guided demos and internal or trusted-tester pilots
- not yet ready for an unqualified public launch

The staged mock-first automation bar is now green. The remaining blockers are coverage,
manual-Chrome QA for popup permission paths, and the deliberate decision to keep live rails behind
their own second gate.

## Current Product State

### Implemented Surfaces

- `packages/extension`
  Chrome MV3 extension with popup, sidepanel, background worker, and offscreen/runtime support.
- `packages/app`
  Landing page, receiver PWA, inbox, pairing flow, and read-only board view.
- `packages/api`
  Hono + Bun signaling/Yjs server for sync.
- `packages/shared`
  Shared contracts and domain modules for auth, coop state, storage, archive, receiver, policy,
  session, privacy, onchain, Green Goods, FVM/ERC-8004, and agent logic.

### Supported User-Facing Features

#### Capture and intake

- Popup-based quick capture and quick review.
- Browser tab round-up and related popup capture flows.
- Receiver PWA pairing and capture for audio, photos, files, and links.
- Private receiver intake syncing into the extension.
- Multi-coop review/publish routing is present in the current test and doc surface.

#### Review and publish

- Candidate to draft to publish workflow across popup and sidepanel.
- `Chickens` as the working queue and `Coops` as the shared feed/archive surface.
- Publish handoff into shared coop state.
- Board handoff from extension to PWA board route.

#### Archive and proof

- Archive artifact and archive snapshot flows exist.
- Archive receipts are surfaced in the extension and board.
- Export/proof story is implemented enough to be part of current release docs.
- Board view is read-only and positioned as a proof/snapshot surface, not a full editing surface.

#### Identity, membership, and permissions

- Create/join coop flows exist.
- Invite generation and membership flows are implemented.
- Passkey-first identity and member session handling are present.
- Policy, permit, and session-capability scaffolding is implemented in shared/runtime code.

#### Green Goods and onchain

- Mock-path member account and garden-pass flows are covered in current validation.
- Sidepanel operator console exists with Green Goods sections and bounded session-capability UX.
- Live probes exist for Safe deployment, session-key execution, and archive delegation.
- Live rails are present as opt-in paths, not default-release behavior.

#### Agent and local AI

- Agent harness, skill registry, evals, observations, plan handling, and operator controls exist.
- Explicit local refine flows exist with a worker-backed local-model path and heuristic fallback.
- The broader agent/relevance pipeline is still substantially heuristic/scoring driven, so the
  marketing story is ahead of the most conservative implementation reading.

## Production Readiness Assessment

### Bottom line

Coop is partially production-ready in a staged, mock-first sense, but not release-ready by its own
current repo standards.

### What is in good shape

- The repo is organized enough for handoff: clear packages, shared modules, docs, validation
  scripts, and active plan files.
- Release docs are substantially better than average for a pre-release project.
- The main product loop is implemented end-to-end:
  capture -> review -> publish -> archive/proof.
- There is meaningful test breadth:
  - `94` shared test files
  - `81` extension test files
  - `12` app test files
  - `6` api test files
  - `8` Playwright specs

### What currently blocks a production claim

- The staged launch QA plan explicitly says production readiness is blocked on coverage.
- Existing coverage artifacts and the active production-readiness QA report show:
  - lines: `77.29%`
  - statements: `77.29%`
  - functions: `77.57%`
  - branches: `76.41%`
- Current Vitest thresholds are:
  - lines: `85%`
  - statements: `85%`
  - functions: `85%`
  - branches: `70%`
- On 2026-03-28, `bun run lint` passed cleanly on the current tree.
- On 2026-03-28, `bun run build` passed.
- On 2026-03-28, `bun run validate:store-readiness` passed.
- On 2026-03-28, `bun run validate:production-readiness` passed on a clean attached-dev run with
  `COOP_PLAYWRIGHT_APP_PORT=3002` and `COOP_PLAYWRIGHT_API_PORT=4445`.
- The strongest remaining release concern is coverage plus real-browser popup QA, not an open
  staged mock-first validator failure.

### Practical readiness classification

- Internal development: ready
- Demos: ready
- Trusted testers/private pilot: plausible with a guided checklist
- Public Chrome Web Store launch: not yet
- Public launch with live onchain/archive/session rails enabled: definitely not yet

## Main Gaps To Close

### 1. Coverage and release gating

This is the clearest short-term blocker.

The known weak areas are not random. They cluster in release-critical surfaces and orchestration
code, especially:

- `packages/app/src/hooks/useCapture.ts`
- `packages/app/src/hooks/useReceiverSync.ts`
- `packages/extension/src/views/Sidepanel/`
- `packages/extension/src/views/Sidepanel/hooks/`
- `packages/extension/src/runtime/agent-output-handlers.ts`
- `packages/shared/src/modules/storage/db-maintenance.ts`
- `packages/shared/src/modules/transcribe/loader.ts`

Coverage is still a real release concern even though the staged mock-first automation bar is now
green.

### 2. Popup capture still has a real manual gate

The docs are clear that successful popup `Capture Tab` and `Screenshot` saves still require manual
verification in real Chrome because Playwright does not reproduce the popup `activeTab` grant
faithfully.

That is manageable, but it means the shipped release bar still depends on manual QA for an
important user path.

The popup focus regression that was breaking `test:unit:popup-actions` during this handoff has been
fixed.

### 3. The staged mock-first bar is green, but the harness is specialized

The latest full `validate:production-readiness` run passes, but it now depends on a few explicit
test-harness assumptions:

- extension E2E builds now default onchain/archive/session modes to mock even if root `.env.local`
  has live `VITE_` settings
- live E2E paths must opt back in explicitly with `COOP_E2E_USE_VITE_MODES=1`
- receiver-sync coverage is now anchored on extension private-intake state instead of waiting on
  the app-side sync pill first
- mobile landing coverage is aligned to the current DOM structure rather than older narrative
  selectors

That is a reasonable place to be for a handoff, but the next developer should treat the E2E suite
as sensitive release infrastructure, not as a set of throwaway smoke tests.

### 4. Receiver runtime still has polling seams

The old sidepanel polling concern was fixed, but receiver/dev-tunnel and QR flows still rely on
interval-based polling. That is not a launch blocker by itself, but it is still a quality and
battery concern for mobile-ish usage.

### 5. Some settings are more “stored” than “operational”

Ritual/meeting settings such as `weeklyReviewCadence`, `facilitatorExpectation`, and
`defaultCapturePosture` are present in schemas and flow setup, but they still look closer to
stored context than to a live scheduling or ritual engine.

### 6. Board is a proof surface, not a full workflow surface

The board is useful and implemented, but it is intentionally read-only. It is good for a snapshot
story, not yet for full downstream coop operations.

### 7. Live rails still need architectural hardening

- Safe/session/archive live probes exist, which is good.
- But live rails are still intentionally deferred.
- The current FVM registration path still expects operator-controlled signing material via `VITE_`
  env, which is not appropriate for a public Chrome Web Store build.

### 8. Extension build cost is still high

The extension build remains unusually heavy for a browser extension because it bundles:

- `@huggingface/transformers`
- `@mlc-ai/web-llm`
- large ONNX/WebLLM worker assets

Current packaged highlights from the build output:

- `agent-webllm-worker.js`: about `6 MB`
- `chunks/webllm-*.js`: about `5.89 MB`
- `chunks/transformers-*.js`: about `869 kB`
- `assets/ort-wasm-simd-threaded.jsep.wasm`: about `21.6 MB`

This does not currently fail store-readiness, but it does slow local iteration and increases the
chance that release validation feels brittle.

### 9. Environment and docs drift

The repo convention and most current docs say to use the root `.env.local`.

However, `.env.example` still says “copy to `.env`”. The loader currently reads both `.env` and
`.env.local`, so this is not a runtime failure, but it is the kind of handoff confusion that
creates bad local setups.

## Open Questions For The Next Developer

### Release strategy

- Is the next milestone a trusted-tester pilot, or a real public Chrome Web Store launch?
- Does the team want to keep the global `85/85/85/70` coverage bar, or narrow it to a
  release-critical slice?

### Live rails

- Which live rails actually need to ship in the first meaningful release?
- Should Safe/session/archive remain operator-only behind probes until after the first public cut?
- What is the plan to remove operator signing material from browser-baked env where required?

### Product clarity

- Are ritual/meeting settings staying as narrative context, or should they become actual scheduled
  behavior?
- Is the board meant to remain read-only, or should it become an operational surface?
- How much of the “local AI” story should be described as explicit refine tools versus a more
  autonomous local agent?

## Recommended Testing And QA

### Automated Checks

Use these as the canonical entry points:

```bash
bun run test
bun run test:coverage
bun build
bun run validate:store-readiness
bun run validate:production-readiness
```

Useful targeted slices:

```bash
bun run test:unit:popup-actions
bun run test:unit:sidepanel-actions
bun run test:unit:archive-hardening
bun run test:unit:sync-hardening
bun run test:unit:onchain-ui
bun run test:unit:agent-loop
bun run test:e2e:popup
bun run test:e2e:sync
bun run test:e2e:extension
bun run test:e2e:receiver-sync
bun run test:e2e:agent-loop
bun run test:visual
```

Important repo rule:

```bash
bun run test
```

Do not use `bun test`; this repo expects Vitest through `bun run test`.

### Manual QA That Still Matters

### Popup

- Real-click `Capture Tab` save in Chrome.
- Real-click `Screenshot` save in Chrome.
- File review cancel/save.
- Microphone denial and retry.
- Post-failure popup recovery.

### Sidepanel and core loop

- Create coop.
- Join coop from invite.
- Move finds through `Chickens`.
- Publish into `Coops`.
- Archive artifact and archive snapshot.
- Open board handoff and validate receipt/proof rendering.

### Receiver

- Pair from mobile/secondary device.
- Capture audio, photo, file, and link.
- Confirm private intake lands in the correct coop.
- Confirm sidepanel-closed sync behavior.

### Scheduled capture

- Verify `manual`, `30-min`, and `60-min` modes.
- Confirm icon/status behavior and alarm-driven capture expectations.

### Accessibility and UX

- Keyboard-only navigation across popup and sidepanel.
- Modal/focus behavior, especially non-onboarding overlays.
- Mobile receiver behavior with reduced motion and poor connectivity.

### Security/release hygiene

- Confirm no operator-only signing material is baked into a public build.
- Confirm host permissions match the intended receiver origin.
- Confirm built output contains no unexpected remote executable assets.
- Confirm local browsing payloads and stored data can be cleared from the UI.

## Local Setup Guidance

### Minimal local setup

Use the root `.env.local`.

Recommended default values:

```bash
VITE_COOP_CHAIN=sepolia
VITE_COOP_ONCHAIN_MODE=mock
VITE_COOP_ARCHIVE_MODE=mock
VITE_COOP_SESSION_MODE=off
VITE_COOP_RECEIVER_APP_URL=http://127.0.0.1:3001
VITE_COOP_SIGNALING_URLS=ws://127.0.0.1:4444
```

Then:

```bash
bun install
bun dev
```

Or individually:

```bash
bun run dev:app
bun run dev:extension
bun run dev:api
```

After env changes, rebuild/reload the extension. Vite bakes `VITE_` variables into the bundle.

### Optional live env

For live onchain:

- `VITE_PIMLICO_API_KEY`
- optionally `VITE_PIMLICO_SPONSORSHIP_POLICY_ID`

For live archive:

- `VITE_COOP_TRUSTED_NODE_ARCHIVE_AGENT_PRIVATE_KEY`
- `VITE_COOP_TRUSTED_NODE_ARCHIVE_SPACE_DID`
- `VITE_COOP_TRUSTED_NODE_ARCHIVE_DELEGATION_ISSUER`
- `VITE_COOP_TRUSTED_NODE_ARCHIVE_SPACE_DELEGATION`
- optional proofs/gateway/filecoin witness values from `docs/builder/environment.md`

For live probes:

- `COOP_ONCHAIN_PROBE_PRIVATE_KEY`
- `COOP_SESSION_PROBE_PRIVATE_KEY`
- optional probe chain/safe overrides

### Suggested local workflow for a new developer

1. Install deps and start with mock modes only.
2. Run `bun run test` and `bun build`.
3. Load the unpacked extension from `packages/extension/.output/chrome-mv3`.
4. Walk the two-person receiver pairing flow locally.
5. Run the targeted suites for the area you touch before escalating to full validation.
6. Keep live rails off unless you are explicitly working on probes; the staged mock-first bar is
   currently green.

## Suggested Next Steps

### Immediate

1. Decide whether the next target is “private pilot” or “public staged launch”.
2. Close the coverage gap in app receiver hooks and sidepanel orchestration.
3. Run the real-Chrome manual popup checklist, especially `Capture Tab` and `Screenshot`.
4. Reduce extension build cost and repeated WXT rebuild work inside the validation loop.
5. Clean up environment/docs drift around `.env.local`, mock-first defaults, and local port
   overrides.
6. Rerun the full staged bar on a clean tree when touching core workflows:
   `bun format && bun lint && bun run test && bun run test:coverage && bun build && bun run validate:store-readiness && bun run validate:production-readiness`

### After staged bar is green

1. Run the manual Chrome checklist, especially popup activeTab paths.
2. Clean up environment/docs drift around `.env.local` versus `.env`.
3. Decide how live archive/FVM/operator signing should be handled safely.

### Later

1. Reduce extension build cost by isolating or slimming the local-model packaging path.
2. Reduce polling and improve receiver/runtime efficiency.
3. Clarify or implement ritual scheduling behavior.
4. Expand board actions only if the product actually needs the board to become operational.

## Basis For This Report

This report is based on the repo state on 2026-03-28, including:

- root package scripts and validation graph
- current package and source layout
- existing release/readiness docs
- active `.plans` work
- current coverage artifacts
- fresh 2026-03-28 validation runs including `bun run build`, `bun run validate:store-readiness`,
  multiple targeted reruns, and a final passing `bun run validate:production-readiness` run

It should be treated as a current-state engineering handoff, not a product promise.
