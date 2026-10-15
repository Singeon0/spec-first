#!/usr/bin/env bash
# Print, as one JSON object, the repository state the spec-first:run workflow
# needs. Pass the output verbatim as args.repo. Changes nothing.
# Usage: repo-state.sh PROJECT_ROOT SESSION_DIR
#   SESSION_DIR: your primary working directory — where sub-agents start.
root=${1:?usage: repo-state.sh PROJECT_ROOT SESSION_DIR}
session=${2:?usage: repo-state.sh PROJECT_ROOT SESSION_DIR}

esc() { sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e 's/	/\\t/g'; }
str() { printf '"%s"' "$(printf '%s' "$1" | esc)"; }

cwdTop=$(git -C "$session" rev-parse --show-toplevel 2>/dev/null)
rootTop=$(git -C "$root" rev-parse --show-toplevel 2>/dev/null)
if [ -z "$rootTop" ]; then
  printf '{"isRepo":false,"clean":false,"head":"","baseline":"","cwdTopLevel":%s,"rootTopLevel":"","untrackedAtStart":[]}\n' "$(str "$cwdTop")"
  exit 0
fi
head=$(git -C "$root" rev-parse --verify -q HEAD 2>/dev/null)
baseline=$(git -C "$root" stash create 2>/dev/null)
[ -n "$baseline" ] || baseline=$head
clean=false
[ -z "$(git -C "$root" status --porcelain 2>/dev/null)" ] && clean=true
untracked=$(git -C "$root" ls-files -z --others --exclude-standard 2>/dev/null | tr '\0' '\n' | esc | awk 'NR>1{printf ","} {printf "\"%s\"", $0}')

printf '{"isRepo":true,"clean":%s,"head":%s,"baseline":%s,"cwdTopLevel":%s,"rootTopLevel":%s,"untrackedAtStart":[%s]}\n' \
  "$clean" "$(str "$head")" "$(str "$baseline")" "$(str "$cwdTop")" "$(str "$rootTop")" "$untracked"
