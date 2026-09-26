import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolveConfig } from './lib/config.js';
import { readHookInput, runHook } from './lib/hook-io.js';
import { pluginRoot } from './lib/paths.js';

runHook(async () => {
  const input = await readHookInput();
  const config = resolveConfig(input.cwd);
  if (!config.enabled) return;

  const ladder = readFileSync(join(pluginRoot(), 'principles', 'core.md'), 'utf8').trim();
  const banner = `_pragma ${config.mode} — principle detail in principles/, intensity via /pragma:mode_`;

  // SessionStart stdout is appended to the session context verbatim.
  process.stdout.write(`${ladder}\n\n${banner}\n`);
});
