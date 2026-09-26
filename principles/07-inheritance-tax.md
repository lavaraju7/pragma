# P7 — The Inheritance Tax

Inheritance is a coupling mechanism, not a code-reuse mechanism. A subclass depends on its parent's
internals, and inherits behaviour it may not want. That is the tax.

## The costs

**Fragile base class.** A change to `BaseService` can break `ServiceA`, `ServiceB` and `ServiceC` in
ways none of their authors anticipated, because subclasses depend on *how* the parent works, not
only on what it promises.

**Deep hierarchies.** `A -> B -> C -> D -> E` means reading five files to understand one method, and
nobody can say where a given behaviour comes from.

**Wrong abstraction.** Two things sharing some fields is not an is-a relationship. Inheriting to
avoid retyping twenty lines buys reuse and pays with permanent coupling.

## Smells

- A base class whose only purpose is to hold shared helpers.
- A subclass that overrides nothing — it is using inheritance purely for reuse.
- A subclass that overrides a method to throw "not supported" — the contract does not actually fit.
- Hierarchy depth beyond two levels.
- `protected` fields the parent expects children to maintain correctly.

## What to do

**Compose.** Give the object what it needs instead of making it a kind of something else.

```ts
// Before: EmailNotification is-a Notification, and inherits everything Notification does
class EmailNotification extends Notification {}

// After: NotificationService has-a sender, and knows nothing about how sending works
class NotificationService {
  constructor(private readonly sender: MessageSender) {}
}
```

**Use interfaces for contracts.** An interface says what a thing promises without dictating how it
is built, and one class can satisfy several.

**Keep hierarchies shallow** when you do inherit — one level, ideally.

**Reserve inheritance for genuine substitutability.** If every subclass can stand in for the parent
everywhere the parent is used, without callers checking which one they have, inheritance is earning
its keep. Otherwise it is not.

## Checklist

- [ ] Is this an is-a relationship, or did I just want the parent's methods?
- [ ] Can every subclass honestly substitute for the parent?
- [ ] How deep is this hierarchy?
- [ ] Would a constructor parameter do what this base class is doing?

Related: [P5 Decoupling], [P3 Orthogonality], [P15 Design by Contract]
