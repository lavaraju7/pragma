import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildCopilotFiles } from '../copilot/lib/generate.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (relativePath) => JSON.parse(readFileSync(join(root, relativePath), 'utf8'));

/** Event names Copilot CLI documents — a typo here is silently never fired. */
const DOCUMENTED_EVENTS = [
  'sessionStart', 'SessionStart', 'sessionEnd', 'SessionEnd', 'userPromptSubmitted', 'UserPromptSubmit',
  'preToolUse', 'PreToolUse', 'postToolUse', 'PostToolUse', 'postToolUseFailure', 'PostToolUseFailure',
  'permissionRequest', 'PermissionRequest', 'agentStop', 'Stop', 'subagentStop', 'SubagentStop',
];

describe('root plugin.json (the manifest Copilot reads ahead of .claude-plugin/)', () => {
  const manifest = readJson('plugin.json');

  it('has a valid Copilot plugin name', () => {
    assert.match(manifest.name, /^[a-z0-9]+(-[a-z0-9]+)*$/);
    assert.ok(manifest.name.length <= 64);
  });

  it('points every component path at something that exists', () => {
    for (const key of ['skills', 'agents', 'hooks']) {
      assert.ok(existsSync(join(root, manifest[key])), `${key} -> ${manifest[key]}`);
    }
  });

  it('declares the same version as the Claude Code manifest and package.json', () => {
    const versions = {
      'plugin.json': manifest.version,
      '.claude-plugin/plugin.json': readJson('.claude-plugin/plugin.json').version,
      'package.json': readJson('package.json').version,
    };
    assert.equal(new Set(Object.values(versions)).size, 1, `versions drifted: ${JSON.stringify(versions)}`);
  });

  it('does not touch what Claude Code reads: its manifest stays where it was, with no Copilot paths', () => {
    const claude = readJson('.claude-plugin/plugin.json');
    assert.equal(claude.hooks, undefined);
    assert.equal(claude.skills, undefined);
  });
});

describe('copilot/hooks.json', () => {
  const config = readJson('copilot/hooks.json');
  const entries = Object.entries(config.hooks).flatMap(([event, list]) => list.map((entry) => ({ event, entry })));

  it('is version 1 and only uses event names Copilot documents', () => {
    assert.equal(config.version, 1);
    for (const event of Object.keys(config.hooks)) assert.ok(DOCUMENTED_EVENTS.includes(event), event);
  });

  it('gives every entry a command for each shell, pointing at a script that exists', () => {
    for (const { event, entry } of entries) {
      for (const field of ['bash', 'powershell', 'command']) {
        const script = /copilot\/([\w-]+\.js)/.exec(entry[field])?.[1];
        assert.ok(script, `${event}.${field} names no script`);
        assert.ok(existsSync(join(root, 'copilot', script)), `${event}.${field} -> copilot/${script}`);
      }
    }
  });

  it('only runs the edit hook for editing tools, under either tool-name vocabulary', () => {
    const { matcher } = config.hooks.PostToolUse[0];
    const matches = (name) => new RegExp(`^(?:${matcher})$`).test(name);
    for (const name of ['Write', 'Edit', 'MultiEdit', 'create', 'edit', 'str_replace_editor', 'apply_patch']) {
      assert.ok(matches(name), `should match ${name}`);
    }
    for (const name of ['Bash', 'bash', 'view', 'Read', 'grep']) {
      assert.ok(!matches(name), `should not match ${name}`);
    }
  });
});

describe('generated skills and agent', () => {
  it('are exactly what the generator would write now — regenerate with scripts/generate-copilot.js if not', () => {
    for (const [relativePath, expected] of buildCopilotFiles(root)) {
      assert.equal(readFileSync(join(root, relativePath), 'utf8'), expected, relativePath);
    }
  });

  it('cover every command template, one skill each, with name matching its directory', () => {
    const skillDirs = readdirSync(join(root, 'copilot', 'skills')).sort();
    const templates = readdirSync(join(root, 'templates', 'commands')).map((f) => f.replace(/\.md$/, '')).sort();
    assert.deepEqual(skillDirs, templates);

    for (const dir of skillDirs) {
      const text = readFileSync(join(root, 'copilot', 'skills', dir, 'SKILL.md'), 'utf8');
      assert.match(text, new RegExp(`^---\\nname: ${dir}\\ndescription: ".+"\\n---`));
    }
  });

  it('leave no unresolved plugin-root placeholder of either host behind', () => {
    for (const relativePath of buildCopilotFiles(root).keys()) {
      const text = readFileSync(join(root, relativePath), 'utf8');
      assert.doesNotMatch(text, /\{\{PRAGMA_ROOT\}\}|\$\{CLAUDE_PLUGIN_ROOT\}/, relativePath);
    }
  });
});

/**
 * The part most likely to be wrong and least visible when it is: the hook command
 * has to find the plugin root. Hosts supply it by environment variable (under
 * which name is not pinned down) or by textually expanding ${CLAUDE_PLUGIN_ROOT}
 * in the command — so run the real command strings under each.
 */
describe('hook commands resolve the plugin root however the host provides it', () => {
  const hook = readJson('copilot/hooks.json').hooks.SessionStart[0];
  const rootPath = root.replaceAll('\\', '/');
  let workspace;

  before(() => {
    workspace = mkdtempSync(join(tmpdir(), 'pragma-copilot-shell-'));
  });
  after(() => rmSync(workspace, { recursive: true, force: true }));

  const payload = () => JSON.stringify({ hook_event_name: 'SessionStart', session_id: 'shell', cwd: workspace });
  const cleanEnv = () => {
    const env = { ...process.env, PRAGMA_STATE_DIR: workspace };
    for (const name of ['PLUGIN_ROOT', 'COPILOT_PLUGIN_ROOT', 'CLAUDE_PLUGIN_ROOT']) delete env[name];
    return env;
  };

  const available = (command, args) => spawnSync(command, args, { encoding: 'utf8' }).status === 0;
  const scenarios = [
    ['PLUGIN_ROOT in the environment', { PLUGIN_ROOT: rootPath }, (c) => c],
    ['COPILOT_PLUGIN_ROOT in the environment', { COPILOT_PLUGIN_ROOT: rootPath }, (c) => c],
    ['CLAUDE_PLUGIN_ROOT in the environment', { CLAUDE_PLUGIN_ROOT: rootPath }, (c) => c],
    ['the host expanding ${CLAUDE_PLUGIN_ROOT} in the command text', {}, (c) => c.replaceAll('${CLAUDE_PLUGIN_ROOT}', rootPath)],
  ];

  for (const [label, env, transform] of scenarios) {
    it(`bash: ${label}`, { skip: !available('sh', ['-c', 'true']) && 'no sh on this machine' }, () => {
      const result = spawnSync('sh', ['-c', transform(hook.bash)], {
        input: payload(), encoding: 'utf8', env: { ...cleanEnv(), ...env },
      });
      assert.equal(result.status, 0, result.stderr);
      assert.match(JSON.parse(result.stdout).additionalContext, /Pragmatic design ladder/);
    });

    it(`powershell: ${label}`, {
      skip: !available('powershell', ['-NoProfile', '-Command', 'exit 0']) && 'no powershell on this machine',
    }, () => {
      const result = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', transform(hook.powershell)], {
        input: payload(), encoding: 'utf8', env: { ...cleanEnv(), ...env },
      });
      assert.equal(result.status, 0, result.stderr);
      assert.match(JSON.parse(result.stdout).additionalContext, /Pragmatic design ladder/);
    });
  }
});
