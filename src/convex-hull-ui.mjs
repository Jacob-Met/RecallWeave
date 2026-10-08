import { parseHullPoints, analyzeHull, serializeHullRecord } from './convex-hull.mjs';

export function mountHull(documentRoot, deckText, guideText) {
  const get = selector => documentRoot.querySelector(selector);
  let result = null, selected = 0;
  const presets = {
    rectangle: [[-4,-3],[4,-3],[4,3],[-4,3],[0,0],[0,-3],[4,-3]],
    collinear: [[2,3],[2,-1],[2,1],[2,1]],
    triangle: [[0,0],[3,0],[0,1]],
    empty: [],
  };
  function node(tag, text, attributes = {}) {
    const element = documentRoot.createElement(tag);
    if (text !== undefined) element.textContent = text;
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
    return element;
  }
  function svgNode(tag, attributes = {}, text) {
    const element = documentRoot.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
    if (text !== undefined) element.textContent = text;
    return element;
  }
  function diagram() {
    const svg = get('#hull-diagram');
    svg.replaceChildren();
    svg.append(svgNode('line', {x1:40,y1:260,x2:480,y2:260,class:'axis'}),
      svgNode('line', {x1:260,y1:40,x2:260,y2:480,class:'axis'}),
      svgNode('text', {x:484,y:254,class:'axis-label'}, 'x'),
      svgNode('text', {x:267,y:38,class:'axis-label'}, 'y'));
    if (!result) { svg.setAttribute('aria-label', 'Coordinate axes; no current computation.'); return; }
    const byId = new Map(result.unique.map(p => [p.id, p]));
    const pixel = id => { const p = byId.get(id); return (260 + p.x * 10) + ',' + (260 - p.y * 10); };
    const step = result.steps[selected];
    if (step.tested.length) svg.append(svgNode('polyline', {points:step.tested.map(pixel).join(' '),class:'tested-line'}));
    if (step.after.length >= 2) {
      const tag = step.phase === 'complete' && result.kind === 'polygon' ? 'polygon' : 'polyline';
      svg.append(svgNode(tag, {points:step.after.map(pixel).join(' '),class:tag === 'polygon' ? 'hull-region' : 'active-chain'}));
    }
    for (const point of result.unique) {
      const cx = 260 + point.x * 10, cy = 260 - point.y * 10;
      const circle = svgNode('circle', {cx,cy,r:5,class:step.after.includes(point.id) ? 'point active-point' : 'point'});
      circle.append(svgNode('title', {}, point.inputIds.join(', ') + ': (' + point.x + ', ' + point.y + ')'));
      const label = point.id + (point.inputIds.length > 1 ? ' ×' + point.inputIds.length : '');
      svg.append(circle, svgNode('text', {x:cx + (point.x > 10 ? -8 : 8),y:cy-8,
        'text-anchor':point.x > 10 ? 'end' : 'start',class:'point-label'}, label));
    }
    svg.setAttribute('aria-label', 'Input points and ' + (step.phase === 'complete' ? 'completed ' + result.kind : step.phase + ' chain') + '; exact identities and coordinates follow below.');
  }
  function controls() {
    get('#previous-step').disabled = !result || selected === 0;
    get('#next-step').disabled = !result || selected === result.steps.length - 1;
    get('#final-step').disabled = !result || selected === result.steps.length - 1;
    get('#download-trace').disabled = !result;
  }
  function clear(message = 'Inputs changed. Compute a new hull to inspect or download it.') {
    result = null; selected = 0;
    get('#hull-error').textContent = '';
    get('#hull-status').textContent = message;
    get('#result-summary').textContent = 'No current computation.';
    get('#step-summary').textContent = 'No inspection step.';
    get('#step-detail').textContent = '';
    get('#point-rows').replaceChildren();
    diagram(); controls();
  }
  function inspect() {
    const step = result.steps[selected];
    get('#step-summary').textContent = 'Step ' + (selected + 1) + ' of ' + result.steps.length + ' · ' + step.phase + ' · ' + step.action;
    const lines = [
      'Stack before: ' + (step.before.join(' → ') || '(empty)'),
      'Stack after: ' + (step.after.join(' → ') || '(empty)'),
    ];
    if (step.candidate) lines.unshift('Candidate: ' + step.candidate);
    if (step.tested.length) lines.push('Tested: ' + step.tested.join(' → '),
      'Exact determinant: ' + step.determinant + ' (' + (step.determinant > 0 ? 'left turn' : step.determinant < 0 ? 'right turn' : 'collinear') + ')');
    if (step.action === 'pop') lines.push('Remove ' + step.removed + ' from this chain; reconsider the same candidate.');
    if (step.action === 'retain') lines.push('Retain the left turn before pushing the candidate.');
    if (step.action === 'complete') lines.push('This is the completed hull, without a repeated closing vertex.');
    get('#step-detail').textContent = lines.join('\n');
    diagram(); controls();
  }
  function compute() {
    try {
      const points = parseHullPoints(get('#points-input').value);
      result = analyzeHull(points); selected = 0;
      get('#hull-error').textContent = '';
      get('#hull-status').textContent = 'Computed ' + result.inputs.length + ' input occurrences and ' + result.unique.length + ' unique coordinates.';
      get('#result-summary').textContent = 'Complete result: ' + result.kind + ' · vertices ' + (result.hull.join(' → ') || '(none)')
        + ' · twice-area ' + result.twiceArea + ' · area ' + result.area + ' square coordinate units.';
      get('#point-rows').replaceChildren(...result.inputs.map((point,index) => {
        const role = result.classifications[index], row = node('tr');
        for (const value of [point.id, '(' + point.x + ', ' + point.y + ')',
          role.representativeId + (role.duplicate ? ' (duplicate)' : ''), role.role]) row.append(node('td', value));
        return row;
      }));
      inspect();
    } catch (error) {
      clear('Input refused. Correct it and compute again.');
      get('#hull-error').textContent = error.message;
    }
  }
  function download(text, name, type) {
    const url = URL.createObjectURL(new Blob([text], {type}));
    const link = node('a', undefined, {href:url,download:name});
    documentRoot.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  get('#points-input').addEventListener('input', () => clear());
  get('#compute-hull').addEventListener('click', compute);
  for (const button of documentRoot.querySelectorAll('[data-hull-preset]')) {
    button.addEventListener('click', () => {
      get('#points-input').value = JSON.stringify(presets[button.dataset.hullPreset]);
      clear('Example loaded. Choose Compute hull.');
    });
  }
  get('#previous-step').addEventListener('click', () => { if (result && selected > 0) { selected--; inspect(); } });
  get('#next-step').addEventListener('click', () => { if (result && selected < result.steps.length - 1) { selected++; inspect(); } });
  get('#final-step').addEventListener('click', () => { if (result) { selected = result.steps.length - 1; inspect(); } });
  get('#download-trace').addEventListener('click', () => {
    if (result) download(serializeHullRecord(result.inputs.map(p => [p.x,p.y]), selected), 'convex-hull-trace.json', 'application/json;charset=utf-8');
  });
  get('#download-lesson').addEventListener('click', () => download(deckText, 'convex-hull.json', 'application/json;charset=utf-8'));
  get('#download-guide').addEventListener('click', () => download(guideText, 'convex-hull.md', 'text/markdown;charset=utf-8'));
  get('#points-input').value = JSON.stringify(presets.rectangle);
  clear('Choose Compute hull to inspect the example.');
}
