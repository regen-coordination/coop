# Coop — The Synthesis Hackathon Registration Package

> **Status**: Ready to submit — building ends March 22! 🚨  
> **Project**: Coop (not "cop" — it's chicken-themed 🐓)  
> **Human**: Luiz Fernando Segala Gomes  
> **Team**: Create new — "Regen Coordination"

---

## Quick Submit — Copy-Paste Ready

**Registration URL**: https://synthesis.md

### Your Details
| Field | Value |
|-------|-------|
| **Full Name** | Luiz Fernando Segala Gomes |
| **Email** | *(add your email)* |
| **Project Name** | Coop |
| **Team** | Create new: **"Regen Coordination"** |

### Optional Fields
| Field | Value |
|-------|-------|
| **Twitter/Farcaster** | @regencoordinate |
| **Background** | Industrial Engineering / Corporate Finance / Product & Project Management / DAO Operations |
| **Crypto Experience** | Yes |
| **AI Agent Experience** | Yes |
| **Coding Comfort** | 2 (human), agent swarm handles technical execution |

---

## Project Description (Copy-Paste for Registration Form)

> Coop is a browser-native knowledge commons for regenerative coordination — a browser extension + companion PWA that captures scattered info (tabs, voice memos, photos, files, links), refines it with local AI running entirely in-browser via WebGPU, and shares via P2P "coops" backed by Safe multisigs on Arbitrum. Every artifact can be archived permanently to Filecoin via Storacha with cryptographic provenance.
>
> Built for communities to move from context → coordination → evidence → capital. No cloud servers, no API keys, no data extraction. Local-first, passkey-identity, zero-knowledge privacy.

### Problem Statement

Communities trying to coordinate regenerative action face scattered knowledge: browser tabs pile up with funding leads you'll forget by Friday, voice memos go unshared, photos from meetings stay on individual phones. No shared memory membrane means context dies with individuals. Centralized platforms extract value and surveillance. Coop provides a local-first, P2P coordination membrane with on-chain accountability.

### Why Coop Fits The Synthesis

Coop demonstrates agents with **verifiable identity** (ERC-8004), **local inference** (WebGPU/WASM, zero cloud calls), **shared memory** (Yjs CRDTs), and **on-chain execution** (Safe + ERC-4337) — all without trusting centralized infrastructure.

| Synthesis Theme | Coop Implementation |
|----------------|---------------------|
| **Agents that pay** | ERC-8004 registry + ERC-4337 smart sessions for scoped, time-bounded agent execution with human approval |
| **Agents that trust** | P2P sync via Yjs CRDTs — no centralized registries. Room secret = trust boundary. HMAC-SHA256 auth |
| **Agents that cooperate** | Safe multisigs + policy engine for neutral enforcement. CRDT shared state = agents share memory |
| **Agents that keep secrets** | Local-first (all data stays in browser), Semaphore ZK proofs, ERC-5564 stealth addresses |

---

## Technical Highlights

### Architecture
- **Bun monorepo** with 4 packages: `@coop/shared`, `@coop/app`, `@coop/extension`, `@coop/api`
- **16+ domain modules**: agent, archive, auth, coop, erc8004, greengoods, onchain, operator, permit, policy, privacy, receiver, session, stealth, storage
- **AI Agent**: 14-skill pipeline with Qwen2.5-0.5B-Instruct running locally via WebGPU/WASM — no API keys, zero cloud calls
- **Sync**: Yjs CRDTs + y-webrtc for P2P, conflict-free real-time collaboration
- **Identity**: WebAuthn passkeys bridged to Safe smart accounts via ERC-4337
- **Privacy**: Semaphore ZK membership proofs + ERC-5564 stealth addresses
- **Archive**: Storacha/Filecoin permanent storage with verifiable CID provenance
- **On-chain**: Safe multisigs on Arbitrum (production) / Sepolia (test)

### Key Standards
- ERC-4337 (account abstraction), ERC-1271 (signature validation), EIP-712 (typed data)
- ERC-7579 (modular smart accounts), ERC-5564 (stealth addresses)
- ERC-8004 (on-chain agent registry), ERC-7715 (wallet permissions)
- Semaphore (ZK group membership), Storacha/Filecoin (archiving)

### Core Flow
1. **Capture** — Browser tabs (`Cmd+Shift+U`), audio, photos, files, links (Pocket Coop PWA)
2. **Refine** — 14-skill local AI agent: opportunity extraction, grant-fit scoring, theme clustering
3. **Review** — Drafts in "The Roost" (chicken metaphor!). AI refinement suggestions, human triage
4. **Share** — Publish to coop: P2P sync, Safe governance, real-time Feed
5. **Archive** — Filecoin permanent storage with full provenance chain

---

## Brand & Metaphors 🐓

Coop uses chicken metaphors throughout:

| Concept | Metaphor |
|---------|----------|
| Open browser tabs | "Loose Chickens" |
| Local review queue | "The Roost" |
| Shared feed | "Coop Feed" |
| Creating a coop | "Launching the Coop" |
| Success sound | "Rooster Call" |
| Mobile PWA | "Pocket Coop" |
| Individual captures | "Chicks" |
| Private device storage | "Nest" |

---

## Current Status

**Version**: v0.0 (Pre-Release)  
**Last Updated**: March 2026

### Built & Working ✅
- Browser extension (MV3) with sidepanel, popup, offscreen sync
- Receiver PWA (audio, photo, file, link capture)
- 14-skill local AI agent pipeline (WebGPU inference)
- P2P sync via Yjs + y-webrtc
- Safe multisig integration (mock + live modes)
- Filecoin archiving via Storacha
- Passkey identity + WebAuthn
- Board visualization (ReactFlow graph)
- Operator console for agent management
- 100+ test files across all modules

### In Progress for Hackathon 🚧
- Green Goods garden integration (bootstrap, work approvals, attestations)
- ERC-8004 agent registry full integration
- Smart session UI (session/permit modules built, UI pending)
- Review rituals & meeting mode scheduler

---

## Demo Assets

| Asset | Location |
|-------|----------|
| **GitHub** | Private monorepo — can invite judges |
| **PWA** | https://coop.town |
| **Extension** | Chrome Web Store ready (dev mode available) |
| **Docs** | Full Docusaurus site with architecture, PRD, roadmaps |
| **Tests** | `bun run validate full` — 100+ test files |

---

## Regen Coordination Context

Coop is the **browser-native coordination membrane** built on ideas forming across the wider Regen Coordination work:

- Local-first collaboration over server-centric products
- Explicit shared memory instead of fragmented chat history  
- Durable long-memory archives communities can keep, fork, migrate
- Impact, governance, capital formation as connected workflows
- Green Goods as on-chain substrate for gardens, attestations, collective capital

**Goal**: Make it easier for communities to move from context → coordination → evidence → capital.

Each coop becomes a living knowledge garden with:
- Shared local-first memory membrane
- Anchor nodes running stronger inference
- Filecoin publishing for durable memory
- Green Goods bindings for on-chain coordination
- Smart-account-mediated execution

---

## Alignment with Ethereum Foundation Mandate

Coop implements the **March 2026 EF Mandate** (CROPS principles):

| Mandate Principle | Coop Implementation |
|-------------------|---------------------|
| **C**ensorship Resistance | P2P sync, no central server owns data |
| **O**pen Source | Full monorepo, all modules public |
| **P**rivacy | Local-first, ZK proofs, stealth addresses |
| **S**ecurity | Passkey auth, Safe multisigs, verifiable archives |
| Self-Sovereignty | User has final say over identity, data, agents |
| Walkaway Test | Data survives in exports + Filecoin |

---

## Links for Registration

- **Live PWA**: https://coop.town
- **EF Mandate Alignment**: `/docs/product/ethereum-foundation-mandate.md`
- **Architecture**: `/docs/architecture/coop-os-architecture-vnext.md`
- **PRD**: `/docs/product/prd.md`
- **Scoped Roadmap**: `/docs/product/scoped-roadmap-2026-03-11.md`

---

## Bottom Line for Judges

> Coop isn't "AI-assisted" — it's **agent-native from the ground up**. Local inference, shared memory, on-chain identity, and privacy-preserving architecture. Built for the Synthesis themes by embodying them: agents that pay, trust, cooperate, and keep secrets — all without centralized infrastructure.

**Ready to register? Paste the details above into https://synthesis.md!** 🚀🐓

---

*Last updated: March 21, 2026 | Building ends March 22 — submit now!*
