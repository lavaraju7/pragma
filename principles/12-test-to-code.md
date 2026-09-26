# P12 — Test to Code

Tests are not only verification after the fact — they are **design feedback**. If something is hard
to test, the test is telling you something about the code:

| Hard to test because | The design problem |
|---|---|
| Needs six things constructed first | Too many dependencies |
| Needs a database and a queue to assert one calculation | Tight coupling to infrastructure |
| Passes alone but fails in a suite | Hidden or shared state |
| Needs the same setup for unrelated assertions | Too many responsibilities |
| You cannot get at the behaviour without mocking internals | The interface is wrong |

Listen to that before working around it with more mocks.

## The shape of a test suite

```
       E2E          few — slow, broad, brittle
   Integration      some — real boundaries, real serialisation
      Unit          many — fast, focused, run on every save
```

**Unit** — one behaviour in isolation: `calculateTax()` given these inputs returns this.
**Integration** — components together across a real boundary: API to service to database.
**Contract** — the interface between services stays compatible, checked from both sides.

## Test behaviour, not implementation

```
Good:  "when payment fails, the order stays pending"
Weak:  "the service calls repository.save exactly once"
```

The second breaks on every refactor and passes when the behaviour is wrong. Assert on call counts
only when the interaction *is* the contract (exactly-once delivery, no duplicate charge).

## Cover the edges, not only the happy path

Valid input is the case least likely to break. Also test: `null` and `undefined`, empty collections,
a single element, duplicates, values at and just past the boundary, oversized input, wrong types,
concurrent calls, timeouts, and the dependency failing.

## Rules worth keeping

- New behaviour ships with a test in the same change.
- A bug fix ships with a test that **failed before the fix** ([P4 Debugging]).
- A test with no assertion is not a test.
- If a test needs a comment to explain what it proves, name it better.

## Checklist

- [ ] Does this change add behaviour that nothing asserts?
- [ ] Did I have to mock internals to write this test? What is that telling me?
- [ ] Are the edges covered, or only the happy path?
- [ ] Would this test still pass if the behaviour were wrong but the implementation unchanged?

Related: [P4 Debugging], [P11 Refactoring], [P15 Design by Contract]
