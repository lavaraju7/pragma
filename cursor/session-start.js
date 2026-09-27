import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolveConfig } from '../hooks/lib/config.js';
import { emitJson, readHookInput, runHook } from '../hooks/lib/hook-io.js';
import { pluginRoot } from '../hooks/lib/paths.js';
import { projectRootOf } from './lib/context.js';

/**
 * Cursor's sessionStart can inject additional_context (unlike beforeSubmitPrompt,
 * which cannot) — the same capability Claude Code's SessionStart hook uses, so
 * this mirrors ../hooks/session-start.js exactly, differing only in the input and
 * output shapes each host expects.
 */
runHook(async () => {
  const input = await readHookInput();
  const config = resolveConfig(projectRootOf(input));
  if (!config.enabled) return;

  const ladder = readFileSync(join(pluginRoot(), 'principles', 'core.md'), 'utf8').trim();
  const banner = `_pragma ${config.mode} — principle detail in principles/, intensity via the pragma-mode command_`;

  emitJson({ additional_context: `${ladder}\n\n${banner}` });
});
