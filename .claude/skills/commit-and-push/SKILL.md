---
name: commit-and-push
description: >-
  Commit and push changes in fitness-dashboard as a small, focused PR with a
  message in this repo's actual style. Use whenever asked to "commit",
  "commit and push", "open a PR", "ship this", or similar — covers the
  pre-commit gate, commit message format, branch/PR workflow, and post-merge
  cleanup used in this repo.
---

# Commit and push (fitness-dashboard)

This repo's working agreement (`CLAUDE.md`) is explicit: Claude may draft,
but **Alex reviews, modifies, and owns every line** before it's committed.
Only run this skill's commit/push steps once Alex has actually seen the diff
and asked to commit — don't commit proactively just because tests pass.

## Before committing

1. **Confirm the diff is what Alex reviewed.** `git status` / `git diff` —
   don't stage anything that wasn't part of the discussed change (check for
   stray scratch files like `e2e/_scratch.spec.js`, editor droppings, etc.).
2. **Run the `code-review` skill's checklist** (or at least its fast checks)
   if it hasn't already run this session:
   ```bash
   npm run lint
   npm test
   npm run test:e2e:smoke   # if the diff touches components/e2e
   ```
3. **Docs-in-sync.** Per the working agreement, `CLAUDE.md`/`PLAN.md`/
   `README.md` update *with* the commit, not after. If the diff adds a
   component, fixture, gotcha, or milestone and the docs don't reflect it
   yet, fix that before committing, not in a follow-up.

## Scope: one small, cohesive PR

Match `CLAUDE.md`'s "work in milestone-sized increments, each leaving the
repo in a working, committable state":

- One PR = one feature or fix, not a bundle of unrelated changes. If the
  staged diff covers two unrelated things, stop and split it rather than
  committing both together.
- Don't split a *single* cohesive feature across multiple PRs just to make
  each one smaller — a component change, its wiring, its tests, and its doc
  update belong in the same commit (this is how every real commit in this
  repo's history is actually shaped — see `git log`). "Small" means scoped,
  not fragmented.

## Commit message format

Follow the shape already established in this repo's history (e.g.
`acaef41`, `71b6f09`, `6f78fc0` — `git show <sha>` to see them in full).
Avoid the weak outliers also in the log (`update`, `wip`) — those are not
the model to copy.

- **Subject line:** imperative mood, capitalized, no trailing period, no
  ticket/issue numbers, ~50–70 chars. Describes *what* changed concretely
  enough to scan in `git log --oneline`.
  - Good: `Add Lifetime/This week presets to the date range filter`
  - Bad: `update`, `fix stuff`, `wip`
- **Body:** one short paragraph (2–5 sentences), separated from the subject
  by a blank line. Explain the *why* — what problem existed, what the
  change does about it — not a bullet list restating the diff. If a
  follow-on decision or gotcha is worth remembering (the way `CLAUDE.md`
  itself documents them), say it here.
- **Trailer:** if Claude drafted the change, end with a blank line then:
  ```
  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  ```

Use a heredoc so the body renders with real line breaks, not `\n` literals:

```bash
git commit -m "$(cat <<'EOF'
Subject line here

Body paragraph explaining why, in prose.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

## Branch + PR workflow

This repo's early history committed straight to `main`; the current
convention (since PR #1) is a short-lived feature branch + PR per change —
use that going forward unless Alex asks to push directly to `main`.

```bash
git checkout -b <short-kebab-case-branch-name>
git add <specific files>            # never -A/. — see repo-wide git safety rules
git commit -m "..."                 # see format above
git push -u origin <branch-name>
```

Open the PR with a body written to a scratch file (avoids heredoc/quoting
issues inside `gh pr create --body`), structured as:

```markdown
## Summary
- 2-4 bullets, what changed and why, one level of detail above the commit body

## Test plan
- [x] `npm test` — N/N unit tests pass (call out what's new)
- [x] `npm run lint` — clean
- [x] `npm run test:e2e` or `test:e2e:smoke` — N/N e2e pass
- [x] `npm run build` — succeeds
- [x] anything manually verified in the browser (light/dark, real vs fixture data)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

```bash
gh pr create --title "<same style as commit subject>" --body-file /path/to/scratch/pr_body.md
```

Report the PR URL back; don't merge it yourself unless explicitly asked to.

## After merge

Once Alex confirms the PR is merged:

```bash
git checkout main
git pull origin main
git branch -d <branch-name>
```

Ask before deleting the remote branch (`git push origin --delete
<branch-name>`) — leave it if Alex doesn't say either way, it's harmless to
leave around and easy to clean up later.
