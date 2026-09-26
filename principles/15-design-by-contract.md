# P15 — Design by Contract

A component has an explicit agreement with its callers. State it, and enforce it.

- **Preconditions** — what must be true before the call. The caller's obligation.
- **Postconditions** — what the component guarantees afterwards. Its obligation.
- **Invariants** — what is true before and after, always.

```
withdraw(amount)
  precondition:   amount > 0, account exists, amount <= availableBalance
  postcondition:  balanceAfter === balanceBefore - amount, a transaction is recorded
  invariant:      balance >= 0
```

Write those three lines before the implementation. They usually reveal a case you had not thought
about.

## Enforce preconditions with guards, at the top

```ts
export function withdraw(account: Account, amount: Money): Account {
  if (amount.value <= 0) throw new InvalidAmountError("amount must be positive");
  if (amount.currency !== account.currency) throw new CurrencyMismatchError();
  // the rest of the function can now rely on both
}
```

Guard clauses beat nesting: they keep the happy path unindented and put each rule next to its reason.

## Let the type system carry what it can

```ts
type OrderStatus = "PENDING" | "PAID" | "CANCELLED";   // not `string`
```

A contract a type enforces cannot be forgotten at a call site. Prefer narrow unions to strings,
branded ids to bare strings (`UserId` rather than `string`, so a user id cannot be passed where an
order id belongs), and required fields to optional ones with defaults scattered around.

## Validate at boundaries with a schema

Every external input — request body, queue message, config, third-party response — crosses into your
system through a schema that produces a typed value or fails.

```ts
const order = OrderSchema.parse(message.value);
```

Zod, JSON Schema, OpenAPI, Joi or class-validator all do this. The important part is that the
untrusted shape never travels past the boundary. See [P13 Stay Safe].

## Assert invariants you believe are impossible to violate

```ts
if (order.status !== "PAID") {
  throw new Error(`invariant: shipping an order in status ${order.status}`);
}
```

An assertion that never fires costs nothing. One that fires has saved you a silent corruption.

## Contracts between services

An API contract — OpenAPI, GraphQL schema, protobuf — states request shape, response shape, required
fields and error cases. Version it, and test both sides against it ([P12 Test to Code]).

## Checklist

- [ ] What must be true before this runs? Is it checked, or hoped for?
- [ ] What does this guarantee on return, including on the error path?
- [ ] What must always be true, and what enforces it?
- [ ] Could a type express this rule instead of a runtime check?
- [ ] Does untrusted data reach the interior without passing a schema?

Related: [P13 Stay Safe], [P6 Configuration], [P12 Test to Code], [P5 Decoupling]
