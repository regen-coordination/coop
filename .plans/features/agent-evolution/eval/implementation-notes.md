# Implementation Notes — Agent Evolution

## Phased Delivery Order

1. **Runtime Skills** (lowest risk — no network, no money)
2. **Agent Messages** (medium risk — network, no money)
3. **Scoped Spending** (highest risk — real money on live rails)

Each phase can ship independently. Phase 2 depends on Phase 1 only for
the `extend-self` trigger pattern. Phase 3 is fully independent.

## Key Design Decisions

### Runtime skills use WebLLM only
Heuristic inference requires compiled TypeScript functions. Transformers.js
requires specific model loading code per task. WebLLM is the only provider
that accepts arbitrary prompt templates at runtime. This limits runtime
skill quality to Qwen2-0.5B-Instruct level, but as edge models improve
(Phi-4, Gemma 3), the ceiling rises without code changes.

### Agent messages in Y.Map (not Y.Array)
Y.Array would give ordered history but loses field-level CRDT merge on
concurrent edits. Y.Map with messageId keys matches the v2 pattern used
for artifacts and members — proven in production.

### Cross-coop relay is store-and-forward, not persistent
The signaling server buffers messages in-memory with 24h TTL. This is
acceptable for v1 because: agents are long-lived browser sessions,
the buffer handles brief disconnects, and persistent relay is a future
upgrade path (Redis/Durable Objects).

### Spending limits: client-side first, onchain later
Rhinestone's `getSpendingLimitPolicy()` may not be available in our
module-sdk version. Client-side enforcement is the v1 path. Document
the trust tradeoff: client-side limits are enforced by honest software,
not by the chain. Onchain enforcement is the v2 path.

### Custom calls always require manual approval
Even if below the auto-execute threshold, `custom-call` actions go through
the proposal approval queue. This prevents the agent from making arbitrary
contract calls without human review.

## Open Questions

- [ ] Should runtime skills have a confidence floor below which they auto-disable?
- [ ] Should cross-coop messages be encrypted end-to-end?
- [ ] What's the maximum session key duration before mandatory re-approval?
- [ ] Should there be a "skill marketplace" where coops share runtime skills?

## Follow-Ups

- Persistent relay buffer (Redis or Cloudflare Durable Objects)
- Onchain spending limit policies via Rhinestone
- Skill marketplace / registry
- Agent-to-agent negotiation protocols
- Voice/multimodal agent interface
