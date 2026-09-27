import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { lines, run } from './helpers.js';

describe('complexity/long-function', () => {
  const id = 'complexity/long-function';

  it('flags a function past the line budget', () => {
    const body = Array.from({ length: 60 }, (_, i) => `  doStep${i}();`).join('\n');
    const source = `function processOrder() {\n${body}\n}`;
    assert.deepEqual(lines(run(id, source)), [1]);
  });

  it('stays quiet on a short function', () => {
    const source = 'function total(order) {\n  return order.lines.reduce(sum, 0);\n}';
    assert.deepEqual(run(id, source), []);
  });
});

describe('complexity/too-many-parameters', () => {
  const id = 'complexity/too-many-parameters';

  it('flags a long parameter list', () => {
    const source = 'function createOrder(userId, items, address, coupon, currency, notes) {}';
    assert.deepEqual(lines(run(id, source)), [1]);
  });

  it('stays quiet at four parameters', () => {
    const source = 'function createOrder(userId, items, address, currency) {}';
    assert.deepEqual(run(id, source), []);
  });

  it('stays quiet when related parameters are grouped into an object', () => {
    const source = 'function createOrder(request) {}';
    assert.deepEqual(run(id, source), []);
  });
});

describe('complexity/deep-nesting', () => {
  const id = 'complexity/deep-nesting';

  it('flags deeply nested code', () => {
    const source = [
      'function run(orders) {',
      '  for (const order of orders) {',
      '    if (order.paid) {',
      '      for (const line of order.lines) {',
      '        if (line.taxable) {',
      '          apply(line);',
      '        }',
      '      }',
      '    }',
      '  }',
      '}',
    ].join('\n');
    assert.deepEqual(lines(run(id, source)), [6]);
  });

  it('stays quiet on flat code with guard clauses', () => {
    const source = [
      'function run(order) {',
      '  if (!order.paid) return;',
      '  apply(order);',
      '}',
    ].join('\n');
    assert.deepEqual(run(id, source), []);
  });
});

describe('complexity/lookup-in-loop', () => {
  const id = 'complexity/lookup-in-loop';

  it('flags a linear scan inside a loop', () => {
    const source = [
      'for (const order of orders) {',
      '  const user = users.find((u) => u.id === order.userId);',
      '}',
    ].join('\n');
    assert.deepEqual(lines(run(id, source)), [2]);
  });

  it('stays quiet when the collection is indexed first', () => {
    const source = [
      'const usersById = new Map(users.map((u) => [u.id, u]));',
      'for (const order of orders) {',
      '  const user = usersById.get(order.userId);',
      '}',
    ].join('\n');
    assert.deepEqual(run(id, source), []);
  });

  it('reports a scan inside nested loops once, not once per enclosing loop', () => {
    const source = [
      'for (const group of groups) {',
      '  for (const order of group.orders) {',
      '    const user = users.find((u) => u.id === order.userId);',
      '  }',
      '}',
    ].join('\n');
    assert.deepEqual(lines(run(id, source)), [3]);
  });
});
