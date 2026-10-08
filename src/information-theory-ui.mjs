import { INFORMATION_EXAMPLES, parseInformationCounts, analyzeInformationTable } from './information-theory.mjs';

/** Mount the self-contained explorer; only explicit controls create downloads. */
export function mountInformationTheory(root, downloads) {
  const doc = root.ownerDocument || root;
  const find = function (id) { return root.querySelector('#' + id); };
  const countsInput = find('count-table');
  const result = find('applied-result');
  const axisInput = find('condition-axis');
  const valueInput = find('condition-value');
  const status = find('table-status');
  const error = find('table-error');
  let applied = null;

  function node(tag, text, className) {
    const element = doc.createElement(tag);
    if (text !== undefined && text !== null) element.textContent = String(text);
    if (className) element.className = className;
    return element;
  }
  function fraction(value) {
    return value.denominator === 1 ? String(value.numerator) : value.numerator + '/' + value.denominator;
  }
  function bits(value) {
    if (value === null) return 'Undefined';
    if (value === 0) return '0';
    if (Math.abs(value) < 0.000001) return value.toExponential(5);
    return String(Number(value.toFixed(6)));
  }
  function output(id, value) {
    const element = find(id);
    element.textContent = bits(value);
    element.dataset.bits = String(value);
  }
  function cell(tag, text, scope) {
    const element = node(tag, text);
    if (scope) element.scope = scope;
    return element;
  }
  function makeTable(caption, headings, rows) {
    const table = node('table');
    table.append(node('caption', caption));
    const head = node('thead');
    const headingRow = node('tr');
    for (const heading of headings) headingRow.append(cell('th', heading, 'col'));
    head.append(headingRow);
    table.append(head);
    const body = node('tbody');
    rows.forEach(function (values) {
      const row = node('tr');
      values.forEach(function (value, index) {
        row.append(cell(index === 0 ? 'th' : 'td', value, index === 0 ? 'row' : undefined));
      });
      body.append(row);
    });
    table.append(body);
    return table;
  }
  function retire(message) {
    applied = null;
    result.hidden = true;
    find('download-observation').disabled = true;
    find('conditioning-controls').disabled = true;
    error.hidden = true;
    error.textContent = '';
    countsInput.removeAttribute('aria-invalid');
    status.textContent = message;
  }
  function resetConditioning() {
    axisInput.value = 'X';
    fillConditionValues();
  }
  function fillConditionValues() {
    if (!applied) return;
    const labels = axisInput.value === 'X' ? applied.analysis.rows : applied.analysis.columns;
    valueInput.replaceChildren();
    labels.forEach(function (entry, index) {
      const option = node('option', entry.label + (entry.count === 0 ? ' — no cards' : ''));
      option.value = String(index);
      valueInput.append(option);
    });
    valueInput.value = '0';
  }
  function renderJoint() {
    const a = applied.analysis;
    const table = node('table');
    table.append(node('caption', 'Joint counts and exact probabilities — ' + a.total + ' cards'));
    const head = node('thead');
    const header = node('tr');
    header.append(cell('th', 'X / Y', 'col'));
    for (const column of a.columns) header.append(cell('th', column.label, 'col'));
    header.append(cell('th', 'X marginal', 'col'));
    head.append(header);
    table.append(head);
    const body = node('tbody');
    a.rows.forEach(function (row, rowIndex) {
      const tr = node('tr');
      tr.append(cell('th', row.label, 'row'));
      a.columns.forEach(function (_, columnIndex) {
        const value = a.cells[rowIndex * a.columns.length + columnIndex];
        const td = node('td');
        td.dataset.row = String(rowIndex);
        td.dataset.column = String(columnIndex);
        td.dataset.probability = fraction(value.probability);
        td.style.backgroundColor = 'rgba(33, 128, 109, ' + (0.04 + 0.23 * value.probability.value) + ')';
        td.append(node('strong', value.count + (value.count === 1 ? ' card' : ' cards')),
          node('span', 'P = ' + fraction(value.probability), 'cell-detail'));
        tr.append(td);
      });
      const marginal = node('td', null, 'marginal');
      marginal.append(node('strong', row.count + ' cards'), node('span', 'P = ' + fraction(row.probability), 'cell-detail'));
      tr.append(marginal);
      body.append(tr);
    });
    table.append(body);
    const foot = node('tfoot');
    const footer = node('tr');
    footer.append(cell('th', 'Y marginal', 'row'));
    a.columns.forEach(function (column) {
      const td = node('td');
      td.append(node('strong', column.count + ' cards'), node('span', 'P = ' + fraction(column.probability), 'cell-detail'));
      footer.append(td);
    });
    footer.append(cell('td', 'N = ' + a.total + '; P = 1'));
    foot.append(footer);
    table.append(foot);
    find('joint-table').replaceChildren(table);
  }
  function renderDecomposition() {
    const m = applied.analysis.metrics;
    const scale = Math.max(1, Math.ceil(m.jointEntropyBits * 2) / 2);
    const i = m.mutualInformationBits;
    const x = m.conditionalXGivenYBits;
    const y = m.conditionalYGivenXBits;
    const rows = [
      ['H(X)', m.entropyXBits, [['Shared', i, 'shared'], ['X remaining', x, 'remaining-x']],
        'I(X;Y) + H(X given Y)'],
      ['H(Y)', m.entropyYBits, [['Shared', i, 'shared'], ['Y remaining', y, 'remaining-y']],
        'I(X;Y) + H(Y given X)'],
      ['H(X,Y)', m.jointEntropyBits, [['Shared', i, 'shared'], ['X remaining', x, 'remaining-x'], ['Y remaining', y, 'remaining-y']],
        'I(X;Y) + H(X given Y) + H(Y given X)']
    ];
    const fragment = doc.createDocumentFragment();
    for (const [label, total, parts, identity] of rows) {
      const row = node('div', null, 'decomposition-row');
      const heading = node('div', null, 'bar-heading');
      heading.append(node('strong', label), node('span', bits(total) + ' bits'));
      const track = node('div', null, 'bar-track');
      track.setAttribute('aria-hidden', 'true');
      for (const [name, value, className] of parts) {
        const segment = node('span', null, 'bar-segment ' + className);
        segment.style.width = String(100 * value / scale) + '%';
        segment.title = name + ': ' + bits(value) + ' bits';
        track.append(segment);
      }
      row.append(heading, track, node('p', identity, 'bar-formula'));
      fragment.append(row);
    }
    find('entropy-bars').replaceChildren(fragment);
    find('bar-scale').textContent = 'All tracks use the same scale: 0 to ' + bits(scale) + ' bits.';
    output('remaining-x', x);
    output('remaining-y', y);
  }
  function renderIndependence() {
    const a = applied.analysis;
    const verdict = find('independence-verdict');
    verdict.textContent = a.independence.exact ? 'Independent — every exact check agrees.' : 'Dependent — at least one exact check differs.';
    verdict.dataset.independent = String(a.independence.exact);
    const differences = a.independence.factorizationDifferences;
    find('independence-explanation').textContent = a.independence.exact
      ? 'Each joint probability equals the product of its marginals. The two labels carry no information about each other in this finite box.'
      : differences.length + ' of ' + a.cells.length + ' cell checks differ. This verdict uses integer counts, even when the information is very small.';
    find('factorization-table').replaceChildren(makeTable(
      'Exact factorization: n × N compared with row total × column total',
      ['Pair', 'n × N', 'Row × column', 'Equal?'],
      a.cells.map(function (c) { return [
        c.x + ', ' + c.y, c.jointCrossProduct, c.marginalCrossProduct,
        c.jointCrossProduct === c.marginalCrossProduct ? 'Yes' : 'No'
      ]; })
    ));
  }
  function renderContributions() {
    const a = applied.analysis;
    const marginalRows = a.rows.map(function (r) { return [r.label, fraction(r.probability), bits(r.entropyContributionBits)]; })
      .concat(a.columns.map(function (c) { return [c.label, fraction(c.probability), bits(c.entropyContributionBits)]; }));
    find('marginal-contributions').replaceChildren(makeTable(
      'Marginal entropy terms — sum X terms for H(X), Y terms for H(Y)',
      ['Label', 'Probability', 'Entropy term (bits)'], marginalRows
    ));
    const table = makeTable(
      'Each joint cell: p is its probability; q is the product of its marginals',
      ['Pair', 'p', 'q', 'Surprise log2(1/p)', 'Entropy term', 'Pointwise log2(p/q)', 'Signed p × log2(p/q)'],
      a.cells.map(function (c) { return [
        c.x + ', ' + c.y, fraction(c.probability), fraction(c.independentProbability),
        c.zeroProbability ? 'Excluded (p = 0)' : bits(c.surprisalBits),
        bits(c.entropyContributionBits),
        c.zeroProbability ? 'Excluded (p = 0)' : bits(c.pointwiseInformationBits),
        bits(c.signedContributionBits)
      ]; })
    );
    Array.from(table.tBodies[0].rows).forEach(function (row, index) {
      const c = a.cells[index];
      row.dataset.row = String(c.row);
      row.dataset.column = String(c.column);
      row.cells[6].dataset.bits = String(c.signedContributionBits);
      if (c.signedContributionBits < 0) row.cells[6].classList.add('negative-term');
    });
    find('cell-contributions').replaceChildren(table);
    output('direct-mi-sum', a.metrics.signedContributionSumBits);
    output('stable-mi-sum', a.metrics.mutualInformationBits);
  }
  function renderConditioning(announce) {
    if (!applied) return;
    const a = applied.analysis;
    const observeX = axisInput.value === 'X';
    const entries = observeX ? a.rows : a.columns;
    const observedIndex = Number(valueInput.value);
    const observed = entries[observedIndex];
    if (!observed) return;
    const outcomes = observeX ? a.columns : a.rows;
    const condition = observeX ? observed.conditionalY : observed.conditionalX;
    const before = observeX ? a.metrics.entropyYBits : a.metrics.entropyXBits;
    const average = observeX ? a.metrics.conditionalYGivenXBits : a.metrics.conditionalXGivenYBits;
    const target = observeX ? 'Y' : 'X';
    const given = observeX ? 'X' : 'Y';
    find('condition-heading').textContent = 'What happens to ' + target + ' after seeing ' + observed.label + '?';
    find('condition-probability').textContent = 'P(' + observed.label + ') = ' + fraction(observed.probability) + ' (' + observed.count + ' of ' + a.total + ' cards).';
    output('entropy-before', before);
    find('entropy-after').textContent = condition.defined ? bits(condition.entropyBits) : 'Undefined';
    find('entropy-after').dataset.bits = condition.defined ? String(condition.entropyBits) : 'null';
    find('entropy-after-label').textContent = 'After ' + observed.label;
    output('conditional-average', average);
    find('conditional-average-label').textContent = 'Average after observing ' + given;
    let message;
    if (!condition.defined) {
      message = 'There are no cards with ' + observed.label + '. This conditional distribution and its entropy are undefined. Its weight in the average is zero.';
    } else if (condition.entropyBits > before + 1e-12) {
      message = 'This particular observation increases uncertainty. The weighted average over all ' + given + ' observations can still decrease it; compare the average below.';
    } else {
      message = 'This is one observed label. Conditional entropy H(' + target + ' given ' + given + ') averages over every possible ' + given + ' label with its probability as weight.';
    }
    find('condition-message').textContent = message;
    const table = makeTable(
      'Distribution of ' + target + ': before observing versus after ' + observed.label,
      [target + ' outcome', 'Before', 'After ' + observed.label],
      outcomes.map(function (entry, index) { return [
        entry.label, fraction(entry.probability), condition.defined ? fraction(condition.probabilities[index]) : 'Undefined'
      ]; })
    );
    Array.from(table.tBodies[0].rows).forEach(function (row, index) {
      const beforeBar = node('span', null, 'probability-bar before');
      beforeBar.style.width = (100 * outcomes[index].probability.value) + '%';
      beforeBar.setAttribute('aria-hidden', 'true');
      const beforeTrack = node('span', null, 'probability-track');
      beforeTrack.append(beforeBar);
      row.cells[1].append(beforeTrack);
      if (condition.defined) {
        const afterBar = node('span', null, 'probability-bar after');
        afterBar.style.width = (100 * condition.probabilities[index].value) + '%';
        afterBar.setAttribute('aria-hidden', 'true');
        const afterTrack = node('span', null, 'probability-track');
        afterTrack.append(afterBar);
        row.cells[2].append(afterTrack);
      }
    });
    find('conditional-distribution').replaceChildren(table);
    const weighted = makeTable(
      'Average every possible observation: H(' + target + ' given ' + given + ')',
      ['Observe', 'Probability', 'Entropy afterward', 'Weighted term'],
      entries.map(function (entry) {
        const c = observeX ? entry.conditionalY : entry.conditionalX;
        return [entry.label, fraction(entry.probability), c.defined ? bits(c.entropyBits) : 'Undefined', bits(c.weightedEntropyBits)];
      })
    );
    weighted.tBodies[0].rows[observedIndex].classList.add('observed-row');
    const foot = node('tfoot');
    const sumRow = node('tr');
    sumRow.append(cell('th', 'Average', 'row'), cell('td', '1'), cell('td', 'Probability-weighted'), cell('td', bits(average)));
    foot.append(sumRow);
    weighted.append(foot);
    find('weighted-conditionals').replaceChildren(weighted);
    if (announce) status.textContent = 'Applied table unchanged. Conditioning view: observe ' + observed.label + (condition.defined ? '.' : ' — undefined because there are no such cards.');
  }
  function applyTable(focusResult) {
    retire('Checking the table…');
    try {
      const text = countsInput.value;
      const analysis = analyzeInformationTable(parseInformationCounts(text));
      applied = { text, analysis };
      result.hidden = false;
      find('conditioning-controls').disabled = false;
      find('download-observation').disabled = false;
      find('applied-summary').textContent = analysis.total + ' cards · ' + analysis.rows.length + ' X labels · ' + analysis.columns.length + ' Y labels';
      output('entropy-x', analysis.metrics.entropyXBits);
      output('entropy-y', analysis.metrics.entropyYBits);
      output('entropy-joint', analysis.metrics.jointEntropyBits);
      output('mutual-information', analysis.metrics.mutualInformationBits);
      resetConditioning();
      renderJoint();
      renderDecomposition();
      renderIndependence();
      renderContributions();
      renderConditioning(false);
      status.textContent = 'Applied ' + analysis.total + ' cards. Counts and fractions are exact; information values are approximate bits.';
      if (focusResult) find('result-heading').focus();
    } catch (cause) {
      retire('No applied table. Correct the input and apply it again.');
      error.textContent = cause instanceof Error ? cause.message : String(cause);
      error.hidden = false;
      countsInput.setAttribute('aria-invalid', 'true');
      countsInput.focus();
    }
  }
  function saveText(filename, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const anchor = node('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.hidden = true;
    doc.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  const exampleSelect = find('example-choice');
  INFORMATION_EXAMPLES.forEach(function (example) {
    const option = node('option', example.title);
    option.value = example.id;
    exampleSelect.append(option);
  });
  exampleSelect.value = 'noisy';
  function updateExampleNote() {
    const example = INFORMATION_EXAMPLES.find(function (entry) { return entry.id === exampleSelect.value; });
    find('example-note').textContent = example.note;
  }
  exampleSelect.addEventListener('change', updateExampleNote);
  find('use-example').addEventListener('click', function () {
    const example = INFORMATION_EXAMPLES.find(function (entry) { return entry.id === exampleSelect.value; });
    countsInput.value = example.text;
    applyTable(true);
  });
  countsInput.addEventListener('input', function () { retire('Draft changed. Apply the table to calculate and download its result.'); });
  find('count-form').addEventListener('submit', function (event) { event.preventDefault(); applyTable(true); });
  axisInput.addEventListener('change', function () { fillConditionValues(); renderConditioning(true); });
  valueInput.addEventListener('change', function () { renderConditioning(true); });
  find('download-observation').addEventListener('click', function () {
    if (!applied) return;
    const axis = axisInput.value;
    const index = Number(valueInput.value);
    const entry = (axis === 'X' ? applied.analysis.rows : applied.analysis.columns)[index];
    if (!entry) return;
    const observation = {
      format: 'recallweave-information-observation/1',
      appliedText: applied.text,
      conditioning: { observedAxis: axis, observedIndex: index, observedLabel: entry.label },
      analysis: applied.analysis
    };
    saveText('information-observation.json', JSON.stringify(observation, null, 2) + '\n', 'application/json;charset=utf-8');
    status.textContent = 'Observation download requested for the applied table and ' + entry.label + ' view.';
  });
  find('download-course').addEventListener('click', function () {
    saveText('information-theory.json', downloads.courseText, 'application/json;charset=utf-8');
    status.textContent = 'Course download requested. This fixed sixteen-question lesson is independent of the editable table.';
  });
  find('download-guide').addEventListener('click', function () {
    saveText('information-theory.md', downloads.guideText, 'text/markdown;charset=utf-8');
    status.textContent = 'Worked guide download requested.';
  });
  updateExampleNote();
  countsInput.value = INFORMATION_EXAMPLES.find(function (entry) { return entry.id === 'noisy'; }).text;
  applyTable(false);
}
