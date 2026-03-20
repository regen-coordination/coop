# Coop Docs Community + Builder IA Revamp

**Status**: Active spec  
**Created**: 2026-03-19  
**Document Role**: Canonical spec for the docs information architecture rewrite and content translation pass

---

## 1. Correction To The Previous Plan

The previous plan was wrong in one important way: it treated `Community` and `Builder` as separate
docs hubs.

That is not the intended product.

The intended model is:

- one Docusaurus site
- one docs source
- one primary docs sidebar tree
- `/` owned by the Community documentation experience
- a persistent header-level tab switch between `Community` and `Builder`
- sidebar content filtered in the DOM based on the active header tab

This spec replaces the prior hub/plugin interpretation with the correct single-site, header-filtered
model.

## 2. Locked Decisions

These decisions are now fixed for implementation unless explicitly superseded.

- Coop docs remain one site and one docs corpus. Do not create separate docs plugins, separate route
  bases, or parallel docs apps.
- The docs plugin should own `/`, not `/docs`.
- `Community` is the default audience and owns the root path.
- The header contains the audience switch. The switch is not a homepage-only gateway component.
- The sidebar is filtered by audience in the rendered DOM. The user should feel like they are in one
  site with two documentation modes, not two different doc portals.
- Community pages should use plain-language narrative, value framing, and task guidance.
- Builder pages should use technical language, implementation context, architecture details, and
  contribution workflow.
- Every item in the requested skeleton becomes a real page, including every named integration.
- `Pricing` is an availability/access page for now. Do not invent paid tiers or prices.
- `Glossary` should be single-source content, but visible from both Community and Builder navigation.
- Existing long-form docs are inputs to the rewrite. They should be condensed, split, or archived as
  references rather than copied forward unchanged into the new primary navigation.

## 3. Site Model

### 3.1 Routing

The docs plugin should move to `routeBasePath: "/"`.

Target public slugs:

- Community
  - `/`
  - `/how-it-works`
  - `/why-we-build`
  - `/road-ahead`
  - `/creating-a-coop`
  - `/joining-a-coop`
  - `/sharing-knowledge`
  - `/ai-features`
  - `/privacy-security`
  - `/pricing`
  - `/glossary`
- Builder
  - `/builder/getting-started`
  - `/builder/how-to-contribute`
  - `/builder/architecture`
  - `/builder/extension`
  - `/builder/app`
  - `/builder/agentic-harness`
  - `/builder/p2p-functionality`
  - `/builder/integrations`
  - `/builder/integrations/webauthn`
  - `/builder/integrations/webllm`
  - `/builder/integrations/yjs`
  - `/builder/integrations/dexie`
  - `/builder/integrations/gnosis-safe`
  - `/builder/integrations/green-goods`
  - `/builder/integrations/filecoin`
  - `/builder/integrations/storacha`
  - `/builder/rd`
  - `/glossary`
- Archived references
  - `/reference/...`

### 3.2 Header Tabs

The audience switch belongs in the header and must persist across the site.

Required behavior:

- `Community` and `Builder` render as peer tabs in the header.
- The active tab is derived from pathname first:
  - paths beginning with `/builder/` activate `Builder`
  - all other primary docs paths activate `Community`
- Clicking `Community` navigates to the most recently visited Community page if available,
  otherwise `/`.
- Clicking `Builder` navigates to the most recently visited Builder page if available, otherwise
  `/builder/getting-started`.
- The tab state may be persisted in local storage for return navigation, but pathname remains the
  canonical source of truth when a page loads directly.

### 3.3 DOM Sidebar Filtering

The sidebar should remain one Docusaurus sidebar tree with two top-level audience groupings.

Implementation direction:

- keep one sidebar id, `docs`
- define one top-level `Community` category and one top-level `Builder` category
- add stable class hooks to those categories in `sidebars.ts`
- set a root attribute such as `data-docs-audience="community"` or `"builder"` based on the active
  header tab
- hide the opposite audience grouping in CSS and/or a lightweight client component

This is a rendering/filtering problem, not a second-docs-plugin problem.

### 3.4 Home Page Ownership

The current custom homepage in `docs/src/pages/index.tsx` should stop acting as a standalone gateway.

Instead:

- `/` becomes `Welcome To Coop`
- the current hero and visual framing should be reused inside the Community welcome page
- the page should behave like the first Community doc, not like a neutral chooser screen

## 4. Content Structure

### 4.1 Community Pages

1. Welcome To Coop
2. How It Works
3. Why We Build
4. The Road Ahead
5. Creating A Coop
6. Joining A Coop
7. Sharing Knowledge
8. AI Features
9. Privacy & Security
10. Pricing
11. Glossary

### 4.2 Builder Pages

1. Getting Started
2. How To Contribute
3. Coop Architecture
4. Coop Extension
5. Coop App
6. Agentic Harness
7. P2P Functionality
8. Integrations
9. WebAuthN
10. WebLLM
11. YJS
12. Dexie
13. Gnosis Safe
14. Green Goods
15. Filecoin
16. Storacha
17. R&D
18. Glossary

### 4.3 File Organization

Keep one docs source, but reorganize the content files into audience-oriented folders:

- `docs/community/`
- `docs/builder/`
- `docs/reference/`

This is an authoring organization choice only. It must not turn into multiple docs apps.

## 5. Translation Inventory: Community

This section maps the current docs corpus into the new Community pages.

| Target page | Primary source docs | What translates | What must change |
| --- | --- | --- | --- |
| `Welcome To Coop` | `docs/intro.md`; `docs/src/pages/index.tsx`; `docs/product/prd.md` sections 1-3; `docs/architecture/coop-os-architecture-vnext.md` sections 1, 8, 9 | product framing, hero narrative, key principles, high-level package/surface story | replace the current split between homepage hero and `/docs/intro`; make `/` the actual Community landing doc; remove builder-heavy language from the opening page |
| `How It Works` | `docs/intro.md` "How it works"; `docs/product/prd.md` sections 3-6; `docs/architecture/coop-os-architecture-vnext.md` sections 14-16 | capture -> refine -> review -> share loop; extension/app surface roles; publish flow | tighten into a plain-language user journey; avoid dumping schemas, implementation types, or module names |
| `Why We Build` | `docs/architecture/coop-os-architecture-vnext.md` sections 1-4; `docs/product/prd.md` Mission/Alignment; `docs/product/ethereum-foundation-mandate.md` Quick Reference + Alignment; `README.md` use cases | fragmentation problem, mission, Ethereum-aligned principles, who Coop is for | distill mandate content instead of reproducing the full text; emphasize the social and product reasons for Coop, not only standards alignment |
| `The Road Ahead` | `docs/product/scoped-roadmap-2026-03-11.md`; `docs/architecture/coop-os-architecture-vnext.md` section 22; selective points from `docs/architecture/agent-os-roadmap.md` | near-term direction, what is already landed, what remains in progress, what is intentionally deferred | rewrite the current roadmap into a user-readable forward path; preserve dates and concrete statuses where useful; move deep technical future-state material to Builder `R&D` |
| `Creating A Coop` | `docs/product/prd.md` Epic 1.1; `docs/architecture/coop-os-architecture-vnext.md` sections 9, 12, 16.1-16.2; `docs/guides/demo-and-deploy-runbook.md` local demo flow | launch flow, setup ritual, passkey-first coop creation, Safe creation, trusted member setup | convert from PRD acceptance-criteria style into task guidance and mental model; keep product vocabulary consistent |
| `Joining A Coop` | `docs/product/prd.md` Epics 1.2-1.3 and 8.1-8.2; `docs/architecture/coop-os-architecture-vnext.md` section 16.3; `docs/architecture/privacy-and-stealth.md` lifecycle integration | invite/join flow, pairing path, member roles, passkey expectations, privacy posture during join | unify currently split join language across PRD, architecture, and receiver docs; keep this page non-technical |
| `Sharing Knowledge` | `docs/architecture/knowledge-sharing-and-scaling.md` sections 2, 7; `docs/product/prd.md` Epics 2-6; `docs/architecture/coop-os-architecture-vnext.md` sections 13-15 | what gets captured, what stays local, what gets published, feed/board/archive story | explain sharing and archiving in product language; reserve CRDT and scaling detail for Builder pages |
| `AI Features` | `docs/intro.md` "What's novel"; `docs/architecture/agent-harness.md`; `docs/architecture/coop-os-architecture-vnext.md` sections 14.4-14.6; `docs/product/scoped-roadmap-2026-03-11.md` local enhancement sections | in-browser inference, skill pipeline, human-in-the-loop behavior, fallback model story | keep this page promise-shaped and legible to non-builders; do not surface implementation file lists or benchmark-style detail |
| `Privacy & Security` | `docs/architecture/privacy-and-stealth.md`; `docs/product/prd.md` section 7; `docs/architecture/policy-session-permit.md`; `docs/architecture/coop-os-architecture-vnext.md` sections 12-13 | local-first default, explicit publish boundary, anonymity options, passkeys, trust boundaries, approvals | merge privacy and security into one coherent promise page; do not expose low-level cryptography detail unless it supports user understanding |
| `Pricing` | no current canonical page; supporting context from `README.md`, `docs/getting-started/extension-install-and-distribution.md`, `docs/guides/demo-and-deploy-runbook.md` | current access model, install/distribution posture, where Coop is today | this is largely net-new writing; it should explicitly avoid fictional plans and instead explain current availability and likely onboarding path |
| `Glossary` | `docs/product/prd.md` Brand Vocabulary; `docs/intro.md`; `README.md`; `docs/architecture/coop-os-architecture-vnext.md` sections 1, 9, 14, 16 | Coop-specific terms like Loose Chickens, Roost, Feed, Launching the Coop, trusted member, receiver, archive receipt | net-new compilation page; it should normalize terminology now scattered across intro, README, PRD, and architecture |

## 6. Translation Inventory: Builder

This section maps the current docs corpus and repo guidance into the new Builder pages.

| Target page | Primary source docs | What translates | What must change |
| --- | --- | --- | --- |
| `Getting Started` | `docs/getting-started/extension-install-and-distribution.md`; `README.md` Local Development; root `package.json`; `docs/guides/testing-and-validation.md` | repo bootstrap, core commands, local extension/app/api setup, validation entry points | expand from extension-only install to a builder onramp covering the whole repo and docs workflow |
| `How To Contribute` | `CLAUDE.md`; root `package.json`; `.github/workflows/ci.yml`; `docs/guides/testing-and-validation.md` | commands, build/test expectations, PR validation path, repo conventions | mostly net-new public-facing contributor guidance; current repo instructions are internal-agent-oriented and must be rewritten for human contributors |
| `Coop Architecture` | `docs/architecture/coop-os-architecture-vnext.md` sections 4, 5, 7, 17, 18; `docs/product/prd.md` sections 3 and 6; `docs/architecture/knowledge-sharing-and-scaling.md` sections 2-4 | runtime split, package boundaries, data layers, shared contracts, major modules | condense the canonical build plan into a technical architecture overview page; keep deep rationale in archived references |
| `Coop Extension` | `docs/architecture/coop-os-architecture-vnext.md` sections 10-11; `docs/product/prd.md` section 3.1 and related epics; `docs/getting-started/extension-install-and-distribution.md` | sidepanel/popup/offscreen roles, capture flows, state model, install/distribution specifics | tighten around the extension as a product/runtime surface; move demo-only details to reference docs |
| `Coop App` | `docs/product/prd.md` section 3.2 and Epic 8; `packages/app/public/spec/mobile-pwa-routing-and-shell.md`; `docs/guides/demo-and-deploy-runbook.md` production PWA sections | landing vs receiver roles, route ownership, pair/receiver/inbox/board flow, mobile shell direction | this needs a real builder-facing page because the current public docs underrepresent the app/PWA architecture; use the internal PWA spec as a first-class source |
| `Agentic Harness` | `docs/architecture/agent-harness.md`; `docs/architecture/coop-os-architecture-vnext.md` section 14; `docs/architecture/agent-os-roadmap.md` phase 2 | observe-plan-act loop, skill DAG, inference cascade, approval model, observability | keep implementation detail, but rewrite for orientation first and file-level specifics second |
| `P2P Functionality` | `docs/architecture/knowledge-sharing-and-scaling.md` sync sections; `docs/architecture/coop-os-architecture-vnext.md` section 13; `docs/architecture/erc8004-and-api.md` API/signaling sections | Yjs sync shape, y-webrtc relay role, local-first replication, signaling boundary | combine the currently split P2P explanation into one concrete transport page |
| `Integrations` | `docs/product/scoped-roadmap-2026-03-11.md` standards choices; `docs/architecture/coop-os-architecture-vnext.md` modules/onchain sections; `docs/architecture/erc8004-and-api.md`; `docs/architecture/green-goods-integration-spec.md` | why these external systems exist in Coop and how they fit the stack | this is a new overview page synthesizing the individual integration pages below |
| `WebAuthN` | `docs/architecture/coop-os-architecture-vnext.md` section 12; `docs/product/prd.md` Epic 9; `docs/intro.md` key principles | passkey-first identity model, RP ID constraints, recovery reality, account-bridging posture | separate the passkey story from generic identity prose and make it an explicit integration page |
| `WebLLM` | `docs/architecture/agent-harness.md` inference layer; `docs/architecture/coop-os-architecture-vnext.md` section 14.6; `docs/product/scoped-roadmap-2026-03-11.md` local enhancement path; `docs/architecture/agent-os-roadmap.md` browser runtime research | WebGPU inference role, fallback ladder, worker placement, capability gating | rewrite into one integration page focused on why WebLLM is used, where it fits, and where it does not |
| `YJS` | `docs/architecture/knowledge-sharing-and-scaling.md` sections 4, 5, 8, 9; `docs/architecture/coop-os-architecture-vnext.md` section 13 | CRDT data model, current anti-pattern, scaling limits, remediation plan | extract Yjs-specific detail from the broader knowledge-sharing doc and keep it technical |
| `Dexie` | `docs/architecture/knowledge-sharing-and-scaling.md` sections 2.3, 7.1, 11; `docs/architecture/agent-harness.md` observability/logging; `docs/architecture/coop-os-architecture-vnext.md` section 13.2 | local persistence model, tables by function, local-only draft storage, agent logs | this page is mostly new synthesis because Dexie detail is scattered across architecture docs |
| `Gnosis Safe` | `docs/architecture/coop-os-architecture-vnext.md` section 12; `docs/product/prd.md` Epic 11; `docs/architecture/policy-session-permit.md`; `docs/product/scoped-roadmap-2026-03-11.md` chain direction | coop Safe creation, account abstraction posture, action execution boundary, live vs mock path | keep it grounded in actual coop flows instead of generic Safe documentation |
| `Green Goods` | `docs/architecture/green-goods-integration-spec.md`; `docs/product/prd.md` Epic 11.2; `docs/product/scoped-roadmap-2026-03-11.md` Green Goods-related sections | garden bootstrap, bounded action classes, policy-controlled execution, current scope limits | condense the spec into a builder explainer and move phase detail to reference |
| `Filecoin` | `docs/product/prd.md` archiving epics; `docs/architecture/coop-os-architecture-vnext.md` archive sections; `docs/product/scoped-roadmap-2026-03-11.md` filecoin story; `README.md` archive framing | archive provenance story, receipts, long-memory rationale, piece-level follow-up direction | separate Filecoin as the durability/provenance page from Storacha as the upload/delegation page |
| `Storacha` | `docs/product/prd.md` archiving epics; `docs/guides/demo-and-deploy-runbook.md`; `docs/getting-started/extension-install-and-distribution.md`; `docs/architecture/coop-os-architecture-vnext.md` archive flow | upload delegation, issuer/config story, archive setup flow, mock/live mode expectations | rewrite from scattered operational notes into one integration page |
| `R&D` | `docs/architecture/agent-os-roadmap.md`; `docs/ui-review-issues.md`; `docs/architecture/knowledge-sharing-and-scaling.md` remediation phases; `docs/product/scoped-roadmap-2026-03-11.md` agentic platform sections | known technical risks, future architecture work, deferred capabilities, active research lanes | this page should summarize and point outward, not reproduce the full audits or roadmap texts inline |
| `Glossary` | same glossary source set as Community, plus builder-only technical terms from architecture docs | common terms plus technical vocabulary like action bundle, permit, session, anchor node, receipt, signaling relay | the page remains shared, but Builder links should scroll users into the technical term clusters when relevant |

## 7. Current Docs Disposition

This section states how each existing primary doc should be treated during the rewrite.

| Current doc | Primary disposition |
| --- | --- |
| `docs/intro.md` | split across `Welcome To Coop`, `How It Works`, `AI Features`, `Privacy & Security` |
| `docs/architecture/coop-os-architecture-vnext.md` | primary source for Community `Why We Build`, `The Road Ahead`, and most Builder architecture pages; keep full long form under `reference/` |
| `docs/architecture/agent-harness.md` | condensed into Builder `Agentic Harness`; keep full long form under `reference/` |
| `docs/architecture/knowledge-sharing-and-scaling.md` | split into Community `Sharing Knowledge`, Builder `P2P Functionality`, `YJS`, and `Dexie`; keep full long form under `reference/` |
| `docs/architecture/privacy-and-stealth.md` | condensed into Community `Privacy & Security` and Builder `WebAuthN` support material; keep full long form under `reference/` |
| `docs/architecture/policy-session-permit.md` | feed Community `Privacy & Security` and Builder `Gnosis Safe`/`R&D`; archive full long form |
| `docs/architecture/erc8004-and-api.md` | feed Builder `P2P Functionality`, `Integrations`, and `R&D`; archive full long form |
| `docs/architecture/green-goods-integration-spec.md` | feed Builder `Green Goods`; archive full long form |
| `docs/architecture/agent-os-roadmap.md` | summarize into Builder `R&D`; archive full long form |
| `docs/product/prd.md` | major source for Community task pages and Builder product/runtime pages; keep full PRD under `reference/` |
| `docs/product/scoped-roadmap-2026-03-11.md` | split into Community `The Road Ahead` and Builder `R&D`; archive full roadmap |
| `docs/product/ethereum-foundation-mandate.md` | quote selectively into `Why We Build`; keep full text under `reference/`, not primary nav |
| `docs/guides/demo-and-deploy-runbook.md` | feed Builder `Getting Started`, `Coop App`, `Storacha`; archive full runbook |
| `docs/guides/testing-and-validation.md` | feed Builder `Getting Started` and `How To Contribute`; archive or link as reference |
| `docs/guides/coop-design-direction.md` | not a primary nav destination in the new IA; mine for voice/visual guidance and keep under `reference/` |
| `docs/guides/coop-audio-and-asset-ops.md` | not a primary nav destination in the new IA; keep under `reference/` and link from relevant builder pages if needed |
| `docs/getting-started/extension-install-and-distribution.md` | feed Builder `Getting Started` and `Coop Extension`; archive or keep as a slim reference if its command detail remains useful |
| `docs/ui-review-issues.md` | not primary-nav content; summarize into Builder `R&D` and keep the audit under `reference/` |

## 8. New Writing Required

These pages cannot be produced by simple condensation and need fresh writing:

- `Pricing`
- `How To Contribute`
- `Integrations` overview
- `Glossary`
- `Coop App` as a public builder page
- `P2P Functionality` as a single coherent explainer

These pages require heavy synthesis rather than direct translation:

- `Why We Build`
- `The Road Ahead`
- `AI Features`
- `Privacy & Security`
- `R&D`

## 9. Implementation Notes

### 9.1 Sidebar And Metadata

Use a single manually-authored sidebar, not autogenerated folders.

Recommended structure:

- top-level `Community` category
- top-level `Builder` category
- `Integrations` nested inside `Builder`
- `Glossary` included in both via sidebar link items pointing to the same doc
- archived references omitted from primary sidebar

### 9.2 Redirects

Redirect these current routes to the new structure:

- `/docs/intro` -> `/`
- `/docs/getting-started/extension-install-and-distribution` -> `/builder/getting-started`
- `/docs/architecture/coop-os-architecture-vnext` -> `/builder/architecture`
- `/docs/architecture/agent-harness` -> `/builder/agentic-harness`
- `/docs/architecture/knowledge-sharing-and-scaling` -> `/builder/p2p-functionality`
- `/docs/architecture/privacy-and-stealth` -> `/privacy-security`
- `/docs/product/prd` -> `/reference/product-requirements`
- `/docs/product/scoped-roadmap-2026-03-11` -> `/road-ahead`

Any route without a clean primary replacement should redirect into `reference/`.

### 9.3 Home Page Transition

When the docs plugin moves to `/`, the current `docs/src/pages/index.tsx` route will conflict.

Plan:

- move the current hero/content ideas into the Community welcome doc
- preserve the visual language, but make it documentation-first
- remove the neutral "Get Started / GitHub" landing split as the primary site entry behavior

### 9.4 Validation

Validation for the docs rewrite should include:

- route smoke check for all new slugs
- header tab behavior on desktop and mobile
- sidebar DOM filtering under both audiences
- redirect checks for the current `/docs/*` URLs
- build verification with Node 20+ because Docusaurus 3.7 requires it

## 10. Recommended Execution Order

1. Move the docs plugin to `/` and establish the header-tab plus DOM-sidebar behavior.
2. Create the full target page skeleton with correct slugs and empty-but-real docs.
3. Translate Community pages first so the root experience is correct.
4. Translate Builder pages second, starting with `Getting Started`, `Coop Architecture`,
   `Coop Extension`, `Coop App`, and `Agentic Harness`.
5. Add the integration pages.
6. Move legacy long-form docs into `reference/` and wire redirects.
7. Do a final terminology pass so Community and Builder pages share one vocabulary.

## 11. Acceptance Criteria

This rewrite is complete when:

- `/` is the Community documentation landing page
- the header tabs switch between Community and Builder across the whole site
- the sidebar visibly filters between Community and Builder in the DOM
- every requested skeleton item exists as a real page
- the current long-form docs have been translated, split, or archived intentionally
- the old `/docs/*` URLs resolve cleanly
- the site reads like one documentation product with two modes, not two separate doc systems

