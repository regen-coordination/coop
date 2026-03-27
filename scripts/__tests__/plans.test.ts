import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  collectPlans,
  filterPlans,
  parseFrontmatter,
  scaffoldFeature,
  validateFeaturePlans,
} from '../plans';

const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'coop-plans-'));
  tempDirs.push(dir);
  return dir;
}

function write(rootDir: string, relativePath: string, content: string): void {
  const target = join(rootDir, relativePath);
  mkdirSync(join(target, '..'), { recursive: true });
  writeFileSync(target, content);
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('parseFrontmatter', () => {
  it('parses scalar and list fields', () => {
    const parsed = parseFrontmatter(`---
feature: test
agent: codex
depends_on:
  - ../spec.md
  - ../qa/qa-claude.todo.md
---

# Body
`);

    expect(parsed.data.feature).toBe('test');
    expect(parsed.data.agent).toBe('codex');
    expect(parsed.data.depends_on).toEqual(['../spec.md', '../qa/qa-claude.todo.md']);
  });
});

describe('scaffoldFeature', () => {
  it('creates a feature pack from the repo template', () => {
    const rootDir = makeTempDir();

    write(rootDir, '.plans/templates/feature/README.md', '# <Feature Title>\n');
    write(rootDir, '.plans/templates/feature/spec.md', '**Feature**: `<feature-slug>`\n');
    write(rootDir, '.plans/templates/feature/context.md', '# Context\n');
    write(rootDir, '.plans/templates/feature/lanes/ui.claude.todo.md', 'feature: <feature-slug>\n');
    write(
      rootDir,
      '.plans/templates/feature/lanes/state.codex.todo.md',
      'feature: <feature-slug>\n',
    );
    write(rootDir, '.plans/templates/feature/lanes/api.codex.todo.md', 'feature: <feature-slug>\n');
    write(
      rootDir,
      '.plans/templates/feature/lanes/contracts.codex.todo.md',
      'feature: <feature-slug>\n',
    );
    write(rootDir, '.plans/templates/feature/qa/qa-claude.todo.md', 'feature: <feature-slug>\n');
    write(rootDir, '.plans/templates/feature/qa/qa-codex.todo.md', 'feature: <feature-slug>\n');
    write(rootDir, '.plans/templates/feature/eval/implementation-notes.md', '# Notes\n');
    write(rootDir, '.plans/templates/feature/eval/qa-report.md', '# QA\n');

    const created = scaffoldFeature('receiver-polish', {
      rootDir,
      title: 'Receiver Polish',
    });

    const spec = readFileSync(join(created, 'spec.md'), 'utf8');
    expect(spec).toContain('receiver-polish');
  });
});

describe('collectPlans and validateFeaturePlans', () => {
  it('marks second QA pass runnable only when dependencies and handoff branch are ready', () => {
    const rootDir = makeTempDir();

    write(rootDir, '.plans/features/receiver-shell-polish/spec.md', '# Spec\n');
    write(
      rootDir,
      '.plans/features/receiver-shell-polish/qa/qa-claude.todo.md',
      `---
feature: receiver-shell-polish
title: Receiver shell polish QA pass 1
lane: qa
agent: claude
status: done
source_branch: feature/receiver-shell-polish
qa_order: 1
updated: 2026-03-26
---
`,
    );
    write(
      rootDir,
      '.plans/features/receiver-shell-polish/qa/qa-codex.todo.md',
      `---
feature: receiver-shell-polish
title: Receiver shell polish QA pass 2
lane: qa
agent: codex
status: ready
source_branch: feature/receiver-shell-polish
depends_on:
  - qa-claude.todo.md
qa_order: 2
handoff_in: handoff/qa-codex/receiver-shell-polish
updated: 2026-03-26
---
`,
    );

    const withoutHandoff = collectPlans(rootDir, new Set());
    const blockedPlan = withoutHandoff.find((plan) => plan.path.endsWith('qa-codex.todo.md'));
    expect(blockedPlan?.runnable).toBe(false);

    const withHandoff = collectPlans(rootDir, new Set(['handoff/qa-codex/receiver-shell-polish']));
    const readyPlan = withHandoff.find((plan) => plan.path.endsWith('qa-codex.todo.md'));
    expect(readyPlan?.runnable).toBe(true);

    const validation = validateFeaturePlans(rootDir);
    expect(validation.issues).toHaveLength(0);
  });

  it('separates docs lanes from the default Codex implementation queue', () => {
    const rootDir = makeTempDir();

    write(rootDir, '.plans/features/docs-drift/spec.md', '# Spec\n');
    write(
      rootDir,
      '.plans/features/docs-drift/lanes/docs.codex.todo.md',
      `---
feature: docs-drift
title: Docs drift maintenance Codex lane
lane: docs
agent: codex
status: ready
source_branch: chore/docs-drift
updated: 2026-03-26
---
`,
    );
    write(rootDir, '.plans/features/ui-action/spec.md', '# Spec\n');
    write(
      rootDir,
      '.plans/features/ui-action/lanes/state.codex.todo.md',
      `---
feature: ui-action
title: UI action state lane
lane: state
agent: codex
status: ready
source_branch: refactor/ui-action
updated: 2026-03-26
---
`,
    );

    const plans = collectPlans(rootDir, new Set());
    const defaultCodex = filterPlans(plans, {
      agent: 'codex',
      lane: ['state', 'api', 'contracts'],
      status: 'ready',
      runnable: true,
    });
    const docsCodex = filterPlans(plans, {
      agent: 'codex',
      lane: ['docs'],
      status: 'ready',
      runnable: true,
    });

    expect(defaultCodex).toHaveLength(1);
    expect(defaultCodex[0]?.lane).toBe('state');
    expect(docsCodex).toHaveLength(1);
    expect(docsCodex[0]?.lane).toBe('docs');
  });
});
