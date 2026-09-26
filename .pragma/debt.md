# Recorded deviations

Deliberate departures from the principles, with the reasoning. Recorded via `/pragma:debt`.

## Environment read outside the config module

- **Principle:** P6 Configuration
- **Where:** `hooks/lib/state.js:13-14`, `hooks/lib/paths.js:9`
- **What:** These read `PRAGMA_STATE_DIR`, `CLAUDE_PLUGIN_DATA` and `CLAUDE_PLUGIN_ROOT` directly
  rather than going through `hooks/lib/config.js`.
- **Why deliberate:** `config.js` imports `state.js` to resolve the per-project mode. Routing these
  reads through config would make the dependency circular. Both values are locations supplied by the
  Claude Code runtime, not tunables — they cannot be validated at startup because a hook process has
  no startup phase distinct from its work.
- **Cost if wrong:** low. Three reads, each with an explicit fallback, in two files.
- **Revisit:** if a third module needs runtime paths, extract a `paths`/`env` module that owns all of
  them and that both `config.js` and `state.js` depend on.
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
- **Where:** `hooks/lib/detectors/naming.js:35` and `:70`
- **What:** Two detectors share a five-line shape: guard on test files, scan `codeLines`, filter,
  map to `finding(...)`.
- **Why deliberate:** this is the case P2 warns about — code that *looks* alike but changes for
  different reasons. `naming/single-letter` and `naming/boolean-name` have unrelated criteria and
  will diverge. A shared helper would gain a flag on the first divergence, then another.
- **Cost if wrong:** none directly; the risk is that a genuine shared rule change has to be made
  twice.
- **Revisit:** if a third detector wants the same shape *and* the same criteria.
- **Recorded:** 2026-09-26
