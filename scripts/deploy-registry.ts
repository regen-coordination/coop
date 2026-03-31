/**
 * Deploy CoopRegistry to Filecoin (Calibration or Mainnet).
 *
 * Usage:
 *   bun run deploy:registry                    # dry-run (build + test only)
 *   bun run deploy:registry --broadcast        # live deploy on calibration
 *   bun run deploy:registry --network mainnet --broadcast  # live deploy on mainnet
 */

import { $ } from 'bun';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const CONTRACTS_DIR = resolve(import.meta.dirname!, '../packages/contracts');
const DEPLOYMENTS_DIR = resolve(CONTRACTS_DIR, 'deployments');

const NETWORKS: Record<string, { rpcUrl: string; chainId: number; deploymentFile: string }> = {
  calibration: {
    rpcUrl: 'https://api.calibration.node.glif.io/rpc/v1',
    chainId: 314_159,
    deploymentFile: 'filecoin-calibration.json',
  },
  mainnet: {
    rpcUrl: 'https://api.node.glif.io/rpc/v1',
    chainId: 314,
    deploymentFile: 'filecoin-mainnet.json',
  },
};

const KEYSTORE_ACCOUNT = 'green-goods-deployer';

function parseArgs() {
  const args = process.argv.slice(2);
  let network = 'calibration';
  let broadcast = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--network' && args[i + 1]) {
      network = args[++i]!;
    } else if (args[i] === '--broadcast') {
      broadcast = true;
    }
  }

  if (!NETWORKS[network]) {
    console.error(`Unknown network: ${network}. Available: ${Object.keys(NETWORKS).join(', ')}`);
    process.exit(1);
  }

  return { network, broadcast };
}

async function main() {
  const { network, broadcast } = parseArgs();
  const config = NETWORKS[network]!;

  console.log(`\n  CoopRegistry Deployment`);
  console.log(`  Network:   ${network} (chain ${config.chainId})`);
  console.log(`  RPC:       ${config.rpcUrl}`);
  console.log(`  Account:   ${KEYSTORE_ACCOUNT} (Foundry keystore)`);
  console.log(`  Mode:      ${broadcast ? 'BROADCAST (live)' : 'dry-run (build + test only)'}\n`);

  // Clean + build to ensure fresh bytecode (Filecoin needs evm_version = "paris")
  console.log('  Cleaning and building contracts...');
  await $`forge clean`.cwd(CONTRACTS_DIR).quiet();
  const build = await $`forge build`.cwd(CONTRACTS_DIR).quiet();
  if (build.exitCode !== 0) {
    console.error('  Build failed:', build.stderr.toString());
    process.exit(1);
  }
  console.log('  Build OK\n');

  // Run tests
  console.log('  Running tests...');
  const test = await $`forge test`.cwd(CONTRACTS_DIR).quiet();
  if (test.exitCode !== 0) {
    console.error('  Tests failed:', test.stderr.toString());
    process.exit(1);
  }
  console.log('  Tests OK\n');

  if (!broadcast) {
    console.log('  Dry-run complete (build + tests passed). Add --broadcast to deploy.\n');
    return;
  }

  // Use forge create for direct deployment (no script caching issues)
  // Note: stdio fully inherited so keystore password prompt works correctly
  const forgeArgs = [
    'create',
    'src/CoopRegistry.sol:CoopRegistry',
    '--rpc-url',
    config.rpcUrl,
    '--account',
    KEYSTORE_ACCOUNT,
  ];

  console.log(
    `  Running: forge create src/CoopRegistry.sol:CoopRegistry --rpc-url ${config.rpcUrl} --account ${KEYSTORE_ACCOUNT}\n`,
  );

  // Run forge create with full stdio inheritance for keystore password prompt
  const result = Bun.spawnSync(['forge', ...forgeArgs], {
    cwd: CONTRACTS_DIR,
    stdio: ['inherit', 'inherit', 'pipe'],
  });

  const stderr = result.stderr.toString();

  if (result.exitCode !== 0) {
    if (stderr) console.error(stderr);
    console.error('\n  Deployment failed.');
    process.exit(1);
  }

  // forge create prints "Deployed to: 0x..." and "Transaction hash: 0x..." to stdout
  // Since stdout is inherited (goes to terminal), we ask the user to provide the address
  console.log('\n  If deployment succeeded, update the deployment record:');
  console.log(`    File: packages/contracts/deployments/${config.deploymentFile}`);
  console.log('    Copy the "Deployed to" address and "Transaction hash" from the output above.\n');

  // Also try to read the deployed address from nonce-based computation
  const nonceResult = Bun.spawnSync(
    ['cast', 'nonce', '0xFBAf2A9734eAe75497e1695706CC45ddfA346ad6', '--rpc-url', config.rpcUrl],
    { stdio: ['pipe', 'pipe', 'pipe'] },
  );
  const nonce = Number.parseInt(nonceResult.stdout.toString().trim(), 10);
  if (nonce > 0) {
    const addrResult = Bun.spawnSync(
      [
        'cast',
        'compute-address',
        '0xFBAf2A9734eAe75497e1695706CC45ddfA346ad6',
        '--nonce',
        String(nonce - 1),
      ],
      { stdio: ['pipe', 'pipe', 'pipe'] },
    );
    const computed = addrResult.stdout.toString().match(/0x[0-9a-fA-F]{40}/)?.[0];
    if (computed) {
      // Verify there's code at this address
      const codeResult = Bun.spawnSync(['cast', 'code', computed, '--rpc-url', config.rpcUrl], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      const code = codeResult.stdout.toString().trim();
      if (code !== '0x' && code.length > 2) {
        const deployment = {
          registryAddress: computed,
          deployTxHash: null,
          deployedAt: new Date().toISOString(),
          chainId: config.chainId,
          note: `Deployed via forge create with keystore account ${KEYSTORE_ACCOUNT}`,
        };
        const deploymentPath = resolve(DEPLOYMENTS_DIR, config.deploymentFile);
        await writeFile(deploymentPath, JSON.stringify(deployment, null, 2) + '\n');
        console.log(`  Auto-detected deployed contract: ${computed}`);
        console.log(`  Saved to: ${config.deploymentFile}\n`);
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
