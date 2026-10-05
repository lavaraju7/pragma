import { resolveConfig } from '../hooks/lib/config.js';
import { emitJson, readHookInput, runHook } from '../hooks/lib/hook-io.js';
import { readSession, updateSession } from '../hooks/lib/state.js';
import { ensureStateDir, projectRootOf, sessionKeyOf } from './lib/context.js';

const REASON = 'pragma (P12 Test to Code): source files changed this session but no test did.'
  + ' Add a test for the new behaviour, or say explicitly that this change needs none.';

/**
 * Copilot CLI's Stop takes {decision: "block", reason} — the same shape Claude
 * Code's Stop hook uses — and "block" forces another agent turn. The CLI also
 * overrides a hook after eight consecutive blocks, a second safety net behind
 * the once-per-session flag below.
 */
runHook(async () => {
  ensureStateDir();
  const input = await readHookInput();
  if (resolveConfig(projectRootOf(input)).mode !== 'strict') return;

  // stop_hook_active: a previous Stop hook already forced this turn to continue.
  if (input.stop_hook_active) return;

  const sessionId = sessionKeyOf(input);
  const session = readSession(sessionId);
  if (!session.wroteSource || session.touchedTest || session.testReminderSent) return;

  updateSession(sessionId, { testReminderSent: true });
  emitJson({ decision: 'block', reason: REASON });
});
