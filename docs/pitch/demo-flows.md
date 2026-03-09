# Coop Demo Flows

Quickstart guide for demonstrating Coop's core features to users, investors, and hackathon judges.

## Prerequisites

1. **Environment Setup**
   ```bash
   # Copy and fill in your environment variables
   cp .env.example .env
   # Edit .env with your:
   # - ANTHROPIC_API_KEY (for AI inference)
   # - STORACHA_KEY (optional, for cold storage)
   ```

2. **Start the Anchor Node**
   ```bash
   pnpm --filter @coop/anchor dev
   # Server will run on:
   # - REST API: http://localhost:8787
   # - WebSocket: ws://localhost:8788
   ```

3. **Load the Extension**
   - Open Chrome/Edge and go to `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select `packages/extension/dist/`
   - Pin the Coop extension to your toolbar

---

## Demo Flow 1: Create and Join a Coop

**Goal**: Show community formation through share codes

### Steps

1. **Open Sidepanel**
   - Click the Coop extension icon
   - Click "Open side panel" from the popup
   - The sidepanel opens with a simple interface

2. **Create a Coop**
   - Enter your display name: "Alice (Demo)"
   - Enter a coop name: "Community Garden Project"
   - Click "Create"
   - Watch the share code generate (e.g., "A7B9C2D4")
   - Point out: "This code is how others join - no accounts needed"

3. **Join from Another Profile** (Optional)
   - Open a second Chrome profile or incognito
   - Load extension there too
   - Enter display name: "Bob (Demo)"
   - Enter the share code from step 2
   - Click "Join"
   - Show both users see the same coop

**Key Points to Highlight**:
- No registration or login required
- Share codes = instant community formation
- All data is coop-scoped by default

---

## Demo Flow 2: Capture & Process Evidence

**Goal**: Show the full loop: capture → AI analysis → collaborative feed

### Steps

1. **Capture a Web Page**
   - Navigate to any article about community impact (e.g., "Local volunteers plant 100 trees")
   - In the sidepanel, click "Add current tab (with Readability)"
   - Show the captured item appears in the Activity Feed
   - Point out: "It extracts the full article content, not just the URL"

2. **Add Voice Evidence**
   - Click "Start voice dictation (continuous)"
   - Speak: "Just finished the community cleanup, collected 50 pounds of recycling with 12 volunteers"
   - Click "Stop recording"
   - Show the transcript appears in the feed

3. **Process with AI**
   - In the "Skill Processing" section, select "impact-reporting" pillar
   - Click "Process with AI" on the voice item
   - Wait 2-3 seconds for Anthropic API response
   - Show the AI-generated:
     - Impact summary
     - Extracted metrics (50 pounds, 12 volunteers)
     - Suggested actions

**Key Points to Highlight**:
- Continuous voice = natural workflow
- AI extracts structured data from unstructured input
- Multiple content types (tabs, voice) unified in one feed

---

## Demo Flow 3: Real-time Collaboration

**Goal**: Show WebSocket relay and multi-user sync

### Steps

1. **Set Up Two Users**
   - User A: Create coop "Emergency Response Team"
   - User B: Join with share code

2. **Live Capture Race**
   - Both users: navigate to different emergency preparedness articles
   - Both click "Add current tab" simultaneously
   - Show both captures appear in both feeds instantly
   - Point out: "No refresh needed - WebSocket relay broadcasts in real-time"

3. **Skill Processing Race**
   - Both users click "Process with AI" on different items
   - Show parallel processing with different pillars
   - User A: impact-reporting on a tab
   - User B: coordination on a voice note

**Key Points to Highlight**:
- WebSocket = real-time collaboration
- SQLite backend persists everything
- Each user can process with different skill pillars

---

## Demo Flow 4: Drag & Drop File Capture

**Goal**: Show rich media support

### Steps

1. **Prepare Files**
   - Have an image file ready (e.g., community-event-photo.jpg)
   - Have a text file ready (e.g., meeting-notes.md)

2. **Drop Images**
   - Drag image into the "Drag & drop images or text files here" area
   - Watch it highlight in green
   - Drop it
   - Show image appears in feed with metadata

3. **Drop Text Files**
   - Drag the .md file into the same area
   - Show content appears in feed
   - Click "Process with AI" to analyze

**Key Points to Highlight**:
- Multiple input modalities (web, voice, files)
- Unified processing pipeline
- All content types treated equally

---

## Demo Flow 5: Skills Deep Dive (Advanced)

**Goal**: Show all four pillars in action

### Prepare Content
- 4 different pieces of content ready:
  1. Impact story ("We planted 50 trees with 20 volunteers")
  2. Coordination need ("Need to schedule the monthly review")
  3. Governance question ("Should we change the meeting time?")
  4. Funding opportunity ("Grant deadline approaching, need $5000")

### Steps

1. **Process Each with Right Pillar**
   - Impact item → impact-reporting pillar
   - Show: metrics extraction, evidence links
   
   - Coordination item → coordination pillar  
   - Show: action extraction, stakeholder suggestions
   
   - Governance item → governance pillar
   - Show: decision framework, options
   
   - Capital item → capital-formation pillar
   - Show: funding signal detection, next steps

**Key Points to Highlight**:
- Four pillars = four lenses on community work
- Same input, different structured output per pillar
- AI understands community context

---

## Troubleshooting Quick Reference

### Extension Won't Load
- Check `packages/extension/dist/` exists after build
- Verify manifest.json is present
- Try reloading the extension in `chrome://extensions`

### Anchor API Not Responding
- Check ports 8787 (REST) and 8788 (WS) are free
- Verify `.env` file exists
- Check terminal for startup errors

### AI Processing Fails
- Verify `ANTHROPIC_API_KEY` in `.env`
- Check API key has credits
- Fallback mode works without API key (shows baseline extraction)

### WebSocket Not Syncing
- Check browser console for connection errors
- Verify both users joined same coop
- Check that `ANCHOR_WS_PORT` is accessible

---

## Timing Guide

| Flow | Duration | Best For |
|------|----------|----------|
| Flow 1: Create/Join | 2-3 min | Quick intro |
| Flow 2: Capture/Process | 5-7 min | Full feature demo |
| Flow 3: Real-time Collab | 3-4 min | Technical depth |
| Flow 4: File Drop | 2 min | Input variety |
| Flow 5: Skills Deep Dive | 5-8 min | Pillar differentiation |

**Recommended Full Demo**: Flow 1 + Flow 2 + Flow 3 (10-14 minutes)

---

## Post-Demo Questions You Should Be Ready For

1. **"How is this different from Slack/Discord?"**
   - Focus: structured capture, AI processing, no accounts

2. **"What about privacy?"**
   - Focus: local-first, coop-scoped data, optional cold storage

3. **"Can it work offline?"**
   - Focus: IndexedDB persistence, sync when reconnected

4. **"How do skills work?"**
   - Focus: pillar-based routing, AI + baseline extraction

5. **"What's the business model?"**
   - Focus: public good infrastructure, optional managed anchor nodes
