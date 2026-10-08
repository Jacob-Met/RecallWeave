import { computeEuclid } from './euclidean-algorithm.mjs';

/** Mount only this dedicated page. Does not read or modify a learner session. */
export function mountEuclidExplorer(doc, courseText) {
  const get = id => doc.getElementById(id);
  const form = get('euclid-form'), a = get('euclid-a'), b = get('euclid-b');
  const result = get('results'), empty = get('empty'), error = get('euclid-error');
  const status = get('euclid-status'), traceButton = get('download-trace');
  let trace = null, cursor = 0;

  function retire(message) {
    trace = null;
    cursor = 0;
    result.hidden = true;
    empty.hidden = false;
    traceButton.disabled = true;
    error.hidden = true;
    error.textContent = '';
    status.textContent = message;
  }

  function combination(value, pair) {
    return value + ' = (' + pair.x + ') × ' + trace.inputs.a +
      ' + (' + pair.y + ') × ' + trace.inputs.b;
  }

  function svgNode(tag, attributes, text) {
    const node = doc.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function drawDivision(step) {
    const marks = get('diagram-marks');
    marks.replaceChildren();
    const dividend = Number(step.dividend), remainder = Number(step.remainder);
    const multiple = dividend - remainder;
    get('diagram-title').textContent = 'Division ' + step.index + ': ' + step.dividend + ' by ' + step.divisor;
    get('diagram-desc').textContent = step.quotient + ' groups of ' + step.divisor + ' total ' + multiple +
      ', with remainder ' + step.remainder + '. The strip represents the dividend.';
    if (dividend === 0) {
      marks.append(svgNode('text', {x:30, y:55}, 'Zero dividend: no positive length to draw.'));
      return;
    }
    const left = 30, width = 640, split = width * multiple / dividend;
    if (multiple > 0) marks.append(svgNode('rect', {x:left, y:32, width:split, height:32, fill:'#286169', rx:3}));
    if (remainder > 0) marks.append(svgNode('rect', {x:left + split, y:32, width:width - split, height:32, fill:'#b88a26', rx:3}));
    marks.append(svgNode('text', {x:left, y:22}, 'Dividend ' + step.dividend));
    marks.append(svgNode('text', {x:left, y:91}, step.quotient + ' × ' + step.divisor + ' = ' + multiple));
    marks.append(svgNode('text', {x:left + width, y:91, 'text-anchor':'end'}, 'Remainder ' + step.remainder));
  }

  function renderStep() {
    if (!trace || trace.steps.length === 0) return;
    const step = trace.steps[cursor];
    get('step-count').textContent = 'Inspecting division ' + (cursor + 1) + ' of ' + trace.steps.length;
    get('division-equation').textContent = step.dividend + ' = ' + step.quotient + ' × ' + step.divisor + ' + ' + step.remainder;
    get('remainder-bound').textContent = 'Remainder check: 0 ≤ ' + step.remainder + ' < ' + step.divisor + '.';
    get('next-pair').textContent = 'Next pair: (' + step.divisor + ', ' + step.remainder + '). ' +
      (step.remainder === '0' ? 'The second entry is zero, so the algorithm stops here.' : 'The remainder becomes the next divisor.');
    get('dividend-combination').textContent = combination(step.dividend, step.dividendCoefficients);
    get('divisor-combination').textContent = combination(step.divisor, step.divisorCoefficients);
    get('remainder-combination').textContent = combination(step.remainder, step.remainderCoefficients);
    get('previous-step').disabled = cursor === 0;
    get('next-step').disabled = cursor === trace.steps.length - 1;
    get('last-step').disabled = cursor === trace.steps.length - 1;
    for (const row of get('division-rows').children) {
      if (Number(row.dataset.index) === cursor) row.setAttribute('aria-current', 'step');
      else row.removeAttribute('aria-current');
    }
    drawDivision(step);
  }

  function inspect(index) {
    if (!trace || index < 0 || index >= trace.steps.length) return;
    cursor = index;
    renderStep();
    status.textContent = 'Computed gcd ' + trace.gcd + '. Inspecting division ' + (cursor + 1) + ' of ' + trace.steps.length + '.';
  }

  function renderResult() {
    get('gcd-value').textContent = trace.gcd;
    get('result-inputs').textContent = 'gcd(' + trace.inputs.a + ', ' + trace.inputs.b + ') = ' + trace.gcd;
    get('result-count').textContent = trace.steps.length + (trace.steps.length === 1 ? ' actual division.' : ' actual divisions.');
    get('bezout-result').textContent = combination(trace.gcd, trace.coefficients);
    get('zero-convention').hidden = trace.inputs.a !== '0' || trace.inputs.b !== '0';
    get('no-divisions').hidden = trace.steps.length !== 0;
    get('inspector').hidden = trace.steps.length === 0;
    const rows = get('division-rows');
    rows.replaceChildren();
    trace.steps.forEach((step, index) => {
      const row = doc.createElement('tr');
      row.dataset.index = String(index);
      const first = doc.createElement('td');
      const button = doc.createElement('button');
      button.type = 'button';
      button.textContent = String(step.index);
      button.setAttribute('aria-label', 'Inspect division ' + step.index);
      button.addEventListener('click', () => inspect(index));
      first.append(button); row.append(first);
      for (const field of ['dividend', 'divisor', 'quotient', 'remainder']) {
        const cell = doc.createElement('td'); cell.textContent = step[field]; row.append(cell);
      }
      rows.append(row);
    });
    result.hidden = false; empty.hidden = true; traceButton.disabled = false;
    error.hidden = true; error.textContent = '';
    if (trace.steps.length) inspect(0);
    else status.textContent = 'Computed gcd ' + trace.gcd + '. The initial second entry is zero; no division was performed.';
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    retire('Checking the two inputs.');
    try { trace = computeEuclid(a.value, b.value); renderResult(); }
    catch (failure) {
      retire('No current calculation. Correct the inputs and compute again.');
      error.textContent = failure.message; error.hidden = false;
    }
  });
  for (const field of [a, b]) field.addEventListener('input', () => {
    retire('Inputs changed. Compute again to create a current result and trace.');
  });
  get('load-example').addEventListener('click', () => {
    const values = get('example').value.split(',');
    a.value = values[0]; b.value = values[1];
    retire('Example loaded. Choose Compute the steps to inspect this pair.');
    get('compute').focus();
  });
  get('previous-step').addEventListener('click', () => inspect(cursor - 1));
  get('next-step').addEventListener('click', () => inspect(cursor + 1));
  get('last-step').addEventListener('click', () => { if (trace) inspect(trace.steps.length - 1); });

  function download(text, filename) {
    const url = URL.createObjectURL(new Blob([text], {type:'application/json;charset=utf-8'}));
    const anchor = doc.createElement('a');
    try {
      anchor.href = url; anchor.download = filename; anchor.hidden = true;
      doc.body.append(anchor); anchor.click();
    } finally {
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }
  traceButton.addEventListener('click', () => {
    if (!trace) return;
    try {
      download(JSON.stringify(trace, null, 2) + '\n', 'euclid-' + trace.inputs.a + '-' + trace.inputs.b + '.json');
      status.textContent = 'Trace download requested for (' + trace.inputs.a + ', ' + trace.inputs.b + '). The calculation is unchanged.';
    } catch {
      status.textContent = 'The trace download could not start. The current calculation is unchanged; try again.';
    }
  });
  get('download-course').addEventListener('click', () => {
    try {
      download(courseText, 'euclidean-algorithm.json');
      status.textContent = 'Lesson download requested. Open the JSON through RecallWeave’s Bring your own lesson control.';
    } catch {
      status.textContent = 'The lesson download could not start. Your inputs and calculation are unchanged; try again.';
    }
  });
}
