---
name: debt
description: Record a deliberate deviation from a principle, or list the ones already recorded. Use when the user knowingly accepts a shortcut and wants it tracked rather than forgotten, or asks what deviations are outstanding in this project.
---

# pragma:debt

A deliberate, recorded shortcut is engineering. An unrecorded one is a bug waiting to be found by
someone who does not know it was deliberate. This gives the user a way to say "yes, I know, not now"
without turning the whole plugin off.

## Listing (no arguments)

Read `.pragma/debt.md` from the project root and show the open entries, oldest first. If the file
does not exist, say there are no recorded deviations — do not create it.

Flag any entry whose "revisit" date has passed.

## Recording (with arguments, or after the user accepts a finding)

Create `.pragma/debt.md` if needed, and append:

```markdown
## <short title>

- **Principle:** P13 Stay Safe
- **Where:** src/services/order.ts:42
- **What:** SQL is interpolated rather than parameterised.
- **Why deliberate:** internal admin tool, input is an integer id from an authenticated session.
- **Cost if wrong:** injection on this endpoint if it is ever exposed externally.
- **Revisit:** 2026-12-31, or sooner if this endpoint becomes public.
- **Recorded:** 2026-09-26
```

Fill in what you know from the conversation; ask only for what you genuinely cannot infer — usually
just the reason and when to revisit. Do not interrogate the user.

## Push back once, then record

If the deviation is a safety-tier one — injection, a committed secret, an unvalidated boundary — say
in one sentence what the concrete risk is before recording it. If they still want it recorded, record
it and move on. It is their call, and nagging twice is what gets tools disabled.

Some things should not be "recorded" instead of fixed: a live credential in source control needs
rotating, not a diary entry. Say that plainly.

## Keep it in version control

`.pragma/debt.md` belongs in the repository — the point is that the next person finds it. Mention
that if the project's `.gitignore` would exclude it.
