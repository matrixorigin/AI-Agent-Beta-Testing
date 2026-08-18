#!/usr/bin/env bash

set -euo pipefail
set +x

readonly expected_login="WingWR"
readonly github_host="github.com"

if [[ "$#" -eq 0 ]]; then
  echo "usage: gh-wingwr.sh <gh arguments...>" >&2
  exit 2
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "gh is required but was not found" >&2
  exit 127
fi

pat="$(env -u GH_TOKEN -u GITHUB_TOKEN gh auth token --hostname "$github_host" --user "$expected_login")"
if [[ -z "$pat" ]]; then
  echo "no local PAT is available for GitHub user $expected_login" >&2
  exit 1
fi

actual_login="$(GH_TOKEN="$pat" GITHUB_TOKEN="$pat" gh api /user --jq '.login')"
if [[ "$actual_login" != "$expected_login" ]]; then
  echo "GitHub identity mismatch: expected $expected_login, got $actual_login" >&2
  exit 1
fi

GH_TOKEN="$pat" GITHUB_TOKEN="$pat" exec gh "$@"
