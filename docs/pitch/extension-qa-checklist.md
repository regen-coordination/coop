# Extension Manual QA Checklist

Complete this checklist before each release or demo to ensure the extension works correctly.

## Installation & Setup

- [ ] Extension loads without errors in chrome://extensions
- [ ] Service worker starts successfully (check background page console)
- [ ] Content script injects on all URLs
- [ ] Sidepanel opens from extension icon click
- [ ] Popup shows "Open side panel" message

## User Interface

- [ ] Display name input field accepts text
- [ ] Display name persists across sessions
- [ ] Create Coop section visible when no active coop
- [ ] Join Coop section visible when no active coop
- [ ] Active Coop info displays when joined
- [ ] Share code visible and copyable

## Coop Lifecycle

### Create Coop
- [ ] Can enter coop name
- [ ] Create button disabled without display name
- [ ] Create button disabled without coop name
- [ ] Clicking Create generates share code
- [ ] Active Coop section updates immediately
- [ ] Coop info persists after refresh

### Join Coop
- [ ] Can enter share code (auto-uppercase)
- [ ] Join button disabled without display name
- [ ] Join button disabled without share code
- [ ] Clicking Join connects to existing coop
- [ ] Active Coop section shows joined coop details
- [ ] Can see existing feed items after join

## Capture Features

### Tab Capture
- [ ] "Add current tab" button disabled without active coop
- [ ] Clicking button captures current page
- [ ] Rich extraction includes:
  - [ ] Page title
  - [ ] URL
  - [ ] Text snippet
  - [ ] Article content (if available)
- [ ] Item appears in Activity Feed
- [ ] Captured data broadcasts via WebSocket

### Voice Dictation
- [ ] Button shows "Speech API not available" if unsupported
- [ ] Button disabled without active coop
- [ ] Clicking "Start voice dictation" begins recording
- [ ] Button changes to "Stop recording" (red) during recording
- [ ] Live transcript updates during recording
- [ ] Clicking "Stop recording" ends session
- [ ] Final transcript appears in Activity Feed
- [ ] Item persists after refresh

### Drag & Drop
- [ ] Drop zone accepts image files (png, jpg, gif)
- [ ] Drop zone accepts text files (txt, md)
- [ ] Visual feedback on drag over (green highlight)
- [ ] Image metadata captured (name, size, data URL)
- [ ] Text file content captured
- [ ] Items appear in Activity Feed
- [ ] Large files handled gracefully

## Activity Feed

- [ ] Feed displays in reverse chronological order
- [ ] Each item shows type and timestamp
- [ ] Tab captures show title
- [ ] Voice transcriptions show preview text
- [ ] File drops show filename
- [ ] Feed scrolls if many items
- [ ] WebSocket updates appear without refresh

## Skill Processing

- [ ] Pillar selector shows all 4 options:
  - [ ] impact-reporting
  - [ ] coordination
  - [ ] governance
  - [ ] capital-formation
- [ ] Can change selected pillar
- [ ] "Process with AI" button on each feed item
- [ ] Button disabled while processing
- [ ] Shows "Processing..." state
- [ ] Displays AI results when complete:
  - [ ] Summary
  - [ ] Actions list
  - [ ] Stakeholders (if applicable)
  - [ ] Metrics (if applicable)
- [ ] Shows error message if processing fails
- [ ] Fallback mode works without API key

## WebSocket & Real-time

- [ ] Connects to ws://localhost:8788 on startup
- [ ] Shows "joined" message after joining coop
- [ ] Receives broadcasts from other users
- [ ] Other users' captures appear in real-time
- [ ] Reconnects automatically if connection drops
- [ ] Disconnects cleanly on extension unload

## Data Persistence

- [ ] Active coop persists after browser restart
- [ ] Feed items persist in IndexedDB
- [ ] Settings (display name) persist
- [ ] Can clear data via chrome.storage API

## Error Handling

- [ ] Graceful handling when anchor node offline
- [ ] Clear error messages for failed API calls
- [ ] Fallback to local storage when anchor unavailable
- [ ] Invalid share code shows helpful error
- [ ] Missing permissions handled gracefully

## Performance

- [ ] Sidepanel opens within 1 second
- [ ] Tab capture completes within 2 seconds
- [ ] Voice transcription displays in real-time
- [ ] AI processing shows loading state (not frozen)
- [ ] Feed scrolls smoothly with 50+ items
- [ ] No memory leaks over extended use (30+ min)

## Cross-Browser (if applicable)

- [ ] Chrome: All features work
- [ ] Edge: All features work
- [ ] Brave: All features work (check shield settings)
- [ ] Firefox: TBD (Manifest V3 support)

## Accessibility

- [ ] All buttons have readable labels
- [ ] Color contrast meets WCAG 2.1 AA
- [ ] Keyboard navigation works (Tab, Enter, Space)
- [ ] Screen reader compatible (alt text, ARIA labels)
- [ ] Focus indicators visible

## Security

- [ ] No XSS vulnerabilities in feed rendering
- [ ] Content Security Policy respected
- [ ] No sensitive data in localStorage (use IndexedDB)
- [ ] WebSocket connections to expected origin only
- [ ] No eval() or innerHTML with user content

---

## Regression Testing

After any code change, verify these core flows still work:

1. **Fresh Install Flow**
   - Install extension → Create coop → Capture tab → Process skill

2. **Join Existing Flow**
   - Clear storage → Join with code → See existing feed → Add capture

3. **Offline Recovery Flow**
   - Start with anchor online → Stop anchor → Verify local persistence → Restart anchor → Verify sync

4. **Multi-User Flow**
   - User A creates coop → User B joins → Both add captures → Both see all items

---

## Notes

**Last Tested**: _TODO: Date_
**Browser Version**: _TODO: e.g., Chrome 123_
**Extension Version**: _TODO: e.g., 0.1.0_
**Tester**: _TODO: Name_

**Known Issues**:
- _TODO: Document any issues found_

**Fixed Since Last Test**:
- _TODO: Document fixes_
