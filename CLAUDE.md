# Working conventions for this repo

- Standing authorization: push to `main` (or the active branch) without asking
  for confirmation each time. Commit messages should still follow the normal
  quality bar; just don't pause for a go-ahead before `git push`.
- The `stop-hook-git-check.sh` "Unverified commit" nag (missing GPG signature /
  committer email mismatch) is cosmetic only — ignore it unless it's blocking
  an actual push.
