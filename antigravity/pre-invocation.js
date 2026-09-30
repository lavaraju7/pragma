import { emitJson, readHookInput, runHook } from '../hooks/lib/hook-io.js';
import { ensureStateDir, sessionKeyOf } from './lib/context.js';
import { takePendingFindings } from './lib/relay.js';

/**
 * The delivery half of the relay: PreInvocation fires before each model turn
 * and is the one event whose output Antigravity actually reads into context
 * (via injectSteps[].ephemeralMessage). If post-tool-use.js left findings for
 * this conversation, deliver them once and clear the entry — an ephemeral
 * message is documented as visible for that turn only, which matches "you
 * just wrote this, fix it now" better than a standing rule would.
 */
runHook(async () => {
  ensureStateDir();
  const input = await readHookInput();

  const text = takePendingFindings(sessionKeyOf(input));
  if (!text) return;

  emitJson({ injectSteps: [{ ephemeralMessage: text }] });
});
