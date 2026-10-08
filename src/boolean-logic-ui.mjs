import {analyzeLogic, createLogicCsv, LogicInputError} from './boolean-logic.mjs';
import {parseDeck} from './deck.mjs';

/** A separate offline companion. It has no connection to a learner session or stored state. */
export function mountBooleanLogic(root, deckText) {
  const deck = parseDeck(deckText);
  const query = selector => root.querySelector(selector);
  const leftInput = query('#expression-left');
  const rightInput = query('#expression-right');
  const filter = query('#differences-only');
  const tableSection = query('#table-section');
  const selectedSection = query('#selected-section');
  const errorNode = query('#expression-error');
  const downloadStatus = query('#download-status');
  const csvButton = query('#download-table');
  const witnessButton = query('#inspect-difference');
  let analysis = null;
  let selected = 0;
  let lastInputs = null;

  const examples = {
    implication: ['A -> B', '', 'An implication excludes just the True → False case. Inspect that row, then compare it with the two rows where A is False.'],
    converse: ['A -> B', 'B -> A', 'Reversing the arrow creates the converse. Two mixed assignments distinguish it from the original implication.'],
    contrapositive: ['A -> B', 'not B -> not A', 'Reverse the arrow and negate both ends. Every assignment gives matching outputs.'],
    demorgan: ['not (A or B)', '(not A) and (not B)', 'Negating an inclusive or requires both operands to be False. Inspect the matching columns.'],
    inference: ['((A -> B) and A) -> B', '((A -> B) and B) -> A', 'The first expression represents modus ponens. The second affirms the consequent: find its row with true premises and a false conclusion.']
  };

  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function truth(value) { return value ? 'True' : 'False'; }
  function valueNode(value) { return element('span', truth(value), value ? 'truth true-value' : 'truth false-value'); }
  function assignmentText(row) {
    return analysis.variables.length
      ? analysis.variables.map(name => `${name}=${truth(row.assignment[name])}`).join(', ')
      : 'No variables: one constant assignment';
  }
  function summaryText(summary) {
    const label = {tautology: 'Tautology', contradiction: 'Contradiction', contingent: 'Contingent'}[summary.classification];
    return `${label} · True on ${summary.trueRows} of ${summary.total} assignments`;
  }
  function showSelected() {
    const row = analysis?.rows[selected];
    const details = query('#selected-details');
    details.replaceChildren();
    selectedSection.hidden = !row;
    if (!row) return;
    query('#selected-assignment').textContent = assignmentText(row);
    for (const [label, expression, value] of [
      ['Expression 1', analysis.left, row.left],
      ...(analysis.right ? [['Expression 2', analysis.right, row.right]] : [])
    ]) {
      const item = element('div', undefined, 'selected-expression');
      item.append(element('span', label, 'eyebrow'), element('code', expression.canonical), valueNode(value));
      details.append(item);
    }
    query('#selected-meaning').textContent = analysis.right
      ? row.equal ? 'The outputs agree on this assignment. Equivalence still requires agreement on every assignment.'
        : 'The outputs differ. This assignment is a counterexample to equivalence.'
      : 'This row evaluates the formal expression under the displayed assignment.';
  }
  function showRows() {
    const head = query('#truth-head');
    const body = query('#truth-body');
    head.replaceChildren();
    body.replaceChildren();
    if (!analysis) return;
    const headers = ['Inspect', ...analysis.variables, 'Expression 1', ...(analysis.right ? ['Expression 2', 'Same result'] : [])];
    for (const label of headers) { const th = element('th', label); th.scope = 'col'; head.append(th); }
    const rows = analysis.rows.filter(row => !filter.checked || row.equal === false);
    query('#row-count').textContent = `Showing ${rows.length} of ${analysis.rows.length} assignments. Variables are alphabetical; True comes before False. CSV includes every row.`;
    query('#no-differences').hidden = rows.length !== 0;
    for (const row of rows) {
      const tr = element('tr');
      tr.dataset.row = String(row.index);
      if (selected === row.index) tr.className = 'selected-row';
      const selectCell = element('th');
      selectCell.scope = 'row';
      const button = element('button', String(row.index + 1), 'row-button');
      button.type = 'button';
      button.dataset.inspectRow = String(row.index);
      button.setAttribute('aria-label', `Inspect assignment ${row.index + 1}: ${assignmentText(row)}`);
      button.setAttribute('aria-pressed', String(selected === row.index));
      button.addEventListener('click', () => {
        selected = row.index;
        showRows();
        showSelected();
        query(`[data-inspect-row="${row.index}"]`)?.focus();
      });
      selectCell.append(button);
      tr.append(selectCell);
      for (const value of [...analysis.variables.map(name => row.assignment[name]), row.left, ...(analysis.right ? [row.right] : [])]) {
        const td = element('td'); td.append(valueNode(value)); tr.append(td);
      }
      if (analysis.right) tr.append(element('td', row.equal ? 'Yes' : 'No — counterexample', row.equal ? '' : 'different-result'));
      body.append(tr);
    }
  }
  function clearResults() {
    analysis = null;
    selected = null;
    tableSection.hidden = true;
    selectedSection.hidden = true;
    query('#truth-head').replaceChildren();
    query('#truth-body').replaceChildren();
    query('#selected-details').replaceChildren();
    for (const id of ['#left-canonical', '#right-canonical', '#left-summary', '#right-summary', '#comparison-verdict', '#selected-assignment', '#selected-meaning', '#row-count']) query(id).textContent = '';
    query('#right-result').hidden = true;
    query('#no-differences').hidden = true;
    csvButton.disabled = true;
    witnessButton.disabled = true;
    filter.disabled = true;
    filter.checked = false;
  }
  function refresh() {
    const inputs = [leftInput.value, rightInput.value];
    const changed = !lastInputs || inputs.some((text, index) => text !== lastInputs[index]);
    lastInputs = inputs;
    if (changed) { selected = 0; filter.checked = false; downloadStatus.textContent = ''; }
    leftInput.removeAttribute('aria-invalid');
    rightInput.removeAttribute('aria-invalid');
    errorNode.textContent = '';
    try {
      analysis = analyzeLogic(...inputs);
      tableSection.hidden = false;
      csvButton.disabled = false;
      filter.disabled = !analysis.right;
      witnessButton.disabled = analysis.differences.length === 0;
      query('#left-canonical').textContent = analysis.left.canonical;
      query('#left-summary').textContent = summaryText(analysis.leftSummary);
      query('#right-result').hidden = !analysis.right;
      query('#right-canonical').textContent = analysis.right?.canonical ?? '';
      query('#right-summary').textContent = analysis.rightSummary ? summaryText(analysis.rightSummary) : '';
      query('#comparison-verdict').textContent = analysis.right
        ? analysis.equivalent ? `Equivalent: the outputs match on all ${analysis.rows.length} assignments.`
          : `Not equivalent: the outputs differ on ${analysis.differences.length} of ${analysis.rows.length} assignments.`
        : 'One expression: inspect its complete truth table.';
      if (filter.checked && analysis.rows[selected]?.equal !== false) selected = analysis.differences[0] ?? null;
      showRows();
      showSelected();
    } catch (error) {
      clearResults();
      errorNode.textContent = error instanceof LogicInputError ? error.message : 'The expressions could not be evaluated. Check the inputs and try again.';
      (error.field === 'right' ? rightInput : leftInput).setAttribute('aria-invalid', 'true');
    }
  }
  function requestDownload(file) {
    let url;
    try {
      url = URL.createObjectURL(new Blob([file.text], {type: file.mediaType}));
      const link = document.createElement('a');
      link.href = url;
      link.download = file.filename;
      document.body.append(link);
      try { link.click(); } finally { link.remove(); }
      downloadStatus.textContent = `Download requested: ${file.filename}. Check your browser's downloads.`;
    } catch {
      downloadStatus.textContent = 'The download could not be prepared. Your expressions are still here; try again.';
    } finally {
      if (url) setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
  }

  for (const input of [leftInput, rightInput]) input.addEventListener('input', () => {
    query('#example-note').textContent = 'Your expressions. The grouped forms below show exactly how they are read.';
    refresh();
  });
  filter.addEventListener('change', refresh);
  witnessButton.addEventListener('click', () => {
    if (!analysis?.differences.length) return;
    selected = analysis.differences[0];
    showRows(); showSelected();
    query(`[data-inspect-row="${selected}"]`)?.focus();
  });
  for (const button of root.querySelectorAll('[data-example]')) button.addEventListener('click', () => {
    const example = examples[button.dataset.example];
    leftInput.value = example[0];
    rightInput.value = example[1];
    query('#example-note').textContent = example[2];
    refresh();
  });
  csvButton.addEventListener('click', () => {
    if (!analysis) return;
    // Re-read current controls: a programmatic value change must not download an old table.
    refresh();
    if (analysis) requestDownload(createLogicCsv(leftInput.value, rightInput.value));
  });
  query('#download-course').addEventListener('click', () => requestDownload({
    filename: 'boolean-logic.json', mediaType: 'application/json;charset=utf-8', text: deckText
  }));
  query('#course-title').textContent = deck.title;
  query('#course-attribution').textContent = deck.attribution;
  query('#course-license').textContent = deck.license;
  query('#course-count').textContent = `${deck.items.length} questions · ${deck.concepts.length} connected concepts`;
  refresh();
}
