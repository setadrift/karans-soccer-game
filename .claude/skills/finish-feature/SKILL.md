---
name: finish-feature
description: "Review, commit, push, and create a PR for the current feature branch. USE WHEN user says /finish-feature, 'ship it', 'create a PR', or 'push and open PR'."
allowed-tools:
  - Bash
  - Read
  - Write
  - Grep
  - Glob
  - Edit
user-invocable: true
---

# /finish-feature

Finalize the current feature branch: review all changes, commit, push, and create a PR.

## Steps

1. **Verify not on main** (`git branch --show-current`). If on main, STOP.

2. **Gather the full diff**:
   ```bash
   git status
   git diff --stat HEAD $(git merge-base HEAD origin/main)
   git log --oneline $(git merge-base HEAD origin/main)..HEAD
   ```

3. **Thorough review (DO NOT SKIP)**:
   - Read every modified file's diff in full
   - Cross-reference consistency (grep for siblings of new identifiers)
   - Check imports and references
   - Run type checks if applicable (`npx tsc --noEmit`)
   - Fix any issues before continuing

4. **Stage files**: Stage specific files by name (never `git add -A` or `git add .`). Skip secrets and unrelated files.

5. **Commit**: Conventional commit message (`feat:`, `fix:`, `chore:`, etc.). Include `Co-Authored-By: Codex <noreply@anthropic.com>`. Use HEREDOC format.

6. **Push**: `git push -u origin <branch-name>`

7. **Create PR**:
   ```bash
   gh pr create --title "<title>" --body "<summary + test plan>"
   ```

8. **Wait for CI**: Check `gh pr checks` after ~60s. If failures, investigate and fix.

9. **Report**: Print PR URL and CI status.

## Notes

- PR targets `main` by default
- Never force-push
- Never amend -- create new commits for fixes
- The review step is mandatory even if you just wrote the code
