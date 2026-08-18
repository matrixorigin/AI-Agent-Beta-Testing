#!/usr/bin/env bash

set -euo pipefail

repository="matrixorigin/AI-Agent-Beta-Testing"
from_issue=1
to_issue=999999
execute=false

usage() {
  cat <<'EOF'
usage: scripts/backfill.sh [--from N] [--to N] [--execute]

Lists matching historical Case issues by default. Add --execute to dispatch the
compiled Case Router workflow once per Issue.
EOF
}

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --from)
      from_issue="$2"
      shift 2
      ;;
    --to)
      to_issue="$2"
      shift 2
      ;;
    --execute)
      execute=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

issue_numbers=()
while IFS= read -r issue_number; do
  issue_numbers+=("$issue_number")
done < <(
  gh api --paginate "repos/$repository/issues?state=all&per_page=100" \
    --jq ".[] | select(.pull_request | not) | select(.number >= $from_issue and .number <= $to_issue) | select(.title | test(\"^【.+】【[0-9]{2}/10】\")) | .number"
)

if [[ "${#issue_numbers[@]}" -eq 0 ]]; then
  echo "no matching Case issues found"
  exit 0
fi

printf 'matching issues: %s\n' "${issue_numbers[*]}"
if [[ "$execute" != true ]]; then
  echo "dry run only; add --execute to dispatch workflows"
  exit 0
fi

for issue_number in "${issue_numbers[@]}"; do
  echo "dispatching Case Router for #$issue_number"
  gh workflow run case-router.lock.yml \
    --repo "$repository" \
    --ref main \
    -f "issue_number=$issue_number"
  sleep 1
done
