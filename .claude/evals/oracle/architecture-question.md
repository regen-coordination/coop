# Oracle Eval: Architecture Question

**Status**: ready
**Last run**: —
**Last score**: —

## Scenario

> "Why does Coop use y-webrtc instead of y-websocket as the primary sync transport?"

## Expected Output

Must address:
1. **Privacy/local-first rationale**: y-webrtc sends data directly peer-to-peer, so the server never sees document content — aligning with Coop's local-first principle
2. **y-websocket as fallback**: Coop does use y-websocket (via the API server at `/yws`) as a fallback for document sync when WebRTC fails
3. **Signaling vs transport distinction**: The API server provides signaling (peer discovery) but doesn't relay document data in the primary path

Must cite at least 2 sources from the codebase (e.g., CLAUDE.md, ADR-007, shared/storage module, API server ws handler).

## Eval Criteria

| Criterion | Weight | Pass | Fail |
|-----------|--------|------|------|
| Explains privacy rationale | 30% | Connects y-webrtc to local-first/privacy | Generic "it's faster" answer |
| Mentions y-websocket fallback | 25% | Identifies y-websocket as fallback, not absent | Says Coop doesn't use y-websocket |
| Cites 2+ sources | 20% | References specific files or docs | Only reads one file |
| Accurate technical details | 15% | Correct on signaling vs transport | Confuses signaling with relay |
| Actionable conclusion | 10% | Summarizes when each transport is used | Ends without synthesis |
