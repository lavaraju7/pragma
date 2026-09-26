import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { lines, run } from './helpers.js';

describe('naming/vague-name', () => {
  const id = 'naming/vague-name';

  it('flags names that say nothing', () => {
    assert.deepEqual(lines(run(id, 'const data = await load();')), [1]);
    assert.deepEqual(lines(run(id, 'function doStuff() {}')), [1]);
  });

  it('stays quiet on a name that describes the thing', () => {
    assert.deepEqual(run(id, 'const pendingOrders = await load();'), []);
  });

  it('stays quiet on an event handler named for its event', () => {
    assert.deepEqual(run(id, 'const handleSubmit = () => {};'), []);
  });

  it('stays quiet in test files', () => {
    assert.deepEqual(run(id, 'const data = fixture();', 'tests/order.test.ts'), []);
  });
});

describe('naming/single-letter', () => {
  const id = 'naming/single-letter';

  it('flags a single-letter binding', () => {
    assert.deepEqual(lines(run(id, 'const d = 86400;')), [1]);
  });

  it('stays quiet on a loop counter', () => {
    assert.deepEqual(run(id, 'for (let i = 0; i < xs.length; i += 1) {'), []);
  });

  it('stays quiet on a lambda parameter', () => {
    assert.deepEqual(run(id, 'const ids = users.map((u) => u.id);'), []);
  });
});

describe('naming/boolean-name', () => {
  const id = 'naming/boolean-name';

  it('flags a boolean that does not read as an assertion', () => {
    assert.deepEqual(lines(run(id, 'const admin = user.role === "admin";')), [1]);
  });

  it('stays quiet on a prefixed boolean', () => {
    assert.deepEqual(run(id, 'const isAdmin = user.role === "admin";'), []);
  });

  it('stays quiet on names that already read as assertions', () => {
    assert.deepEqual(run(id, 'const loading = true;'), []);
  });
});

describe('naming/singular-collection', () => {
  const id = 'naming/singular-collection';

  it('flags an array with a singular name', () => {
    assert.deepEqual(lines(run(id, 'const user = rows.map((row) => row.name);')), [1]);
  });

  it('stays quiet on a plural name', () => {
    assert.deepEqual(run(id, 'const users = rows.map((row) => row.name);'), []);
  });

  it('stays quiet on a collective noun', () => {
    assert.deepEqual(run(id, 'const userList = [];'), []);
  });
});

describe('naming/unitless-constant', () => {
  const id = 'naming/unitless-constant';

  it('flags a bare duration', () => {
    assert.deepEqual(lines(run(id, 'const timeout = 30000;')), [1]);
  });

  it('stays quiet when the name carries the unit', () => {
    assert.deepEqual(run(id, 'const timeoutMs = 30000;'), []);
    assert.deepEqual(run(id, 'const secondsPerDay = 86400;'), []);
  });

  it('stays quiet on small numbers that need no unit', () => {
    assert.deepEqual(run(id, 'const retries = 3;'), []);
  });
});
