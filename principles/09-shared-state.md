# P9 — Shared State Is Incorrect State

Shared mutable state is the main source of concurrency bugs: race conditions, lost updates,
inconsistent reads, deadlocks. The classic shape:

```ts
let balance = 100;

async function withdraw(amount: number) {
  if (balance >= amount) {   // two callers can both pass this check
    balance -= amount;       // ...and both subtract
  }
}
```

Nothing in the language stops two in-flight operations from observing the same value.

## The Node.js caveat

A single JavaScript thread does not save you. Every `await` is a yield point: another request can
run between your read and your write. Interleaving is enough for lost updates — you do not need
parallel threads.

```ts
const current = await store.get(key);   // request A reads
                                        // request B reads the same value, updates, writes
await store.set(key, current + 1);      // request A overwrites B's write
```

## Smells

- Module-level `let` or `var` that is reassigned at runtime.
- Writes to `global` or `globalThis`.
- A read-modify-write sequence with an `await` between the read and the write.
- A cache or counter mutated from several modules.
- Mutable objects handed out by a getter, so any caller can change internal state.

## What to do

**Minimise mutable state.** Prefer `const` and values that are computed rather than accumulated.

**Own state in one place.** Expose operations, not the data. If only one module can mutate a thing,
the rules for mutating it live in one place.

**Use atomic operations** instead of read-modify-write:

```ts
await redis.incr(key);            // atomic
// not: const n = await redis.get(key); await redis.set(key, n + 1);
```

**Use transactions** when several changes must succeed or fail together, and let the database
enforce the invariant (a `CHECK` constraint, a unique index) rather than application code that races.

**Lock only when coordination is genuinely required**, and keep the critical section short.

**Pass messages instead of sharing memory.** A queue between two components removes the shared
mutable state entirely.

## Checklist

- [ ] Is there an `await` between this read and its dependent write?
- [ ] Who else can mutate this value?
- [ ] Could the database enforce this invariant instead of my code?
- [ ] Is there an atomic primitive for what I am doing by hand?

Related: [P3 Orthogonality], [P8 Temporal Coupling], [P4 Debugging]
