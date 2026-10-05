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
  return execFileSync(process.execPath, [join(pluginRoot, 'copilot', script)], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    env: { ...process.env, PRAGMA_STATE_DIR: stateDir },
  });
}

/** Separate environment from runHook, matching real use: a skill's CLI call shares none of the hook's env. */
function setMode(cwd, mode) {
  execFileSync(process.execPath, [join(pluginRoot, 'scripts', 'mode.js'), mode], { cwd, encoding: 'utf8' });
}

const BAD_SOURCE = [
  'const redis = new Redis("redis://prod-cache-1.internal:6379");',
  'export async function findOrder(db, id) {',
  '  return db.query(`SELECT * FROM orders WHERE id = ${id}`);',
  '}',
].join('\n');

before(() => {
  workspace = mkdtempSync(join(tmpdir(), 'pragma-copilot-'));
  stateDir = mkdtempSync(join(tmpdir(), 'pragma-copilot-state-'));
  mkdirSync(join(workspace, 'src', 'services'), { recursive: true });
  writeFileSync(join(workspace, 'src', 'services', 'order.ts'), BAD_SOURCE, 'utf8');
  writeFileSync(join(workspace, 'src', 'services', 'other.ts'), BAD_SOURCE, 'utf8');
  setMode(workspace, 'standard');
});

after(() => {
  rmSync(workspace, { recursive: true, force: true });
  rmSync(stateDir, { recursive: true, force: true });
});

describe('copilot/session-start.js', () => {
  const payload = { hook_event_name: 'SessionStart', session_id: 's1', cwd: undefined, source: 'startup' };

  it('emits the ladder as a top-level additionalContext', () => {
    const output = JSON.parse(runHook('session-start.js', { ...payload, cwd: workspace }));
    assert.match(output.additionalContext, /Pragmatic design ladder/);
    assert.match(output.additionalContext, /_pragma standard/);
    assert.equal(output.hookSpecificOutput, undefined, 'Copilot CLI reads the top-level field only');
  });

  it('emits nothing when the project is set to off', () => {
    setMode(workspace, 'off');
    assert.equal(runHook('session-start.js', { ...payload, cwd: workspace }), '');
    setMode(workspace, 'standard');
  });
});

describe('copilot/post-tool-use.js', () => {
  const call = (toolName, toolInput, extra = {}) => ({
    hook_event_name: 'PostToolUse',
    session_id: 'conv-post',
    cwd: workspace,
    tool_name: toolName,
    tool_input: toolInput,
    ...extra,
  });

  it('resolves a relative path against cwd and reports findings as additionalContext', () => {
    const output = JSON.parse(runHook('post-tool-use.js', call('create', { path: 'src/services/order.ts' })));
    assert.match(output.additionalContext, /P13 Stay Safe/);
    assert.match(output.additionalContext, /P6 Configuration/);
  });

  it('reads the file out of an apply_patch call, which has no path argument', () => {
    const patch = '*** Begin Patch\n*** Update File: src/services/order.ts\n@@\n+x\n*** End Patch';
    const output = JSON.parse(runHook('post-tool-use.js', call('apply_patch', { input: patch })));
    assert.match(output.additionalContext, /order\.ts/);
  });

  it('reports every file one call touched, once each', () => {
    const patch = [
      '*** Begin Patch',
      '*** Update File: src/services/order.ts',
      '*** Update File: src/services/other.ts',
      '*** End Patch',
    ].join('\n');
    const { additionalContext } = JSON.parse(runHook('post-tool-use.js', call('apply_patch', { input: patch })));
    assert.equal(additionalContext.match(/order\.ts/g)?.length, 1);
    assert.equal(additionalContext.match(/other\.ts/g)?.length, 1);
  });

  it('accepts the camelCase payload shape too, with toolArgs as a JSON string', () => {
    const output = JSON.parse(runHook('post-tool-use.js', {
      sessionId: 'conv-camel',
      cwd: workspace,
      toolName: 'edit',
      toolArgs: JSON.stringify({ path: 'src/services/order.ts' }),
    }));
    assert.match(output.additionalContext, /P13 Stay Safe/);
  });

  it('stays silent on a tool call that is not a file edit', () => {
    assert.equal(runHook('post-tool-use.js', call('bash', { command: 'ls' })), '');
  });

  it('stays silent on a file it has no detectors for', () => {
    assert.equal(runHook('post-tool-use.js', call('create', { path: 'README.md' })), '');
  });

  it('respects project mode, same as every other host', () => {
    setMode(workspace, 'lite');
    const { additionalContext } = JSON.parse(runHook('post-tool-use.js', call('create', { path: 'src/services/order.ts' })));
    assert.doesNotMatch(additionalContext, /P5 Decoupling/);
    setMode(workspace, 'standard');
  });
});

describe('copilot/stop.js', () => {
  const edit = (sessionId, path) => runHook('post-tool-use.js', {
    hook_event_name: 'PostToolUse',
    session_id: sessionId,
    cwd: workspace,
    tool_name: 'edit',
    tool_input: { path },
  });

  const stop = (sessionId, extra = {}) => runHook('stop.js', {
    hook_event_name: 'Stop',
    session_id: sessionId,
    cwd: workspace,
    stop_hook_active: false,
    ...extra,
  });

  it('stays silent outside strict mode', () => {
    edit('s-standard', 'src/services/order.ts');
    assert.equal(stop('s-standard'), '');
  });

  it('blocks once, with a reason, when source changed but no test did', () => {
    setMode(workspace, 'strict');
    edit('s-strict', 'src/services/order.ts');

    const output = JSON.parse(stop('s-strict'));
    assert.equal(output.decision, 'block');
    assert.match(output.reason, /P12 Test to Code/);

    assert.equal(stop('s-strict'), '', 'must not block a second time');
    setMode(workspace, 'standard');
  });

  it('does not stack on a Stop that is already continuing', () => {
    setMode(workspace, 'strict');
    edit('s-active', 'src/services/order.ts');
    assert.equal(stop('s-active', { stop_hook_active: true }), '');
    setMode(workspace, 'standard');
  });

  it('stays silent when a test file was touched too', () => {
    setMode(workspace, 'strict');
    edit('s-tested', 'src/services/order.ts');
    edit('s-tested', 'src/services/order.test.ts');
    assert.equal(stop('s-tested'), '');
    setMode(workspace, 'standard');
  });
});
