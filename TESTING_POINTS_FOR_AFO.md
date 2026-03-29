## Testing Highlights - March 29, 2026

### ✅ What Worked
- Successfully merged 4 UI polish feature branches (receiver-shell, capture-view, inbox-view, pwa-animations)
- Fixed 5 setup issues (ports, esbuild, match patterns, etc.)
- **Flow 2 Complete:** Created a coop successfully (despite WebAuthn warnings)
- Applied fix for Chrome match pattern error (#5) in `receiver-matches.ts`

### 🚨 Critical Issues (Blocking)
**Issue #12 - Extension freezes during tab capture**
- Attempted to add/capture a tab → extension immediately frozen, completely unresponsive
- Core functionality broken, testing halted

**Issue #11 - Agent-runner stuck-state (recurring)**
- Happened 3 times in single session
- Error: `[agent-runner] Stuck-state recovery: cycle has been running since... resetting`
- Pattern: Load → agent warning → freeze → reload → repeat

**Issue #13 - WebSocket connection failures**
- Error: `WebSocket is already in CLOSING or CLOSED state`
- Extension requires manual reload multiple times per session

**Root Cause:** Likely Agent Harness v2 - background cycles, WebSocket management, resource cleanup issues

### ⚠️ Other Issues Found

**Functional:**
- Issue #7: WebAuthn missing ES256/RS256 algorithms (warning appears repeatedly)

**UI/UX (fix once stable):**
- Issue #8: Chicken Yard not interactive (can't click chickens, no hover, pills overflowing)
- Issue #9: Can't differentiate buttons from stats (Signals, Stale, Drafts look identical)
- Issue #10: Terminology not explained (no tooltips for chickens, signals, stale, drafts)
- Issue #14: Screenshot form fields overflow popup (require horizontal scroll)
- Issue #6: Focus ring clipped by popup boundaries

### 💬 Key Feedback

**Terminology confusion:**
- "What ARE chickens? (tabs? drafts? knowledge pieces?) What are signals? What makes something stale?"
- No tooltips, no onboarding, no glossary

**UI issues:**
- Can't click chickens in the yard - they're just visual
- Filter pills overflowing into chicken area
- Can't tell what's clickable vs informational

**Coop creation:**
- "Make lenses customizable - select relevant ones, have a library of lenses, map inputs/outputs, maybe rename to 'workflows' instead of lenses"

### 📋 Single Link

**Streamlined Report:** https://github.com/regen-coordination/coop/blob/luiz/release-0.0-sync/TESTING_SESSION_2026-03-29.md

**Branch:** `luiz/release-0.0-sync`  
**Detailed docs:** `TESTING_SESSION_2026-03-29_DETAILED.md` (full issue documentation)

### 🎯 Bottom Line
Extension infrastructure broken. Basic functionality (tab capture) causes complete freeze. Agent system unstable. **Fix Issues #11-13 before any feature work.** UI/UX feedback valuable once stable.
