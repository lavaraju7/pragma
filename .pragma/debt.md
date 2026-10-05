# Recorded deviations

Deliberate departures from the principles, with the reasoning. Recorded via `/pragma:debt`.

## Environment read outside the config module

- **Principle:** P6 Configuration
- **Where:** `hooks/lib/state.js:13-14`, `hooks/lib/paths.js:9`, `cursor/lib/context.js:13,27`,
  `antigravity/lib/context.js:21`, `copilot/lib/context.js:32`
- **What:** These read `PRAGMA_STATE_DIR`, `CLAUDE_PLUGIN_DATA`, `COPILOT_PLUGIN_DATA`,
  `CLAUDE_PLUGIN_ROOT` and `CURSOR_PROJECT_DIR` directly rather than going through `hooks/lib/config.js`.
- **Why deliberate:** `config.js` imports `state.js` (via `project-mode.js`) to resolve the
  per-project mode; routing these reads through config would make that circular. And these values
  are locations supplied by whichever host is running the hook, not tunables `config.js` owns —
  `cursor/lib/context.js`, `antigravity/lib/context.js` and `copilot/lib/context.js` exist
  specifically to bridge that difference between hosts, the same job `hooks/lib/paths.js` and `hooks/lib/state.js` already do for
  Claude Code. None can be validated at startup, either: a hook process has no startup phase distinct
  from its work.
- **Cost if wrong:** low. A handful of reads, each with an explicit fallback, in a handful of small files
  whose entire purpose is exactly this kind of host-specific bridging.
- **Revisit:** with a fourth host the check has a concrete answer. What *did* duplicate was the list
  of plausible file-path argument names, copied into the Cursor and Antigravity adapters and about to
  be copied a third time for Copilot — that is one piece of knowledge, so it now lives once in
  `hooks/lib/tool-paths.js`. What remains per host (which payload field holds the project root,
  which holds the session id, where state defaults to) differs in *what it reads* on every host, so
  it is still looking alike without being the same knowledge. Revisit if a fifth host's context.js
  turns out to be a copy of one of these rather than a new mapping.
- **Recorded:** 2026-09-26

## Tier name literals repeated in the mode tables

- **Principle:** P2 DRY
- **Where:** `hooks/lib/config.js:8-10`, `hooks/lib/detectors/coupling.js:3-5`
- **What:** `'safety'` / `'design'` / `'strict'` appear as literals in the tier table and in the
  per-principle constant headers.
- **Why deliberate:** these are enum members in their defining table. Replacing the literals with
  constants would add indirection without removing a second source of truth — the table *is* the
  authoritative definition.
- **Cost if wrong:** a typo in a tier name silently disables a detector.
- **Revisit:** if a fourth tier is added, or if a typo ever causes a miss, make the tiers a frozen
  enum object and have `TIERS_BY_MODE` reference it.
- **Recorded:** 2026-09-26

## Repeated detector boilerplate

- **Principle:** P2 DRY
- **Where:** `hooks/lib/detectors/naming.js:35` and `:75`
- **What:** Two detectors share a five-line shape: guard on test files, scan `codeLines`, filter,
  map to `finding(...)`.
- **Why deliberate:** this is the case P2 warns about — code that *looks* alike but changes for
  different reasons. `naming/single-letter` and `naming/boolean-name` have unrelated criteria and
  will diverge. A shared helper would gain a flag on the first divergence, then another.
- **Cost if wrong:** none directly; the risk is that a genuine shared rule change has to be made
  twice.
- **Revisit:** if a third detector wants the same shape *and* the same criteria.
- **Recorded:** 2026-09-26

## Linear scan inside a loop, on a tiny array

- **Principle:** P10 Algorithm Speed
- **Where:** `scripts/install-cursor.js:65`
- **What:** `existing.hooks[event].some((e) => e.command === entry.command)` runs inside a loop over
  the hook entries being merged in.
- **Why deliberate:** `existing.hooks[event]` is a handful of hook command strings — realistically
  under twenty even in a heavily customised `.cursor/hooks.json`. Indexing it into a `Map` first adds
  a second data structure to keep in sync with no measurable benefit at this size.
- **Cost if wrong:** none in practice; the finding is correct in principle, just not proportionate
  here.
- **Revisit:** if this ever runs over a collection whose size isn't bounded by "how many hooks one
  project configures by hand."
- **Recorded:** 2026-09-27
