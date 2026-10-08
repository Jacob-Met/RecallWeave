import { AUTHOR_LIMITS, createDraft, draftFromDeck, addConcept, removeConcept, addQuestion,
  removeQuestion, restoreQuestion, moveQuestion, addOption, removeOption, moveOption,
  setQuestionConcept, checkDraft, downloadName } from './deck-author.mjs';
import { mountAuthorDeckLoader } from './deck-author-loader.mjs';
import { serializeAuthorDraft } from './deck-author-draft.mjs';

const byId = id => document.getElementById(id);
const node = (tag, attributes = {}, text = null) => {
  const result = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) result.setAttribute(name, value);
  if (text !== null) result.textContent = text;
  return result;
};
const action = (label, handler, attributes = {}) => {
  const button = node('button', { type: 'button', ...attributes }, label);
  button.addEventListener('click', handler);
  return button;
};
let draft = createDraft();
let currentKey = draft.questions[0].key;
let removedQuestion = null;
let checked = null;
let issue = null;

function currentQuestion() { return draft.questions.find(item => item.key === currentKey); }
function status(message) { byId('author-status').textContent = message; }
function focus(id, fallback = 'question-picker') {
  const target = byId(id);
  (target && !target.disabled ? target : byId(fallback))?.focus();
}
function clearError() {
  issue = null;
  byId('author-error').hidden = true;
  document.querySelectorAll('[aria-invalid="true"]').forEach(element => element.removeAttribute('aria-invalid'));
}
function changed(message = '') {
  const hadPreview = checked !== null;
  checked = null;
  byId('download-deck').disabled = true;
  byId('author-preview').hidden = true;
  byId('preview-content').replaceChildren();
  byId('download-help').textContent = 'Check and preview before downloading a checked deck. Save draft keeps unfinished work.';
  byId('draft-save-status').textContent = '';
  clearError();
  if (message) status(message);
  else if (hadPreview) status('Draft changed. Save draft to keep writing, or check again for a lesson file.');
}
function showError(message, target) {
  issue = target;
  byId('author-error-message').textContent = message;
  byId('author-error').hidden = false;
  byId('go-to-error').focus();
}

function renderConcepts() {
  const list = byId('concept-list');
  list.replaceChildren();
  draft.concepts.forEach((concept, index) => {
    const row = node('div', { class: 'concept-row' });
    const field = node('div');
    const id = `concept-${concept.key}`;
    const label = node('label', { for: id }, `Concept ${index + 1}`);
    const input = node('textarea', { id, rows: '1', maxlength: '80', placeholder: 'Name a connected idea' });
    input.required = true;
    input.value = concept.name;
    input.addEventListener('input', () => {
      concept.name = input.value;
      changed();
      renderConceptChoices();
    });
    field.append(label, input);
    const remove = action('Remove', () => {
      try { removeConcept(draft, concept.key); }
      catch (error) { status(error.message); return; }
      changed('Unused concept removed. Other questions and text are unchanged.');
      renderConcepts();
      renderConceptChoices();
      focus(draft.concepts[index] ? `concept-${draft.concepts[index].key}` : 'add-concept', 'add-concept');
    }, { class: 'quiet', 'aria-label': `Remove concept ${index + 1}` });
    row.append(field, remove);
    list.append(row);
  });
  byId('add-concept').disabled = draft.concepts.length >= AUTHOR_LIMITS.concepts;
  byId('concept-count').textContent = `${draft.concepts.length} of ${AUTHOR_LIMITS.concepts} concepts`;
}

function renderNavigation() {
  const select = byId('question-picker');
  select.replaceChildren();
  draft.questions.forEach((item, index) => {
    const label = `${index + 1}. ${item.prompt.trim().slice(0, 70) || 'Untitled question'}`;
    select.append(node('option', { value: item.key }, label));
  });
  select.value = currentKey ?? '';
  select.disabled = draft.questions.length === 0;
  byId('remove-question').disabled = draft.questions.length === 0;
  byId('add-question').disabled = draft.questions.length >= AUTHOR_LIMITS.questions;
  const index = draft.questions.findIndex(item => item.key === currentKey);
  byId('move-question-up').disabled = index <= 0;
  byId('move-question-down').disabled = index < 0 || index >= draft.questions.length - 1;
  byId('question-count').textContent = `${draft.questions.length} ${draft.questions.length === 1 ? 'question' : 'questions'}`;
  byId('undo-removal').hidden = !removedQuestion;
  if (removedQuestion) byId('undo-message').textContent = 'The last removed question can be restored with all its text and answer choices.';
}

function renderConceptChoices() {
  const item = currentQuestion();
  const select = byId('question-concept');
  const prerequisites = byId('question-prerequisites-list');
  if (!item || !select || !prerequisites) return;
  select.replaceChildren(node('option', { value: '' }, 'Choose a concept'));
  draft.concepts.forEach((concept, index) => select.append(node('option', { value: concept.key }, concept.name || `Unnamed concept ${index + 1}`)));
  select.value = item.conceptKey ?? '';
  prerequisites.replaceChildren();
  const choices = draft.concepts.filter(concept => concept.key !== item.conceptKey || item.prerequisiteKeys.includes(concept.key));
  if (!choices.length) prerequisites.append(node('p', { class: 'hint' }, 'Add another concept if this question needs an earlier idea.'));
  choices.forEach(concept => {
    const selfLink = concept.key === item.conceptKey;
    const id = `prerequisite-${concept.key}`;
    const label = node('label', { for: id, class: 'check-label' });
    const input = node('input', { id, type: 'checkbox' });
    input.checked = item.prerequisiteKeys.includes(concept.key);
    input.addEventListener('change', () => {
      item.prerequisiteKeys = item.prerequisiteKeys.filter(value => value !== concept.key);
      if (input.checked) item.prerequisiteKeys.push(concept.key);
      changed(selfLink ? 'Self prerequisite removed. The question text is unchanged.' : '');
      if (selfLink) { renderConceptChoices(); focus('question-concept'); }
    });
    const name = concept.name || 'Unnamed concept';
    label.append(input, node('span', {}, selfLink ? `${name} (same concept; remove this prerequisite)` : name));
    prerequisites.append(label);
  });
}

function textField(container, item, field, label, limit, rows = 3) {
  const id = `question-${field}`;
  const control = node('textarea', { id, maxlength: String(limit), rows: String(rows) });
  control.required = true;
  control.value = item[field];
  control.addEventListener('input', () => {
    item[field] = control.value;
    changed();
    if (field === 'prompt') renderNavigation();
  });
  container.append(node('label', { for: id }, label), control);
  return control;
}

function renderOptions() {
  const item = currentQuestion();
  const list = byId('option-list');
  if (!item || !list) return;
  list.replaceChildren();
  item.options.forEach((option, index) => {
    const row = node('div', { class: 'option-row', 'data-option-key': option.key });
    const header = node('div', { class: 'option-header' });
    header.append(node('span', { class: 'option-number' }, `Option ${index + 1}`));
    const answerId = `answer-${option.key}`;
    const answerLabel = node('label', { for: answerId, class: 'check-label answer-label' });
    const radio = node('input', { id: answerId, type: 'radio', name: 'correct-answer', 'aria-label': `Correct answer: option ${index + 1}` });
    radio.checked = item.answerKey === option.key;
    radio.addEventListener('change', () => { if (radio.checked) { item.answerKey = option.key; changed(); } });
    answerLabel.append(radio, node('span', {}, 'Correct answer'));
    header.append(answerLabel);
    const textId = `option-${option.key}`;
    const input = node('textarea', { id: textId, maxlength: '1000', rows: '2' });
    input.required = true;
    input.value = option.text;
    input.addEventListener('input', () => { option.text = input.value; changed(); });
    const tools = node('div', { class: 'option-tools' });
    for (const [label, offset, suffix] of [['Move up', -1, 'up'], ['Move down', 1, 'down']]) {
      const id = `move-${option.key}-${suffix}`;
      const button = action(label, () => {
        moveOption(draft, item.key, option.key, offset);
        changed('Option moved. Its correct-answer selection follows it.');
        renderOptions();
        focus(id, textId);
      }, { id, class: 'secondary', 'aria-label': `${label} option ${index + 1}` });
      button.disabled = index + offset < 0 || index + offset >= item.options.length;
      tools.append(button);
    }
    const remove = action('Remove', () => {
      const result = removeOption(draft, item.key, option.key);
      changed(result.removedCorrectAnswer ? 'The correct option was removed. Choose a new correct answer before checking the deck.' : 'Option removed. The selected correct answer is unchanged.');
      renderOptions();
      focus(`option-${item.options[Math.min(index, item.options.length - 1)].key}`);
    }, { class: 'quiet', 'aria-label': `Remove option ${index + 1}` });
    remove.disabled = item.options.length <= 2;
    tools.append(remove);
    row.append(header, node('label', { for: textId, class: 'option-text-label' }, `Option ${index + 1} text`), input, tools);
    list.append(row);
  });
  byId('add-option').disabled = item.options.length >= AUTHOR_LIMITS.options;
}

function renderQuestion() {
  const editor = byId('question-editor');
  editor.replaceChildren();
  const item = currentQuestion();
  if (!item) { editor.append(node('p', { class: 'empty-editor' }, 'Add a question to start writing, or restore the question you just removed.')); return; }
  const index = draft.questions.indexOf(item);
  editor.append(node('h3', { id: 'question-title', tabindex: '-1' }, `Question ${index + 1}`));
  textField(editor, item, 'prompt', 'Question prompt', 2000);
  const grid = node('div', { class: 'question-grid' });
  const conceptField = node('div');
  const select = node('select', { id: 'question-concept' });
  select.addEventListener('change', () => {
    if (!select.value) { item.conceptKey = null; changed(); renderConceptChoices(); return; }
    const removed = setQuestionConcept(draft, item.key, select.value);
    changed(removed ? 'Concept changed. Its own prerequisite link was removed.' : 'Question concept updated.');
    renderConceptChoices();
    focus('question-concept');
  });
  conceptField.append(node('label', { for: 'question-concept' }, 'Concept this question teaches'), select);
  const prerequisites = node('fieldset', { id: 'question-prerequisites', tabindex: '-1' });
  prerequisites.append(node('legend', {}, 'Concepts needed first (optional)'), node('div', { id: 'question-prerequisites-list', class: 'prerequisite-list' }));
  grid.append(conceptField, prerequisites);
  editor.append(grid);
  const options = node('fieldset', { id: 'question-options', tabindex: '-1' });
  options.append(node('legend', {}, 'Answer options'), node('p', { class: 'hint' }, 'Select the one correct answer. Moving an option keeps its selection.'), node('div', { id: 'option-list' }));
  options.append(action('Add option', () => {
    const option = addOption(draft, item.key);
    changed('Answer option added.');
    renderOptions();
    focus(`option-${option.key}`);
  }, { id: 'add-option', class: 'secondary' }));
  editor.append(options);
  textField(editor, item, 'explanation', 'Why is that answer correct?', 4000, 4);
  textField(editor, item, 'transfer', 'How can the learner apply this idea?', 2000);
  renderConceptChoices();
  renderOptions();
}

function renderAll() {
  for (const field of ['title', 'attribution', 'license']) byId(`deck-${field}`).value = draft[field];
  renderConcepts();
  renderNavigation();
  renderQuestion();
}

function goToIssue() {
  if (!issue) return;
  if (issue.questionKey) {
    currentKey = issue.questionKey;
    renderNavigation(); renderQuestion();
  }
  let id;
  if (issue.optionKey) id = `option-${issue.optionKey}`;
  else if (issue.conceptKey) id = `concept-${issue.conceptKey}`;
  else if (['title', 'attribution', 'license'].includes(issue.field)) id = `deck-${issue.field}`;
  else if (issue.field === 'concepts') id = draft.concepts[0] ? `concept-${draft.concepts[0].key}` : 'add-concept';
  else if (issue.field === 'questions') id = draft.questions.length ? 'question-picker' : 'add-question';
  else if (issue.field === 'answer') id = currentQuestion()?.options[0] ? `answer-${currentQuestion().options[0].key}` : 'add-option';
  else if (issue.field === 'download') id = 'download-deck';
  else id = `question-${issue.field}`;
  const target = byId(id);
  if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) target.setAttribute('aria-invalid', 'true');
  focus(id, 'check-draft');
}

function preview(deck) {
  const content = byId('preview-content');
  content.replaceChildren();
  content.append(node('p', { class: 'preview-title' }, deck.title),
    node('p', { class: 'preview-meta' }, `${deck.items.length} questions · ${deck.concepts.length} concepts`),
    node('p', { class: 'preview-meta' }, `Author or source: ${deck.attribution}`),
    node('p', { class: 'preview-meta' }, `Permission to use: ${deck.license}`));
  deck.items.forEach((item, index) => {
    const details = node('details');
    details.open = index === 0;
    details.append(node('summary', {}, `Question ${index + 1} · ${item.concept}`),
      node('p', { class: 'preview-prompt' }, item.prompt),
      node('p', { class: 'hint' }, item.prerequisites.length ? `Concepts needed first: ${item.prerequisites.join(', ')}` : 'No earlier concepts required.'));
    const options = node('ol', { class: 'preview-options', type: 'A' });
    item.options.forEach((text, choice) => {
      const row = node('li', choice === item.answer ? { class: 'correct' } : {}, text);
      if (choice === item.answer) row.append(node('span', { class: 'answer-tag' }, 'Correct answer'));
      options.append(row);
    });
    details.append(options);
    for (const [heading, value] of [['Explanation', item.explanation], ['Apply the idea', item.transfer]]) {
      const paragraph = node('p', { class: 'preview-detail' });
      paragraph.append(node('strong', {}, heading), document.createTextNode(value));
      details.append(paragraph);
    }
    content.append(details);
  });
  byId('author-preview').hidden = false;
  byId('preview-heading').focus();
}

for (const field of ['title', 'attribution', 'license']) byId(`deck-${field}`).addEventListener('input', event => {
  draft[field] = event.target.value;
  changed();
});
byId('add-concept').addEventListener('click', () => {
  const concept = addConcept(draft);
  changed('Concept added. Give it a name and include a question about it.');
  renderConcepts(); renderConceptChoices(); focus(`concept-${concept.key}`, 'add-concept');
});
byId('question-picker').addEventListener('change', event => { currentKey = event.target.value; renderNavigation(); renderQuestion(); });
byId('add-question').addEventListener('click', () => {
  const item = addQuestion(draft); currentKey = item.key;
  changed('Question added.'); renderNavigation(); renderQuestion(); focus('question-prompt');
});
byId('remove-question').addEventListener('click', () => {
  removedQuestion = removeQuestion(draft, currentKey);
  currentKey = draft.questions[Math.min(removedQuestion.index, draft.questions.length - 1)]?.key ?? null;
  changed('Question removed. You can undo the last removal.'); renderNavigation(); renderQuestion();
  focus(draft.questions.length ? 'question-picker' : 'add-question', 'add-question');
});
byId('undo-question').addEventListener('click', () => {
  if (!removedQuestion) return;
  const previousConcept = removedQuestion.item.conceptKey;
  const previousLinks = removedQuestion.item.prerequisiteKeys.length;
  try { currentKey = restoreQuestion(draft, removedQuestion).key; }
  catch (error) { status(error.message); return; }
  const restored = currentQuestion();
  const changes = [];
  if (previousConcept !== null && restored.conceptKey === null) changes.push('Its deleted concept was cleared; choose a concept.');
  if (restored.prerequisiteKeys.length < previousLinks) changes.push('Deleted prerequisite links were removed.');
  removedQuestion = null;
  changed(['Removed question restored.', ...changes, 'All question text and answer choices are kept.'].join(' '));
  renderNavigation(); renderQuestion(); focus('question-prompt');
});
for (const [id, offset] of [['move-question-up', -1], ['move-question-down', 1]]) byId(id).addEventListener('click', () => {
  moveQuestion(draft, currentKey, offset); changed('Question order updated.'); renderNavigation(); renderQuestion(); focus(id);
});
byId('go-to-error').addEventListener('click', goToIssue);
byId('author-form').addEventListener('submit', event => {
  event.preventDefault(); clearError();
  const result = checkDraft(draft);
  if (!result.ok) { checked = null; byId('download-deck').disabled = true; byId('author-preview').hidden = true; showError(result.message, result.target); return; }
  checked = result;
  byId('download-deck').disabled = false;
  const bytes = new TextEncoder().encode(result.json).length;
  byId('download-help').textContent = `Checked: ${result.deck.items.length} questions, ${result.deck.concepts.length} concepts · ${(bytes / 1024).toFixed(1)} KiB. Ready to download.`;
  status('Deck checked. Review the answer key, then download the JSON file.');
  preview(result.deck);
});
byId('download-deck').addEventListener('click', () => {
  if (!checked) return;
  let url = null;
  let link = null;
  try {
    url = URL.createObjectURL(new Blob([checked.json], { type: 'application/json;charset=utf-8' }));
    link = node('a', { href: url, download: downloadName(checked.deck.title) });
    document.body.append(link); link.click();
    clearError(); status('Deck download started. Keep the JSON file to share or reopen it here.');
  } catch {
    showError('The download could not be prepared. Your checked draft is still here; try Download checked deck again.', { field: 'download' });
  } finally {
    link?.remove();
    if (url) setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
});

byId('save-draft').addEventListener('click', () => {
  let url = null;
  let link = null;
  const output = byId('draft-save-status');
  try {
    const json = serializeAuthorDraft(draft);
    const name = draft.title.trim() ? downloadName(draft.title).replace(/\.json$/, '.draft.json') : 'recallweave.draft.json';
    url = URL.createObjectURL(new Blob([json], { type: 'application/json;charset=utf-8' }));
    link = node('a', { href: url, download: name });
    document.body.append(link); link.click();
    output.textContent = 'Draft download started. Reopen this editable file here to continue; check the deck separately when the lesson is complete.';
    output.removeAttribute('data-error');
  } catch (error) {
    output.textContent = `The draft download could not be prepared. ${error.message} Your writing and any checked preview are still here. Try Save draft again after resolving the problem.`;
    output.setAttribute('data-error', 'true');
  } finally {
    link?.remove();
    if (url) setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
});

renderAll();
mountAuthorDeckLoader(document, (content, kind) => {
  draft = kind === 'draft' ? structuredClone(content) : draftFromDeck(content);
  currentKey = draft.questions[0]?.key ?? null; removedQuestion = null;
  changed(kind === 'draft' ? 'Editable draft opened. Its unfinished content is preserved. Check it when the lesson is complete.' : 'Deck opened for editing. Check it again after your changes.');
  renderAll(); focus('deck-title');
});
