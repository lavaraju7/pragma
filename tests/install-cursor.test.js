import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let target;

function install() {
  return execFileSync(process.execPath, [join(pluginRoot, 'scripts', 'install-cursor.js'), target], {
    encoding: 'utf8',
  });
}

function readHooks() {
  return JSON.parse(readFileSync(join(target, '.cursor', 'hooks.json'), 'utf8'));
}

before(() => {
  target = mkdtempSync(join(tmpdir(), 'pragma-install-cursor-'));
});

after(() => {
  rmSync(target, { recursive: true, force: true });
});

describe('install-cursor.js — fresh project', () => {
  it('creates the rule, generated from the live principles/core.md', () => {
    const output = install();
    assert.match(output, /rule:\s+\.cursor\/rules\/pragma\.mdc/);

    const rule = readFileSync(join(target, '.cursor', 'rules', 'pragma.mdc'), 'utf8');
    assert.match(rule, /alwaysApply: true/);
    assert.match(rule, /Pragmatic design ladder/);
  });

  it('creates hooks.json with all four events, paths resolved (no {{PRAGMA_ROOT}} left)', () => {
    const hooks = readHooks();
    assert.deepEqual(
      Object.keys(hooks.hooks).sort(),
      ['afterFileEdit', 'postToolUse', 'sessionStart', 'stop'],
    );
    const raw = readFileSync(join(target, '.cursor', 'hooks.json'), 'utf8');
    assert.doesNotMatch(raw, /\{\{PRAGMA_ROOT\}\}/);
    assert.match(hooks.hooks.sessionStart[0].command, /session-start\.js/);
  });

  it('creates one command file per skill, with the root substituted', () => {
    const modeCommand = readFileSync(join(target, '.cursor', 'commands', 'pragma-mode.md'), 'utf8');
    assert.doesNotMatch(modeCommand, /\{\{PRAGMA_ROOT\}\}/);
    assert.match(modeCommand, /scripts\/mode\.js/);
  });
});

describe('install-cursor.js — re-running is idempotent', () => {
  it('does not duplicate hook entries on a second run', () => {
    install();
    const hooks = readHooks();
    assert.equal(hooks.hooks.sessionStart.length, 1);
    assert.equal(hooks.hooks.postToolUse.length, 1);
  });
});

describe('install-cursor.js — an existing hooks.json with unrelated hooks', () => {
  let ownHooksTarget;

  before(() => {
    ownHooksTarget = mkdtempSync(join(tmpdir(), 'pragma-install-cursor-existing-'));
    mkdirSync(join(ownHooksTarget, '.cursor'), { recursive: true });
    writeFileSync(
      join(ownHooksTarget, '.cursor', 'hooks.json'),
      JSON.stringify({
        version: 1,
        hooks: {
          afterFileEdit: [{ command: '.cursor/hooks/format.sh' }],
          beforeShellExecution: [{ command: '.cursor/hooks/approve.sh', failClosed: true }],
        },
      }, null, 2),
      'utf8',
    );
  });

  after(() => {
    rmSync(ownHooksTarget, { recursive: true, force: true });
  });

  it('adds pragma\'s hooks alongside the existing ones without touching them', () => {
    execFileSync(process.execPath, [join(pluginRoot, 'scripts', 'install-cursor.js'), ownHooksTarget], { encoding: 'utf8' });

    const hooks = JSON.parse(readFileSync(join(ownHooksTarget, '.cursor', 'hooks.json'), 'utf8'));

    // The user's own hook survives untouched.
    assert.deepEqual(hooks.hooks.beforeShellExecution, [
      { command: '.cursor/hooks/approve.sh', failClosed: true },
    ]);

    // afterFileEdit gains pragma's entry alongside the user's own formatter.
    assert.equal(hooks.hooks.afterFileEdit.length, 2);
    assert.ok(hooks.hooks.afterFileEdit.some((e) => e.command === '.cursor/hooks/format.sh'));
    assert.ok(hooks.hooks.afterFileEdit.some((e) => e.command.includes('after-file-edit.js')));

    // sessionStart, postToolUse and stop are new additions.
    assert.equal(hooks.hooks.sessionStart.length, 1);
  });
});

describe('install-cursor.js — an unsupported hooks.json version', () => {
  let futureTarget;

  before(() => {
    futureTarget = mkdtempSync(join(tmpdir(), 'pragma-install-cursor-future-'));
    mkdirSync(join(futureTarget, '.cursor'), { recursive: true });
    writeFileSync(
      join(futureTarget, '.cursor', 'hooks.json'),
      JSON.stringify({ version: 2, hooks: { stop: [{ command: 'echo hi' }] } }, null, 2),
      'utf8',
    );
  });

  after(() => {
    rmSync(futureTarget, { recursive: true, force: true });
  });

  it('leaves the file untouched and says why, rather than guessing at an unfamiliar schema', () => {
    const output = execFileSync(
      process.execPath,
      [join(pluginRoot, 'scripts', 'install-cursor.js'), futureTarget],
      { encoding: 'utf8' },
    );
    assert.match(output, /left .*hooks\.json untouched/);

    const unchanged = readFileSync(join(futureTarget, '.cursor', 'hooks.json'), 'utf8');
    assert.deepEqual(JSON.parse(unchanged), { version: 2, hooks: { stop: [{ command: 'echo hi' }] } });
  });

  it('still installs the rule and commands, which don\'t depend on the hooks schema', () => {
    assert.ok(existsSync(join(futureTarget, '.cursor', 'rules', 'pragma.mdc')));
    assert.ok(existsSync(join(futureTarget, '.cursor', 'commands', 'pragma-mode.md')));
  });
});
