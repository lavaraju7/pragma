import { resolveConfig } from './lib/config.js';
import { emitContext, readHookInput, runHook } from './lib/hook-io.js';
import { nudgeFor } from './lib/intent.js';

/** Nudges are design-tier: lite mode keeps the ladder but drops the commentary. */
const MODES_WITH_NUDGES = ['standard', 'strict'];

runHook(async () => {
  const input = await readHookInput();
  const config = resolveConfig(input.cwd);
  if (!MODES_WITH_NUDGES.includes(config.mode)) return;

  emitContext('UserPromptSubmit', nudgeFor(input.prompt));
});
