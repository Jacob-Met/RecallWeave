import { createLessonArchive, readLessonArchive, LESSON_ARCHIVE_MAX_BYTES } from './lesson-archive.mjs';

/** The caller owns lesson state; reading and previewing a file never change it. */
export function mountLessonArchive({container, getDeck, getLesson, resumeLesson}) {
  container.innerHTML = '<details id="lesson-archive-panel"><summary>Save or resume an unfinished lesson</summary>'
    + '<p>Save your place, answers, and answer ordering in a file. To continue later, open the same course and choose that file.</p>'
    + '<button type="button" class="reset-button" id="save-lesson-button" aria-describedby="save-lesson-status">Save lesson (.json)</button>'
    + '<p id="save-lesson-status" role="status"></p>'
    + '<label for="lesson-file">Choose a saved unfinished lesson (.json, up to 2 MiB)</label>'
    + '<input type="file" id="lesson-file" accept=".json,application/json" aria-describedby="lesson-restore-status">'
    + '<p id="lesson-restore-status" role="status">A preview appears before anything is resumed.</p>'
    + '<section id="lesson-preview" class="lesson-preview" hidden aria-labelledby="lesson-preview-title">'
    + '<h3 id="lesson-preview-title" tabindex="-1">Preview saved lesson</h3><p id="lesson-preview-summary"></p>'
    + '<p>Resuming replaces the lesson answers and practice progress in this tab. Any reflections already in this tab stay as they are.</p>'
    + '<div class="trace-archive-actions"><button type="button" class="primary-button" id="resume-lesson-confirm">Resume this lesson</button>'
    + '<button type="button" class="reset-button" id="resume-lesson-cancel">Cancel</button></div></section></details>';
  const query = selector => container.querySelector(selector);
  const saveButton = query('#save-lesson-button');
  const saveStatus = query('#save-lesson-status');
  const input = query('#lesson-file');
  const restoreStatus = query('#lesson-restore-status');
  const preview = query('#lesson-preview');
  let generation = 0, pending = null, readingStamp = null, previousSaveState;

  const stamp = () => JSON.stringify({deck: getDeck(), lesson: getLesson()});
  function clearPreview(message, resetInput = true) {
    generation++;
    pending = null;
    readingStamp = null;
    preview.hidden = true;
    if (resetInput) input.value = '';
    if (message) restoreStatus.textContent = message;
  }
  function changed() {
    clearPreview('Your lesson changed. Choose the saved file again to preview it against the current lesson.');
  }
  function refresh() {
    const lesson = getLesson();
    const complete = lesson.answers.length >= getDeck().items.length;
    const started = ['question', 'feedback'].includes(lesson.presentation?.phase);
    const saveState = complete ? 'complete' : started ? 'started' : 'unstarted';
    saveButton.disabled = saveState !== 'started';
    if (saveState !== previousSaveState) {
      saveStatus.textContent = complete
        ? 'This lesson is complete. Use the learning trace below to save its answers and practice progress.'
        : started ? 'Save a file to return to this question or feedback later. Your lesson stays open.'
          : 'Start a lesson to save your place, even before answering its first question.';
      previousSaveState = saveState;
    }
    const expected = pending?.stamp ?? readingStamp;
    if (expected !== null && expected !== undefined && expected !== stamp()) changed();
  }

  saveButton.addEventListener('click', () => {
    if (saveButton.disabled) return;
    let url;
    try {
      const archive = createLessonArchive({deck: getDeck(), ...getLesson()});
      url = URL.createObjectURL(new Blob([archive.text], {type: archive.mediaType}));
      const link = document.createElement('a');
      link.href = url;
      link.download = archive.filename;
      document.body.append(link);
      try { link.click(); } finally { link.remove(); }
      saveStatus.textContent = 'Download requested. Check your browser’s downloads for the saved lesson. Your answers are still here.';
    } catch {
      saveStatus.textContent = 'The lesson file could not be prepared. Your answers are still here; try saving again.';
    } finally {
      if (url) setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
  });

  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    clearPreview(undefined, false);
    if (!file) {
      restoreStatus.textContent = 'No file selected. Your current lesson is unchanged.';
      return;
    }
    const ticket = generation;
    readingStamp = stamp();
    const beforeRead = readingStamp;
    restoreStatus.textContent = 'Reading the selected lesson…';
    try {
      if (file.size > LESSON_ARCHIVE_MAX_BYTES) throw new RangeError('Choose a saved lesson file no larger than 2 MiB.');
      const text = await file.text();
      if (ticket !== generation || !container.isConnected) return;
      if (beforeRead !== stamp()) return changed();
      const state = readLessonArchive(text, getDeck());
      pending = {state, stamp: beforeRead};
      readingStamp = null;
      const {answered, total, remaining} = state.summary;
      const position = state.presentation.phase === 'feedback'
        ? 'Returns to the explanation for your last answer.'
        : 'Returns to the next unanswered question.';
      query('#lesson-preview-summary').textContent = state.title + ' — saved ' + state.savedAt
        + '. ' + answered + ' of ' + total + ' questions answered; ' + remaining + ' remaining. ' + position;
      preview.hidden = false;
      restoreStatus.textContent = 'Preview ready. Your current lesson stays as it is until you resume.';
      query('#lesson-preview-title').focus();
    } catch (error) {
      if (ticket !== generation || !container.isConnected) return;
      if (beforeRead !== stamp()) return changed();
      clearPreview((error instanceof RangeError ? error.message : 'This lesson file could not be read.')
        + ' Your current lesson is unchanged.');
    }
  });
  query('#resume-lesson-cancel').addEventListener('click', () => {
    clearPreview('Resume canceled. Your current lesson is unchanged.');
    input.focus();
  });
  query('#resume-lesson-confirm').addEventListener('click', () => {
    if (!pending || !container.isConnected) return;
    if (pending.stamp !== stamp()) {
      changed();
      input.focus();
      return;
    }
    const state = pending.state;
    clearPreview();
    resumeLesson(state);
    refresh();
    restoreStatus.textContent = 'Lesson resumed. Continue from the saved question or feedback.';
  });
  refresh();
  return Object.freeze({refresh});
}
