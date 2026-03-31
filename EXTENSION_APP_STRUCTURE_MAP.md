# Coop Extension & App Structure Map

**Complete visual guide to the extension and app UI/component architecture**

---

## 🧩 EXTENSION ARCHITECTURE

### MV3 Surfaces Overview

```
┌─────────────────────────────────────────────────────────┐
│                 Chrome Browser                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Action Icon │  │ Sidepanel    │  │ Popup        │  │
│  │  (Badge)     │  │ (Full UI)    │  │ (Compact)    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│        │                  │                  │          │
│        └──────────────────┼──────────────────┘          │
│                           │                             │
│                    ┌──────▼──────┐                       │
│                    │              │                      │
│            ┌───────┴──────────────┴────────┐             │
│            │   Background Service Worker   │             │
│            │   (Orchestrator)              │             │
│            └───────────────────────────────┘             │
│                           │                             │
│        ┌──────────────────┼──────────────────┐           │
│        │                  │                  │           │
│   ┌────▼────┐    ┌────────▼────────┐  ┌────▼────┐      │
│   │  Dexie  │    │  Yjs Docs       │  │ Receiver│      │
│   │ (IndexDB)   │ (Live State)     │  │ Sync    │      │
│   └─────────┘    └─────────────────┘  └────────┘       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Extension Service Worker (`background.ts`)

**The Orchestrator (~800 lines)**

Manages:
- ✅ Coop state (Yjs documents, one per coop)
- ✅ Database (Dexie IndexedDB instance)
- ✅ Auth session (passkey identity)
- ✅ Alarms (passive capture scheduling)
- ✅ Sync bindings (WebRTC providers per coop)
- ✅ Receiver relay (WebSocket connections for paired devices)
- ✅ Archive operations (Storacha uploads)
- ✅ Sound playback (success events)
- ✅ Extension icon state (idle, watching, review-needed, error-offline)

**All communication via `chrome.runtime.onMessage`**
- Views send: `RuntimeRequest` (discriminated union of 30+ message types)
- Service worker returns: `RuntimeActionResponse<T>` (ok, data, error, soundEvent)

---

### Extension Sidepanel UI (`sidepanel-app.tsx`)

**The Full Application (~1500 lines)**

#### Tab Structure

```
┌────────────────────────────────────────────────────────────┐
│ SIDEPANEL TAB BAR                                           │
├────────────────────────────────────────────────────────────┤
│ 🐔 Loose  | 🪶 Roost | 🏘️  Coops | 📰 Feed | 🎭 Meeting | ⚙️ Settings │
│ Chickens  |        |       |      |       |            │
└────────────────────────────────────────────────────────────┘
        │         │        │        │       │             │
        │         │        │        │       │             │
```

#### Tab 1: Loose Chickens 🐔
**Passive tab candidates from capture**

```
┌──────────────────────────────────────┐
│ Loose Chickens                       │
├──────────────────────────────────────┤
│ Automatically captured from tabs     │
│                                      │
│ [Tab Candidate Card]                 │
│  • Title: "Best practices for..."   │
│  • Source: example.com              │
│  • Captured: 2h ago                 │
│  • [Add to Roost] [Dismiss]         │
│                                      │
│ [Tab Candidate Card]                 │
│  • Title: "PDF: Research..."         │
│  • Source: pdf.example.org           │
│  • Captured: 45m ago                 │
│  • [Add to Roost] [Dismiss]         │
│                                      │
└──────────────────────────────────────┘
```

#### Tab 2: Roost 🪶
**Review & publish drafts**

```
┌──────────────────────────────────────┐
│ Roost                                │
├──────────────────────────────────────┤
│ Ready to publish                     │
│                                      │
│ [Draft Card - EDITABLE]              │
│  • Title: [edit box]                 │
│  • Note: [edit box]                  │
│  • Tags: [#tag1] [#tag2] [+]        │
│  • Target Coop: [Dropdown]          │
│  • Archive: [Toggle]                 │
│  • [Publish] [Archive] [Discard]    │
│                                      │
│ [Draft Card - EDITABLE]              │
│  • ...similar layout...              │
│                                      │
│ [+ New Draft] button                 │
└──────────────────────────────────────┘
```

#### Tab 3: Coops 🏘️
**Coop management**

```
┌──────────────────────────────────────┐
│ Coops                                │
├──────────────────────────────────────┤
│ Your coops                           │
│                                      │
│ [Coop Card - ACTIVE]                 │
│  • Name: "Friends Knowledge"         │
│  • Status: 🟢 Active                 │
│  • Members: 5 people                 │
│  • Last update: 2h ago               │
│  • [Open] [Settings]                 │
│                                      │
│ [Coop Card]                          │
│  • Name: "Family Archive"            │
│  • Status: 🟡 Watching               │
│  • Members: 8 people                 │
│  • Last update: 3d ago               │
│  • [Open] [Settings]                 │
│                                      │
│ [+ Create New Coop] button           │
│   → Opens Creation Flow              │
│                                      │
│ [Join Existing Coop] button          │
│   → Asks for invite code             │
│                                      │
└──────────────────────────────────────┘
```

#### Tab 4: Feed 📰
**Published artifacts**

```
┌──────────────────────────────────────┐
│ Feed                                 │
├──────────────────────────────────────┤
│ Recent published items               │
│                                      │
│ [Published Artifact]                 │
│  • By: Alice                         │
│  • Title: "Q1 Market Research"       │
│  • Posted: Today                     │
│  • Tags: #research #markets          │
│  • [View on Board]                   │
│                                      │
│ [Published Artifact]                 │
│  • By: Bob                           │
│  • Title: "Protocol Update Notes"    │
│  • Posted: Yesterday                 │
│  • Tags: #protocol #engineering      │
│  • [View on Board]                   │
│                                      │
│ [Published Artifact]                 │
│  • ...                               │
│                                      │
│ [⏱️ Refresh] [🔍 Filter by tag]      │
│                                      │
└──────────────────────────────────────┘
```

#### Tab 5: Meeting Mode 🎭
**Weekly review interface**

```
┌──────────────────────────────────────┐
│ Meeting Mode                         │
├──────────────────────────────────────┤
│ Weekly synchronization                │
│                                      │
│ 📥 Private Intake                    │
│ [Card] [Card] [Card]                 │
│ Items waiting to be reviewed         │
│                                      │
│ 📋 Candidate Drafts                  │
│ [Card] [Card]                        │
│ Proposals for discussion              │
│                                      │
│ ✅ Ready Drafts                      │
│ [Card]                               │
│ Approved to publish                  │
│                                      │
│ [Manual Round-Up] button             │
│                                      │
└──────────────────────────────────────┘
```

#### Tab 6: Settings ⚙️
**Configuration**

```
┌──────────────────────────────────────┐
│ Settings                             │
├──────────────────────────────────────┤
│                                      │
│ 🔐 Authentication                    │
│  • Current user: [alice@coop.town]  │
│  • [Logout] [Switch Account]        │
│                                      │
│ 🔔 Sound Preferences                 │
│  • Coop Created: [Toggle] 🔊         │
│  • Artifact Published: [Toggle] 🔊   │
│  • Error: [Toggle] 🔊                │
│                                      │
│ 🔄 Sync Health                       │
│  • Status: Connected ✅              │
│  • Latency: 45ms                     │
│  • Last sync: 2m ago                 │
│  • [Force Sync Now]                  │
│                                      │
│ 📱 Receiver Configuration             │
│  • Pairing ID: [abc123...]           │
│  • Status: Paired (1 device)         │
│  • [Generate New Pairing]            │
│  • [View QR Code]                    │
│                                      │
│ 🏗️ Nest Runtime                      │
│  • Chain: sepolia                    │
│  • Onchain mode: mock                │
│  • Archive mode: mock                │
│  • Signaling: ws://127.0.0.1:4444   │
│                                      │
│ ℹ️ About                              │
│  • Version: 0.0.0                    │
│  • Built: 2026-03-16                 │
│                                      │
└──────────────────────────────────────┘
```

---

### Extension Popup (`popup-app.tsx`)

**Compact launcher (~100 lines)**

```
┌──────────────────────────┐
│ Coop Extension Popup     │
├──────────────────────────┤
│                          │
│ Icon State: 🟢 Watching  │
│                          │
│ Pending Drafts: 3        │
│ Sync Status: Connected   │
│                          │
│ [Open Sidepanel]         │
│ [Manual Round-Up]        │
│                          │
└──────────────────────────┘
```

---

## 📱 APP (PWA) ARCHITECTURE

### Routes & Views

```
/                    → Landing (static product page)
/pair                → Receiver Pairing (QR/deep link)
/pair (after)        → Receiver Capture (audio/photo/file)
/inbox               → Receiver Inbox (local captures)
/board/:coopId       → Board Visualization (React Flow)
```

### View 1: Landing Page `/`

**Static, informational, no state**

```
┌────────────────────────────────────────────────────────┐
│                  LANDING PAGE                          │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ╔════════════════════════════════════════════════╗   │
│  ║  🐔 Coop: A Knowledge Commons                  ║   │
│  ║  Capture • Review • Publish • Archive          ║   │
│  ║                                                ║   │
│  ║  [Start Your Coop] [Learn More]                ║   │
│  ╚════════════════════════════════════════════════╝   │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │ The Problem                                      │ │
│  │ Knowledge is scattered across tools and tabs.   │ │
│  │ Context disappears. Good signals get lost.      │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │ How It Works                                     │ │
│  │ 1. 🔍 Capture from browser tabs                 │ │
│  │ 2. 📋 Review with your team weekly              │ │
│  │ 3. 📢 Publish to your shared knowledge base     │ │
│  │ 4. 🗂️  Archive with proofs                      │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │ Setup Ritual - Four Lenses                       │ │
│  │                                                  │ │
│  │ [Card] Capital      [Card] Impact               │ │
│  │ Formation          Reporting                    │ │
│  │                                                  │ │
│  │ [Card] Governance   [Card] Knowledge            │ │
│  │ Coordination       Garden                       │ │
│  │                                                  │ │
│  │ (Each card has prompt copy, copyable to AI)    │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  [Weekly Review Preview] [Privacy Model] [Footer CTA] │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### View 2: Receiver Pairing `/pair`

**Mobile device pairing flow**

```
┌────────────────────────────────────────┐
│ Receiver Pairing                       │
├────────────────────────────────────────┤
│                                        │
│ Accept pairing from extension?         │
│                                        │
│ Coop: "Friends Knowledge"              │
│ Room ID: abc123                        │
│ Expires: In 5 minutes                  │
│                                        │
│ [Accept Pairing]  [Reject]             │
│                                        │
│ (After accepting, redirects to        │
│  /receiver for capture)                │
│                                        │
└────────────────────────────────────────┘
```

### View 3: Receiver Capture `/receiver`

**Audio/photo/file capture UI**

```
┌────────────────────────────────────────┐
│ Capture for: Friends Knowledge         │
├────────────────────────────────────────┤
│                                        │
│ [🎙️ Record Voice]                      │
│ Recording interface or uploaded file   │
│                                        │
│ OR                                     │
│                                        │
│ [📷 Take Photo]                        │
│ Camera interface                       │
│                                        │
│ OR                                     │
│                                        │
│ [📎 Upload File]                       │
│ File picker                            │
│                                        │
│ Title: [input]                         │
│ Note:  [textarea]                      │
│                                        │
│ [Send to Coop]  [Cancel]               │
│                                        │
│ (Captures sync via WebSocket relay    │
│  to extension's receiver sync)         │
│                                        │
└────────────────────────────────────────┘
```

### View 4: Receiver Inbox `/inbox`

**Local capture list**

```
┌────────────────────────────────────────┐
│ Inbox                                  │
├────────────────────────────────────────┤
│                                        │
│ Synced Captures                        │
│                                        │
│ [Capture]                              │
│  • Voice: "Q1 priorities"              │
│  • Synced ✅                            │
│  • [View] [Delete]                     │
│                                        │
│ [Capture]                              │
│  • Photo: Meeting notes                │
│  • Syncing... ⏳                        │
│  • [View] [Delete]                     │
│                                        │
│ [Capture]                              │
│  • File: research.pdf                  │
│  • Synced ✅                            │
│  • [View] [Delete]                     │
│                                        │
│ Local count: 3 items                   │
│                                        │
└────────────────────────────────────────┘
```

### View 5: Board `/board/:coopId`

**React Flow visualization (read-only)**

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│   COOP BOARD VISUALIZATION                            │
│                                                        │
│   Lane 1        Lane 2      Lane 3     Lane 4         │
│   MEMBERS   →  CAPTURES  →  DRAFTS  →  ARTIFACTS     │
│                                                        │
│   [Alice]      [Finding    [Draft 1] [Published 1]   │
│                 1]                                    │
│   [Bob]        [Finding    [Draft 2] [Published 2]   │
│                 2]                                    │
│                [Finding                              │
│                 3]                                   │
│                                                        │
│   Lane 5      Lane 6                                   │
│   COOP     →  ARCHIVE                                │
│                                                        │
│   [Friends]   [Storage          ]                     │
│               [Receipt ✅]       │
│               [Proof on           │
│                Filecoin]         │
│                                                        │
│   [Summary: 2 members, 3 captures, 2 drafts,        │
│    2 artifacts, 1 in archive]                        │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow

### Extension Capture → Publish → Archive

```
┌─────────────────────────────────────────────────────┐
│ 1. CAPTURE                                          │
├─────────────────────────────────────────────────────┤
│ Browser tab   →  chrome.scripting.executeScript   │
│ Extracts headings, paragraphs, og:image           │
│ Becomes TabCandidate (saved to Dexie)             │
│                                                    │
├─────────────────────────────────────────────────────┤
│ 2. REVIEW (Roost tab)                              │
├─────────────────────────────────────────────────────┤
│ User edits TabCandidate in Roost                   │
│ Adds title, note, tags, selects target coop       │
│ Becomes ReviewDraft (ready to publish)             │
│                                                    │
├─────────────────────────────────────────────────────┤
│ 3. PUBLISH                                          │
├─────────────────────────────────────────────────────┤
│ User clicks [Publish] in Roost                      │
│ ReviewDraft → Artifact (added to Yjs doc)         │
│ Syncs to all connected members (WebRTC)            │
│ Artifact appears in Feed tab (all members see)     │
│                                                    │
├─────────────────────────────────────────────────────┤
│ 4. ARCHIVE                                          │
├─────────────────────────────────────────────────────┤
│ User clicks [Archive] or auto-archive enabled      │
│ Artifact bundle created (snapshot + metadata)      │
│ Uploaded to Storacha (Filecoin)                    │
│ Receipt saved locally (proof on-chain)             │
│                                                    │
└─────────────────────────────────────────────────────┘
```

---

## 📝 Key Files Reference

### Extension
- `background.ts` — Service worker orchestrator
- `views/Sidepanel/sidepanel-app.tsx` — Full UI (6 tabs)
- `views/Popup/popup-app.tsx` — Compact launcher
- `runtime/messages.ts` — Message types
- `runtime/config.ts` — Env var resolution

### App
- `app.tsx` — Root router
- `views/Landing/index.tsx` — Landing page
- `views/Board/index.tsx` — React Flow board
- `pairing-handoff.ts` — Pairing URL extraction
- `board-handoff.ts` — Board URL extraction

---

## 🎯 Quick Navigation

**Testing Flow 1 (Extension Basics)?**  
→ Open sidepanel, check Settings tab

**Testing Flow 2 (Coop Creation)?**  
→ Go to Coops tab, click [+ Create New Coop]

**Testing Flow 3 (Peer Sync)?**  
→ Use 2 profiles, both join same coop via invite

**Testing Flow 4 (Receiver Pairing)?**  
→ Go to Settings tab, [Generate New Pairing], scan QR

**Testing Flow 5 (Capture → Publish)?**  
→ Receive capture, move to Roost tab, click [Publish]

**Testing Flow 6 (Archive & Export)?**  
→ Settings tab, scroll to archive options, export receipt

---

**Last Updated:** 2026-03-16  
**Source:** `.claude/context/extension.md` and `.claude/context/app.md`
