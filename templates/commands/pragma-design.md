# pragma-design

A gate in front of implementation. The cost of a bad design is paid on every future change, and the
cheapest moment to fix it is before the first line exists.

Use this for anything with more than one moving part. For a one-line change, skip it and just make
the change.

## 1. Read the existing code first

Before designing anything, find what is already there:

- the modules that own part of this responsibility already
- existing interfaces, base types, repositories and utilities that fit
- the conventions this codebase uses for validation, errors, config and tests

The best design is usually the one that reuses what exists. A new parallel abstraction beside an
equivalent one is a DRY violation that will outlive the feature.

## 2. Walk the questionnaire

Read `{{PRAGMA_ROOT}}/principles/protocols/design-review.md` and work through it. Load the
individual principle files it points at only when a question is genuinely open.

## 3. Write the design note

Short — under a page, in the shape the protocol specifies. It must state:

- the units and each one's single responsibility
- what is likely to change, and what goes behind an interface because of it
- **what is deliberately not being abstracted, and why** — this matters as much as the rest. An
  interface with one implementation and no expected second one is cost with no benefit. Speculative
  generality is a design failure, not caution.
- contracts: preconditions, postconditions, invariants for each public function
- where untrusted input is validated, and by what
- what runs concurrently versus what genuinely must be sequential
- which values are configuration and which are secrets
- what each test asserts
- the main risk, and the cheapest thing that mitigates it

## 4. Confirm, then build

Show the note and ask for confirmation or adjustment. Keep this short — a feature was requested, not
a document.

Once agreed, implement exactly what was agreed. If implementation reveals the design was wrong, stop
and say so rather than quietly building something else — a design that changed silently is worse
than no design.
