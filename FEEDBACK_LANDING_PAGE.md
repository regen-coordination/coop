# Testing Report – Landing Page

**Date:** 2026-03-16  
**Tester:** Luiz  
**URL:** http://127.0.0.1:3002/  
**Source:** ALTERNATIVE_TESTING_GUIDANCE.md §1

---

## Summary

Full review of landing page sections: hero, CTAs, How It Works, ritual prompts, extension states, weekly review, footer. Overall: spacing issues, topbar too large, too much text vs visuals, CTA logic unclear, several sections need refinement.

---

## Issues Found

### 1. Spacing issues
Several elements have off spacing:
- **Quiet note** (`div.quiet-note`): "Landing page sound stays off by default. Coop's core AI loop stays browser-local."
- **CTA row** (`div.cta-row`): "Start quick hatch" + "Install extension" buttons
- **State card** (`article.state-card`): "Error / Offline — Permissions, sync, or local model availability need attention before the loop is healthy."
- **Nest card** (`article.nest-card`): "Install extension" — text truncation ("The full install and rollout guid...")

### 2. Topbar navigation
- Seems random / unclear
- Too big — takes excessive space

### 3. Hero CTAs – "Start quick hatch" vs "Install extension"
- Having both buttons together may not make sense
- If you cannot do a quick hatch without the extension installed, why show both? One likely depends on the other — clarify order or combine into a single flow

### 4. Too much text, too few visuals
- Page is mostly text
- Needs more diagrams, visuals, illustrations, or other visual elements to break up content and improve comprehension

### 5. Presentation mockups — integration opportunities
- **How It Works** section: Consider integrating presentation mockups to illustrate the 4-step loop (Start coop → Members browse → Coop rounds up context → …)
- **"Give Coop a little context"** section: Mockups could help explain the ritual / setup flow

### 6. "Use an outside helper for the deeper questions" section
- **Unclear**: What should I do with it? Where do I put it? At what stage?
- **Too many questions** for the user to answer
- **Space**: Occupies too much of the landing page
- **Recommendation**: Move to a collapsible section (toggle) with a quick "Copy" button for the prompt

### 7. Extension states
- **"Four icon states keep the extension legible"**
- States should be **colour coded** for quick visual distinction (idle, watching, review-needed, error-offline)

### 8. "See the coop in action before you install anything"
- **Confusing**: Sounds like there should be links or a demo, but nothing obvious
- **Recommendation**: Add links to a demo or video; consider including a mockup/preview

### 9. Footer links vs header
- Footer: "Create coop • Join coop • Install guide • Demo runbook • Design direction • Audio ops"
- Does not match header navigation
- Should footer mirror header, or is the mismatch intentional? Clarify for consistency

---

## Recommendations

1. **Spacing**: Audit and fix spacing on quiet-note, cta-row, state-cards, nest-cards
2. **Topbar**: Reduce size, simplify or clarify navigation
3. **CTAs**: Either sequence "Install extension" before "Start quick hatch," or replace with a single primary CTA
4. **Visuals**: Add diagrams, illustrations, or mockups to How It Works, ritual, and extension states
5. **Outside helper prompt**: Collapse into a toggle with Copy button; clarify purpose and when to use it
6. **Extension states**: Colour code each state for quick recognition
7. **"See the coop in action"**: Add links (demo, video) and/or a mockup
8. **Footer**: Align with header navigation or document why they differ

---

## Production Readiness

| Dimension        | Score | Notes                                      |
|------------------|-------|--------------------------------------------|
| Clarity          | TBD   | Several sections unclear (outside helper, CTAs) |
| Visual polish    | TBD   | Spacing issues, text-heavy                  |
| Overall          | TBD   | Needs refinement before production         |

---

**Status:** Feedback complete. Ready for Afo review.
