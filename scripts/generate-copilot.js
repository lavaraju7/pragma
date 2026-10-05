#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { buildCopilotFiles } from '../copilot/lib/generate.js';
import { pluginRoot } from '../hooks/lib/paths.js';

/**
 * A Copilot plugin is installed by copying the repository as it stands — there
 * is no build step on the user's machine — so the generated skills and agent
 * are committed. tests/copilot-plugin.test.js fails when they fall out of sync
 * with the sources, so "regenerate" can't be forgotten.
 */
const root = pluginRoot();

for (const [relativePath, content] of buildCopilotFiles(root)) {
  const file = join(root, relativePath);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content, 'utf8');
  process.stdout.write(`${relativePath}\n`);
}
