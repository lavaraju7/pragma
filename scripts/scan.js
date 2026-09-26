#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { analyze } from '../hooks/lib/detectors/index.js';
import { rank } from '../hooks/lib/report.js';
import { hasExtension, JS_AND_PY, normalize } from '../hooks/lib/source.js';

const SKIP_DIRECTORIES = new Set([
  'node_modules', '.git', 'dist', 'build', 'out', 'coverage', '.next', '.venv', '__pycache__',
]);
const ALL_TIERS = ['safety', 'design', 'strict'];

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const tiers = tierOption(args) ?? ALL_TIERS;
const targets = args.filter((arg) => !arg.startsWith('--'));

if (!targets.length) {
  process.stderr.write('usage: scan.js [--tiers safety,design,strict] [--json] <file-or-directory>...\n');
  process.exit(1);
}

const findings = targets
  .flatMap(expand)
  .flatMap((file) => analyze(readSafely(file), file, { tiers, disabled: [] })
    .map((found) => ({ ...found, file: normalize(file) })));

process.stdout.write(asJson ? `${JSON.stringify(findings, null, 2)}\n` : humanReport(findings));

function tierOption(argv) {
  const index = argv.indexOf('--tiers');
  if (index === -1) return undefined;
  return argv[index + 1]?.split(',').map((tier) => tier.trim()).filter((tier) => ALL_TIERS.includes(tier));
}

function expand(target) {
  let stats;
  try {
    stats = statSync(target);
  } catch {
    return [];
  }
  if (stats.isFile()) return hasExtension(target, JS_AND_PY) ? [target] : [];
  if (!stats.isDirectory()) return [];

  return readdirSync(target)
    .filter((entry) => !SKIP_DIRECTORIES.has(entry))
    .flatMap((entry) => expand(join(target, entry)));
}

function readSafely(file) {
  try {
    return readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}

function humanReport(all) {
  if (!all.length) return 'No findings.\n';

  const byFile = new Map();
  for (const found of rank(all)) {
    const existing = byFile.get(found.file);
    if (existing) existing.push(found);
    else byFile.set(found.file, [found]);
  }

  const sections = [...byFile.entries()].map(([file, items]) => [
    file,
    ...items.map((f) => `  :${f.line}  ${f.principle} ${f.title}  ${f.message}`
      + `\n        ${f.fix}  [${f.detector}]`),
  ].join('\n'));

  return `${sections.join('\n\n')}\n\n${summary(all)}\n`;
}

function summary(all) {
  const byPrinciple = new Map();
  for (const found of all) {
    byPrinciple.set(found.principle, (byPrinciple.get(found.principle) ?? 0) + 1);
  }
  const counts = [...byPrinciple.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([principle, count]) => `${principle}:${count}`)
    .join('  ');
  const files = new Set(all.map((f) => f.file)).size;
  return `${plural(all.length, 'finding')} across ${plural(files, 'file')} — ${counts}`;
}

function plural(n, noun) {
  return `${n} ${noun}${n === 1 ? '' : 's'}`;
}
