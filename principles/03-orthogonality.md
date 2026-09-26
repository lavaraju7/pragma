# P3 — Orthogonality

Two components are orthogonal when changing one has little or no effect on the other. The practical
question: **"if I change X, how many unrelated things could break?"** Fewer is better. Orthogonality
is about minimising the blast radius of a change.

## Smells

- A chain where everything is wired to everything: payment calls the database which calls email
  which calls the logger, so touching persistence can break notifications.
- Global mutable state — a hidden dependency between every module that reads or writes it.
- A function that returns a value *and* writes to the database *and* sends an email *and* publishes
  an event. Callers cannot use one effect without the others.
- Wide public surfaces: a module exporting thirty things of which consumers use three.
- Tests for one component that must stand up three other components to run.

## What to do

**Separate responsibilities.** Authentication, authorisation, payment, notification and persistence
are five concerns, not one service.

**Reduce global state.** Pass dependencies in; do not reach out to module-level singletons.

**Depend on interfaces, not implementations.**

```ts
interface UserRepository {
  findById(id: UserId): Promise<User | null>;
}
// Business logic works the same against Postgres, Mongo, Redis or an in-memory fake.
```

**Minimise side effects.** Prefer a function that computes and returns:

```ts
const price = calculatePrice(order);   // pure: easy to test, safe to call twice
```

over one that silently mutates a row, warms a cache, publishes an event and also returns a number.
When effects are needed, make them explicit and separate from the calculation.

**Keep APIs narrow.** Export what consumers need; keep the rest internal.

## The test

Pick a likely change — swapping the queue, adding a currency, changing the retry policy. Trace what
it touches. If the list includes modules that have nothing to do with the change, the design is not
orthogonal.

## Checklist

- [ ] If I change this module, what else could break, and is that list surprising?
- [ ] Does this function do one thing, or compute *and* mutate *and* notify?
- [ ] Can I test this without standing up infrastructure?
- [ ] Is there hidden coupling through global or module-level mutable state?

Related: [P1 Good Design], [P5 Decoupling], [P9 Shared State]
