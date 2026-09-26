---
name: debug
description: Investigate a bug systematically — reproduce it, verify assumptions, bisect, find the root cause, and ship the fix with a regression test that failed first. Use when the user reports something broken, failing, crashing, or behaving unexpectedly and wants it diagnosed rather than patched.
---

# pragma:debug

Debugging by investigation, not by guessing. The protocol is a gate sequence: you do not advance
until the current gate is satisfied, and you say which gate you are on.

## Run the protocol

Read `${CLAUDE_PLUGIN_ROOT}/principles/protocols/debugging.md` and follow it in order:

1. **Observe** — the full error, the input, the timing, what changed.
2. **Reproduce** — reliably, ideally as a failing test. *Gate: it happens on demand.*
3. **Hypothesise** — one specific, falsifiable claim.
4. **Experiment** — observe the thing you suspect; bisect the pipeline or the commits.
   *Gate: you saw it, you did not infer it.*
5. **Verify the root cause** — explain the whole chain with no "and then somehow".
6. **Write the failing test first** — watch it fail for the right reason.
7. **Fix the cause** — not the last place the symptom was visible.
8. **Prevent** — the cheapest guard, validation or type that would have caught it earlier.

## Rules that make the difference

- **Never change code to see what happens.** Change code to test a stated hypothesis.
- **Never skip the reproduction.** If it cannot be reproduced, narrowing *why* is the task — usually
  timing, ordering, shared mutable state (`principles/09-shared-state.md`), caching, or data that
  differs by environment.
- **Never write the test after the fix.** A test that has never failed proves nothing.
- If the user asks you to just make the symptom go away, say plainly what the underlying cause
  appears to be, then do what they asked.

## Report

Close with: symptom, root cause, the fix, the regression test, and anything still unexplained. Say
so explicitly if something remains unexplained — do not round it up to solved.
