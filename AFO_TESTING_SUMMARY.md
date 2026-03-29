# Testing Session Summary for Afo - March 29, 2026

**Branch:** `luiz/release-0.0-sync`  
**Full Report:** https://github.com/regen-coordination/coop/blob/luiz/release-0.0-sync/TESTING_SESSION_2026-03-29.md (1,580 lines, comprehensive details)

---

## 🚨 CRITICAL: Extension Stability Issues (BLOCKERS)

### Issue #12: Extension FREEZES during tab capture
**Status:** 🚨 **TESTING HALTED**  
**Trigger:** Attempted to capture/add a tab (basic functionality)  
**Result:** Extension becomes completely unresponsive, can't click anything  
**Impact:** Core feature broken, cannot test Flows 3-6  
**Priority:** **P0 - STOP all other work, fix this first**

### Issue #11: Agent-runner stuck-state (RECURRING)
**Status:** Happened **3 times** in single session  
**Error:** `[agent-runner] Stuck-state recovery: cycle has been running since... resetting`  
**Impact:** Background processes unstable, likely causes #12 freeze  
**Priority:** **P0 - Systemic problem, investigate Agent Harness v2**

### Issue #13: WebSocket connection failures
**Error:** `WebSocket is already in CLOSING or CLOSED state`  
**Impact:** Extension requires manual reload multiple times per session  
**Priority:** **P0 - Connection management broken**

**Pattern:** Extension loads → works briefly → agent stuck-state warning → freeze/crash → requires reload → repeat  
**This is NOT normal extension behavior.**

---

## 🔧 Technical Fix Applied (By Tester)

**Issue #5: Chrome match pattern error** - FIXED  
- **Problem:** Extension wouldn't load - `Invalid match pattern "http://127.0.0.1:3001/*": Hostname cannot include a port`
- **Fix:** Removed port from match pattern in `packages/extension/src/build/receiver-matches.ts`
- **Changed:** `${url.origin}/*` → `${url.protocol}//${url.hostname}/*`

---

## 🎨 UI/UX Issues Discovered (Non-Critical But Important)

### Issue #8: Chicken Yard not interactive
- Visual chickens represent drafts but **can't click them**
- No hover effects, no tooltips explaining what they are
- Filter pills (Signals, Stale, Drafts) **overflowing** into yard area

### Issue #9: Can't tell buttons from stats
- "Signals", "Stale", "Drafts 2" all look identical
- Don't know which are clickable buttons vs informational labels
- No visual affordance (hover states, different styling)

### Issue #10: Terminology not explained  
❓ "What ARE chickens?" (tabs? drafts? knowledge pieces?)  
❓ "What are signals?" (priority items? notifications?)  
❓ "What makes something stale?" (old? expired?)  
❓ "What's the difference between drafts and chickens?"  

**No tooltips, no onboarding, no glossary.**

### Issue #6: Focus ring clipped
- Orange focus highlight cut off by popup boundaries
- Visual polish issue

### Issue #14: Screenshot form overflow
- Form fields extend beyond popup width
- Must scroll horizontally to see full content
- Responsive design issue

---

## ⚠️ WebAuthn Warning (Functional But Should Fix)

### Issue #7: Missing ES256 and RS256 algorithms
**Error:** `publicKey.pubKeyCredParams is missing at least one of the default algorithm identifiers: ES256 and RS256`
**Status:** ⚠️ Coop created successfully BUT warning appears  
**Recurrence:** Happened multiple times during testing  
**Fix:** Add to credential options in auth.ts

---

## 📊 Session Stats

**Flows Tested:**
- ✅ Flow 1: Extension Basics - Started, discovered issues
- ✅ Flow 2: Coop Creation - **SUCCESS** (coop created despite warnings)
- ⏸️ Flows 3-6: **BLOCKED** by Issue #12

**Issues Documented:** 14 total
- 5 Setup issues - ✅ Fixed
- 6 UI/UX issues - 🟡 Open
- 3 Stability issues - 🚨 Critical (including #12 blocker)

**Report Length:** 1,580 lines with full reproduction steps, error messages, screenshots, and recommendations

---

## 🎯 Immediate Action Required

**STOP all feature work. Focus entirely on:**

1. **P0:** Fix Issue #12 - Extension freeze (BLOCKER)
2. **P0:** Fix Issue #11 - Agent stuck-state (recurring)
3. **P0:** Fix Issue #13 - WebSocket errors
4. **P1:** Fix Issue #7 - WebAuthn algorithm warning

**Then:**
5. Add terminology tooltips/onboarding (Issue #10)
6. Make Chicken Yard interactive (Issue #8)
7. Differentiate buttons from stats (Issue #9)

---

## 💬 Key User Feedback

**On "Curate your coop":**
> "Make more customizable - select which lenses are relevant for the group, have a library of lenses, be able to map out and connect inputs and outputs of lenses, maybe rename to 'workflows' instead of lenses"

**On terminology confusion:**
> "There are a lot of terms that are not properly introduced, explained - ie what the chickens are representing, signals, stale, draft 2"

**On button confusion:**
> "Can't click on anything inside of it (the chickens) and also no hover. The buttons/pills instead of it are overflowing into the chickens element"

---

## 🔗 Quick Links

**Full Testing Report (1,580 lines):**  
https://github.com/regen-coordination/coop/blob/luiz/release-0.0-sync/TESTING_SESSION_2026-03-29.md

**Setup Guide:**  
https://github.com/regen-coordination/coop/blob/luiz/release-0.0-sync/TESTING_SETUP_2026-03-29.md

**Merge Session Report:**  
https://github.com/regen-coordination/coop/blob/luiz/release-0.0-sync/SESSION_REPORT_2026-03-29.md

**Branch:** `luiz/release-0.0-sync`  
**Latest Commit:** `910e46c` - docs(testing): comprehensive testing session report

---

## 📋 Bottom Line

**The extension cannot be tested in current state.**  
Basic functionality (tab capture) causes complete freeze.  
Agent system is unstable.  
WebSocket connections fail.  
Requires manual reload multiple times per session.  

**Fix the infrastructure (Issues #11, #12, #13) before any feature work.**  

Once stable, the UI/UX feedback (Issues #6, #8, #9, #10, #14) is valuable for polish.

---

*Testing session by Luiz - March 29, 2026*  
*Ready to resume testing once stability issues resolved*
