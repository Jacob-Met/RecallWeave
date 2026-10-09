import { QUADRATURE_PRESETS, analyzeQuadrature, serializeQuadrature } from './quadrature.mjs';
const byId = id => document.getElementById(id);
const methods = ['midpoint', 'trapezoid', 'simpson'];
const methodNames = { midpoint: 'Midpoint', trapezoid: 'Trapezoid', simpson: 'Simpson' };
const form = byId('experiment'), status = byId('status'), results = byId('results');
let accepted = null;
function text(id, value) { byId(id).textContent = value; }
function element(tag, value, className) {
  const e = document.createElement(tag); if (value !== undefined) e.textContent = value;
  if (className) e.className = className; return e;
}
function strictInteger(id) {
  const value = byId(id).value.trim();
  if (!/^-?(?:0|[1-9]\d*)$/.test(value)) throw new Error(byId(id).getAttribute('aria-label') + ' must be a whole number.');
  return Number(value);
}
function retire(message = 'Draft changed. Apply the polynomial to calculate a new comparison.') {
  accepted = null; results.hidden = true;
  byId('download-observation').disabled = true; byId('method').disabled = true;
  status.textContent = message; status.dataset.kind = 'notice';
}
function readInputs() {
  return { coefficients: Array.from({length: 6}, (_, i) => strictInteger('c' + i)),
    lower: strictInteger('lower'), upper: strictInteger('upper'), subintervals: Number(byId('subintervals').value) };
}
function showFraction(v) { return v.fraction + '  ≈ ' + Number(v.approximate.toPrecision(7)); }
function addRow(table, values, heading = false) {
  const row = element('tr');
  values.forEach(v => row.append(element(heading ? 'th' : 'td', v)));
  table.append(row); return row;
}
function ratioText(ratio) {
  if (ratio.kind === 'first-level') return '— first mesh';
  if (ratio.kind === 'both-exact') return 'undefined · both exact';
  if (ratio.kind === 'reached-exact') return 'undefined · now exact';
  return ratio.value.fraction;
}
function render(r) {
  results.hidden = false;
  text('exact-integral', showFraction(r.exactIntegral));
  text('applied', 'Applied on [' + r.input.lower + ', ' + r.input.upper + '] with n = ' +
    r.input.subintervals + ' elementary subintervals; h = ' + r.subintervalWidth.fraction + '.');
  text('polynomial', r.input.coefficients.map((c, i) => '(' + c + ')' + (i ? 'x' + (i === 1 ? '' : '^' + i) : '')).join(' + '));
  const table = byId('estimates'); table.replaceChildren();
  for (const method of methods) {
    const q = r.rules[method];
    const explanation = q.guaranteedForDegree ? 'Within the degree-' + q.degreeGuarantee + ' guarantee'
      : q.exact ? 'Exact here, outside the general degree guarantee' : 'Not exact for this experiment';
    addRow(table, [methodNames[method], q.estimate.fraction, q.signedError.fraction, q.absoluteError.fraction, explanation]);
  }
  const refine = byId('refinement'); refine.replaceChildren();
  for (const row of r.refinement) {
    const tr = addRow(refine, [String(row.subintervals), ...methods.flatMap(method => {
      const q = row.rules[method]; return [q.absoluteError.fraction, ratioText(q.previousErrorRatio)];
    })]);
    if (row.subintervals === r.input.subintervals) tr.className = 'selected-mesh';
  }
  renderInspection(r);
}
function renderInspection(r = accepted) {
  if (!r) return;
  const method = byId('method').value;
  if (!methods.includes(method)) throw new Error('Choose a supported inspection method.');
  const q = r.rules[method], table = byId('nodes'); table.replaceChildren();
  for (const row of q.nodes) addRow(table,
    [String(row.index), row.x.fraction, row.y.fraction, row.weight.fraction, row.contribution.fraction]);
  text('node-count', q.distinctNodes + ' distinct sample nodes. Weights include contributions from adjacent panels.');
  text('inspection-title', methodNames[method] + ': inspect the weighted samples');
  draw(r, method);
}
function draw(r, method) {
  const svg = byId('graph'), width = Math.max(300, Math.floor(svg.getBoundingClientRect().width));
  const height = 320, pad = {left: 58, right: 20, top: 26, bottom: 48};
  svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height); svg.replaceChildren();
  const ns = 'http://www.w3.org/2000/svg';
  function shape(tag, attrs, content) {
    const e = document.createElementNS(ns, tag);
    for (const [key, value] of Object.entries(attrs)) e.setAttribute(key, String(value));
    if (content !== undefined) e.textContent = content; svg.append(e); return e;
  }
  shape('title', {}, methodNames[method] + ' quadrature view for the applied polynomial');
  shape('desc', {}, 'Blue is the polynomial. Amber is the sampled approximation. All coordinates are approximate; exact node weights and errors follow in tables.');
  const {lower: a, upper: b, coefficients: c, subintervals: n} = r.input;
  const f = x => c.reduceRight((total, coefficient) => total * x + coefficient, 0);
  const curve = Array.from({length: 161}, (_, i) => { const x = a + (b - a) * i / 160; return [x, f(x)]; });
  const segments = [], rows = r.rules[method].nodes, h = (b - a) / n;
  if (method === 'midpoint') {
    rows.forEach((row, i) => segments.push([[a + i * h, row.y.approximate], [a + (i + 1) * h, row.y.approximate]]));
  } else if (method === 'trapezoid') {
    for (let i = 0; i < n; i++) segments.push([[rows[i].x.approximate, rows[i].y.approximate], [rows[i + 1].x.approximate, rows[i + 1].y.approximate]]);
  } else {
    for (let i = 0; i < n; i += 2) {
      const y0 = rows[i].y.approximate, y1 = rows[i + 1].y.approximate, y2 = rows[i + 2].y.approximate;
      segments.push(Array.from({length: 25}, (_, j) => {
        const t = j / 24;
        return [a + (i + 2 * t) * h, 2 * (t - 0.5) * (t - 1) * y0 + 4 * t * (1 - t) * y1 + 2 * t * (t - 0.5) * y2];
      }));
    }
  }
  const ys = [0, ...curve.map(p => p[1]), ...segments.flat().map(p => p[1])];
  let low = Math.min(...ys), high = Math.max(...ys);
  const extra = high === low ? 1 : (high - low) * 0.12; low -= extra; high += extra;
  const x = v => pad.left + (v - a) / (b - a) * (width - pad.left - pad.right);
  const y = v => height - pad.bottom - (v - low) / (high - low) * (height - pad.top - pad.bottom);
  const points = list => list.map(p => x(p[0]) + ',' + y(p[1])).join(' ');
  for (let i = 0; i <= 4; i++) {
    const yy = low + (high - low) * i / 4;
    shape('line', {x1: pad.left, x2: width - pad.right, y1: y(yy), y2: y(yy), class: 'grid'});
    shape('text', {x: pad.left - 8, y: y(yy) + 4, 'text-anchor': 'end', class: 'tick'}, Number(yy.toPrecision(3)));
    const xx = a + (b - a) * i / 4;
    shape('text', {x: x(xx), y: height - 22, 'text-anchor': 'middle', class: 'tick'}, Number(xx.toPrecision(3)));
  }
  shape('line', {x1: pad.left, x2: width - pad.right, y1: y(0), y2: y(0), class: 'zero-axis'});
  for (const segment of segments) {
    shape('polygon', {points: points([[segment[0][0], 0], ...segment, [segment.at(-1)[0], 0]]), class: 'sample-area'});
    shape('polyline', {points: points(segment), class: 'approximation'});
  }
  shape('polyline', {points: points(curve), class: 'function-curve'});
  rows.forEach(row => shape('circle', {cx: x(row.x.approximate), cy: y(row.y.approximate), r: 3.5, class: 'sample-node'}));
  shape('text', {x: width - pad.right, y: height - 3, 'text-anchor': 'end', class: 'tick'}, 'x');
  shape('text', {x: pad.left, y: 16, class: 'tick'}, 'f(x)');
}
function apply() {
  retire('Calculating the entered polynomial…');
  try {
    const report = analyzeQuadrature(readInputs());
    render(report); accepted = report;
    byId('download-observation').disabled = false; byId('method').disabled = false;
    status.textContent = 'Applied. Every displayed fraction belongs to this polynomial and mesh.';
    status.dataset.kind = 'success'; byId('result-title').focus();
  } catch (error) { retire(error.message); status.dataset.kind = 'error'; }
}
function download(name, type, body) {
  const url = URL.createObjectURL(new Blob([body], {type}));
  const a = element('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
for (const preset of QUADRATURE_PRESETS) {
  const option = element('option', preset.title); option.value = preset.id; byId('preset').append(option);
}
form.addEventListener('submit', event => { event.preventDefault(); apply(); });
form.addEventListener('input', () => retire());
form.addEventListener('change', event => { if (event.target.tagName === 'SELECT') retire(); });
byId('apply-preset').addEventListener('click', () => {
  const preset = QUADRATURE_PRESETS.find(p => p.id === byId('preset').value);
  if (!preset) { retire('Choose an available example.'); return; }
  preset.coefficients.forEach((c, i) => { byId('c' + i).value = String(c); });
  byId('lower').value = String(preset.lower); byId('upper').value = String(preset.upper);
  byId('subintervals').value = String(preset.subintervals); apply();
});
byId('method').addEventListener('change', () => {
  try { renderInspection(); } catch (error) { retire(error.message); status.dataset.kind = 'error'; }
});
byId('download-observation').addEventListener('click', () => {
  if (!accepted) return;
  try { download('quadrature-observation.json', 'application/json', serializeQuadrature(accepted, byId('method').value)); }
  catch (error) { retire(error.message); status.dataset.kind = 'error'; }
});
byId('download-course').addEventListener('click', () => download('quadrature.json', 'application/json', deckText));
byId('download-guide').addEventListener('click', () => download('quadrature.md', 'text/markdown', guideText));
window.addEventListener('resize', () => { if (accepted) draw(accepted, byId('method').value); });
