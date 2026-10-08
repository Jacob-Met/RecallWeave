import { MAX_DECK_BYTES, parseDeck } from './deck.mjs';

/** Stage a local deck; the editor changes only after explicit replacement. */
export function mountAuthorDeckLoader(root, onReplace) {
  const ids = ['open-deck-button', 'open-deck', 'author-status', 'open-preview',
    'open-preview-title', 'open-preview-summary', 'replace-draft', 'cancel-open'];
  const elements = ids.map(id => {
    const element = root.querySelector(`#${id}`);
    if (!element) throw new Error(`The deck loader needs #${id}.`);
    return element;
  });
  const [open, input, status, preview, title, summary, replace, cancel] = elements;
  let revision = 0;
  let pending = null;

  function clearPreview() {
    pending = null;
    preview.hidden = true;
    replace.disabled = true;
    title.textContent = 'Open this deck?';
    summary.textContent = '';
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
    status.textContent = 'Choose a local deck to preview. Your current draft is unchanged.';
    input.click();
  });

  input.addEventListener('cancel', () => keepDraft('No new file was chosen.'));
  cancel.addEventListener('click', () => keepDraft('The deck preview was cancelled.'));

  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) {
      keepDraft('No new file was chosen.');
      return;
    }
    const request = ++revision;
    clearPreview();
    status.textContent = 'Reading the local deck… Your current draft is unchanged.';
    try {
      if (file.size > MAX_DECK_BYTES) throw new Error('Choose a JSON deck no larger than 256 KiB.');
      let text;
      try { text = await file.text(); }
      catch { throw new Error('The file could not be read. Choose it again.'); }
      if (request !== revision) return;
      const deck = parseDeck(text);
      pending = deck;
      title.textContent = `Open “${deck.title}”?`;
      summary.textContent = `${file.name} · ${deck.items.length} ${deck.items.length === 1 ? 'question' : 'questions'} · ${deck.concepts.length} ${deck.concepts.length === 1 ? 'concept' : 'concepts'}`;
      preview.hidden = false;
      replace.disabled = false;
      status.textContent = 'Deck ready to preview. Choose Replace draft to open it, or Keep current draft to cancel.';
      title.focus();
    } catch (error) {
      if (request !== revision) return;
      keepDraft(error.message);
    }
  });

  replace.addEventListener('click', () => {
    if (!pending) return;
    const deck = pending;
    revision++;
    clearPreview();
    input.value = '';
    // The caller owns draft conversion, rendering, and focus after replacement.
    onReplace(deck);
  });

  clearPreview();
}
