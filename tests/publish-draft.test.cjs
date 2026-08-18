'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const publishDraft = require('../.github/scripts/publish-draft.cjs');

const draftComment = `
<!-- case-automation-draft:v1:storybook -->
Draft-Kind: \`storybook\`
Dedupe-Key: \`verified-data-analysis\`
Target-Title: \`[Story Book] 探索验证 — 完成数据分析\`
Target-Labels: \`storybook\`
Target-Assignee: \`gavin-wang-note\`
Target-Project: \`New MatrixOne Intelligence\`
Source-Issue: \`https://github.com/matrixorigin/AI-Agent-Beta-Testing/issues/66\`

<!-- target-body -->
## 1. Story Book 范围

测试人员通过 MOI 读取公开数据，执行结构化分析，核对输出并把结果交给团队继续评审。正文记录输入、操作、实际结果、预期结果、证据边界和下游用途。
<!-- end-case-automation-draft -->`;

function createCore() {
  const summary = {
    addHeading() { return this; },
    addLink() { return this; },
    addEOL() { return this; },
    addRaw() { return this; },
    async write() {},
  };
  return {
    info() {},
    warning() {},
    summary,
  };
}

function createGithub(permission = 'write', duplicate = null) {
  const calls = {
    created: [],
    updated: [],
    comments: [],
    labels: [],
    removed: [],
    graphql: [],
  };
  const github = {
    rest: {
      repos: {
        async getCollaboratorPermissionLevel() {
          return { data: { permission } };
        },
      },
      issues: {
        async listComments() {},
        async create(params) {
          calls.created.push(params);
          return {
            data: {
              number: 1001,
              node_id: 'ISSUE_NODE',
              html_url: 'https://github.com/matrixorigin/matrixflow/issues/1001',
              body: params.body,
            },
          };
        },
        async update(params) {
          calls.updated.push(params);
          return {
            data: {
              number: params.issue_number,
              node_id: 'ISSUE_NODE',
              html_url: `https://github.com/matrixorigin/matrixflow/issues/${params.issue_number}`,
              body: params.body,
            },
          };
        },
        async createComment(params) { calls.comments.push(params); },
        async addLabels(params) { calls.labels.push(params); },
        async removeLabel(params) { calls.removed.push(params); },
        async get() { throw new Error('unexpected get'); },
      },
      search: {
        async issuesAndPullRequests() { return { data: { items: duplicate ? [duplicate] : [] } }; },
      },
    },
    async paginate() {
      return [{
        id: 50,
        created_at: '2026-08-18T00:00:00Z',
        body: draftComment,
        user: { type: 'Bot', login: 'github-actions[bot]' },
      }];
    },
    async graphql(query, variables) {
      calls.graphql.push({ query, variables });
      if (query.includes('projectsV2')) {
        return {
          organization: {
            projectsV2: {
              nodes: [{ id: 'PROJECT_NODE', title: 'New MatrixOne Intelligence' }],
            },
          },
        };
      }
      return { addProjectV2ItemById: { item: { id: 'ITEM_NODE' } } };
    },
  };
  return { github, calls };
}

const context = {
  actor: 'maintainer',
  repo: { owner: 'matrixorigin', repo: 'AI-Agent-Beta-Testing' },
  payload: {
    label: { name: 'publish/approved' },
    issue: { number: 66 },
  },
};

test('publishes an approved storybook, adds project metadata, and back-links source', async () => {
  const { github, calls } = createGithub();
  await publishDraft({ github, context, core: createCore() });

  assert.equal(calls.created.length, 1);
  assert.deepEqual(calls.created[0].labels, ['storybook']);
  assert.deepEqual(calls.created[0].assignees, ['gavin-wang-note']);
  assert.match(calls.created[0].body, /case-automation-source:v1/);
  assert.equal(calls.graphql.length, 2);
  assert.equal(calls.comments.length, 1);
  assert.match(calls.comments[0].body, /case-automation-published:v1:storybook/);
  assert.deepEqual(calls.labels[0].labels, ['publish/synced']);
  assert.equal(calls.removed[0].name, 'publish/approved');
});

test('rejects approval from a read-only actor before publishing', async () => {
  const { github, calls } = createGithub('read');
  await assert.rejects(
    () => publishDraft({ github, context, core: createCore() }),
    /cannot approve publication/,
  );
  assert.equal(calls.created.length, 0);
});

test('recovers a target created by a partial previous publish', async () => {
  const duplicate = {
    number: 1000,
    title: '[Story Book] 探索验证 — 完成数据分析',
    html_url: 'https://github.com/matrixorigin/matrixflow/issues/1000',
    body: '<!-- case-automation-source:v1 repo=matrixorigin/AI-Agent-Beta-Testing issue=66 kind=storybook dedupe=verified-data-analysis -->',
  };
  const { github, calls } = createGithub('write', duplicate);
  await publishDraft({ github, context, core: createCore() });

  assert.equal(calls.created.length, 0);
  assert.equal(calls.updated.length, 1);
  assert.equal(calls.updated[0].issue_number, 1000);
  assert.match(calls.comments[0].body, /matrixflow\/issues\/1000/);
});
