import { parseCountingInput, countingPage } from './counting-principles.mjs';

const byId = id => document.getElementById(id);
const form = byId('count-form');
const results = byId('results');
const statusBox = byId('status');
const nField = byId('n');
const kField = byId('k');
const jump = byId('page-number');
const pageDownload = byId('download-page');
const pageButtons = ['first-page', 'previous-page', 'next-page', 'last-page'].map(byId);
let currentInput = null;
let currentPage = null;

function countText(value) { return BigInt(value).toLocaleString('en-US'); }
function message(text, error = false) {
  statusBox.textContent = text;
  statusBox.classList.toggle('error', error);
}
function retire(text = 'Settings changed. Count outcomes to apply them.', error = false) {
  currentInput = null;
  currentPage = null;
  results.hidden = true;
  for (const key of ['model', 'n', 'k', 'total', 'page']) delete results.dataset[key];
  pageDownload.disabled = true;
  message(text, error);
}
function selectedModel() {
  const order = form.querySelector('input[name=order]:checked').value;
  const reuse = form.querySelector('input[name=reuse]:checked').value;
  return order + '-' + reuse;
}
function token(label) {
  const span = document.createElement('span');
  span.className = 'token';
  span.dataset.label = label;
  span.textContent = label;
  return span;
}
function render(input, pageIndex = 0n, focusHeading = false) {
  const page = countingPage(input, pageIndex);
  currentInput = page.input;
  currentPage = page;
  results.hidden = false;
  Object.assign(results.dataset, { model: page.input.model, n: String(page.input.n), k: String(page.input.k), total: page.total, page: page.page });
  pageDownload.disabled = false;
  nField.removeAttribute('aria-invalid');
  kField.removeAttribute('aria-invalid');
  for (const item of page.comparison) {
    const cell = document.querySelector('[data-count="' + item.id + '"]');
    cell.replaceChildren(document.createTextNode(countText(item.total)));
    cell.dataset.total = item.total;
    cell.classList.toggle('selected', item.id === page.input.model);
    if (item.id === page.input.model) {
      const selected = document.createElement('span');
      selected.className = 'selected-label';
      selected.textContent = 'Selected';
      cell.append(selected);
    }
  }
  byId('model-tag').textContent = page.model;
  byId('result-title').textContent = countText(page.total) + (page.total === '1' ? ' outcome' : ' outcomes');
  byId('result-meaning').textContent = page.ordered
    ? 'Positions are labeled. A different order is a different outcome.'
    : 'Only the contents matter. Each sorted multiset appears once.';
  const labels = byId('available-labels');
  const labelCaption = document.createElement('span');
  labelCaption.className = 'caption';
  labelCaption.textContent = page.availableLabels.length ? 'Available types:' : 'No label types are available.';
  labels.replaceChildren(labelCaption);
  for (const label of page.availableLabels) labels.append(token(label));
  byId('formula-rule').textContent = page.formula.rule;
  byId('formula-calculation').textContent = page.formula.calculation;
  byId('formula-reason').textContent = page.formula.reason;
  const rows = byId('outcomes');
  rows.replaceChildren();
  rows.setAttribute('role', 'list');
  rows.setAttribute('aria-label', 'Outcomes on this page');
  for (const row of page.rows) {
    const card = document.createElement('div');
    card.className = 'outcome';
    card.setAttribute('role', 'listitem');
    card.dataset.ordinal = row.ordinal;
    card.dataset.labels = row.labels.join('');
    card.dataset.orderedRepresentations = row.orderedRepresentations;
    const ordinal = document.createElement('span');
    ordinal.className = 'ordinal';
    ordinal.textContent = 'OUTCOME ' + countText(row.ordinal);
    const tokens = document.createElement('div');
    tokens.className = 'outcome-tokens';
    if (!row.labels.length) tokens.textContent = 'Empty selection';
    else for (const label of row.labels) tokens.append(token(label));
    const representations = document.createElement('span');
    representations.className = 'representations';
    representations.textContent = page.ordered ? 'One distinct ordered outcome' : countText(row.orderedRepresentations) + (row.orderedRepresentations === '1' ? ' ordered representation' : ' ordered representations');
    card.append(ordinal, tokens, representations);
    rows.append(card);
  }
  byId('impossible-message').hidden = !page.impossible;
  jump.value = page.page;
  jump.removeAttribute('aria-invalid');
  byId('page-total').textContent = 'of ' + countText(page.pageCount);
  byId('page-caption').textContent = page.rows.length
    ? 'Showing outcomes ' + countText(page.firstOrdinal) + '–' + countText(page.lastOrdinal) + ' of ' + countText(page.total) + '. Lexicographic order; up to 24 rows per page.'
    : 'No outcomes to list. Page 1 of 1.';
  pageButtons[0].disabled = pageIndex === 0n;
  pageButtons[1].disabled = pageIndex === 0n;
  pageButtons[2].disabled = page.page === page.pageCount;
  pageButtons[3].disabled = page.page === page.pageCount;
  message('Applied ' + page.input.n + ' label types and ' + page.input.k + ' selected items. ' + page.model + '. Page ' + page.page + ' of ' + page.pageCount + '.');
  if (focusHeading) byId('result-title').focus();
}
function applyDraft(focusHeading = true) {
  try {
    const input = parseCountingInput(nField.value, kField.value, selectedModel());
    render(input, 0n, focusHeading);
  } catch (error) {
    nField.setAttribute('aria-invalid', 'true');
    kField.setAttribute('aria-invalid', 'true');
    retire(error.message, true);
  }
}
form.addEventListener('submit', event => { event.preventDefault(); applyDraft(); });
for (const field of [nField, kField]) field.addEventListener('input', () => retire());
for (const field of form.querySelectorAll('input[type=radio]')) field.addEventListener('change', () => retire());
const examples = {
  pairs: { n: 3, k: 2, model: 'ordered-distinct' },
  bags: { n: 2, k: 2, model: 'unordered-reuse' },
  empty: { n: 0, k: 0, model: 'unordered-distinct' },
  impossible: { n: 2, k: 3, model: 'unordered-distinct' },
  large: { n: 8, k: 6, model: 'ordered-reuse' }
};
for (const button of document.querySelectorAll('[data-example]')) button.addEventListener('click', () => {
  const example = examples[button.dataset.example];
  nField.value = String(example.n);
  kField.value = String(example.k);
  const [order, reuse] = example.model.split('-');
  form.querySelector('input[name=order][value="' + order + '"]').checked = true;
  form.querySelector('input[name=reuse][value="' + reuse + '"]').checked = true;
  applyDraft();
});
function movePage(kind) {
  if (!currentPage || !currentInput) return;
  let target = BigInt(currentPage.page) - 1n;
  if (kind === 'first') target = 0n;
  if (kind === 'previous') target -= 1n;
  if (kind === 'next') target += 1n;
  if (kind === 'last') target = BigInt(currentPage.pageCount) - 1n;
  render(currentInput, target);
}
for (const kind of ['first', 'previous', 'next', 'last']) byId(kind + '-page').addEventListener('click', () => movePage(kind));
byId('jump-form').addEventListener('submit', event => {
  event.preventDefault();
  if (!currentInput || !currentPage) return;
  const text = jump.value.trim();
  if (!/^[0-9]{1,12}$/.test(text) || BigInt(text) < 1n || BigInt(text) > BigInt(currentPage.pageCount)) {
    jump.setAttribute('aria-invalid', 'true');
    message('Choose a whole page number from 1 to ' + currentPage.pageCount + '. Still showing page ' + currentPage.page + '.', true);
    return;
  }
  render(currentInput, BigInt(text) - 1n);
});
function download(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
byId('download-course').addEventListener('click', () => download('counting-principles.json', byId('counting-course-data').textContent));
pageDownload.addEventListener('click', () => {
  if (!currentPage) return;
  const page = currentPage;
  download('counting-' + page.input.model + '-n' + page.input.n + '-k' + page.input.k + '-page' + page.page + '.json', JSON.stringify(page, null, 2) + '\n');
});
applyDraft(false);
