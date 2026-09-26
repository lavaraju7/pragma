import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { lines, run } from './helpers.js';

describe('dup/repeated-literal', () => {
  const id = 'dup/repeated-literal';

  it('flags a rule repeated three times', () => {
    const source = [
      'if (user.role === "administrator") allow();',
      'if (other.role === "administrator") allow();',
      'if (third.role === "administrator") allow();',
    ].join('\n');
    assert.deepEqual(lines(run(id, source)), [1]);
  });

  it('stays quiet at two occurrences', () => {
    const source = 'if (a.role === "administrator") allow();\nif (b.role === "administrator") allow();';
    assert.deepEqual(run(id, source), []);
  });

  it('stays quiet on repeated import paths', () => {
    const source = [
      'import { a } from "./shared/util.js";',
      'import { b } from "./shared/util.js";',
      'import { c } from "./shared/util.js";',
    ].join('\n');
    assert.deepEqual(run(id, source), []);
  });

  it('stays quiet on common status codes', () => {
    const source = 'res.status(404).end();\nres.status(404).end();\nres.status(404).end();';
    assert.deepEqual(run(id, source), []);
  });

  it('flags a magic number repeated three times', () => {
    const source = 'retry(3000);\nretry(3000);\nretry(3000);';
    assert.deepEqual(lines(run(id, source)), [1]);
  });
});

describe('dup/duplicate-block', () => {
  const id = 'dup/duplicate-block';

  it('flags an identical run of statements', () => {
    const block = [
      'const record = await repo.load(id);',
      'assertOwned(record, actor);',
      'record.touchedAt = now();',
      'await repo.save(record);',
      'audit.write(record.id, actor);',
    ];
    const source = [...block, 'doSomethingElse();', ...block].join('\n');
    assert.deepEqual(lines(run(id, source)), [1]);
  });

  it('stays quiet when the runs differ', () => {
    const source = [
      'const record = await repo.load(id);',
      'assertOwned(record, actor);',
      'record.touchedAt = now();',
      'await repo.save(record);',
      'audit.write(record.id, actor);',
      'const other = await repo.loadDraft(id);',
      'assertDraft(other);',
      'other.submittedAt = now();',
      'await repo.saveDraft(other);',
      'audit.writeDraft(other.id, actor);',
    ].join('\n');
    assert.deepEqual(run(id, source), []);
  });
});
