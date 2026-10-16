import { MAX_DECK_BYTES, parseDeck, serializeDeck } from './deck.mjs';

/** Stage a local file without touching the current learning session until Start. */
export function mountDeckPicker(element, bundledDeck, onStart) {
  const input = element.querySelector('#deck-file');
  const status = element.querySelector('#deck-status');
  const preview = element.querySelector('#deck-preview');
  let revision = 0;
  let pending = null;

  function message(text, error = false) {
    status.textContent = text;
    status.classList.toggle('deck-error', error);
  }
  function clearPreview() {
    pending = null;
    preview.replaceChildren();
    preview.hidden = true;
  }
  function showPreview(deck, source) {
    pending = deck;
    preview.hidden = false;
    preview.innerHTML = '<h3 id="deck-preview-title" tabindex="-1"></h3><p class="deck-preview-count"></p><p class="deck-preview-attribution"></p><p class="deck-preview-license"></p><details class="deck-questions"><summary>Preview question prompts</summary><ol></ol></details><p class="deck-replace-note">Starting this deck replaces the current session and its practice answers. Your file stays on this device.</p><div class="deck-actions"><button class="primary-button" id="start-deck">Start this deck</button><button class="reset-button" id="cancel-deck">Cancel preview</button></div>';
    preview.querySelector('h3').textContent = deck.title;
    preview.querySelector('.deck-preview-count').textContent = `${source} · ${deck.items.length} questions · ${deck.concepts.length} concepts`;
    preview.querySelector('.deck-preview-attribution').textContent = `Attribution supplied in the deck: ${deck.attribution}`;
    preview.querySelector('.deck-preview-license').textContent = `License supplied in the deck: ${deck.license}`;
    const list = preview.querySelector('ol');
    for (const item of deck.items) {
      const row = document.createElement('li');
      const prompt = document.createElement('strong');
      prompt.textContent = item.prompt;
      const concept = document.createElement('p');
      concept.textContent = `${item.concept} · ${item.prerequisites.length ? `Prerequisites: ${item.prerequisites.join(', ')}` : 'No prerequisites'}`;
      row.append(prompt, concept);
      list.append(row);
    }
    preview.querySelector('#cancel-deck').addEventListener('click', () => {
      revision++;
      clearPreview();
      input.value = '';
      message('Preview cancelled. Your current session is unchanged.');
      input.focus();
    });
    preview.querySelector('#start-deck').addEventListener('click', () => {
      if (pending !== deck) return;
      const selected = deck;
      revision++;
      clearPreview();
      input.value = '';
      onStart(selected);
      message(`Started “${selected.title}”. This lesson stays in this tab until you reload or choose another deck.`);
    });
    message('Deck ready to preview. Your current session continues until you choose Start this deck.');
    preview.querySelector('h3').focus();
  }

  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    const request = ++revision;
    clearPreview();
    message('Reading the local deck…');
    try {
      if (file.size > MAX_DECK_BYTES) throw new Error('Choose a JSON deck no larger than 256 KiB.');
      let text;
      try { text = await file.text(); }
      catch { throw new Error('The file could not be read. Choose it again.'); }
      if (request !== revision) return;
      showPreview(parseDeck(text), file.name);
    } catch (error) {
      if (request !== revision) return;
      clearPreview();
      message(`${error.message} Your current session is unchanged.`, true);
      input.value = '';
      status.focus();
    }
  });
  element.querySelector('#use-bundled-deck').addEventListener('click', () => {
    revision++;
    showPreview(bundledDeck, 'Bundled example');
  });
  element.querySelector('#download-deck').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([serializeDeck(bundledDeck)], {type: 'application/json'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'recallweave-example-deck.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    message('Example deck downloaded. Edit a copy, then choose it here to preview it.');
  });
}
