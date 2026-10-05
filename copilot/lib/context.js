import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * Hooks registered under PascalCase event names (SessionStart, PostToolUse, Stop)
 * receive snake_case payloads on Copilot CLI; the camelCase names get camelCase
 * ones. The hooks file only uses PascalCase, but every reader here accepts both
 * spellings — it costs one `??` and means a host that sends the other shape
 * degrades to working rather than to silence.
 */
export function projectRootOf(input) {
  return input.cwd || process.cwd();
}

export function sessionKeyOf(input) {
  return input.session_id ?? input.sessionId;
}

export function toolArgsOf(input) {
  return input.tool_input ?? input.toolArgs;
}

/**
 * Session bookkeeping needs somewhere writable. Copilot CLI documents
 * COPILOT_PLUGIN_DATA for exactly this — "a persistent, writable directory for
 * the installed plugin" — so use it when present, and a Copilot-scoped folder
 * under the home directory when it isn't (a repo-level hooks file, tests).
 * Setting PRAGMA_STATE_DIR rather than teaching hooks/lib/state.js about Copilot
 * keeps that module host-agnostic: it already prefers PRAGMA_STATE_DIR.
 */
export function ensureStateDir() {
  process.env.PRAGMA_STATE_DIR ??= process.env.COPILOT_PLUGIN_DATA
    ?? join(homedir(), '.copilot', 'pragma');
}
