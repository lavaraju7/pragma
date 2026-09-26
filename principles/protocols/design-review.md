# Design review questionnaire

Run before writing code for anything beyond a small, local change. The output is a short design note
— under a page — not a document.

Work from the code that already exists: search for the existing patterns, utilities and abstractions
in this repository first. The best design is usually the one that reuses what is there.

## 1. Responsibilities (P1, P3)

- What is being built, in one sentence?
- Which units does it decompose into, and what is each one's single responsibility?
- Does any description need the word "and"? Split it.
- Which existing modules already own part of this? Extend those rather than adding parallel ones.

## 2. What will change (P1, P5)

- What is most likely to change here in the next six months — a vendor, a rule, a format, a rate?
- Which of those belong behind an interface so the change stays local?
- Which are stable enough that an abstraction would be speculative? Name those explicitly and do
  **not** abstract them. An interface with one implementation and no expected second one is cost
  without benefit.

## 3. Knowledge (P2)

- What facts does this encode — limits, statuses, rules, formats?
- Does each already live somewhere in the codebase? Reuse the authoritative one.
- Where will each new fact live, so that there is exactly one place to change it?

## 4. Boundaries and contracts (P15, P13)

- What crosses in from outside — requests, messages, files, third-party responses?
- What schema validates each, and where?
- For each public function: preconditions, postconditions, invariants.
- Which rules can the type system carry instead of a runtime check?
- Who is allowed to do this, and how is that checked per object, not just per session?

## 5. Dependencies and coupling (P3, P5, P7)

- What does this depend on? Is any of it concrete infrastructure that business logic should not name?
- Are dependencies injected or constructed inside?
- Is inheritance being used where composition would do?
- If this changes, what else could break? Is that list surprising?

## 6. Sequencing and state (P8, P9)

- Which steps genuinely depend on an earlier result, and which are merely written in a row?
- What is the caller actually waiting for? Can the rest be announced and handled independently?
- Is any state shared and mutable? Who owns it, and what happens under concurrent requests?

## 7. Scale (P10)

- How does cost grow with input size? Any lookup inside a loop, any query inside a loop?
- Does this hold at 100x today's data?

## 8. Configuration (P6)

- Which values differ by environment? Those go to config, validated at startup.
- Any secrets? Those come from a secret store, never source.

## 9. Testing (P12)

- What is the test for each unit, and what does it assert about behaviour?
- Is anything hard to test? That is design feedback — fix the design, not the test.

## Output

```
Design: <name>

Units           <unit> — <single responsibility>
Likely to change <what> -> behind <interface>
Not abstracting  <what> — no second implementation expected
Contracts        <fn>: pre / post / invariant
Boundaries       <input> validated by <schema> at <place>
Sequencing       <what runs concurrently; what is announced rather than awaited>
Config           <values> from config; <secrets> from the secret store
Tests            <what each asserts>
Risks            <what could bite, and the cheapest mitigation>
```

Then ask the user to confirm or adjust before implementing. If they say go, implement it as
specified; do not quietly redesign during implementation.
