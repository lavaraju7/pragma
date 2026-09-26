import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { MODES, normalizeMode } from './modes.js';

/**
 * The enforcement mode lives inside the project itself, not in a global
 * per-installation store keyed by path. That is deliberate: `/pragma:mode` runs
 * as a plain script via the Bash tool, which never receives CLAUDE_PLUGIN_DATA or
 * CLAUDE_PLUGIN_ROOT (those are injected only into a hook's own subprocess) — so a
 * global store written by the CLI and read by the hook would silently diverge,
 * each side seeing its own copy. A file under the project's own `cwd` is the one
 * location every invocation path agrees on. It also means the mode a team has
 * chosen for a codebase can be committed and shared, the same way `.pragma/debt.md`
 * already is.
 */
export function modeFilePath(cwd) {
  return join(cwd || process.cwd(), '.pragma', 'mode');
}

export function readProjectMode(cwd) {
  try {
    return normalizeMode(readFileSync(modeFilePath(cwd), 'utf8').trim());
  } catch {
    return undefined;
  }
}

export function writeProjectMode(cwd, mode) {
  if (!MODES.includes(mode)) throw new Error(`Unknown mode "${mode}"`);
  const file = modeFilePath(cwd);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${mode}\n`, 'utf8');
}
