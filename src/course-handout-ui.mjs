import { MAX_DECK_BYTES, parseDeck } from './deck.mjs';
import { HANDOUT_CSS, createHandout, createHandoutDocument, handoutFilename, renderHandout } from './course-handout.mjs';

const byId = id => document.getElementById(id);
const fileInput = byId('handout-file');
const status = byId('handout-status');
const preview = byId('handout-preview');
const paper = byId('handout-paper');
const controls = byId('selected-handout-controls');
let selectedDeck = null;
let selectedQuestionIds = new Set();
let pendingDeck = null;
let kind = 'worksheet';
let requestVersion = 0;

const paperStyle = document.createElement('style');
paperStyle.id = 'handout-paper-style';
paperStyle.textContent = HANDOUT_CSS;
document.head.append(paperStyle);

function message(text) {
  status.textContent = text;
}

function clearPending() {
  pendingDeck = null;
  preview.hidden = true;
}

function retainedMessage(prefix) {
  return prefix + (selectedDeck ? ' Your selected handout is unchanged.' : ' Choose a checked deck JSON to begin.');
}

function cancelPending() {
  requestVersion++;
  clearPending();
  message(retainedMessage('Selection cancelled.'));
}

function renderSelected() {
  if (!selectedDeck) return;
  controls.disabled = selectedQuestionIds.size === 0;
  byId('handout-selection-summary').textContent = selectedQuestionIds.size + ' of '
    + selectedDeck.items.length + ' questions selected · Original question numbers';
  byId('handout-empty').hidden = true;
  byId('handout-no-questions').hidden = selectedQuestionIds.size !== 0;
  if (selectedQuestionIds.size === 0) {
    paper.replaceChildren();
    paper.hidden = true;
    return;
  }
  byId('preview-worksheet').checked = kind === 'worksheet';
  byId('preview-answer-key').checked = kind === 'answer-key';
  renderHandout(paper, createHandout(selectedDeck, kind, [...selectedQuestionIds]));
  paper.hidden = false;
  byId('handout-empty').hidden = true;
}

function selectionChanged() {
  requestVersion++;
  clearPending();
  renderSelected();
  message(selectedQuestionIds.size
    ? selectedQuestionIds.size + ' questions selected. Worksheet and answer key use the same original question numbers.'
    : 'No questions selected. Choose at least one question to print or save.');
}

function renderQuestionChoices() {
  const list = byId('handout-question-list');
  list.replaceChildren();
  selectedDeck.items.forEach((item, index) => {
    const label = document.createElement('label');
    label.className = 'question-choice';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = 'handout-question-' + index;
    input.checked = selectedQuestionIds.has(item.id);
    const text = document.createElement('span');
    const identity = document.createElement('strong');
    identity.textContent = 'Question ' + (index + 1) + ' · ' + item.concept;
    const prompt = document.createElement('span');
    prompt.textContent = item.prompt;
    text.append(identity, prompt);
    label.append(input, text);
    input.addEventListener('change', () => {
      if (input.checked) selectedQuestionIds.add(item.id);
      else selectedQuestionIds.delete(item.id);
      selectionChanged();
    });
    list.append(label);
  });
}

for (const [id, all] of [['select-all-handout-questions', true], ['clear-handout-questions', false]]) {
  byId(id).addEventListener('click', () => {
    if (!selectedDeck) return;
    selectedQuestionIds = new Set(all ? selectedDeck.items.map(item => item.id) : []);
    byId('handout-question-list').querySelectorAll('input').forEach(input => { input.checked = all; });
    selectionChanged();
  });
}

byId('choose-handout-file').addEventListener('click', () => {
  requestVersion++;
  clearPending();
  fileInput.value = '';
  fileInput.click();
});

fileInput.addEventListener('cancel', cancelPending);
fileInput.addEventListener('change', async () => {
  const version = ++requestVersion;
  clearPending();
  const file = fileInput.files?.[0];
  if (!file) {
    message(retainedMessage('Selection cancelled.'));
    return;
  }
  message('Checking ' + file.name + '…');
  try {
    if (file.size > MAX_DECK_BYTES) throw new Error('Choose a JSON deck no larger than 256 KiB.');
    const text = await file.text();
    if (version !== requestVersion) return;
    const deck = parseDeck(text);
    pendingDeck = deck;
    byId('pending-handout-title').textContent = deck.title;
    byId('pending-handout-summary').textContent = deck.items.length + (deck.items.length === 1 ? ' question' : ' questions')
      + ' · ' + deck.concepts.length + (deck.concepts.length === 1 ? ' concept' : ' concepts');
    byId('pending-handout-attribution').textContent = deck.attribution;
    byId('pending-handout-license').textContent = deck.license;
    preview.hidden = false;
    message('Deck checked. Choose “Use this deck” to prepare its worksheet and separate answer key.');
    byId('pending-handout-title').focus();
  } catch (error) {
    if (version !== requestVersion) return;
    clearPending();
    message(retainedMessage(error instanceof Error ? error.message : 'The file could not be read.'));
  }
});

byId('cancel-handout-preview').addEventListener('click', () => {
  cancelPending();
  byId('choose-handout-file').focus();
});

byId('use-handout-deck').addEventListener('click', () => {
  if (!pendingDeck) return;
  requestVersion++;
  selectedDeck = pendingDeck;
  selectedQuestionIds = new Set(selectedDeck.items.map(item => item.id));
  clearPending();
  kind = 'worksheet';
  byId('selected-handout-title').textContent = selectedDeck.title;
  byId('selected-handout-summary').textContent = selectedDeck.items.length + (selectedDeck.items.length === 1 ? ' question' : ' questions')
    + ' · Original question and option order';
  controls.disabled = false;
  byId('handout-question-controls').disabled = false;
  renderQuestionChoices();
  byId('selected-handout').hidden = false;
  renderSelected();
  message('Worksheet ready. Print or save the questions-only copy, or choose the separate answer key.');
  paper.querySelector('.paper-title').focus();
});

for (const [id, mode] of [['preview-worksheet', 'worksheet'], ['preview-answer-key', 'answer-key']]) {
  byId(id).addEventListener('change', event => {
    if (!selectedDeck || !event.target.checked) return;
    kind = mode;
    renderSelected();
  });
}

for (const [id, mode] of [['print-worksheet', 'worksheet'], ['print-answer-key', 'answer-key']]) {
  byId(id).addEventListener('click', () => {
    if (!selectedDeck || selectedQuestionIds.size === 0) return;
    kind = mode;
    renderSelected();
    window.print();
  });
}

for (const [id, mode] of [['save-worksheet', 'worksheet'], ['save-answer-key', 'answer-key']]) {
  byId(id).addEventListener('click', () => {
    if (!selectedDeck || selectedQuestionIds.size === 0) return;
    const documentText = createHandoutDocument(selectedDeck, mode, [...selectedQuestionIds]);
    const url = URL.createObjectURL(new Blob([documentText], { type: 'text/html;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = handoutFilename(selectedDeck.title, mode);
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    message((mode === 'worksheet' ? 'Worksheet' : 'Answer key') + ' download prepared. Open the saved HTML file to read or print it offline.');
  });
}
