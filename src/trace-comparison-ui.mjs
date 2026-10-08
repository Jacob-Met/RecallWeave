import { compareTraceArchives, inspectTraceForComparison } from './trace-comparison.mjs';
import { TRACE_ARCHIVE_MAX_BYTES } from './trace-archive.mjs';

/** Two independent file selections; a pending replacement retires the old pair. */
export function createTracePairController({ onChange = () => {} } = {}) {
  const empty = () => ({ status: 'empty', filename: '', inspection: null, error: '', text: null });
  const slots = { left: empty(), right: empty() };
  const tickets = { left: 0, right: 0 };
  let current;

  function sideName(side) {
    if (side !== 'left' && side !== 'right') throw new TypeError('Choose the left or right trace.');
    return side;
  }
  function publish() {
    let comparison = null, error = '';
    if (slots.left.status === 'ready' && slots.right.status === 'ready') {
      try { comparison = compareTraceArchives(slots.left.text, slots.right.text); }
      catch (failure) { error = failure.message || 'These traces could not be compared.'; }
    }
    const visible = side => Object.freeze({
      status: side.status, filename: side.filename,
      inspection: side.inspection, error: side.error,
    });
    current = Object.freeze({
      left: visible(slots.left), right: visible(slots.right), comparison, error,
    });
    onChange(current);
  }
  async function select(side, file) {
    sideName(side);
    if (!file) return;
    const ticket = ++tickets[side];
    slots[side] = { ...empty(), status: 'loading' };
    publish();
    try {
      const filename = typeof file.name === 'string' && file.name ? file.name : 'Unnamed trace';
      slots[side] = { ...slots[side], filename };
      publish();
      if (!Number.isInteger(file.size) || file.size < 0 || file.size > TRACE_ARCHIVE_MAX_BYTES) {
        throw new RangeError('Choose a completed learning trace no larger than 2 MiB.');
      }
      const buffer = await file.arrayBuffer();
      if (ticket !== tickets[side]) return;
      if (buffer.byteLength > TRACE_ARCHIVE_MAX_BYTES) {
        throw new RangeError('Choose a completed learning trace no larger than 2 MiB.');
      }
      let text;
      try { text = new TextDecoder('utf-8', { fatal: true }).decode(buffer); }
      catch { throw new RangeError('This file is not valid UTF-8 text.'); }
      const inspection = inspectTraceForComparison(text);
      if (ticket !== tickets[side]) return;
      slots[side] = { status: 'ready', filename, inspection, text, error: '' };
    } catch (failure) {
      if (ticket !== tickets[side]) return;
      slots[side] = {
        ...empty(), status: 'error', filename: slots[side].filename,
        error: failure.message || 'The selected file could not be read.',
      };
    }
    publish();
  }
  function clear(side) {
    sideName(side);
    tickets[side]++;
    slots[side] = empty();
    publish();
  }
  publish();
  return Object.freeze({ select, clear, getSnapshot: () => current });
}

export function mountTraceComparison(doc = document) {
  const $ = id => doc.getElementById(id);
  let pair = null, currentRows = [];
  const difference = $('trace-difference-filter');
  const concept = $('trace-concept-filter');

  function element(tag, text, className) {
    const node = doc.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function term(list, label, text) {
    list.append(element('dt', label), element('dd', text));
  }
  function practiceText(practice, options) {
    if (practice.state === 'not-needed') return 'Not offered: the first answer was correct.';
    if (practice.state === 'unstarted') return 'No retry recorded; practice was not started.';
    if (practice.state === 'pending') return 'No retry recorded; this question remained pending.';
    return options[practice.choice] + ' — ' + (practice.correct ? 'correct retry' : 'incorrect retry');
  }
  function answerSide(label, side, row) {
    const section = element('section', undefined, 'answer-side');
    section.append(element('h4', label));
    const list = element('dl');
    term(list, 'First answer · question ' + side.first.position + ' in this file', row.options[side.first.choice]);
    const outcome = element('p', side.first.correct ? 'First answer correct' : 'First answer incorrect', 'answer-outcome');
    term(list, 'Separate practice', practiceText(side.practice, row.options));
    section.append(outcome, list);
    return section;
  }
  function renderRow(row, index) {
    const article = element('article', undefined, 'question-card');
    article.dataset.itemId = row.id;
    const meta = element('p', row.concept + ' · Course question ' + (index + 1), 'question-meta');
    const heading = element('h3', row.prompt);
    heading.id = 'trace-question-' + index;
    article.setAttribute('aria-labelledby', heading.id);
    const changes = [];
    if (row.firstChanged) changes.push('Different first answers');
    if (row.practiceChanged) changes.push('Different practice records');
    const badge = element('p', changes.join(' · ') || 'Same first answer and practice record', 'difference-note');
    const answers = element('div', undefined, 'answer-grid');
    answers.append(answerSide('Trace A', row.left, row), answerSide('Trace B', row.right, row));
    const details = element('details', undefined, 'answer-detail');
    details.append(element('summary', 'Answer, explanation and transfer prompt'));
    const key = element('dl');
    term(key, 'Course answer', row.options[row.answer]);
    term(key, 'Explanation', row.explanation);
    term(key, 'Transfer prompt', row.transfer);
    details.append(key);
    article.append(meta, heading, badge, answers, details);
    return { node: article, row };
  }
  function filterRows() {
    let visible = 0;
    for (const { node, row } of currentRows) {
      const matchDifference = difference.value === 'all'
        || difference.value === 'first' && row.firstChanged
        || difference.value === 'practice' && row.practiceChanged
        || difference.value === 'either' && (row.firstChanged || row.practiceChanged);
      node.hidden = !(matchDifference && (!concept.value || row.concept === concept.value));
      if (!node.hidden) visible++;
    }
    $('trace-visible-count').textContent = 'Showing ' + visible + ' of ' + (pair?.rows.length ?? 0)
      + ' course questions. Filter: ' + difference.selectedOptions[0].textContent
      + (concept.value ? '; concept: ' + concept.value : '; all concepts') + '.';
    $('trace-no-results').hidden = visible !== 0;
  }
  function renderFile(side, state) {
    const label = side === 'left' ? 'A' : 'B';
    $('trace-' + side + '-name').textContent = state.filename || 'No file selected';
    $('trace-' + side + '-clear').disabled = state.status === 'empty';
    const status = $('trace-' + side + '-status');
    const preview = $('trace-' + side + '-preview');
    preview.replaceChildren();
    if (state.status === 'empty') status.textContent = 'Choose a completed learning-trace JSON file for Trace ' + label + '.';
    if (state.status === 'loading') status.textContent = 'Reading and checking Trace ' + label + '…';
    if (state.status === 'error') status.textContent = 'Could not use this file: ' + state.error;
    if (state.status === 'ready') {
      status.textContent = 'Completed trace checked. File contents are editable records, not authenticated evidence.';
      const { course, savedAt, summary } = state.inspection;
      preview.append(element('h3', course.title));
      const list = element('dl');
      term(list, 'File save time (UTC)', savedAt);
      term(list, 'First answers', summary.correctFirst + ' correct of ' + summary.firstAnswers + ' recorded');
      term(list, 'Separate practice', summary.practiceAnswers + ' recorded retries of ' + summary.practiceTotal
        + ' initially missed; ' + (summary.practiceStarted ? 'practice started' : 'practice not started'));
      preview.append(list);
    }
  }
  function render(state) {
    renderFile('left', state.left);
    renderFile('right', state.right);
    const error = $('trace-pair-error');
    error.textContent = state.error;
    error.hidden = !state.error;
    pair = state.comparison;
    $('trace-comparison').hidden = !pair;
    $('trace-waiting').hidden = Boolean(pair || state.error);
    $('trace-print').disabled = !pair;
    difference.disabled = !pair;
    concept.disabled = !pair;
    currentRows = [];
    $('trace-question-list').replaceChildren();
    concept.replaceChildren();
    const all = element('option', 'All concepts');
    all.value = '';
    concept.append(all);
    difference.value = 'all';
    if (!pair) return;
    $('trace-course-title').textContent = pair.course.title;
    $('trace-course-attribution').textContent = pair.course.attribution;
    $('trace-course-license').textContent = pair.course.license;
    $('trace-change-count').textContent = pair.changes.firstAnswers + ' of ' + pair.rows.length
      + ' first answers differ. ' + pair.changes.practice + ' practice records differ.';
    for (const name of pair.course.concepts) {
      const option = element('option', name);
      option.value = name;
      concept.append(option);
    }
    currentRows = pair.rows.map(renderRow);
    $('trace-question-list').append(...currentRows.map(item => item.node));
    filterRows();
  }
  const controller = createTracePairController({ onChange: render });
  for (const side of ['left', 'right']) {
    const input = $('trace-' + side + '-file');
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      input.value = '';
      if (file) void controller.select(side, file);
    });
    $('trace-' + side + '-clear').addEventListener('click', () => {
      controller.clear(side);
      input.value = '';
      input.focus();
    });
  }
  difference.addEventListener('change', filterRows);
  concept.addEventListener('change', filterRows);
  $('trace-reset-filters').addEventListener('click', () => {
    difference.value = 'all';
    concept.value = '';
    filterRows();
    difference.focus();
  });
  $('trace-print').addEventListener('click', () => {
    if (pair) doc.defaultView.print();
  });
  return controller;
}
