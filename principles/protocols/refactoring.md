# Refactoring protocol (P11)

Refactoring changes structure, never observable behaviour. If behaviour must change too, do the
refactor first, verify, then make the behaviour change as a separate step.

## 1. Understand

Read the code and state, in a sentence or two, what it currently does — including the edge cases it
handles. If you cannot, you cannot tell whether you preserved behaviour.

Note what is *deliberate* but odd-looking. A strange-looking branch is often a bug fix nobody
documented; deleting it reintroduces the bug.

## 2. Establish a safety net

Find the tests covering this code and run them. Confirm they pass **before** you touch anything —
a suite that was already red tells you nothing later.

If coverage is missing, write characterisation tests first: tests that assert what the code does
today, even where that looks wrong. Preserving behaviour includes preserving the parts you dislike;
change those separately, deliberately, with the user's agreement.

**Gate:** a green test run that exercises the behaviour you are about to restructure.

## 3. One small change

Pick a single move:

- extract a function
- rename a thing
- inline a needless indirection
- move a responsibility to the module it belongs in
- replace a growing type-conditional with a lookup or polymorphism
- delete dead code

Do one. Not one of each.

## 4. Run the tests

Green: keep going. Red: undo the last step — do not debug forward from an unknown state. The point
of small steps is that the last good state is one step behind you.

## 5. Repeat

Back to step 3 until the code says what it means. Commit at green points so each is recoverable.

## 6. Report

Say what changed structurally, confirm behaviour is unchanged, and name anything you deliberately
left alone and why. If you found a real bug while refactoring, report it separately — do not quietly
fix it inside the refactor, where it is invisible in review.

## Rules

- Never mix a behaviour change into a refactoring step.
- Never batch changes between test runs.
- Never refactor code you cannot test — add the net first.
- Stop when the code is clear enough for the change you came to make. "Perfect" is not a stopping
  condition; the next reader's comprehension is.
