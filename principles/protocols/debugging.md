# Debugging protocol (P4)

A gate sequence. Do not advance to the next step until the current one is satisfied, and say out
loud which step you are on.

## 1. Observe

Collect, do not interpret yet:

- the exact error message and the **full** stack trace
- the input that produced it (request body, arguments, message payload, file)
- when it started, and what changed around then (deploy, config, dependency, data volume)
- whether it is deterministic or intermittent
- the surrounding log lines, not only the failing one

**Gate:** you can state the symptom precisely, in terms of observed behaviour versus expected.

## 2. Reproduce

Get a reliable trigger — ideally a failing test, otherwise a command or request that fails every
time.

**Gate:** you can make it happen on demand.

If you cannot, that is itself the finding. Intermittent failures point at timing, ordering, shared
mutable state ([P9]), caching, or data that differs between environments. Narrow until it is
deterministic before proposing a fix.

## 3. Hypothesise

Write down the specific, falsifiable claim: "`getUser` returns null because the cache key is built
from the id before the id is normalised."

Not: "something is wrong with the cache."

## 4. Experiment

Test the hypothesis directly — log the value, assert it, break on it, or run the isolated function.
For a pipeline, bisect: confirm the data is correct leaving stage A, then stage B, and so on. For a
regression, `git bisect` the commits.

**Gate:** you have *observed* the thing you suspected, not inferred it.

Wrong hypothesis? Return to step 3 with what you learned. This is normal; guessing again without
checking is not.

## 5. Verify the root cause

Explain the whole failure, start to finish, with no "and then somehow". If part of the chain is
still hand-waved, you have found *a* problem, not necessarily *the* problem.

## 6. Write the failing test first

Before changing any production code, add the test that fails **because of this bug**. Run it. See it
fail for the right reason.

A test written after the fix, never having failed, proves nothing.

## 7. Fix the cause

Fix what makes the chain possible, not the last place it was visible. A fix is suspect when it is a
swallowed exception, an added optional chain, a default that papers over a missing value, or a retry
that makes a race less likely.

**Gate:** the new test passes and the existing suite still passes.

## 8. Prevent

Ask what would have caught this earlier: a precondition ([P15]), validation at the boundary ([P13]),
a type that made the state unrepresentable, or a log line that would have shown it. Add the cheapest
one.

## Report

Close with: symptom, root cause, fix, the regression test, and anything still unexplained. Say
plainly if something remains unexplained — do not round it up to solved.
