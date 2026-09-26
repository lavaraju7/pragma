import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * CLAUDE_PLUGIN_ROOT is set when Claude Code runs the hook; resolving from this
 * file keeps the scripts runnable directly from a checkout for tests.
 */
export function pluginRoot() {
  return process.env.CLAUDE_PLUGIN_ROOT
    || resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
}
