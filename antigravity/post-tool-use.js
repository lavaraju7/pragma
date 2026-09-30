import { readFileSync } from 'node:fs';
import { resolveConfig } from '../hooks/lib/config.js';
import { analyze } from '../hooks/lib/detectors/index.js';
import { emitJson, readHookInput, runHook } from '../hooks/lib/hook-io.js';
import { formatFindings } from '../hooks/lib/report.js';
import { hasExtension, isTestFile, JS_AND_PY } from '../hooks/lib/source.js';
import { readSession, updateSession } from '../hooks/lib/state.js';
import { ensureStateDir, filePathOf, projectRootOf, sessionKeyOf } from './lib/context.js';
import { storePendingFindings } from './lib/relay.js';

/**
 * PostToolUse's own JSON response is always ignored (Antigravity's documented
 * schema for it is `{}`) — so this can only have side effects: recording the
 * strict-mode test-tracking flags (the same bookkeeping the Claude Code and
 * Cursor adapters do), and handing findings to pre-invocation.js via the relay
 * for delivery on the next turn.
 */
runHook(async () => {
  ensureStateDir();
  const input = await readHookInput();
  const filePath = filePathOf(input);
  if (!filePath || !hasExtension(filePath, JS_AND_PY)) return;

  const sessionId = sessionKeyOf(input);
  recordForStopCheck(sessionId, filePath);

  const config = resolveConfig(projectRootOf(input));
  if (!config.enabled) return;

  const source = readSafely(filePath);
  if (!source) return;

  const findings = analyze(source, filePath, {
    tiers: config.tiers,
    disabled: config.disabledDetectors,
  });

  const text = formatFindings(findings, filePath, config.maxFindings);
  if (text) storePendingFindings(sessionId, text);

  // The output is always ignored, but emit the documented shape anyway rather
  // than nothing, in case a future Antigravity version starts reading it.
  emitJson({});
});

function readSafely(filePath) {
  try {
    return readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function recordForStopCheck(sessionId, filePath) {
  const key = isTestFile(filePath) ? 'touchedTest' : 'wroteSource';
  if (readSession(sessionId)[key]) return;
  updateSession(sessionId, { [key]: true });
}
