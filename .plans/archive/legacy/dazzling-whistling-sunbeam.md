# Landing Page — Fix Remaining Regressions + Address New Feedback

## Context

After an accidental `git checkout --` wiped the user's working CSS modifications, most changes have been reconstructed from session history (94 edits across 2 prior sessions). The page is now functional but several issues remain — both pre-existing bugs and items from the user's latest walkthrough feedback.

**File**: `packages/app/src/styles.css` (CSS only — no TSX changes needed)

---

## Current State (verified via screenshots)

| Section | Status | Issues |
|---------|--------|--------|
| Hero | Mostly good | Thought bubbles low contrast/legibility |
| How Coop Works | Card on LEFT (correct) | Card 04 cut off at bottom; blank transition before GSAP kicks in |
| Curate Your Coop | Cards are flat (correct) | Heading + cards don't fully fit 1280x667 viewport |
| Why We Build | Scene-based layout restored | Team avatars overlap heading card; card gets cut off by Curate section |
| Night scene/coop | Looks great | Darker sky working; chickens in house visible |

---

## Fixes (ordered by impact)

### Fix 1: Why We Build — team overlap with heading card
The team label (`top: 22%`) and avatars (`top: 26%`) are too close to the heading card (`top: 8%`). On 667px viewport, the card bottom reaches ~19%, leaving only ~3% gap before team starts.

**Change**: Move `.scene-team-label` top from `22%` → `34%`, and all `.scene-team-*` positions from `top: 26%` → `top: 40%`.

### Fix 2: How Coop Works — viewport fit
Card 04 is cut off. The works-panel padding and how-works-shell sizing need tightening to fit 4 cards within 667px viewport.

**Change**: Reduce `.works-panel` padding-top from inherited `5.5rem` to `3.5rem`. Consider reducing `.how-works-shell` padding from `1rem 1.3rem` to `0.8rem 1.1rem` if still overflowing.

### Fix 3: Curate Your Coop — viewport fit
The heading + ritual-game-shell don't fit in 1280x667. The `--flashcard-card-height` at `clamp(9.5rem, 15vw, 13rem)` may still be too tall with the heading above.

**Change**: Reduce `--flashcard-card-height` to `clamp(8.5rem, 13vw, 11.5rem)`. Verify heading + cards + progress hint all fit.

### Fix 4: Thought bubble legibility
Bubbles are small and low contrast. The user asked for "more opacity."

**Change**: On `.thought-bubble`, increase background opacity from `0.96` → `1`, add slightly stronger `box-shadow`, and bump `font-size` for `.thought-text` from `0.74rem` → `0.8rem`.

### Fix 5: Flashcard focus-backdrop z-index (from session 21dc edits 24-26)
These were in the prior session but not fully reconstructed. The backdrop needs `z-index: 1` and the stage needs `z-index: 2` for proper layering.

**Change**: Add `z-index: 1` to `.flashcard-focus-backdrop`, add `z-index: 2` to `.flashcard-stage`.

---

## Items NOT in this plan (require separate planning)

These are from the user's latest audio feedback and need architectural/GSAP changes, not just CSS:

- **Scroll-locking**: Needs GSAP ScrollTrigger `pin` (per memory), not CSS scroll-snap
- **More chicken motion during scroll**: Requires GSAP timeline adjustments in `index.tsx`
- **Chicken-to-coop walk animation regression**: GSAP arrival timeline in `index.tsx`
- **How Coop Works positioning**: User wants it on LEFT (already done), but also wants chickens to interact more on the right during scroll (GSAP)

---

## Verification

After each fix:
1. Screenshot the affected section at 1280x667
2. Verify no overflow beyond viewport bottom
3. Check adjacent sections for regressions
4. Run `bun run validate typecheck` as sanity check

---

## Files to modify

- `packages/app/src/styles.css` — all 5 fixes are CSS-only
