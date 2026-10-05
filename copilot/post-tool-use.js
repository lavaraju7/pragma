import { readFileSync } from 'node:fs';
import { resolveConfig } from '../hooks/lib/config.js';
import { analyze } from '../hooks/lib/detectors/index.js';
import { emitJson, readHookInput, runHook } from '../hooks/lib/hook-io.js';
import { formatFindings } from '../hooks/lib/report.js';
import { hasExtension, isTestFile, JS_AND_PY } from '../hooks/lib/source.js';
import { readSession, updateSession } from '../hooks/lib/state.js';
import { pathsFromToolCall } from '../hooks/lib/tool-paths.js';
import { ensureStateDir, projectRootOf, sessionKeyOf, toolArgsOf } from './lib/context.js';

/**
 * Copilot CLI's PostToolUse accepts a top-level additionalContext — the same
 * capability Claude Code's hook uses, in a different wire format — so findings
 * go straight back, with no relay (contrast ../antigravity/, where the hook's
 * response is ignored). Copilot's editing tools take a relative `path`, and
 * apply_patch names its files inside the patch text, so paths come from the
 * shared extractor and are resolved against the session's cwd.
 */
runHook(async () => {
  ensureStateDir();
  const input = await readHookInput();
  const cwd = projectRootOf(input);

  const files = pathsFromToolCall(toolArgsOf(input), cwd).filter((file) => hasExtension(file, JS_AND_PY));
  if (!files.length) return;

  files.forEach((file) => recordForStopCheck(sessionKeyOf(input), file));

  const config = resolveConfig(cwd);
  if (!config.enabled) return;

  const reports = files
    .map((file) => ({ file, source: readSafely(file) }))
    .filter(({ source }) => source)
    .map(({ file, source }) => formatFindings(
      analyze(source, file, { tiers: config.tiers, disabled: config.disabledDetectors }),
      file,
      config.maxFindings,
    ))
    .filter(Boolean);

  if (reports.length) emitJson({ additionalContext: reports.join('\n\n') });
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
