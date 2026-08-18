---
name: matrixflow-bug-report
description: Create structured BUG issue drafts for the MatrixOrigin matrixflow repository and, after explicit user confirmation, submit them as standalone GitHub issues or sub-issues. Use when the user wants to report, draft, refine, or submit a MatrixFlow/New MOI bug, especially bugs found during Acceptance verification, workflow testing, or UI testing.
---

# MatrixFlow BUG Report

## Purpose

Use this skill to turn a user's bug description into a clear GitHub issue for `matrixorigin/matrixflow`. Produce a draft first, ask for confirmation, and only submit to GitHub after the user explicitly approves. Submission is limited to a standalone issue or an explicitly confirmed sub-issue; never inspect or modify GitHub Projects.

Default repository: `matrixorigin/matrixflow`.

## Required Boundary

- Do not submit an issue until the user confirms the final draft.
- Hard identity rule: perform all GitHub write actions for this skill with the local PAT stored by `gh auth` for GitHub user `WingWR`. Run GitHub commands through `scripts/gh-wingwr.sh`; it retrieves that specific PAT, verifies `/user` returns exactly `WingWR`, and only then runs the requested command. If the PAT is unavailable, the identity differs, or verification fails, stop before writing and ask the user to fix local authentication.
- Never use a GitHub connector, MCP server, app write tool, ambient `GH_TOKEN`, or another GitHub identity for writes in this skill. Connector tools may be used for read-only lookups only.
- Never print, log, echo, persist, or include the PAT in command arguments or tool output. Let `scripts/gh-wingwr.sh` handle it in process-local environment variables.
- Never query, inspect, add, update, or move GitHub Project items or Project fields. Do not call ProjectV2 APIs, GitHub Project tools, or `gh project` as part of this skill, even for preflight checks.
- If the user asks for Project handling, state that it is outside this skill's submission scope and do not perform it.
- Limit GitHub writes to creating the confirmed issue, applying confirmed issue metadata, and optionally adding the confirmed parent/sub-issue relationship. Do not post comments, change issue state, or mutate other issues.
- Add a sub-issue relationship only when the user explicitly asks and confirms the parent issue.
- Do not decide severity, acceptance pass/fail, or final workflow status for the user.
- Ask before adding labels, assignees, or parent/sub-issue links.
- Do not invent external facts, environment details, screenshots, logs, URLs, parent issues, assignees, or labels as applied actions.
- Rewrite, organize, polish, and by default derive reasonable issue sections from the user's own language.
- Use strict mode only when the user explicitly says "不要补全", "严格按我提供的写", "缺失就写未提供", or similar.
- In default completion mode, make derived content traceable to the user's description. Do not add product behavior, affected modules, specific UI paths, or technical causes that the user did not provide.
- If a section has no user-provided or user-derived information, write `未提供` for that section or field.
- If information is unclear, write `未确认：...` and list it under missing or uncertain fields.
- Ask for missing information after showing the draft. If the user asked for completion, also list which sections were derived from the description.

## Workflow

1. Parse the user's bug report into title, problem description, reproduction steps, actual result, expected result, impact, and acceptance criteria.
2. If the user gives screenshots, include the image link at the end of `问题描述` without adding extra prose that describes the screenshot contents. If the user gives logs, URLs, issue numbers, or PRs, include them in the relevant section without inventing extra facts.
3. Choose drafting mode:
   - Completion mode by default: derive missing sections from the user's own description without adding external facts.
   - Strict mode only when explicitly requested: use only fields the user explicitly provided; mark missing sections as `未提供`.
4. Draft the issue using the template in `references/bug-issue-template.md`.
5. Show the title and body to the user for confirmation, including missing, uncertain, and derived fields.
6. Ask these confirmation questions before any write:
   - 是否提交到 `matrixorigin/matrixflow`？
   - 是否添加默认 labels？
   - 是否作为独立 issue 提交，或作为指定父 issue 的 sub-issue？
7. After explicit confirmation, create the GitHub issue and, only for the confirmed sub-issue mode, add the parent/sub-issue relationship.
8. Report the created issue URL, submission mode, and any issue fields that were or were not applied.

## Title Format

Prefer:

```text
[MOI BUG][模块 - 子模块]: 简短问题现象
```

Examples:

```text
[MOI BUG][工作流 - 自定义 Python 节点]: 脚本节点配置保存后重新打开丢失内容
[MOI BUG][知识库 - 结构化表]: 导入成功后 Catalog 未展示目标表
```

If the module is unclear, use:

```text
[MOI BUG][待确认]: 简短问题现象
```

## Body Format

Use these main sections by default:

```markdown
## 问题描述

未提供

![截图](图片路径或链接)

## 复现步骤

未提供

## 实际结果

未提供

## 预期结果

未提供

## 影响

未提供

## 验收标准

未提供

```

Keep the language concrete and reproducible. Preserve the user's wording when it carries product meaning, but normalize the wording so another engineer can understand it. Do not add external facts. For UI layout or usability bugs, describe position, order, visibility, interaction, and acceptance criteria only when the user's description provides or clearly implies those details.

If the user provides screenshots, place the image Markdown at the end of `问题描述` without narrating the image content. Do not write "从截图可见..." or otherwise describe screenshot contents. Use the user's textual description for the problem statement. Environment details, source issue links, URLs, logs, or browser information can go in the most relevant section when the user asks.

## User Input Contract

Ask the user to provide any of these fields when they want maximum precision. They may provide only a short natural-language description; by default, derive a complete draft from it when possible.

```markdown
模块：

问题描述：

复现步骤：
1.
2.
3.

实际结果：

预期结果：

影响：

验收标准：
-
-

截图 / 日志 / 链接：

父 issue / 关联需求：
```

When polishing:

- Keep every section grounded in the user's input.
- Convert prose into clearer issue language without changing meaning.
- In default completion mode, create concise reproduction steps only from the user's described flow. For example, if the user says "enter text, then select model, input clears", steps may be "enter page", "input requirement", "select model", "observe input".
- In default completion mode, acceptance criteria may restate the expected behavior as checkable bullets, but must not introduce new requirements.
- In strict mode, do not create reproduction steps or acceptance criteria unless the user explicitly provided them.
- When screenshots are provided, add image Markdown at the end of `问题描述` and do not narrate their visual content.
- Do not infer labels, parent issue, assignee, or status as applied actions. Present them as proposals only.

## Defaults

Default labels to propose:

- `bug`
- `kind/bug-moi`

Do not apply these defaults without user confirmation. Do not derive labels or any other behavior from GitHub Project membership.

## GitHub Tooling

Use the bundled `scripts/gh-wingwr.sh` wrapper for every authenticated GitHub command. Resolve the script relative to this skill directory; do not copy its token-handling logic into ad hoc shell commands. The wrapper ignores ambient GitHub token variables, loads the PAT explicitly stored for `WingWR`, verifies the same PAT against `/user`, and fails closed before running the requested command.

Before creating an issue:

1. Run `scripts/gh-wingwr.sh api /user --jq '.login'` and confirm the result is exactly `WingWR`.
2. Search existing issues to avoid obvious duplicates. Use focused queries from the title and key symptoms.
3. Confirm requested labels exist.
4. Check issue types if setting `type`.

When creating the issue:

- Run `scripts/gh-wingwr.sh issue create ...`; do not call a connector or MCP write tool.
- Use repository owner `matrixorigin`.
- Use repository name `matrixflow`.
- Use issue type `Bug` only if issue types are available.
- Apply confirmed labels only.
- If linking to a parent issue or creating a sub-issue, confirm both issue numbers first and use `scripts/gh-wingwr.sh api ...` for the relationship write.
- After creation, read the issue back through `scripts/gh-wingwr.sh issue view ... --json author,url,number,title,labels` and verify `author.login` is `WingWR`. If not, stop, report the mismatch, and perform no further writes.
- Do not use Project or ProjectV2 APIs.

## Acceptance Bug Mode

When the bug is found while verifying an Acceptance item:

1. Include the source Acceptance issue in `问题描述` or `影响`.
2. State that the bug was found during acceptance if it helps the assignee understand context.
3. Ask whether to make the new bug a sub-issue of the source issue.
4. Do not comment on or otherwise change the source issue; the confirmed parent/sub-issue relationship is the only parent mutation in this workflow.

## Output Before Confirmation

Always show:

- Proposed title
- Proposed body
- Proposed labels
- Proposed submission mode: standalone issue or sub-issue of the specified parent
- Missing or uncertain fields
- A note identifying whether strict mode or completion mode was used
- A note listing any sections derived from the user's description

Then ask for confirmation in one concise question.
