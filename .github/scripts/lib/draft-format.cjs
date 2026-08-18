'use strict';

const START = '<!-- case-automation-draft:v1:';
const END = '<!-- end-case-automation-draft -->';
const BODY = '<!-- target-body -->';

function readField(header, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = header.match(new RegExp(`^${escaped}:\\s*(.*)$`, 'm'));
  if (!match) return '';
  return match[1].trim().replace(/^`|`$/g, '').trim();
}

function normalizeLabels(value) {
  if (!value) return [];
  return value
    .split(',')
    .map((label) => label.trim())
    .filter(Boolean);
}

function validateDraft(draft) {
  const errors = [];
  if (!['storybook', 'bug'].includes(draft.kind)) errors.push('unsupported Draft-Kind');
  if (!/^[a-z0-9][a-z0-9-]{2,100}$/.test(draft.dedupeKey)) errors.push('invalid Dedupe-Key');
  if (!draft.title || draft.title.length > 240) errors.push('invalid Target-Title');
  if (!draft.sourceIssue.startsWith('https://github.com/')) errors.push('invalid Source-Issue');
  if (!draft.body || draft.body.length < 80) errors.push('Target body is too short');

  if (draft.kind === 'storybook') {
    if (!draft.title.startsWith('[Story Book]')) errors.push('storybook title prefix is missing');
    if (!draft.labels.includes('storybook')) errors.push('storybook label is missing');
    if (draft.assignee !== 'gavin-wang-note') errors.push('unexpected storybook assignee');
    if (draft.project !== 'New MatrixOne Intelligence') errors.push('unexpected storybook project');
  }

  if (draft.kind === 'bug') {
    if (!draft.title.startsWith('[MOI BUG]')) errors.push('bug title prefix is missing');
    if (!draft.labels.includes('bug') || !draft.labels.includes('kind/bug-moi')) {
      errors.push('default bug labels are missing');
    }
    if (draft.project) errors.push('bug drafts must not set a project');
  }

  if (errors.length) {
    throw new Error(`Invalid ${draft.kind || 'unknown'} draft: ${errors.join('; ')}`);
  }
}

function parseDraftBlock(kindFromMarker, block) {
  const bodyIndex = block.indexOf(BODY);
  if (bodyIndex < 0) throw new Error(`Draft ${kindFromMarker} is missing ${BODY}`);

  const header = block.slice(0, bodyIndex);
  const body = block.slice(bodyIndex + BODY.length).trim();
  const kind = readField(header, 'Draft-Kind');
  if (kind !== kindFromMarker) {
    throw new Error(`Draft marker kind ${kindFromMarker} does not match Draft-Kind ${kind}`);
  }

  const draft = {
    kind,
    dedupeKey: readField(header, 'Dedupe-Key'),
    title: readField(header, 'Target-Title'),
    labels: normalizeLabels(readField(header, 'Target-Labels')),
    assignee: readField(header, 'Target-Assignee'),
    project: readField(header, 'Target-Project'),
    sourceIssue: readField(header, 'Source-Issue'),
    body,
  };
  validateDraft(draft);
  return draft;
}

function parseDrafts(text) {
  if (typeof text !== 'string') return [];
  const drafts = [];
  let cursor = 0;

  while (true) {
    const start = text.indexOf(START, cursor);
    if (start < 0) break;
    const markerEnd = text.indexOf('-->', start);
    if (markerEnd < 0) throw new Error('Unterminated draft start marker');
    const kind = text.slice(start + START.length, markerEnd).trim();
    const end = text.indexOf(END, markerEnd + 3);
    if (end < 0) throw new Error(`Draft ${kind} is missing end marker`);
    const block = text.slice(markerEnd + 3, end);
    drafts.push(parseDraftBlock(kind, block));
    cursor = end + END.length;
  }

  const kinds = drafts.map((draft) => draft.kind);
  if (new Set(kinds).size !== kinds.length) throw new Error('A comment contains duplicate draft kinds');
  return drafts;
}

function selectLatestDrafts(comments) {
  const sorted = [...comments].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  for (const comment of sorted) {
    if (!comment.body || !comment.body.includes(START)) continue;
    const drafts = parseDrafts(comment.body);
    if (drafts.length) return { comment, drafts };
  }
  throw new Error('No valid case automation draft comment was found');
}

function sourceMarker(sourceRepo, issueNumber, draft) {
  return `<!-- case-automation-source:v1 repo=${sourceRepo} issue=${issueNumber} kind=${draft.kind} dedupe=${draft.dedupeKey} -->`;
}

function publishedMarker(kind, url) {
  return `<!-- case-automation-published:v1:${kind} -->\nTarget-Issue: ${url}`;
}

module.exports = {
  parseDrafts,
  selectLatestDrafts,
  sourceMarker,
  publishedMarker,
  validateDraft,
};
