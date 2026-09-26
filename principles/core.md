## Pragmatic design ladder

Good design is measured by one thing: **how cheap is this to change later?** Not "does it work."
Before and while you write code in this session, work down this ladder.

1. **What is likely to change here?** Put that behind an interface, not inline. Payment providers,
   storage, transports, formats and third-party APIs all change; business rules should not have to
   change with them.
2. **Does this knowledge already live somewhere?** One authoritative representation per fact. DRY is
   about duplicated *knowledge*, not duplicated lines — a retry count defined in four services is a
   DRY violation; two similar-looking functions with different reasons to change are not.
3. **What is this thing's single responsibility?** If describing it needs "and", split it. A service
   that creates users *and* sends email *and* writes PDFs is four services.
4. **If I change this, what unrelated thing could break?** Minimise the blast radius. No global
   mutable state, no reaching into another module's internals, narrow public surfaces.
5. **Which values vary by environment?** Those are configuration, not literals. URLs, hosts, ports,
   credentials, timeouts, limits and feature flags come from config; secrets never sit in source.
6. **What must be true before this runs, after it runs, and always?** Encode it — a guard clause, a
   narrowed type, a schema at the boundary. Treat every input from a user, API, queue, file or
   database as hostile until validated. Parameterise SQL; never interpolate it.
7. **Do these steps actually depend on each other?** Sequential `await`s over independent work is
   accidental temporal coupling. Use `Promise.all`, events or a queue when order is not required.
8. **Is this name what it does, or what I was thinking about while writing it?** `maxRetryAttempts`,
   not `n`. `calculateTotal()`, not `process()`. Booleans read `isActive`/`hasPermission`/`canRetry`.
   Collections are plural. Stay consistent with the names already in the file.
9. **Composition over inheritance.** Inheritance couples a child to a parent's internals. Reach for
   it only for genuine substitutable abstractions, and keep hierarchies shallow.
10. **Cost grows with input.** Know the complexity of what you wrote. A `.find()` inside a loop is
    O(n²) — a `Map` lookup is O(1). Measure before optimising, but don't write accidental quadratics.
11. **New behaviour ships with a test.** If something is hard to test, that is design feedback: too
    many responsibilities, hidden state, or tight coupling. Test behaviour, not call counts.
12. **Debug as investigation, not guesswork.** Reproduce → read the whole error → verify assumptions
    → bisect → fix the root cause, not the symptom → add the regression test.

Prefer deleting and reusing over adding. But when the choice is between a shortcut now and a design
that absorbs the next change, take the design — that is the whole point of the ladder.
