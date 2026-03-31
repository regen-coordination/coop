# Coop Testing Issues & Findings

**Testing Session Start:** 2026-03-16  
**Tester:** Luiz  
**Status:** In Progress  
**Target:** 6 core flows (extension basics → archive/export)

---

## Issue Template

When you find bugs or UX friction, copy this template and fill it in:

```markdown
### [Issue #] – [Title]

**Component:** [extension | pwa | sync | ui | other]  
**Severity:** [blocker | major | minor | polish]  
**Status:** [new | in-progress | fixed | deferred]

#### Steps to Reproduce
1. ...
2. ...

#### Expected
...

#### Actual
...

#### Environment
- Chrome version: [your version]
- Extension mode: [dev unpacked | chrome store]
- Onchain mode: [mock | live]
- Archive mode: [mock | live]
- Signaling: [local | production]

#### Screenshots/Logs
[Attach if relevant]

#### Notes
...
```

---

## Issues Found

### 🔴 BLOCKER – Coop Creation Fails with WebAuthn Credential Error

**File:** `ISSUE_001_COOP_CREATION_BLOCKER.md`

**Component:** extension / auth  
**Severity:** 🔴 **BLOCKER**  
**Status:** Open

Coop creation fails when clicking **Create** after filling the form. WebAuthn credential request returns "A request is already pending" or complains about missing algorithm identifiers. This blocks **Flows 2–6** (all dependent on having a coop).

**Impact:** 5 of 6 testing flows blocked.

---

### Issue 1 – No onboarding or welcome flow for first-time users

**Component:** extension / ui  
**Severity:** major  
**Status:** new

#### Steps to Reproduce
1. Load extension in Chrome for the first time
2. Open sidepanel

#### Expected
Some form of onboarding: welcome screen, quick tour, or guided intro explaining what Coop does and how to get started.

#### Actual
Sidepanel opens directly to the main view (summary strip + tabs). No onboarding, welcome, or first-use flow.

#### Notes
New users may feel lost without context.

---

### Issue 2 – No Settings/gear icon in sidebar; Nest Runtime buried in Nest Tools

**Component:** extension / ui  
**Severity:** major  
**Status:** new

#### Steps to Reproduce
1. Open sidepanel
2. Look for Settings or gear icon to check chain/modes (as SETUP_FOR_TESTING.md suggests)

#### Expected
Visible Settings (gear) icon in the header or sidebar for quick access to runtime config (chain, onchain mode, archive mode, signaling URL).

#### Actual
No gear icon in the sidebar. Runtime config (Nest Runtime) is inside the **Nest Tools** tab, not discoverable without clicking through.

#### Notes
SETUP_FOR_TESTING.md references a "gear icon" that does not exist. Users must know to open Nest Tools to see chain/modes.

---

### Issue 3 – Terminology (Roost, Flock, Nest, Loose Chickens) introduced without explanation

**Component:** extension / ui  
**Severity:** major  
**Status:** new

#### Steps to Reproduce
1. Open sidepanel
2. Observe labels: Roost, Flock sync, Active nest, Loose Chickens, Coop Feed, Flock Meeting, Nest Tools

#### Expected
Tooltips, help text, or a glossary explaining what these terms mean.

#### Actual
Terms appear without definition. New users must infer or click each tab to understand.

#### Reference (for Afo)
From brand metaphors: Tabs = "Loose Chickens", review queue = "Roost", shared feed = "Coop Feed", coop = "Nest", sync = "Flock sync", Nest Tools = settings/operator console.

---

### Issue 4 – "Local-first unless you share · Round-up: … · Local helper: …" text is confusing

**Component:** extension / ui  
**Severity:** minor  
**Status:** new

#### Steps to Reproduce
1. Open sidepanel
2. Read the line: "Local-first unless you share · Round-up: Only when you choose · Local helper: Quick rules only"

#### Expected
Clear formatting (bullets, separators, or structure) and plain explanation of what each phrase means.

#### Actual
Single unformatted string. Unclear whether it's features, principles, or status. "Round-up" and "Local helper" are jargon without inline explanation.

#### Notes
Semantically: Local-first = data stays local until shared; Round-up = when tabs are captured; Local helper = inference/agent capability.

---

### Issue 5 – Vertical tab layout forces select-then-scroll to see content

**Component:** extension / ui  
**Severity:** major  
**Status:** new

#### Steps to Reproduce
1. Open sidepanel
2. Tabs (Loose Chickens, Roost, Nest, etc.) are stacked vertically
3. Click a tab
4. Content appears below the tab strip

#### Expected
Content visible without scrolling after tab selection, or a layout that keeps tab and content in view (e.g., horizontal tabs at top with content below, or collapsible nav).

#### Actual
User must select a tab, then scroll down to see the tab’s content. Tab strip consumes vertical space; with many tabs, this compounds.

#### Notes
UX friction: extra scroll step on every tab switch.

---

### Issue 6 – Weak visual link between tab selection and content blocks

**Component:** extension / ui  
**Severity:** minor  
**Status:** new

#### Steps to Reproduce
1. Open sidepanel
2. Click different tabs (Loose Chickens, Roost, Nest, Coop Feed, etc.)
3. Observe the content area

#### Expected
Clear visual relationship: selected tab is obviously tied to the content shown. Sections/blocks within content are distinct from the tab bar.

#### Actual
Relationship between tab button and content is unclear. Users have to try each tab to learn what it does. Content blocks and tab bar lack strong visual hierarchy.

#### Notes
First-time users cannot anticipate tab behavior without experimentation.

---

### Issue 7 – Overall structure, navigation, and operation feel confusing

**Component:** extension / ui  
**Severity:** major  
**Status:** new

#### Summary
The overall structure, navigation, and operation of the sidepanel feel confusing. This is a meta observation that encompasses Issues 1–6: missing onboarding, buried settings, unexplained terminology, vertical tab layout, weak tab–content relationship, and unclear copy. Together they make it difficult to understand how to use Coop and where things live. The information architecture and interaction flow should be revisited and simplified.

#### Notes
Prioritize for Afo: structure/navigation redesign could address many of the individual issues above.

---

## Test Flow Progress

| Flow | Status | Notes |
|------|--------|-------|
| 1. Extension Basics | ✅ Partial Pass | 6 UX issues found; extension loads, no console errors. Nest Runtime in Nest Tools (no gear icon) |
| 2. Coop Creation | 🔴 BLOCKED | WebAuthn credential error when clicking Create. Blocker prevents all downstream flows. |
| 3. Peer Join & Sync | 🔴 BLOCKED | Requires coop (blocked by Flow 2) |
| 4. Receiver PWA Pairing | 🔴 BLOCKED | Requires coop (blocked by Flow 2) |
| 5. Capture → Review → Publish | 🔴 BLOCKED | Requires coop (blocked by Flow 2) |
| 6. Archive & Export | 🔴 BLOCKED | Requires coop (blocked by Flow 2) |

---

## Quick Checklist

Before filing each issue, verify:
- [ ] Extension was reloaded after build (`chrome://extensions` → reload icon)
- [ ] Correct `.env.local` configuration
- [ ] Signaling server running (if testing sync)
- [ ] Both profiles using compatible versions
- [ ] No conflicting extensions interfering

---

## Sign-Off Criteria

Testing phase complete when:
- [ ] All 6 core flows pass without blockers
- [ ] Issue list complete with severity classifications
- [ ] Feedback on website/PWA UX documented
- [ ] Afo has acknowledged issues for iteration

---

**Last Updated:** 2026-03-16 12:49 UTC
