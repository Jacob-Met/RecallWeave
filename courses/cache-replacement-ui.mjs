import { analyzeCacheTrace, parseReferenceText } from './cache-replacement-core.mjs';
import { parseDeck } from '../src/deck.mjs';

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

/** Mount only this separate lab; the learner and its state are never accessed. */
export function mountCacheLab(root, { courseText }) {
  const course = parseDeck(courseText);
  const get = id => {
    const node = root.querySelector('#' + id);
    if (!node) throw new Error('Missing cache-lab control: ' + id);
    return node;
  };
  const references = get('references'), capacity = get('capacity');
  const form = get('comparison-form'), error = get('input-error'), formStatus = get('form-status');
  const resultPanel = get('results'), traceDownload = get('download-trace');
  const buttons = ['step-first', 'step-back', 'step-next', 'step-last'].map(get);
  let analysis = null, shownStep = 0, acceptedDraft = null;

  function invalidate(message = 'Inputs changed. Run a new comparison.') {
    analysis = null; shownStep = 0; acceptedDraft = null;
    resultPanel.hidden = true; traceDownload.disabled = true;
    buttons.forEach(button => { button.disabled = true; });
    error.textContent = ''; references.removeAttribute('aria-invalid');
    formStatus.textContent = message;
  }

  function current() {
    if (analysis && (references.value !== acceptedDraft.references || capacity.value !== acceptedDraft.capacity)) {
      invalidate();
    }
    return analysis !== null;
  }

  function download(text, filename) {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = filename;
    document.body.append(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function renderPolicy(name) {
    const policy = analysis.policies[name];
    const step = shownStep ? policy.steps[shownStep - 1] : null;
    const pages = step ? step.after : policy.initial;
    const slots = get(name + '-slots'); slots.replaceChildren();
    for (let index = 0; index < analysis.input.capacity; index++) {
      const page = pages[index];
      const slot = element('li', page ?? 'Empty', page === undefined ? 'slot empty' : 'slot');
      if (step && page === step.request) slot.classList.add('requested');
      slot.setAttribute('aria-label', page === undefined ? 'Unused slot' : 'Page ' + page);
      slots.append(slot);
    }
    get(name + '-hits').textContent = String(step?.hits ?? 0);
    get(name + '-misses').textContent = String(step?.misses ?? 0);
    get(name + '-outcome').textContent = !step ? 'Cache starts empty'
      : step.hit ? 'Hit · ' + step.request + ' is present'
      : 'Miss · load ' + step.request;
    get(name + '-outcome').dataset.outcome = !step ? 'initial' : step.hit ? 'hit' : 'miss';
    get(name + '-explanation').textContent = !step
      ? 'No request has been processed.'
      : step.hit
        ? name === 'fifo' ? 'A hit leaves the insertion order unchanged.' : 'A hit refreshes this page to most recently used.'
        : step.evicted === null ? 'There is a free slot; no page is evicted.' : 'Evict page ' + step.evicted + ' before adding the requested page.';
  }

  function renderStep() {
    renderPolicy('fifo'); renderPolicy('lru');
    const count = analysis.input.references.length;
    get('step-status').textContent = !count ? 'No requests · empty caches'
      : !shownStep ? 'Before request 1 of ' + count
      : 'After request ' + shownStep + ' of ' + count + ' · page ' + analysis.input.references[shownStep - 1];
    get('step-progress').value = shownStep; get('step-progress').max = Math.max(count, 1);
    buttons[0].disabled = buttons[1].disabled = shownStep === 0;
    buttons[2].disabled = buttons[3].disabled = shownStep === count;
    for (const row of get('trace-rows').children) row.classList.toggle('current-step', Number(row.dataset.step) === shownStep);
  }

  function renderWholeTrace() {
    get('shown-capacity').textContent = String(analysis.input.capacity);
    get('request-count').textContent = String(analysis.input.references.length);
    get('accepted-references').textContent = analysis.input.references.join(' ') || 'No requests';
    const tbody = get('capacity-rows'); tbody.replaceChildren();
    for (const row of analysis.capacityComparison) {
      const tr = element('tr'); tr.dataset.capacity = String(row.capacity);
      tr.classList.toggle('selected-capacity', row.capacity === analysis.input.capacity);
      const heading = element('th', String(row.capacity) + (row.capacity === analysis.input.capacity ? ' · shown' : ''));
      heading.scope = 'row'; tr.append(heading, element('td', String(row.fifoMisses)), element('td', String(row.lruMisses)));
      tbody.append(tr);
    }
    const { fifo, lru } = analysis.policies;
    get('whole-observation').textContent = analysis.input.references.length
      ? 'Across the complete sequence: FIFO has ' + fifo.totals.misses + ' misses; LRU has ' + lru.totals.misses + '. These counts describe this input.'
      : 'No requests: both policies have zero hits and zero misses. There is no hit-rate percentage for an empty sequence.';
    const rise = analysis.capacityComparison.find((row, index, all) => index && row.fifoMisses > all[index - 1].fifoMisses);
    get('capacity-observation').textContent = rise
      ? 'Here FIFO rises from ' + analysis.capacityComparison[rise.capacity - 2].fifoMisses + ' misses at capacity ' + (rise.capacity - 1) + ' to ' + rise.fifoMisses + ' at capacity ' + rise.capacity + '. More capacity can change its eviction order unfavorably.'
      : 'FIFO does not gain misses across these five capacities for this sequence. Other sequences can behave differently.';
    const rows = get('trace-rows'); rows.replaceChildren();
    for (let index = 0; index < analysis.input.references.length; index++) {
      const a = fifo.steps[index], b = lru.steps[index];
      const tr = element('tr'); tr.dataset.step = String(index + 1);
      const number = element('th', String(index + 1)); number.scope = 'row';
      tr.append(number, element('td', a.request),
        element('td', a.hit ? 'Hit' : 'Miss'), element('td', a.evicted ?? 'None'),
        element('td', a.after.join(' → ')),
        element('td', b.hit ? 'Hit' : 'Miss'), element('td', b.evicted ?? 'None'),
        element('td', b.after.join(' → ')));
      rows.append(tr);
    }
    get('empty-trace').hidden = analysis.input.references.length !== 0;
  }

  references.addEventListener('input', () => invalidate());
  capacity.addEventListener('change', () => invalidate());
  form.addEventListener('submit', event => {
    event.preventDefault();
    invalidate('');
    try {
      analysis = analyzeCacheTrace({ references: parseReferenceText(references.value), capacity: Number(capacity.value) });
      acceptedDraft = { references: references.value, capacity: capacity.value };
      shownStep = 0;
      renderWholeTrace(); renderStep();
      resultPanel.hidden = false; traceDownload.disabled = false;
      formStatus.textContent = 'Comparison ready. Inspect the same request in both policies.';
    } catch (failure) {
      analysis = null; acceptedDraft = null;
      resultPanel.hidden = true; traceDownload.disabled = true;
      error.textContent = failure.message;
      references.setAttribute('aria-invalid', 'true'); references.focus();
    }
  });
  const move = value => { if (current()) { shownStep = value(); renderStep(); } };
  buttons[0].addEventListener('click', () => move(() => 0));
  buttons[1].addEventListener('click', () => move(() => Math.max(0, shownStep - 1)));
  buttons[2].addEventListener('click', () => move(() => Math.min(analysis.input.references.length, shownStep + 1)));
  buttons[3].addEventListener('click', () => move(() => analysis.input.references.length));
  get('load-recency').addEventListener('click', () => {
    references.value = 'A B A C B'; capacity.value = '2';
    invalidate('Recency example loaded. Run it to compare both policies.'); references.focus();
  });
  get('load-anomaly').addEventListener('click', () => {
    references.value = '1 2 3 4 1 2 5 1 2 3 4 5'; capacity.value = '3';
    invalidate('Classic FIFO anomaly loaded. Run it, then inspect the whole-sequence capacity table.'); references.focus();
  });
  traceDownload.addEventListener('click', () => {
    if (!current()) return;
    download(JSON.stringify({ format: 'recallweave-cache-experiment/1', shownStep, result: analysis }, null, 2) + '\n', 'cache-replacement-experiment.json');
  });
  get('download-course').addEventListener('click', () => download(courseText, 'cache-replacement.json'));
  get('course-counts').textContent = course.items.length + ' questions · ' + course.concepts.length + ' concepts';
  get('run-comparison').disabled = false; get('download-course').disabled = false;
  invalidate('Choose a sequence and run the comparison. Both caches start empty.');
  root.documentElement.dataset.cacheReady = 'true';
}
