import { resolveConfig } from '../hooks/lib/config.js';
import { reportForFiles } from '../hooks/lib/file-report.js';
import { readHookInput, runHook } from '../hooks/lib/hook-io.js';
import { hasExtension, JS_AND_PY } from '../hooks/lib/source.js';
import { pathsFromToolCall } from '../hooks/lib/tool-paths.js';

/**
 * Windsurf's hooks cannot talk to the agent: stdout is shown to the *developer*
 * in the Cascade panel (when the entry sets show_output) and is never fed back
 * to the model, and post-hooks cannot block. The only agent-visible channel is a
 * pre-hook exiting 2 — a block — which this plugin deliberately never does. So
 * this is advisory to the person at the keyboard, not to Cascade; the ladder
 * that reaches the agent is the always-on rule the installer writes.
 *
 * Plain text, not JSON: there is no output schema to satisfy. The hook's
 * working directory defaults to the repo root (multi-repo workspaces: the repo
 * being worked on), which is where .pragma/mode lives.
 */
runHook(async () => {
  const input = await readHookInput();
  const cwd = process.cwd();

  const files = pathsFromToolCall(input.tool_info, cwd).filter((file) => hasExtension(file, JS_AND_PY));
  if (!files.length) return;

  const config = resolveConfig(cwd);
  if (!config.enabled) return;

  const report = reportForFiles(files, config);
  if (report) process.stdout.write(`${report}\n`);
});
