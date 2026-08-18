#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

required_files=(
  .agents/skills/moi-storybook/SKILL.md
  .agents/skills/moi-storybook/references/single-issue-template.md
  .agents/skills/matrixflow-bug-report/SKILL.md
  .agents/skills/matrixflow-bug-report/references/bug-issue-template.md
  .github/workflows/case-router.md
  .github/workflows/publish-approved.yml
  .github/scripts/publish-draft.cjs
)

for file in "${required_files[@]}"; do
  if [[ ! -s "$file" ]]; then
    echo "required file is missing or empty: $file" >&2
    exit 1
  fi
done

node --check .github/scripts/lib/draft-format.cjs
node --check .github/scripts/publish-draft.cjs
npm test

if command -v gh >/dev/null 2>&1 && gh aw --version >/dev/null 2>&1; then
  gh aw compile .github/workflows/case-router.md
else
  echo "gh-aw is unavailable; skipped agentic workflow compilation" >&2
fi

echo "automation validation passed"
