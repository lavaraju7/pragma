import { readFileSync } from 'node:fs';
import { resolveConfig } from '../hooks/lib/config.js';
import { analyze } from '../hooks/lib/detectors/index.js';
import { emitJson, readHookInput, runHook } from '../hooks/lib/hook-io.js';
import { formatFindings } from '../hooks/lib/report.js';
import { hasExtension, JS_AND_PY } from '../hooks/lib/source.js';
import { pathFromArgs } from '../hooks/lib/tool-paths.js';
import { projectRootOf } from './lib/context.js';

/**
 * postToolUse can inject additional_context — the capability this needs — but
 * unlike afterFileEdit its tool_input shape isn't pinned down by Cursor's docs
 * for a generic "Write"-like call. Try every plausible key rather than one exact
 * name; a tool call that doesn't match any of them just falls through to the
 * empty-return below (safe no-op), so a wrong guess here costs silence, not a
 * crash — the same trade-off ../hooks/post-edit.js makes on the Claude Code side.
 * (The plausible key names live in hooks/lib/tool-paths.js, shared by every host.)
 */

runHook(async () => {
  const input = await readHookInput();
  const filePath = pathFromArgs(input.tool_input);
  if (!filePath || !hasExtension(filePath, JS_AND_PY)) return;

  const config = resolveConfig(projectRootOf(input));
  if (!config.enabled) return;

  const source = readSafely(filePath);
  if (!source) return;

  const findings = analyze(source, filePath, {
    tiers: config.tiers,
    disabled: config.disabledDetectors,
  });

  const context = formatFindings(findings, filePath, config.maxFindings);
  if (context) emitJson({ additional_context: context });
});

function readSafely(filePath) {
  try {
    return readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}
