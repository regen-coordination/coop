# Coop Architecture vNext

**Status**: Review draft
**Created**: 2026-03-09
**Purpose**: Finalize a concise, build-ready spec for the first Coop implementation
**Primary Pillars**: Knowledge Garden, Capital Formation

---

## 1. Product Definition

Coop is a P2P browser-native knowledge garden for local capital formation.

The first product is not a general coordination OS. It is a focused system that helps members gather context from the web, capture thoughts from the phone, form a shared knowledge membrane across one or more coops, and turn that knowledge into funding opportunities and draft capital artifacts.

The core loop is:

1. A member joins one or more coops.
2. Their extension passively tracks relevant browser context locally.
3. Their receiver PWA captures thoughts, transcripts, and lightweight context on the phone.
4. Their extension node releases, structures, and routes that context into the appropriate coops.
5. Anchor nodes run lightweight recurring jobs and deeper inference to surface insights and funding leads.

---

## 2. Primary Decisions

- `Knowledge Garden` and `Capital Formation` are the two primary build pillars.
- `Impact` and `Coordination` remain present as supporting lenses over the shared graph.
- The canonical architecture is `P2P`.
- An `anchor` is still a browser extension node, not a separate product class.
- The `PWA is the receiver` for a member's node by default.
- The extension is the member's primary node, primary local store, and primary publish surface.
- Cloud inference is `anchor-only by default` to keep the system simple.
- Every coop should map to a Green Goods garden and a coop smart account.
- Long-memory knowledge should close the loop into Storacha/Filecoin.
- Members are expected to be in `multiple coops`.
- Dissemination to one or more coops should feel passive and low-friction.
- The spec should define only what is being built, not a large ring of deferred systems.

---

## 3. Member, Node, and Receiver Model

### 3.1 Member Model

A member may belong to multiple coops at once.

They should not need separate browsing behavior for each coop. The product should let them keep working normally while Coop performs local relevance filtering and suggests where knowledge belongs.

### 3.2 Extension Node

The extension is the primary node for a member.

It is responsible for:

- local tab awareness
- local storage
- local candidate queue
- routing captured context into coops
- running or delegating processing jobs
- presenting the main review and publish UI

### 3.3 Receiver PWA

The PWA is a receiver for the member's node.

Default flow:

- the PWA captures thoughts, voice, and lightweight context
- the PWA sends that context toward the paired extension node
- the extension node stores, processes, and publishes it into the coop membrane

The PWA may cache drafts or pending captures while offline, but the extension remains the primary local home for a member's durable node state in v1.

### 3.4 Diode Relationship

The default relationship is directional:

- browser context and coop publishing are centered in the extension
- mobile thoughts and transcripts flow from the receiver PWA back to the extension
- the extension returns summary state, review status, and sync status back to the PWA

This keeps the mental model simple:

- `extension = node`
- `PWA = receiver`

---

## 4. Coop Runtime Model

### 4.1 Coop

A coop is a scoped shared membrane containing:

- members
- artifact feed
- artifact graph
- routing rules
- review state
- anchor permissions

### 4.2 Node Types

There are two node modes in v1:

- `standard node`: capture, receive, review, and sync
- `anchor node`: an approved extension node that can run recurring jobs and optional cloud-backed inference

### 4.3 Anchor Model

Anchor nodes are still extension peers.

They are allowed to:

- run recurring lightweight jobs
- run deeper inference when configured
- keep more stable sync participation while the browser is open
- surface insights back into the coop feed

Anchor nodes are not assumed to be always online servers. They are stronger peers.

---

## 5. Monorepo Shape

Coop should keep a monorepo shape that is consistent with the Green Goods pattern: thin runtime packages and one strong shared package.

### 5.1 Top-Level Structure

```text
docs/
packages/
  extension/
  app/
  shared/
package.json
README.md
```

### 5.2 Package Responsibilities

```text
packages/
  extension/   # primary member node: popup, sidepanel, background, content capture, local store, anchor runtime
  app/         # receiver PWA: thought capture, voice capture, pairing, review inbox
  shared/      # source of truth for schema, sync, routing, workflows, onchain adapters, storage adapters
```

There is no standalone anchor package in v1. Anchor behavior lives inside the extension runtime and shared workflows.

### 5.3 Shared Source Layout

```text
packages/shared/
  src/
    components/
    types/
    stores/
    workflows/
    modules/
    skills/
    hooks/
    configs/
    i18n/
    utils/
```

### 5.4 Shared Package Rule

`packages/shared` should be the source of truth for:

- artifact types
- coop event types
- routing contracts
- sync contracts
- icon state contracts
- onchain contracts and garden bindings
- storacha and snapshot pointer contracts
- shared UI primitives
- member and coop state machines
- reusable skills and workflows

Each runtime package should stay thin and call into shared logic.

### 5.5 Dependency Policy

The build should use a minimal stack.

Rules:

- prefer native browser APIs first
- add a library only when it removes real complexity or risk
- prefer libraries already proven in Green Goods when they fit the problem
- use one small library per concern instead of layering overlapping tools
- avoid large component systems and heavy framework abstractions by default

### 5.6 Preferred Core Stack

#### Core App Runtime

- `typescript`
- `react`
- `react-dom`
- `vite`

This should remain the baseline for the extension and the PWA.

#### Styling

- `tailwindcss` for fast layout and spacing
- native CSS variables for theme tokens
- native CSS transitions and small SVG animation for icon state

Do not bring in a large UI kit by default. Start with native elements and a thin shared component layer in `packages/shared`.

#### Local-First Storage

- `dexie`
- `y-indexeddb`

Use `Dexie` as the primary local browser database for candidate queues, artifact caches, coop membership state, and receiver inbox state.

Use `y-indexeddb` to persist the shared Yjs membrane locally.

This is the smallest strong local-first combination for v1:

- `Dexie` gives a clean browser persistence layer without dropping into raw IndexedDB code
- `Yjs + y-indexeddb` gives durable shared-state sync without adding a second replication system

#### Validation and Contracts

- `zod` for artifact, event, and routing schemas

Use runtime validation at the membrane boundary and at any anchor ingress point.

#### Lightweight App State

- React local state first
- `zustand` only for shared runtime state that clearly escapes component scope

Do not introduce a larger client state framework unless the product genuinely outgrows this.

#### PWA and Pairing

- `vite-plugin-pwa`
- `qrcode.react`

Use the plugin for installability and offline basics. Use QR for fast receiver pairing.

#### Extension Capture

- `@mozilla/readability`

Use it for tab extraction instead of inventing a custom parser for readable content.

#### Data Sharing and Sync

- `yjs`
- `y-webrtc`
- `y-indexeddb`
- `ws` only as an optional relay path

The preferred direction is a Yjs-backed coop membrane with direct peer sync first and relay assist only when needed.

#### Helper Runtime

- `fastify`

Only use this where direct P2P or local browser capability is not sufficient.

#### Inference

- one official cloud SDK only, anchor-only by default

Preferred choices:

- `openai`
- `@anthropic-ai/sdk`

Pick one primary cloud inference SDK for v1 and avoid multi-provider complexity unless a concrete need appears.

#### Onchain Capital and Storage

- `viem`
- `permissionless`
- `@storacha/client`
- `multiformats`

Use `viem` as the chain client baseline. Use `permissionless` for account-abstraction flows and Pimlico integration. Use Storacha plus multiformats for snapshot and archive handling.

#### Testing

- `vitest`
- `@testing-library/react`
- `msw`
- `fake-indexeddb`
- `@playwright/test`

Use package-local unit tests by default. Only add a root E2E test folder if the Playwright surface grows enough to justify it.

Testing should stay lightweight and layered:

- use `Vitest` for shared workflows, schema contracts, routing logic, icon state, and onchain/storage adapters
- use `React Testing Library` for popup, sidepanel, and receiver component behavior
- use `MSW` for cloud inference, relay, and chain-adjacent request mocking
- use `fake-indexeddb` for fast local-storage tests in Node
- use `Playwright` for the real extension plus PWA pairing and publish flows

### 5.7 Borrow from Green Goods, Avoid Green Goods Bloat

Green Goods is a useful reference for a few proven dependencies:

- `react`
- `vite`
- `tailwindcss`
- `dexie`
- `qrcode.react`
- `zod`
- `zustand`
- `fastify`
- `viem`
- `permissionless`
- `@storacha/client`

But Coop should avoid pulling in the heavier parts of the Green Goods stack unless a concrete v1 requirement emerges.

Do not default to adding:

- large Radix surface area
- wallet libraries
- large query/caching frameworks
- Storybook-first component work
- analytics or product telemetry dependencies
- chain tooling in the core runtime path

The first implementation should stay browser-native, small, and understandable.

---

## 6. Data Model

### 6.1 Core Objects

- `Member`
- `Coop`
- `Node`
- `Artifact`
- `Link`
- `FeedEvent`
- `RoutingDecision`
- `Job`
- `GardenBinding`
- `SmartAccount`
- `CapitalAction`
- `SnapshotPointer`

### 6.2 Artifact Types

- `Resource`
- `Thought`
- `Transcript`
- `Insight`
- `Evidence`
- `Opportunity`
- `FundingLead`
- `ApplicationDraft`
- `Task`

### 6.3 Link Types

- `derived_from`
- `supports`
- `relevant_to`
- `needs`
- `funds`
- `mentions`
- `published_to`
- `archived_as`
- `executed_by`

### 6.4 Graph Constraint

The graph is a typed relationship layer first.

V1 requires:

- artifact creation
- link creation
- filtered feed views
- per-coop relevance views

V1 does not require a large collaborative graph editor.

### 6.5 Capital and Archive Objects

- `GardenBinding`: maps a coop to its Green Goods garden addresses and configuration
- `SmartAccount`: stores the coop smart-account address, signer policy, and session-capability metadata
- `CapitalAction`: a reviewable proposed action that may become an attestation, proposal, disbursement, or other chain interaction
- `SnapshotPointer`: stores the export hash plus archive references such as Storacha/Filecoin identifiers and related public links

---

## 7. Knowledge Garden

Knowledge Garden is the memory layer of the coop.

Its job is to:

- gather relevant resources from open tabs, drops, thoughts, and transcripts
- summarize and classify them
- attach tags and extracted entities
- link them to existing artifacts
- surface reusable context for later funding work

Outputs include:

- summaries
- tags
- extracted entities
- related artifacts
- insight drafts
- evidence snippets

---

## 8. Capital Formation

Capital Formation is the conversion layer from shared context into funding readiness.

Its job is to:

- identify potential funding leads
- match coop knowledge to those leads
- assemble missing evidence and next questions
- produce draft capital artifacts
- map those artifacts into Green Goods capital surfaces
- prepare reviewable onchain actions

Outputs include:

- funding leads
- opportunity matches
- evidence bundles
- application outlines
- outreach drafts
- missing-information checklists
- Garden action drafts
- treasury action drafts
- attestation drafts
- archive-backed evidence references

### 8.1 Offchain to Onchain Funnel

The v1 spec should make the funnel explicit:

1. members gather resources, thoughts, transcripts, and field evidence
2. the coop membrane structures them into artifacts and links
3. anchor jobs surface funding leads, evidence bundles, and capital recommendations
4. the coop reviews and approves a capital action
5. the anchor prepares the corresponding onchain transaction or attestation
6. the result and its evidence pointer are written back into the coop feed

The point is not generic wallet activity. The point is to convert community knowledge into fundable, accountable capital flows.

### 8.2 Green Goods Garden Binding

Each coop should map to a Green Goods garden.

That binding gives the coop a capital surface for:

- `Octant` vault participation
- `Gardens` conviction voting flows
- `Cookie Jar` style disbursement and spend proposals
- Green Goods attestations and evidence references

The garden binding should be created or attached as part of coop setup so that capital artifacts already know where they can land.

### 8.3 Coop Smart Account and Pimlico

Each coop should also map to a coop smart account.

V1 should use:

- `viem` for chain interactions
- `permissionless` for account-abstraction flows
- `Pimlico` for bundling and sponsorship

The coop smart account is controlled by:

- the approved coop anchor node runtime
- the coop's configured human signers

The anchor node should be able to:

- prepare and submit low-risk allowlisted actions
- hold a constrained session capability when explicitly installed
- draft higher-risk actions for human approval
- write execution results back into the coop feed

Human signers remain the approval boundary for:

- smart account creation or rotation
- signer changes
- treasury-sensitive actions
- any action outside the v1 allowlist

### 8.4 Anchor Capital Jobs

Anchor capital jobs should feel agentic, but they can stay as recurring workflows rather than a heavy autonomous-agent design.

Useful v1 jobs:

- funding lead matching
- evidence gap detection
- application draft assembly
- archive readiness check
- onchain action draft generation

These jobs should always produce reviewable artifacts, not opaque background state changes.

---

## 9. Multi-Coop Dissemination

Multi-coop membership is a first-class behavior, not an edge case.

### 9.1 Default Behavior

A member should be able to belong to multiple coops and keep one normal browsing flow.

The extension should:

- maintain one local candidate pool
- score or suggest which coops a candidate belongs to
- allow one-click publish to one or more suggested coops
- avoid making the member repeat the same capture flow for each coop

### 9.2 Routing Rule

The system should route based on:

- member membership
- coop relevance rules
- local tags or context
- artifact history

### 9.3 Publish Rule

Nothing should be silently published. The passive part is the filtering and suggestion, not the final release.

---

## 10. P2P Membrane and Storage

### 10.1 Canonical Model

The product is specified as P2P:

- each coop has a scoped membrane
- extension nodes and receiver PWAs sync into that membrane
- anchor nodes help keep the membrane lively

### 10.2 Practical v1 Truth

V1 may use relay-assisted P2P where needed.

That means:

- direct peer sync where possible
- helper fanout or relay when direct connectivity is unreliable
- optional helper runtime for cloud-backed inference ingress

The implementation may simplify transport, but it should keep the event and artifact contracts portable toward fuller P2P sync later.

### 10.3 Local Storage

The extension stores in `Dexie`:

- candidate tabs
- member node state
- coop subscriptions
- artifact cache
- graph cache
- sync state

The shared membrane is persisted locally with `y-indexeddb`.

The PWA stores in `Dexie`:

- pending captures
- temporary receiver cache
- pairing state
- review inbox cache

### 10.4 Long Memory

Live coop state and long memory are separate concerns.

- the live membrane is for active capture, sync, routing, and review
- long memory is for durable, curated snapshots that outlive any one node

Long memory should be deterministic and portable.

V1 long-memory output should include:

- Markdown and JSON snapshot exports
- artifact indexes
- evidence bundles
- capital action references
- a `SnapshotPointer` containing export hash and archive references

### 10.5 Storacha and Filecoin

Storacha and Filecoin close the storage loop for coop knowledge.

The intended flow is:

1. a coop approves a curated snapshot or evidence bundle
2. the anchor node packages the snapshot for archival
3. Storacha stores the archive and returns content-addressed references
4. the coop records the resulting archive pointer in shared state
5. capital artifacts and onchain actions can reference that archive pointer as durable evidence

This creates a durable bridge from browser-native knowledge capture to local-first shared memory to onchain capital formation.

### 10.6 Storage Boundary

Secrets never belong in the shared membrane or in archived long-memory output.

Shared state and archives may contain:

- public artifact content
- public metadata
- public archive pointers
- public transaction references

Secrets must stay local to approved anchor runtimes.

---

## 11. Intake Model

### 11.1 Passive Browser Intake

The extension should feel passive without becoming invasive.

Passive intake means:

- observe tab metadata locally
- maintain a candidate set
- mark the node as having new material
- avoid full extraction until the member triggers capture

### 11.2 Triggered Capture

The popup should expose:

- `Capture current tab`
- `Sweep current window`
- `Capture suggested tabs`
- `Capture thought`
- `Open Coop`

The sidepanel should expose:

- candidate review
- coop routing review
- artifact linking
- publish actions

### 11.3 Receiver Intake

The PWA should support:

- quick thought capture
- voice memo or transcript capture
- lightweight context tagging
- send-to-extension or send-to-coop flow

---

## 12. Anchor Inference Model

This needs to be explicit.

### 12.1 Default Rule

Only anchor nodes run cloud-backed inference by default.

Standard nodes:

- capture
- cache
- sync
- run lightweight local heuristics if available

Anchor nodes:

- run recurring jobs
- run stronger cloud inference if configured
- write insights and capital suggestions back into the coop

### 12.2 Why This Default

This keeps v1 simpler in four ways:

- fewer API key flows
- fewer cost-control problems
- clearer trust boundaries
- easier product reasoning

### 12.3 Anchor Integration Boundary

Anchor runtimes are the default place for:

- cloud inference credentials
- Pimlico configuration and sponsorship credentials
- Storacha upload credentials

Those capabilities should be exposed to the coop through reviewable jobs and action drafts, not as general-purpose remote control.

### 12.4 Future Expansion

Later, any node may opt into anchor mode if:

- the member configures cloud access
- the coop allows it
- the node advertises anchor capability

But this is not the default for the first build.

### 12.5 Agentic Loop

The system should feel agentic, but the implementation can stay simple.

The default loop is closer to recurring jobs plus event triggers than a chatbot:

- new capture arrives
- anchor classifies and links it
- anchor suggests coop routing if needed
- anchor checks for funding relevance
- anchor publishes insights back into the feed

Examples of recurring jobs:

- candidate digestion
- funding lead scan
- evidence bundle refresh
- unread receiver ingest sweep

---

## 13. Icon, Cadence, and Notifications

This is part of the product, not polish.

### 13.1 Cadence

Recommended default:

- metadata scan every `90 seconds` while the browser is active
- dirty-flag updates on tab open, close, title change, and URL change
- pause recurring scans after `5 minutes` of browser inactivity
- resume on focus or explicit click

No continuous full extraction and no continuous AI processing.

### 13.2 Mascot State Model

The Coop icon is a chicken face with green hair, eyes, and a beak.

Use the mascot itself to communicate state:

- `Idle`: normal green hair, still eyes
- `Candidates`: amber or yellow hair accent, subtle badge
- `Processing`: blue hair pulse, slight eye movement
- `Ready`: bright green hair, alert eyes
- `Attention`: red hair accent or red badge

Animation should stay minimal and low-cost. Use small SVG or CSS state changes, not heavy animation loops.

### 13.3 Notification Policy

Notify only for meaningful transitions:

- sweep completed with new artifacts
- funding lead detected
- receiver capture synced
- publish or review needed

Do not notify for every tab mutation.

---

## 14. Build Order

1. Define shared artifact, link, feed, routing, and icon-state contracts in `packages/shared`.
2. Build the extension node flow: popup, sidepanel, candidate queue, sweep, publish.
3. Build the receiver PWA flow: pairing, thought capture, transcript capture, receiver sync.
4. Implement `Dexie` local persistence and Yjs membrane sync with `y-webrtc` and `y-indexeddb`.
5. Implement multi-coop routing and publish suggestions.
6. Implement anchor-only recurring inference jobs for Knowledge Garden.
7. Add Capital Formation transforms on top of the knowledge graph.
8. Bind each coop to a Green Goods garden and coop smart account.
9. Add Pimlico-backed allowlisted smart-account execution for review-approved actions.
10. Add Storacha/Filecoin long-memory snapshot publishing and archive pointers.
11. Add helper relay or helper inference runtime only where P2P is insufficient.

---

## 15. Acceptance Criteria

The spec is satisfied when:

- a member can create or join a coop from the extension
- the extension behaves as the primary member node
- the PWA behaves as the paired receiver
- passive tab awareness works without heavy extraction
- one click can sweep useful context into one or more coops
- multi-coop routing suggestions are visible
- the icon clearly signals node state
- receiver captures can sync back into the member's node flow
- an anchor node can run recurring inference jobs
- the system produces structured knowledge artifacts
- the system produces at least one capital-formation output grounded in coop knowledge
- each coop can bind to a Green Goods garden and a coop smart account
- the system can prepare at least one reviewable onchain capital action through the smart-account flow
- approved evidence or snapshot bundles can be archived through Storacha/Filecoin and referenced back from coop state

---

## 16. Final Constraint

This document should remain dense, concrete, and build-focused.

If a detail does not help define:

- the member flow
- the node and receiver flow
- the shared artifact model
- the anchor inference model
- the monorepo structure
- or the acceptance criteria

it does not belong in the v1 build spec.
