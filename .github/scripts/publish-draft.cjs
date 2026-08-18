'use strict';

const {
  selectLatestDrafts,
  sourceMarker,
  publishedMarker,
} = require('./lib/draft-format.cjs');

const WRITE_PERMISSIONS = new Set(['admin', 'maintain', 'write', 'triage']);

function splitRepo(value) {
  const parts = String(value || '').split('/');
  if (parts.length !== 2 || parts.some((part) => !part)) {
    throw new Error(`Invalid repository name: ${value}`);
  }
  return { owner: parts[0], repo: parts[1] };
}

function targetNumberFromUrl(url, target) {
  const escaped = `${target.owner}/${target.repo}`.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = String(url).match(new RegExp(`github\\.com/${escaped}/issues/(\\d+)`));
  return match ? Number(match[1]) : null;
}

async function assertApprover(github, source, actor) {
  const response = await github.rest.repos.getCollaboratorPermissionLevel({
    ...source,
    username: actor,
  });
  const permission = response.data.permission;
  if (!WRITE_PERMISSIONS.has(permission)) {
    throw new Error(`Actor ${actor} has ${permission} permission and cannot approve publication`);
  }
}

async function listSourceComments(github, source, issueNumber) {
  return github.paginate(github.rest.issues.listComments, {
    ...source,
    issue_number: issueNumber,
    per_page: 100,
  });
}

function findPublishedTarget(comments, kind, target) {
  const marker = `<!-- case-automation-published:v1:${kind} -->`;
  const sorted = [...comments].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  for (const comment of sorted) {
    if (!comment.body || !comment.body.includes(marker)) continue;
    const match = comment.body.match(/^Target-Issue:\s*(https:\/\/github\.com\/[^\s]+)$/m);
    if (!match) continue;
    const number = targetNumberFromUrl(match[1], target);
    if (number) return { number, url: match[1] };
  }
  return null;
}

async function findExactTitle(github, target, title) {
  const safeTitle = title.replace(/["\\]/g, ' ').trim();
  const response = await github.rest.search.issuesAndPullRequests({
    q: `repo:${target.owner}/${target.repo} is:issue in:title "${safeTitle}"`,
    per_page: 20,
  });
  return response.data.items.find((item) => item.title === title) || null;
}

async function discoverBugIssueType(github, owner, core) {
  try {
    const response = await github.request('GET /orgs/{org}/issue-types', { org: owner });
    const types = Array.isArray(response.data) ? response.data : response.data.issue_types || [];
    const bug = types.find((item) => String(item.name).toLowerCase() === 'bug');
    return bug ? bug.name : '';
  } catch (error) {
    if (error.status !== 404 && error.status !== 403) {
      core.warning(`Unable to inspect issue types: ${error.message}`);
    }
    return '';
  }
}

function targetBody(sourceRepo, sourceNumber, draft) {
  const marker = sourceMarker(sourceRepo, sourceNumber, draft);
  const backlink = `\n\n---\n\n来源 Case：https://github.com/${sourceRepo}/issues/${sourceNumber}`;
  return `${marker}\n${draft.body.trim()}${backlink}`;
}

async function createOrUpdateTarget({
  github,
  core,
  target,
  sourceRepo,
  sourceNumber,
  draft,
  previous,
  bugIssueType,
}) {
  const body = targetBody(sourceRepo, sourceNumber, draft);
  const assignees = draft.assignee ? [draft.assignee] : [];

  if (previous) {
    const response = await github.rest.issues.update({
      ...target,
      issue_number: previous.number,
      title: draft.title,
      body,
      labels: draft.labels,
      assignees,
    });
    core.info(`Updated ${draft.kind} issue ${response.data.html_url}`);
    return response.data;
  }

  const duplicate = await findExactTitle(github, target, draft.title);
  if (duplicate) {
    const expectedMarker = sourceMarker(sourceRepo, sourceNumber, draft);
    if (String(duplicate.body || '').includes(expectedMarker)) {
      const response = await github.rest.issues.update({
        ...target,
        issue_number: duplicate.number,
        title: draft.title,
        body,
        labels: draft.labels,
        assignees,
      });
      core.info(`Recovered ${draft.kind} issue ${response.data.html_url} after a partial previous publish.`);
      return response.data;
    }
    const error = new Error(`Exact-title candidate already exists: ${duplicate.html_url}`);
    error.duplicateUrl = duplicate.html_url;
    throw error;
  }

  const params = {
    ...target,
    title: draft.title,
    body,
    labels: draft.labels,
    assignees,
  };
  if (draft.kind === 'bug' && bugIssueType) params.type = bugIssueType;

  let response;
  try {
    response = await github.rest.issues.create(params);
  } catch (error) {
    if (params.type && error.status === 422) {
      core.warning('Target repository exposed a Bug issue type but rejected it during creation; creating without issue type.');
      delete params.type;
      response = await github.rest.issues.create(params);
    } else {
      throw error;
    }
  }
  core.info(`Created ${draft.kind} issue ${response.data.html_url}`);
  return response.data;
}

async function ensureProjectItem(github, targetOwner, issueNodeId, projectTitle) {
  const query = `
    query($login: String!) {
      organization(login: $login) {
        projectsV2(first: 100) { nodes { id title } }
      }
    }
  `;
  const data = await github.graphql(query, { login: targetOwner });
  const project = data.organization.projectsV2.nodes.find((item) => item.title === projectTitle);
  if (!project) throw new Error(`Project not found: ${projectTitle}`);

  const mutation = `
    mutation($projectId: ID!, $contentId: ID!) {
      addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) {
        item { id }
      }
    }
  `;
  try {
    await github.graphql(mutation, { projectId: project.id, contentId: issueNodeId });
  } catch (error) {
    if (!String(error.message).toLowerCase().includes('already')) throw error;
  }
}

async function appendRelatedTargets(github, target, results) {
  if (results.length < 2) return;
  for (const result of results) {
    const others = results
      .filter((candidate) => candidate.kind !== result.kind)
      .map((candidate) => `- ${candidate.kind === 'bug' ? '关联 Bug' : '关联 Storybook'}：${candidate.issue.html_url}`)
      .join('\n');
    const current = await github.rest.issues.get({ ...target, issue_number: result.issue.number });
    if (current.data.body.includes(others)) continue;
    await github.rest.issues.update({
      ...target,
      issue_number: result.issue.number,
      body: `${current.data.body}\n\n## 自动化关联产物\n\n${others}`,
    });
  }
}

async function markSource({ github, source, sourceNumber, results, warnings }) {
  const lines = results.map((result) => publishedMarker(result.kind, result.issue.html_url));
  const warningText = warnings.length
    ? `\n\n### 未完整应用的元数据\n\n${warnings.map((warning) => `- ${warning}`).join('\n')}`
    : '';
  await github.rest.issues.createComment({
    ...source,
    issue_number: sourceNumber,
    body: `${lines.join('\n\n')}\n\n已按批准草稿发布到 \`matrixorigin/matrixflow\`。${warningText}`,
  });
  await github.rest.issues.addLabels({
    ...source,
    issue_number: sourceNumber,
    labels: warnings.length ? ['publish/blocked'] : ['publish/synced'],
  });
  try {
    await github.rest.issues.removeLabel({
      ...source,
      issue_number: sourceNumber,
      name: 'publish/approved',
    });
  } catch (error) {
    if (error.status !== 404) throw error;
  }
}

module.exports = async function publishDraft({ github, context, core }) {
  const source = { owner: context.repo.owner, repo: context.repo.repo };
  const sourceRepo = `${source.owner}/${source.repo}`;
  const sourceNumber = context.payload.issue.number;
  const target = splitRepo(process.env.TARGET_REPOSITORY || 'matrixorigin/matrixflow');
  const projectTitle = process.env.STORYBOOK_PROJECT || 'New MatrixOne Intelligence';

  if (context.payload.label.name !== 'publish/approved') {
    core.info('Ignoring a label event that is not publish/approved.');
    return;
  }

  await assertApprover(github, source, context.actor);
  const comments = await listSourceComments(github, source, sourceNumber);
  const selected = selectLatestDrafts(comments);
  if (!selected.comment.user || selected.comment.user.type !== 'Bot') {
    throw new Error(`Latest draft comment was not authored by a GitHub bot: ${selected.comment.html_url}`);
  }

  const expectedSource = `https://github.com/${sourceRepo}/issues/${sourceNumber}`;
  for (const draft of selected.drafts) {
    if (draft.sourceIssue !== expectedSource) {
      throw new Error(`Draft source mismatch: expected ${expectedSource}, got ${draft.sourceIssue}`);
    }
  }

  const bugIssueType = selected.drafts.some((draft) => draft.kind === 'bug')
    ? await discoverBugIssueType(github, target.owner, core)
    : '';
  const results = [];
  const warnings = [];

  for (const draft of selected.drafts) {
    const previous = findPublishedTarget(comments, draft.kind, target);
    try {
      const issue = await createOrUpdateTarget({
        github,
        core,
        target,
        sourceRepo,
        sourceNumber,
        draft,
        previous,
        bugIssueType,
      });
      results.push({ kind: draft.kind, issue });

      if (draft.kind === 'storybook') {
        try {
          await ensureProjectItem(github, target.owner, issue.node_id, projectTitle);
        } catch (error) {
          warnings.push(`${issue.html_url} 未加入 Project \`${projectTitle}\`：${error.message}`);
        }
      }
    } catch (error) {
      if (error.duplicateUrl) {
        await github.rest.issues.createComment({
          ...source,
          issue_number: sourceNumber,
          body: `发布已停止：发现同标题 Open/Closed 候选 ${error.duplicateUrl}。请完成正文级查重后重新生成或明确更新目标。`,
        });
        await github.rest.issues.addLabels({
          ...source,
          issue_number: sourceNumber,
          labels: ['publish/blocked', 'route/duplicate'],
        });
      }
      throw error;
    }
  }

  await appendRelatedTargets(github, target, results);
  await markSource({ github, source, sourceNumber, results, warnings });

  core.summary.addHeading('Published MatrixFlow issues');
  for (const result of results) {
    core.summary.addLink(`${result.kind}: #${result.issue.number}`, result.issue.html_url).addEOL();
  }
  if (warnings.length) core.summary.addRaw(warnings.join('\n'));
  await core.summary.write();
};
