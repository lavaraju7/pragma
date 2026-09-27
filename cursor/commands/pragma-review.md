# pragma-review

Reviews what has changed but is not yet committed. Two layers: deterministic detectors for the
mechanical violations, and your own reading for the design questions no regex can answer.

## 1. Collect the changed files

```bash
git diff --name-only HEAD
git ls-files --others --exclude-standard
```

If a path or branch was named, use that instead (`git diff --name-only main...HEAD`). If there is no
git repository, ask what to review rather than scanning everything — that is pragma-audit.

## 2. Run the detectors

```
node "{{PRAGMA_ROOT}}/scripts/scan.js" <changed files>
```

These findings are already verified — report them as-is. Do not re-derive them by reading, and do
not repeat a finding the detectors already made.

## 3. Read the diff for what detectors cannot see

```bash
git diff HEAD -- <files>
```

Read the changed code and judge it against the principles the detectors do not cover. Load only the
reference files needed from `{{PRAGMA_ROOT}}/principles/`:

| Ask | Read |
|---|---|
| Does each new unit have one responsibility? Is the cost of the next change low? | `01-good-design.md` |
| Is a *fact* now encoded in two places? (not: do two blocks look alike) | `02-dry.md` |
| Would changing this break something unrelated? | `03-orthogonality.md` |
| Does business logic depend on a concrete implementation? | `05-decoupling.md` |
| Is inheritance used where composition belongs? | `07-inheritance-tax.md` |
| Does new behaviour have a test? Do the tests assert behaviour or call counts? | `12-test-to-code.md` |
| Are preconditions checked, boundaries validated, invariants stated? | `15-design-by-contract.md` |

## 4. Verify before reporting

Every finding must name `file:line` and survive this check: *what concretely goes wrong, and when?*
If that cannot be answered, drop it. A review of eight real problems beats one of thirty guesses.

Do not report style preferences, do not restate what the code does, and do not flag something as
duplication when the two copies change for different reasons — say so explicitly if that was
considered and rejected.

## 5. Report

```
pragma review — <n> findings in <m> files

P13 Stay Safe          src/services/order.ts:42
  SQL built by interpolating `id` into the query string.
  Fix: pass `id` as a bound parameter.

P1 Good Design         src/services/order.ts:8
  OrderService now also renders invoices and uploads them. Three reasons to change in one class.
  Fix: move rendering to InvoiceRenderer and upload to StorageService.
```

Ranked: safety first, then design, then style. End with a one-line verdict — what to fix before
merging versus what can wait.

## 6. If asked to fix

Apply the findings in rank order, safety first. One fix per edit, and after each, re-run the
project's tests if there are any. Do not bundle unrelated fixes into one change. If a fix would
change observable behaviour, stop and ask rather than deciding unilaterally.
