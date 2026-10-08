import { INHERITANCE_ASSUMPTIONS, INHERITANCE_PRESETS, parentGenotypes, crossGenotypes } from './mendelian-inheritance.mjs';

/** The standalone builder embeds this same UI and exact validated course bytes. */
const element = id => document.getElementById(id);
const form = element('cross-form');
const lociField = element('loci');
const parent1Field = element('parent-1');
const parent2Field = element('parent-2');
let current = null;
const ratio = value => value.denominator === 1 ? String(value.numerator) : value.numerator + '/' + value.denominator;
const chance = value => ratio(value) + ' · ' + (100 * value.numerator / value.denominator) + '%';

function textElement(tag, text, className) {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}

function choices(field, values, selected) {
  field.replaceChildren(...values.map(value => {
    const option = textElement('option', value);
    option.value = value;
    return option;
  }));
  field.value = values.includes(selected) ? selected : values[0];
}

function retire() {
  current = null;
  element('results').hidden = true;
  element('pending').hidden = false;
  element('download-cross').disabled = true;
  element('cross-status').textContent = '';
  element('cross-error').textContent = '';
  element('route-detail').replaceChildren();
}

function setParents(loci, first, second) {
  lociField.value = String(loci);
  const values = parentGenotypes(loci);
  choices(parent1Field, values, first);
  choices(parent2Field, values, second);
  retire();
}

function summary(target, values) {
  target.replaceChildren(...values.map(value => {
    const row = document.createElement('tr');
    const label = textElement('th', value.label);
    label.scope = 'row';
    row.append(label, textElement('td', String(value.routes)), textElement('td', chance(value)));
    return row;
  }));
}

function inspect(cell) {
  if (!current) return;
  for (const button of element('punnett').querySelectorAll('button')) {
    const selected = Number(button.dataset.row) === cell.row && Number(button.dataset.column) === cell.column;
    button.setAttribute('aria-pressed', String(selected));
  }
  const routes = current.cells.filter(route => route.genotype === cell.genotype);
  const total = current.genotypes.find(row => row.label === cell.genotype);
  const heading = textElement('h3', 'Follow one fertilization');
  const selected = textElement('p',
    'Parent 1 supplies ' + cell.parent1Gamete + '; parent 2 supplies ' + cell.parent2Gamete +
    '. This route produces ' + cell.genotype + ' with probability ' + ratio(cell) + '.');
  const combined = textElement('p',
    'All routes to ' + cell.genotype + ': ' + routes.map(route => route.parent1Gamete + ' + ' + route.parent2Gamete).join('; ') +
    '. Add their probabilities: ' + routes.length + ' of ' + current.totalRoutes + ' equally likely routes = ' + ratio(total) + '.');
  element('route-detail').replaceChildren(heading, selected, combined);
}

function show(result) {
  current = result;
  element('cross-heading').textContent = result.parent1 + ' × ' + result.parent2;
  element('route-count').textContent = result.totalRoutes + ' equally likely fertilization ' +
    (result.totalRoutes === 1 ? 'route' : 'routes') + '. Each cell has probability 1/' + result.totalRoutes + '.';
  for (const [id, gametes, label] of [
    ['gametes-1', result.gametes.parent1, 'Parent 1'],
    ['gametes-2', result.gametes.parent2, 'Parent 2']
  ]) {
    element(id).replaceChildren(...gametes.map(gamete => {
      const chip = textElement('li', gamete.alleles + ' · ' + ratio(gamete));
      chip.setAttribute('aria-label', label + ' gamete ' + gamete.alleles + ', probability ' + ratio(gamete));
      return chip;
    }));
  }
  const table = element('punnett');
  const caption = textElement('caption', 'Parent 1 gametes form the rows; parent 2 gametes form the columns. Select a cell to trace its contributions.');
  const head = document.createElement('thead'), header = document.createElement('tr');
  const corner = textElement('th', 'P1 ↓ / P2 →'); corner.scope = 'col'; header.append(corner);
  for (const gamete of result.gametes.parent2) {
    const th = textElement('th', gamete.alleles); th.scope = 'col'; header.append(th);
  }
  head.append(header);
  const body = document.createElement('tbody');
  result.gametes.parent1.forEach((gamete, row) => {
    const tr = document.createElement('tr'), label = textElement('th', gamete.alleles); label.scope = 'row'; tr.append(label);
    result.gametes.parent2.forEach((_, column) => {
      const cell = result.cells.find(candidate => candidate.row === row && candidate.column === column);
      const td = document.createElement('td');
      const button = textElement('button', cell.genotype);
      button.type = 'button';
      button.dataset.row = String(row);
      button.dataset.column = String(column);
      button.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-label', 'Parent 1 ' + cell.parent1Gamete + ' plus parent 2 ' + cell.parent2Gamete + ' gives ' + cell.genotype + ', probability ' + ratio(cell));
      button.addEventListener('click', () => inspect(cell));
      td.append(button); tr.append(td);
    });
    body.append(tr);
  });
  table.replaceChildren(caption, head, body);
  summary(element('genotype-summary'), result.genotypes);
  summary(element('phenotype-summary'), result.phenotypes);
  element('phenotype-key').textContent = result.loci === 1
    ? 'A_ means the A-dominant phenotype (AA or Aa). aa means the recessive phenotype.'
    : 'A_ means the A-dominant phenotype (AA or Aa); B_ means the B-dominant phenotype (BB or Bb). Combine the two labels for the two traits.';
  element('pending').hidden = true;
  element('results').hidden = false;
  element('download-cross').disabled = false;
  inspect(result.cells[0]);
  element('cross-heading').focus();
}

form.addEventListener('submit', event => {
  event.preventDefault();
  retire();
  try {
    const result = crossGenotypes(parent1Field.value, parent2Field.value);
    if (String(result.loci) !== lociField.value) throw new Error('Choose matching parental genotypes for the selected number of loci.');
    show(result);
  } catch (error) {
    element('cross-error').textContent = error.message;
    element('cross-error').focus();
  }
});
for (const field of [parent1Field, parent2Field]) {
  field.addEventListener('input', retire);
  field.addEventListener('change', retire);
}
lociField.addEventListener('change', () => {
  try {
    const loci = Number(lociField.value);
    const first = loci === 1 ? parent1Field.value.slice(0, 2) : parent1Field.value.slice(0, 2) + 'Bb';
    const second = loci === 1 ? parent2Field.value.slice(0, 2) : parent2Field.value.slice(0, 2) + 'Bb';
    setParents(loci, first, second);
  } catch (error) {
    retire();
    element('cross-error').textContent = error.message;
  }
});

element('presets').replaceChildren(...INHERITANCE_PRESETS.map(preset => {
  const button = textElement('button', preset.label);
  button.type = 'button'; button.className = 'preset'; button.id = 'preset-' + preset.id;
  button.addEventListener('click', () => {
    setParents(preset.parent1.length / 2, preset.parent1, preset.parent2);
    element('pending').textContent = 'Parents selected. Explore this cross to compute its probabilities.';
    element('explore-cross').focus();
  });
  return button;
}));
element('assumptions').replaceChildren(...INHERITANCE_ASSUMPTIONS.map(text => textElement('li', text)));

function download(text, filename, type, statusId) {
  let url;
  try {
    url = URL.createObjectURL(new Blob([text], {type}));
    const link = document.createElement('a');
    link.href = url; link.download = filename;
    document.body.append(link);
    try { link.click(); } finally { link.remove(); }
    element(statusId).textContent = 'Download requested. Check your browser downloads; this page is still here.';
  } catch {
    element(statusId).textContent = 'The download could not start. Your current inputs and results are still here; try again.';
  } finally {
    if (url) setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
}
element('download-cross').addEventListener('click', () => {
  if (!current) return;
  download(JSON.stringify(current, null, 2) + '\n', 'recallweave-cross-' + current.parent1 + '-x-' + current.parent2 + '.json', 'application/json;charset=utf-8', 'cross-status');
});
element('download-course').addEventListener('click', () => {
  download(INHERITANCE_DECK_TEXT, 'mendelian-inheritance.json', 'application/json;charset=utf-8', 'course-status');
});
setParents(1, 'Aa', 'Aa');
