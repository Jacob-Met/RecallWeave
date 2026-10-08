import { parseBinarySearchInput, traceLowerBound, BINARY_SEARCH_PRESETS } from './binary-search-explorer.mjs';

const $ = id => document.getElementById(id);
let trace = null;
let position = 0;
let enteredText = null;

function node(tag, text, className) {
  const item = document.createElement(tag);
  if (text !== undefined) item.textContent = text;
  if (className) item.className = className;
  return item;
}
function status(text, error = false) {
  $('file-status').textContent = text;
  $('file-status').classList.toggle('error', error);
}
function invalidate(message = 'Inputs changed. Build a new trace to inspect these values.') {
  trace = null;
  enteredText = null;
  position = 0;
  $('trace-view').hidden = true;
  $('empty-view').hidden = false;
  $('empty-view').textContent = message;
  $('download-trace').disabled = true;
  for (const id of ['first-step', 'previous-step', 'next-step', 'last-step']) $(id).disabled = true;
  $('input-error').textContent = '';
  $('values').removeAttribute('aria-invalid');
  $('target').removeAttribute('aria-invalid');
  status('');
}
function render() {
  if (!trace) return;
  const current = trace.steps[position];
  const previous = position > 0 ? trace.steps[position - 1] : null;
  const lo = current ? current.lo : trace.boundary;
  const hi = current ? current.hi : trace.boundary;
  const finished = !current;
  $('trace-view').hidden = false;
  $('empty-view').hidden = true;
  $('step-count').textContent = `${position} of ${trace.comparisons} ordering comparisons`;
  $('bounds').textContent = `[${lo}, ${hi})`;
  $('possible-boundaries').textContent = `[${lo}, ${hi}]`;
  $('remaining').textContent = String(hi - lo);
  $('trace-target').textContent = String(trace.target);
  $('trace-heading').textContent = finished ? `One boundary remains: ${trace.boundary}` : 'Inspect the current interval';
  $('array').replaceChildren();
  for (let index = 0; index <= trace.values.length; index++) {
    const end = index === trace.values.length;
    const classification = end ? 'end' : index < lo ? 'less' : index >= hi ? 'at-least' : 'unresolved';
    const cell = node('li', undefined, `array-cell ${classification}`);
    const markers = [];
    if (index === lo) markers.push('lo');
    if (index === hi) markers.push('hi');
    if (finished && index === trace.boundary) markers.push('result');
    cell.append(node('span', `boundary ${index}`, 'boundary-label'));
    cell.append(node('span', markers.length ? markers.join(' · ') : '\u00a0', 'boundary-marker'));
    cell.append(node('strong', end ? 'END' : String(trace.values[index]), 'array-value'));
    cell.append(node('span', end ? 'no element' : `index ${index}`, 'index-label'));
    cell.append(node('span', end ? 'after array' : classification === 'less' ? '< target'
      : classification === 'at-least' ? '≥ target' : 'unresolved', 'classification'));
    if (current?.mid === index) {
      cell.classList.add('middle');
      cell.append(node('span', 'next mid', 'middle-label'));
    }
    if (finished && index === trace.boundary) cell.classList.add('result-cell');
    $('array').append(cell);
  }
  $('last-decision').textContent = previous
    ? `Compared index ${previous.mid}: ${previous.value} ${previous.lessThanTarget ? '<' : '≥'} ${trace.target}. `
      + (previous.lessThanTarget
        ? `Set lo = mid + 1 = ${previous.nextLo}. The compared element and everything before it are too small.`
        : `Set hi = mid = ${previous.nextHi}. This element is known to qualify; the boundary before it remains possible.`)
    : 'No array element has been compared yet.';
  if (finished) {
    $('next-decision').textContent = trace.values.length === 0
      ? 'The empty array has one insertion boundary, 0. The loop reads no element.'
      : `lo equals hi, so the unresolved interval is empty. The insertion boundary is ${trace.boundary}.`;
    $('membership').textContent = trace.present
      ? `Target ${trace.target} is present. Index ${trace.boundary} is its first occurrence.`
      : trace.values.length === 0
        ? `Target ${trace.target} is absent. Boundary 0 is the empty array’s only insertion boundary.`
        : trace.boundary === trace.values.length
          ? `Target ${trace.target} is absent. Boundary ${trace.boundary} is after the final element.`
          : `Target ${trace.target} is absent. Insert it before index ${trace.boundary}, whose value is ${trace.values[trace.boundary]}.`;
  } else {
    $('next-decision').textContent = `Next middle index: ${lo} + floor((${hi} − ${lo}) / 2) = ${current.mid}. `
      + `The next comparison checks whether ${current.value} < ${trace.target}.`;
    $('membership').textContent = 'The final boundary and equality check are shown when the trace finishes.';
  }
  $('history-body').replaceChildren();
  for (const [index, step] of trace.steps.slice(0, position).entries()) {
    const row = node('tr');
    const decision = `${step.value} ${step.lessThanTarget ? '<' : '≥'} ${trace.target}; `
      + (step.lessThanTarget ? `lo = ${step.nextLo}` : `hi = ${step.nextHi}`);
    for (const value of [index + 1, `[${step.lo}, ${step.hi})`, step.mid, step.value, decision,
      `[${step.nextLo}, ${step.nextHi})`]) row.append(node('td', String(value)));
    $('history-body').append(row);
  }
  $('no-history').hidden = position > 0;
  $('history-table').hidden = position === 0;
  $('first-step').disabled = position === 0;
  $('previous-step').disabled = position === 0;
  $('next-step').disabled = finished;
  $('last-step').disabled = finished;
  $('download-trace').disabled = false;
  $('step-announcement').textContent = `${position} comparisons completed. Unresolved indices [${lo}, ${hi}). `
    + (finished ? $('membership').textContent : `Next middle index ${current.mid}.`);
}
function build(focus = true) {
  invalidate();
  try {
    const input = parseBinarySearchInput($('values').value, $('target').value);
    trace = traceLowerBound(input.values, input.target);
    enteredText = { values: $('values').value, target: $('target').value };
    render();
    if (focus) $('trace-heading').focus();
  } catch (error) {
    $('empty-view').textContent = 'No current trace. Correct the entered values and build again.';
    $('input-error').textContent = error.message;
    const field = error.field === 'target' ? $('target') : $('values');
    field.setAttribute('aria-invalid', 'true');
    if (focus) field.focus();
  }
}
function move(next) {
  if (!trace) return;
  position = Math.max(0, Math.min(next, trace.comparisons));
  const active = document.activeElement;
  render();
  if (active?.disabled) $('trace-heading').focus();
}
function download(contents, filename, type) {
  let url;
  let link;
  try {
    url = URL.createObjectURL(new Blob([contents], { type }));
    link = node('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    status(`Download started: ${filename}`);
  } catch (error) {
    status('Could not prepare the download. Your current trace is unchanged; try again. ' + error.message, true);
  } finally {
    link?.remove();
    if (url) setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
for (const preset of BINARY_SEARCH_PRESETS) {
  const option = node('option', preset.label);
  option.value = preset.id;
  $('example').append(option);
}
$('apply-example').addEventListener('click', () => {
  const preset = BINARY_SEARCH_PRESETS.find(item => item.id === $('example').value);
  if (!preset) return;
  $('values').value = preset.values;
  $('target').value = preset.target;
  invalidate('Example loaded. Build a trace when you are ready.');
  $('values').focus();
});
$('search-form').addEventListener('input', () => invalidate());
$('search-form').addEventListener('submit', event => { event.preventDefault(); build(); });
$('first-step').addEventListener('click', () => move(0));
$('previous-step').addEventListener('click', () => move(position - 1));
$('next-step').addEventListener('click', () => move(position + 1));
$('last-step').addEventListener('click', () => move(trace?.comparisons ?? 0));
$('download-trace').addEventListener('click', () => {
  if (!trace || !enteredText) return;
  download(JSON.stringify({ ...trace, enteredText }, null, 2) + '\n', 'binary-search-trace.json', 'application/json;charset=utf-8');
});
$('download-course').addEventListener('click', () => download(SOURCE_DECK, 'binary-search.json', 'application/json;charset=utf-8'));
$('download-guide').addEventListener('click', () => download(SOURCE_GUIDE, 'binary-search.md', 'text/markdown;charset=utf-8'));
build(false);
