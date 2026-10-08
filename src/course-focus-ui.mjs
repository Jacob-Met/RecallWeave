import { MAX_DECK_BYTES, parseDeck } from './deck.mjs';
import { createFocusedLesson, planCourseFocus } from './course-focus.mjs';

function focusNode(tag, attributes = {}, text) {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  if (text !== undefined) element.textContent = text;
  return element;
}

/** A selected source and its output stay separate from asynchronous file previews. */
export function mountCourseFocus(root) {
  const byId = id => root.querySelector('#' + id);
  const fileInput = byId('source-file');
  const titleInput = byId('focus-title');
  const download = byId('download-focus');
  let source = null;
  let pending = null;
  let readingFile = false;
  let fileRevision = 0;
  let targets = new Set();
  let ready = null;

  function conceptReference(concept) {
    return `Source concept ${source.concepts.indexOf(concept) + 1}: ${concept}`;
  }
  function status(id, message, error = false) {
    const element = byId(id);
    element.textContent = message;
    element.dataset.error = String(error);
  }
  function retireFilePreview() {
    fileRevision++;
    pending = null;
    readingFile = false;
    byId('source-preview').hidden = true;
  }
  function editingStarted() {
    if (readingFile || pending) {
      status('file-status', 'File selection cancelled because you continued editing the current lesson.');
    }
    retireFilePreview();
    status('download-status', '');
  }
  function renderQuestions(plan) {
    const container = byId('included-questions');
    container.replaceChildren();
    byId('question-preview').hidden = !plan.items.length;
    const positions = new Map(source.items.map((item, index) => [item.id, index + 1]));
    for (const item of plan.items) {
      const detail = focusNode('details', { class: 'question', 'data-item-id': item.id });
      const summary = focusNode('summary');
      summary.append(focusNode('span', { class: 'question-number' }, `SOURCE QUESTION ${String(positions.get(item.id)).padStart(2, '0')}`), focusNode('span', {}, item.prompt));
      const content = focusNode('div', { class: 'question-content' });
      content.append(focusNode('p', { class: 'hint' }, conceptReference(item.concept)));
      content.append(focusNode('p', { class: 'hint' }, item.prerequisites.length ? `Prerequisites: ${item.prerequisites.map(conceptReference).join('; ')}` : 'No prerequisite links.'));
      const options = focusNode('ol', { type: 'A' });
      item.options.forEach((option, index) => {
        const row = focusNode('li', index === item.answer ? { class: 'correct-option' } : {}, option);
        if (index === item.answer) row.append(focusNode('span', {}, ' — correct answer'));
        options.append(row);
      });
      content.append(options, focusNode('p', {}, item.explanation), focusNode('p', {}, `Try this transfer: ${item.transfer}`));
      detail.append(summary, content);
      container.append(detail);
    }
  }

  function renderSelection() {
    ready = null;
    download.disabled = true;
    titleInput.removeAttribute('aria-invalid');
    byId('clear-targets').disabled = targets.size === 0;
    byId('select-all').disabled = targets.size === source.concepts.length;
    const plan = planCourseFocus(source, [...targets]);
    const list = byId('included-concepts');
    list.replaceChildren();
    status('selection-summary', plan.requested.length
      ? `${plan.requested.length} target ${plan.requested.length === 1 ? 'concept' : 'concepts'} + ${plan.required.length} prerequisite ${plan.required.length === 1 ? 'concept' : 'concepts'} · ${plan.items.length} of ${source.items.length} questions`
      : 'Choose at least one target concept to see what stays.');
    for (const inclusion of plan.inclusions) {
      const row = focusNode('li', { class: 'inclusion', 'data-concept': inclusion.concept });
      const heading = focusNode('div', { class: 'inclusion-head' });
      heading.append(focusNode('strong', {}, conceptReference(inclusion.concept)), focusNode('span', { class: 'badge' + (inclusion.requested ? ' target-badge' : '') }, inclusion.requested ? 'Selected target' : 'Required by links'));
      row.append(heading, focusNode('p', {}, `${inclusion.questionCount} ${inclusion.questionCount === 1 ? 'question stays' : 'questions stay'}.`));
      if (inclusion.requiredBy.length) row.append(focusNode('p', {}, `Linked as a prerequisite by: ${inclusion.requiredBy.map(conceptReference).join('; ')}`));
      list.append(row);
    }
    renderQuestions(plan);
    if (!plan.requested.length) {
      status('download-help', 'Choose a target concept and add a lesson title before downloading.');
      return;
    }
    if (!titleInput.value.trim()) {
      status('download-help', 'Add a title for the focused lesson before downloading.');
      return;
    }
    try {
      ready = createFocusedLesson(source, [...targets], titleInput.value);
      status('download-help', `Checked lesson · ${ready.deck.items.length} questions · ${ready.bytes.toLocaleString('en-US')} UTF-8 bytes. Original attribution and permission are included.`);
      download.disabled = false;
    } catch (error) {
      if (/title/.test(error.message)) titleInput.setAttribute('aria-invalid', 'true');
      status('download-help', error.message, true);
    }
  }

  function renderTargets() {
    const container = byId('target-concepts');
    container.replaceChildren();
    source.concepts.forEach((concept, index) => {
      const label = focusNode('label', { class: 'target', for: `focus-target-${index}` });
      const input = focusNode('input', { type: 'checkbox', id: `focus-target-${index}`, 'data-concept-index': index });
      input.checked = targets.has(concept);
      input.addEventListener('change', () => {
        editingStarted();
        if (input.checked) targets.add(concept); else targets.delete(concept);
        renderSelection();
      });
      const text = focusNode('span', { class: 'target-text' });
      const count = source.items.filter(item => item.concept === concept).length;
      text.append(focusNode('span', { class: 'target-name' }, concept), focusNode('span', { class: 'target-count' }, `Source concept ${index + 1} · ${count} ${count === 1 ? 'question' : 'questions'}`));
      label.append(input, text);
      container.append(label);
    });
  }

  byId('open-source').addEventListener('click', () => {
    retireFilePreview();
    fileInput.value = '';
    fileInput.click();
  });
  fileInput.addEventListener('cancel', () => {
    retireFilePreview();
    status('file-status', 'File choice cancelled. The current source and selection are unchanged.');
    byId('open-source').focus();
  });
  fileInput.addEventListener('change', async () => {
    retireFilePreview();
    const revision = fileRevision;
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) {
      status('file-status', 'No file selected. The current source and selection are unchanged.');
      byId('open-source').focus();
      return;
    }
    readingFile = true;
    status('file-status', 'Checking the selected file. Your current source and selection stay in place.');
    try {
      if (!Number.isFinite(file.size) || file.size < 0 || file.size > MAX_DECK_BYTES) {
        throw new Error('Choose a checked JSON deck no larger than 256 KiB.');
      }
      const text = await file.text();
      if (revision !== fileRevision) return;
      const deck = parseDeck(text);
      readingFile = false;
      pending = { deck, filename: file.name };
      byId('source-preview-title').textContent = deck.title;
      byId('source-preview-summary').textContent = `${file.name} · ${deck.items.length} questions · ${deck.concepts.length} concepts`;
      byId('source-preview-attribution').textContent = deck.attribution;
      byId('source-preview-license').textContent = deck.license;
      byId('source-preview').hidden = false;
      status('file-status', 'File checked. Inspect the preview, then choose Use this deck or Cancel preview.');
      byId('source-preview-title').focus();
    } catch (error) {
      if (revision !== fileRevision) return;
      readingFile = false;
      status('file-status', `${error.message || 'The file could not be read.'} The current source and selection are unchanged.`, true);
      byId('open-source').focus();
    }
  });
  byId('cancel-source').addEventListener('click', () => {
    retireFilePreview();
    status('file-status', 'Preview cancelled. The current source and selection are unchanged.');
    byId('open-source').focus();
  });
  byId('use-source').addEventListener('click', () => {
    if (!pending) return;
    const incoming = pending;
    retireFilePreview();
    source = incoming.deck;
    targets = new Set();
    titleInput.value = '';
    byId('source-title').textContent = source.title;
    byId('source-summary').textContent = `${incoming.filename} · ${source.items.length} questions · ${source.concepts.length} concepts`;
    byId('source-attribution').textContent = source.attribution;
    byId('source-license').textContent = source.license;
    byId('focus-editor').hidden = false;
    status('file-status', 'Source selected. Choose target concepts and give the focused lesson a title.');
    status('download-status', '');
    renderTargets();
    renderSelection();
    byId('targets-heading').focus();
  });
  for (const [id, all] of [['select-all', true], ['clear-targets', false]]) {
    byId(id).addEventListener('click', () => {
      if (!source) return;
      editingStarted();
      targets = new Set(all ? source.concepts : []);
      renderTargets();
      renderSelection();
      // The clicked action becomes disabled; keep the next keyboard action usable.
      byId(all ? 'clear-targets' : 'select-all').focus();
    });
  }
  titleInput.addEventListener('input', () => {
    if (!source) return;
    editingStarted();
    renderSelection();
  });
  download.addEventListener('click', () => {
    if (!source) return;
    renderSelection();
    if (!ready) return;
    let url, link;
    try {
      url = URL.createObjectURL(new Blob([ready.json], { type: 'application/json;charset=utf-8' }));
      const stem = ready.deck.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64) || 'focused-lesson';
      link = focusNode('a', { href: url, download: stem + '.focus.json' });
      link.hidden = true;
      document.body.append(link);
      link.click();
      status('download-status', 'Lesson download started. Keep this checked JSON file, then open it in the learning app or Deck studio.');
    } catch {
      status('download-status', 'The download could not start. Your source and selection are still here; try again.', true);
    } finally {
      link?.remove();
      if (url) setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  });
}

const courseFocusRoot = document.querySelector('#course-focus');
if (courseFocusRoot) mountCourseFocus(courseFocusRoot);
