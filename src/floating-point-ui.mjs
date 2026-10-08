import {
  inspectFloat32, NUMBER_PRESETS, ASSOCIATION_CASES, associationExperiment,
  TRANSLATION_PRESETS, triangleExperiment, serializeTriangleReport,
} from './floating-point.mjs';

const element = id => document.getElementById(id);
const put = (id, value) => { element(id).textContent = value; };
const decimal = value => value === null ? 'No further value'
  : Object.is(value, -0) ? '−0' : value === Infinity ? '+Infinity'
    : value === -Infinity ? '−Infinity' : String(value);

function option(value, label) {
  const item = document.createElement('option');
  item.value = String(value);
  item.textContent = label;
  return item;
}

function readNumber(id) {
  const text = element(id).value.trim();
  if (!text) throw new TypeError('Enter a value; an empty field does not mean zero.');
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text)) {
    throw new TypeError('Use decimal or scientific notation, such as 0.1 or 1e8.');
  }
  const value = Number(text);
  if (!Number.isFinite(value)) throw new TypeError('Enter a finite Number in decimal or scientific notation.');
  return value;
}

function renderNumber() {
  try {
    const detail = inspectFloat32(readNumber('number-input'));
    put('number-value', decimal(detail.input));
    put('stored-value', decimal(detail.stored));
    put('sign-bits', detail.bits.slice(0, 1));
    put('exponent-bits', detail.bits.slice(1, 9));
    put('fraction-bits', detail.bits.slice(9));
    put('number-classification', detail.negativeZero ? 'negative zero' : detail.classification);
    put('number-hex', `0x${detail.hex}`);
    put('neighbor-previous', decimal(detail.previous));
    put('neighbor-stored', decimal(detail.stored));
    put('neighbor-next', decimal(detail.next));
    put('input-fraction', detail.inputExact.text);
    put('stored-fraction', detail.storedExact?.text ?? 'Not a finite value: this conversion overflowed.');
    put('number-error-fraction', detail.signedError?.text ?? 'No finite error fraction for an infinite output.');
    put('number-error', '');
    element('number-output').hidden = false;
    element('number-input').removeAttribute('aria-invalid');
  } catch (error) {
    put('number-error', error.message);
    element('number-output').hidden = true;
    element('number-input').setAttribute('aria-invalid', 'true');
  }
}

function renderAddition() {
  const report = associationExperiment(element('addition-preset').value);
  put('left-intermediate', decimal(report.leftIntermediate));
  put('right-intermediate', decimal(report.rightIntermediate));
  put('left-result', decimal(report.left));
  put('right-result', decimal(report.right));
  put('addition-exact', report.exactStoredSum.text);
  put('addition-interpretation', report.left === report.right
    ? 'Both rounded paths match in this control.'
    : 'The rounded paths disagree because an intermediate loses information.');
}

const svgNamespace = 'http://www.w3.org/2000/svg';
function svgNode(tag, attributes, text) {
  const node = document.createElementNS(svgNamespace, tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  if (text !== undefined) node.textContent = text;
  return node;
}

function placeVertexLabels(layer, labels) {
  const occupied = [...layer.querySelectorAll('text:not([data-vertex-label]), circle')]
    .map(node => node.getBBox());
  const overlaps = (a, b) => a.x < b.x + b.width + 4 && a.x + a.width + 4 > b.x
    && a.y < b.y + b.height + 4 && a.y + a.height + 4 > b.y;
  for (const [index, { node, x, y, toRight, dashed }] of labels.entries()) {
    const candidates = [
      [x + (toRight ? 8 : -8), y + (dashed ? 16 : -10), toRight ? 'start' : 'end'],
      [x + 9, y - 11, 'start'], [x - 9, y - 11, 'end'],
      [x + 9, y + 20, 'start'], [x - 9, y + 20, 'end'],
      [x, y - 15, 'middle'], [x, y + 28, 'middle'],
      [x + 18, y + 5, 'start'], [x - 18, y + 5, 'end'],
      [430, 48 + index * 28, 'end'],
    ];
    for (const [candidateIndex, [labelX, labelY, anchor]] of candidates.entries()) {
      node.setAttribute('x', labelX);
      node.setAttribute('y', labelY);
      node.setAttribute('text-anchor', anchor);
      const box = node.getBBox();
      if (box.x < 2 || box.y < 2 || box.x + box.width > 448 || box.y + box.height > 408
        || occupied.some(other => overlaps(box, other))) continue;
      if (candidateIndex === candidates.length - 1) {
        layer.insertBefore(svgNode('line', {
          x1:x, y1:y, x2:box.x - 4, y2:box.y + box.height / 2,
          stroke:node.getAttribute('fill'), 'stroke-width':1,
        }), node);
      }
      occupied.push(box);
      break;
    }
  }
}

function plotTriangle(report) {
  const largest = Math.max(4, ...report.plotSource.flat(), ...report.plotStored.flat()) + 0.5;
  const scale = 320 / largest;
  const project = ([x, y]) => [55 + x * scale, 355 - y * scale];
  const nodes = [], vertexLabels = [];
  const [zeroX, zeroY] = project([0, 0]);
  for (let tick = 0; tick <= Math.floor(largest); tick += 1) {
    const [x, y] = project([tick, tick]);
    nodes.push(svgNode('line', { x1:x, y1:35, x2:x, y2:zeroY, stroke:'#dfe8e3', 'stroke-width':1 }));
    nodes.push(svgNode('line', { x1:zeroX, y1:y, x2:395, y2:y, stroke:'#dfe8e3', 'stroke-width':1 }));
    nodes.push(svgNode('text', { x, y:378, fill:'#48616a', 'font-size':13, 'text-anchor':'middle' }, tick));
    if (tick > 0) nodes.push(svgNode('text', { x:40, y:y+4, fill:'#48616a', 'font-size':13, 'text-anchor':'end' }, tick));
  }
  nodes.push(svgNode('line', { x1:zeroX, y1:zeroY, x2:402, y2:zeroY, stroke:'#668178', 'stroke-width':1.5 }));
  nodes.push(svgNode('line', { x1:zeroX, y1:zeroY, x2:zeroX, y2:25, stroke:'#668178', 'stroke-width':1.5 }));
  nodes.push(svgNode('text', { x:418, y:360, fill:'#48616a', 'font-size':14 }, 'x'));
  nodes.push(svgNode('text', { x:49, y:18, fill:'#48616a', 'font-size':14 }, 'y'));
  for (const [points, color, dashed] of [[report.plotSource, '#164f97', false], [report.plotStored, '#a84017', true]]) {
    nodes.push(svgNode('polygon', {
      points:points.map(point => project(point).join(',')).join(' '),
      fill:dashed ? 'none' : '#164f9718', stroke:color, 'stroke-width':2.7,
      'stroke-dasharray':dashed ? '8 5' : 'none', 'stroke-linejoin':'round',
    }));
    const coincident = new Map();
    points.forEach((point, index) => {
      const key = point.join(',');
      if (!coincident.has(key)) coincident.set(key, { point, labels:[] });
      if (index > 0) coincident.get(key).labels.push(`${['a', 'b', 'c'][index]}${dashed ? '′' : ''}`);
    });
    for (const { point, labels } of coincident.values()) {
      const [x, y] = project(point);
      nodes.push(svgNode('circle', { cx:x, cy:y, r:dashed ? 4 : 3, fill:dashed ? 'white' : color, stroke:color, 'stroke-width':1.5 }));
      const toRight = dashed && x < 330;
      if (labels.length) {
        const node = svgNode('text', {
          x:x + (toRight ? 8 : -8), y:y + (dashed ? 16 : -10), fill:color,
          'font-size':15, 'font-weight':650, 'text-anchor':toRight ? 'start' : 'end',
          'data-vertex-label':dashed ? 'stored' : 'source',
        }, labels.join(', '));
        nodes.push(node);
        vertexLabels.push({ node, x, y, toRight, dashed });
      }
    }
  }
  nodes.push(svgNode('text', { x:zeroX-8, y:zeroY+19, fill:'#18313a', 'font-size':14, 'text-anchor':'end' }, 'a'));
  const layer = element('plot-layer');
  layer.replaceChildren(...nodes);
  placeVertexLabels(layer, vertexLabels);
  put('triangle-plot-desc', `Winding ${report.orientation}. Local source and stored output are plotted relative to a, divided by the unit factor. Stored normalized vertices: ${report.plotStored.map(point => `(${point.join(', ')})`).join(', ')}. Exact stored signed double area: ${report.storedDoubleArea.text}.`);
}

function geometryParameters() {
  return { translation:readNumber('origin-input'), unitExponent:Number(element('unit-exponent').value) };
}

function renderGeometry() {
  try {
    const report = triangleExperiment(geometryParameters());
    const status = element('orientation-status');
    status.dataset.state = report.orientation;
    status.textContent = report.orientation === 'preserved' ? 'Winding preserved · inspect the shape too'
      : report.orientation === 'reversed' ? 'Stored winding reversed' : 'Stored triangle collapsed';
    put('stored-area', report.storedDoubleArea.text);
    put('intended-area', report.intendedDoubleArea.text);
    put('source-area', report.sourceDoubleArea.text);
    put('local-area', report.localStorageDoubleArea.text);
    put('origin-gap', decimal(report.nextOriginGap));
    put('shape-sine', report.shapeSine.toPrecision(6));
    put('orientation-explanation', report.orientation === 'reversed'
      ? 'The exact stored double area is nonzero and has the opposite sign from the local source. A zero-area-only check would miss this.'
      : report.orientation === 'collapsed'
        ? 'Rounding has removed the stored triangle’s signed area. Its source still has positive area.'
        : 'The stored sign agrees with the source. Compare the coordinates and area before making any claim about geometric fidelity.');
    const rows = report.stored.map((point, index) => {
      const row = document.createElement('tr');
      [ ['a','b','c'][index], decimal(point[0]), decimal(point[1]), `(${report.relativeStored[index].map(decimal).join(', ')})` ].forEach((value, column) => {
        const cell = document.createElement(column === 0 ? 'th' : 'td');
        if (column === 0) cell.scope = 'row';
        const code = document.createElement('code');
        code.textContent = value;
        cell.append(code);
        row.append(cell);
      });
      return row;
    });
    element('coordinate-rows').replaceChildren(...rows);
    element('geometry-output').hidden = false;
    plotTriangle(report);
    put('geometry-error', '');
    element('geometry-output').hidden = false;
    element('origin-input').removeAttribute('aria-invalid');
    element('download-report').disabled = false;
    return true;
  } catch (error) {
    put('geometry-error', error.message);
    element('geometry-output').hidden = true;
    element('origin-input').setAttribute('aria-invalid', 'true');
    element('download-report').disabled = true;
    return false;
  }
}

function download(text, filename) {
  const url = URL.createObjectURL(new Blob([text], { type:'application/json;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

element('number-preset').append(...NUMBER_PRESETS.map(item => option(item.id, item.label)), option('custom', 'Custom Number'));
element('number-preset').value = 'tenth';
element('number-preset').addEventListener('change', () => {
  const preset = NUMBER_PRESETS.find(item => item.id === element('number-preset').value);
  if (preset) { element('number-input').value = String(preset.value); renderNumber(); }
  else element('number-input').focus();
});
element('number-input').addEventListener('input', () => { element('number-preset').value = 'custom'; renderNumber(); });

element('addition-preset').append(...ASSOCIATION_CASES.map(item => option(item.id, item.label)));
element('addition-preset').addEventListener('change', renderAddition);

element('origin-preset').append(...TRANSLATION_PRESETS.map(value => option(value, value.toLocaleString('en-US'))), option('custom', 'Custom origin'));
element('origin-preset').value = '10000000';
for (let exponent = -8; exponent <= 8; exponent += 1) element('unit-exponent').append(option(exponent, `k = ${exponent} · multiply by ${2 ** exponent}`));
element('unit-exponent').value = '0';
element('origin-preset').addEventListener('change', () => {
  if (element('origin-preset').value === 'custom') { element('origin-input').focus(); return; }
  element('origin-input').value = element('origin-preset').value;
  renderGeometry();
});
element('origin-input').addEventListener('input', () => { element('origin-preset').value = 'custom'; renderGeometry(); });
element('unit-exponent').addEventListener('change', renderGeometry);
element('reset-geometry').addEventListener('click', () => {
  element('origin-preset').value = element('origin-input').value = '10000000';
  element('unit-exponent').value = '0';
  renderGeometry();
});
element('download-report').addEventListener('click', () => {
  if (renderGeometry()) download(serializeTriangleReport(geometryParameters()), 'floating-point-experiment.json');
});
for (const button of document.querySelectorAll('[data-download-lesson]')) {
  button.addEventListener('click', () => download(element('lesson-data').textContent.trim() + '\n', 'floating-point.json'));
}

renderNumber();
renderAddition();
renderGeometry();
