# Hackathon Submission Checklist

Use this checklist to ensure Coop is ready for hackathon submission.

## Pre-Submission Validation

### Core Functionality
- [ ] Extension loads unpacked in Chromium without errors
- [ ] Anchor node starts successfully (`pnpm --filter @coop/anchor dev`)
- [ ] Can create a new coop and see share code generated
- [ ] Can join coop with share code from second browser profile
- [ ] WebSocket connection shows "joined" message in feed
- [ ] Tab capture adds item to activity feed
- [ ] Voice dictation records and transcribes
- [ ] AI skill processing returns results (or fallback)
- [ ] Feed items persist after browser refresh
- [ ] Drag-and-drop accepts images and text files

### Code Quality
- [ ] `pnpm check` passes for all packages
- [ ] `pnpm build` succeeds for all packages
- [ ] `pnpm lint` shows no critical errors
- [ ] Tests pass: `pnpm test` (where implemented)
- [ ] No hardcoded API keys in source code
- [ ] `.env.example` documents all required variables

### Documentation
- [ ] README.md explains what Coop does
- [ ] README.md has setup instructions
- [ ] Demo flows documented (docs/pitch/demo-flows.md)
- [ ] Architecture diagram exists (docs/architecture.md)
- [ ] Environment variables documented (.env.example)

### Repository Hygiene
- [ ] No node_modules committed
- [ ] No build artifacts in git (dist/ should be in .gitignore)
- [ ] Clean git history (no debug commits like "fix typo x5")
- [ ] No large binary files (>10MB)
- [ ] License file present (if required)

---

## Demo Video Script (3-5 minutes)

### Minute 1: The Problem & Solution (0:00-1:00)
**Hook**: "Community coordination is broken."
- Show messy group chats, lost documents, scattered notes
- Introduce Coop: "A browser-first knowledge commons"
- Show extension icon in toolbar

### Minute 2: Create & Join (1:00-2:00)
- Open sidepanel
- Create "Community Garden Project" coop
- Show share code: "No accounts, no passwords"
- Join from second browser (optional)

### Minute 3: Capture Evidence (2:00-3:30)
- Navigate to community impact article
- Click "Add current tab" - show rich extraction
- Start voice: "We planted 50 trees with 20 volunteers"
- Show both items in unified feed

### Minute 4: AI Processing (3:30-4:30)
- Select "impact-reporting" pillar
- Click "Process with AI"
- Show AI-generated:
  - Summary
  - Metrics (50 trees, 20 volunteers)
  - Actions
- Point out: "Transforms noise into structured data"

### Minute 5: Real-time & Closing (4:30-5:00)
- Show WebSocket sync between two browsers
- Mention: Four pillars, drag-and-drop, persistent storage
- Closing: "Coop turns browser tabs into community intelligence"

---

## Submission Assets

### Required
- [ ] Demo video (3-5 min, YouTube/Vimeo/Loom link)
- [ ] GitHub repo link (public)
- [ ] Brief description (150-200 words)

### Optional but Recommended
- [ ] Screenshots of key features
- [ ] Architecture diagram
- [ ] Team member bios
- [ ] Future roadmap slide

### Pitch Deck Structure (if required)
1. **Problem** (1 slide)
   - Community coordination chaos
   - Signal lost in noise

2. **Solution** (1 slide)
   - Coop = browser-first knowledge commons
   - Four pillars: impact, coordination, governance, capital

3. **Demo** (1-2 slides)
   - Screenshots or video stills
   - Key metrics: capture → process → share

4. **Technical** (1 slide)
   - Stack: Extension + Anchor + Shared packages
   - Three-layer storage architecture

5. **Impact** (1 slide)
   - Target users: community organizers, cooperatives
   - Use cases: mutual aid, bioregional coordination

6. **Roadmap** (1 slide)
   - PWA companion, on-chain registry, skill marketplace

---

## Environment Setup for Judges

If judges need to run locally:

```bash
# 1. Clone and install
git clone <repo-url>
cd coop
pnpm install

# 2. Configure environment
cp .env.example .env
# Edit .env with ANTHROPIC_API_KEY (optional - fallback works)

# 3. Start services
# Terminal 1: Anchor node
pnpm --filter @coop/anchor dev

# Terminal 2: Extension dev (optional)
pnpm --filter @coop/extension dev

# 4. Load extension
# Open chrome://extensions
# Enable developer mode
# Load unpacked: packages/extension/dist/
```

**Note for judges**: Fallback mode works without API keys for all features except AI inference.

---

## Common Submission Mistakes to Avoid

❌ **Don't**: Submit broken builds
✅ **Do**: Run full validation before submitting

❌ **Don't**: Forget documentation
✅ **Do**: Include README with setup instructions

❌ **Don't**: Make demo video too long
✅ **Do**: Keep under 5 minutes, focus on core loop

❌ **Don't**: Hardcode credentials
✅ **Do**: Use .env files, provide .env.example

❌ **Don't**: Ignore mobile/responsive
✅ **Do**: Sidepanel width ~400px, test on different screen sizes

---

## Post-Submission Actions

- [ ] Watch submission confirmation email
- [ ] Prepare for Q&A (review demo flows)
- [ ] Have backup demo plan (video if live fails)
- [ ] Monitor Discord/Slack for judge questions
- [ ] Prepare 1-slide "quick pitch" summary
