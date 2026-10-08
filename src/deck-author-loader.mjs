import { parseDeck } from './deck.mjs';
import { DRAFT_FORMAT, MAX_DRAFT_BYTES, parseAuthorDraft } from './deck-author-draft.mjs';

/** Stage a local draft or deck; the editor changes only after explicit replacement. */
export function mountAuthorDeckLoader(root, onReplace) {
  const ids = ['open-deck-button', 'open-deck', 'author-status', 'open-preview',
    'open-preview-title', 'open-preview-summary', 'replace-draft', 'cancel-open', 'open-preview-kind'];
  const elements = ids.map(id => {
    const element = root.querySelector(`#${id}`);
    if (!element) throw new Error(`The deck loader needs #${id}.`);
    return element;
  });
  const [open, input, status, preview, title, summary, replace, cancel, kindLabel] = elements;
  let revision = 0;
  let pending = null;

  function clearPreview() {
    pending = null;
    preview.hidden = true;
    replace.disabled = true;
    title.textContent = 'Open this file?';
    summary.textContent = '';
    kindLabel.textContent = '';
  }

  function keepDraft(message) {
    revision++;
    clearPreview();
    input.value = '';
    status.textContent = `${message} Your current draft is unchanged.`;
    open.focus();
  }

  open.addEventListener('click', () => {
    // Invalidate a pending read even if the next native file chooser is cancelled.
    revision++;
    clearPreview();
    input.value = '';
    status.textContent = 'Choose a local draft or deck to preview. Your current draft is unchanged.';
    input.click();
  });

  input.addEventListener('cancel', () => keepDraft('No new file was chosen.'));
  cancel.addEventListener('click', () => keepDraft('The file preview was cancelled.'));

  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) {
      keepDraft('No new file was chosen.');
      return;
    }
    const request = ++revision;
    clearPreview();
    status.textContent = 'Reading the local file… Your current draft is unchanged.';
    try {
      if (file.size > MAX_DRAFT_BYTES) throw new Error('Choose a JSON draft or deck no larger than 2 MiB.');
      let text;
      try { text = await file.text(); }
      catch { throw new Error('The file could not be read. Choose it again.'); }
      if (request !== revision) return;
      if (text.length > MAX_DRAFT_BYTES || new TextEncoder().encode(text).byteLength > MAX_DRAFT_BYTES) {
        throw new Error('Choose a JSON draft or deck no larger than 2 MiB.');
      }
      let format;
      try { format = JSON.parse(text)?.format; }
      catch { throw new Error('This file is not valid JSON.'); }
      const isDraft = typeof format === 'string' && (format === DRAFT_FORMAT || format.startsWith('recallweave-author-draft/'));
      const content = isDraft ? parseAuthorDraft(text) : parseDeck(text);
      pending = { content, kind: isDraft ? 'draft' : 'deck' };
      const label = content.title.trim() ? content.title : 'Untitled draft';
      const questionCount = isDraft ? content.questions.length : content.items.length;
      title.textContent = isDraft ? `Open draft “${label}”?` : `Open “${content.title}”?`;
      kindLabel.textContent = isDraft ? 'EDITABLE DRAFT · MAY BE UNFINISHED' : 'LESSON DECK · FORMAT CHECKED';
      summary.textContent = `${file.name} · ${questionCount} ${questionCount === 1 ? 'question' : 'questions'} · ${content.concepts.length} ${content.concepts.length === 1 ? 'concept' : 'concepts'}`;
      preview.hidden = false;
      replace.disabled = false;
      status.textContent = isDraft
        ? 'Editable draft ready to preview. Its lesson may still need repairs. Choose Replace draft to open it, or Keep current draft to cancel.'
        : 'Deck ready to preview. Choose Replace draft to open it, or Keep current draft to cancel.';
      title.focus();
    } catch (error) {
      if (request !== revision) return;
      keepDraft(error.message);
    }
  });

  replace.addEventListener('click', () => {
    if (!pending) return;
    const { content, kind } = pending;
    revision++;
    clearPreview();
    input.value = '';
    // The caller owns draft conversion, rendering, and focus after replacement.
    onReplace(content, kind);
  });

  clearPreview();
}
