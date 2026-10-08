import { buildSearchComparison, EXAMPLES } from './substring-search.mjs';

const PHASES = ['naive', 'prefix', 'kmp'];
const TITLES = { naive: 'Naive search', prefix: 'Prefix preparation', kmp: 'KMP search' };

function tokenLabel(token) {
  const code = 'U+' + token.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
  const named = { ' ': 'SPACE', '\n': 'LF', '\r': 'CR', '\t': 'TAB', '\0': 'NUL' };
  if (Object.hasOwn(named, token)) return named[token] + ' ' + code;
  if (/\p{C}|\p{M}|\p{Z}/u.test(token)) return code;
  return token;
}

function describe(phase, step) {
  if (step.kind === 'compare') {
    const pair = step.comparison;
    return pair.left.sequence + '[' + pair.left.index + '] ' + tokenLabel(pair.left.token) +
      (pair.equal ? ' equals ' : ' differs from ') + 'pattern[' + pair.right.index + '] ' +
      tokenLabel(pair.right.token) + '. Count this one equality test.';
  }
  if (step.kind === 'fallback' || step.kind === 'match-fallback') {
    return (step.kind === 'match-fallback' ? 'After the complete match, retain its proper border: ' : 'Use a shorter proper border: ') +
      'q ' + step.fallback.from + ' → ' + step.fallback.to + '. ' +
      (phase === 'prefix' ? 'Preparation index' : 'Text index') + ' i stays ' + step.i + '. No comparison added.';
  }
  if (step.kind === 'match') return 'Report the complete occurrence starting at ' + step.match + '. Overlaps are allowed.';
  if (step.kind === 'record') return 'Record pi[' + step.recorded + '] = ' + step.table[step.recorded] + '. Advance to the next prefix.';
  if (step.kind === 'reject') return 'This alignment failed. The next feasible start will be tried.';
  if (step.kind === 'shift') return 'Try the next feasible alignment, starting at ' + step.start + '.';
  if (step.kind === 'skip') return 'No prefix token matched. Advance the text cursor once.';
  if (step.kind === 'advance') return 'The equality succeeded. Advance the matched length and cursor; no extra comparison.';
  if (step.kind === 'initial') return phase === 'prefix' ? 'Start with pi[0] = 0. Unknown table entries are shown as —.' : 'Initial state. No text comparisons yet.';
  return phase === 'prefix' ? 'Preparation complete. The final table can be reused for this exact pattern.' :
    'Search complete. ' + (step.matches.length ? 'All starts: ' + step.matches.join(', ') + '.' : 'No complete occurrence.');
}

/** Request a download; cleanup always runs. Browser saving remains user-controlled. */
export function requestDownload(document, platform, content, filename, type) {
  const blob = new platform.Blob([content], { type });
  const url = platform.URL.createObjectURL(blob);
  let anchor;
  try {
    anchor = document.createElement('a');
    anchor.href = url; anchor.download = filename; anchor.hidden = true;
    document.body.append(anchor);
    anchor.click();
  } finally {
    try { if (anchor) anchor.remove(); }
    finally { platform.URL.revokeObjectURL(url); }
  }
}

/** Actual page handlers; callers may supply a DOM/platform for native QA. */
export function mountExplorer(document, platform = globalThis, courseText) {
  if (typeof courseText !== 'string') throw new TypeError('The exact authored course text is required.');
  const byId = id => {
    const value = document.getElementById(id);
    if (!value) throw new Error('Missing explorer element: ' + id);
    return value;
  };
  const textInput = byId('search-text'), patternInput = byId('search-pattern');
  const form = byId('search-form'), examples = byId('search-example');
  const resultRegion = byId('search-result'), status = byId('search-status');
  const resultDownload = byId('download-calculation'), courseDownload = byId('download-course');
  const summary = byId('search-summary'), identity = byId('search-identity');
  const cursors = { naive: 0, prefix: 0, kmp: 0 };
  const panels = {};
  let accepted = null;

  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function announce(message, error = false) {
    status.textContent = message;
    status.className = error ? 'status error' : 'status';
  }
  function retire(message = 'Inputs changed. Build a new trace to inspect or download this draft.') {
    accepted = null;
    resultRegion.hidden = true;
    resultDownload.disabled = true;
    announce(message);
  }
  function rail(label, values, comparison, sequence, shift = 0) {
    const row = element('div', undefined, 'token-row');
    row.append(element('strong', label, 'row-label'));
    const cells = element('div', undefined, 'tokens');
    if (!values.length) cells.append(element('span', '(empty)', 'empty'));
    for (let gap = 0; gap < shift; gap++) {
      const blank = element('span', '', 'token gap'); blank.setAttribute('aria-hidden', 'true'); cells.append(blank);
    }
    values.forEach((token, index) => {
      const compared = comparison && [comparison.left, comparison.right].some(part => part.sequence === sequence && part.index === index);
      const cell = element('span', undefined, 'token' + (compared ? ' comparing' : ''));
      const code = 'U+' + token.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
      cell.append(element('small', String(index)), element('b', tokenLabel(token)));
      cell.setAttribute('aria-label', label + ' index ' + index + ', ' + code + (compared ? ', compared in this step' : ''));
      cells.append(cell);
    });
    row.append(cells);
    return row;
  }
  function renderPhase(phase) {
    if (!accepted) return;
    const trace = accepted[phase], panel = panels[phase];
    const index = cursors[phase], step = trace.steps[index];
    panel.position.textContent = 'Step ' + index + ' of ' + (trace.steps.length - 1) + ' · ' + step.kind;
    panel.select.value = String(index);
    panel.previous.disabled = index === 0;
    panel.next.disabled = index === trace.steps.length - 1;
    panel.event.textContent = describe(phase, step);
    panel.count.textContent = 'Equality comparisons so far: ' + step.comparisons;
    panel.state.textContent = phase === 'naive' ? 'Start = ' + step.start + '; matched length = ' + step.offset :
      (phase === 'prefix' ? 'Preparation' : 'Text') + ' index i = ' + step.i + '; matched-prefix length q = ' + step.q;
    const rows = [];
    if (phase !== 'prefix') rows.push(rail('Text', accepted.textTokens, step.comparison, 'text'));
    const shift = phase === 'naive' ? step.start : phase === 'kmp' ? step.i - step.q : 0;
    rows.push(rail('Pattern', accepted.patternTokens, step.comparison, 'pattern', Math.max(0, shift)));
    if (phase === 'prefix') {
      const row = element('div', undefined, 'token-row'); row.append(element('strong', 'pi', 'row-label'));
      const cells = element('div', undefined, 'tokens');
      step.table.forEach((value, i) => {
        const cell = element('span', undefined, 'token');
        cell.append(element('small', String(i)), element('b', value === null ? '—' : String(value)));
        cells.append(cell);
      });
      row.append(cells); rows.push(row);
      panel.matches.textContent = 'pi[i] is a proper-border length for the prefix ending at i.';
    } else panel.matches.textContent = 'Reported starts so far: ' + (step.matches.length ? step.matches.join(', ') : 'none');
    panel.visual.replaceChildren(...rows);
  }

  PHASES.forEach(phase => {
    const host = byId('trace-' + phase), controls = element('div', undefined, 'trace-controls');
    const previous = element('button', 'Previous'), next = element('button', 'Next');
    previous.type = next.type = 'button';
    previous.setAttribute('aria-label', TITLES[phase] + ': previous step');
    next.setAttribute('aria-label', TITLES[phase] + ': next step');
    const label = element('label', 'Jump to step '), select = element('select');
    select.setAttribute('aria-label', TITLES[phase] + ': choose a retained step'); label.append(select);
    controls.append(previous, next, label);
    const position = element('p', undefined, 'step-position'), event = element('p', undefined, 'step-event');
    event.setAttribute('aria-live', 'polite');
    const state = element('p'), count = element('p'), visual = element('div', undefined, 'trace-visual'), matches = element('p');
    visual.setAttribute('role', 'region'); visual.setAttribute('aria-label', TITLES[phase] + ' token positions');
    visual.tabIndex = 0;
    host.append(controls, position, event, state, count, visual, matches);
    panels[phase] = { previous, next, select, position, event, state, count, visual, matches };
    previous.addEventListener('click', () => { if (accepted && cursors[phase] > 0) { cursors[phase]--; renderPhase(phase); } });
    next.addEventListener('click', () => { if (accepted && cursors[phase] + 1 < accepted[phase].steps.length) { cursors[phase]++; renderPhase(phase); } });
    select.addEventListener('change', () => {
      const value = Number(select.value);
      if (accepted && Number.isInteger(value) && value >= 0 && value < accepted[phase].steps.length) {
        cursors[phase] = value; renderPhase(phase);
      }
    });
  });
  EXAMPLES.forEach((example, index) => {
    const option = element('option', example.name); option.value = String(index); examples.append(option);
  });
  examples.addEventListener('change', () => {
    if (examples.value === '') return;
    const example = EXAMPLES[Number(examples.value)];
    if (!example) return;
    textInput.value = example.text; patternInput.value = example.pattern;
    retire('Example loaded as a draft. Select Build traces to inspect it.');
  });
  [textInput, patternInput].forEach(input => input.addEventListener('input', () => { examples.value = ''; retire(); }));
  form.addEventListener('submit', event => {
    event.preventDefault();
    retire();
    try {
      accepted = buildSearchComparison(textInput.value, patternInput.value);
      identity.textContent = 'Accepted text: ' + JSON.stringify(accepted.text) + '\nAccepted pattern: ' + JSON.stringify(accepted.pattern) +
        '\nPositions use Unicode code points; case and combining marks are literal.';
      summary.textContent = 'All match starts: ' + (accepted.kmp.matches.length ? accepted.kmp.matches.join(', ') : 'none') +
        '. Comparisons — naive: ' + accepted.counts.naive + '; prefix preparation: ' + accepted.counts.prefix +
        '; KMP text search: ' + accepted.counts.kmpSearch + '; KMP total: ' + accepted.counts.kmpTotal + '. ' +
        'Final prefix table: [' + accepted.prefix.table.join(', ') + '].';
      PHASES.forEach(phase => {
        cursors[phase] = 0;
        panels[phase].select.replaceChildren(...accepted[phase].steps.map((step, index) => {
          const option = element('option', index + ': ' + step.kind); option.value = String(index); return option;
        }));
        renderPhase(phase);
      });
      resultRegion.hidden = false; resultDownload.disabled = false;
      announce('Complete traces are ready. Each panel has its own retained step position.');
    } catch (error) {
      retire(error.message || 'The draft could not be calculated.');
      announce(error.message || 'The draft could not be calculated.', true);
    }
  });
  resultDownload.addEventListener('click', () => {
    const captured = accepted;
    if (!captured) return;
    // A programmatic edit may not dispatch input; refuse a stale result anyway.
    if (textInput.value !== captured.text || patternInput.value !== captured.pattern) { retire(); return; }
    try {
      requestDownload(document, platform, JSON.stringify(captured, null, 2) + '\n', 'substring-search-calculation.json', 'application/json;charset=utf-8');
      announce('Calculation download requested. It includes all three complete traces, regardless of the displayed steps.');
    } catch (error) { announce('Calculation download could not be requested. Your trace is retained; try again. ' + error.message, true); }
  });
  courseDownload.addEventListener('click', () => {
    try {
      requestDownload(document, platform, courseText, 'substring-search.json', 'application/json;charset=utf-8');
      announce('Original course download requested. In RecallWeave, choose Bring your own lesson, preview it, then Start this deck.');
    } catch (error) { announce('Course download could not be requested. Try again. ' + error.message, true); }
  });
  retire('Choose an example or write a text and pattern, then build the complete traces.');
}

if (typeof document !== 'undefined') {
  const embedded = document.getElementById('substring-course-source');
  if (embedded) mountExplorer(document, globalThis, JSON.parse(embedded.textContent));
}
