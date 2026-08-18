'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parseDrafts,
  selectLatestDrafts,
  sourceMarker,
} = require('../.github/scripts/lib/draft-format.cjs');

function storybookBlock(title = '[Story Book] 测试项目 — 完成数据分析') {
  return `
<!-- case-automation-draft:v1:storybook -->
Draft-Kind: \`storybook\`
Dedupe-Key: \`test-data-analysis\`
Target-Title: \`${title}\`
Target-Labels: \`storybook\`
Target-Assignee: \`gavin-wang-note\`
Target-Project: \`New MatrixOne Intelligence\`
Source-Issue: \`https://github.com/matrixorigin/AI-Agent-Beta-Testing/issues/66\`

<!-- target-body -->
## 1. Story Book 范围

测试人员使用 MOI 分析数据并生成经过核验的结果，结果提供给团队继续评审。这里保留足够长的正文用于验证解析器，并明确记录输入、操作流程、实际结果、预期结果和下游用途。
<!-- end-case-automation-draft -->`;
}

function bugBlock() {
  return `
<!-- case-automation-draft:v1:bug -->
Draft-Kind: \`bug\`
Dedupe-Key: \`download-result-timeout\`
Target-Title: \`[MOI BUG][结果文件 - 下载]: 文件生成后下载超时\`
Target-Labels: \`bug,kind/bug-moi\`
Target-Assignee: \`\`
Target-Project: \`\`
Source-Issue: \`https://github.com/matrixorigin/AI-Agent-Beta-Testing/issues/66\`

<!-- target-body -->
## 问题描述

结果文件已经生成，但下载操作长时间没有完成，导致用户无法取得本次任务的最终产物。

## 复现步骤

1. 生成结果文件。
2. 点击下载。
3. 观察下载状态。
<!-- end-case-automation-draft -->`;
}

test('parses one storybook draft', () => {
  const drafts = parseDrafts(storybookBlock());
  assert.equal(drafts.length, 1);
  assert.equal(drafts[0].kind, 'storybook');
  assert.equal(drafts[0].assignee, 'gavin-wang-note');
  assert.deepEqual(drafts[0].labels, ['storybook']);
});

test('parses storybook and bug drafts from one comment', () => {
  const drafts = parseDrafts(`${storybookBlock()}\n\n${bugBlock()}`);
  assert.deepEqual(drafts.map((draft) => draft.kind), ['storybook', 'bug']);
});

test('rejects a storybook without required metadata', () => {
  assert.throws(
    () => parseDrafts(storybookBlock('普通标题')),
    /storybook title prefix is missing/,
  );
});

test('selects the newest valid draft comment', () => {
  const comments = [
    { id: 1, created_at: '2026-08-17T00:00:00Z', body: storybookBlock('[Story Book] 旧稿 — 旧标题') },
    { id: 2, created_at: '2026-08-18T00:00:00Z', body: storybookBlock('[Story Book] 新稿 — 新标题') },
  ];
  const selected = selectLatestDrafts(comments);
  assert.equal(selected.comment.id, 2);
  assert.equal(selected.drafts[0].title, '[Story Book] 新稿 — 新标题');
});

test('builds a stable target source marker', () => {
  const [draft] = parseDrafts(storybookBlock());
  assert.equal(
    sourceMarker('matrixorigin/AI-Agent-Beta-Testing', 66, draft),
    '<!-- case-automation-source:v1 repo=matrixorigin/AI-Agent-Beta-Testing issue=66 kind=storybook dedupe=test-data-analysis -->',
  );
});
