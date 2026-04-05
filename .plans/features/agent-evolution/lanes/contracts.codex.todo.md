---
feature: agent-evolution
title: Agent evolution contracts lane
lane: contracts
agent: codex
status: ready
source_branch: feature/agent-evolution
work_branch: codex/contracts/agent-evolution
depends_on:
  - ../spec.md
  - state.codex.todo.md
owned_paths:
  - packages/shared/src/modules/onchain
  - packages/shared/src/modules/session
  - packages/shared/src/modules/member-account
  - packages/shared/src/contracts/schema-session.ts
  - packages/contracts
done_when:
  - generalizedSessionScope
  - executeTransferErc20
  - agentSessionKeyProvisioning
  - spendingLimitOnchain
skills:
  - contracts
  - onchain
  - permissions
updated: 2026-04-05
---

# Contracts Lane — Agent Evolution

## Objective

Generalize session key scoping beyond Green Goods, add spending limit policies,
provision session keys for agent identity, and build spending action executors.

## Phase 1: Generalized Session Key Scoping

### 1.1 Extend action class registry
- [ ] Add to `SESSION_CAPABLE_ACTION_CLASSES` in `session-constants.ts`:
  - `transfer-erc20` — ERC-20 transfer(address,uint256)
  - `approve-erc20` — ERC-20 approve(address,uint256)
  - `transfer-native` — Native token (ETH/ARB) value transfer
  - `custom-call` — Arbitrary contract call (requires target allowlist)
- [ ] Add corresponding `PolicyActionClass` entries in `schema-policy.ts`
- [ ] Define target selectors for each new action class
- **Verify**: schema validation tests for new action classes

### 1.2 Spending limit onchain policy
- [ ] Investigate Rhinestone `getSpendingLimitPolicy()` in current module-sdk version
- [ ] If available: integrate in `buildSmartSession()` with token/max-per-tx/max-per-day config
- [ ] If not: implement client-side spending limit validation (document tradeoff)
- [ ] Add `SpendingLimitConfig` type to `schema-session.ts`
- **Verify**: spending limit policy integration test

### 1.3 Agent session key provisioning
- [ ] `createAgentSessionSigner()` — generate P-256 key pair for agent
  - Private key stored encrypted in Dexie (existing db-encryption pattern)
  - Derive public key for session validator
- [ ] `enableAgentSession(safeAddress, agentSigner, scope)`:
  - Build session with `buildSmartSession()` using agent signer
  - Enable on Safe via `buildEnableSessionExecution()`
  - Submit UserOp via Pimlico bundler
  - Return permissionId
- [ ] `executeWithAgentSession(permissionId, action)`:
  - Sign UserOp with agent session key
  - Validate spending limits before submission
  - Submit via bundler
- [ ] `revokeAgentSession(permissionId)`:
  - Build removal execution
  - Requires member's passkey (not agent's key)
- **Verify**: mock-mode full lifecycle (create -> enable -> execute -> revoke)

### 1.4 Agent identity onchain binding
- [ ] Link agent session key to ERC-8004 agentId in manifest
- [ ] Add `sessionKeyAddress` to `AgentManifest.capabilities` in `erc8004.ts`
- [ ] On key rotation: update ERC-8004 registration
- [ ] Add `agent-session-active` capability flag
- **Verify**: ERC-8004 manifest includes session key after provisioning

## Phase 2: Spending Action Executors

### 2.1 Token transfer executor
- [ ] Add `executeTransferErc20` to action executor registry
  - Build transfer(to, amount) calldata
  - Validate token against session allowlist
  - Execute via agent session key
- [ ] Add `executeTransferNative` for ETH/ARB
  - Build value transfer UserOp
  - Validate amount against spending limit
- **Verify**: mock transfer execution test

### 2.2 Custom call executor
- [ ] Add `executeCustomCall` to action executor registry
  - Validate target against session allowlist
  - Validate selector against allowed selectors
  - Build calldata from action payload
  - Execute via agent session key
- [ ] Guardrail: custom calls require `proposal` approval mode (never auto-run)
- **Verify**: mock custom call with allowlist validation

## Verification

- [ ] `bun run test -- packages/shared/src/modules/session` passes
- [ ] `bun run test -- packages/shared/src/modules/onchain` passes
- [ ] `bun run validate smoke` before handoff

## Handoff Notes

- Spending limit may be client-side only (not onchain) in v1 — document clearly
- Custom calls are always manual-approval (never auto-execute)
- Agent session key rotation requires member re-approval
- Test with both sepolia (testnet) and mock mode
