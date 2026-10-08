import { createReflectionFile, readReflectionFile, REFLECTION_FILE_MAX_BYTES } from './reflection-file.mjs';

/** File reads are previews; only an explicit confirmation replaces the writing. */
export function mountReflectionFile({container, getDeck, getReflections, getRevision, replaceReflections}) {
  container.innerHTML = '<details id="reflection-file-panel"><summary>Save or reopen your written explanations</summary>'
    + '<p>Keep editable question explanations and your application response. Open the exact same course before reopening its writing.</p>'
    + '<button type="button" class="reset-button" id="save-reflections-button" aria-describedby="reflection-save-status">Save explanations (.json)</button>'
    + '<p id="reflection-save-status" role="status">This file keeps writing and course content, not answers or model estimates.</p>'
    + '<label for="reflection-file">Choose saved explanations (.json, up to 2 MiB)</label>'
    + '<input type="file" id="reflection-file" accept=".json,application/json" aria-describedby="reflection-file-status">'
    + '<p id="reflection-file-status" role="status">Preview the writing before replacing anything.</p>'
    + '<section id="reflection-file-preview" hidden aria-labelledby="reflection-preview-title">'
    + '<h3 id="reflection-preview-title" tabindex="-1">Preview written explanations</h3><p id="reflection-preview-summary"></p>'
    + '<p>Replace changes every writing field, including empty fields. First answers, practice and model estimates stay as they are. The writing appears in the completed learning trace.</p>'
    + '<div id="reflection-preview-writing"></div>'
    + '<button type="button" class="primary-button" id="reflection-replace-confirm">Replace my writing</button> '
    + '<button type="button" class="reset-button" id="reflection-replace-cancel">Cancel</button></section></details>';
  const query = selector => container.querySelector(selector);
  const input = query('#reflection-file');
  const status = query('#reflection-file-status');
  const preview = query('#reflection-file-preview');
  let generation = 0;
  let pending = null;
  let readingStamp = null;
  const stamp = () => JSON.stringify({deck: getDeck(), writing: getReflections(), revision: getRevision()});
  function clear(message, resetInput = true) {
    generation++;
    pending = null;
    readingStamp = null;
    preview.hidden = true;
    query('#reflection-preview-writing').replaceChildren();
    if (resetInput) input.value = '';
    if (message) status.textContent = message;
  }
  function refresh() {
    const expected = pending?.stamp ?? readingStamp;
    if (expected !== null && expected !== undefined && expected !== stamp()) {
      clear('Your writing or course changed. Choose the file again to review it against the current lesson.');
    }
  }
  function showWriting(state) {
    const target = query('#reflection-preview-writing');
    const deck = getDeck();
    for (const note of state.reflections.notes) {
      const details = document.createElement('details');
      const summary = document.createElement('summary');
      summary.textContent = deck.items.find(item => item.id === note.item).prompt;
      const text = document.createElement('p');
      text.textContent = note.text.length ? note.text : '(Not written.)';
      text.style.whiteSpace = 'pre-wrap';
      text.style.overflowWrap = 'anywhere';
      details.append(summary, text);
      target.append(details);
    }
    const heading = document.createElement('h4');
    heading.textContent = 'Application response';
    const application = document.createElement('p');
    application.textContent = state.reflections.application.length ? state.reflections.application : '(Not written.)';
    application.style.whiteSpace = 'pre-wrap';
    application.style.overflowWrap = 'anywhere';
    target.append(heading, application);
  }
  query('#save-reflections-button').addEventListener('click', () => {
    let url;
    const saveStatus = query('#reflection-save-status');
    try {
      const file = createReflectionFile({deck: getDeck(), reflections: getReflections()});
      url = URL.createObjectURL(new Blob([file.text], {type: file.mediaType}));
      const link = document.createElement('a');
      link.href = url;
      link.download = file.filename;
      document.body.append(link);
      try { link.click(); } finally { link.remove(); }
      saveStatus.textContent = 'Download requested. Your writing is still here; check the browser’s downloads for the saved file.';
    } catch (error) {
      saveStatus.textContent = (error instanceof RangeError ? error.message : 'The explanations could not be saved.') + ' Your writing is unchanged.';
    } finally {
      if (url) setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
  });
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    clear(undefined, false);
    if (!file) {
      status.textContent = 'No file selected. Your writing is unchanged.';
      return;
    }
    const ticket = generation;
    readingStamp = stamp();
    const before = readingStamp;
    status.textContent = 'Reading the selected explanations…';
    try {
      if (file.size > REFLECTION_FILE_MAX_BYTES) throw new RangeError('Choose a written-explanations file no larger than 2 MiB.');
      const bytes = await file.arrayBuffer();
      if (ticket !== generation) return;
      if (before !== stamp()) {
        clear('Your writing or course changed. Choose the file again.');
        return;
      }
      let text;
      try { text = new TextDecoder('utf-8', {fatal: true}).decode(bytes); }
      catch { throw new RangeError('This file is not valid UTF-8 written-explanations JSON.'); }
      const state = readReflectionFile(text, getDeck());
      pending = {state, stamp: before};
      readingStamp = null;
      query('#reflection-preview-summary').textContent = state.title + ' — saved ' + state.savedAt
        + '. Writing in ' + state.writtenQuestions + ' of ' + state.reflections.notes.length + ' question fields.'
        + (state.reflections.application.length ? ' Application response included.' : ' Application response is empty.');
      showWriting(state);
      preview.hidden = false;
      status.textContent = 'Preview ready. Your writing is unchanged until you choose Replace my writing.';
      query('#reflection-preview-title').focus();
    } catch (error) {
      if (ticket !== generation) return;
      clear((error instanceof RangeError ? error.message : 'This file could not be read.') + ' Your writing is unchanged.');
    }
  });
  query('#reflection-replace-cancel').addEventListener('click', () => {
    clear('Replacement canceled. Your writing is unchanged.');
    input.focus();
  });
  query('#reflection-replace-confirm').addEventListener('click', () => {
    if (!pending) return;
    if (pending.stamp !== stamp()) {
      clear('Your writing or course changed. Choose the file again before replacing.');
      input.focus();
      return;
    }
    const state = pending.state;
    clear();
    replaceReflections(state.reflections);
    status.textContent = 'Written explanations replaced. First answers, practice and model estimates are unchanged.';
    input.focus();
  });
  return Object.freeze({refresh});
}
