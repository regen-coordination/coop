#!/usr/bin/env bun

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { repoRoot } from './load-root-env';

const profile = process.argv[2];

if (!profile) {
  console.error('Usage: bun run ./scripts/package-extension.ts <profile>');
  process.exit(1);
}

const allowedProfiles = new Set(['public-release', 'operator-live', 'local-live-sepolia']);
if (!allowedProfiles.has(profile)) {
  console.error(
    `Unsupported profile "${profile}". Expected one of: ${Array.from(allowedProfiles).join(', ')}.`,
  );
  process.exit(1);
}

const extensionRoot = path.join(repoRoot, 'packages', 'extension');
const buildDir = path.join(extensionRoot, 'dist', 'chrome-mv3');
const archivesDir = path.join(extensionRoot, 'dist', 'archives');
const timestamp = new Date().toISOString().replaceAll(':', '-');
const archivePath = path.join(archivesDir, `coop-extension-${profile}-${timestamp}.zip`);

function run(command: string[], cwd = repoRoot) {
  const result = spawnSync(command[0], command.slice(1), {
    cwd,
    stdio: 'inherit',
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const zipCheck = spawnSync('sh', ['-lc', 'command -v zip'], {
  cwd: repoRoot,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'ignore'],
});

if (zipCheck.status !== 0) {
  console.error('The `zip` command is required to package the extension archive.');
  process.exit(1);
}

run(['bun', 'run', `build:extension:${profile}`]);

if (!fs.existsSync(path.join(buildDir, 'manifest.json'))) {
  console.error(`Expected extension build output at ${buildDir}, but manifest.json was not found.`);
  process.exit(1);
}

fs.mkdirSync(archivesDir, { recursive: true });
run(['zip', '-qr', archivePath, '.'], buildDir);

console.log(`[package:extension] Created ${path.relative(repoRoot, archivePath)}`);
