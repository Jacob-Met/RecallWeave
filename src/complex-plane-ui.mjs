import { analyzeMultiplication, serializeExperiment, plotGeometry, displayNumber } from './complex-plane.mjs';

export function mountComplexPlane(document) {
  const byId = id => document.getElementById(id);
  const form = byId('complex-form');
  const status = byId('complex-status');
  const results = byId('complex-results');
  const plane = byId('complex-plot');
  const rows = byId('complex-points');
  const exportButton = byId('complex-experiment-download');
  const courseText = JSON.parse(byId('complex-course-data').textContent);
  if (typeof courseText !== 'string') throw new Error('The embedded lesson is unavailable.');
  const fields = ['z-re', 'z-im', 'w-re', 'w-im', 'complex-steps'].map(byId);
  let active = null;
  let acceptedKey = null;

  const textNode = (tag, text, className) => {
    const node = document.createElement(tag);
    node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const svgNode = (tag, attrs = {}, text) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, String(value));
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const complexText = p => displayNumber(p.re) + (p.im < 0 ? ' − ' : ' + ') + displayNumber(Math.abs(p.im)) + 'i';
  const degrees = value => value === null ? 'undefined (zero)' : displayNumber(value) + '°';

  function readDraft() {
    const stepText = byId('complex-steps').value;
    if (!/^[0-8]$/.test(stepText)) throw new RangeError('Choose a whole number of multiplications from 0 to 8.');
    return {
      z: { re: byId('z-re').value, im: byId('z-im').value },
      w: { re: byId('w-re').value, im: byId('w-im').value },
      steps: Number(stepText),
    };
  }

  function retire(message = 'Inputs changed. Calculate products to see this experiment.') {
    active = null;
    acceptedKey = null;
    exportButton.disabled = true;
    results.hidden = true;
    rows.replaceChildren();
    plane.replaceChildren();
    byId('complex-empty').hidden = false;
    status.textContent = message;
  }

  function draw(report) {
    const geometry = plotGeometry(report);
    const center = geometry.center;
    plane.replaceChildren();
    plane.append(svgNode('title', { id: 'complex-plot-title' }, 'The discrete complex-product sequence'));
    plane.append(svgNode('desc', { id: 'complex-plot-description' },
      report.points.length + ' indexed points from P0 through P' + report.inputs.steps +
      '. Both axes use the same scale. Positive imaginary coefficients point upward. The multiplier is a separate reference vector. The table contains every step, including repeated positions.'));
    const drawing = svgNode('g', { 'aria-hidden': 'true' });
    const grid = '#dbe3de';
    const axis = '#687b72';
    for (const portion of [-1, -0.5, 0.5, 1]) {
      const x = center.x + 240 * portion;
      const y = center.y - 240 * portion;
      drawing.append(svgNode('line', { x1: x, y1: 60, x2: x, y2: 540, stroke: grid }));
      drawing.append(svgNode('line', { x1: 60, y1: y, x2: 540, y2: y, stroke: grid }));
      drawing.append(svgNode('text', { x, y: 320, 'text-anchor': 'middle', class: 'axis-number' }, displayNumber(geometry.halfRange * portion)));
      drawing.append(svgNode('text', { x: 288, y: y + 4, 'text-anchor': 'end', class: 'axis-number' }, displayNumber(geometry.halfRange * portion)));
    }
    drawing.append(svgNode('line', { x1: 38, y1: 300, x2: 560, y2: 300, stroke: axis, 'stroke-width': 1.5 }));
    drawing.append(svgNode('line', { x1: 300, y1: 38, x2: 300, y2: 560, stroke: axis, 'stroke-width': 1.5 }));
    drawing.append(svgNode('text', { x: 548, y: 286, 'text-anchor': 'end', class: 'axis-title' }, 'Real'));
    drawing.append(svgNode('text', { x: 312, y: 35, class: 'axis-title' }, 'Imaginary coefficient'));
    drawing.append(svgNode('text', { x: 289, y: 318, 'text-anchor': 'end', class: 'axis-number' }, '0'));

    drawing.append(svgNode('line', { x1: 300, y1: 300, x2: geometry.multiplier.x, y2: geometry.multiplier.y,
      stroke: '#a86c16', 'stroke-width': 3, 'stroke-dasharray': '3 6' }));
    drawing.append(svgNode('rect', { x: geometry.multiplier.x - 5, y: geometry.multiplier.y - 5,
      width: 10, height: 10, fill: '#a86c16', transform: 'rotate(45 ' + geometry.multiplier.x + ' ' + geometry.multiplier.y + ')' }));
    drawing.append(svgNode('text', { x: geometry.multiplier.x + 10, y: geometry.multiplier.y + 23,
      class: 'multiplier-label' }, 'w'));

    if (geometry.points.length > 1) {
      drawing.append(svgNode('polyline', { points: geometry.points.map(p => p.x + ',' + p.y).join(' '),
        fill: 'none', stroke: '#73817a', 'stroke-width': 2, 'stroke-dasharray': '6 6' }));
    }
    const positions = new Map();
    for (const p of geometry.points) {
      const final = p.step === report.inputs.steps;
      const fill = p.step === 0 ? '#245f98' : final ? '#723d91' : '#277555';
      drawing.append(svgNode('circle', { cx: p.x, cy: p.y, r: p.step === 0 ? 7 : 5,
        fill, stroke: '#fffdf8', 'stroke-width': 1.5, 'data-step': p.step }));
      const key = p.x + ',' + p.y;
      if (!positions.has(key)) positions.set(key, { x: p.x, y: p.y, steps: [] });
      positions.get(key).steps.push('P' + p.step);
    }
    for (const p of positions.values()) {
      drawing.append(svgNode('text', { x: p.x > 330 ? p.x - 10 : p.x + 10, y: p.y - 10, 'text-anchor': p.x > 330 ? 'end' : 'start', class: 'point-label' }, p.steps.join(', ')));
    }
    plane.append(drawing);
    plane.setAttribute('data-scale-x', String(geometry.scaleX));
    plane.setAttribute('data-scale-y', String(geometry.scaleY));
    byId('complex-axis-range').textContent = 'Each axis: −' + displayNumber(geometry.halfRange) + ' to +' +
      displayNumber(geometry.halfRange) + '. Equal units on both axes.';
  }

  function render(report) {
    byId('complex-product').textContent = complexText(report.product);
    byId('complex-scale').textContent = displayNumber(report.scaleFactor);
    byId('complex-turn').textContent = degrees(report.multiplierArgumentDegrees);
    byId('complex-measured-turn').textContent = degrees(report.measuredRotationDegrees);
    byId('complex-path-count').textContent = report.points.length + ' indexed ' +
      (report.points.length === 1 ? 'point' : 'points') + ' · ' + report.inputs.steps + ' multiplications';
    byId('complex-operation').textContent = '(' + complexText(report.z) + ') × (' + complexText(report.w) + ')';
    byId('complex-transformation').textContent = report.transformation === 'collapse'
      ? 'The zero multiplier collapses every point to the origin. Its scale factor is 0; it has no argument or measured rotation.'
      : report.transformation === 'origin'
        ? 'The starting point is the origin and stays there. The scale factor and nonzero multiplier direction are defined, but the point has no argument or measured rotation.'
        : 'Multiply distances by |w| and add the direction of w, modulo 360°. The measured change is shown in the same principal interval.';
    rows.replaceChildren();
    for (const p of report.points) {
      const row = document.createElement('tr');
      row.dataset.step = String(p.step);
      const label = textNode('th', 'P' + p.step);
      label.scope = 'row';
      row.append(label, ...[p.re, p.im, p.modulus].map(value => textNode('td', displayNumber(value))));
      row.append(textNode('td', degrees(p.argumentDegrees)));
      rows.append(row);
    }
    draw(report);
    byId('complex-empty').hidden = true;
    results.hidden = false;
    exportButton.disabled = false;
  }

  function download(text, filename) {
    let url = null;
    let link = null;
    try {
      url = URL.createObjectURL(new Blob([text], { type: 'application/json;charset=utf-8' }));
      link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.append(link);
      link.click();
    } finally {
      if (link) link.remove();
      if (url) setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  for (const field of fields) {
    field.addEventListener('input', () => retire());
    field.addEventListener('change', () => retire());
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    retire('Checking this experiment…');
    try {
      const draft = readDraft();
      const report = analyzeMultiplication(draft);
      render(report);
      active = report;
      acceptedKey = JSON.stringify(draft);
      status.textContent = 'Calculated ' + report.points.length + ' indexed points. The displayed table is rounded; the experiment file keeps the full numeric values.';
      byId('complex-result-title').focus();
    } catch (error) {
      retire(error instanceof Error ? error.message : 'The experiment could not be calculated. Check the inputs and try again.');
      status.focus();
    }
  });

  const presets = {
    quarter: ['2', '1', '0', '1', '4'],
    growth: ['1', '2', '-2', '1', '4'],
    shrink: ['3', '4', '0.5', '0', '8'],
  };
  for (const button of document.querySelectorAll('[data-complex-preset]')) {
    button.addEventListener('click', () => {
      const values = presets[button.dataset.complexPreset];
      if (!values) return;
      fields.forEach((field, index) => { field.value = values[index]; });
      retire('Example inputs selected. Choose Calculate products to explore them.');
      byId('complex-calculate').focus();
    });
  }
  exportButton.addEventListener('click', () => {
    let same = false;
    try { same = active !== null && acceptedKey === JSON.stringify(readDraft()); } catch {}
    if (!same) {
      retire('Inputs changed. Calculate products before downloading an experiment.');
      return;
    }
    try {
      download(serializeExperiment(active.inputs), 'complex-multiplication-experiment.json');
      status.textContent = 'Experiment download prepared from the current calculation, with full numeric values and the stated conventions.';
    } catch {
      status.textContent = 'The experiment download could not be prepared. Your calculation remains available; try again.';
    }
  });
  byId('complex-deck-download').addEventListener('click', () => {
    try {
      download(courseText, 'complex-plane.json');
      byId('complex-course-status').textContent = 'Lesson download prepared. In RecallWeave, choose this file under Bring your own lesson, review its preview, then select Start this deck.';
    } catch {
      byId('complex-course-status').textContent = 'The lesson download could not be prepared. Try again.';
    }
  });
  document.defaultView.addEventListener('pagehide', () => retire('Calculate products to begin again.'));
  retire('Choose Calculate products to explore the example, or edit its starting point and multiplier.');
}

mountComplexPlane(document);
