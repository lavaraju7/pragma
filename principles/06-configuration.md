# P6 — Configuration

Configuration is everything that can change without changing the program's logic: hosts, URLs,
ports, credentials, timeouts, limits, retry counts, log levels, feature flags. It must be able to
vary independently from the code.

## Smells

- A connection string, hostname, port or URL as a literal in application code.
- An API key, token or password committed to the repository in any form.
- `process.env.SOMETHING` read directly in hundreds of files, each with its own default and its own
  spelling.
- Configuration validated lazily, so a missing variable surfaces as a 500 at 3am rather than at
  startup.
- The same tunable defined separately per service — that is knowledge duplication ([P2 DRY]).

## What to do

**Externalise.**

```ts
// Before
const redis = new Redis("redis://prod-server:6379");

// After
const redis = new Redis(config.redis.url);
```

**Centralise.** One module parses the environment and exports a typed object. The rest of the code
reads `config.redis.url`, never `process.env.REDIS_URL`. That gives you one place to see every
tunable, one place to change a default, and one place to validate.

```ts
// config.ts — the only file in the codebase that touches process.env
export const config = parseConfig(process.env);
```

**Validate at startup, and fail loudly.**

```ts
function parseConfig(env: NodeJS.ProcessEnv): Config {
  const url = env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL is required");
  return { redis: { url }, ... };
}
```

A misconfigured process should refuse to start, not serve traffic badly.

**Separate secrets from ordinary configuration.** `DATABASE_HOST` is configuration and belongs in a
config file or environment. `DATABASE_PASSWORD` is a secret and belongs in a secret manager. Commit
a `.env.example` listing the *names*, never the values.

**Choose safe defaults.** When an optional setting is missing, default to the restrictive behaviour:
auth on, debug off, verbose logging off, permissive CORS off.

## Checklist

- [ ] Could this value differ between dev, staging and production? Then it is configuration.
- [ ] Is there exactly one module that reads the environment?
- [ ] Does the process fail at startup if a required setting is absent or malformed?
- [ ] Are secrets sourced from a secret store rather than from the repository?
- [ ] Is the default for a missing setting the safe one?

Related: [P2 DRY], [P13 Stay Safe], [P15 Design by Contract]
