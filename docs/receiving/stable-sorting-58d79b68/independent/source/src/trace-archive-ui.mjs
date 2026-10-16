import { createTraceArchive, readTraceArchive, TRACE_ARCHIVE_MAX_BYTES } from './trace-archive.mjs';

/** Explicit local download and preview/restore; the owner supplies the sole state-changing callback. */
export function mountTraceArchive({container, getDeck, getTrace, restoreTrace}) {
  container.innerHTML = '<details id="trace-archive-panel"><summary>Keep or restore a learning trace</summary>'
    + '<p>Save completed first answers and any practice progress. To return later, open the same course and choose the saved file.</p>'
    + '<button type="button" class="reset-button" id="save-trace-button" aria-describedby="save-trace-status">Download trace (.json)</button>'
    + '<p id="save-trace-status" role="status"></p>'
    + '<label for="trace-file">Choose a saved learning trace (.json, up to 2 MiB)</label>'
    + '<input type="file" id="trace-file" accept=".json,application/json" aria-describedby="trace-restore-status">'
    + '<p id="trace-restore-status" role="status">A preview appears before anything is restored.</p>'
    + '<section id="trace-preview" hidden aria-labelledby="trace-preview-title">'
    + '<h3 id="trace-preview-title" tabindex="-1">Preview saved trace</h3><p id="trace-preview-summary"></p>'
    + '<p>Restoring replaces the first answers and practice progress in this tab. This file contains answers and practice progress only; any reflections already in this tab stay as they are.</p>'
    + '<div class="trace-archive-actions"><button type="button" class="primary-button" id="restore-trace-confirm">Restore these answers</button>'
    + '<button type="button" class="reset-button" id="restore-trace-cancel">Cancel</button></div></section></details>';
  const query = selector => container.querySelector(selector);
  const saveButton = query('#save-trace-button');
  const saveStatus = query('#save-trace-status');
  const input = query('#trace-file');
  const restoreStatus = query('#trace-restore-status');
  const preview = query('#trace-preview');
  let generation = 0;
  let pending = null;
  let readingStamp = null;
  let previousCanSave;

  function stamp() {
    const {answers, mastery, practice} = getTrace();
    return JSON.stringify({deck: getDeck(), answers, mastery, practice});
  }
  function clearPreview(message, resetInput = true) {
    generation++;
    pending = null;
    readingStamp = null;
    preview.hidden = true;
    if (resetInput) input.value = '';
    if (message) restoreStatus.textContent = message;
  }
  function refresh() {
    const trace = getTrace();
    const canSave = trace.answers.length > 0 && trace.answers.length === getDeck().items.length;
    saveButton.disabled = !canSave;
    if (canSave !== previousCanSave) {
      saveStatus.textContent = canSave
        ? 'Download a trace to return to these answers and recorded practice later.'
        : 'Finish the first session before saving a trace.';
      previousCanSave = canSave;
    }
    const expected = pending?.stamp ?? readingStamp;
    if (expected !== null && expected !== undefined && expected !== stamp()) {
      clearPreview('Your lesson changed. Choose the trace file again to preview it against the current session.');
    }
  }

  saveButton.addEventListener('click', () => {
    let url;
    try {
      const archive = createTraceArchive({deck: getDeck(), ...getTrace()});
      url = URL.createObjectURL(new Blob([archive.text], {type: archive.mediaType}));
      const link = document.createElement('a');
      link.href = url;
      link.download = archive.filename;
      document.body.append(link);
      try { link.click(); } finally { link.remove(); }
      saveStatus.textContent = 'Download requested. Check your browser’s downloads for the learning trace. Your answers are still here.';
    } catch {
      saveStatus.textContent = 'The trace could not be prepared. Your answers are still here; try the download again.';
    } finally {
      if (url) setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
  });

  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    clearPreview(undefined, false);
    if (!file) {
      restoreStatus.textContent = 'No trace selected. Your current lesson is unchanged.';
      return;
    }
    const ticket = generation;
    readingStamp = stamp();
    const beforeRead = readingStamp;
    restoreStatus.textContent = 'Reading the selected trace…';
    try {
      if (file.size > TRACE_ARCHIVE_MAX_BYTES) throw new RangeError('Choose a learning trace file no larger than 2 MiB.');
      const text = await file.text();
      if (ticket !== generation) return;
      if (beforeRead !== stamp()) {
        clearPreview('Your lesson changed. Choose the trace file again to preview it against the current session.');
        return;
      }
      const state = readTraceArchive(text, getDeck());
      pending = {state, stamp: beforeRead};
      readingStamp = null;
      const summary = state.summary;
      const practiceText = !summary.practiceTotal ? 'No missed connections need practice.'
        : !summary.practiceStarted ? 'Practice not started: ' + summary.practiceTotal + ' missed connections.'
        : 'Practice: ' + summary.practiceAnswers + ' of ' + summary.practiceTotal + ' answers recorded.';
      query('#trace-preview-summary').textContent = state.title + ' — saved ' + state.savedAt
        + '. First try: ' + summary.correctFirst + ' of ' + summary.firstAnswers + ' connections correct. ' + practiceText;
      preview.hidden = false;
      restoreStatus.textContent = 'Preview ready. Your current lesson is unchanged until you restore.';
      query('#trace-preview-title').focus();
    } catch (error) {
      if (ticket !== generation) return;
      clearPreview((error instanceof RangeError ? error.message : 'This trace could not be read.') + ' Your current lesson is unchanged.');
    }
  });

  query('#restore-trace-cancel').addEventListener('click', () => {
    clearPreview('Restore canceled. Your current lesson is unchanged.');
    input.focus();
  });
  query('#restore-trace-confirm').addEventListener('click', () => {
    if (!pending) return;
    if (pending.stamp !== stamp()) {
      clearPreview('Your lesson changed. Choose the trace file again before restoring.');
      input.focus();
      return;
    }
    const state = pending.state;
    clearPreview();
    restoreTrace(state);
    refresh();
    restoreStatus.textContent = 'Trace restored. Review your first answers and resume any remaining practice from the learning trace.';
  });
  refresh();
  return Object.freeze({refresh});
}
