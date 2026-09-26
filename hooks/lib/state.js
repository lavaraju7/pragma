import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

const SESSION_RETENTION_MS = 24 * 60 * 60 * 1000;

/**
 * Ephemeral, per-session bookkeeping only (currently: has this session written
 * source or a test, for the strict-mode Stop reminder). Unlike the enforcement
 * mode ([[project-mode.js]]), this has no reason to be visible per-project or
 * shared between machines, and it is read and written only from inside real hook
 * subprocesses — post-edit.js and stop-check.js — which both reliably receive
 * CLAUDE_PLUGIN_DATA from the harness. A skill-invoked script never touches this
 * file, so the environment-variable mismatch that broke project-mode storage
 * does not apply here.
 */
export function stateFilePath() {
  const base = process.env.PRAGMA_STATE_DIR
    || process.env.CLAUDE_PLUGIN_DATA
    || join(homedir(), '.claude', 'pragma');
  return join(base, 'state.json');
}

export function readState() {
  try {
    const parsed = JSON.parse(readFileSync(stateFilePath(), 'utf8'));
    return { sessions: parsed.sessions ?? {} };
  } catch {
    return { sessions: {} };
  }
}

export function writeState(state) {
  const file = stateFilePath();
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(pruneSessions(state), null, 2)}\n`, 'utf8');
}

function pruneSessions(state) {
  const cutoff = Date.now() - SESSION_RETENTION_MS;
  const sessions = Object.fromEntries(
    Object.entries(state.sessions ?? {}).filter(([, entry]) => (entry.updatedAt ?? 0) >= cutoff),
  );
  return { sessions };
}

export function readSession(sessionId) {
  if (!sessionId) return {};
  return readState().sessions[sessionId] ?? {};
}

export function updateSession(sessionId, changes) {
  if (!sessionId) return {};
  const state = readState();
  const merged = { ...state.sessions[sessionId], ...changes, updatedAt: Date.now() };
  state.sessions[sessionId] = merged;
  writeState(state);
  return merged;
}
