# P10 — Algorithm Speed

Know how the cost of your code grows with input size. Not to micro-optimise, but to avoid writing an
accidental quadratic that works fine on the ten rows in dev and falls over on the hundred thousand
in production.

```
O(1)  <  O(log n)  <  O(n)  <  O(n log n)  <  O(n^2)  <  O(2^n)
```

## The common accidental quadratic

```ts
// O(n * m): a linear scan inside a loop
for (const order of orders) {
  const user = users.find((u) => u.id === order.userId);
}

// O(n + m): index once, then look up in constant time
const usersById = new Map(users.map((u) => [u.id, u]));
for (const order of orders) {
  const user = usersById.get(order.userId);
}
```

The same shape hides in `.includes()`, `.filter()`, `.indexOf()` and `.some()` called inside a loop,
and in repeated `array.splice`/`shift` on a large array.

## Smells

- Nested loops over collections that both grow with the data.
- A lookup helper (`find`, `includes`, `filter`) called inside a loop over another collection.
- A query inside a loop — the N+1 problem. One query returning the set beats n queries.
- A `WHERE` or `JOIN` column with no index.
- Recomputing the same derived value on every call when the inputs have not changed.

## What to do

**Know your data structures.** Array for ordered iteration; `Map`/`Set` for membership and lookup by
key; heap for repeated "smallest next"; queue/stack for order of processing. Choosing the right one
usually removes the complexity problem rather than mitigating it.

**Push work to where the index is.** A database with an index on `email` finds a row without
scanning; the same filter in application code cannot.

**Cache genuinely repeated computation** — but only after establishing it is repeated, and with a
clear answer for when the cache is wrong.

**Measure before optimising.** Intuition about hot paths is unreliable. Profile, find the actual
cost, then change that. This is the one place where guessing is a worse sin than doing nothing.

## Checklist

- [ ] What is the complexity of this loop nest in terms of the input?
- [ ] Is there a linear scan inside a loop that a `Map` would make constant?
- [ ] Is there a query inside a loop?
- [ ] Will this still be fine at 100x today's data?
- [ ] If I am optimising, do I have a measurement showing this is the bottleneck?

Related: [P8 Temporal Coupling], [P1 Good Design]
