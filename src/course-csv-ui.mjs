import { COURSE_CSV_TEMPLATE, MAX_COURSE_CSV_BYTES, convertCourseCsv } from './course-csv.mjs';

const get = id => document.getElementById(id);
const fileInput = get('csv-file');
const fields = [get('course-title'), get('course-attribution'), get('course-license')];
const checkButton = get('check-csv');
const downloadButton = get('download-course');
const preview = get('course-preview');
const status = get('csv-status');
let source = null, prepared = null, reading = false, fileGeneration = 0;

function message(text, error = false) {
  status.textContent = text;
  status.classList.toggle('is-error', error);
}
function syncControls() {
  checkButton.disabled = reading || source === null;
  downloadButton.disabled = reading || prepared === null;
  get('csv-form').setAttribute('aria-busy', String(reading));
}
function retire() {
  prepared = null;
  preview.hidden = true;
  get('course-questions').replaceChildren();
  syncControls();
}
function clearSource() {
  fileGeneration++;
  source = null;
  reading = false;
  get('csv-filename').textContent = 'No CSV selected.';
  retire();
}
for (const field of fields) {
  const changed = () => {
    retire();
    message(source ? 'Metadata changed. Check and preview again before downloading.' :
      'Enter the course metadata and choose a CSV to continue.');
  };
  field.addEventListener('input', changed);
  field.addEventListener('change', changed);
}
get('choose-csv').addEventListener('click', () => {
  clearSource();
  fileInput.value = '';
  message('Choose a CSV. A replacement selection clears the previous preview.');
  fileInput.click();
});
fileInput.addEventListener('cancel', () => {
  clearSource();
  message('File selection cancelled. Choose a CSV to continue; your metadata is kept.');
});
fileInput.addEventListener('change', async () => {
  clearSource();
  const generation = fileGeneration;
  const file = fileInput.files?.[0];
  if (!file) { message('Choose a CSV to continue.'); return; }
  if (file.size > MAX_COURSE_CSV_BYTES) {
    message('Choose a UTF-8 CSV no larger than 256 KiB.', true);
    return;
  }
  reading = true;
  get('csv-filename').textContent = file.name;
  syncControls();
  message('Reading ' + file.name + '…');
  try {
    const bytes = await file.arrayBuffer();
    if (generation !== fileGeneration) return;
    if (bytes.byteLength > MAX_COURSE_CSV_BYTES) {
      throw new Error('Choose a UTF-8 CSV no larger than 256 KiB.');
    }
    let text;
    try { text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes); }
    catch { throw new Error('This file is not valid UTF-8. Export it as UTF-8 CSV and choose it again.'); }
    source = Object.freeze({ text, name: file.name });
    message('CSV loaded. Enter its title and permissions, then check the complete course.');
  } catch (error) {
    if (generation !== fileGeneration) return;
    source = null;
    message(error.message || 'The file could not be read. Choose it again.', true);
  } finally {
    if (generation === fileGeneration) { reading = false; syncControls(); }
  }
});

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function sectionText(parent, label, text) {
  parent.append(element('h4', '', label), element('p', 'literal', text));
}
function renderCourse(deck, json) {
  get('preview-title').textContent = deck.title;
  get('preview-summary').textContent = deck.items.length + ' questions · ' + deck.concepts.length +
    ' concepts · ' + new TextEncoder().encode(json).length + ' JSON bytes';
  get('preview-attribution').textContent = deck.attribution;
  get('preview-license').textContent = deck.license;
  get('preview-concepts').textContent = deck.concepts.join(' → ');
  const questions = get('course-questions');
  questions.replaceChildren();
  for (const [index, item] of deck.items.entries()) {
    const card = element('li', 'question-card');
    card.append(element('h3', '', 'Question ' + (index + 1)),
      element('p', 'identity literal', 'ID: ' + item.id),
      element('p', 'identity literal', 'Concept: ' + item.concept),
      element('p', 'prompt literal', item.prompt));
    const options = element('ol', 'options');
    for (const [number, option] of item.options.entries()) {
      const choice = element('li', number === item.answer ? 'correct-choice' : '');
      choice.append(element('span', 'literal', option));
      if (number === item.answer) choice.append(element('strong', 'correct-label', 'Correct option'));
      options.append(choice);
    }
    card.append(options);
    sectionText(card, 'Why this answer is correct', item.explanation);
    sectionText(card, 'Apply the idea', item.transfer);
    sectionText(card, 'Prerequisites', item.prerequisites.length ? JSON.stringify(item.prerequisites) : 'None');
    questions.append(card);
  }
  preview.hidden = false;
}
get('csv-form').addEventListener('submit', event => {
  event.preventDefault();
  retire();
  if (!source || reading) { message('Choose a CSV and wait for it to finish reading.', true); return; }
  const metadata = fields.map(field => field.value);
  try {
    const result = convertCourseCsv(source.text, {
      title: metadata[0], attribution: metadata[1], license: metadata[2]
    });
    renderCourse(result.deck, result.json);
    prepared = Object.freeze({ ...result, source, metadata: Object.freeze(metadata) });
    syncControls();
    message('Ready. Review the question order and numbered answer key below, then download.');
    get('preview-title').focus();
  } catch (error) {
    retire();
    message(error.message, true);
  }
});
function download(text, type, filename) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = element('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
downloadButton.addEventListener('click', () => {
  if (!prepared || reading || prepared.source !== source ||
      fields.some((field, index) => field.value !== prepared.metadata[index])) {
    retire();
    message('Inputs changed. Check and preview again before downloading.', true);
    return;
  }
  download(prepared.json, 'application/json;charset=utf-8', 'recallweave-course.json');
  message('Checked deck download started. Open the saved JSON in Deck studio or the learning app.');
});
get('download-csv-template').addEventListener('click', () => {
  download(COURSE_CSV_TEMPLATE, 'text/csv;charset=utf-8', 'course-question-bank.csv');
  message('CSV template download started. Replace its example rows with your own questions.');
});
syncControls();
