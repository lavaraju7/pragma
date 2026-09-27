import { resolveConfig } from '../hooks/lib/config.js';
import { emitJson, readHookInput, runHook } from '../hooks/lib/hook-io.js';
import { readSession, updateSession } from '../hooks/lib/state.js';
import { ensureStateDir, projectRootOf, sessionKeyOf } from './lib/context.js';

const REASON = 'pragma (P12 Test to Code): source files changed this session but no test did.'
  + ' Add a test for the new behaviour, or say explicitly that this change needs none.';

/**
 * Cursor's stop hook has no block-with-reason mechanic — only followup_message,
 * which queues a new auto-continuation (subject to Cursor's own loop_limit, a
 * second safety net beyond the one below). That is a different mechanism to
 * Claude Code's Stop, which resumes the same turn, but it serves the same intent:
 * a single, non-repeating nudge when strict mode's session-level bookkeeping
 * (recorded by after-file-edit.js) shows source changed with no test.
 */
runHook(async () => {
  ensureStateDir();
  const input = await readHookInput();
  if (resolveConfig(projectRootOf(input)).mode !== 'strict') return;

  const sessionId = sessionKeyOf(input);
  const session = readSession(sessionId);
  if (!session.wroteSource || session.touchedTest || session.testReminderSent) return;

  updateSession(sessionId, { testReminderSent: true });
  emitJson({ followup_message: REASON });
});
