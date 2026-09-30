import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let target;

function install(dir = target) {
  return execFileSync(process.execPath, [join(pluginRoot, 'scripts', 'install-antigravity.js'), dir], {
    encoding: 'utf8',
  });
}

function readHooks(dir = target) {
  return JSON.parse(readFileSync(join(dir, '.agents', 'hooks.json'), 'utf8'));
}

before(() => {
  target = mkdtempSync(join(tmpdir(), 'pragma-install-agy-'));
});

after(() => {
  rmSync(target, { recursive: true, force: true });
});

describe('install-antigravity.js — fresh project', () => {
  it('creates the rule, generated from the live principles/core.md, as plain markdown', () => {
    const output = install();
    assert.match(output, /rule:\s+\.agents\/rules\/pragma\.md/);

    const rule = readFileSync(join(target, '.agents', 'rules', 'pragma.md'), 'utf8');
    assert.match(rule, /Pragmatic design ladder/);
    assert.doesNotMatch(rule, /^---/, 'no frontmatter — the rule format has no confirmed schema for it');
  });

  it('creates hooks.json namespaced under a "pragma" hook name, paths resolved', () => {
    const hooks = readHooks();
    assert.ok(hooks.pragma);
    assert.deepEqual(Object.keys(hooks.pragma).filter((k) => k !== 'enabled').sort(), [
      'PostToolUse', 'PreInvocation', 'Stop',
    ]);
    const raw = readFileSync(join(target, '.agents', 'hooks.json'), 'utf8');
    assert.doesNotMatch(raw, /\{\{PRAGMA_ROOT\}\}/);
  });

  it('creates one workflow per skill, from the shared templates directory, root substituted', () => {
    const modeWorkflow = readFileSync(join(target, '.agents', 'workflows', 'pragma-mode.md'), 'utf8');
    assert.doesNotMatch(modeWorkflow, /\{\{PRAGMA_ROOT\}\}/);
    assert.match(modeWorkflow, /scripts\/mode\.js/);
  });
});

describe('install-antigravity.js — re-running is idempotent', () => {
  it('replaces the pragma entry in place rather than accumulating duplicates', () => {
    install();
    install();
    const hooks = readHooks();
    assert.equal(hooks.pragma.PreInvocation.length, 1);
    assert.equal(hooks.pragma.PostToolUse.length, 1);
  });
});

describe('install-antigravity.js — an existing hooks.json with another tool\'s entry', () => {
  let ownHooksTarget;

  before(() => {
    ownHooksTarget = mkdtempSync(join(tmpdir(), 'pragma-install-agy-existing-'));
    mkdirSync(join(ownHooksTarget, '.agents'), { recursive: true });
    writeFileSync(
      join(ownHooksTarget, '.agents', 'hooks.json'),
      JSON.stringify({
        'some-other-tool': {
          enabled: true,
          Stop: [{ type: 'command', command: './scripts/notify.sh' }],
        },
      }, null, 2),
      'utf8',
    );
  });

  after(() => {
    rmSync(ownHooksTarget, { recursive: true, force: true });
  });

  it('adds pragma alongside the existing tool\'s entry without touching it', () => {
    install(ownHooksTarget);

    const hooks = readHooks(ownHooksTarget);

    // The other tool's entry survives completely untouched.
    assert.deepEqual(hooks['some-other-tool'], {
      enabled: true,
      Stop: [{ type: 'command', command: './scripts/notify.sh' }],
    });

    // pragma's own entry was added alongside it.
    assert.ok(hooks.pragma);
    assert.equal(hooks.pragma.PostToolUse.length, 1);
  });
});

describe('install-antigravity.js — a corrupt existing hooks.json', () => {
  let corruptTarget;

  before(() => {
    corruptTarget = mkdtempSync(join(tmpdir(), 'pragma-install-agy-corrupt-'));
    mkdirSync(join(corruptTarget, '.agents'), { recursive: true });
    writeFileSync(join(corruptTarget, '.agents', 'hooks.json'), '{ not valid json', 'utf8');
  });

  after(() => {
    rmSync(corruptTarget, { recursive: true, force: true });
  });

  it('leaves it untouched and says why, rather than crashing or guessing', () => {
    const output = install(corruptTarget);
    assert.match(output, /left .*hooks\.json untouched/);
    assert.equal(readFileSync(join(corruptTarget, '.agents', 'hooks.json'), 'utf8'), '{ not valid json');
  });

  it('still installs the rule and workflows, which don\'t depend on the hooks file', () => {
    assert.ok(existsSync(join(corruptTarget, '.agents', 'rules', 'pragma.md')));
    assert.ok(existsSync(join(corruptTarget, '.agents', 'workflows', 'pragma-mode.md')));
  });
});
