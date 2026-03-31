# Testing Report – Receiver Flow (PWA)

**Date:** 2026-03-16  
**Tester:** Luiz  
**URLs:** http://127.0.0.1:3002/pair | /receiver | /inbox

## Page Naming (Confirmed)

The PWA uses **Mate**, **Hatch**, **Roost** — not "pairing", "receiver", "inbox":

| PWA tab | Maps to | Purpose |
|---------|---------|---------|
| **Mate** | /pair | Pairing: paste nest code, scan QR, open coop link |
| **Hatch** | /receiver | Capture: record voice, photo, link |
| **Roost** | /inbox | Local inbox for captured items |

---

## Summary

Layout broken on desktop/wider widths; works on narrow/mobile. Hatch recording fails. Roost settings & status not loading.

---

## Critical Issues

### 1. Layout Broken on Desktop / Wider Widths

**Result:** Broken on desktop; fixed when narrow (mobile)

**Actual:**
- On desktop/wider viewport: content squished into two narrow vertical columns, text truncated/unreadable, large empty margins.
- On narrow width (mobile): layout renders correctly, content readable, cards stack properly.

**Screenshots:** `assets/Coop___Turn_knowledge_into_opportunity*.png`

**Severity:** Blocker for desktop users

---

### 2. Hatch Page – Recording Not Working

**Tested:** Hatch (capture) page  
**Result:** Recording does not work

**Additional:** "getUserMedia + MediaRecorder" is visible to users — this looks like debug/technical text that should not be exposed in production UI.

**Improvements:**
- Fix voice recording
- Hide or remove technical strings (getUserMedia, MediaRecorder) from user-facing UI

---

### 3. Roost Page – Settings & Status Not Loading

**Tested:** Roost (inbox) page  
**Result:** Settings & status area empty / not displaying

**Actual:** Large orange-bordered box labeled "Settings & status" is blank; content fails to load or render.

**Severity:** Major

---

## Production Readiness (1–10)

[ ] ___ (layout + recording + settings block higher score)

---

## Recommendations

- Fix responsive layout for desktop widths (content should not squish)
- Fix voice recording on Hatch
- Remove debug/technical strings from UI
- Fix Settings & status loading on Roost 
