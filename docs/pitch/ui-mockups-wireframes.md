# Coop UI Mockups & Wireframes (Current vs Polished Target)

**Version:** v0  
**Date:** 2026-03-08  
**Scope:** Mobile PWA + Extension Sidepanel + Canvas  
**Purpose:** Give product/design/dev a practical screen-by-screen blueprint for polishing UX without changing core flows.

---

## 0) Product frame (what this wireframe pack optimizes)

- **Core loop:** Join/Create coop → Capture (voice/tab/file) → Process with pillar skill → Organize/act (feed + canvas).
- **Current strengths:** Functional end-to-end loop, live feed updates, visual token baseline, working canvas node system.
- **Current friction:** Dense sidepanel layout, limited onboarding guidance, weak hierarchy around “next best action,” placeholder canvas in PWA, inconsistent state messaging.
- **Polish target:** Clear first-run onboarding, stronger action hierarchy, better progressive disclosure, polished microinteractions, capture confidence, and presentation-ready visuals.

---

## 1) Information architecture (target)

### Mobile PWA (target IA)
1. **Onboarding / Coop Select**
2. **Feed (default home)**
3. **Voice Recorder Fullscreen**
4. **Capture Detail / Processing Result**
5. **Canvas (lite view in PWA)**
6. **Settings / Connection / Offline Queue**

### Extension Sidepanel (target IA)
1. **Identity + Active Coop Header**
2. **Quick Capture Strip**
3. **Skill Quick-Run Context Bar**
4. **Feed Stream with inline processing + cards**
5. **Canvas tab (full extension canvas view)**

### Canvas (extension-first target IA)
1. **Board Header / Filters**
2. **Node Graph + Relationship edges**
3. **Inspector panel (right rail)**
4. **Action bar (create insight/task/share)**

---

## 2) MOBILE PWA wireframes

> Legend: **[C]** = current, **[T]** = polished target.

### M1 — First Launch / Coop Entry

**Intent:** Get user to identity + coop creation/join in <60s.

**[C] Current**
```text
┌─────────────────────────────┐
│ Coop                        │
│ Voice-first knowledge ...   │
│                             │
│ Your Display Name           │
│ [_______________________]   │
│                             │
│ [ Create Coop ]             │
│ ----------- OR -----------  │
│ Share code                  │
│ [____-____]                 │
│ [ Join Coop ]               │
└─────────────────────────────┘
```

**[T] Target**
```text
┌─────────────────────────────┐
│ Coop ✨                     │
│ Capture community work fast │
│                             │
│ Step 1 of 2                 │
│ Your name                   │
│ [ Alex Rivera            ]  │
│                             │
│ Step 2 of 2                 │
│ (•) Create new coop         │
│ ( ) Join with code          │
│                             │
│ If Join: [ A7B9-C2D4 ]      │
│                             │
│ [ Continue ]                │
│ “No account required” note  │
└─────────────────────────────┘
```

**Polish notes**
- One CTA only (“Continue”), adaptive form based on choice.
- Inline error states (“Invalid code format”, “Name required”).
- Keep trust copy: *No login required. Coop-scoped data.*

---

### M2 — Feed Home

**Intent:** Make activity legible and capture actions obvious.

**[C] Current:** Feed cards + bottom nav + floating mic.

**[T] Target**
```text
┌─────────────────────────────┐
│ Coop: River Garden          │
│ Sync: ● Connected           │
│ [ Share Code ]              │
│                             │
│ Quick capture               │
│ [🎤 Voice] [📎 Tab] [📄 File]│
│                             │
│ Today                       │
│ ┌ Voice Transcribed ─────┐  │
│ │ “Finished cleanup ...” │  │
│ │ [Process] [Open]       │  │
│ └────────────────────────┘  │
│ ┌ Tab Captured ──────────┐  │
│ │ Local volunteers ...    │  │
│ │ [Process] [Open URL]    │  │
│ └────────────────────────┘  │
│                             │
│  Feed   Canvas   Settings   │
│        [ 🎤 FAB ]           │
└─────────────────────────────┘
```

**Polish notes**
- Add “Quick capture strip” at top to reduce hunting.
- Show empty states as action prompts (“Record your first note”).
- Use type icons + semantic badges + human-readable timestamps.

---

### M3 — Fullscreen Voice Recorder

**Intent:** High-confidence capture with clear recording states.

**[C] Current:** Nice waveform + live transcript modal.

**[T] Target additions**
```text
┌─────────────────────────────┐
│ ✕                           │
│ Recording… ●                │
│ [dynamic waveform]          │
│                             │
│ “we collected 50 pounds...” │
│                             │
│ 00:34                        │
│ [ Pause ] [ Stop & Save ]   │
│                             │
│ Noise: Good • Mic: On       │
└─────────────────────────────┘
```

**Polish notes**
- Add elapsed timer + pause state.
- On save success: toast + automatic return to feed item anchor.
- On recognition failure: actionable fallback (“Try shorter phrases / browser mic permissions”).

---

### M4 — Capture Detail + Skill Result

**Intent:** Convert raw capture into useful action.

**[C] Current:** Inline processing result appears in feed.

**[T] Target**
```text
┌─────────────────────────────┐
│ ← Back   Voice Capture      │
│                             │
│ Transcript                  │
│ “Finished cleanup...”       │
│                             │
│ Pillar                      │
│ [ Impact Reporting ▾ ]      │
│ [ Run Skill ]               │
│                             │
│ Result                      │
│ Summary: ...                │
│ Metrics: 50 lbs, 12 vols    │
│ Actions:                    │
│ 1) Schedule follow-up       │
│ 2) Publish impact update    │
│                             │
│ [Create Task] [Share]       │
└─────────────────────────────┘
```

**Polish notes**
- Keep processing at item level but allow dedicated detail drill-down.
- Promote “next actions” to first-class controls.

---

### M5 — Canvas (PWA Lite)

**Intent:** Allow consumption + lightweight organization on mobile.

**[C] Current:** Placeholder message.

**[T] Target (lite)**
```text
┌─────────────────────────────┐
│ Canvas                      │
│ [Filter: This week ▾]       │
│                             │
│ [mini board viewport]       │
│  ○ capture   ◇ insight      │
│   \\ edge relations         │
│                             │
│ [ + Add note ] [Auto layout]│
│                             │
│ Tap node -> bottom sheet    │
└─────────────────────────────┘
```

**Polish notes**
- Keep full editing in extension; mobile focuses on viewing/quick add.
- Bottom sheet inspector for node detail on tap.

---

### M6 — Settings / Queue / Status

**Intent:** Build reliability trust (offline + sync).

**[C] Current:** Good baseline status + queue cards.

**[T] Target improvements**
- “Connection Health” grouped card (online, ws, anchor reachable).
- One-click “Sync now” with progress state.
- Queue item tap opens transcript preview before sync.

---

## 3) EXTENSION SIDEPANEL wireframes

### E1 — Sidepanel Home (Active Coop)

**Intent:** One-screen command center for capture and processing.

**[C] Current:** Header → identity/coop → capture section → processing section → feed/canvas tabs.

**[T] Target**
```text
┌──────────────────────────────────┐
│ Coop              River Garden   │
│ Alex • Share: A7B9-C2D4          │
│----------------------------------│
│ Quick Capture                    │
│ [Capture Tab] [Voice] [Dropzone] │
│----------------------------------│
│ Skill Context                    │
│ Pillar: [Impact ▾] [Auto-run ☐]  │
│----------------------------------│
│ Activity Feed (12)               │
│ ┌ tab.captured ────────────────┐ │
│ │ Local volunteers plant ...   │ │
│ │ [Process] [Open] [Pin]       │ │
│ └──────────────────────────────┘ │
│ ...                              │
│----------------------------------│
│ [Feed] [Canvas]                  │
└──────────────────────────────────┘
```

**Polish notes**
- Compress top identity card; preserve space for feed.
- Convert section titles into stronger visual anchors.
- Make dropzone collapsible when inactive.

---

### E2 — No Active Coop State

**Intent:** Resolve blank state quickly.

**[T] Target**
```text
┌──────────────────────────────────┐
│ Welcome to Coop                  │
│                                  │
│ Name [______________]            │
│                                  │
│ (•) Create coop                  │
│ ( ) Join existing                │
│ If join: [____-____]             │
│                                  │
│ [Start]                          │
│                                  │
│ Tip: share code lets teammates   │
│ join instantly (no account).     │
└──────────────────────────────────┘
```

**Polish notes**
- Merge separate create/join cards into a single progressive panel.

---

### E3 — Feed Item with Skill Processing States

**Intent:** Make “process with AI” legible + trustworthy.

**[T] states**
- `Idle`: Process button visible.
- `Processing`: spinner + disable repeated run.
- `Success`: summary preview + actions chips.
- `Error`: concise cause + retry CTA.

```text
[Process] -> [Processing…] -> [✓ Analysis complete]
Error: “No text content found” [Retry]
```

---

### E4 — Sidepanel Canvas Tab Container

**Intent:** Embed full canvas experience in extension reliably.

**[C] Current:** 400px container with CanvasView.

**[T] Target improvements**
- Dynamic height (fill available sidepanel viewport).
- Sticky mini-toolbar (Add Capture / Add Insight / Auto-layout).
- Optional right drawer inspector.

---

## 4) CANVAS wireframes (Extension-first)

### C1 — Empty Canvas

**Intent:** Encourage first meaningful action.

**[C] Current:** Good empty prompt + tool panel.

**[T] Target**
```text
┌──────────────────────────────────────────────┐
│ Canvas Tools                                 │
│ [ + Capture ] [ + Insight ] [Import Feed]    │
│----------------------------------------------│
│                                              │
│          Start mapping your coop             │
│   Drag captures here or click Import Feed    │
│                                              │
│                              [MiniMap]       │
└──────────────────────────────────────────────┘
```

**Polish notes**
- Add “Import Feed” bulk action to seed board instantly.

---

### C2 — Populated Graph + Inspector

**Intent:** Move from collection to sensemaking.

**[T] Target**
```text
┌──────────────────────────────────────────────┐
│ Top bar: Board ▾  Filter ▾  Auto-layout      │
│                                              │
│   ○ Capture A ---- ◇ Insight 1               │
│      |               \                        │
│   ○ Capture B ---- ◇ Insight 2               │
│                                              │
│ Right inspector:                              │
│ - Node title/content                           │
│ - Pillar tag                                   │
│ - Actions [Run skill][Create task][Share]     │
└──────────────────────────────────────────────┘
```

**Polish notes**
- Preserve existing ReactFlow controls; add lightweight inspector state store.

---

### C3 — Presentation Mode (for demos)

**Intent:** Storytelling-ready board walkthrough.

**[T] Target**
- Hide edit handles.
- Focus mode on selected node path.
- Keyboard next/previous node stepping.

---

## 5) Cross-surface implementation checklist

1. **Unify first-run flow copy** (PWA + sidepanel).
2. **Standardize status language**: Connected/Connecting/Offline/Queued.
3. **Add structured empty states** with one primary CTA.
4. **Promote “next action” after processing** in both feed and detail.
5. **Ship PWA canvas lite + extension canvas full** with shared visual style.

---

## 6) Ready-for-build acceptance criteria

- A new user can create or join a coop in **< 60 seconds** on both surfaces.
- Capture actions remain reachable in **1 tap/click** from primary home screens.
- Processing states are explicit and non-ambiguous in all feed items.
- PWA has non-placeholder canvas experience (at minimum: view + node tap detail).
- Sidepanel and PWA use consistent token-based spacing/type/color hierarchy.
