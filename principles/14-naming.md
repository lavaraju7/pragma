# P14 — Naming Things

Names are the primary way programmers communicate intent. Code is read far more often than it is
written, and a name is read every single time.

```ts
const x = 10;                 // ten what?
const maxRetryAttempts = 10;  // now the reader knows the rule
```

## Name the intent, not the mechanism

```ts
const d = 86400;              // a number
const secondsPerDay = 86400;  // a fact, with its unit
```

Include the unit when there is one: `timeoutMs`, `sizeBytes`, `priceInCents`, `delaySeconds`. Unit
confusion is a real and expensive bug class.

## Functions describe actions

```
calculateTotal()   validateUser()   publishEvent()   reserveInventory()
```

not `doStuff()`, `process()`, `handle()`, `manage()` or `execute()` — these describe that something
happens, not what. The same applies to nouns: `data`, `info`, `temp`, `obj`, `result`, `manager`,
`helper` and `util` tell the reader nothing.

`handleX` is fine when the thing really is an event handler for X. `process` as a bare name is not.

## Booleans read as assertions

```
isActive   hasPermission   canRetry   shouldPublish   wasDeleted
```

A boolean named `status`, `flag` or `check` forces the reader to find its definition. And avoid
negatives: `isDisabled` makes `!isDisabled` a double negative at every call site.

## Collections are plural

```ts
const users = await repo.findAll();   // not `user`
const userIds = new Set<string>();    // not `userId`
```

A singular name holding many things misleads every reader, including you in three months.

## Be consistent

Pick one vocabulary per concept and keep it:

```
createdAt / updatedAt / deletedAt        consistent
creationDate / lastModified / deletionTime   the same three ideas, three conventions
```

The same goes for `fetch` vs `get` vs `load` vs `retrieve`, and for `id` vs `Id` vs `ID`. Match what
the surrounding file already does, even where you would have chosen differently.

## Avoid names that lie

A `getUser()` that also creates one. A `validate()` that mutates. A `cache` that is not a cache. A
misleading name is worse than a vague one, because the reader stops reading.

## Checklist

- [ ] Does this name say what it is, or what I was thinking about while writing it?
- [ ] Does the name carry the unit, if there is one?
- [ ] Does this boolean read as an assertion?
- [ ] Is this collection plural?
- [ ] Does it match the vocabulary already used in this file?
- [ ] Could the name mislead someone who does not read the body?

Related: [P11 Refactoring], [P1 Good Design]
