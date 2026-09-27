import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { lines, run } from './helpers.js';

describe('coupling/await-in-loop', () => {
  const id = 'coupling/await-in-loop';

  it('flags an await inside a for loop', () => {
    const source = [
      'for (const order of orders) {',
      '  await notify(order);',
      '}',
    ].join('\n');
    assert.deepEqual(lines(run(id, source)), [2]);
  });

  it('stays quiet on Promise.all over the same work', () => {
    const source = 'await Promise.all(orders.map((order) => notify(order)));';
    assert.deepEqual(run(id, source), []);
  });

  it('reports an await inside nested loops once, not once per enclosing loop', () => {
    const source = [
      'for (const group of groups) {',
      '  for (const order of group.orders) {',
      '    await notify(order);',
      '  }',
      '}',
    ].join('\n');
    assert.deepEqual(lines(run(id, source)), [3]);
  });

  it('stays quiet on a loop with no await', () => {
    const source = 'for (const order of orders) {\n  total += order.amount;\n}';
    assert.deepEqual(run(id, source), []);
  });
});

describe('coupling/sequential-awaits', () => {
  const id = 'coupling/sequential-awaits';

  it('flags consecutive awaits whose results nothing uses', () => {
    const source = [
      'await updateCache(order);',
      'await publishEvent(order);',
      'await writeAudit(order);',
    ].join('\n');
    assert.deepEqual(lines(run(id, source)), [1]);
  });

  it('stays quiet when each await feeds the next', () => {
    const source = [
      'const user = await findUser(id);',
      'const orders = await findOrders(user.id);',
      'const total = await sumOrders(orders);',
    ].join('\n');
    assert.deepEqual(run(id, source), []);
  });

  it('stays quiet on a single await', () => {
    assert.deepEqual(run(id, 'await publishEvent(order);'), []);
  });
});

describe('coupling/infrastructure-import', () => {
  const id = 'coupling/infrastructure-import';

  it('flags a driver imported into a service', () => {
    const source = 'import Redis from "ioredis";';
    assert.deepEqual(lines(run(id, source, 'src/services/order.ts')), [1]);
  });

  it('stays quiet in the infrastructure layer, where the driver belongs', () => {
    const source = 'import Redis from "ioredis";';
    assert.deepEqual(run(id, source, 'src/infrastructure/cache.ts'), []);
  });

  it('stays quiet when the service depends on its own interface', () => {
    const source = 'import type { OrderRepository } from "./order-repository.js";';
    assert.deepEqual(run(id, source, 'src/services/order.ts'), []);
  });
});

describe('coupling/inheritance-for-reuse', () => {
  const id = 'coupling/inheritance-for-reuse';

  it('flags a subclass that overrides nothing', () => {
    const source = [
      'class EmailNotification extends Notification {',
      '  constructor(sender) {',
      '    super(sender);',
      '  }',
      '}',
    ].join('\n');
    assert.deepEqual(lines(run(id, source)), [1]);
  });

  it('stays quiet when the subclass overrides behaviour', () => {
    const source = [
      'class EmailNotification extends Notification {',
      '  send(message) {',
      '    return this.transport.deliver(message);',
      '  }',
      '}',
    ].join('\n');
    assert.deepEqual(run(id, source), []);
  });

  it('stays quiet on a class that extends nothing', () => {
    const source = 'class NotificationService {\n  constructor(sender) {\n    this.sender = sender;\n  }\n}';
    assert.deepEqual(run(id, source), []);
  });
});
