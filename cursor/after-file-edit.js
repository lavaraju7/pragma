import { ensureStateDir, sessionKeyOf } from './lib/context.js';
import { readHookInput, runHook } from '../hooks/lib/hook-io.js';
import { hasExtension, isTestFile, JS_AND_PY } from '../hooks/lib/source.js';
import { readSession, updateSession } from '../hooks/lib/state.js';

/**
 * afterFileEdit has a guaranteed file_path field but explicitly cannot inject
 * context or influence the agent — Cursor's docs are direct about that. So this
 * adapter does exactly one thing: record, reliably, whether this conversation has
 * written source without touching a test, for the strict-mode reminder that
 * stop.js fires later. Live feedback on the edit itself is post-tool-use.js's job
 * — it can inject context, but its file-path field isn't a guaranteed shape, so
 * splitting the two responsibilities across the hook that guarantees each one is
 * safer than asking one hook to do both on a shakier assumption.
 */
runHook(async () => {
  ensureStateDir();
  const input = await readHookInput();
  const filePath = input.file_path;
  if (!filePath || !hasExtension(filePath, JS_AND_PY)) return;

  const sessionId = sessionKeyOf(input);
  const key = isTestFile(filePath) ? 'touchedTest' : 'wroteSource';
  if (readSession(sessionId)[key]) return;
  updateSession(sessionId, { [key]: true });
});
