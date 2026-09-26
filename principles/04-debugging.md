# P4 — Debugging

Debugging is systematic investigation, not guessing. The failure mode looks like this:

```
"probably Redis" -> change Redis code -> still broken
   -> "must be Kafka" -> change Kafka code -> still broken -> now two new bugs
```

The discipline: **Observe -> Reproduce -> Hypothesise -> Experiment -> Verify -> Fix -> Prevent.**

## The protocol

**1. Reproduce it reliably.** Until you can make it happen on demand, you cannot know you fixed it.
A flaky reproduction is itself a finding — it usually means timing, ordering or shared state.

**2. Read the whole error.** Not just the last line. The stack trace, the error type, the input, the
request id, the timestamps, and what happened immediately before.

**3. Verify assumptions instead of trusting them.** "Redis returned null" is a hypothesis until you
have looked. Print it, log it structurally, or break on it.

**4. Bisect.** For a pipeline `A -> B -> C -> D -> E`, confirm the data is correct leaving A, then
leaving B, and so on. Bisect commits the same way (`git bisect`) when the bug is a regression.

**5. Fix the root cause, not the symptom.** A null check that hides why the value was null moves the
bug somewhere less visible.

**6. Write the regression test.** The order matters: write the test that fails *because* of the bug,
then fix, then watch it pass. A test written after a fix, never having failed, proves nothing.

## Smells in a proposed fix

- A `try`/`catch` that swallows the error with no explanation of why that is safe.
- An added optional-chain or default value where the real question is why the value was missing.
- A `setTimeout` or retry that makes a race condition less likely rather than removing it.
- A fix with no test, or a test that was never seen failing.

## Checklist

- [ ] Can I reproduce it on demand?
- [ ] Have I read the entire error and the events preceding it?
- [ ] Which assumption did I verify rather than believe?
- [ ] Is this the root cause or the first place I could make the symptom disappear?
- [ ] Does a regression test fail before the fix and pass after it?

Related: [P12 Test to Code], [P9 Shared State], [P13 Stay Safe]
