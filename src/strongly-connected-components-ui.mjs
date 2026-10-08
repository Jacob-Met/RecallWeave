/** Included after the pure core by the standalone builder; no runtime imports. */
function bindStrongComponentExplorer() {
  const byId = id => document.getElementById(id);
  const assets = JSON.parse(byId('component-assets').textContent);
  const palette = ['#cfe8f4', '#f6dfab', '#d3ead5', '#ecd9f1', '#f4d6cc', '#d7dff5', '#e9e4bf', '#cbe9e6'];
  const phaseNames = {forward: 'Pass 1 · original arrows', order: 'Reverse the finish list', transpose: 'Pass 2 · reversed arrows', done: 'Complete · original arrows'};
  const statusNames = {unseen: 'Unseen', active: 'In DFS path', finished: 'Finished'};
  let trace = null, cursor = 0;

  function svgElement(tag, attributes = {}, text) {
    const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value));
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function drawNetwork(svg, nodes, edges, styles, focusedNode = null, focusedEdge = null) {
    svg.replaceChildren();
    const defs = svgElement('defs');
    for (const [name, color] of [['plain', '#617d90'], ['focus', '#ae640d']]) {
      const marker = svgElement('marker', {id: svg.id + '-' + name, markerWidth: 7, markerHeight: 7, refX: 6, refY: 3.5, orient: 'auto', markerUnits: 'userSpaceOnUse'});
      marker.append(svgElement('path', {d: 'M 0 0 L 7 3.5 L 0 7 z', fill: color}));
      defs.append(marker);
    }
    svg.append(defs);
    const positions = new Map(nodes.map((node, index) => {
      const angle = -Math.PI / 2 + index * 2 * Math.PI / nodes.length;
      return [node, {x: 300 + (nodes.length === 1 ? 0 : 225 * Math.cos(angle)), y: 195 + (nodes.length === 1 ? 0 : 142 * Math.sin(angle))}];
    }));
    const pairs = new Set(edges.map(edge => edge.from + '\0' + edge.to));
    edges.forEach((edge, index) => {
      const a = positions.get(edge.from), b = positions.get(edge.to), active = index === focusedEdge;
      let d;
      if (edge.from === edge.to) {
        const direction = a.y < 195 ? 1 : -1;
        d = 'M ' + (a.x - 19) + ' ' + (a.y + direction * 24) + ' C ' + (a.x - 72) + ' ' + (a.y + direction * 87) + ', ' + (a.x + 72) + ' ' + (a.y + direction * 87) + ', ' + (a.x + 19) + ' ' + (a.y + direction * 24);
      } else {
        const dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy), ux = dx / length, uy = dy / length;
        const bend = pairs.has(edge.to + '\0' + edge.from) ? 22 : 0;
        d = 'M ' + (a.x + ux * 31) + ' ' + (a.y + uy * 31) + ' Q ' + ((a.x + b.x) / 2 - uy * bend) + ' ' + ((a.y + b.y) / 2 + ux * bend) + ', ' + (b.x - ux * 34) + ' ' + (b.y - uy * 34);
      }
      const path = svgElement('path', {d, fill: 'none', stroke: active ? '#ae640d' : '#617d90', 'stroke-width': active ? 3.8 : 1.8, 'marker-end': 'url(#' + svg.id + '-' + (active ? 'focus' : 'plain') + ')'});
      path.append(svgElement('title', {}, edge.from + ' → ' + edge.to));
      svg.append(path);
    });
    for (const node of nodes) {
      const point = positions.get(node), style = styles.get(node);
      const group = svgElement('g');
      group.append(svgElement('circle', {cx: point.x, cy: point.y, r: 29, fill: style.fill, stroke: node === focusedNode ? '#ae640d' : style.active ? '#256b9c' : '#7891a2', 'stroke-width': node === focusedNode ? 4 : style.active ? 3 : 1.5}));
      group.append(svgElement('text', {x: point.x, y: point.y + (style.group ? -2 : 4), 'text-anchor': 'middle', fill: '#173248', 'font-size': node.length > 7 ? 8.5 : node.length > 3 ? 11 : 15, 'font-weight': 750}, node));
      if (style.group) group.append(svgElement('text', {x: point.x, y: point.y + 15, 'text-anchor': 'middle', fill: '#345267', 'font-size': 10}, style.group));
      svg.append(group);
    }
  }

  function setText(id, text) { byId(id).textContent = text; }

  function showCertificate() {
    const {components, condensationEdges} = trace.result;
    setText('component-summary', components.length + ' maximal mutually reachable group' + (components.length === 1 ? '' : 's') + '. Every declared node belongs to exactly one group.');
    byId('component-members').replaceChildren(...components.map((members, index) => {
      const item = document.createElement('li');
      item.textContent = 'C' + (index + 1) + ' = {' + members.join(', ') + '}';
      item.style.backgroundColor = palette[index % palette.length];
      return item;
    }));
    const names = components.map((_, index) => 'C' + (index + 1));
    const styles = new Map(names.map((name, index) => [name, {fill: palette[index % palette.length]}]));
    drawNetwork(byId('condensation'), names, condensationEdges.map(edge => ({from: names[edge.from], to: names[edge.to]})), styles);
    byId('condensation').setAttribute('aria-label', 'Acyclic component graph: ' + names.join(', ') + '. Edges are listed below.');
    const witnesses = condensationEdges.map(edge => {
      const item = document.createElement('li');
      item.textContent = names[edge.from] + ' → ' + names[edge.to] + ': ' + edge.originalEdges.map(index => trace.graph.edges[index].from + ' → ' + trace.graph.edges[index].to).join('; ');
      return item;
    });
    if (!witnesses.length) {
      const item = document.createElement('li');
      item.textContent = 'There are no edges between different components.';
      witnesses.push(item);
    }
    byId('component-edges').replaceChildren(...witnesses);
  }

  function render() {
    if (!trace) return;
    const event = trace.events[cursor], reversed = event.phase === 'transpose';
    setText('phase', phaseNames[event.phase]);
    setText('event-message', event.message);
    setText('step-count', 'Event ' + (cursor + 1) + ' of ' + trace.events.length);
    byId('step-count').dataset.eventIndex = String(cursor);
    byId('event-choice').value = String(cursor);
    byId('first').disabled = byId('previous').disabled = cursor === 0;
    byId('next').disabled = byId('finish').disabled = cursor === trace.events.length - 1;
    setText('dfs-path', event.stack.length ? event.stack.join(' → ') : 'Empty');
    setText('finish-list', event.finishOrder.length ? event.finishOrder.join(', ') : 'No calls have finished.');
    setText('root-order', event.phase === 'forward' ? 'Reverse the complete finish list after pass 1.' : trace.result.rootOrder.join(', '));
    setText('edge-count', 'Pass 1: ' + event.edgeVisits.forward + ' / ' + trace.graph.edges.length + ' · Pass 2: ' + event.edgeVisits.transpose + ' / ' + trace.graph.edges.length);
    setText('graph-note', reversed ? 'Every displayed arrow is reversed for pass 2. The authored graph is unchanged.' : 'These are the original authored arrows.');
    const styles = new Map(trace.graph.nodes.map(node => {
      const component = event.componentByNode[node];
      const fill = component !== null ? palette[component % palette.length] : event.firstState[node] === 'unseen' || reversed ? '#ffffff' : event.firstState[node] === 'active' ? '#d8eaf7' : '#d8ebdd';
      return [node, {fill, active: event.stack.includes(node), group: component === null ? '' : 'C' + (component + 1)}];
    }));
    drawNetwork(byId('network'), trace.graph.nodes, trace.graph.edges.map(edge => reversed ? {from: edge.to, to: edge.from} : edge), styles, event.node, event.edge);
    byId('network').setAttribute('aria-label', (reversed ? 'Transpose' : 'Original') + ' graph at event ' + (cursor + 1) + '. ' + event.message + ' The exact node states follow in the table.');
    byId('node-states').replaceChildren(...trace.graph.nodes.map(node => {
      const row = document.createElement('tr');
      row.dataset.node = node;
      const finish = event.finishOrder.indexOf(node), component = event.componentByNode[node];
      for (const value of [node, statusNames[event.firstState[node]], finish < 0 ? '—' : String(finish + 1), statusNames[event.secondState[node]], component === null ? 'Unassigned' : 'C' + (component + 1)]) {
        const cell = document.createElement('td'); cell.textContent = value; row.append(cell);
      }
      return row;
    }));
    byId('certificate').hidden = event.phase !== 'done';
  }

  function retire() {
    trace = null; cursor = 0;
    byId('results').hidden = true;
    byId('download-trace').disabled = true;
    byId('check-prediction').disabled = byId('prediction').disabled = true;
    setText('notice', 'Graph changed. Build a new trace to inspect or download it.');
    setText('error', ''); setText('prediction-feedback', ''); setText('download-status', '');
  }

  function build() {
    retire();
    try {
      trace = traceComponentsFromText(byId('node-text').value, byId('edge-text').value);
      byId('event-choice').replaceChildren(...trace.events.map(event => {
        const option = document.createElement('option');
        option.value = String(event.index);
        option.textContent = (event.index + 1) + '. ' + phaseNames[event.phase] + ' · ' + event.kind + (event.node ? ' ' + event.node : '');
        return option;
      }));
      byId('prediction').value = '';
      byId('prediction').max = String(trace.graph.nodes.length);
      byId('check-prediction').disabled = byId('prediction').disabled = false;
      byId('results').hidden = false;
      byId('download-trace').disabled = false;
      setText('notice', 'Trace ready: ' + trace.graph.nodes.length + ' nodes and ' + trace.graph.edges.length + ' directed edges.');
      showCertificate(); render();
    } catch (error) {
      retire();
      setText('notice', 'The graph needs a correction before a trace can be built.');
      setText('error', error.message);
    }
  }

  function go(index) {
    if (!trace || !Number.isInteger(index) || index < 0 || index >= trace.events.length) return;
    cursor = index; render();
  }

  function download(bytes, name, mime) {
    let url, link;
    try {
      url = URL.createObjectURL(new Blob([bytes], {type: mime}));
      link = document.createElement('a'); link.href = url; link.download = name;
      document.body.append(link); link.click();
      setText('download-status', 'Prepared ' + name + '. Keep the downloaded file to revisit it.');
    } catch (error) {
      setText('download-status', 'Download could not be prepared: ' + error.message + ' You can retry.');
    } finally {
      link?.remove();
      if (url) setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  for (const sample of COMPONENT_EXAMPLES) {
    const option = document.createElement('option'); option.value = sample.id; option.textContent = sample.title; byId('example').append(option);
  }
  function loadExample() {
    const example = COMPONENT_EXAMPLES.find(item => item.id === byId('example').value);
    if (!example) return;
    byId('node-text').value = example.nodes; byId('edge-text').value = example.edges; build();
  }
  byId('example').addEventListener('change', loadExample);
  byId('node-text').addEventListener('input', retire);
  byId('edge-text').addEventListener('input', retire);
  byId('build').addEventListener('click', build);
  byId('first').addEventListener('click', () => go(0));
  byId('previous').addEventListener('click', () => go(cursor - 1));
  byId('next').addEventListener('click', () => go(cursor + 1));
  byId('finish').addEventListener('click', () => trace && go(trace.events.length - 1));
  byId('event-choice').addEventListener('change', event => go(Number(event.target.value)));
  byId('check-prediction').addEventListener('click', () => {
    if (!trace) return;
    const prediction = byId('prediction').valueAsNumber;
    if (!Number.isInteger(prediction) || prediction < 1 || prediction > trace.graph.nodes.length) {
      setText('prediction-feedback', 'Choose a whole number from 1 to ' + trace.graph.nodes.length + '.'); return;
    }
    const count = trace.result.components.length;
    setText('prediction-feedback', (prediction === count ? 'Yes. ' : 'This graph has ') + count + ' component' + (count === 1 ? '' : 's') + '. Follow pass 2 to inspect their membership.');
  });
  byId('download-trace').addEventListener('click', () => {
    if (!trace) return;
    download(JSON.stringify({...trace, inspection: {eventIndex: cursor}}, null, 2) + '\n', 'strong-components-trace.json', 'application/json;charset=utf-8');
  });
  for (const kind of ['course', 'guide']) byId('download-' + kind).addEventListener('click', () => {
    const asset = assets[kind];
    const bytes = Uint8Array.from(atob(asset.base64), character => character.charCodeAt(0));
    download(bytes, asset.name, asset.mime);
  });
  loadExample();
}

bindStrongComponentExplorer();
