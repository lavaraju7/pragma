import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

const SESSION_RETENTION_MS = 24 * 60 * 60 * 1000;
const WINDOWS_SEPARATOR = /\\/g;

/**
 * Where mode and per-session bookkeeping live. CLAUDE_PLUGIN_DATA survives plugin
 * updates; the home-directory fallback covers development installs and tests.
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
    return {
      projects: parsed.projects ?? {},
      sessions: parsed.sessions ?? {},
    };
  } catch {
    return { projects: {}, sessions: {} };
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
  return { projects: state.projects ?? {}, sessions };
}

/** Projects are keyed by working directory, so mode is set per codebase. */
export function projectKey(cwd) {
  return (cwd || process.cwd())
    .replace(WINDOWS_SEPARATOR, '/')
    .replace(/\/+$/, '')
    .toLowerCase();
}

export function readProjectMode(cwd) {
  return readState().projects[projectKey(cwd)]?.mode;
}

export function writeProjectMode(cwd, mode) {
  const state = readState();
  const key = projectKey(cwd);
  state.projects[key] = { ...state.projects[key], mode, updatedAt: Date.now() };
  writeState(state);
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
