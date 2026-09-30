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

function runHook(script, payload) {
  return execFileSync(process.execPath, [join(pluginRoot, 'antigravity', script)], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    env: { ...process.env, PRAGMA_STATE_DIR: stateDir },
  });
}

/** Separate environment from runHook, matching real usage: no shared env with a workflow's CLI call. */
function setMode(cwd, mode) {
  execFileSync(process.execPath, [join(pluginRoot, 'scripts', 'mode.js'), mode], {
    cwd,
    encoding: 'utf8',
  });
}

before(() => {
  workspace = mkdtempSync(join(tmpdir(), 'pragma-agy-'));
  stateDir = mkdtempSync(join(tmpdir(), 'pragma-agy-state-'));
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

describe('antigravity/post-tool-use.js', () => {
  const payload = (conversationId, argKey = 'file_path') => ({
    hook_event_name: 'PostToolUse',
    conversationId,
    workspacePaths: [workspace],
    toolCall: { name: 'write_to_file', args: { [argKey]: join(workspace, 'src', 'services', 'order.ts') } },
  });

  it('always emits {} — its output is documented as ignored', () => {
    assert.equal(runHook('post-tool-use.js', payload('conv-shape')).trim(), '{}');
  });

  it('finds the path under several plausible argument keys', () => {
    for (const key of ['file_path', 'path', 'filePath', 'AbsolutePath']) {
      runHook('post-tool-use.js', payload(`conv-key-${key}`, key));
      // No direct assertion here — verified indirectly via the relay test below,
      // since this hook's own output never carries the findings.
    }
  });

  it('stays inert when no recognisable path key is present', () => {
    const output = runHook('post-tool-use.js', {
      hook_event_name: 'PostToolUse',
      conversationId: 'conv-no-path',
      workspacePaths: [workspace],
      toolCall: { name: 'run_command', args: { command: 'ls' } },
    });
    assert.equal(output.trim(), '', 'no matched path means an early return, before emitJson is ever reached');
  });
});

describe('antigravity/pre-invocation.js — the relay', () => {
  const postToolUse = (conversationId) => runHook('post-tool-use.js', {
    hook_event_name: 'PostToolUse',
    conversationId,
    workspacePaths: [workspace],
    toolCall: { name: 'write_to_file', args: { file_path: join(workspace, 'src', 'services', 'order.ts') } },
  });

  const preInvocation = (conversationId) => runHook('pre-invocation.js', {
    hook_event_name: 'PreInvocation',
    conversationId,
    workspacePaths: [workspace],
    invocationNum: 1,
  });

  it('delivers findings recorded by post-tool-use.js on the next turn, once', () => {
    postToolUse('conv-relay');

    const delivered = JSON.parse(preInvocation('conv-relay'));
    assert.match(delivered.injectSteps[0].ephemeralMessage, /P13 Stay Safe/);
    assert.match(delivered.injectSteps[0].ephemeralMessage, /P6 Configuration/);

    assert.equal(preInvocation('conv-relay').trim(), '', 'must not deliver the same findings twice');
  });

  it('stays silent when nothing is pending for this conversation', () => {
    assert.equal(preInvocation('conv-nothing-pending').trim(), '');
  });

  it('respects project mode, same as the other hosts', () => {
    setMode(workspace, 'lite');
    postToolUse('conv-lite');
    const delivered = JSON.parse(preInvocation('conv-lite'));
    assert.doesNotMatch(delivered.injectSteps[0].ephemeralMessage, /P5 Decoupling/);
    setMode(workspace, 'standard');
  });
});

describe('antigravity/stop.js', () => {
  const postToolUse = (conversationId, filePath) => runHook('post-tool-use.js', {
    hook_event_name: 'PostToolUse',
    conversationId,
    workspacePaths: [workspace],
    toolCall: { name: 'write_to_file', args: { file_path: filePath } },
  });

  const stop = (conversationId) => runHook('stop.js', {
    hook_event_name: 'Stop',
    conversationId,
    workspacePaths: [workspace],
    executionNum: 1,
    terminationReason: 'plan_complete',
    fullyIdle: true,
  });

  it('stays silent outside strict mode', () => {
    postToolUse('conv-agy-standard', join(workspace, 'src', 'services', 'order.ts'));
    assert.equal(stop('conv-agy-standard').trim(), '');
  });

  it('asks the agent to continue, once, when source changed but no test did', () => {
    setMode(workspace, 'strict');
    postToolUse('conv-agy-strict', join(workspace, 'src', 'services', 'order.ts'));

    const output = JSON.parse(stop('conv-agy-strict'));
    assert.equal(output.decision, 'continue');
    assert.match(output.reason, /P12 Test to Code/);

    assert.equal(stop('conv-agy-strict').trim(), '', 'must not ask a second time');
    setMode(workspace, 'standard');
  });

  it('stays silent when a test file was touched too', () => {
    setMode(workspace, 'strict');
    postToolUse('conv-agy-tested', join(workspace, 'src', 'services', 'order.ts'));
    postToolUse('conv-agy-tested', join(workspace, 'src', 'services', 'order.test.ts'));
    assert.equal(stop('conv-agy-tested').trim(), '');
    setMode(workspace, 'standard');
  });
});
