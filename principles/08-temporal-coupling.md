# P8 — Breaking Temporal Coupling

Temporal coupling is a dependency on *order* — B must run after A — that the problem does not
actually require. It shows up as sequential code that is slower and more fragile than it needs to
be, and as APIs that fail unless called in a particular sequence.

## Smells

- A request handler that creates a user, then creates a profile, then sends a welcome email, then
  generates a report — all before responding. A slow email makes signup slow.
- `await` inside a `for` loop where each iteration is independent of the last.
- A run of consecutive `await`s where no later call uses an earlier result.
- An object that must be used as `initialize()` then `connect()` then `process()`, and silently
  misbehaves otherwise.
- A test that fails when run alone because it depended on another test running first.

## What to do

**Run independent work concurrently.**

```ts
// Before: three round trips, one after another, for no reason
await updateCache(order);
await publishEvent(order);
await writeAudit(order);

// After: one round trip's worth of latency
await Promise.all([
  updateCache(order),
  publishEvent(order),
  writeAudit(order),
]);
```

Keep the sequence when a later step genuinely consumes an earlier result. The test is whether any
later call reads a variable produced by an earlier one.

**Move non-essential work off the request path.** Do what the caller is waiting for, announce what
happened, and return.

```
Create user -> publish UserCreated -> respond
                     |
       email / profile / analytics consumers, independently
```

**Use a queue** when the work must happen but not now, and must survive a crash.

**Remove ordering requirements from APIs.** If `connect()` must happen before `process()`, make
`process()` connect on demand, or make the constructor return an already-usable object. An API that
can only be used correctly in one order will eventually be used in another.

## Checklist

- [ ] Does each `await` consume something from a previous one?
- [ ] Is the caller waiting for work they do not care about?
- [ ] Can this object be misused by calling its methods in the wrong order?
- [ ] Would `Promise.all` change the result, or only the latency?

Related: [P5 Decoupling], [P9 Shared State], [P10 Algorithm Speed]
