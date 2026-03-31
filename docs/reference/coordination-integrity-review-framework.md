---
title: "Coordination Integrity Review Framework"
slug: /reference/coordination-integrity-review-framework
---

# Coordination Integrity Review Framework

This document explains how Coop should use Regis Lloyd Chapman (Durgadas)'s
[Coordination Structural Integrity Suite](https://github.com/durgadasji/standards)
as an external build-and-review instrument.

The important boundary:

- we can use the standards to guide design and review
- we should not imply that Coop holds formal conformance or full designation
- if we speak publicly about alignment, we should do it through explicit exposure disclosure rather
  than vague "we are compliant" language

## 1. The Source Set

Suite-level reference:

- [Coordination Structural Integrity Suite README](https://github.com/durgadasji/standards/blob/main/README.md)

Compressive standards:

- [Precision-First Design Standard](https://github.com/durgadasji/standards/blob/main/tensegrity-suite/compressive/standards/standards-2_0-precision-first-1_5_12.md)
- [Adverse-Signal Engagement Principle Core Standard](https://github.com/durgadasji/standards/blob/main/tensegrity-suite/compressive/standards/standards-2_0-adverse-signal-engagement-0_7_0.md)
- [Structural Consent Legibility Standard](https://github.com/durgadasji/standards/blob/main/tensegrity-suite/compressive/standards/standards-2_0-structural-consent-0_3_16.md)
- [Information Asymmetry Classification Standard](https://github.com/durgadasji/standards/blob/main/tensegrity-suite/compressive/standards/standards-2_0-information-asymmetry-0_1_17.md)
- [Structural Power Distribution Standard](https://github.com/durgadasji/standards/blob/main/tensegrity-suite/compressive/standards/standards-2_0-structural-power-distribution-0_1_14.md)

Generative standards:

- [Sensemaking Standard](https://github.com/durgadasji/standards/blob/main/tensegrity-suite/generative/standards/standards-2_0-sensemaking-1_1_12.md)
- [Four Batteries Capacity Standard](https://github.com/durgadasji/standards/blob/main/tensegrity-suite/generative/standards/standards-2_0-four-batteries-capacity-0_2_16.md)
- [Conflict Transformation Standard](https://github.com/durgadasji/standards/blob/main/tensegrity-suite/generative/standards/standards-2_0-conflict-transformation-0_2_2.md)

## 2. Why We Are Using It

The standards are valuable to Coop because they force a harder question than "is this feature
useful?"

They ask:

- does the system make coordination more legible?
- does it reduce hidden power and hidden consent failure?
- does it surface adverse signals rather than metabolizing them into noise?
- does it build the conditions for real community capacity rather than only operational output?

That is a better review standard for Coop than generic product polish alone.

## 3. The Adoption Boundary

The suite README defines a five-tier adoption architecture and distinguishes between:

- adoption level
- full Tensegrity Compressive Standards designation
- structural exposure disclosure

The operational implication for Coop is straightforward:

- do not claim full designation
- do not speak as though partial alignment equals conformance
- if we reference the standards publicly, prefer a structural exposure disclosure

## 4. Recommended Current Posture

The conservative posture is:

- use the suite internally for review and design
- treat current alignment as exploratory and pre-adoption
- build documentation and review habits first
- only discuss tier language publicly when there is durable evidence behind it

At the moment, Coop can credibly say:

- the standards influence our design and review thinking
- several current product principles align with the suite
- we are not claiming formal conformance

## 5. How To Use The Five Compressive Standards

These five standards are the best build-and-review layer for current product and governance work.

### 5.1 Precision-First Design Standard

Use it to review whether Coop's product and docs say exactly what the system does.

### Questions

- are "local," "shared," "archived," and "onchain" operationally distinguishable?
- does a reader know which flows are mock, rehearsal, or live?
- are role boundaries precise enough that an outside reviewer could identify who can do what?

### Coop application

- demo narration
- release notes
- settings copy
- archive and Green Goods language
- role and permission copy in the extension

### Failure mode to catch

- attractive but non-falsifiable product claims

### 5.2 Adverse-Signal Engagement Principle Core Standard

Use it to review whether Coop has real channels for uncomfortable product truth.

### Questions

- where do failed demos, sync failures, broken archive flows, and trust confusion get recorded?
- what signals are easy for the team to ignore because they are embarrassing or hard to classify?
- what would count as an implausible absence of reported issues?

### Coop application

- QA process
- bug triage
- pilot feedback
- post-demo review
- governance and operator incident review

### Failure mode to catch

- treating absence of surfaced problems as evidence of product health

### 5.3 Structural Consent Legibility Standard

Use it to review whether participants can tell what they are consenting to.

### Questions

- can a member tell what stays local and what becomes shared?
- can a member tell whether an action benefits them, the coop, or an operator?
- can a member refuse or withdraw cleanly from high-impact actions?

### Coop application

- explicit publish boundary
- receiver pairing
- archive prompts
- policy approvals
- Green Goods actions

### Failure mode to catch

- users participating in flows whose actual consequence is structurally unclear

### 5.4 Information Asymmetry Classification Standard

Use it to review whether the system is hiding meaningful advantage or dependency.

The suite introduces six classes of asymmetry. For Coop, the most practical use is to ask where
hidden advantage might live:

- positional: who has access or role knowledge others do not
- temporal: who knows earlier, or can act before others can respond
- interpretive: who has the vocabulary to define what the system means
- relational: who can move things through trust networks that others cannot access
- omission: what never enters the record
- complexity: what is technically visible but practically unreadable

### Coop application

- operator-only knowledge
- archive provenance visibility
- release posture language
- complex settings or auth flows
- docs that insiders understand but new users cannot parse

### Failure mode to catch

- a system that is formally transparent but practically unreadable

### 5.5 Structural Power Distribution Standard

Use it to review whether convenience is quietly concentrating control.

The standard emphasizes three dimensions that should be assessed separately:

- coordination
- authority
- specialization

### Questions

- who defines what counts as a valid action or artifact?
- who can override, approve, or publish?
- where does specialized interpretive power accumulate?

### Coop application

- trusted member versus member posture
- Safe owner versus session capability posture
- operator and archive authority
- internal understanding of complex rails

### Failure mode to catch

- a product that sounds distributed while interpretive and operational power silently centralize

## 6. How To Use The Three Generative Standards

These standards are better for roadmap and organizational health than for feature-level acceptance
alone.

### 6.1 Sensemaking Standard

Use it to evaluate whether the product increases shared interpretive capacity.

For Coop this means:

- better detection of meaningful change
- better movement from specific artifacts to larger patterns
- tighter relationship between understanding and action
- continuity over time

### 6.2 Four Batteries Capacity Standard

Use it to evaluate whether Coop strengthens or drains:

- Personal battery
- Relational battery
- Contribution battery
- Mission battery

This is especially useful for:

- pilot design
- team rituals
- community onboarding
- feature prioritization around overload versus clarity

### 6.3 Conflict Transformation Standard

Use it to evaluate whether Coop can eventually treat conflict as coordination data rather than
cleanup work.

That does not mean implementing a conflict platform now. It means leaving space for:

- visible disagreement records
- response pathways
- early engagement before escalation
- resourcing the work of transformation

## 7. Build Review Sequence

When using the suite in practice, review in this order:

1. precision: what exactly are we claiming?
2. consent: can the participant tell what is happening and for whom?
3. asymmetry: what remains hidden, unreadable, or insider-only?
4. power: where can control accumulate?
5. adverse signals: what bad news would this structure suppress?
6. sensemaking and batteries: does this make the community stronger, or only busier?

## 8. Suggested Structural Exposure Disclosure Template

If Coop ever references the suite publicly in a stronger way, use a real disclosure instead of
implied conformance.

### Template

**Scope.**
Name the product area or organizational area being discussed.

**Adopted standards.**
List the standards actually being used and the maturity of use.

**Absent or sub-mature standards.**
Name the standards not yet operationalized.

**Exposure created by that gap.**
Describe what becomes structurally harder to detect or govern because of the missing layer.

**Compensating controls.**
Describe the current mechanisms that partially reduce the exposure.

**Remaining open questions.**
Name what still needs pilot evidence, governance process, or product design work.

## 9. Coop-Specific Near-Term Recommendations

- keep all public product claims precise about live versus mock rails
- create a lightweight adverse-signal log for demos, pilots, and release blockers
- document consent boundaries in the user-facing archive, publish, and onchain flows
- explicitly map member, trusted member, session capability, permit, and Safe-owner powers in user
  language
- use the four batteries as a lens for evaluating whether new features increase clarity or merely
  increase coordination burden

## 10. Related Docs

- [Coop Vision](/reference/coop-vision)
- [Coop Strategy](/reference/coop-strategy)
- [Coop Monetization Path](/reference/coop-monetization-path)
- [Future Features Deep Dive](/reference/future-features-deep-dive)
