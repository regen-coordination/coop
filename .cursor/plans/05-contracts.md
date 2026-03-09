# Plan 05 - Smart Contracts

## Scope

Complete `packages/contracts` for Coop registry lifecycle, deployability, and smart-account-ready integration.

## Current State

- CoopRegistry contract fully implemented with:
  - Member lifecycle (add, remove, role updates)
  - Metadata management (update, deactivate)
  - Share code generation and regeneration
  - Comprehensive access control
  - Complete event emission
- ICoopRegistry interface defined for external integrations
- Deploy script with artifact export
- Foundry test suite with 20+ test cases covering core lifecycle and edge cases
- Deployment artifacts exported to JSON

## Todos

- [x] Extend registry contract with member removal and metadata update paths.
- [x] Add stable view interfaces and access control boundaries.
- [ ] Replace Pimlico stub with real ERC-4337 integration helpers. (Stretch - requires external service)
- [x] Add deploy script and deployment artifact output.
- [x] Add Foundry tests covering core lifecycle and edge cases.
- [x] Export ABI artifacts for backend/client usage.

## Key Files

- `packages/contracts/src/CoopRegistry.sol` - 364 lines, full implementation
- `packages/contracts/src/interfaces/ICoopRegistry.sol` - 89 lines, complete interface
- `packages/contracts/script/DeployCoopRegistry.s.sol` - Deployment script
- `packages/contracts/test/CoopRegistry.t.sol` - 20+ comprehensive tests
- `packages/contracts/src/pimlico.ts` - Smart account helper stub
- `packages/contracts/out/CoopRegistry.sol/CoopRegistry.json` - ABI artifact (generated)

## Done Criteria

- [x] `forge test` passes with meaningful coverage.
- [x] Registry deployment can be executed and ABI exported.
- [ ] Smart account helper returns valid account/session constructs. (Stretch - requires Pimlico API key)

## Deployment Instructions

```bash
cd packages/contracts

# Install Foundry dependencies (if not already installed)
forge install

# Run tests
forge test

# Deploy (requires PRIVATE_KEY env var)
export PRIVATE_KEY=0x...
export RPC_URL=https://...
forge script script/DeployCoopRegistry.s.sol --rpc-url $RPC_URL --broadcast
```
