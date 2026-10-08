import {COLLISION_PRESETS, analyzeCollision, formatFraction, serializeCollision} from './momentum-collisions.mjs';

(() => {
  const byId = id => document.getElementById(id);
  const inputNames = ['mA','mB','uA','uB'];
  const form = byId('mc-form'), results = byId('mc-results'), status = byId('mc-status');
  const recordButton = byId('mc-download-record'), states = byId('mc-states');
  const preset = byId('mc-preset'), downloadStatus = byId('mc-download-status');
  const svgNamespace = 'http://www.w3.org/2000/svg';
  let acceptedInputs = null;

  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function svgElement(tag, attributes) {
    const node = document.createElementNS(svgNamespace, tag);
    for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
    return node;
  }
  function readInputs() {
    return Object.fromEntries(inputNames.map(name => [name, byId('mc-' + name).value]));
  }
  function numberOf(fraction) {
    return Number(fraction.numerator) / Number(fraction.denominator);
  }
  function exactValue(fraction) {
    const wrapper = element('span');
    wrapper.append(element('strong', formatFraction(fraction)));
    if (fraction.denominator !== '1') {
      wrapper.append(element('span', '≈ ' + numberOf(fraction).toLocaleString('en-US', {maximumFractionDigits: 3}), 'approx'));
    }
    return wrapper;
  }
  function setFraction(id, fraction) {
    const target = byId(id);
    target.textContent = formatFraction(fraction);
  }
  function clearAnalysis(message, isError = false) {
    acceptedInputs = null;
    results.hidden = true;
    states.replaceChildren();
    recordButton.disabled = true;
    status.classList.toggle('error', isError);
    status.textContent = message;
  }
  function velocityDiagram(state, key, maximum) {
    const svg = svgElement('svg', {viewBox:'0 0 300 125', role:'img', 'aria-labelledby':key + '-velocity-title'});
    const title = svgElement('title', {id:key + '-velocity-title'});
    title.textContent = 'Velocity comparison. Cart A: ' + formatFraction(state.a.velocity) +
      ' m/s. Cart B: ' + formatFraction(state.b.velocity) + ' m/s. Right is positive; arrows share one scale.';
    svg.append(title);
    svg.append(svgElement('line', {x1:42, y1:106, x2:258, y2:106, stroke:'#a8b4af', 'stroke-width':1}));
    svg.append(svgElement('line', {x1:150, y1:23, x2:150, y2:109, stroke:'#bfc9c4', 'stroke-width':1, 'stroke-dasharray':'3 4'}));
    for (const [label, x, anchor] of [['left (−)',42,'start'],['0',150,'middle'],['right (+)',258,'end']]) {
      const text = svgElement('text', {x, y:121, 'text-anchor':anchor, 'font-size':10, fill:'#586568'});
      text.textContent = label;
      svg.append(text);
    }
    for (const [cart, y, color] of [['a',43,'#086478'],['b',80,'#a7482f']]) {
      const velocity = numberOf(state[cart].velocity);
      const endpoint = 150 + velocity / maximum * 108;
      const label = svgElement('text', {x:14, y:y+4, 'font-size':13, 'font-weight':700, fill:color});
      label.textContent = cart.toUpperCase();
      svg.append(label);
      const group = svgElement('g', {'data-velocity':key + '-' + cart, 'data-exact':formatFraction(state[cart].velocity)});
      if (velocity === 0) {
        group.append(svgElement('circle', {cx:150, cy:y, r:4, fill:color}));
      } else {
        group.append(svgElement('line', {x1:150, y1:y, x2:endpoint, y2:y, stroke:color, 'stroke-width':3}));
        const direction = Math.sign(velocity);
        group.append(svgElement('path', {d:'M ' + (endpoint-direction*7) + ' ' + (y-5) + ' L ' + endpoint + ' ' + y + ' L ' + (endpoint-direction*7) + ' ' + (y+5), fill:'none', stroke:color, 'stroke-width':2}));
      }
      svg.append(group);
    }
    return svg;
  }
  function totalRow(label, fraction, unit, key, field) {
    const row = element('div', undefined, 'total-row');
    const value = element('strong', formatFraction(fraction) + ' ' + unit);
    value.dataset.field = field;
    row.append(element('span', label), value);
    return row;
  }
  function stateCard(state, key, title, note, maximum) {
    const card = element('article', undefined, 'state-card');
    card.dataset.state = key;
    const heading = element('h3', title);
    heading.id = 'mc-card-' + key;
    card.setAttribute('aria-labelledby', heading.id);
    card.append(heading, element('p', note, 'state-note'), velocityDiagram(state, key, maximum));
    const table = element('table');
    table.setAttribute('aria-label', title + ': exact cart quantities');
    const header = element('thead'), headerRow = element('tr');
    for (const [label, unit] of [['Cart','mass'],['Velocity','m/s'],['Momentum','kg m/s'],['Kinetic energy','J']]) {
      const cell = element('th', label);
      cell.scope = 'col';
      cell.append(element('span', unit, 'unit-label'));
      headerRow.append(cell);
    }
    header.append(headerRow);
    const body = element('tbody');
    for (const cart of ['a','b']) {
      const row = element('tr'), label = element('th', undefined, 'cart-' + cart);
      label.scope = 'row';
      label.append(element('strong', cart.toUpperCase()), element('span', state[cart].mass + ' kg', 'unit-label'));
      row.append(label);
      for (const field of ['velocity','momentum','kineticEnergy']) {
        const cell = element('td');
        cell.dataset.field = cart + '.' + field;
        cell.append(exactValue(state[cart][field]));
        row.append(cell);
      }
      body.append(row);
    }
    table.append(header, body);
    const totals = element('div', undefined, 'totals');
    totals.append(totalRow('Total momentum', state.totalMomentum, 'kg m/s', key, 'totalMomentum'));
    totals.append(totalRow('Total kinetic energy', state.totalKineticEnergy, 'J', key, 'totalKineticEnergy'));
    totals.append(totalRow('A − B velocity', state.relativeVelocity, 'm/s', key, 'relativeVelocity'));
    card.append(table, totals);
    if (state.kineticConverted) {
      const converted = element('p', formatFraction(state.kineticConverted) +
        ' J converted from translational kinetic energy to other forms.', 'conversion');
      converted.dataset.field = 'kineticConverted';
      card.append(converted);
    }
    return card;
  }
  function render(analysis) {
    const contact = analysis.status === 'collision';
    const presented = contact ? [
      ['initial',analysis.initial,'Incoming state','The same starting motion for either ideal encounter.'],
      ['elastic',analysis.elastic,'Elastic encounter','Momentum and kinetic energy stay constant; relative velocity reverses.'],
      ['completely-inelastic',analysis.completelyInelastic,'Stick together','Completely inelastic: both carts leave with one shared velocity.']
    ] : [['initial',analysis.initial,'Current motion','The initial quantities are valid; no future encounter occurs under the stated ordering.']];
    const maximum = Math.max(1, ...presented.flatMap(([,state]) =>
      [Math.abs(numberOf(state.a.velocity)), Math.abs(numberOf(state.b.velocity))]));
    byId('mc-results-title').textContent = contact ? 'One incoming state, two ideal outcomes' : 'No future collision under these inputs';
    byId('mc-event-boundary').textContent = contact ?
      'The gap closes because uA − uB = ' + formatFraction(analysis.closingVelocity) +
      ' m/s is positive. The two endpoint models below describe alternative ideal events with zero net external impulse.' :
      (analysis.reason === 'equal-velocity' ?
        'The velocities are equal, so the positive gap stays constant.' :
        'A is slower in the signed coordinate, so the positive gap grows.') +
      ' No future contact occurs with constant incoming velocities. Collision endpoints are not calculated.';
    setFraction('mc-center-velocity', analysis.centerOfMassVelocity);
    setFraction('mc-center-energy', analysis.centerOfMassKineticEnergy);
    setFraction('mc-relative-energy', analysis.relativeKineticEnergy);
    states.classList.toggle('single', !contact);
    states.replaceChildren(...presented.map(([key,state,title,note]) => stateCard(state,key,title,note,maximum)));
    byId('mc-scale-note').textContent =
      'All visible arrows share a velocity scale (outer endpoint, approximately: ' +
      maximum.toLocaleString('en-US', {maximumFractionDigits:3}) +
      ' m/s in either direction). Positions and encounter times are not drawn. Fractions are exact; values marked ≈ are rounded to at most three decimal places.';
    results.hidden = false;
    status.classList.remove('error');
    status.textContent = contact ? 'Comparison ready. Change an input to start a new comparison.' :
      'Initial analysis ready. No future collision; the downloadable record has no collision endpoints.';
  }
  function compare() {
    clearAnalysis('Checking the cart inputs…');
    try {
      const inputs = readInputs(), analysis = analyzeCollision(inputs);
      render(analysis);
      acceptedInputs = Object.freeze({...inputs});
      recordButton.disabled = false;
    } catch (error) {
      clearAnalysis(error.message, true);
      status.focus();
    }
  }
  function download(text, filename, mime, message) {
    let url = null;
    try {
      url = URL.createObjectURL(new Blob([text], {type:mime}));
      const anchor = element('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.append(anchor);
      try { anchor.click(); } finally { anchor.remove(); }
      downloadStatus.classList.remove('error');
      downloadStatus.textContent = message + ' Your browser chooses where to save the file.';
    } catch (error) {
      downloadStatus.classList.add('error');
      downloadStatus.textContent = 'The download could not be prepared: ' + error.message;
    } finally {
      if (url) setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }
  for (const example of COLLISION_PRESETS) {
    const option = element('option', example.label);
    option.value = example.id;
    preset.append(option);
  }
  function loadExample() {
    const example = COLLISION_PRESETS.find(value => value.id === preset.value);
    if (!example) {
      clearAnalysis('Choose one of the listed examples.', true);
      return;
    }
    for (const name of inputNames) byId('mc-' + name).value = example[name];
    compare();
  }
  byId('mc-load-example').addEventListener('click', loadExample);
  form.addEventListener('submit', event => {event.preventDefault(); compare();});
  for (const name of inputNames) {
    byId('mc-' + name).addEventListener('input', () => clearAnalysis('Inputs changed. Choose Compare models to calculate the new analysis.'));
  }
  recordButton.addEventListener('click', () => {
    if (!acceptedInputs) return;
    const current = readInputs();
    if (!inputNames.every(name => current[name] === acceptedInputs[name])) {
      clearAnalysis('Inputs changed. Choose Compare models before downloading a new analysis.', true);
      return;
    }
    try {
      download(serializeCollision(acceptedInputs), 'momentum-collisions-analysis.json', 'application/json;charset=utf-8', 'Analysis download prepared.');
    } catch (error) {
      clearAnalysis(error.message, true);
    }
  });
  byId('mc-download-course').addEventListener('click', () =>
    download(COURSE_TEXT, 'momentum-collisions.json', 'application/json;charset=utf-8', 'Course download prepared. Import it in your RecallWeave learner.'));
  byId('mc-download-guide').addEventListener('click', () =>
    download(GUIDE_TEXT, 'momentum-collisions.md', 'text/markdown;charset=utf-8', 'Worked guide download prepared.'));
  loadExample();
})();
