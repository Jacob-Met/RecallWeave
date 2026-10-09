import { LINKAGE_ASSUMPTIONS, analyzeLinkage } from './genetic-linkage.mjs';

const element = id => document.getElementById(id);
const form = element('linkage-form');
const phase = element('linkage-phase');
const percent = element('linkage-recombination');
const result = element('linkage-result');
const status = element('linkage-status');
const error = element('linkage-error');
const download = element('linkage-download');
let applied = null;

function setText(id, value) { element(id).textContent = value; }
function ratio(value) { return value.numerator + '/' + value.denominator; }
function readDraft() { return { phase: phase.value, recombinationPercent: percent.value }; }
function unchanged(draft) {
  return applied && draft.phase === applied.entered.phase && draft.recombinationPercent === applied.entered.recombinationPercent;
}
function retire(message) {
  applied = null;
  result.hidden = true;
  download.disabled = true;
  error.textContent = '';
  status.textContent = message;
}
function validateDraft(draft) {
  const raw = draft.recombinationPercent;
  if (raw.length > 32 || !/^[0-9]+$/.test(raw.trim())) {
    throw new Error('Enter a whole percentage from 0 to 50 using digits; surrounding spaces are allowed.');
  }
  return analyzeLinkage({ phase: draft.phase, recombinationPercent: Number(raw.trim()) });
}
function render(analysis) {
  analysis.parent.homologs.forEach((homolog, index) => {
    element('linkage-homologs').querySelector('[data-homolog="' + index + '"]').textContent = homolog;
  });
  const rows = element('linkage-rows');
  rows.replaceChildren();
  for (const row of analysis.rows) {
    const tr = document.createElement('tr');
    tr.dataset.gamete = row.gamete;
    const heading = document.createElement('th');
    heading.scope = 'row';
    heading.textContent = row.gamete;
    tr.append(heading);
    for (const [field, text] of [
      ['kind', row.kind === 'parental' ? 'Parental' : 'Recombinant'],
      ['probability', ratio(row.probability)],
      ['offspring', row.offspringGenotype],
      ['independent', ratio(analysis.independentComparison.probability)]
    ]) {
      const td = document.createElement('td');
      td.dataset.field = field;
      td.textContent = text;
      tr.append(td);
    }
    rows.append(tr);
  }
  setText('linkage-parental-total', ratio(analysis.totals.parental));
  setText('linkage-recombinant-total', ratio(analysis.totals.recombinant));
  setText('linkage-all-total', ratio(analysis.totals.all));
  for (const allele of ['A', 'a', 'B', 'b']) {
    element('linkage-marginals').querySelector('[data-allele="' + allele + '"]').textContent = ratio(analysis.marginals[allele]);
  }
  setText('linkage-independent-match', analysis.independentComparison.matches
    ? 'Matches independent assortment' : 'Differs from independent assortment');
}
for (const control of [phase, percent]) {
  for (const event of ['input', 'change']) {
    control.addEventListener(event, () => retire('Inputs changed. Apply the cross again to calculate and download it.'));
  }
}
form.addEventListener('submit', event => {
  event.preventDefault();
  retire('');
  try {
    const entered = readDraft();
    const analysis = validateDraft(entered);
    render(analysis);
    applied = Object.freeze({ entered: Object.freeze(entered), analysis });
    result.hidden = false;
    download.disabled = false;
    status.textContent = 'Cross applied. Results and the observation download use these inputs.';
  } catch (reason) {
    error.textContent = reason instanceof Error ? reason.message : 'The cross could not be applied.';
  }
});

function requestDownload(text, filename) {
  let url;
  let anchor;
  try {
    const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
    url = URL.createObjectURL(blob);
    anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.hidden = true;
    document.body.append(anchor);
    anchor.click();
  } finally {
    if (anchor) anchor.remove();
    if (url) {
      const createdURL = url;
      setTimeout(() => URL.revokeObjectURL(createdURL), 1000);
    }
  }
}
download.addEventListener('click', () => {
  if (!unchanged(readDraft())) {
    retire('Apply the current inputs before downloading a cross.');
    return;
  }
  error.textContent = '';
  try {
    const observation = {
      format: 'recallweave-genetic-linkage-observation/1',
      entered: applied.entered,
      analysis: applied.analysis
    };
    requestDownload(JSON.stringify(observation, null, 2) + '\n', 'genetic-linkage-observation.json');
    status.textContent = 'Cross download requested. Check your browser downloads for the file.';
  } catch {
    error.textContent = 'The cross download could not be prepared. Your applied cross is retained; try again.';
  }
});
element('linkage-course').addEventListener('click', () => {
  error.textContent = '';
  try {
    requestDownload(LINKAGE_DECK_TEXT, 'genetic-linkage.json');
    status.textContent = 'Course download requested. Choose that JSON file in the learner, preview it, then start the deck.';
  } catch {
    error.textContent = 'The course download could not be prepared. Try again.';
  }
});
const assumptions = element('linkage-assumptions');
for (const text of LINKAGE_ASSUMPTIONS) {
  const li = document.createElement('li');
  li.textContent = text;
  assumptions.append(li);
}
retire('Choose the chromosome phase and percentage, then apply the cross.');
