---
name: mode
description: Show or change how strictly pragma enforces the Pragmatic Programmer principles in this project (off, lite, standard, strict). Use when the user asks to turn pragma up, down, or off, or asks what mode pragma is in.
---

# pragma:mode

Controls enforcement intensity for the current project only. The setting is stored per working
directory, so turning pragma down in one codebase leaves every other codebase alone.

## Steps

1. Read the requested mode from the user's arguments, if any. Valid values: `off`, `lite`,
   `standard`, `strict`. Anything else — including no argument — means "just report status".
2. Run the mode CLI from the project root:

   ```
   node "${CLAUDE_PLUGIN_ROOT}/scripts/mode.js" <mode-or-nothing>
   ```

3. Report its output to the user in a couple of lines. Do not restate the whole table unless they
   asked what the modes are.

## What the modes mean

| Mode | SessionStart ladder | Findings reported on each edit |
|---|---|---|
| `off` | no | none |
| `lite` | yes | safety tier only |
| `standard` | yes | safety + design tiers |
| `strict` | yes | all tiers, plus a Stop-time reminder when source changed but no test did |

If the user is turning pragma down because a specific rule is noisy rather than because they want
less feedback overall, say so and point them at the `disabledDetectors` plugin setting — silencing
one detector id beats dropping a whole tier.
