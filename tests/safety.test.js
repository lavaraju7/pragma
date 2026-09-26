import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { lines, run } from './helpers.js';

describe('safety/sql-interpolation', () => {
  const id = 'safety/sql-interpolation';

  it('flags a template literal query that interpolates a value', () => {
    const source = 'const row = await db.query(`SELECT * FROM users WHERE id = ${id}`);';
    assert.deepEqual(lines(run(id, source)), [1]);
  });

  it('flags a Python f-string query', () => {
    const source = 'cursor.execute(f"DELETE FROM orders WHERE id = {order_id}")';
    assert.deepEqual(lines(run(id, source, 'app/services/orders.py')), [1]);
  });

  it('stays quiet on a parameterised query', () => {
    const source = 'const row = await db.query("SELECT * FROM users WHERE id = ?", [id]);';
    assert.deepEqual(run(id, source), []);
  });

  it('stays quiet on a template literal with no interpolation', () => {
    const source = 'const sql = `SELECT id, email FROM users`;';
    assert.deepEqual(run(id, source), []);
  });

  it('stays quiet on an interpolated string that is not SQL', () => {
    const source = 'const label = `Order ${order.id} was updated`;';
    assert.deepEqual(run(id, source), []);
  });
});

describe('safety/sql-concatenation', () => {
  const id = 'safety/sql-concatenation';

  it('flags a query concatenated with a variable', () => {
    const source = 'const sql = "SELECT * FROM users WHERE id = " + userId;';
    assert.deepEqual(lines(run(id, source)), [1]);
  });

  it('flags a clause appended to a query', () => {
    const source = 'query += " AND status = " + status;';
    assert.deepEqual(lines(run(id, source)), [1]);
  });

  it('stays quiet on ordinary string concatenation', () => {
    const source = 'const greeting = "Hello, " + user.name;';
    assert.deepEqual(run(id, source), []);
  });

  it('stays quiet on prose that happens to start a fragment with "and"', () => {
    const source = 'message += " and one more thing";';
    assert.deepEqual(run(id, source), []);
  });

  it('stays quiet on a SQL string with no concatenation', () => {
    const source = 'const sql = "SELECT * FROM users WHERE id = ?";';
    assert.deepEqual(run(id, source), []);
  });
});

describe('safety/shell-interpolation', () => {
  const id = 'safety/shell-interpolation';

  it('flags an interpolated shell command', () => {
    const source = 'execSync(`git checkout ${branch}`);';
    assert.deepEqual(lines(run(id, source)), [1]);
  });

  it('flags a concatenated os.system call', () => {
    const source = 'os.system("rm -rf " + target)';
    assert.deepEqual(lines(run(id, source, 'app/services/clean.py')), [1]);
  });

  it('stays quiet when arguments are passed as an array', () => {
    const source = 'execFile("git", ["checkout", branch]);';
    assert.deepEqual(run(id, source), []);
  });
});

describe('safety/dynamic-eval', () => {
  const id = 'safety/dynamic-eval';

  it('flags eval', () => {
    assert.deepEqual(lines(run(id, 'const value = eval(expression);')), [1]);
  });

  it('flags the Function constructor', () => {
    assert.deepEqual(lines(run(id, 'const fn = new Function("a", "return a");')), [1]);
  });

  it('stays quiet on a method named eval on an object', () => {
    assert.deepEqual(run(id, 'const value = parser.eval(expression);'), []);
  });

  it('stays quiet on a commented-out eval', () => {
    assert.deepEqual(run(id, '// eval(expression) was removed'), []);
  });
});

describe('safety/hardcoded-secret', () => {
  const id = 'safety/hardcoded-secret';

  it('flags an API key literal', () => {
    // Deliberately not shaped like any real provider's key: a fixture that matches
    // a live-credential pattern trips secret scanners on every push.
    const source = 'const apiKey = "a1b2c3d4e5f6a7b8c9d0";';
    assert.deepEqual(lines(run(id, source)), [1]);
  });

  it('flags a password in an options object', () => {
    const source = 'const options = {\n  user: "app",\n  password: "hunter2hunter2",\n};';
    assert.deepEqual(lines(run(id, source)), [3]);
  });

  it('stays quiet when the value comes from the environment', () => {
    const source = 'const apiKey = process.env.STRIPE_API_KEY;';
    assert.deepEqual(run(id, source), []);
  });

  it('stays quiet on an obvious placeholder', () => {
    const source = 'const apiKey = "your-api-key-here";';
    assert.deepEqual(run(id, source), []);
  });

  it('stays quiet in test files, where fake credentials are expected', () => {
    const source = 'const password = "hunter2hunter2";';
    assert.deepEqual(run(id, source, 'tests/auth.test.ts'), []);
  });

  it('stays quiet on a prose message that merely mentions a token', () => {
    const source = 'const tokenMessage = "your token has expired";';
    assert.deepEqual(run(id, source), []);
  });
});

describe('safety/path-from-input', () => {
  const id = 'safety/path-from-input';

  it('flags a path joined from request input', () => {
    const source = 'const file = path.join(uploadDir, req.params.filename);';
    assert.deepEqual(lines(run(id, source)), [1]);
  });

  it('stays quiet on a path built from constants', () => {
    const source = 'const file = path.join(uploadDir, "manifest.json");';
    assert.deepEqual(run(id, source), []);
  });

  it('stays quiet when request input is used without touching the filesystem', () => {
    const source = 'const name = req.params.filename;';
    assert.deepEqual(run(id, source), []);
  });
});
