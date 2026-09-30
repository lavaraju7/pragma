import { resolveConfig } from '../hooks/lib/config.js';
import { emitJson, readHookInput, runHook } from '../hooks/lib/hook-io.js';
import { readSession, updateSession } from '../hooks/lib/state.js';
import { ensureStateDir, projectRootOf, sessionKeyOf } from './lib/context.js';

const REASON = 'pragma (P12 Test to Code): source files changed this session but no test did.'
  + ' Add a test for the new behaviour, or say explicitly that this change needs none.';

/**
 * Antigravity's Stop can prevent the agent from finishing by returning
 * decision: "continue", with reason injected as the instruction that keeps it
 * going — the same intent as Claude Code's Stop block and Cursor's
 * followup_message, in Antigravity's own shape.
 */
runHook(async () => {
  ensureStateDir();
  const input = await readHookInput();
  if (resolveConfig(projectRootOf(input)).mode !== 'strict') return;

  const sessionId = sessionKeyOf(input);
  const session = readSession(sessionId);
  if (!session.wroteSource || session.touchedTest || session.testReminderSent) return;

  updateSession(sessionId, { testReminderSent: true });
  emitJson({ decision: 'continue', reason: REASON });
});
