import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let workspace;
let stateDir;

/** Run a hook exactly as Claude Code does: JSON on stdin, JSON or text on stdout. */
function runHook(script, payload) {
  return execFileSync(process.execPath, [join(pluginRoot, 'hooks', script)], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    env: { ...process.env, PRAGMA_STATE_DIR: stateDir, CLAUDE_PLUGIN_ROOT: pluginRoot },
  });
}

/**
 * Deliberately does NOT share stateDir (or any CLAUDE_PLUGIN_* var) with runHook.
 * That mirrors reality: a skill runs this script via the Bash tool, which never
 * receives CLAUDE_PLUGIN_DATA — only a hook's own subprocess does. An earlier
 * version of this test synchronized an env var between the two call sites and
 * passed while the feature was actually broken end to end; project mode must
 * work with no shared environment at all.
 */
function setMode(cwd, mode) {
  execFileSync(process.execPath, [join(pluginRoot, 'scripts', 'mode.js'), mode], {
    cwd,
    encoding: 'utf8',
  });
}

before(() => {
  workspace = mkdtempSync(join(tmpdir(), 'pragma-hooks-'));
  stateDir = mkdtempSync(join(tmpdir(), 'pragma-state-'));
  mkdirSync(join(workspace, 'src', 'services'), { recursive: true });
  writeFileSync(
    join(workspace, 'src', 'services', 'order.ts'),
    [
      'const redis = new Redis("redis://prod-cache-1.internal:6379");',
      'export async function findOrder(db, id) {',
      '  return db.query(`SELECT * FROM orders WHERE id = ${id}`);',
      '}',
    ].join('\n'),
    'utf8',
  );
});

after(() => {
  rmSync(workspace, { recursive: true, force: true });
  rmSync(stateDir, { recursive: true, force: true });
});

describe('session-start.js', () => {
  it('emits the ladder as plain text', () => {
    setMode(workspace, 'standard');
    const output = runHook('session-start.js', { hook_event_name: 'SessionStart', source: 'startup', cwd: workspace });
    assert.match(output, /Pragmatic design ladder/);
    assert.match(output, /_pragma standard/);
  });

  it('emits nothing when the project is set to off', () => {
    setMode(workspace, 'off');
    assert.equal(runHook('session-start.js', { hook_event_name: 'SessionStart', source: 'startup', cwd: workspace }), '');
  });
});

describe('project mode — CLI and hook must agree with no shared environment', () => {
  it('a mode set via the CLI (as a skill would invoke it) is honoured by the hook', () => {
    setMode(workspace, 'off');
    const output = runHook('post-edit.js', {
      session_id: 'mode-agreement',
      hook_event_name: 'PostToolUse',
      cwd: workspace,
      tool_name: 'Write',
      tool_input: { file_path: join(workspace, 'src', 'services', 'order.ts') },
    });
    assert.equal(output, '', 'hook must see the mode the CLI just set, not some other default');
    setMode(workspace, 'standard');
  });

  it('persists as a file inside the project, not a global store keyed by path', () => {
    setMode(workspace, 'strict');
    const stored = readFileSync(join(workspace, '.pragma', 'mode'), 'utf8').trim();
    assert.equal(stored, 'strict');
    setMode(workspace, 'standard');
  });
});

describe('post-edit.js', () => {
  const payload = (sessionId = 'hook-test') => ({
    session_id: sessionId,
    hook_event_name: 'PostToolUse',
    cwd: workspace,
    tool_name: 'Write',
    tool_input: { file_path: join(workspace, 'src', 'services', 'order.ts') },
  });

  it('reports safety findings as additionalContext', () => {
    setMode(workspace, 'standard');
    const output = JSON.parse(runHook('post-edit.js', payload()));
    const context = output.hookSpecificOutput.additionalContext;

    assert.equal(output.hookSpecificOutput.hookEventName, 'PostToolUse');
    assert.match(context, /P13 Stay Safe/);
    assert.match(context, /P6 Configuration/);
    assert.match(context, /:3/);
  });

  it('drops design findings in lite mode', () => {
    setMode(workspace, 'lite');
    const context = JSON.parse(runHook('post-edit.js', payload())).hookSpecificOutput.additionalContext;
    assert.match(context, /P13 Stay Safe/);
    assert.doesNotMatch(context, /P5 Decoupling/);
  });

  it('emits nothing when the project is set to off', () => {
    setMode(workspace, 'off');
    assert.equal(runHook('post-edit.js', payload()), '');
  });

  it('ignores files it has no detectors for', () => {
    setMode(workspace, 'standard');
    const output = runHook('post-edit.js', {
      ...payload(),
      tool_input: { file_path: join(workspace, 'README.md') },
    });
    assert.equal(output, '');
  });
});

describe('prompt-submit.js', () => {
  const payload = (prompt) => ({ hook_event_name: 'UserPromptSubmit', cwd: workspace, prompt });

  it('injects the debugging protocol for a debugging prompt', () => {
    setMode(workspace, 'standard');
    const context = JSON.parse(runHook('prompt-submit.js', payload('the webhook is failing'))).hookSpecificOutput.additionalContext;
    assert.match(context, /reproduce it reliably/);
  });

  it('stays silent on a neutral prompt', () => {
    setMode(workspace, 'standard');
    assert.equal(runHook('prompt-submit.js', payload('run the tests')), '');
  });

  it('stays silent in lite mode even for a matching prompt', () => {
    setMode(workspace, 'lite');
    assert.equal(runHook('prompt-submit.js', payload('the webhook is failing')), '');
  });
});

describe('stop-check.js', () => {
  const stop = (sessionId) => runHook('stop-check.js', {
    session_id: sessionId,
    hook_event_name: 'Stop',
    cwd: workspace,
    stop_hook_active: false,
  });

  const edit = (sessionId, file) => runHook('post-edit.js', {
    session_id: sessionId,
    hook_event_name: 'PostToolUse',
    cwd: workspace,
    tool_name: 'Write',
    tool_input: { file_path: join(workspace, file) },
  });

  it('stays silent outside strict mode', () => {
    setMode(workspace, 'standard');
    edit('session-standard', 'src/services/order.ts');
    assert.equal(stop('session-standard'), '');
  });

  it('blocks once when source changed but no test did', () => {
    setMode(workspace, 'strict');
    edit('session-strict', 'src/services/order.ts');

    const blocked = JSON.parse(stop('session-strict'));
    assert.equal(blocked.decision, 'block');
    assert.match(blocked.reason, /P12 Test to Code/);

    assert.equal(stop('session-strict'), '', 'must not block a second time');
  });

  it('stays silent when a test was touched too', () => {
    setMode(workspace, 'strict');
    edit('session-tested', 'src/services/order.ts');
    edit('session-tested', 'src/services/order.test.ts');
    assert.equal(stop('session-tested'), '');
  });

  it('stays silent when nothing was written', () => {
    setMode(workspace, 'strict');
    assert.equal(stop('session-idle'), '');
  });
});
