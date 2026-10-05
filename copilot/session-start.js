import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolveConfig } from '../hooks/lib/config.js';
import { emitJson, readHookInput, runHook } from '../hooks/lib/hook-io.js';
import { pluginRoot } from '../hooks/lib/paths.js';
import { projectRootOf } from './lib/context.js';

/**
 * Copilot CLI's SessionStart consumes exactly one output field — a top-level
 * additionalContext — where Claude Code takes plain stdout text. Same ladder,
 * same mode check as ../hooks/session-start.js, different wire format.
 */
runHook(async () => {
  const input = await readHookInput();
  const config = resolveConfig(projectRootOf(input));
  if (!config.enabled) return;

  const ladder = readFileSync(join(pluginRoot(), 'principles', 'core.md'), 'utf8').trim();
  const banner = `_pragma ${config.mode} — principle detail in principles/, intensity via the pragma-mode skill_`;

  emitJson({ additionalContext: `${ladder}\n\n${banner}` });
});
