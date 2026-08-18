# MatrixFlow BUG Issue Template

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

## Drafting Notes

- Do not invent external facts.
- Use completion mode by default: derive missing sections from the user's own description when possible.
- Use strict mode only when the user explicitly asks not to complete or infer missing sections.
- In completion mode, derive missing sections only from the user's own description or clearly implied user flow.
- Use `未确认：...` only when the user provided ambiguous information that needs verification.
- Keep reproduction steps numbered and actionable.
- Separate actual result from expected result.
- For UI layout or usability bugs, only include usability reasoning the user provided or clearly implied.
- For table/list bugs, only mention column order, high-frequency fields, narrow width, or horizontal scroll if the user provided or clearly implied those details.
- Make acceptance criteria checkable. In completion mode, derive acceptance criteria by restating the user's expected result; do not introduce new requirements.
- Put screenshot image Markdown at the end of `问题描述`.
- Do not describe screenshot contents in `问题描述`; let the image stand as evidence.
- Put raw logs in fenced code blocks.
- Use links for related issues, PRs, pages, or screenshots.
- If the issue came from Acceptance verification, mention the source issue and ask before creating a sub-issue.

## Drafting Modes

Strict mode:

- Use only when the user explicitly asks not to complete or infer missing sections.
- Do not fill missing sections.
- Mark missing sections as `未提供`.

Completion mode:

- Use by default.
- Fill sections by reorganizing and lightly deriving from user-provided language.
- Do not add external facts, environment, URLs, screenshots, parent issues, technical root cause, or unmentioned product behavior.
- Show which sections were derived before asking for confirmation.

## User Input Contract

Ask for this format when the user wants to know what to provide:

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

## Confirmation Checklist

Before submitting, confirm:

- Repository: `matrixorigin/matrixflow`
- Title
- Body
- Labels
- Issue type
- Submission mode: standalone issue or sub-issue of the specified parent
