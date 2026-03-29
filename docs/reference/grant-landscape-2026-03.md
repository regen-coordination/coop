---
title: "Grant Landscape"
slug: /reference/grant-landscape-2026-03
---

# Coop Grant Landscape

Date: March 29, 2026

This is the current, startup-friendly grant map for Coop. It replaces the earlier ad hoc note with
a verified matrix built from official program pages, official governance forums, and official docs.

Coop's strongest funding posture today is:

- browser-first, local-first community memory and coordination
- multimodal capture plus in-browser local AI refinement
- explicit review before publish
- optional verifiable archive, smart-account, privacy, and agent rails
- a current public posture that is mock-first and demoable, with live rails intentionally gated

For release posture and what Coop can safely claim right now, see
[Current Release Status](/reference/current-release-status). For Ethereum mission alignment, see
[Ethereum Foundation Mandate](/reference/ethereum-foundation-mandate).

## Method

- Sources: official docs, official program pages, official governance forums
- Audience filter: individual/startup team first
- Status date: all statuses below are phrased as of March 29, 2026
- Score: `Mission / Tech / Startup / Time / Check / Narrative`, each `1-5`, total `30`
- Probability tiers:
  - `High`: worth drafting now
  - `Medium`: worth preparing, but needs sharper positioning or a chain-specific prototype
  - `Low`: only pursue if a specific relationship or trigger appears

## Funding Thesis Memo

### 1. Local-first community memory

Use this framing for NLnet, open internet, and sovereignty-oriented programs.

Core line:

> Coop is browser-first, local-first software that helps communities turn scattered tabs, notes,
> voice, photos, files, and links into reviewed shared memory without defaulting to centralized
> cloud AI or surveillance platforms.

What to emphasize:

- explicit local-first storage and sync
- human review before publish
- passkey-first identity
- CRDT sync, portability, and walkaway properties

What not to overclaim:

- do not lead with "social network"
- do not lead with token incentives
- do not frame Coop as a generic productivity app

### 2. Grant and evidence packaging

Use this framing for L2 ecosystem grants and mission-aligned application-layer programs.

Core line:

> Coop helps research, grant, and community teams gather evidence across many sources, refine it
> locally, and turn the strongest signals into reviewed briefs, next steps, and durable shared
> context.

What to emphasize:

- browser capture as the intake membrane
- local AI refinement as assistive, not autonomous
- reviewed outputs instead of raw dumps
- better continuity across community funding and coordination work

What not to overclaim:

- do not claim automated grant writing or guaranteed funding outcomes
- do not present the current live onchain rails as the default user path

### 3. Verifiable archive plus public-goods rails

Use this framing for Filecoin, Ethereum public-goods, Safe-adjacent, and deeper ecosystem asks.

Core line:

> Coop pairs local-first collaboration with verifiable archive, export, and optional smart-account
> coordination rails so groups can preserve evidence, prove provenance, and coordinate actions
> without making centralized platforms the system of record.

What to emphasize:

- Storacha/Filecoin archive path
- Safe plus passkey design
- privacy and explicit publish boundaries
- public-goods value beyond a single app

What not to overclaim:

- do not make onchain rails sound fully public-launch-default
- do not make AI the main identity of the product

### AI overlay

AI should be a secondary amplifier, not the main thesis.

Best line:

> Coop uses trustworthy local AI for refinement, speech and multimodal intake, and coordination
> support; it is not a frontier-model wrapper or "AI agent" product in search of a use case.

This is strongest for Taiko, Base, Celo, and Starknet-aligned asks.

## Current Repo Posture That Affects Grants

Strengths:

- the core browser-first and local-first product story is real
- local AI refinement exists in the repo and product model
- archive, privacy, passkey, and smart-account rails are present
- the product is documentable and demoable now

Gaps that will materially affect applications:

- there is no visible top-level `LICENSE` file in the repo today
- several high-fit programs expect clear open-source licensing
- Filecoin Foundation explicitly requires `MIT` plus `Apache-2.0`
- many L2 opportunities will score better if Coop ships at least one narrow chain-specific demo
- most programs will want clearer public traction or pilot evidence than the repo currently shows

## Top 5 Shortlist

These are the five best near-term targets under the current startup-friendly filter.

| Rank | Program | Why it made the cut | Recommended ask | Probability | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | [NLnet NGI Zero Commons Fund](https://nlnet.nl/commonsfund/) | Best match for local-first digital commons, CRDT sync, privacy, and community memory. | `EUR 30k-50k` | High | Most urgent hard deadline. |
| 2 | [Filecoin Foundation Grants](https://fil.org/grants) | Strongest fit for archive, provenance, and long-memory infrastructure already present in Coop. | `$30k-50k` | High | Licensing posture must be fixed early. |
| 3 | [ESP Wishlist: Passkey Support](https://esp.ethereum.foundation/applicants/wishlist/passkey-support) | Direct hit if Coop extracts the generic passkey plus ERC-4337 plus Safe value into a reusable module. | `$20k-30k` for a small-grant-shaped scope | Medium-High | Strong fit only if pitched as ecosystem infrastructure, not just an app. |
| 4 | [Taiko Grants](https://taiko.xyz/grant-program) | Best AI-aligned L2 program for Coop's local AI plus onchain coordination story. | `$25k-100k` | Medium-High | Needs a Taiko-specific proof point. |
| 5 | [Base funding stack](https://docs.base.org/get-started/get-funded) | Easiest active L2 entry point for AI-adjacent builders; good for a small fast win and social proof. | `1-5 ETH` grant plus weekly rewards | Medium-High | Small checks, but fast and aligned. |

Close contenders:

- [Celo Prezenti Season 2 Anchor Grants](https://forum.celo.org/t/final-prezenti-h1-2024-celo-grants/7412): better check size than Base, but stronger demand for mobile and Celo-specific traction.
- [ESP Small Grants](https://esp.ethereum.foundation/applicants/small-grants): very relevant, but less direct than the passkey wishlist if Coop does not extract a reusable component.

## Full Opportunity Matrix

Scoring legend:

- `Mission`: match to Coop's actual product and mission
- `Tech`: match to current stack and shipped architecture
- `Startup`: direct startup eligibility
- `Time`: timing fit as of March 29, 2026
- `Check`: fit to the target funding band
- `Narrative`: how much this grant helps future fundraising and ecosystem credibility

### Active / Open Now

| Rank | Program | Domain | Status as of March 29, 2026 | Deadline or cadence | Amount | Eligibility | Why Coop fits | Why Coop may not fit | Ask | Burden | Probability | Score | Next asset needed | Official source |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | NLnet NGI Zero Commons Fund | Open internet / digital commons | Open now | `April 1, 2026, 12:00 PM CEST` | `EUR 5k-50k` | Individuals, communities, nonprofits, SMEs, academics, public sector | Local-first sync, browser-first capture, privacy, portability, digital commons | Needs a clearly open and reusable scope, not just "consumer app" language | `EUR 30k-50k` | Low | High | `29/30` (`5/5/5/5/4/5`) | Root license, 2-page scope, milestone budget | [Commons Fund](https://nlnet.nl/commonsfund/) |
| 2 | Filecoin Foundation Grants | Archive / permanence | Rolling | Rolling; reviewed on a `3-month cycle` | No fixed public cap on main page | Open-source teams; dual license required | Coop already has Storacha/Filecoin archive flows, receipts, and export logic | Filecoin Foundation requires `MIT` plus `Apache-2.0`; repo posture is not there yet | `$30k-50k` | Low-Medium | High | `28/30` (`5/5/5/4/4/5`) | Licensing decision, archive metrics, retrieval roadmap | [Filecoin Foundation Grants](https://fil.org/grants) |
| 3 | ESP Wishlist: Passkey Support | Ethereum / public goods | Open now | Rolling | No fixed amount on wishlist page | Free and open-source projects that strengthen Ethereum | Coop is already passkey-first and Safe plus ERC-4337 aware | Fit weakens fast if the ask stays app-specific instead of reusable infra | `$20k-30k` | Medium | Medium-High | `27/30` (`5/5/5/4/3/5`) | Extract a reusable passkey plus smart-account package and adoption plan | [Passkey Support Wishlist](https://esp.ethereum.foundation/applicants/wishlist/passkey-support) |
| 4 | Taiko Grants | L2 + AI-aligned | Ongoing | Ongoing program | Typical range not fixed on main page | Builders shipping on Taiko | Taiko explicitly funds AI, infrastructure, tooling, public goods, and apps; Coop fits the local AI plus coordination lane | Needs a Taiko-specific prototype or deployment story | `$25k-100k` | Medium | Medium-High | `26/30` (`4/4/5/5/4/4`) | Taiko-scoped demo, open repo, KPI plan | [Taiko Grants](https://taiko.xyz/grant-program) |
| 5 | Base funding stack | L2 + AI-aligned | Live now | Ongoing / weekly rewards | `1-5 ETH` grants and `up to 2 ETH weekly` rewards | Builders on Base | Strong AI-agents narrative, passkey and smart-account adjacency, low friction | Small checks and likely wants a visible Base deployment | `1-5 ETH` plus rewards | Low | Medium-High | `25/30` (`3/4/5/5/3/5`) | Minimal Base demo, short video, public metrics | [Base get funded](https://docs.base.org/get-started/get-funded) |
| 6 | NLnet NGI Fediversity | Open internet / hosting freedom | Open now | `April 1, 2026, 12:00 PM CEST` | `EUR 5k-50k` | SMEs, academics, public sector, nonprofits, individuals | Coop supports personal and community autonomy, portability, and local-first workflows | Slightly less direct than Commons Fund because Coop is not a hosting stack project | `EUR 20k-40k` | Low | Medium | `24/30` (`4/4/5/5/3/3`) | Narrow the pitch to portability, personal freedom, and hosting independence | [NGI Fediversity](https://www.ngi.eu/opencalls/) |
| 7 | ESP Small Grants | Ethereum / public goods | Open now | Rolling | `Up to $30,000` | Free and open-source Ethereum projects | Good fit if pitched around public goods, infra, and sovereignty-preserving coordination | EF explicitly does not often fund dapps or front-end platforms | `$20k-30k` | Medium | Medium | `24/30` (`4/4/5/4/3/4`) | Small-grants application scoped to one reusable subsystem | [ESP Small Grants](https://esp.ethereum.foundation/applicants/small-grants) |
| 8 | Starknet Grants | L2 + AI-aligned | Open now | Rolling | Seed `up to $25k`; Growth `up to $1M` | Builders and ecosystem projects on Starknet | Good fit if Coop becomes a coordination or AI-agent app for Starknet | Needs a Starknet-specific prototype and clearer user-value on that chain | `$25k` seed or larger growth ask later | Medium | Medium | `23/30` (`3/4/5/4/4/3`) | Decide whether to pursue seed or growth path; build chain-specific demo | [Starknet grants](https://www.starknet.io/developers/grants) |
| 9 | Taiko Takeoff | L2 + AI-aligned | Open now | Ongoing program | `Up to $1M` plus support | Founders and teams building on Taiko | Best large-check AI-aligned L2 path in this pass | Higher burden, stronger proof expectations than the main grants program | `$50k-150k` initially | Medium-High | Medium | `23/30` (`4/4/4/5/3/3`) | Traction story, founder narrative, Taiko-specific roadmap | [Taiko Takeoff](https://takeoff.taiko.xyz/) |
| 10 | Celo Prezenti Season 2 Anchor Grants | L2 + impact / AI-adjacent | Open now | Season 2 proposal says applications opened in `February 2026` and anchor applications close in `June 2026` | Typical `~$25k`; later-stage asks higher | Teams with verifiable traction and clear ecosystem impact | Celo now presents itself as an Ethereum L2 and heavily highlights AI agents, stablecoins, and real-world use; Coop fits community coordination and evidence packaging | Needs a Celo-specific product path, likely more mobile and wallet-native than today's default Coop posture | `$25k` | Medium | Medium | `22/30` (`4/4/4/4/3/3`) | Celo user path, MiniPay or mobile angle, traction evidence | [Prezenti Season 2](https://forum.celo.org/t/final-prezenti-h1-2024-celo-grants/7412) |
| 11 | Celo Builder Rewards / Proof of Ship | L2 + ecosystem growth | Open now | Monthly / ongoing | `10,000 CELO` monthly rewards | Builders shipping on Celo | Useful as a sidecar reward once Coop ships a Celo proof point | This is smaller and more performance-shaped than a core grant | `Reward-only sidecar` | Low | Medium | `20/30` (`3/4/4/4/2/3`) | Ship a narrow Celo integration and public proof of ship | [Fund your project on Celo](https://docs.celo.org/build-on-celo/fund-your-project) |
| 12 | OTF Internet Freedom Fund | Open internet / privacy | Rolling | Rolling; concept note plus invited full proposal | `$10k-900k`; ideal asks often `$50k-200k` | Global nonprofit and for-profit applicants | Coop can make a local-first, anti-centralization, privacy-preserving software case | OTF is stricter than generic civic-tech; Coop is not obviously censorship or circumvention infrastructure today | `$50k` only if a repression/privacy angle is credible | Medium-High | Low | `19/30` (`2/3/5/5/3/1`) | Strong threat model or skip | [Internet Freedom Fund](https://www.opentech.fund/funds/internet-freedom-fund/) |
| 13 | Optimism Season 9 Grants Council | L2 expansion | Open now | `February 11, 2026` to `May 20, 2026` | Depends on proposal | Builders aligned with Season 9 priorities | Superchain and coordination framing is directionally relevant | Current Season 9 emphasis is much more growth, liquidity, and fee-focused than Coop's strongest story | `$20k-50k` only if a Superchain-native use case is crisp | Medium | Low | `18/30` (`2/3/5/4/3/1`) | Tight Optimism-specific thesis or wait for a better season | [Season 9 Grants Council](https://gov.optimism.io/t/season-9-grants-council-applications-now-open/10599) |
| 14 | Safe Guardians of Gardens | Safe ecosystem | Open discussion / community pool | Community-led, no clean recurring cycle | Community SAFE pool; smaller asks implied | Safe ecosystem contributors | Coop has real passkey plus Safe alignment and community coordination value | Safe-wide funding remains noisy after the 2025 resource allocation pause | `$5k-20k` equivalent SAFE | Medium | Low | `18/30` (`3/4/4/3/2/2`) | Direct Safe outreach and a very narrow Safe-native use case | [Guardians of Gardens](https://forum.safe.global/t/introducing-the-safe-guardians-of-gardens-safe-ecosystem-growth-and-signaling/6666) |

### Time-sensitive / Late-stage

| Rank | Program | Domain | Status as of March 29, 2026 | Deadline or cadence | Amount | Eligibility | Why Coop fits | Why Coop may not fit | Ask | Burden | Probability | Score | Next asset needed | Official source |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 15 | Arbitrum D.A.O. Grant Program Season 3 | L2 / ecosystem growth | Late-stage; the official thread says the program runs `until March 2026` or until funds are depleted | One-year program that started on `March 19, 2025` | `Up to 25,000 USDC`; second review up to `50,000 USDC` | Builders applying through Questbook domains | Strong Arbitrum, Safe, and coordination alignment exists in the repo | As of March 29, 2026 this is likely too late unless the application portal still accepts proposals and budget remains | `$25k` | Low-Medium | Low | `16/30` (`3/4/5/1/2/1`) | Verify portal status before writing anything substantial | [Arbitrum D.A.O. Season 3](https://forum.arbitrum.foundation/t/arbitrum-d-a-o-grant-program-season-3-official-thread/28753) |

### Strategic appendices

These are real and worth watching, but they do not beat the active stack above under the current
startup-friendly filter.

| Program | Status as of March 29, 2026 | Why it is not in the top stack | Best use case | Official source |
| --- | --- | --- | --- | --- |
| Prototype Fund | Next round opens `October 1, 2026`; Germany-only | Excellent local-first and open-source fit, but geography is the gating variable | Use only if a German partner or structure becomes real | [Prototype Fund application](https://www.prototypefund.de/en/application) |
| NEH Digital Projects for the Public | Anticipated notice `May 1, 2026`; anticipated deadline `June 30, 2026`; award bands `$30k / $100k / $400k` | Strong public-memory angle, but it is not startup-friendly and wants institution-grade humanities framing | Pursue only with a fiscal sponsor, library, university, or public-history partner | [NEH DPP](https://www.neh.gov/grants/public/digital-projects-the-public) |
| Scroll Community Grants | Public page still shows deadline `December 19, 2025` | Deadline on the public page has already passed | Watch for a fresh cycle; do not treat as live today | [Scroll Community Grants](https://grants.scroll.io/programs/community-grants/) |
| Filecoin Builder Next Steps | No clear 2026 public cycle found in this pass | Last dated public materials are stale relative to March 2026 | Only revisit if Filecoin Foundation confirms a new track directly | [Filecoin devgrants](https://github.com/filecoin-project/devgrants) |

## What The Matrix Says

### The strongest immediate stack

- `NLnet NGI Zero Commons Fund`
- `Filecoin Foundation Grants`
- `ESP Wishlist: Passkey Support`

These three are the cleanest match to Coop's real product and architecture.

### The best L2 and AI tests

- `Taiko Grants`
- `Base funding stack`
- `Celo Prezenti Season 2`
- `Starknet Grants`

These satisfy the explicit requirement to test at least two non-Arbitrum Ethereum L2s and at
least two AI-aligned opportunities.

### The weak-but-watch lanes

- `Optimism Season 9` is open, but the season's center of gravity is not Coop's strongest story.
- `Arbitrum Season 3` is close enough to its stated end date that it should only get effort if the
  portal still clearly accepts applications.
- `Safe Guardians of Gardens` is thematically relevant but structurally less reliable than the top
  stack.

## Prep Checklist For The Top 5

### Common prep for all five

- Add a visible top-level `LICENSE` file and decide whether Coop can support a `MIT` plus
  `Apache-2.0` posture for the relevant reusable components.
- Publish a short public demo video showing capture, review, local AI refinement, and archive or
  proof handoff.
- Create a one-page metrics sheet:
  - what is implemented
  - what is mock-first versus live-gated
  - early users, test communities, or pilot conversations
  - the strongest visible validation evidence
- Prepare a one-page architecture diagram with these layers:
  - browser capture
  - local storage and sync
  - local AI refinement
  - review and publish
  - archive and optional onchain rails
- Write one honest paragraph on current launch posture so applications do not oversell live rails.

### 1. NLnet NGI Zero Commons Fund

- Translate Coop into a digital-commons scope, not a product pitch.
- Focus the proposal on:
  - local-first memory
  - CRDT sync and portability
  - privacy-preserving review and publish boundaries
- Prepare:
  - a 2-page technical scope
  - clear milestones
  - a narrow deliverable that is open and reusable

### 2. Filecoin Foundation Grants

- Lead with verifiable archive, provenance, export, and retrieval.
- Prepare:
  - a clean explanation of current Storacha/Filecoin architecture
  - a roadmap for retrieval, proof visibility, and archive trust
  - a licensing answer that is compatible with Filecoin Foundation criteria

### 3. ESP Wishlist: Passkey Support

- Extract the ecosystem value from the product.
- Prepare:
  - a reusable passkey plus smart-account scope
  - concrete Safe and ERC-4337 compatibility goals
  - an adoption plan that other builders can use
- Keep the ask small and specific on the first pass.

### 4. Taiko Grants

- Present Coop as a trustworthy local-AI coordination tool, not a generic AI app.
- Prepare:
  - a Taiko-specific demo or prototype
  - one concrete AI-enabled workflow
  - one clear onchain action or proof flow

### 5. Base funding stack

- Treat Base as a fast tactical lane.
- Prepare:
  - a minimal Base deployment or agent flow
  - a short public demo
  - a social-facing builder page and public changelog
- Pair the grant ask with Builder Rewards if a weekly activity rhythm is realistic.

## Default Ask Bands

- `Seed`: `$5k-30k`
  - NLnet, EF Small Grants, Base, Celo sidecars, Starknet Seed
- `Core`: `$30k-100k`
  - Filecoin Foundation, Taiko Grants, Celo Prezenti, stronger EF project-grant-shaped scopes
- `Stretch`: `$100k+`
  - Taiko Takeoff, Starknet Growth, NEH only with a partner structure

## Recommended Action Order

1. Draft `NLnet NGI Zero Commons Fund` immediately.
2. Draft `Filecoin Foundation Grants` immediately after, with archive-specific language.
3. Draft `ESP Wishlist: Passkey Support` as a reusable subsystem proposal.
4. Build one `Taiko` or `Base` chain-specific prototype before applying to both.
5. Decide whether `Celo Prezenti` gets a serious push based on whether you want a stronger mobile
   and impact-first chain story.

## Bottom line

If Coop only pursues five targets in the next month, the cleanest stack is:

1. `NLnet NGI Zero Commons Fund`
2. `Filecoin Foundation Grants`
3. `ESP Wishlist: Passkey Support`
4. `Taiko Grants`
5. `Base funding stack`

If Coop wants one additional L2 path with a larger check size than Base, add:

- `Celo Prezenti Season 2 Anchor Grants`
