# P11 — Refactoring

Refactoring is changing the internal structure of code **without changing its externally observable
behaviour**. If behaviour changes, it is not a refactor — it is a rewrite, and it needs its own
tests and its own review.

Refactor continuously, in small steps, rather than waiting for a "cleanup sprint" that never comes.

## When to refactor

- You are about to add a feature and the current shape fights you. Make the change easy, then make
  the easy change.
- A name lies about what the thing does.
- You found duplicated knowledge ([P2 DRY]).
- A function has grown past what fits in your head.
- The same conditional on a type keeps appearing in new places.

## The safe process

```
Understand the current behaviour
  -> Make sure tests cover it (write characterisation tests if not)
    -> One small change
      -> Run the tests
        -> One small change
          -> Run the tests
```

Never batch. A refactor that breaks something is only cheap to diagnose if the last green state was
one step ago.

## Techniques

**Extract function.** The most valuable one, most of the time.

```ts
// Before
function processOrder(order: Order) {
  // 100 lines of validation, pricing, inventory, persistence and notification
}

// After: the outline is readable, each step is testable
function processOrder(order: Order) {
  validateOrder(order);
  const price = calculatePrice(order);
  reserveInventory(order);
  const saved = createOrder(order, price);
  publishOrderCreated(saved);
}
```

**Rename.** `x` becomes `retryCount`. Cheap, and it is often the whole fix.

**Extract module/class.** Move a responsibility that drifted in somewhere it does not belong.

**Replace a growing conditional.** When `if (type === "A") ... else if (type === "B") ...` keeps
gaining branches in several places, move the behaviour to the type — a lookup table of handlers, or
polymorphism. Two branches in one place is fine; leave it alone.

**Delete dead code.** Unused exports, commented-out blocks, flags that are always true. Version
control remembers it; your reader should not have to.

## Checklist

- [ ] Is the observable behaviour identical before and after?
- [ ] Do tests cover the behaviour I am about to restructure?
- [ ] Am I taking one step at a time and running tests between?
- [ ] Am I mixing a behaviour change into this refactor? (Split them.)

Related: [P1 Good Design], [P2 DRY], [P12 Test to Code], [P14 Naming]
