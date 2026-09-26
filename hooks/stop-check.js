import { resolveConfig } from './lib/config.js';
import { emitJson, readHookInput, runHook } from './lib/hook-io.js';
import { readSession, updateSession } from './lib/state.js';

const REASON = 'pragma (P12 Test to Code): source files changed this session but no test did.'
  + ' Add a test for the new behaviour, or say explicitly that this change needs none.';

runHook(async () => {
  const input = await readHookInput();
  if (resolveConfig(input.cwd).mode !== 'strict') return;

  // stop_hook_active means a previous Stop hook already blocked; blocking again
  // would loop. The per-session flag makes it at most one reminder either way.
  if (input.stop_hook_active) return;

  const session = readSession(input.session_id);
  if (!session.wroteSource || session.touchedTest || session.testReminderSent) return;

  updateSession(input.session_id, { testReminderSent: true });
  emitJson({
    decision: 'block',
    reason: REASON,
    hookSpecificOutput: { hookEventName: 'Stop', decision: 'block', reason: REASON },
  });
});
