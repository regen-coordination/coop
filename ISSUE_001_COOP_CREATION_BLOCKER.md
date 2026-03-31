# Coop Creation Blocking Bug Report

**Issue ID:** BLOCKER-001  
**Date:** 2026-03-16  
**Reporter:** Luiz (testing)  
**Severity:** 🔴 **BLOCKER**  
**Impact:** Prevents Flow 2 (Coop Creation) and blocks all downstream flows (3–6).  
**Status:** Open / Reported  

---

## Summary

Coop creation fails when clicking **Create** after filling the form and ritual. The UI does nothing or crashes, and the browser console shows WebAuthn / passkey credential errors. Coop creation cannot be completed in the current build.

---

## Steps to Reproduce

1. Open the Coop extension sidepanel in Chrome.
2. Go to the **Coops** tab.
3. Click **+ Create Coop**.
4. Select a preset (e.g., Friends, Personal).
5. Enter coop name (e.g., "Test Coop 1").
6. Complete the ritual (onboarding copy).
7. Fill "Your starter note" (as needed).
8. Click **Create**.

---

## Expected Behavior

- Coop is created successfully.
- Passkey registration completes, or the flow degrades gracefully when onchain mode is mock.
- UI shows success message or confirmation.

---

## Actual Behavior

- No visible change; creation appears to fail or crash.
- No success message or error toast.
- Coop is not created.
- Extension sidepanel remains on create form.

---

## Console Errors

### Error 1: Credential Request Already Pending
```
Failed to create credential. Details: A request is already pending.
```

### Error 2: Missing Algorithm Identifiers
```
publicKey.pubKeyCredParams is missing at least one of the default algorithm identifiers: ES256 and RS256. 
This can result in registration failures on incompatible authenticators.
```

**Stack trace origin:**
- `assets/pairing-BxLuB_Rj.js` (or similar hash-named bundle)
- viem/WebAuthn-related code path
- Likely in credential creation flow

---

## Technical Analysis

### Root Cause Candidates

#### Candidate 1: Missing Algorithm Identifiers
The `pubKeyCredParams` in WebAuthn credential creation options does not include both ES256 and RS256. Chromium documentation recommends including both for compatibility.

**Reference:** https://chromium.googlogle.com/chromium/src/+/main/content/browser/webauth/pub_key_cred_params.md

**Fix:** Ensure credential request includes:
```typescript
pubKeyCredParams: [
  { alg: -7, type: "public-key" },  // ES256
  { alg: -257, type: "public-key" }  // RS256
]
```

#### Candidate 2: Concurrent Credential Requests
A prior passkey/credential request is still pending, so a new one is rejected ("A request is already pending").

**Possible causes:**
- Previous failed credential request not cleaned up
- Race condition in credential creation flow
- Service worker state not reset between attempts

**Fix:** 
- Ensure credential requests have timeout handlers
- Cancel prior requests before starting new ones
- Reset auth state on creation failure

#### Candidate 3: Mock Mode Handling
Onchain mode is set to `mock`, but the credential creation flow might not check this and still attempts real WebAuthn.

**Fix:** If `VITE_COOP_ONCHAIN_MODE=mock`, skip WebAuthn or use mock credential response.

---

## Environment

- **Chrome:** (user's version)
- **Extension:** dev unpacked (`packages/extension/dist`)
- **Onchain mode:** Mock (`VITE_COOP_ONCHAIN_MODE=mock`)
- **Archive mode:** Mock (`VITE_COOP_ARCHIVE_MODE=mock`)
- **Session mode:** Off (`VITE_COOP_SESSION_MODE=off`)
- **App URL:** http://127.0.0.1:3002
- **API URL:** ws://127.0.0.1:4444

---

## Impact Assessment

### Blocked Flows
- ❌ **Flow 2: Coop Creation** – Primary blocker
- ❌ **Flow 3: Peer Sync** – Requires existing coop
- ❌ **Flow 4: Receiver Pairing** – Requires existing coop
- ❌ **Flow 5: Capture → Publish** – Requires existing coop
- ❌ **Flow 6: Archive & Export** – Requires existing coop

### Remaining Testable
- ✅ **Flow 1: Extension Basics** – Can check settings
- ✅ Limited PWA testing (landing page, pairing flow UI)
- ✅ Loose Chickens tab (passively captured candidates)

### Timeline Impact
Testing cannot progress to 5 of 6 core flows until this is resolved. Estimated impact: **100% of downstream testing blocked**.

---

## Related UX Issues (Non-blocking)

While investigating, the following UX issues were observed:

### Issue 2.1: Unclear Required Fields
- No visual indication (asterisks, "required" labels) of required form fields.
- Users may fill incomplete forms without knowing why Create is disabled.

**Suggestion:** Add asterisks or "required" labels to mandatory fields.

### Issue 2.2: Confusing "Starter Note" Field
- "Your starter note" text is vague.
- No examples or context provided.
- Users may not understand what to write.

**Suggestion:** Provide placeholder text, examples, or help tooltip explaining the field's purpose.

### Issue 2.3: Poor Discoverability of Create Coop
- Create Coop is under the **Coops** tab, but the entry point is not obvious.
- Users might miss the [+ Create Coop] button.
- No prominent onboarding hint for new users.

**Suggestion:** 
- Add a more prominent CTA when no coops exist.
- Consider an onboarding overlay for first-time users.
- Add tooltips or help text.

---

## Next Steps (For Afo)

1. **Immediate:** Check credential creation code in `packages/extension/src/runtime/` and `packages/shared/src/modules/auth/`.
2. **Check:** Verify `pubKeyCredParams` includes both ES256 and RS256.
3. **Check:** Verify mock mode short-circuits WebAuthn when appropriate.
4. **Check:** Ensure credential request timeouts and cleanup are in place.
5. **Test:** Attempt coop creation with local debugging (set breakpoints in credential creation).
6. **Regression:** Test coop creation on both fresh and existing profiles.

---

## Testing Notes

- Issue reported after freshly merged `origin/main`.
- Extension rebuilt and reloaded in Chrome.
- Same error occurs consistently across multiple create attempts.
- No transient issues observed; deterministic blocker.

---

**Reported by:** Luiz  
**Date:** 2026-03-16 14:32 UTC  
**Testing branch:** `luiz/release-0.0-sync`  
**Status:** Open / Awaiting Fix
