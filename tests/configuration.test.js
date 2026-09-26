import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { lines, run } from './helpers.js';

describe('config/hardcoded-endpoint', () => {
  const id = 'config/hardcoded-endpoint';

  it('flags a production connection string', () => {
    const source = 'const redis = new Redis("redis://prod-server:6379");';
    assert.deepEqual(lines(run(id, source)), [1]);
  });

  it('flags a hardcoded API base URL', () => {
    const source = 'const base = "https://api.payments.internal/v2";';
    assert.deepEqual(lines(run(id, source)), [1]);
  });

  it('stays quiet inside the config module, which is where endpoints belong', () => {
    const source = 'const base = "https://api.payments.internal/v2";';
    assert.deepEqual(run(id, source, 'src/config/index.ts'), []);
  });

  it('stays quiet on localhost', () => {
    const source = 'const base = "http://localhost:3000";';
    assert.deepEqual(run(id, source), []);
  });

  it('stays quiet on reserved example domains and specification URLs', () => {
    const source = 'const docs = "https://example.com/docs";\nconst ns = "http://www.w3.org/2000/svg";';
    assert.deepEqual(run(id, source), []);
  });

  it('stays quiet when the URL is only mentioned in a comment', () => {
    const source = '// see https://api.payments.internal/v2 for the contract';
    assert.deepEqual(run(id, source), []);
  });

  it('stays quiet when the value already comes from config', () => {
    const source = 'const redis = new Redis(config.redis.url);';
    assert.deepEqual(run(id, source), []);
  });
});

describe('config/direct-env', () => {
  const id = 'config/direct-env';

  it('flags a direct environment read in business logic', () => {
    const source = 'const timeout = Number(process.env.ORDER_TIMEOUT_MS);';
    assert.deepEqual(lines(run(id, source)), [1]);
  });

  it('flags bracket access and os.environ', () => {
    assert.deepEqual(lines(run(id, 'const url = process.env["REDIS_URL"];')), [1]);
    assert.deepEqual(lines(run(id, 'url = os.environ["REDIS_URL"]', 'app/services/cache.py')), [1]);
  });

  it('stays quiet in the config module', () => {
    const source = 'const url = process.env.REDIS_URL;';
    assert.deepEqual(run(id, source, 'src/config/env.ts'), []);
  });

  it('stays quiet on NODE_ENV, which is idiomatic everywhere', () => {
    const source = 'if (process.env.NODE_ENV === "production") enableCache();';
    assert.deepEqual(run(id, source), []);
  });

  it('stays quiet when reading from a parsed config object', () => {
    const source = 'const timeout = config.order.timeoutMs;';
    assert.deepEqual(run(id, source), []);
  });
});
