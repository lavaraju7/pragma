# pragma-mode

Controls enforcement intensity for the current project only. The setting is stored in
`.pragma/mode`, inside the project itself — so turning pragma down in one codebase leaves every
other codebase alone, and the same file is shared with Claude Code if this project also uses the
Claude Code plugin.

## Steps

1. Read the requested mode from the text after this command, if any. Valid values: `off`, `lite`,
   `standard`, `strict`. Anything else — including nothing — means "just report status".
2. Run the mode CLI from the project root:

   ```
   node "{{PRAGMA_ROOT}}/scripts/mode.js" <mode-or-nothing>
   ```

3. Report its output in a couple of lines. Do not restate the whole table unless asked what the
   modes are.

## What the modes mean

| Mode | sessionStart ladder | Findings reported on each edit |
|---|---|---|
| `off` | no | none |
| `lite` | yes | safety tier only |
| `standard` | yes | safety + design tiers |
| `strict` | yes | all tiers, plus a reminder when source changed but no test did |

If a specific rule is noisy rather than the intensity being wrong overall, set the
`PRAGMA_DISABLED_DETECTORS` environment variable to a comma-separated list of detector ids (each
finding prints its id) — silencing one detector beats dropping a whole tier.
