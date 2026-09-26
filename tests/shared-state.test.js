import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { lines, run } from './helpers.js';

describe('state/module-mutable', () => {
  const id = 'state/module-mutable';

  it('flags a module-level binding that is reassigned', () => {
    const source = [
      'let balance = 100;',
      '',
      'export function withdraw(amount) {',
      '  balance -= amount;',
      '}',
    ].join('\n');
    assert.deepEqual(lines(run(id, source)), [1]);
  });

  it('stays quiet on a module-level constant', () => {
    const source = 'const maxRetryAttempts = 3;\nexport function retry() { return maxRetryAttempts; }';
    assert.deepEqual(run(id, source), []);
  });

  it('stays quiet on a let that is never reassigned', () => {
    const source = 'let cachedConfig = loadConfig();\nexport const get = () => cachedConfig;';
    assert.deepEqual(run(id, source), []);
  });

  it('stays quiet on a local let inside a function', () => {
    const source = 'function total(xs) {\n  let sum = 0;\n  for (const x of xs) sum += x;\n  return sum;\n}';
    assert.deepEqual(run(id, source), []);
  });

  it('stays quiet on the standard node:test before()/after() fixture pattern', () => {
    const source = [
      'let workspace;',
      '',
      "before(() => { workspace = mkdtempSync('x'); });",
      "after(() => { rmSync(workspace); });",
    ].join('\n');
    assert.deepEqual(run(id, source, 'tests/hooks.test.js'), []);
  });
});

describe('state/global-write', () => {
  const id = 'state/global-write';

  it('flags a write to globalThis', () => {
    assert.deepEqual(lines(run(id, 'globalThis.cache = new Map();')), [1]);
  });

  it('stays quiet on a read from globalThis', () => {
    assert.deepEqual(run(id, 'const cache = globalThis.cache;'), []);
  });
});

describe('state/read-modify-write', () => {
  const id = 'state/read-modify-write';

  it('flags a counter incremented across an await', () => {
    const source = [
      'async function bump(key) {',
      '  const current = await store.get(key);',
      '  await store.set(key, current + 1);',
      '}',
    ].join('\n');
    assert.deepEqual(lines(run(id, source)), [3]);
  });

  it('stays quiet on an atomic increment', () => {
    const source = 'async function bump(key) {\n  await redis.incr(key);\n}';
    assert.deepEqual(run(id, source), []);
  });

  it('stays quiet when the read value is only returned', () => {
    const source = 'async function read(key) {\n  const current = await store.get(key);\n  return current;\n}';
    assert.deepEqual(run(id, source), []);
  });
});
