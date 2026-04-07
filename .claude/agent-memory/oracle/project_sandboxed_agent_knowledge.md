---
name: Sandboxed agent knowledge environment research
description: Deep research on "YouTube Kids for AI agents" — graph memory, sandboxed sources, embedded runtimes, OpenClaw patterns. Informs Coop agent architecture evolution.
type: project
---

Afolabi initiated deep research on designing a sandboxed knowledge environment for AI agents (2026-04-05).

**Why:** Coop's agent already has a skill system (SKILL.md + knowledge.ts) with URL safety validation and a 3-tier inference cascade. The goal is to evolve this into a curated, allowlisted knowledge environment — restricting agent access to approved sources rather than open web — analogous to how YouTube Kids restricts content to safe channels.

**How to apply:** When working on agent architecture evolution (agent-os-roadmap.md), consider:
- Kuzu-WASM as browser-embedded graph DB for agent memory (runs in IndexedDB, has WASM build, npm: @kuzu/kuzu-wasm)
- LevelGraph as lighter alternative (triple store on IndexedDB, npm: levelgraph)
- OpenClaw's skill injection pattern (selective per-turn, not all-at-once) already partially mirrors Coop's approach
- MCP feed-mcp for RSS/Atom/JSON feed consumption as curated knowledge sources
- YouTube transcript APIs (youtube-caption-extractor for JS) for channel-restricted video knowledge
- GitHub Contents API + GitExtract for repo-scoped code knowledge
- NVIDIA's tiered access model: enterprise denylist + workspace allowlist + default-deny
- Zep/Graphiti temporal knowledge graph pattern for relationship-aware memory with validity windows
