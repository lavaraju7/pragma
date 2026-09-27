# pragma

Keeps the Pragmatic Programmer's principles in play while an AI coding agent writes code — not as a
lecture at the start of a session, but at the moments they actually apply. Ships as an installable
Claude Code plugin, and as a small per-project installer for Cursor.

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

**On demand** — eight skills for the work detectors cannot do (the same eight, as Cursor commands,
if that's the editor — see [Also works in Cursor](#also-works-in-cursor)).

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
set `disabledDetectors` in the plugin's settings (Claude Code) or the `PRAGMA_DISABLED_DETECTORS`
environment variable (either host) to a comma-separated list of detector ids — each finding prints
its own id. `PRAGMA_MAX_FINDINGS` overrides how many findings are reported per edit, the same way.

The mode is stored as a single line in `.pragma/mode`, inside the project — not in a global,
per-installation store. That is deliberate: `/pragma:mode` runs as a plain script via the Bash tool,
which never receives the `CLAUDE_PLUGIN_*` environment variables the harness injects only into a
hook's own subprocess. A global store keyed by path would let the CLI and the hooks silently read
and write two different files. A file inside the project is the one location every invocation path
agrees on — and as a side effect, a team can commit it to hold everyone to the same intensity.

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

## Also works in Cursor

Cursor has no plugin marketplace — `.cursor/` config is per-project, not something installed once
for every session the way a Claude Code plugin is. So instead of an install command, there's a
generator that writes a `.cursor/` directory into whichever project needs it:

```bash
node /path/to/pragma/scripts/install-cursor.js [target-directory]
```

Defaults to the current directory. Safe to re-run — it updates the rule and commands in place, and
merges its hook entries into an existing `.cursor/hooks.json` without touching anything already
there (existing hooks are left exactly as they are; running it twice never duplicates an entry).
Committing the resulting `.cursor/` directory is the point: it travels with the repo, the same way
`.cursor/hooks/*.sh` scripts normally do.

| Piece | What it is |
|---|---|
| `.cursor/rules/pragma.mdc` | The same design ladder as Claude Code's `SessionStart`, regenerated from `principles/core.md` each install so it can't drift out of sync |
| `.cursor/commands/pragma-*.md` | The same eight skills, as Cursor's custom commands (`/pragma-review`, `/pragma-mode`, …) |
| `.cursor/hooks.json` | `sessionStart`, `afterFileEdit`, `postToolUse`, `stop` — wired to the exact same detector engine (`hooks/lib/`) that the Claude Code plugin uses; nothing about the detectors is duplicated for Cursor |

**Where the two hosts genuinely differ**, rather than paper over it:

- Cursor's lifecycle hooks are a **beta** feature (Cursor 1.7+) — the event names and payload shapes
  this was built against could still change upstream.
- Cursor's `beforeSubmitPrompt` hook (the `UserPromptSubmit` analog) cannot inject context, only
  block outright — so the situational debug/refactor/design nudges Claude Code gets on a matching
  prompt don't have a Cursor equivalent. Making them *block* instead, just to have parity, would
  trade away the "never interrupts" design this whole plugin is built around, for a feature that
  exists on the Claude Code side specifically because it doesn't interrupt.
- Cursor's `stop` hook offers `followup_message` (queues a new auto-continuation) rather than Claude
  Code's block-with-reason (resumes the same turn) — different mechanism, same intent: strict mode's
  one-time "this needs a test" reminder works on both.

**Because `.pragma/mode` is a plain file inside the project**, not a Claude-Code-specific store, a
project using both hosts shares its enforcement mode between them automatically — set it from either
one and both read the same file.

## Does this actually help?

Not a benchmark — this doesn't run a suite of tasks across models to produce a percentage, and a
number like that would be easy to make sound rigorous while resting on very little. What follows
instead is reproducible: run the same commands and get the same result.

**A concrete before/after.** This, run through `node scripts/scan.js`:

```ts
import { Pool } from 'pg';

const db = new Pool({ connectionString: 'postgres://prod-db.internal:5432/app' });
const stripeApiKey = 'sk_live_51H8xQ2eZvKYlo2C';

export async function chargeUser(userId: string) {
  return db.query(`SELECT * FROM users WHERE id = ${userId}`);
}
```

produces exactly this, with no editing:

```
order-service.ts
  :3  P6 Configuration  Hardcoded endpoint "postgres://prod-db.internal:5432/app"
        Move it to the config module, read from the environment, and validate it at startup.
  :4  P13 Stay Safe  Secret assigned to "stripeApiKey" as a literal
        Read it from a secret manager or the environment, and rotate this value if it was ever committed.
  :7  P13 Stay Safe  SQL built by interpolating a value into the query string
        Use a parameterised query: pass the value as a bound parameter, not as text.

3 findings across 1 file — P13:2  P6:1
```

Fixed —

```ts
import { Pool } from 'pg';
import { config } from './config.js';

const db = new Pool({ connectionString: config.database.url });

export async function chargeUser(userId: string) {
  return db.query('SELECT * FROM users WHERE id = $1', [userId]);
}
```

— and the same command reports `No findings.`

**Detector precision, not just recall.** A tool that fires constantly gets disabled; the harder half
of a linter is staying silent on the legitimate case that merely *looks* like the violation. Every
one of the 26 detectors is tested against both — a parameterised query next to the interpolated one
it should stay quiet on, a URL that's hardcoded but legitimately lives in the config module, a
ternary that contains a comparison without being one. 136 tests, [tests/](tests/), runnable with
`node --test`.

**Dogfooding, not just claims.** `pragma` is scanned by its own detectors — `node scripts/scan.js
hooks scripts cursor` — against its own ~1,800 lines. Currently: 9 findings, every one recorded with
its specific reasoning in [.pragma/debt.md](.pragma/debt.md), rather than silently ignored or
suppressed. That file is the actual, current output of the tool pointed at itself, not a curated
example.

**A real bug this process found.** Building the mode-switching feature, testing it live (writing real
violations through the actual tool, in a real installed session) surfaced a genuine cross-environment
state bug that 112 passing unit tests had missed — the CLI and the live hook were silently reading
two different files. Root-caused, fixed, and closed with a regression test that specifically forbids
the environment-sharing that had hidden it: [`41a007b`](https://github.com/lavaraju7/pragma/commit/41a007b2599a65d0df03a94e875ad91012b37f7d).
The point isn't that the bug happened — it's that live testing against the actual mechanism, not just
unit tests against the code, is what caught it.

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

136 tests, including the Cursor adapters and the installer's merge logic. Scan any codebase directly
with the same engine the hook uses:

```bash
node scripts/scan.js --tiers safety,design,strict src/
```
