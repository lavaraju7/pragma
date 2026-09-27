import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * Cursor hooks don't send a uniform "cwd" field the way Claude Code's do — some
 * events carry `cwd`, all of them carry `workspace_roots`. Try the specific field
 * first, then the general one, so every adapter resolves the project the same way
 * regardless of which event it was called from.
 */
export function projectRootOf(input) {
  return input.cwd
    || input.workspace_roots?.[0]
    || process.env.CURSOR_PROJECT_DIR
    || process.cwd();
}

/**
 * Session bookkeeping (has this conversation written source without touching a
 * test?) needs somewhere to live. Claude Code hands hooks CLAUDE_PLUGIN_DATA;
 * Cursor has no equivalent, so default to a Cursor-scoped folder under the user's
 * home directory. Setting the env var — rather than teaching hooks/lib/state.js
 * about Cursor — keeps that module editor-agnostic: it already prefers
 * PRAGMA_STATE_DIR over its own home-directory fallback, so this only changes
 * *which* default it falls back to.
 */
export function ensureStateDir() {
  process.env.PRAGMA_STATE_DIR ??= join(homedir(), '.cursor', 'pragma');
}

/** Cursor's session key is `conversation_id`; Claude Code's is `session_id`. */
export function sessionKeyOf(input) {
  return input.conversation_id;
}
