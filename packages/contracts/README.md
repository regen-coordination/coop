# Contracts Sidecar

`packages/contracts/` is a Foundry workspace for the Solidity registry and deployment artifacts.

- It is a support directory, not a Bun workspace package.
- Runtime builds still follow `shared -> app -> extension`.
- Contract source, scripts, tests, and deployment JSON live here so the onchain layer can evolve
  without pulling Solidity tooling into the main browser/runtime packages.

Key files:

- `foundry.toml`
- `src/CoopRegistry.sol`
- `script/DeployRegistry.s.sol`
- `test/CoopRegistry.t.sol`
