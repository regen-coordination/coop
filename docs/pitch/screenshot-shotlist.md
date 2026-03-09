# Coop Screenshot + Video Shotlist (Current vs Polished)

**Version:** v0  
**Date:** 2026-03-08  
**Goal:** Capture a consistent evidence set for pitch decks, release notes, and before/after UX comparison.

---

## 0) Capture conventions

## Folder
`docs/pitch/assets/` (recommended)

## Filename pattern
`coop-{surface}-{state}-{shot-id}-{yyyymmdd}.{png|mp4|gif}`

Examples:
- `coop-sidepanel-current-SP01-20260308.png`
- `coop-pwa-polished-PWA03-20260308.png`
- `coop-canvas-current-CAN04-20260308.mp4`

## Surfaces
- `sidepanel`
- `pwa`
- `canvas`

## States
- `current`
- `polished`

## Resolution targets
- Sidepanel stills: native sidepanel width, full height crop.
- PWA stills: mobile viewport 390x844 or native phone screenshot.
- Canvas stills: 1440x900 (or equivalent) for clarity.
- Videos/GIFs: 8-20s clips, <20MB per file when possible.

---

## 1) Sidepanel shotlist

| ID | Capture | Current filename | Polished filename | Acceptance criteria |
|---|---|---|---|---|
| SP01 | No active coop onboarding state | `coop-sidepanel-current-SP01-YYYYMMDD.png` | `coop-sidepanel-polished-SP01-YYYYMMDD.png` | Name field + create/join affordance visible without scrolling |
| SP02 | Active coop header + share code | `...-SP02-...png` | `...-SP02-...png` | Coop name, member/user identity, share code legible |
| SP03 | Capture section (tab + voice + dropzone) | `...-SP03-...png` | `...-SP03-...png` | All capture actions visible in one frame |
| SP04 | Feed with mixed items (tab + voice + file) | `...-SP04-...png` | `...-SP04-...png` | At least 3 item types shown with timestamps |
| SP05 | Processing in progress state | `...-SP05-...png` | `...-SP05-...png` | Spinner/progress badge + disabled repeat action visible |
| SP06 | Processing completed state | `...-SP06-...png` | `...-SP06-...png` | Summary + extracted actions visible and readable |
| SP07 | Processing error state | `...-SP07-...png` | `...-SP07-...png` | Error text concise + retry action present |
| SP08 | Sidepanel canvas tab | `...-SP08-...png` | `...-SP08-...png` | Canvas controls visible; node area not clipped |

### Sidepanel video clips

| ID | Clip | Filename | Acceptance criteria |
|---|---|---|---|
| SPV01 | Capture tab -> feed item appears | `coop-sidepanel-current-SPV01-YYYYMMDD.mp4` | Demonstrates capture and resulting feed insertion |
| SPV02 | Run skill on feed item | `coop-sidepanel-current-SPV02-YYYYMMDD.mp4` | Shows full state transition: idle -> processing -> complete |
| SPV03 | Toggle feed/canvas tabs | `coop-sidepanel-current-SPV03-YYYYMMDD.mp4` | Transition is smooth and content remains legible |

---

## 2) PWA shotlist

| ID | Capture | Current filename | Polished filename | Acceptance criteria |
|---|---|---|---|---|
| PWA01 | Coop selector / first-run screen | `coop-pwa-current-PWA01-YYYYMMDD.png` | `coop-pwa-polished-PWA01-YYYYMMDD.png` | Name + create/join path visible in one viewport |
| PWA02 | Feed home with bottom nav + FAB | `...-PWA02-...png` | `...-PWA02-...png` | Feed items + nav + voice FAB all visible |
| PWA03 | Fullscreen voice recorder idle | `...-PWA03-...png` | `...-PWA03-...png` | Recorder controls and guidance copy visible |
| PWA04 | Fullscreen voice recorder recording | `...-PWA04-...png` | `...-PWA04-...png` | Live transcript + recording indicator + timer visible |
| PWA05 | Settings + connection status | `...-PWA05-...png` | `...-PWA05-...png` | Online/offline + coop connection badge visible |
| PWA06 | Offline queue populated | `...-PWA06-...png` | `...-PWA06-...png` | At least 2 queued items with sync affordance |
| PWA07 | Canvas screen | `...-PWA07-...png` | `...-PWA07-...png` | Current placeholder vs polished lite canvas comparison |

### PWA video clips

| ID | Clip | Filename | Acceptance criteria |
|---|---|---|---|
| PWAV01 | Open voice recorder from FAB, record, save | `coop-pwa-current-PWAV01-YYYYMMDD.mp4` | Shows end-to-end voice capture loop |
| PWAV02 | Offline capture then reconnect sync | `coop-pwa-current-PWAV02-YYYYMMDD.mp4` | Queue count changes and sync completion shown |
| PWAV03 | Bottom nav transitions (feed/canvas/settings) | `coop-pwa-current-PWAV03-YYYYMMDD.mp4` | Tabs switch with no broken layouts |

---

## 3) Canvas shotlist (extension-first)

| ID | Capture | Current filename | Polished filename | Acceptance criteria |
|---|---|---|---|---|
| CAN01 | Empty canvas state | `coop-canvas-current-CAN01-YYYYMMDD.png` | `coop-canvas-polished-CAN01-YYYYMMDD.png` | Empty guidance + primary add action visible |
| CAN02 | Tool panel + controls + minimap | `...-CAN02-...png` | `...-CAN02-...png` | Toolbar actions and minimap legible |
| CAN03 | Populated canvas with capture + insight nodes | `...-CAN03-...png` | `...-CAN03-...png` | At least 4 nodes + 3 edges visible |
| CAN04 | Node selected state | `...-CAN04-...png` | `...-CAN04-...png` | Selection styling clearly distinguishable |
| CAN05 | Undo/redo + zoom controls | `...-CAN05-...png` | `...-CAN05-...png` | Interaction control affordances visible |
| CAN06 | Inspector/detailed node panel (polished target) | `...-CAN06-current-placeholder-...png` | `...-CAN06-...png` | For polished: metadata + actions in inspector shown |

### Canvas video clips

| ID | Clip | Filename | Acceptance criteria |
|---|---|---|---|
| CANV01 | Add capture node, add insight node, connect edge | `coop-canvas-current-CANV01-YYYYMMDD.mp4` | Demonstrates creation and linking workflow |
| CANV02 | Fit view + zoom + pan interaction | `coop-canvas-current-CANV02-YYYYMMDD.mp4` | Navigation controls clearly demonstrated |
| CANV03 | Undo/redo interaction loop | `coop-canvas-current-CANV03-YYYYMMDD.mp4` | One action undone and redone successfully |

---

## 4) Before/After comparison set (required)

For pitch readiness, ensure this minimum pair set exists:

1. `SP01` current + polished
2. `SP04` current + polished
3. `SP06` current + polished
4. `PWA01` current + polished
5. `PWA04` current + polished
6. `PWA07` current + polished
7. `CAN01` current + polished
8. `CAN03` current + polished

These 8 pairs are enough to communicate UX transformation quickly.

---

## 5) QA checklist for every captured asset

- [ ] No devtool overlays/cursors obscuring primary UI.
- [ ] Timestamps and critical labels are readable at slide size.
- [ ] Sensitive data removed (API keys, personal info, local paths).
- [ ] Correct naming convention used.
- [ ] Current and polished shots use comparable framing.
- [ ] Acceptance criteria in table verified.

---

## 6) Suggested capture order (fastest path)

1. Sidepanel stills (SP01-SP08)
2. PWA stills (PWA01-PWA07)
3. Canvas stills (CAN01-CAN06)
4. Sidepanel clips (SPV01-SPV03)
5. PWA clips (PWAV01-PWAV03)
6. Canvas clips (CANV01-CANV03)

Then assemble the required before/after pair set for the deck.
