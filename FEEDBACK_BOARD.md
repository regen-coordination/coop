# Testing Report – Board Visualization

**Date:** 2026-03-16  
**Tester:** Luiz  
**URL:** http://127.0.0.1:3002/board (or /board/:coopId)

## Summary

Board view cannot be fully tested without an active coop. The page shows a placeholder explaining that a "coop snapshot" is required. The concept of "coop snapshot" and the page's purpose are unclear. ReactFlow board does not load. Testing paused until coop creation works and board is accessible.

---

## What We See (Without Coop)

- **Heading:** "READ-ONLY BOARD"
- **Message:** "The board needs a coop snapshot"
- **Instruction:** "Open the board from the extension sidepanel so it can hand off a member-scoped snapshot."
- **Visual:** Empty dashed-circle placeholder where the board would render
- **CTA:** "Back to landing" button

---

## Issues Found

### Unclear terminology: "coop snapshot"
- Term not explained; users won't know what it is
- "Member-scoped snapshot" in the instruction adds jargon without definition
- Page purpose (why you'd open it, what you'd see) is not clear

### ReactFlow board not loaded
- No board visualization visible
- Empty placeholder instead of node lanes, edges, etc.

### Requires active coop
- Board needs an active coop + snapshot from the extension sidepanel
- Cannot test board functionality until Flow 2 (coop creation) is unblocked

---

## Recommendations

1. Add plain-language explanation: what a coop snapshot is, why it's needed, and what the board shows (e.g., members, captures, drafts, artifacts, archives).
2. Clarify prerequisites: "You need an active coop. Open the board from the extension to load it."
3. Keep the placeholder for now, but make the copy more user-friendly.

---

## Status

**Deferred** – Will re-test when:
- Coop creation (Flow 2) works
- Board loads with a valid coop snapshot
- ReactFlow visualization is visible

---

**Last Updated:** 2026-03-16
