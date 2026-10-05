import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const made = [];

/** A scratch project, optionally pre-populated with {relativePath: content}. */
function project(files = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'pragma-install-windsurf-'));
  made.push(dir);
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), content, 'utf8');
  }
  return dir;
}

function install(dir) {
  return execFileSync(process.execPath, [join(pluginRoot, 'scripts', 'install-windsurf.js'), dir], { encoding: 'utf8' });
}

const readJson = (dir, path) => JSON.parse(readFileSync(join(dir, path), 'utf8'));

/** Windsurf documents a 12,000-character ceiling on each rule and workflow file. */
const WINDSURF_FILE_LIMIT = 12_000;

after(() => made.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

describe('install-windsurf.js — a fresh project', () => {
  const dir = project();
  const output = install(dir);

  it('writes under .windsurf/, the directory every Windsurf version reads', () => {
    assert.match(output, /rule:\s+\.windsurf\/rules\/pragma\.md/);
    assert.ok(!existsSync(join(dir, '.devin')));
  });

  it('writes an always-on rule within the file size limit', () => {
    const rule = readFileSync(join(dir, '.windsurf', 'rules', 'pragma.md'), 'utf8');
    assert.match(rule, /^---\ntrigger: always_on\n---/);
    assert.match(rule, /Pragmatic design ladder/);
    assert.ok(rule.length < WINDSURF_FILE_LIMIT, `${rule.length} chars`);
  });

  it('writes one workflow per command, root substituted, each within the limit', () => {
    const names = readdirSync(join(dir, '.windsurf', 'workflows'));
    assert.equal(names.length, 8);
    for (const name of names) {
      const text = readFileSync(join(dir, '.windsurf', 'workflows', name), 'utf8');
      assert.doesNotMatch(text, /\{\{PRAGMA_ROOT\}\}/, name);
      assert.ok(text.length < WINDSURF_FILE_LIMIT, `${name}: ${text.length} chars`);
    }
  });

  it('registers post_write_code with show_output, since that is the only way anyone sees it', () => {
    const [entry] = readJson(dir, '.windsurf/hooks.json').hooks.post_write_code;
    assert.equal(entry.show_output, true);
    assert.match(entry.command, /windsurf\/post-write-code\.js/);
    assert.doesNotMatch(entry.command, /\{\{PRAGMA_ROOT\}\}/);
  });

  it('is idempotent: a second run adds no duplicate entry', () => {
    install(dir);
    assert.equal(readJson(dir, '.windsurf/hooks.json').hooks.post_write_code.length, 1);
  });
});

describe('install-windsurf.js — where it writes', () => {
  it('uses .devin/ when the project already has that directory and nothing is in .windsurf/', () => {
    const dir = project({ '.devin/keep': '' });
    install(dir);
    assert.ok(existsSync(join(dir, '.devin', 'rules', 'pragma.md')));
    assert.ok(existsSync(join(dir, '.devin', 'hooks.json')));
    assert.ok(!existsSync(join(dir, '.windsurf')));
  });

  it('merges into an existing .devin/hooks.json, leaving the user\'s hook alone', () => {
    const mine = { hooks: { pre_run_command: [{ command: './mine.sh' }] } };
    const dir = project({ '.devin/hooks.json': JSON.stringify(mine) });
    install(dir);
    const hooks = readJson(dir, '.devin/hooks.json').hooks;
    assert.deepEqual(hooks.pre_run_command, mine.hooks.pre_run_command);
    assert.equal(hooks.post_write_code.length, 1);
  });

  it('does NOT shadow an existing .windsurf/hooks.json by creating .devin/hooks.json beside it', () => {
    // .devin/ is preferred and .windsurf/ is read only when its .devin/ equivalent is absent,
    // so a fresh .devin/hooks.json here would silently disable the user's own hooks.
    const mine = { hooks: { post_run_command: [{ command: './audit.sh' }] } };
    const dir = project({ '.devin/keep': '', '.windsurf/hooks.json': JSON.stringify(mine) });
    install(dir);

    assert.ok(!existsSync(join(dir, '.devin', 'hooks.json')), 'must not create a shadowing file');
    const hooks = readJson(dir, '.windsurf/hooks.json').hooks;
    assert.deepEqual(hooks.post_run_command, mine.hooks.post_run_command);
    assert.equal(hooks.post_write_code.length, 1);
  });

  it('decides each component separately: rules follow an existing .windsurf/rules/', () => {
    const dir = project({ '.devin/keep': '', '.windsurf/rules/mine.md': '---\ntrigger: manual\n---\nmine' });
    install(dir);
    assert.ok(existsSync(join(dir, '.windsurf', 'rules', 'pragma.md')));
    assert.ok(!existsSync(join(dir, '.devin', 'rules')));
  });
});

describe('install-windsurf.js — a hooks.json it cannot safely merge into', () => {
  const dir = project({ '.windsurf/hooks.json': '{ not valid json' });
  const output = install(dir);

  it('leaves it untouched and says why', () => {
    assert.match(output, /left .*hooks\.json untouched/);
    assert.equal(readFileSync(join(dir, '.windsurf', 'hooks.json'), 'utf8'), '{ not valid json');
  });

  it('still installs the rule and workflows, which do not depend on it', () => {
    assert.ok(existsSync(join(dir, '.windsurf', 'rules', 'pragma.md')));
    assert.ok(existsSync(join(dir, '.windsurf', 'workflows', 'pragma-mode.md')));
  });
});
