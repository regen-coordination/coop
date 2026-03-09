# Plan 02 - Anchor Node Backend

## Scope

Implement production-grade Coop backend behavior in `packages/anchor` for inference, Coop lifecycle, relay, and storage.

## Current State

- Fastify server and full routes exist with comprehensive test coverage.
- WS relay with room scoping and broadcast tested.
- Inference: real Anthropic integration with fallback mode.
- Storacha: full client integration with delegation support, fallback mode, and mocked tests.
- Pillar logic: baseline extraction tested across all four pillars.

## Todos

- [x] Implement real AI inference service and pillar-specific prompt flows.
- [x] Integrate Storacha upload flow with real CID outputs.
- [x] Add Coop management REST API (`create`, `join`, `get`, `feed`, `members`).
- [x] Implement room-scoped WS protocol with typed message events.
- [x] Replace in-memory state with SQLite persistence.
- [x] Add CORS setup for extension and local PWA origins.
- [x] Add integration tests for Coop REST and WS flows.
- [x] Add tests for Storacha upload with mocked client.

## Key Files

- `packages/anchor/src/ai/inference.ts`
- `packages/anchor/src/agent/pillars.ts`
- `packages/anchor/src/agent/runtime.ts`
- `packages/anchor/src/storage/storacha.ts`
- `packages/anchor/src/api/routes.ts`
- `packages/anchor/src/server.ts`
- `packages/anchor/src/__tests__/pillars.test.ts`
- `packages/anchor/src/__tests__/coop-api.test.ts`
- `packages/anchor/src/__tests__/websocket.test.ts`
- `packages/anchor/src/__tests__/storacha.test.ts`

## Dependencies to Install

- `@anthropic-ai/sdk`
- `@storacha/client`
- `better-sqlite3`
- `@fastify/cors`

## Done Criteria

- Coop REST and WS flows run end-to-end.
- At least one pillar performs real structured inference.
- Cold storage upload returns real CID metadata.
