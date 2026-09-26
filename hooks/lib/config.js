import { readProjectMode } from './state.js';

export const MODES = ['off', 'lite', 'standard', 'strict'];

/** Detector tiers enabled by each mode, in report priority order. */
const TIERS_BY_MODE = {
  off: [],
  lite: ['safety'],
  standard: ['safety', 'design'],
  strict: ['safety', 'design', 'strict'],
};

export const TIER_RANK = { safety: 0, design: 1, strict: 2 };

const DEFAULT_MODE = 'standard';
const DEFAULT_MAX_FINDINGS = 5;

/**
 * Per-project mode wins over the install-time userConfig default, so /pragma:mode
 * can quiet the plugin in one codebase without changing it everywhere.
 */
export function resolveConfig(cwd) {
  const mode = normalizeMode(readProjectMode(cwd))
    ?? normalizeMode(process.env.CLAUDE_PLUGIN_OPTION_MODE)
    ?? DEFAULT_MODE;

  return {
    mode,
    tiers: TIERS_BY_MODE[mode],
    enabled: mode !== 'off',
    maxFindings: positiveInt(process.env.CLAUDE_PLUGIN_OPTION_MAXFINDINGSPEREDIT) ?? DEFAULT_MAX_FINDINGS,
    disabledDetectors: splitList(process.env.CLAUDE_PLUGIN_OPTION_DISABLEDDETECTORS),
  };
}

export function normalizeMode(value) {
  const mode = String(value ?? '').trim().toLowerCase();
  return MODES.includes(mode) ? mode : undefined;
}

export function tiersForMode(mode) {
  return TIERS_BY_MODE[mode] ?? [];
}

function positiveInt(value) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function splitList(value) {
  return String(value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}
