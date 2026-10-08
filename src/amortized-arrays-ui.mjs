import { parseArrayInputs, traceArrays, arrayObservation } from './amortized-arrays.mjs';

/** Install this standalone companion; it has no learner-state or storage access. */
export function mountArrayLab(document, { courseText, guideText }) {
  const window = document.defaultView;
  const byId = id => document.getElementById(id);
  const count = byId('append-count');
  const increment = byId('growth-increment');
  const status = byId('status');
  const results = byId('results');
  const select = byId('step-select');
  const observationButton = byId('download-observation');
  const navigation = ['first', 'back', 'next', 'last'].map(byId);
  let applied = null;
  let cursor = 0;

  function message(text, error = false) {
    status.textContent = text;
    status.classList.toggle('error', error);
  }
  function retire() {
    applied = null;
    cursor = 0;
    results.hidden = true;
    observationButton.disabled = true;
    select.disabled = true;
    navigation.forEach(button => { button.disabled = true; });
    count.removeAttribute('aria-invalid');
    increment.removeAttribute('aria-invalid');
    message('Inputs changed. Apply the comparison to calculate a new result. The previous observation is retired.');
  }
  function save(text, name, type) {
    const blob = new window.Blob([text], { type });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  }
  function card(id, row, geometric) {
    const root = byId(id);
    const field = name => root.querySelector(`[data-value="${name}"]`);
    field('cost').textContent = String(row.cost);
    field('total').textContent = String(row.totalCost);
    field('spare').textContent = String(row.spare);
    field('detail').textContent = row.step === 0
      ? 'Initially empty: size 0, capacity 0. No copies and no new write. Average per append is not defined.'
      : `${row.resized ? 'Resize' : 'No resize'}: capacity ${row.capacityBefore} → ${row.capacity}; size ${row.sizeBefore} → ${row.size}. ${row.copies} copied + 1 new write = ${row.cost} actual units.`;
    const slots = field('slots');
    slots.replaceChildren();
    if (row.capacity === 0) {
      const empty = document.createElement('p');
      empty.textContent = 'No slots allocated.';
      empty.style.gridColumn = '1 / -1';
      slots.append(empty);
    }
    for (let index = 0; index < row.capacity; index += 1) {
      const cell = document.createElement('span');
      const live = index < row.size;
      const copied = row.resized && index < row.sizeBefore;
      const fresh = row.step > 0 && index === row.size - 1;
      cell.className = `slot${live ? ' live' : ''}${copied ? ' copied' : ''}${fresh ? ' new' : ''}`;
      cell.textContent = live ? String(row.elements[index]) : '·';
      cell.setAttribute('aria-label', `Slot ${index}: ${live ? `element ${row.elements[index]}${copied ? ', copied now' : ''}${fresh ? ', newly stored' : ''}` : 'spare'}`);
      slots.append(cell);
    }
    if (geometric) {
      field('potential').textContent = row.step === 0
        ? 'Initial Phi = 0. No operation and no amortized charge yet.'
        : `Phi: ${row.potentialBefore} → ${row.potential}. Charge = ${row.cost} + (${row.potential} − ${row.potentialBefore}) = ${row.amortizedCost}. Total charges so far: ${row.totalAmortized}.`;
    }
  }
  function inspect(index) {
    if (!applied) return;
    cursor = Math.max(0, Math.min(applied.input.appends, index));
    select.value = String(cursor);
    byId('step-label').textContent = `Step ${cursor} of ${applied.input.appends}${cursor === 0 ? ' · initially empty' : ''}`;
    navigation[0].disabled = navigation[1].disabled = cursor === 0;
    navigation[2].disabled = navigation[3].disabled = cursor === applied.input.appends;
    card('doubling-card', applied.doubling.steps[cursor], true);
    card('fixed-card', applied.fixedIncrement.steps[cursor], false);
    for (const row of results.querySelectorAll('tbody tr')) {
      row.classList.toggle('current', row.dataset.step === String(cursor));
      if (row.dataset.step === String(cursor)) row.setAttribute('aria-current', 'step');
      else row.removeAttribute('aria-current');
    }
  }
  function ledger(id, steps, geometric) {
    const body = byId(id).querySelector('tbody');
    body.replaceChildren();
    for (const row of steps) {
      const tr = document.createElement('tr');
      tr.dataset.step = String(row.step);
      const values = [row.step, row.size, row.capacity, row.copies, row.writes, row.cost, row.totalCost];
      if (geometric) values.push(row.potential, row.amortizedCost);
      for (const value of values) {
        const td = document.createElement('td');
        td.textContent = String(value);
        tr.append(td);
      }
      body.append(tr);
    }
  }
  function plot(trace) {
    const svg = byId('cost-plot');
    // Keep its accessible title/description; replace only the previous geometry.
    svg.querySelectorAll('g').forEach(group => group.remove());
    const ns = 'http://www.w3.org/2000/svg';
    const group = document.createElementNS(ns, 'g');
    const maximum = Math.max(1, trace.doubling.totals.cost, trace.fixedIncrement.totals.cost);
    const countMaximum = Math.max(1, trace.input.appends);
    function draw(tag, attrs, text) {
      const node = document.createElementNS(ns, tag);
      Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
      if (text !== undefined) node.textContent = String(text);
      group.append(node);
    }
    for (let part = 0; part <= 4; part += 1) {
      const y = 206 - part * 43;
      draw('line', { x1: 62, x2: 774, y1: y, y2: y, stroke: '#d5dcd4' });
      draw('text', { x: 52, y: y + 4, 'text-anchor': 'end' }, (maximum * part / 4).toLocaleString('en-US', { maximumFractionDigits: 2 }));
    }
    draw('text', { x: 62, y: 18 }, 'Total counted units');
    draw('text', { x: 62, y: 226 }, '0');
    draw('text', { x: 774, y: 226, 'text-anchor': 'end' }, trace.input.appends);
    draw('text', { x: 418, y: 245, 'text-anchor': 'middle' }, 'Appends');
    for (const [policy, color, dash] of [[trace.doubling, '#1d6755', ''], [trace.fixedIncrement, '#a24b25', '7 5']]) {
      const points = policy.steps.map(row => `${62 + 712 * row.step / countMaximum},${206 - 172 * row.totalCost / maximum}`).join(' ');
      draw('polyline', { points, fill: 'none', stroke: color, 'stroke-width': 3, 'stroke-dasharray': dash, 'stroke-linejoin': 'round' });
    }
    svg.append(group);
    byId('plot-description').textContent = `Cumulative actual model costs over ${trace.input.appends} appends. Doubling ends at ${trace.doubling.totals.cost}; fixed increment ${trace.input.increment} ends at ${trace.fixedIncrement.totals.cost}. Complete exact values are in the ledgers below.`;
  }
  function apply() {
    retire();
    let input;
    try { input = parseArrayInputs(count.value, increment.value); }
    catch (error) {
      count.setAttribute('aria-invalid', 'true');
      increment.setAttribute('aria-invalid', 'true');
      message(error.message, true);
      return;
    }
    applied = traceArrays(input.appends, input.increment);
    results.hidden = false;
    observationButton.disabled = false;
    select.disabled = false;
    select.replaceChildren();
    for (let step = 0; step <= input.appends; step += 1) {
      const option = document.createElement('option');
      option.value = String(step);
      option.textContent = step === 0 ? '0 · empty' : `${step} · append ${step}`;
      select.append(option);
    }
    byId('fixed-heading').textContent = `Add ${input.increment} slot${input.increment === 1 ? '' : 's'} when full`;
    ledger('doubling-ledger', applied.doubling.steps, true);
    ledger('fixed-ledger', applied.fixedIncrement.steps, false);
    const a = applied.doubling.totals;
    const b = applied.fixedIncrement.totals;
    const average = value => value === null ? 'not defined' : `approximately ${value.toFixed(2)}`;
    byId('totals').textContent = `${input.appends} appends. Doubling: ${a.cost} total units, ${a.copies} copies, worst single cost ${a.worstCost}, average ${average(a.averageCost)}. Fixed increment ${input.increment}: ${b.cost} total units, ${b.copies} copies, worst single cost ${b.worstCost}, average ${average(b.averageCost)}.`;
    byId('proof').textContent = input.appends === 0
      ? 'Empty-prefix accounting: actual total 0, total charges 0, final Phi 0. Average cost per append is not defined.'
      : `Doubling check: actual total ${a.cost} = total charges ${a.amortizedCost} − final Phi ${a.potential}. The first charge is 2; the remaining ${input.appends - 1} are 3 each. Total work stays below 3 × ${input.appends} = ${3 * input.appends}, even though individual appends may spike.`;
    plot(applied);
    inspect(0);
    message(`Applied ${input.appends} appends with fixed increment ${input.increment}. Both traces start at the empty state. No elapsed time is measured.`);
  }
  count.addEventListener('input', retire);
  increment.addEventListener('input', retire);
  byId('comparison-form').addEventListener('submit', event => { event.preventDefault(); apply(); });
  navigation[0].addEventListener('click', () => inspect(0));
  navigation[1].addEventListener('click', () => inspect(cursor - 1));
  navigation[2].addEventListener('click', () => inspect(cursor + 1));
  navigation[3].addEventListener('click', () => { if (applied) inspect(applied.input.appends); });
  select.addEventListener('change', () => inspect(Number(select.value)));
  document.querySelectorAll('[data-example]').forEach(button => {
    button.addEventListener('click', () => {
      [count.value, increment.value] = button.dataset.example.split(',');
      apply();
    });
  });
  observationButton.addEventListener('click', () => {
    if (applied) save(JSON.stringify(arrayObservation(applied, cursor), null, 2) + '\n', 'amortized-arrays-observation.json', 'application/json;charset=utf-8');
  });
  byId('download-course').addEventListener('click', () => save(courseText, 'amortized-arrays.json', 'application/json;charset=utf-8'));
  byId('download-guide').addEventListener('click', () => save(guideText, 'amortized-arrays.md', 'text/markdown;charset=utf-8'));
  apply();
}
