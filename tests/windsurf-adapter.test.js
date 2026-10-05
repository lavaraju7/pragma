import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let workspace;

const BAD_SOURCE = [
  'const redis = new Redis("redis://prod-cache-1.internal:6379");',
  'export async function findOrder(db, id) {',
  '  return db.query(`SELECT * FROM orders WHERE id = ${id}`);',
  '}',
].join('\n');

/** Run the hook as Windsurf does: JSON on stdin, cwd = the repo root. */
function runHook(toolInfo) {
  return execFileSync(process.execPath, [join(pluginRoot, 'windsurf', 'post-write-code.js')], {
    input: JSON.stringify({ agent_action_name: 'post_write_code', trajectory_id: 't1', tool_info: toolInfo }),
    encoding: 'utf8',
    cwd: workspace,
  });
}

function setMode(mode) {
  execFileSync(process.execPath, [join(pluginRoot, 'scripts', 'mode.js'), mode], { cwd: workspace, encoding: 'utf8' });
}

before(() => {
  workspace = mkdtempSync(join(tmpdir(), 'pragma-windsurf-'));
  mkdirSync(join(workspace, 'src'), { recursive: true });
  writeFileSync(join(workspace, 'src', 'order.ts'), BAD_SOURCE, 'utf8');
  writeFileSync(join(workspace, 'src', 'clean.ts'), 'export const retries = 3;\n', 'utf8');
  setMode('standard');
});

after(() => rmSync(workspace, { recursive: true, force: true }));

describe('windsurf/post-write-code.js', () => {
  it('prints findings as plain text — Windsurf has no output schema, only a panel for you to read', () => {
    const output = runHook({ file_path: join(workspace, 'src', 'order.ts'), edits: [] });
    assert.match(output, /^pragma — \d+ findings? in /);
    assert.match(output, /P13 Stay Safe/);
    assert.match(output, /P6 Configuration/);
    assert.throws(() => JSON.parse(output), 'must not be JSON');
  });

  it('resolves a relative path against the working directory', () => {
    assert.match(runHook({ file_path: 'src/order.ts' }), /P13 Stay Safe/);
  });

  it('stays silent on a clean file, a non-source file, and a call with no path', () => {
    assert.equal(runHook({ file_path: join(workspace, 'src', 'clean.ts') }), '');
    assert.equal(runHook({ file_path: join(workspace, 'README.md') }), '');
    assert.equal(runHook({}), '');
  });

  it('respects project mode, read from .pragma/mode in the working directory', () => {
    setMode('off');
    assert.equal(runHook({ file_path: 'src/order.ts' }), '');

    setMode('lite');
    assert.doesNotMatch(runHook({ file_path: 'src/order.ts' }), /P5 Decoupling/);
    setMode('standard');
  });
});

/**
 * The hook command is baked in as an absolute path at install time, so unlike the
 * Copilot hooks there is no plugin-root lookup to get wrong — but it still has to
 * survive being run by a real shell on each OS Windsurf supports, with the payload
 * on stdin and the repo as the working directory.
 */
describe('the installed hook command, run by a real shell', () => {
  let entry;

  before(() => {
    execFileSync(process.execPath, [join(pluginRoot, 'scripts', 'install-windsurf.js'), workspace], { encoding: 'utf8' });
    [entry] = JSON.parse(readFileSync(join(workspace, '.windsurf', 'hooks.json'), 'utf8')).hooks.post_write_code;
  });

  const payload = () => JSON.stringify({ tool_info: { file_path: join(workspace, 'src', 'order.ts') } });
  const available = (command, args) => spawnSync(command, args, { encoding: 'utf8' }).status === 0;

  it('works under sh (the `command` field)', { skip: !available('sh', ['-c', 'true']) && 'no sh here' }, () => {
    const result = spawnSync('sh', ['-c', entry.command], { input: payload(), encoding: 'utf8', cwd: workspace });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /P13 Stay Safe/);
  });

  it('works under PowerShell (the `powershell` field)', {
    skip: !available('powershell', ['-NoProfile', '-Command', 'exit 0']) && 'no powershell here',
  }, () => {
    const result = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', entry.powershell], {
      input: payload(), encoding: 'utf8', cwd: workspace,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /P13 Stay Safe/);
  });
});
