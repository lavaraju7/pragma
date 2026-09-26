# P5 — Decoupling

Coupling is how much one component must know about another. Decoupling is reducing that knowledge so
components can change independently.

## The kinds of coupling

- **Temporal** — A must run before B. See [P8 Breaking Temporal Coupling].
- **Implementation** — one component knows another's internals: its table layout, its private
  fields, its file format.
- **Data** — components depend on each other's data structures, so a field rename ripples outward.
- **Behavioural** — one component relies on another's undocumented behaviour, like an ordering that
  happens to hold today.

## Smells

- Business logic importing `mysql2`, `ioredis`, `kafkajs` or a cloud SDK directly.
- SQL, table names or column names appearing inside a service or domain object.
- A service constructing its own dependencies (`new PostgresClient(...)`) instead of receiving them.
- One service calling another service's endpoint to do work it could announce and forget.
- Reaching through objects: `order.customer.address.country.code`.

## What to do

**Define the interface the business logic needs, and let infrastructure implement it.**

```ts
interface OrderRepository {
  save(order: Order): Promise<void>;
  findById(id: OrderId): Promise<Order | null>;
}
```

**Inject dependencies** rather than constructing them:

```ts
class OrderService {
  constructor(private readonly orders: OrderRepository) {}
}
```

Now the service is testable with a fake and unaffected by a storage swap.

**Announce facts instead of calling collaborators.** Replace

```
OrderService -> EmailService -> AnalyticsService
```

with

```
OrderService -> OrderCreated event -> Email consumer / Analytics consumer
```

The order flow no longer knows who cares. Adding a third consumer changes nothing upstream.

**Invert the dependency.** High-level policy should not depend on low-level detail; both should
depend on the abstraction. The interface belongs next to the business logic that needs it, not next
to the database code that implements it.

## Checklist

- [ ] Does this business-logic file name any vendor, driver or wire format?
- [ ] Does it build its own dependencies, or receive them?
- [ ] Could I test it with an in-memory fake and no containers?
- [ ] Does it call collaborators directly when announcing an event would do?

Related: [P3 Orthogonality], [P7 Inheritance Tax], [P8 Temporal Coupling]
