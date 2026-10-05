import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import { normalizeArgs, pathFromArgs, pathsFromToolCall } from '../hooks/lib/tool-paths.js';

const cwd = resolve('/work/repo');

describe('pathFromArgs', () => {
  it('finds the path under each plausible key', () => {
    for (const key of ['file_path', 'path', 'filePath', 'target_file', 'targetFile', 'AbsolutePath']) {
      assert.equal(pathFromArgs({ [key]: 'a.ts' }), 'a.ts', key);
    }
  });

  it('returns nothing for a call that is not a file edit', () => {
    assert.equal(pathFromArgs({ command: 'ls' }), undefined);
    assert.equal(pathFromArgs(undefined), undefined);
  });
});

describe('normalizeArgs', () => {
  it('accepts arguments given as a JSON string', () => {
    assert.deepEqual(normalizeArgs('{"path":"a.ts"}'), { path: 'a.ts' });
  });

  it('degrades to an empty object rather than throwing on garbage', () => {
    assert.deepEqual(normalizeArgs('{ not json'), {});
    assert.deepEqual(normalizeArgs('42'), {});
    assert.deepEqual(normalizeArgs(null), {});
  });
});

describe('pathsFromToolCall', () => {
  it('resolves a relative path against the session cwd', () => {
    assert.deepEqual(pathsFromToolCall({ path: 'src/a.ts' }, cwd), [resolve(cwd, 'src/a.ts')]);
  });

  it('leaves an absolute path alone', () => {
    const absolute = resolve('/elsewhere/b.ts');
    assert.deepEqual(pathsFromToolCall({ path: absolute }, cwd), [absolute]);
  });

  it('reads every file out of a patch-style call that has no path argument', () => {
    const patch = [
      '*** Begin Patch',
      '*** Update File: src/a.ts',
      '@@',
      '-old',
      '+new',
      '*** Add File: src/b.ts',
      '+content',
      '*** Delete File: src/gone.ts',
      '*** End Patch',
    ].join('\n');
    assert.deepEqual(pathsFromToolCall({ input: patch }, cwd), [
      resolve(cwd, 'src/a.ts'),
      resolve(cwd, 'src/b.ts'),
    ]);
  });

  it('works when the whole argument object arrives as a JSON string', () => {
    assert.deepEqual(pathsFromToolCall('{"path":"src/a.ts"}', cwd), [resolve(cwd, 'src/a.ts')]);
  });

  it('does not report the same file twice', () => {
    const patch = '*** Begin Patch\n*** Update File: src/a.ts\n*** End Patch';
    assert.deepEqual(pathsFromToolCall({ path: 'src/a.ts', input: patch }, cwd), [resolve(cwd, 'src/a.ts')]);
  });

  it('returns nothing for a shell call', () => {
    assert.deepEqual(pathsFromToolCall({ command: 'npm test' }, cwd), []);
  });
});
