#!/usr/bin/env node
import { MODES, normalizeMode, resolveConfig, tiersForMode } from '../hooks/lib/config.js';
import { writeProjectMode } from '../hooks/lib/project-mode.js';

const DESCRIPTIONS = {
  off: 'silent — no ladder, no edit feedback',
  lite: 'safety findings only (hardcoded config, injection, shared mutable state)',
  standard: 'safety + design findings (naming, contracts, coupling, duplication of knowledge)',
  strict: 'everything, plus complexity limits and a reminder when new code ships without tests',
};

const requested = process.argv[2];

if (requested && !normalizeMode(requested)) {
  process.stderr.write(`Unknown mode "${requested}". Expected one of: ${MODES.join(', ')}\n`);
  process.exit(1);
}

if (requested) writeProjectMode(process.cwd(), normalizeMode(requested));

const config = resolveConfig(process.cwd());
const lines = [
  `pragma mode: ${config.mode} — ${DESCRIPTIONS[config.mode]}`,
  `active detector tiers: ${config.tiers.length ? config.tiers.join(', ') : 'none'}`,
  `scope: ${process.cwd()}`,
  '',
  ...MODES.map((mode) => `  ${mode === config.mode ? '*' : ' '} ${mode.padEnd(9)} ${DESCRIPTIONS[mode]} [${tiersForMode(mode).join(', ') || 'none'}]`),
];

if (config.disabledDetectors.length) {
  lines.push('', `disabled detectors: ${config.disabledDetectors.join(', ')}`);
}

process.stdout.write(`${lines.join('\n')}\n`);
