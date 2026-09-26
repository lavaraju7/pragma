import { readFileSync } from 'node:fs';
import { resolveConfig } from './lib/config.js';
import { analyze } from './lib/detectors/index.js';
import { emitContext, readHookInput, runHook } from './lib/hook-io.js';
import { formatFindings } from './lib/report.js';
import { hasExtension, isTestFile, JS_AND_PY } from './lib/source.js';
import { readSession, updateSession } from './lib/state.js';

runHook(async () => {
  const input = await readHookInput();
  const filePath = input.tool_input?.file_path;
  if (!filePath || !hasExtension(filePath, JS_AND_PY)) return;

  recordForStopCheck(input.session_id, filePath);

  const config = resolveConfig(input.cwd);
  if (!config.enabled) return;

  const source = currentContentOf(filePath, input.tool_input);
  if (!source) return;

  const findings = analyze(source, filePath, {
    tiers: config.tiers,
    disabled: config.disabledDetectors,
  });

  emitContext('PostToolUse', formatFindings(findings, filePath, config.maxFindings));
});

/**
 * PostToolUse runs after the write succeeded, so the file on disk is the finished
 * result — which covers Edit and MultiEdit without reassembling their payloads.
 */
function currentContentOf(filePath, toolInput) {
  try {
    return readFileSync(filePath, 'utf8');
  } catch {
    return toolInput?.content ?? '';
  }
}

/** Strict mode asks at Stop whether new behaviour arrived without a test. */
function recordForStopCheck(sessionId, filePath) {
  const key = isTestFile(filePath) ? 'touchedTest' : 'wroteSource';
  if (readSession(sessionId)[key]) return;
  updateSession(sessionId, { [key]: true });
}
