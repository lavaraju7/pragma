# pragma

A Claude Code plugin that keeps the Pragmatic Programmer's principles in play while Claude writes
code — not as a lecture at the start of a session, but at the moments they actually apply.

The question it optimises for is not "does this work?" but **"what will it cost to change this?"**

## What it does

Three surfaces, because the principles do not all apply at the same moment.

**Design-time** — a short decision ladder is injected at the start of every session, and prompts
that clearly read as debugging, refactoring or new-feature work get the matching protocol.

**Write-time** — every file Claude writes or edits is run through deterministic detectors. Findings
come back as context, so Claude fixes them on the next turn:

```
pragma — 3 findings in src/services/order.ts
  P13 Stay Safe      :8  SQL built by interpolating a value into the query string
                          Use a parameterised query: pass the value as a bound parameter.
  P6  Configuration  :3  Hardcoded endpoint "redis://prod-cache-1.internal:6379"
                          Move it to the config module, read from the environment, validate at startup.
  P5  Decoupling     :1  Business logic imports "ioredis" directly
                          Depend on an interface this module defines; let an adapter implement it.
```

It never blocks a tool call. The detectors are regex-grade, and a false positive that halts your
work is worse than one you can ignore.

**On demand** — eight skills for the work detectors cannot do.

## Commands

| Command | What it does |
|---|---|
| `/pragma:design <feature>` | Settles responsibilities, contracts and boundaries *before* code exists |
| `/pragma:review` | Reviews the uncommitted diff; `--fix` applies the findings |
| `/pragma:audit [path]` | Whole-repo scan, prioritised by where change is most expensive |
| `/pragma:debug <symptom>` | Reproduce → bisect → root cause → failing test → fix |
| `/pragma:refactor <target>` | Small verified steps, tests green between each |
| `/pragma:contract <file>` | Preconditions, postconditions, invariants, boundary validation |
| `/pragma:debt [note]` | Records a deliberate deviation instead of losing it |
| `/pragma:mode [level]` | Sets enforcement intensity for this project |

## Modes

Per project, set with `/pragma:mode`.

| Mode | Session ladder | Prompt nudges | Findings per edit |
|---|---|---|---|
| `off` | — | — | — |
| `lite` | yes | — | safety only |
| `standard` *(default)* | yes | yes | safety + design |
| `strict` | yes | yes | all, plus a reminder when source changed but no test did |

If one specific rule is noisy in your codebase, silence that rule rather than dropping a whole tier:
set `disabledDetectors` in the plugin's settings to a comma-separated list of detector ids (each
finding prints its id).

## The principles

`principles/core.md` is the ~35-line ladder injected each session. The fifteen detailed references
beside it — smells, fixes, worked examples, checklists — are loaded only when a skill needs one, so
the constant per-session cost stays small.

| | | | |
|---|---|---|---|
| P1 Good Design | P2 DRY | P3 Orthogonality | P4 Debugging |
| P5 Decoupling | P6 Configuration | P7 Inheritance Tax | P8 Temporal Coupling |
| P9 Shared State | P10 Algorithm Speed | P11 Refactoring | P12 Test to Code |
| P13 Stay Safe | P14 Naming | P15 Design by Contract | |

## Detectors

Twenty-six rules across JavaScript, TypeScript and Python. Each is tested against both the violation and
the legitimate near-miss — a parameterised query, a URL that *is* in the config module, two blocks
that look alike but change for different reasons.

| Tier | Rules |
|---|---|
| safety | SQL interpolation and concatenation, shell interpolation, `eval`, hardcoded secrets, paths from request input, hardcoded endpoints, module-level mutable state, global writes, read-modify-write across `await` |
| design | direct `process.env` reads, vague names, single-letter names, un-asserted booleans, unitless constants, `await` in a loop, sequential independent `await`s, infrastructure imports in business logic, inheritance that overrides nothing, repeated literals |
| strict | long functions, too many parameters, deep nesting, linear scans inside loops, duplicate blocks, singular collection names |

## Install

For development, clone it and point Claude Code at the directory:

```bash
claude --plugin-dir ./pragma
```

To install it properly, add the repository as a marketplace and install from it:

```bash
claude plugin marketplace add lavaraju7/pragma
claude plugin install pragma@pragma
```

Requires Node 20.11 or newer. No dependencies to install.

## Developing

```bash
node --test tests/
```

112 tests. Scan any codebase directly with the same engine the hook uses:

```bash
node scripts/scan.js --tiers safety,design,strict src/
```

`pragma` is scanned by its own detectors, and the deviations it reports on itself are recorded — with
reasoning — in [.pragma/debt.md](.pragma/debt.md).

## Prior art

The delivery shape — an always-on rule injected at `SessionStart`, situational nudges at
`UserPromptSubmit`, plus on-demand skills — follows
[ponytail](https://github.com/DietrichGebert/ponytail). The goals differ: ponytail optimises for
*less code*; pragma optimises for *cheap change*, which sometimes means adding an interface, a
contract or a test. No ponytail content is used.
