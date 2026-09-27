import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let workspace;
let stateDir;

/** Run a Cursor adapter exactly as Cursor does: JSON on stdin, JSON on stdout. */
function runHook(script, payload) {
  return execFileSync(process.execPath, [join(pluginRoot, 'cursor', script)], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    env: { ...process.env, PRAGMA_STATE_DIR: stateDir },
  });
}

/**
 * Deliberately separate from runHook's environment — same discipline as
 * tests/hooks.test.js's setMode, and for the same reason: a real Cursor command
 * runs via a plain shell, sharing no env with the hook subprocess.
 */
function setMode(cwd, mode) {
  execFileSync(process.execPath, [join(pluginRoot, 'scripts', 'mode.js'), mode], {
    cwd,
    encoding: 'utf8',
  });
}

before(() => {
  workspace = mkdtempSync(join(tmpdir(), 'pragma-cursor-'));
  stateDir = mkdtempSync(join(tmpdir(), 'pragma-cursor-state-'));
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
  setMode(workspace, 'standard');
});

after(() => {
  rmSync(workspace, { recursive: true, force: true });
  rmSync(stateDir, { recursive: true, force: true });
});

describe('cursor/session-start.js', () => {
  it('emits the ladder as additional_context', () => {
    const output = JSON.parse(runHook('session-start.js', {
      hook_event_name: 'sessionStart',
      session_id: 's1',
      workspace_roots: [workspace],
    }));
    assert.match(output.additional_context, /Pragmatic design ladder/);
    assert.match(output.additional_context, /_pragma standard/);
  });

  it('emits nothing when the project is set to off', () => {
    setMode(workspace, 'off');
    const output = runHook('session-start.js', {
      hook_event_name: 'sessionStart',
      session_id: 's1',
      workspace_roots: [workspace],
    });
    assert.equal(output, '');
    setMode(workspace, 'standard');
  });
});

describe('cursor/post-tool-use.js', () => {
  const payload = (fileKey = 'file_path') => ({
    hook_event_name: 'postToolUse',
    tool_name: 'Write',
    cwd: workspace,
    tool_input: { [fileKey]: join(workspace, 'src', 'services', 'order.ts') },
  });

  it('reports findings as additional_context when the file path uses "file_path"', () => {
    const output = JSON.parse(runHook('post-tool-use.js', payload('file_path')));
    assert.match(output.additional_context, /P13 Stay Safe/);
    assert.match(output.additional_context, /P6 Configuration/);
  });

  it('falls back to other plausible path keys', () => {
    for (const key of ['path', 'filePath', 'target_file']) {
      const output = JSON.parse(runHook('post-tool-use.js', payload(key)));
      assert.match(output.additional_context, /P13 Stay Safe/, `expected a match using key "${key}"`);
    }
  });

  it('stays silent when no recognisable path key is present', () => {
    const output = runHook('post-tool-use.js', {
      hook_event_name: 'postToolUse',
      tool_name: 'Shell',
      cwd: workspace,
      tool_input: { command: 'ls' },
    });
    assert.equal(output, '');
  });

  it('respects project mode, same as the Claude Code hook', () => {
    setMode(workspace, 'lite');
    const output = JSON.parse(runHook('post-tool-use.js', payload()));
    assert.doesNotMatch(output.additional_context, /P5 Decoupling/);
    setMode(workspace, 'standard');
  });
});

describe('cursor/after-file-edit.js + cursor/stop.js', () => {
  const afterEdit = (conversationId, filePath) => runHook('after-file-edit.js', {
    hook_event_name: 'afterFileEdit',
    conversation_id: conversationId,
    workspace_roots: [workspace],
    file_path: filePath,
    edits: [{ old_string: '', new_string: '' }],
  });

  const stop = (conversationId) => runHook('stop.js', {
    hook_event_name: 'stop',
    conversation_id: conversationId,
    workspace_roots: [workspace],
    status: 'completed',
    loop_count: 0,
  });

  it('stays silent outside strict mode', () => {
    afterEdit('conv-standard', join(workspace, 'src', 'services', 'order.ts'));
    assert.equal(stop('conv-standard'), '');
  });

  it('sends a followup_message once when source changed but no test did', () => {
    setMode(workspace, 'strict');
    afterEdit('conv-strict', join(workspace, 'src', 'services', 'order.ts'));

    const output = JSON.parse(stop('conv-strict'));
    assert.match(output.followup_message, /P12 Test to Code/);

    assert.equal(stop('conv-strict'), '', 'must not send a second followup');
    setMode(workspace, 'standard');
  });

  it('stays silent when a test file was touched too', () => {
    setMode(workspace, 'strict');
    afterEdit('conv-tested', join(workspace, 'src', 'services', 'order.ts'));
    afterEdit('conv-tested', join(workspace, 'src', 'services', 'order.test.ts'));
    assert.equal(stop('conv-tested'), '');
    setMode(workspace, 'standard');
  });
});
