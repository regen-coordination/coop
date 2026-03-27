#!/usr/bin/env bun

import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';

export const PLAN_ROOT = '.plans';
export const FEATURE_ROOT = join(PLAN_ROOT, 'features');
const TEMPLATE_ROOT = join(PLAN_ROOT, 'templates', 'feature');
const TODO_SUFFIX = '.todo.md';

type FrontmatterValue = string | string[];

export interface PlanEntry {
  path: string;
  featureDir: string;
  feature: string;
  title: string;
  lane: string;
  agent: string;
  status: string;
  sourceBranch: string;
  workBranch?: string;
  skills: string[];
  dependsOn: string[];
  handoffIn?: string;
  handoffOut?: string;
  qaOrder?: number;
  updated: string;
  missingDependencies: string[];
  blockedBy: string[];
  handoffReady: boolean;
  runnable: boolean;
}

interface FilterOptions {
  agent?: string;
  lane?: string[];
  status?: string;
  runnable?: boolean;
  handoffReady?: boolean;
}

interface ValidationResult {
  featureCount: number;
  legacyPlanCount: number;
  legacyPlans: string[];
  planCount: number;
  issues: string[];
}

function walkFiles(dir: string): string[] {
  if (!existsSync(dir)) {
    return [];
  }

  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      return walkFiles(entryPath);
    }
    return entry.isFile() ? [entryPath] : [];
  });
}

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

export function parseFrontmatter(content: string): {
  data: Record<string, FrontmatterValue>;
  body: string;
} {
  if (!content.startsWith('---\n')) {
    return { data: {}, body: content };
  }

  const endIndex = content.indexOf('\n---\n', 4);
  if (endIndex === -1) {
    return { data: {}, body: content };
  }

  const raw = content.slice(4, endIndex);
  const body = content.slice(endIndex + 5);
  const lines = raw.split('\n');
  const data: Record<string, FrontmatterValue> = {};

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim()) {
      continue;
    }

    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) {
      continue;
    }

    const [, key, rest] = match;
    if (rest.trim()) {
      data[key] = stripQuotes(rest);
      continue;
    }

    const values: string[] = [];
    while (index + 1 < lines.length) {
      const next = lines[index + 1];
      const itemMatch = next.match(/^\s*-\s+(.*)$/);
      if (!itemMatch) {
        break;
      }
      values.push(stripQuotes(itemMatch[1]));
      index += 1;
    }
    data[key] = values;
  }

  return { data, body };
}

function asString(value: FrontmatterValue | undefined): string {
  return typeof value === 'string' ? value : '';
}

function asList(value: FrontmatterValue | undefined): string[] {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }
  if (!value) {
    return [];
  }
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function relativeRepoPath(rootDir: string, absolutePath: string): string {
  const rel = relative(rootDir, absolutePath);
  return rel || '.';
}

function getGitBranches(rootDir: string): Set<string> {
  const result = spawnSync(
    'git',
    ['for-each-ref', 'refs/heads', 'refs/remotes', '--format=%(refname:short)'],
    {
      cwd: rootDir,
      encoding: 'utf8',
    },
  );

  if (result.status !== 0 || !result.stdout) {
    return new Set<string>();
  }

  return new Set(
    result.stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
  );
}

export function findLegacyPlans(rootDir = process.cwd()): string[] {
  const plansRoot = resolve(rootDir, PLAN_ROOT);
  if (!existsSync(plansRoot)) {
    return [];
  }

  return readdirSync(plansRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name.endsWith('.md') && name !== 'README.md')
    .map((name) => join(plansRoot, name));
}

export function collectPlans(
  rootDir = process.cwd(),
  branchNames = getGitBranches(rootDir),
): PlanEntry[] {
  const featureRoot = resolve(rootDir, FEATURE_ROOT);
  const files = walkFiles(featureRoot).filter((file) => file.endsWith(TODO_SUFFIX));
  const parsed = files.map((file) => {
    const content = readFileSync(file, 'utf8');
    const { data } = parseFrontmatter(content);
    const feature = asString(data.feature) || basename(dirname(dirname(file)));
    const qaOrder = Number.parseInt(asString(data.qa_order), 10);

    return {
      path: file,
      featureDir: dirname(dirname(file)),
      feature,
      title: asString(data.title),
      lane: asString(data.lane),
      agent: asString(data.agent),
      status: asString(data.status),
      sourceBranch: asString(data.source_branch),
      workBranch: asString(data.work_branch) || undefined,
      skills: asList(data.skills),
      dependsOn: asList(data.depends_on),
      handoffIn: asString(data.handoff_in) || undefined,
      handoffOut: asString(data.handoff_out) || undefined,
      qaOrder: Number.isNaN(qaOrder) ? undefined : qaOrder,
      updated: asString(data.updated),
      missingDependencies: [],
      blockedBy: [],
      handoffReady: false,
      runnable: false,
    } satisfies PlanEntry;
  });

  const byPath = new Map(parsed.map((plan) => [resolve(plan.path), plan]));

  return parsed.map((plan) => {
    const missingDependencies: string[] = [];
    const blockedBy: string[] = [];

    for (const dependency of plan.dependsOn) {
      const dependencyPath = resolve(dirname(plan.path), dependency);
      if (!existsSync(dependencyPath)) {
        missingDependencies.push(relativeRepoPath(rootDir, dependencyPath));
        continue;
      }

      const dependencyPlan = byPath.get(dependencyPath);
      if (dependencyPlan && !['done', 'archived'].includes(dependencyPlan.status)) {
        blockedBy.push(
          `${relativeRepoPath(rootDir, dependencyPath)} (${dependencyPlan.status || 'unknown'})`,
        );
      }
    }

    const handoffReady = !plan.handoffIn || branchNames.has(plan.handoffIn);
    return {
      ...plan,
      missingDependencies,
      blockedBy,
      handoffReady,
      runnable:
        plan.status === 'ready' &&
        missingDependencies.length === 0 &&
        blockedBy.length === 0 &&
        handoffReady,
    };
  });
}

export function filterPlans(plans: PlanEntry[], options: FilterOptions): PlanEntry[] {
  return plans.filter((plan) => {
    if (options.agent && plan.agent !== options.agent) {
      return false;
    }
    if (options.lane && !options.lane.includes(plan.lane)) {
      return false;
    }
    if (options.status && plan.status !== options.status) {
      return false;
    }
    if (options.runnable && !plan.runnable) {
      return false;
    }
    if (options.handoffReady) {
      if (!plan.handoffIn) {
        return false;
      }
      if (!plan.handoffReady) {
        return false;
      }
    }
    return true;
  });
}

export function validateFeaturePlans(rootDir = process.cwd()): ValidationResult {
  const featureRoot = resolve(rootDir, FEATURE_ROOT);
  const featureDirs = existsSync(featureRoot)
    ? readdirSync(featureRoot)
        .map((name) => join(featureRoot, name))
        .filter((path) => statSync(path).isDirectory())
    : [];

  const allowedAgents = new Set(['claude', 'codex']);
  const allowedLanes = new Set(['ui', 'state', 'api', 'contracts', 'docs', 'qa']);
  const allowedStatuses = new Set([
    'backlog',
    'ready',
    'in_progress',
    'blocked',
    'in_review',
    'done',
    'archived',
  ]);

  const issues: string[] = [];
  const legacyPlans = findLegacyPlans(rootDir);
  let planCount = 0;

  for (const featureDir of featureDirs) {
    const featureSlug = basename(featureDir);
    const specPath = join(featureDir, 'spec.md');
    if (!existsSync(specPath)) {
      issues.push(`${relativeRepoPath(rootDir, specPath)}: missing spec.md`);
    }

    const todoFiles = walkFiles(featureDir).filter((file) => file.endsWith(TODO_SUFFIX));
    planCount += todoFiles.length;

    for (const file of todoFiles) {
      const content = readFileSync(file, 'utf8');
      const { data } = parseFrontmatter(content);
      const rel = relativeRepoPath(rootDir, file);
      const requiredKeys = [
        'feature',
        'title',
        'lane',
        'agent',
        'status',
        'source_branch',
        'updated',
      ];

      for (const key of requiredKeys) {
        if (!data[key]) {
          issues.push(`${rel}: missing frontmatter key "${key}"`);
        }
      }

      const feature = asString(data.feature);
      const lane = asString(data.lane);
      const agent = asString(data.agent);
      const status = asString(data.status);

      if (feature && feature !== featureSlug) {
        issues.push(`${rel}: feature "${feature}" does not match directory "${featureSlug}"`);
      }
      if (lane && !allowedLanes.has(lane)) {
        issues.push(`${rel}: invalid lane "${lane}"`);
      }
      if (agent && !allowedAgents.has(agent)) {
        issues.push(`${rel}: invalid agent "${agent}"`);
      }
      if (status && !allowedStatuses.has(status)) {
        issues.push(`${rel}: invalid status "${status}"`);
      }
      if (lane === 'qa' && !data.qa_order) {
        issues.push(`${rel}: qa lane requires qa_order`);
      }
      if (agent && !basename(file).includes(agent)) {
        issues.push(`${rel}: filename should include agent "${agent}"`);
      }

      for (const dependency of asList(data.depends_on)) {
        const dependencyPath = resolve(dirname(file), dependency);
        if (!existsSync(dependencyPath)) {
          issues.push(
            `${rel}: dependency does not exist -> ${relativeRepoPath(rootDir, dependencyPath)}`,
          );
        }
      }

      const handoffIn = asString(data.handoff_in);
      const handoffOut = asString(data.handoff_out);
      for (const handoff of [handoffIn, handoffOut]) {
        if (handoff && !handoff.startsWith('handoff/')) {
          issues.push(`${rel}: handoff branch must start with "handoff/" -> ${handoff}`);
        }
      }
    }
  }

  return {
    featureCount: featureDirs.length,
    legacyPlanCount: legacyPlans.length,
    legacyPlans: legacyPlans.map((path) => relativeRepoPath(rootDir, path)),
    planCount,
    issues,
  };
}

export function scaffoldFeature(
  featureSlug: string,
  options: { rootDir?: string; title?: string; branch?: string } = {},
): string {
  const rootDir = resolve(options.rootDir ?? process.cwd());
  const templateDir = resolve(rootDir, TEMPLATE_ROOT);
  const targetDir = resolve(rootDir, FEATURE_ROOT, featureSlug);

  if (!existsSync(templateDir)) {
    throw new Error(`Template directory missing: ${relativeRepoPath(rootDir, templateDir)}`);
  }
  if (existsSync(targetDir)) {
    throw new Error(`Feature already exists: ${relativeRepoPath(rootDir, targetDir)}`);
  }

  cpSync(templateDir, targetDir, {
    recursive: true,
    force: false,
    errorOnExist: true,
  });

  const today = new Date().toISOString().slice(0, 10);
  const replacements = new Map<string, string>([
    ['<feature-slug>', featureSlug],
    ['<Feature Title>', options.title ?? featureSlug],
    ['<source-branch>', options.branch ?? `feature/${featureSlug}`],
    ['<YYYY-MM-DD>', today],
  ]);

  for (const file of walkFiles(targetDir)) {
    const content = readFileSync(file, 'utf8');
    let next = content;
    for (const [placeholder, value] of replacements) {
      next = next.split(placeholder).join(value);
    }
    writeFileSync(file, next);
  }

  return targetDir;
}

function printPlans(plans: PlanEntry[], rootDir: string): void {
  if (plans.length === 0) {
    console.log('No matching plans.');
    return;
  }

  for (const plan of plans) {
    console.log(
      `${plan.feature} | ${plan.agent}/${plan.lane} | ${plan.status} | ${relativeRepoPath(rootDir, plan.path)}`,
    );
    if (plan.workBranch) {
      console.log(`  work_branch: ${plan.workBranch}`);
    }
    if (plan.handoffIn) {
      console.log(`  handoff_in: ${plan.handoffIn} (${plan.handoffReady ? 'ready' : 'missing'})`);
    }
    if (plan.blockedBy.length > 0) {
      console.log(`  blocked_by: ${plan.blockedBy.join(', ')}`);
    }
    if (plan.missingDependencies.length > 0) {
      console.log(`  missing_dependencies: ${plan.missingDependencies.join(', ')}`);
    }
  }
}

function parseArgs(argv: string[]): {
  command: string;
  positionals: string[];
  options: Record<string, string | boolean>;
} {
  const [command = 'list', ...rest] = argv;
  const positionals: string[] = [];
  const options: Record<string, string | boolean> = {};

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith('--')) {
      positionals.push(token);
      continue;
    }

    const key = token.slice(2);
    const next = rest[index + 1];
    if (!next || next.startsWith('--')) {
      options[key] = true;
      continue;
    }

    options[key] = next;
    index += 1;
  }

  return { command, positionals, options };
}

function parseLaneOption(value: string | boolean | undefined): string[] | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function main(): number {
  const { command, positionals, options } = parseArgs(process.argv.slice(2));
  const rootDir = resolve(typeof options.root === 'string' ? options.root : process.cwd());

  if (command === 'scaffold') {
    const [featureSlug] = positionals;
    if (!featureSlug) {
      console.error(
        'Usage: bun run plans scaffold <feature-slug> [--title "..."] [--branch "..."]',
      );
      return 1;
    }

    const targetDir = scaffoldFeature(featureSlug, {
      rootDir,
      title: typeof options.title === 'string' ? options.title : undefined,
      branch: typeof options.branch === 'string' ? options.branch : undefined,
    });
    console.log(`Created ${relativeRepoPath(rootDir, targetDir)}`);
    return 0;
  }

  if (command === 'validate') {
    const result = validateFeaturePlans(rootDir);
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else if (result.issues.length === 0) {
      console.log(
        `Validated ${result.planCount} plan files across ${result.featureCount} feature packs. No issues.`,
      );
      if (result.legacyPlanCount > 0) {
        console.log(
          `Legacy note: ${result.legacyPlanCount} flat plan files remain outside .plans/features and will not appear in automation queues until migrated.`,
        );
      }
    } else {
      console.error(
        `Validation failed for ${result.planCount} plan files across ${result.featureCount} feature packs:`,
      );
      for (const issue of result.issues) {
        console.error(`- ${issue}`);
      }
    }
    return result.issues.length === 0 ? 0 : 1;
  }

  if (command === 'legacy') {
    const legacyPlans = findLegacyPlans(rootDir).map((path) => relativeRepoPath(rootDir, path));
    if (options.json) {
      console.log(JSON.stringify(legacyPlans, null, 2));
      return 0;
    }
    if (legacyPlans.length === 0) {
      console.log('No legacy flat plans.');
      return 0;
    }
    for (const plan of legacyPlans) {
      console.log(plan);
    }
    return 0;
  }

  const plans = collectPlans(rootDir);
  const requestedLanes = parseLaneOption(options.lane);
  let defaultLanes: string[] | undefined;
  if (!requestedLanes && command === 'queue') {
    if (options.agent === 'claude') {
      defaultLanes = ['ui'];
    } else if (options.agent === 'codex') {
      defaultLanes = ['state', 'api', 'contracts'];
    }
  }
  const filters: FilterOptions = {
    agent: typeof options.agent === 'string' ? options.agent : undefined,
    lane: requestedLanes ?? defaultLanes,
    status: typeof options.status === 'string' ? options.status : undefined,
    runnable: command === 'queue' || options.runnable === true,
    handoffReady: options['handoff-ready'] === true,
  };

  if (command === 'queue' && !filters.status) {
    filters.status = 'ready';
  }

  const filtered = filterPlans(plans, filters);
  if (options.json) {
    console.log(JSON.stringify(filtered, null, 2));
    return 0;
  }

  printPlans(filtered, rootDir);
  if (filtered.length === 0) {
    const legacyPlans = findLegacyPlans(rootDir);
    if (legacyPlans.length > 0) {
      console.log(
        `Legacy note: ${legacyPlans.length} flat plan files remain in .plans/ and are not included in this queue. Run \`bun run plans legacy\` to list them.`,
      );
    }
  }
  return 0;
}

if (import.meta.main) {
  process.exitCode = main();
}
