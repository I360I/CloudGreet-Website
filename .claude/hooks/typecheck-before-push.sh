#!/usr/bin/env bash
# PreToolUse(Bash) hook: block `git push` only when it introduces a NEW
# TypeScript error beyond the known baseline. The repo sets
# ignoreBuildErrors:true (Vercel ships regardless) and carries ~71
# pre-existing errors, so a plain "any error = block" gate would block
# every push. This catches only regressions I actually add.
# No-op for every non-push command (fast exit).
input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // ""')
case "$cmd" in
  *"git push"*)
    ROOT=/Users/anthony/Projects/cloudgreet
    cd "$ROOT" || exit 0
    base="$ROOT/.claude/hooks/tsc-baseline.txt"
    [ -f "$base" ] || exit 0
    current=$(npx tsc --noEmit -p tsconfig.json 2>&1 \
      | grep -E "error TS" | grep -v "\.next/" \
      | sed -E 's/\([0-9]+,[0-9]+\)//' | sort -u)
    newerrs=$(comm -13 "$base" <(printf '%s\n' "$current"))
    if [ -n "$newerrs" ]; then
      echo "Blocking push: new TypeScript error(s) introduced (not in baseline):" >&2
      printf '%s\n' "$newerrs" | head -15 >&2
      echo "Fix these, or if intentional run: npx tsc --noEmit 2>&1 | grep 'error TS' | grep -v .next/ | sed -E 's/\\([0-9]+,[0-9]+\\)//' | sort -u > .claude/hooks/tsc-baseline.txt" >&2
      exit 2
    fi
    ;;
esac
exit 0
