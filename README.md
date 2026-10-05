# pragma

Keeps the Pragmatic Programmer's principles in play while an AI coding agent writes code — not as a
lecture at the start of a session, but at the moments they actually apply. Ships as an installable
Claude Code plugin and a GitHub Copilot CLI plugin, and as a small per-project installer for Cursor,
Antigravity and Windsurf.

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
Antigravity or Windsurf workflows, or Copilot skills, if that's the editor — see below).

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
project using more than one of these hosts shares its enforcement mode between them automatically —
set it from any one and the rest read the same file.

## Also works in Antigravity

Same shape as Cursor — no marketplace, so a generator writes into the project instead of an install
command:

```bash
node /path/to/pragma/scripts/install-antigravity.js [target-directory]
```

Writes `.agents/rules/pragma.md` (the ladder, plain markdown — Antigravity's rule format isn't
documented well enough yet to justify guessing at frontmatter fields the way Cursor's `.mdc` uses),
`.agents/workflows/pragma-*.md` (the same eight commands, from the same shared source Cursor's
installer reads), and merges a `"pragma"` entry into `.agents/hooks.json` — namespaced by hook name
in Antigravity's own schema, so merging means only ever touching that one entry and leaving any other
tool's entry in the file untouched, the same safety property the Cursor installer has for its
per-event arrays.

**Read this part before relying on the hooks.** Antigravity's hook system is new enough that:

- Its schema was pieced together from Google's own docs plus independent hands-on testing, because
  the two didn't fully agree with each other at the time this was written — the safer parts (rules,
  workflows) needed none of that, the hooks did.
- There is an open, unresolved report of `Stop` and `PostToolUse` hooks simply not firing at all on
  Antigravity IDE for Windows — [the exact platform this was built on](https://discuss.ai.google.dev/t/stop-and-posttooluse-hooks-in-agents-hooks-json-never-fire-antigravity-ide-1-107-0-windows/178288).
  This was verified the same way the Cursor and Claude Code adapters were — direct invocation with a
  payload matching the documented schema — **not** inside a live Antigravity session, because none
  was available to test against. If the hooks don't fire for you, that failure mode is already known
  about; the rule and workflows do not depend on hooks working and are unaffected either way.
- `PostToolUse`'s own response is documented as always ignored — there is no field in it to inject
  anything through, unlike Claude Code and Cursor. Only `PreInvocation` can inject context
  (`ephemeralMessage`), but it fires once per model turn, with no file path of its own. So the
  per-edit feedback here is a **relay**: `PostToolUse` records findings for the conversation,
  `stop.js` handles the test reminder, and the *next* `PreInvocation` call delivers whatever
  `PostToolUse` left, once. Two hooks standing in for the one hook this takes everywhere else — worth
  knowing if a finding shows up on the following turn rather than immediately.

## Also works in GitHub Copilot

Unlike Cursor and Antigravity, Copilot CLI has a real plugin system, so this one installs the way the
Claude Code plugin does — no per-project generator:

```bash
copilot plugin marketplace add lavaraju7/pragma
copilot plugin install pragma@pragma
```

Copilot reads the same `.claude-plugin/marketplace.json` Claude Code does. (`copilot plugin install
lavaraju7/pragma` also works today, but the CLI itself warns that direct installs are deprecated in
favour of `plugin@marketplace`.)

Copilot reads a plugin manifest at the repository root ahead of `.claude-plugin/plugin.json`, and
Claude Code reads only the latter. That's what lets one repository be both without either host seeing
the other's files: the root [`plugin.json`](plugin.json) points Copilot at `copilot/`, and nothing
Claude Code loads changed.

| Piece | What it is |
|---|---|
| `copilot/hooks.json` | `SessionStart` (the ladder), `PostToolUse` (findings on every edit), `Stop` (strict mode's test reminder) — wired to the same detector engine as every other host |
| `copilot/skills/pragma-*/` | The same eight skills, **generated** from the sources the other hosts use (`scripts/generate-copilot.js`) — and a test fails if they ever drift from them |
| `copilot/agents/` | The `pragmatic-reviewer` agent `pragma-audit` fans out to, in Copilot's own agent format |

Per-edit feedback goes straight back to the agent (`PostToolUse` takes an `additionalContext`), so
unlike Antigravity there is no relay. Two Copilot specifics are handled: its editing tools pass a
*relative* path, and `apply_patch` passes no path at all — the files are named inside the patch — so
the shared extractor ([`hooks/lib/tool-paths.js`](hooks/lib/tool-paths.js)) resolves both.

**What was checked against a real Copilot CLI** (1.0.91, sandboxed with `COPILOT_HOME`, offline
commands only):

- The root manifest wins. Given deliberately different versions in `plugin.json` and
  `.claude-plugin/plugin.json`, Copilot loaded the root one.
- `copilot/skills` is what loads — not the Claude Code `skills/` directory — and `copilot skill list`
  parses all eight `pragma-*` skills with their names and descriptions.
- The marketplace flow works: `marketplace add` accepts the existing `.claude-plugin/marketplace.json`
  and `pragma@pragma` installs and loads.

**What wasn't.** Hooks and the agent only come alive in a session, and driving one needs a login and
model calls, which a no-credentials check can't do. The CLI doesn't validate the hooks file at install
(a file that isn't valid JSON installs without complaint), so "installs cleanly" says nothing about
whether they fire. They were built against GitHub's published hook reference and tested by running
the adapters directly. Specifically:

- Which environment variable carries the plugin root to a hook — or whether the host expands
  `${CLAUDE_PLUGIN_ROOT}` in the command text instead — isn't settled by Copilot's own docs (a
  third-party issue asking exactly that is open). The hook commands handle every variant, and
  [tests/copilot-plugin.test.js](tests/copilot-plugin.test.js) executes each one, in Bash and
  PowerShell, to prove it; if the host does neither, the hooks fail open (Copilot logs the failure
  and carries on) and the skills, which find the plugin root from their own location instead, are
  unaffected.
- Skills carry no `${CLAUDE_PLUGIN_ROOT}` — Claude Code substitutes it; nothing in Copilot's docs says
  Copilot does — so each one tells the agent where the plugin root is, in prose.
- VS Code loads the same plugin format, but its hook entries and output use a different shape
  (`command`/`windows`/`timeout`, nested `hookSpecificOutput`) from the Copilot CLI one targeted here.
  Skills and the agent should work there; hook feedback may not.
- Copilot's cloud coding agent reads only `.github/hooks/*.json` from the repository, never an
  installed plugin, so none of this reaches it.
- No equivalent of Claude Code's per-prompt nudges: Copilot's `userPromptSubmitted` hook can't inject
  context, only block — the same reason there are none on Cursor.

`.pragma/mode` is still the one file all of these share, so a project that uses Copilot alongside any
other host gets one enforcement mode across all of them.

## Also works in Windsurf

Same shape as Cursor — Windsurf config is per-project, so a generator writes into the project:

```bash
node /path/to/pragma/scripts/install-windsurf.js [target-directory]
```

| Piece | What it is |
|---|---|
| `rules/pragma.md` | The ladder as an `always_on` rule — this is how it reaches the agent |
| `workflows/pragma-*.md` | The same eight commands (`/pragma-review`, …), from the same shared source Cursor's installer reads |
| `hooks.json` | A `post_write_code` entry that runs the detectors on every file Cascade writes |

(Windsurf also reads `SKILL.md` skills. These ship as workflows to match Cursor and Antigravity, which
have no such thing.)

**Where it writes matters.** Windsurf now documents `.devin/` as its preferred config directory and
reads `.windsurf/` only as a fallback when the `.devin/` equivalent is absent — so writing a new
`.devin/hooks.json` next to a project's existing `.windsurf/hooks.json` would silently switch off
every hook they already have. The installer writes each piece wherever that project's own files already
live, and only when neither exists picks `.devin/` if the project has that directory and `.windsurf/`
(which every Windsurf version reads) if not. Re-running is safe: its hook entry is merged by command,
never duplicated, and everything else in the file is left as it was.

**The hook is different in kind from every other host's, and that's the thing to know.** Windsurf's
hooks cannot talk to the agent. Their stdout goes to *you*, in the Cascade panel (that's what
`show_output` does) — it is never fed to the model — and post-hooks can't block. The only
agent-visible channel Windsurf offers is a `pre_*` hook exiting 2, which blocks the action. This
plugin never blocks, and changing that to get parity would trade away the property it's built around,
so it doesn't. The result:

- Findings after each write are shown to the **developer**, not Cascade. Cascade doesn't see them and
  can't fix them in the next turn the way Claude Code and Copilot can.
- What reaches Cascade is the always-on rule (the ladder) and whatever workflow you run.
- There's no strict-mode "this needs a test" reminder and no prompt nudges — both need a way to speak
  to the agent, and Windsurf's hooks don't have one. Mode, set from any host, still applies to what
  the hook reports.

**What wasn't verified.** None of this has run inside Windsurf itself — it's a desktop IDE, not
something a no-credentials check can drive. It was built against Windsurf's published hooks, rules and
workflows documentation (now served from `docs.devin.ai`, following the Devin Desktop rebrand) and
tested by running the adapter directly, by running the installed hook command in real `sh` and
PowerShell, and by exercising the installer's placement rules against `.devin/`/`.windsurf/`
combinations. The documented 12,000-character limit on rule and workflow files is asserted in the
tests.

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
ternary that contains a comparison without being one. 210 tests, [tests/](tests/), runnable with
`node --test`.

**Dogfooding, not just claims.** `pragma` is scanned by its own detectors — `node scripts/scan.js
hooks scripts cursor antigravity copilot windsurf` — against its own ~2,600 lines. Currently: 12 findings, every one
recorded with its specific reasoning in [.pragma/debt.md](.pragma/debt.md), rather than silently
ignored or suppressed. That file is the actual, current output of the tool pointed at itself, not a
curated example.

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

210 tests, including every host's adapters, all three installers' merge and placement logic, and the
Copilot plugin's own manifest and hook commands. Scan any
codebase directly with the same engine the hook uses:

```bash
node scripts/scan.js --tiers safety,design,strict src/
```
