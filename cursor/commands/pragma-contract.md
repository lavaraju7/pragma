# pragma-contract

Turns implicit assumptions into enforced ones. Read
`{{PRAGMA_ROOT}}/principles/15-design-by-contract.md` and `13-stay-safe.md` first.

## 1. State the contract before changing anything

For each public function in the target, write down:

```
<function>(<args>)
  precondition:   what must be true before the call
  postcondition:  what it guarantees on return, including on the error path
  invariant:      what is true before and after, always
```

Show this before implementing. It routinely surfaces a case nobody had decided — an empty
collection, a negative amount, a currency mismatch, a status that should have made the call
impossible. Ask about those rather than inventing an answer.

## 2. Enforce, in this order of preference

1. **A type**, where the language can carry the rule — a narrow union instead of `string`, a branded
   id so a user id cannot be passed where an order id belongs, a required field instead of an
   optional one with scattered defaults. A rule the type enforces cannot be forgotten.
2. **A schema at the boundary**, for anything from outside — request bodies, queue messages, config,
   third-party responses. Use the schema library the project already has (check `package.json` for
   zod, joi, class-validator, ajv, pydantic) rather than introducing a new dependency. If there is
   none, hand-written guards are fine; do not add a library without asking.
3. **A guard clause** at the top of the function, one per rule, each throwing a specific error.
   Guards beat nesting: the happy path stays unindented.
4. **An assertion** for an invariant believed impossible to violate. One that never fires costs
   nothing; one that fires has saved a silent corruption.

## 3. Keep the error useful

A thrown error should say which rule was broken and what was received — without leaking a stack
trace, query or internal hostname to an external caller.

## 4. Test the contract

Each precondition gets a test that violates it and asserts the specific failure. This is often where
the real bugs surface.

## Do not over-apply

An internal helper called from one place, with a type that already says everything, does not need a
runtime guard. Enforce at boundaries and on public surfaces; trust the interior already validated on
the way in.
