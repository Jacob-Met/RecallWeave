import { UNIT_CATALOG, parseUnitExpression, convertUnits } from './unit-conversion.mjs';

const quantityInput = document.getElementById('quantity');
const fromInput = document.getElementById('from-unit');
const toInput = document.getElementById('to-unit');
const resultRegion = document.getElementById('conversion-result');
const statusRegion = document.getElementById('conversion-status');
const dimensionRegion = document.getElementById('dimension-panel');
const dimensionRows = document.getElementById('dimension-rows');
const recordButton = document.getElementById('download-conversion');
const downloadStatus = document.getElementById('download-status');
let currentRecord = null;

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function baseUnitText(dimensions) {
  const symbols = ['m', 'kg', 's'];
  const terms = dimensions.flatMap((exponent, index) => exponent === 0 ? [] :
    [symbols[index] + (exponent === 1 ? '' : '^' + exponent)]);
  return terms.join(' · ') || '1';
}

function showDimensions(from, to) {
  dimensionRows.replaceChildren();
  const labels = ['Length · L', 'Mass · M', 'Time · T'];
  for (let i = 0; i < labels.length; i++) {
    const row = element('tr');
    const label = element('th', labels[i]);
    label.scope = 'row';
    row.append(label, element('td', String(from.dimensions[i])), element('td', String(to.dimensions[i])));
    if (from.dimensions[i] !== to.dimensions[i]) row.className = 'dimension-difference';
    dimensionRows.append(row);
  }
  dimensionRegion.hidden = false;
  const match = from.dimensions.every((value, index) => value === to.dimensions[index]);
  document.getElementById('dimension-summary').textContent = match
    ? 'The dimension powers match. The unit scales can be compared.'
    : 'The dimension powers differ. Changing scale cannot connect these units.';
  document.getElementById('dimension-badge').textContent = match ? 'Dimensions match' : 'Different dimensions';
  document.getElementById('dimension-badge').dataset.match = String(match);
}

function scaleCard(label, unit) {
  const card = element('div', undefined, 'scale-card');
  card.append(element('h4', label), element('p', unit.normalized, 'formula unit-expression'));
  card.append(element('p', unit.scale.exact + ' × ' + baseUnitText(unit.dimensions), 'formula base-expression'));
  return card;
}

function showResult(record) {
  const heading = element('div', undefined, 'result-heading');
  const marker = element('p', 'Same quantity, new unit', 'eyebrow');
  const answer = element('h2', undefined, 'answer');
  const number = element('span', record.display.text);
  number.id = 'converted-value';
  answer.append(number, element('span', record.to.normalized, 'answer-unit'));
  const precision = element('p', record.display.rounded
    ? 'Display rounded to 12 significant digits. The exact result is kept below.'
    : 'This displayed value is exact for the number you entered.', 'help');
  precision.id = 'precision-notice';
  heading.append(marker, answer, precision);
  const calculation = element('div', undefined, 'calculation');
  const steps = element('ol', undefined, 'steps');

  const first = element('li');
  first.append(element('h3', 'Express both units in m, kg and s'));
  const scales = element('div', undefined, 'scale-pair');
  scales.append(scaleCard('From unit', record.from), scaleCard('To unit', record.to));
  first.append(scales);

  const second = element('li');
  second.append(element('h3', 'Divide the source scale by the target scale'));
  const factor = element('p', '(' + record.from.scale.exact + ') ÷ (' + record.to.scale.exact + ') = ' + record.factor.exact, 'formula');
  factor.id = 'exact-factor';
  second.append(factor, element('p', 'The matching base units cancel; this factor changes the numerical value.', 'help'));

  const third = element('li');
  third.append(element('h3', 'Multiply the entered number by that factor'));
  const exact = element('p', record.quantity.exact + ' × (' + record.factor.exact + ') = ' + record.result.exact, 'formula');
  exact.id = 'exact-result';
  third.append(exact, element('p', 'The result is expressed in ' + record.to.normalized + '.', 'help'));
  steps.append(first, second, third);
  calculation.append(steps);
  resultRegion.replaceChildren(heading, calculation);
  resultRegion.hidden = false;
}

function updateConversion() {
  currentRecord = null;
  recordButton.disabled = true;
  resultRegion.replaceChildren();
  resultRegion.hidden = true;
  dimensionRows.replaceChildren();
  dimensionRegion.hidden = true;
  statusRegion.className = 'status';
  statusRegion.textContent = '';
  for (const input of [quantityInput, fromInput, toInput]) input.removeAttribute('aria-invalid');

  let from;
  let to;
  try { from = parseUnitExpression(fromInput.value); }
  catch (error) {
    fromInput.setAttribute('aria-invalid', 'true');
    statusRegion.className = 'status error';
    statusRegion.textContent = 'From unit: ' + error.message;
    return null;
  }
  try { to = parseUnitExpression(toInput.value); }
  catch (error) {
    toInput.setAttribute('aria-invalid', 'true');
    statusRegion.className = 'status error';
    statusRegion.textContent = 'To unit: ' + error.message;
    return null;
  }
  showDimensions(from, to);
  try {
    currentRecord = convertUnits(quantityInput.value, fromInput.value, toInput.value);
    showResult(currentRecord);
    recordButton.disabled = false;
    statusRegion.textContent = 'Conversion updated. Exact factors and the current result are ready below.';
    return currentRecord;
  } catch (error) {
    if (error.code !== 'INCOMPATIBLE_DIMENSIONS') quantityInput.setAttribute('aria-invalid', 'true');
    statusRegion.className = 'status error';
    statusRegion.textContent = error.message;
    return null;
  }
}

function download(text, filename) {
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = element('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.hidden = true;
  document.body.append(anchor);
  try { anchor.click(); }
  finally { anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
}

document.getElementById('conversion-form').addEventListener('submit', event => {
  event.preventDefault();
  updateConversion();
});
for (const input of [quantityInput, fromInput, toInput]) {
  input.addEventListener('input', () => { downloadStatus.textContent = ''; updateConversion(); });
}

const presets = {
  speed: ['72', 'km/h', 'm/s'],
  area: ['3', 'cm^2', 'mm^2'],
  volume: ['250', 'cm^3', 'L'],
  density: ['2.5', 'g/cm^3', 'kg/m^3'],
  case: ['4', 'MJ', 'mJ'],
  mismatch: ['1', 'm', 's'],
};
for (const button of document.querySelectorAll('[data-preset]')) {
  button.addEventListener('click', () => {
    [quantityInput.value, fromInput.value, toInput.value] = presets[button.dataset.preset];
    downloadStatus.textContent = '';
    updateConversion();
  });
}

recordButton.addEventListener('click', () => {
  // Read the live inputs again, including changes made without an input event.
  const record = updateConversion();
  if (!record) return;
  download(JSON.stringify(record, null, 2) + '\n', 'recallweave-unit-conversion-v1.json');
  downloadStatus.textContent = 'Current conversion download requested. It includes exact rational values and the displayed rounding label.';
});
document.getElementById('download-unit-deck').addEventListener('click', () => {
  download(unitCourseText, 'units-and-dimensions.json');
  downloadStatus.textContent = 'Lesson download requested. In RecallWeave, choose the file, review its preview, then select Start this deck.';
});

const catalog = document.getElementById('unit-catalog');
const suggestions = document.getElementById('unit-examples');
for (const unit of UNIT_CATALOG) {
  const row = element('tr');
  row.append(element('td', unit.symbol, 'formula'), element('td', unit.name),
    element('td', unit.scale.exact + ' × ' + baseUnitText(unit.dimensions), 'formula'));
  catalog.append(row);
  const option = element('option');
  option.value = unit.symbol;
  suggestions.append(option);
}
for (const expression of ['km/h', 'm/s', 'cm^2', 'm^2', 'cm^3', 'g/cm^3', 'kg/m^3', 'kg*m/s^2']) {
  const option = element('option');
  option.value = expression;
  suggestions.append(option);
}
updateConversion();
