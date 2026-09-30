import { readSession, updateSession } from '../../hooks/lib/state.js';

/**
 * Antigravity's PostToolUse cannot return anything the model ever sees — its
 * output schema is documented as always `{}`. Only PreInvocation can inject
 * context (via `ephemeralMessage`), but it fires once per model turn, not once
 * per edit, and carries no file path of its own. So PostToolUse writes findings
 * here, and the *next* PreInvocation call for the same conversation delivers
 * them and clears the entry — a relay across two hooks standing in for the
 * single hook Claude Code and Cursor each have for this.
 *
 * Reuses the existing per-session store under its own key, rather than a
 * second file, so there is exactly one place session-scoped state lives.
 */
export function storePendingFindings(sessionId, text) {
  if (!sessionId || !text) return;
  updateSession(sessionId, { pendingFindings: text });
}

export function takePendingFindings(sessionId) {
  if (!sessionId) return undefined;
  const pending = readSession(sessionId).pendingFindings;
  if (pending) updateSession(sessionId, { pendingFindings: undefined });
  return pending;
}
