# Coop

Coop is a browser-first knowledge commons for local and bioregional coordination.

We are building the first hackathon iteration of Coop for the [PL_Genesis: Frontiers of Collaboration Hackathon](https://pl-genesis-frontiers-of-collaboration-hackathon.devspot.app/) on DevSpot. As of March 10, 2026, submissions for that event close on March 16, 2026.

## Why We Are Building Coop

Communities already generate the raw material for coordination:

- tabs
- articles
- voice notes
- field observations
- funding leads
- partial plans

What is usually missing is the membrane that turns scattered knowledge into shared memory, funding readiness, and durable capital formation.

Coop exists to close that gap.

The first version of Coop is a paired browser extension and app that helps members:

- passively notice relevant context while browsing
- capture thoughts and transcripts in the moment
- route knowledge into one or more coops
- structure shared evidence into a knowledge garden
- convert that knowledge into reviewable capital actions

## Hackathon Context

We are participating in:

- [PL_Genesis: Frontiers of Collaboration Hackathon](https://pl-genesis-frontiers-of-collaboration-hackathon.devspot.app/)
- [Coop project page on DevSpot](https://devspot.app/projects/1275)

This is a strong fit for Coop because the event is centered on coordination, governance, and shared intelligence infrastructure. The current hackathon framing also aligns with where Coop is strongest:

- browser-native collaboration
- local-first and P2P coordination
- AI-assisted synthesis
- Filecoin and Storacha long-memory storage
- offchain knowledge flowing into onchain capital formation

## Long-Term Vision

Coop is not just a capture tool.

Long term, each coop becomes a living knowledge garden with:

- a shared local-first memory membrane
- anchor nodes that run stronger inference and recurring workflows
- long-memory publishing into Storacha and Filecoin
- Green Goods garden bindings for capital formation
- smart-account mediated execution for proposals, attestations, treasury flows, and other collective actions

The larger goal is to make it easier for communities to move from context to coordination, from coordination to evidence, and from evidence to capital.

## Regen Coordination Foundation

Coop is being built on top of ideas that have been forming across the wider regen-coordination work:

- local-first collaboration over server-centric products
- explicit shared memory instead of fragmented chat history
- durable long-memory archives that communities can keep, fork, and migrate
- impact, governance, and capital formation as connected workflows
- Green Goods as the onchain substrate for gardens, attestations, and collective capital flows

In that sense, Coop is the browser-native coordination membrane around Green Goods. It is designed to help a community gather knowledge offchain, structure it collaboratively, and then push the right artifacts into Green Goods capital surfaces such as gardens, smart accounts, conviction voting, cookie-jar style flows, and related treasury mechanisms.

## Repo Structure

```text
docs/
packages/
  extension/
  app/
  shared/
package.json
README.md
```

`packages/shared` is intended to hold most of the product logic and contracts, with thin runtime packages on top.

## Core Documents

- [docs/coop-os-architecture-vnext.md](docs/coop-os-architecture-vnext.md) — current hackathon build spec
- [docs/architecture.md](docs/architecture.md) — broader architecture overview
- [docs/coop-component-plans.md](docs/coop-component-plans.md) — component planning notes

## Quick Start

```bash
pnpm install
pnpm dev
```
