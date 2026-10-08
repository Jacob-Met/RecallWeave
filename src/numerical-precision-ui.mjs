import { analyzeDecimalOperation, serializeWorkedExample, PRECISION_PRESETS } from './numerical-precision.mjs';

const byId = id => document.getElementById(id);
const form = byId('precision-form');
const inputA = byId('precision-a');
const inputB = byId('precision-b');
const operation = byId('precision-operation');
const resultPanel = byId('precision-result');
const status = byId('precision-status');
const errorBox = byId('precision-error');
const workedButton = byId('download-worked');
const deckText = JSON.parse(byId('precision-deck-json').textContent);
const guideText = JSON.parse(byId('precision-guide-json').textContent);
const deck = JSON.parse(deckText);
let current = null;

function element(name, text, className) {
  const node = document.createElement(name);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function clearError() {
  errorBox.textContent = '';
  errorBox.hidden = true;
  for (const field of [inputA, inputB, operation]) field.removeAttribute('aria-invalid');
}
function invalidate(message = 'Inputs changed. Choose Compare values to calculate this example.') {
  current = null;
  workedButton.disabled = true;
  resultPanel.hidden = true;
  clearError();
  status.textContent = message;
}
function exactCell(value) {
  const cell = element('td');
  const details = element('details', undefined, 'exact-value');
  const short = value.decimal.length > 38 ? value.decimal.slice(0, 35) + '…' : value.decimal;
  const summary = element('summary', short);
  summary.setAttribute('aria-label', 'Exact value ' + short + '. Expand for all digits and the fraction.');
  const body = element('div', undefined, 'exact-body');
  body.append(element('span', 'Exact decimal', 'tiny-label'), element('code', value.decimal),
    element('span', 'Reduced fraction', 'tiny-label'), element('code', value.fraction));
  details.append(summary, body);
  cell.append(details);
  return cell;
}
function exactRow(label, note, value) {
  const row = element('tr');
  const heading = element('th');
  heading.scope = 'row';
  heading.append(element('span', label), element('small', note));
  row.append(heading, exactCell(value));
  return row;
}
function integerLabel(value) {
  if (!value.isInteger) return 'Fractional Number: the integer guarantee does not apply.';
  return value.isSafeInteger
    ? 'Integer inside the guaranteed safe interval.'
    : 'Integer outside the guaranteed safe interval; this flag alone does not say whether this example rounded.';
}
function explanation(record) {
  const r = record.result;
  if (r.exactMatch) {
    if (!r.conversionContribution.isZero || !r.arithmeticContribution.isZero) {
      return 'The final value matches the decimal reference, although the two signed contributions cancel.';
    }
    if (!record.a.conversionDiscrepancy.isZero || !record.b.conversionDiscrepancy.isZero) {
      return 'The final value matches the decimal reference. Some inputs rounded, but their combined contribution is zero.';
    }
    return 'For these values, input conversion and arithmetic introduce no discrepancy.';
  }
  if (r.arithmeticContribution.isZero) {
    return 'The operation on the stored operands is exact. Earlier input conversion accounts for the discrepancy.';
  }
  if (r.conversionContribution.isZero) {
    return 'The combined input-conversion contribution is zero. The operation introduces the displayed discrepancy.';
  }
  return 'Input conversion and the operation both contribute. The signed rows below show how they combine.';
}
function showOperand(id, value, name) {
  const body = byId(id);
  body.replaceChildren(
    exactRow('Written decimal', 'The exact value of your input text.', value.exact),
    exactRow('Stored Number', 'The exact value represented by the binary64 bits.', value.stored),
    exactRow('Conversion discrepancy', 'Stored value minus written decimal.', value.conversionDiscrepancy));
  byId(id + '-label').textContent = name + ' Number label: ' + value.display;
  byId(id + '-bits').textContent = 'Binary64 bits (hex): 0x' + value.bits;
}
function render(record) {
  const r = record.result;
  byId('number-result').textContent = r.display;
  byId('precision-verdict').textContent = r.exactMatch
    ? 'Matches the written-decimal result' : 'Differs from the written-decimal result';
  byId('precision-verdict').className = 'verdict ' + (r.exactMatch ? 'matches' : 'differs');
  byId('precision-explanation').textContent = explanation(record);
  byId('integer-status').textContent = integerLabel(r);
  byId('result-bits').textContent = 'Stored result bits (hex): 0x' + r.bits;
  byId('zero-note').hidden = ![record.a, record.b, r].some(value => value.isNegativeZero);
  byId('value-rows').replaceChildren(
    exactRow('1 · Decimal reference', 'Exact arithmetic on the written input values.', r.decimalIntent),
    exactRow('2 · After conversion', 'Exact arithmetic on the already stored operands, before operation rounding.', r.storedOperandArithmetic),
    exactRow('3 · Stored result', 'The exact value of the actual JavaScript Number result.', r.actual));
  byId('error-rows').replaceChildren(
    exactRow('Operand conversion', 'Step 2 minus step 1.', r.conversionContribution),
    exactRow('Operation rounding', 'Step 3 minus step 2.', r.arithmeticContribution),
    exactRow('Total discrepancy', 'Step 3 minus step 1; exactly the sum of the two signed contributions.', r.totalDiscrepancy));
  showOperand('operand-a-rows', record.a, 'First value');
  showOperand('operand-b-rows', record.b, 'Second value');
  resultPanel.hidden = false;
  workedButton.disabled = false;
  status.textContent = 'Comparison ready. Exact values, signed contributions and a worked-record download are available.';
}
function compare() {
  clearError();
  try {
    const next = analyzeDecimalOperation(inputA.value, operation.value, inputB.value);
    current = next;
    render(next);
  } catch (error) {
    invalidate('No result is displayed for these inputs.');
    errorBox.textContent = error.message;
    errorBox.hidden = false;
    const field = { a: inputA, b: inputB, operation }[error.field];
    if (field) {
      field.setAttribute('aria-invalid', 'true');
      field.focus();
    }
  }
}
form.addEventListener('submit', event => {
  event.preventDefault();
  compare();
});
for (const field of [inputA, inputB, operation]) {
  field.addEventListener('input', () => invalidate());
  field.addEventListener('change', () => invalidate());
}
for (const preset of PRECISION_PRESETS) {
  const button = element('button', preset.title, 'preset');
  button.type = 'button';
  button.dataset.preset = preset.id;
  button.addEventListener('click', () => {
    inputA.value = preset.a;
    inputB.value = preset.b;
    operation.value = preset.operation;
    compare();
  });
  byId('precision-presets').append(button);
}

function download(contents, filename, mimeType) {
  let url;
  let link;
  try {
    const blob = new Blob([contents], { type: mimeType + ';charset=utf-8' });
    url = URL.createObjectURL(blob);
    link = element('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    status.textContent = 'Download prepared. Use your browser’s download controls to keep the file.';
  } catch {
    errorBox.textContent = 'Could not prepare the download. Your comparison is still available; try the download again.';
    errorBox.hidden = false;
  } finally {
    link?.remove();
    if (url) setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
workedButton.addEventListener('click', () => {
  if (!current || current.a.input !== inputA.value || current.b.input !== inputB.value ||
      current.operation !== operation.value) {
    invalidate('Compare the current inputs before downloading a worked record.');
    return;
  }
  clearError();
  download(serializeWorkedExample(current.a.input, current.operation, current.b.input),
    'numerical-precision-worked.json', 'application/json');
});
byId('download-lesson').addEventListener('click', () => {
  clearError();
  download(deckText, 'numerical-precision.json', 'application/json');
});
byId('download-guide').addEventListener('click', () => {
  clearError();
  download(guideText, 'numerical-precision-guide.md', 'text/markdown');
});

for (const item of deck.items) {
  const article = element('article', undefined, 'question');
  const title = element('h3', item.id + ' · ' + item.concept);
  const choices = element('ol');
  choices.type = 'A';
  for (const option of item.options) choices.append(element('li', option));
  const answer = element('details');
  answer.append(element('summary', 'Reveal the worked answer'),
    element('p', String.fromCharCode(65 + item.answer) + '. ' + item.explanation),
    element('p', 'Transfer: ' + item.transfer, 'transfer'));
  article.append(title, element('p', item.prompt), choices, answer);
  byId('precision-questions').append(article);
}
const initial = PRECISION_PRESETS[0];
inputA.value = initial.a;
inputB.value = initial.b;
operation.value = initial.operation;
compare();
