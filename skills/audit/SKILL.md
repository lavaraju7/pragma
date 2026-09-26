---
name: audit
description: Scan a whole repository or directory against the Pragmatic Programmer principles and produce a prioritised report of where the cost of change is highest. Use when the user asks for a codebase health check, a whole-repo review, or where the technical debt is.
---

# pragma:audit

A whole-codebase pass. Unlike `/pragma:review`, which looks at a diff, this answers "where in this
codebase is change most expensive, and what would I fix first?"

## 1. Run the detectors across the tree

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/scan.js" --json <path or .>
```

This is the deterministic layer and it is cheap. Parse the JSON and aggregate: findings per
principle, per file, and the files with the most safety-tier findings.

## 2. Fan out for the design-level read

Detectors cannot see responsibilities, coupling or missing abstractions. Spawn
`pragmatic-reviewer` subagents — one per top-level source directory, up to three at a time — so
their file reading stays out of the main context. Give each agent:

- its directory
- the detector findings already recorded for that directory (so it does not repeat them)
- the principle files relevant to design-level review: `01-good-design.md`, `02-dry.md`,
  `03-orthogonality.md`, `05-decoupling.md`, `07-inheritance-tax.md`, `12-test-to-code.md`

Ask each for structured findings only — `file:line`, principle, what goes wrong, and the fix — not
prose.

## 3. Merge and prioritise

Rank by **cost of leaving it**, not by count:

1. Safety-tier findings — injection, hardcoded secrets, unvalidated boundaries. These are bugs.
2. Hot spots — the files that both change often (`git log --format= --name-only | sort | uniq -c
   | sort -rn | head -20`) and score badly. High-churn plus high-coupling is where the money is.
3. Structural problems that block the work the user actually wants to do.
4. Everything else.

A file that has not changed in two years and never will is not worth refactoring, however ugly.

## 4. Report

```
pragma audit — <repo>, <n> files scanned

Fix now
  P13  src/api/orders.ts:88      SQL interpolation in a public endpoint
  P13  src/config/aws.ts:12      Live access key committed

Fix next (high churn + high coupling)
  src/services/order.ts   47 changes in 6 months, imports 4 drivers directly, 310-line function
      -> extract OrderRepository; move rendering out

Worth knowing
  <counts by principle, with the one-line story each count tells>

Not worth fixing
  <what you deliberately excluded and why>
```

End with the single change you would make first, and what it would unlock. A list of two hundred
findings with no priority is not an audit.
