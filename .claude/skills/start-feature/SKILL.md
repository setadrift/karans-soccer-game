---
name: start-feature
description: "Create a new git feature branch from origin/main. USE WHEN user says /start-feature, 'start a new feature', 'create a branch', or begins new work."
allowed-tools:
  - Bash
  - Read
user-invocable: true
---

# /start-feature

Create a new feature branch from `origin/main` for isolated development.

**Key principle**: Never run `git checkout main`. This avoids disrupting other worktrees.

## Steps

1. **Check working tree is clean**:
   ```bash
   git status --porcelain
   ```
   If non-empty, STOP and tell the user to commit or stash first.

2. **Parse branch name from $ARGUMENTS**:
   - Convert to kebab-case
   - Prefix with `feat/`, `fix/`, `chore/`, `refactor/`, `perf/`, `docs/`, or `test/`
   - Default to `feat/` if no type is obvious
   - If `$ARGUMENTS` already has a prefix, use as-is

3. **Fetch and create**:
   ```bash
   git fetch origin main
   git checkout -b <branch-name> origin/main
   ```

4. **Confirm**: Print the branch name, working directory, and remind to use `/finish-feature` when done.

## Batching

Batch small tasks into one PR to reduce deployment churn:
```
/start-feature batch/march-improvements
  -> work on task 1 -> /park
  -> work on task 2 -> /park
  -> work on task 3 -> /finish-feature
```
