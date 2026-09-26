# P13 — Stay Safe Out There

Assume two things: **input is untrusted, and failure is inevitable.** That applies to users, APIs,
databases, third-party services, the network, files, queue messages and configuration — every
boundary, not just the public ones.

## Validate at the boundary

Validate once, at the edge, into a trusted shape — then the interior can rely on it.

```ts
const body = OrderSchema.parse(request.body);   // throws on anything unexpected
```

Do not scatter half-checks through the call stack. Do not trust a field because the client sends it
("the UI already validates that").

## Never build a query or command by string concatenation

```ts
// Injection
db.query(`SELECT * FROM users WHERE id = ${id}`);

// Parameterised — the driver keeps data and code separate
db.query("SELECT * FROM users WHERE id = ?", [id]);
```

The same rule holds for shell commands (pass an argument array, never a built string), for file
paths (resolve and confirm the result stays inside the intended directory), for HTML (escape, or let
the framework escape), and for URLs (encode components).

## Authentication and authorisation are different questions

- Authentication: **who are you?**
- Authorisation: **are you allowed to do this, to this object?**

Every handler needs both answers. The common hole is a correctly authenticated user reading another
user's record because the query filtered on the id in the URL and not on the owner.

## Least privilege

Give each component the narrowest permission that works: a read-only database user for a read path,
a bucket-scoped credential rather than account-wide, a token that expires. Narrow the blast radius
of a compromise the same way you narrow the blast radius of a change ([P3 Orthogonality]).

## Secrets

Never hard-code passwords, API keys, private keys or tokens — not in source, not in a committed
`.env`, not in a comment, not in a test fixture, not in a log line. Source them from a secret manager
or the environment ([P6 Configuration]), and rotate anything that has been exposed.

## Fail safe

When configuration is missing or a check cannot be completed, the default must be the restrictive
one: deny, not allow. Errors returned to clients should not leak stack traces, queries or internal
hostnames.

## Checklist

- [ ] Is every external input validated at the boundary, into a typed shape?
- [ ] Is any query, command, path or markup built by concatenation?
- [ ] Does this handler check both who the caller is and whether they own this object?
- [ ] Could any secret reach source control or a log?
- [ ] If this check fails or a setting is missing, does the system deny or allow?

Related: [P6 Configuration], [P15 Design by Contract], [P3 Orthogonality]
