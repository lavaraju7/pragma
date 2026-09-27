# pragma-refactor

Refactoring changes structure, never observable behaviour. Follow
`{{PRAGMA_ROOT}}/principles/protocols/refactoring.md`.

## The loop

1. **Understand** — state in a sentence what the code does today, including the edge cases. Note
   anything odd that looks deliberate; a strange branch is often an undocumented bug fix.
2. **Establish the safety net** — find the tests covering this code and run them. They must be green
   *before* anything is touched. Missing coverage? Write characterisation tests first, asserting what
   the code does today even where that looks wrong.
3. **One small change** — extract a function, rename, inline an indirection, move a responsibility,
   replace a growing type-conditional, delete dead code. One. Not one of each.
4. **Run the tests.** Green: continue. Red: undo that step; do not debug forward from an unknown
   state.
5. Repeat until the code says what it means.

## Hard rules

- Never mix a behaviour change into a refactoring step. If a bug is found, report it separately
  rather than quietly fixing it inside the refactor where review cannot see it.
- Never batch changes between test runs.
- Never refactor code that cannot be tested. Add the net first, or say that is the prerequisite.
- Stop when the code is clear enough for the change it needs to support. "Perfect" is not a stopping
  condition.

## Choosing what to change

If nothing specific was named, run the detectors for candidates:

```
node "{{PRAGMA_ROOT}}/scripts/scan.js" --tiers design,strict <path>
```

and read `principles/11-refactoring.md` plus `02-dry.md` and `14-naming.md` for the techniques.
Propose the two or three highest-value changes and let the user pick, rather than restructuring
everything touched.

## Report

What changed structurally, confirmation that behaviour is unchanged and the tests pass, and anything
deliberately left alone with the reason.
