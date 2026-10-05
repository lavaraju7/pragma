import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathFromArgs } from '../../hooks/lib/tool-paths.js';

/**
 * Antigravity's common hook payload carries `workspacePaths` (an array), not a
 * single `cwd` — every event shares this field, so every adapter resolves the
 * project the same way from it.
 */
export function projectRootOf(input) {
  return input.workspacePaths?.[0] || process.cwd();
}

/**
 * Session bookkeeping needs somewhere to live; Antigravity has no equivalent to
 * Claude Code's CLAUDE_PLUGIN_DATA. Setting the env var — rather than teaching
 * hooks/lib/state.js about Antigravity — keeps that module host-agnostic: it
 * already prefers PRAGMA_STATE_DIR over its own home-directory fallback, so
 * this only changes *which* default it falls back to.
 */
export function ensureStateDir() {
  process.env.PRAGMA_STATE_DIR ??= join(homedir(), '.gemini', 'pragma');
}

/** Antigravity's session key is `conversationId` (camelCase, unlike Cursor's snake_case). */
export function sessionKeyOf(input) {
  return input.conversationId;
}

/**
 * PostToolUse's own JSON response is always ignored ({} is the only accepted
 * shape) — there is no field to inject context through, unlike Claude Code or
 * Cursor. A path key is still needed to know *which* file to analyze, and
 * Antigravity's exact tool-call argument shape for every file-editing tool
 * isn't nailed down by the documentation this was built against, so — same
 * trade-off as the Cursor adapter — try every plausible key and no-op safely
 * on a miss rather than assume one exact name.
 */
export function filePathOf(input) {
  return pathFromArgs(input.toolCall?.args);
}
