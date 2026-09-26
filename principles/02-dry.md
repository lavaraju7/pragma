# P2 — Don't Repeat Yourself

DRY is not "never write the same line twice". It is: **every piece of knowledge has one
authoritative representation in the system.** The test is not "does this look the same?" but "if
this fact changes, how many places must I edit?"

## The two kinds of duplication

**Code duplication** — the same implementation copied. Annoying, usually easy to spot.

**Knowledge duplication** — the dangerous kind. The same *fact* independently encoded in several
places:

```
Maximum retry count = 3
  Service A -> 3
  Service B -> 3
  Frontend  -> 3
  Runbook   -> "we retry three times"
```

Nothing looks duplicated. Change the policy to 5 and three of the four go stale.

## Smells

- A literal condition like `user.role === "admin"` appearing in many files. The *definition* of an
  administrator is knowledge; it belongs in one function.
- The same magic number or string in three or more places.
- Validation rules restated in the client, the API layer and the database.
- A type or shape hand-written on both sides of a boundary instead of shared or generated.
- Business rules living both in application code and in a database trigger or stored procedure.

## What to do

```ts
// Before: the definition of "admin" is scattered across 20 call sites
if (user.role === "admin") { /* ... */ }

// After: one authoritative representation
export function isAdmin(user: User): boolean {
  return user.role === "admin";
}
```

Centralise business rules. Share types and schemas across boundaries rather than restating them.
Define configuration once (see [P6 Configuration]). Generate code from a single source when the
alternative is hand-syncing two representations.

## The counter-rule, which matters as much

**Do not create an abstraction just because two pieces of code look similar.** If `processPayment`
and `processRefund` currently read alike but change for different reasons, merging them creates a
shared thing that both sides fight over — and the next change adds a boolean flag, then another.

Coincidental similarity is not duplicated knowledge. Wait for the third occurrence, and merge only
when the two really do encode the same fact.

## Checklist

- [ ] If this fact changes, is there exactly one place to edit?
- [ ] Am I merging these because they mean the same thing, or because they look the same?
- [ ] Is this constant defined anywhere else in the system, including in docs or config?
- [ ] Do both sides of this boundary derive their shape from one schema?

Related: [P1 Good Design], [P6 Configuration], [P11 Refactoring]
