import { createCourseComparisonPage } from './course-comparison-page.mjs';

const page = createCourseComparisonPage();
const byId = id => document.getElementById(id);
const element = (tag, text, className) => {
  const result = document.createElement(tag);
  if (text !== undefined) result.textContent = text;
  if (className) result.className = className;
  return result;
};
const roleLabel = role => role === 'before' ? 'Earlier' : 'Revised';
const quoted = value => JSON.stringify(value);
const literal = value => element('pre', value, 'text-value');
let shownReport = null;
function status(message) { byId('comparison-status').textContent = message; }

function fileDetails(role, state) {
  const area = byId('details-' + role);
  area.replaceChildren();
  const copy = state.slots[role];
  if (copy) {
    area.append(element('p', copy.name, 'filename literal'),
      element('p', copy.title, 'literal'),
      element('p', copy.questions + ' questions · ' + copy.concepts + ' concepts · ' + copy.bytes.toLocaleString('en-US') + ' captured bytes'),
      element('p', 'SHA-256 ' + copy.sha256, 'fingerprint'));
  } else area.append(element('p', 'No ' + roleLabel(role).toLowerCase() + ' course loaded.'));
  if (state.pending[role]) area.append(element('p', 'Reading replacement… The comparison is retired.', 'loading'));
  const error = byId('error-' + role);
  error.textContent = state.errors[role];
  error.hidden = !state.errors[role];
  byId('clear-' + role).disabled = !copy && !state.pending[role];
}

function section(parent, title) {
  const node = element('section', undefined, 'comparison-section');
  node.append(element('h3', title));
  parent.append(node);
  return node;
}
function textList(values) {
  const list = element('ol', undefined, 'ordered-text');
  values.forEach(value => list.append(element('li', quoted(value))));
  return list;
}
function twoCopies(before, after, render) {
  const pair = element('div', undefined, 'before-after');
  for (const [label, value] of [['Earlier', before], ['Revised', after]]) {
    const side = element('section');
    side.append(element('h4', label), render(value));
    pair.append(side);
  }
  return pair;
}
function questionRecord(item, sourceIndex, label) {
  const box = element('section', undefined, 'question-record');
  box.append(element('h4', label + ' · Question ' + (sourceIndex + 1)));
  box.append(element('p', 'Exact ID ' + quoted(item.id), 'question-id'));
  for (const [name, text] of [['Concept', item.concept], ['Prompt', item.prompt]]) {
    box.append(element('p', name, 'field-label'), literal(text));
  }
  box.append(element('p', 'Prerequisites in source order', 'field-label'),
    item.prerequisites.length ? textList(item.prerequisites) : element('p', 'None.'));
  box.append(element('p', 'Options in source order', 'field-label'));
  const options = element('ol', undefined, 'ordered-text');
  item.options.forEach(text => options.append(element('li', text)));
  box.append(options,
    element('p', 'Correct answer: option ' + (item.answer + 1) + ' · ' + item.options[item.answer], 'correct-option literal'),
    element('p', 'Explanation', 'field-label'), literal(item.explanation),
    element('p', 'Apply the idea', 'field-label'), literal(item.transfer));
  return box;
}
function tagRow(labels) {
  const tags = element('div', undefined, 'change-tags');
  for (const [label, answer] of labels) tags.append(element('span', label, 'tag' + (answer ? ' answer' : '')));
  return tags;
}
function retainedCard(row) {
  const details = element('details', undefined, 'question-change');
  const position = row.beforeIndex === row.afterIndex ?
    'Question ' + (row.beforeIndex + 1) : 'Question ' + (row.beforeIndex + 1) + ' → ' + (row.afterIndex + 1);
  details.append(element('summary', position + ' · ID ' + quoted(row.id)));
  const body = element('div', undefined, 'question-body');
  const labels = row.changedFields.map(field => [field + ' changed', field === 'answer']);
  if (!row.changedFields.length) labels.push(['Question content unchanged', false]);
  if (row.positionChanged) labels.push(['Absolute position changed', false]);
  if (row.answerIndexChanged) labels.push(['Correct-answer position changed', true]);
  if (row.answerTextChanged) labels.push(['Correct-option text changed', true]);
  if (row.answerIndexChanged && !row.answerTextChanged) labels.push(['Correct-option text retained', false]);
  body.append(tagRow(labels));
  const pair = element('div', undefined, 'before-after');
  pair.append(questionRecord(row.before, row.beforeIndex, 'Earlier'), questionRecord(row.after, row.afterIndex, 'Revised'));
  body.append(pair);
  details.append(body);
  return details;
}
function oneSided(parent, items, order, label) {
  if (!items.length) { parent.append(element('p', 'None.', 'empty-note')); return; }
  items.forEach(item => {
    const index = order.indexOf(item.id);
    const details = element('details', undefined, 'question-change');
    details.append(element('summary', label + ' question ' + (index + 1) + ' · ID ' + quoted(item.id)));
    const body = element('div', undefined, 'question-body');
    body.append(questionRecord(item, index, label));
    details.append(body); parent.append(details);
  });
}

function renderReport(report) {
  const content = byId('comparison-content');
  content.replaceChildren();
  const data = report.data, comparison = data.comparison, questions = comparison.questions;
  const identity = element('div', undefined, 'identity-summary');
  identity.append(element('p', data.sameBytes ? 'The captured files have identical bytes.' : 'The captured files have different bytes.'),
    element('p', comparison.sameContent ? 'The validated course content is identical.' : 'The validated course content has changed.'),
    element('p', 'Earlier: ' + quoted(data.files.before.name) + ' · Revised: ' + quoted(data.files.after.name), 'source-id'));
  content.append(identity);
  const counts = element('div', undefined, 'summary-strip');
  for (const [number, label] of [
    [questions.summary.beforeCount, 'Earlier questions'], [questions.summary.afterCount, 'Revised questions'],
    [questions.summary.changed, 'Retained questions changed'], [questions.summary.positionChanged, 'Retained positions changed']
  ]) {
    const cell = element('div', undefined, 'summary-item');
    cell.append(element('span', String(number), 'summary-number'), element('span', label, 'summary-label'));
    counts.append(cell);
  }
  content.append(counts);
  const metadata = section(content, 'Course title, source and permission');
  if (!comparison.metadataChanges.length) metadata.append(element('p', 'All three metadata fields are unchanged.', 'empty-note'));
  for (const row of comparison.metadataChanges) {
    const box = element('div', undefined, 'change-box');
    box.append(element('h4', { title: 'Title', attribution: 'Author or source', license: 'Permission to use' }[row.field]),
      twoCopies(row.before, row.after, literal));
    metadata.append(box);
  }
  const concepts = section(content, 'Concepts and source order');
  concepts.append(element('p', comparison.concepts.retainedOrderChanged ?
    'The relative order of retained concepts changed.' :
    'The relative order of retained concepts is unchanged. Added or removed concepts can still alter absolute positions.'));
  const conceptBox = element('div', undefined, 'change-box');
  conceptBox.append(twoCopies(comparison.concepts.beforeOrder, comparison.concepts.afterOrder, textList),
    element('p', 'Added concepts: ' + quoted(comparison.concepts.added), 'literal'),
    element('p', 'Removed concepts: ' + quoted(comparison.concepts.removed), 'literal'));
  concepts.append(conceptBox);
  const order = section(content, 'Question identities and source order');
  order.append(element('p', questions.retainedOrderChanged ?
    'The relative order of retained question IDs changed.' :
    'The relative order of retained question IDs is unchanged. Insertions and removals can still move their numbered positions.'),
    twoCopies(questions.beforeOrder, questions.afterOrder, textList));
  const changed = section(content, 'Changed or moved retained questions');
  const affected = questions.retained.filter(row => row.changedFields.length || row.positionChanged);
  if (!affected.length) changed.append(element('p', 'No retained question changed content or position.', 'empty-note'));
  affected.forEach(row => changed.append(retainedCard(row)));
  const added = section(content, 'Added questions · ' + questions.summary.added);
  oneSided(added, questions.added, questions.afterOrder, 'Revised');
  const removed = section(content, 'Removed questions · ' + questions.summary.removed);
  oneSided(removed, questions.removed, questions.beforeOrder, 'Earlier');
  const unchanged = questions.retained.filter(row => !row.changedFields.length && !row.positionChanged);
  if (unchanged.length) {
    const rest = element('details', undefined, 'change-box');
    rest.append(element('summary', 'Unchanged, unmoved questions · ' + unchanged.length));
    unchanged.forEach(row => rest.append(retainedCard(row)));
    content.append(rest);
  }
}

function render() {
  const state = page.state();
  for (const role of ['before', 'after']) fileDetails(role, state);
  byId('compare-courses').disabled = !state.canCompare;
  byId('download-comparison').disabled = !state.report;
  byId('comparison-result').hidden = !state.report;
  if (state.report !== shownReport) {
    if (state.report) renderReport(state.report);
    else byId('comparison-content').replaceChildren();
    shownReport = state.report;
  }
}
for (const role of ['before', 'after']) {
  const input = byId('file-' + role);
  byId('choose-' + role).addEventListener('click', () => { input.value = ''; input.click(); });
  input.addEventListener('cancel', () => { status('File selection cancelled. The loaded copies and any comparison are unchanged.'); });
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    const operation = page.load(role, file);
    status('Reading ' + roleLabel(role).toLowerCase() + ' replacement. Compare again after both files are ready.');
    render();
    const result = await operation;
    if (result.status === 'stale') return;
    render();
    const state = page.state();
    if (result.status === 'accepted') status(roleLabel(role) + ' copy loaded. ' + (state.canCompare ? 'Compare the loaded courses when ready.' : 'Choose the other course to continue.'));
    else status(state.errors[role]);
  });
  byId('clear-' + role).addEventListener('click', () => {
    page.clear(role); render();
    status(roleLabel(role) + ' copy cleared. The comparison is retired.');
    byId('choose-' + role).focus();
  });
}
byId('compare-courses').addEventListener('click', () => {
  try {
    page.compare(); render();
    status('Comparison ready. Review the differences before downloading the full report.');
    byId('comparison-heading').focus();
  } catch (error) {
    render();
    status('The comparison could not be prepared. ' + error.message + ' The loaded files are unchanged.');
  }
});
byId('download-comparison').addEventListener('click', () => {
  const report = page.state().report;
  if (!report) return;
  let url = null, link = null;
  try {
    url = URL.createObjectURL(new Blob([report.json], { type: 'application/json;charset=utf-8' }));
    link = document.createElement('a');
    link.href = url; link.download = 'recallweave-course-comparison.json';
    document.body.append(link); link.click();
    status('Comparison download started. It contains full question records, answer keys and reported differences.');
  } catch {
    status('The comparison download could not be prepared. The current report is retained; try Download comparison JSON again.');
  } finally {
    link?.remove();
    if (url) setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
});
render();
