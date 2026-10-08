import { DEFAULT_BKT } from './knowledge.mjs';
import { MAX_DECK_BYTES, parseDeck } from './deck.mjs';
import { createExperiment, inspectExperiment, restartExperiment, rewindExperiment, serializeExperiment, takeSyntheticStep } from './selection-lab.mjs';

export function mountSelectionLab(doc, bundledSource) {
  const get = id => doc.getElementById(id);
  const make = (tag, text, className) => {
    const node = doc.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const shown = value => Number(value.toPrecision(6)).toString();
  const courseCount = deck => deck.items.length + (deck.items.length === 1 ? " question" : " questions") +
    " · " + deck.concepts.length + (deck.concepts.length === 1 ? " concept" : " concepts");
  const numeric = value => {
    const node = make('span', shown(value), 'number');
    node.title = String(value);
    return node;
  };
  let experiment = createExperiment(bundledSource);
  let pendingDeck = null;
  let readVersion = 0;
  let startingDirty = false;

  function announce(message, error = false) {
    get('status').textContent = message;
    get('status').classList.toggle('error', error);
  }
  function cancelPending() {
    readVersion += 1;
    pendingDeck = null;
    get('file-preview').hidden = true;
    get('deck-file').value = '';
  }
  function fillStarting() {
    const fields = experiment.deck.concepts.map((concept, index) => {
      const field = make('div', undefined, 'probability-field');
      const label = make('label', concept);
      label.htmlFor = 'starting-' + index;
      const input = make('input');
      input.id = label.htmlFor;
      input.type = 'number';
      input.min = '0';
      input.max = '1';
      input.step = 'any';
      input.required = true;
      input.inputMode = 'decimal';
      input.setAttribute('data-start-concept', concept);
      input.setAttribute('aria-describedby', 'starting-help');
      input.value = String(experiment.starting[concept]);
      field.append(label, input);
      return field;
    });
    get('starting-fields').replaceChildren(...fields);
  }
  function showCurrentMastery(view) {
    get('current-masteries').replaceChildren(...experiment.deck.concepts.map(concept => {
      const row = make('div', undefined, 'mastery-row');
      const term = make('dt', concept);
      const value = make('dd');
      value.append(numeric(view.mastery[concept]));
      const track = make('span', undefined, 'probability-track');
      track.setAttribute('aria-hidden', 'true');
      const fill = make('span');
      fill.style.width = String(view.mastery[concept] * 100) + '%';
      track.append(fill);
      value.append(track);
      row.append(term, value);
      return row;
    }));
  }
  function render() {
    const view = inspectExperiment(experiment);
    const selected = experiment.deck.items.find(item => item.id === view.selectedQuestionId);
    get('active-title').textContent = experiment.deck.title;
    get('active-attribution').textContent = experiment.deck.attribution;
    get('active-license').textContent = experiment.deck.license;
    get('active-count').textContent = courseCount(experiment.deck);
    get('path-count').textContent = experiment.steps.length + ' of ' + experiment.deck.items.length + ' synthetic responses';
    get('experiment-content').hidden = startingDirty;
    get('starting-warning').hidden = !startingDirty;
    get('apply-start').disabled = !startingDirty;
    get('discard-start').disabled = !startingDirty;
    get('download-experiment').disabled = startingDirty;
    get('undo-step').disabled = startingDirty || experiment.steps.length === 0;
    get('restart-experiment').disabled = startingDirty;
    get('simulate-correct').disabled = startingDirty || !selected;
    get('simulate-incorrect').disabled = startingDirty || !selected;
    get('selected-id').textContent = selected?.id ?? 'Complete';
    get('selected-concept').textContent = selected?.concept ?? 'No unanswered questions';
    get('selected-prompt').textContent = selected?.prompt ?? 'Every question has a hypothetical response. Move back one step or restart from the same starting assumptions.';
    get('question-content').hidden = !selected;
    get('branch-grid').hidden = !selected;
    if (selected) {
      get('question-options').replaceChildren(...selected.options.map((option, index) => {
        const row = make('li', option);
        if (index === selected.answer) {
          const mark = make('strong', ' — authored correct option');
          row.append(mark);
        }
        return row;
      }));
      get('question-explanation').textContent = selected.explanation;
      get('question-transfer').textContent = selected.transfer;
      get('question-prerequisites').textContent = selected.prerequisites.length ? selected.prerequisites.join(' · ') : 'None declared';
      for (const branch of view.branches) {
        const name = branch.syntheticCorrect ? 'correct' : 'incorrect';
        get(name + '-after').textContent = shown(branch.after);
        get(name + '-after').title = String(branch.after);
        get(name + '-next').textContent = branch.nextQuestionId ?? 'Complete';
      }
    }
    showCurrentMastery(view);
    const rows = view.candidates.map(candidate => {
      const row = make('tr');
      row.setAttribute('data-candidate-id', candidate.id);
      row.classList.toggle('native-choice', candidate.selected);
      const id = make('th', candidate.id);
      id.scope = 'row';
      if (candidate.selected) id.append(make('span', 'Chosen', 'choice-tag'));
      row.append(id, make('td', candidate.concept));
      for (const key of ['prior', 'informationGainBits']) {
        const cell = make('td');
        cell.append(numeric(candidate[key]));
        row.append(cell);
      }
      row.append(make('td', String(candidate.downstreamCount)));
      for (const key of ['prerequisiteRepair', 'totalScore']) {
        const cell = make('td');
        cell.append(numeric(candidate[key]));
        row.append(cell);
      }
      return row;
    });
    if (!rows.length) {
      const row = make('tr');
      const cell = make('td', 'No unanswered candidates remain.');
      cell.colSpan = 7;
      row.append(cell);
      rows.push(row);
    }
    get('candidates-tbody').replaceChildren(...rows);
    const history = experiment.steps.map(step => {
      const row = make('tr');
      row.append(make('td', String(step.number)), make('th', step.questionId), make('td', step.concept),
        make('td', step.syntheticCorrect ? 'Assume correct' : 'Assume incorrect'));
      for (const key of ['prior', 'after']) {
        const cell = make('td');
        cell.append(numeric(step[key]));
        row.append(cell);
      }
      row.append(make('td', step.nextQuestionId ?? 'Complete'));
      return row;
    });
    if (!history.length) {
      const row = make('tr');
      const cell = make('td', 'No response has been simulated. Your current report contains only the starting assumptions and next-question inspection.');
      cell.colSpan = 7;
      row.append(cell);
      history.push(row);
    }
    get('history-tbody').replaceChildren(...history);
    get('full-precision').textContent = JSON.stringify({
      starting: experiment.starting, current: view.mastery,
      selectedQuestionId: view.selectedQuestionId, branches: view.branches,
      candidates: view.candidates, steps: experiment.steps
    }, null, 2);
  }
  function replaceExperiment(next, message) {
    cancelPending();
    experiment = next;
    startingDirty = false;
    get('starting-error').textContent = '';
    fillStarting();
    render();
    announce(message);
  }
  function act(operation, message) {
    if (startingDirty) return;
    try {
      const next = operation(experiment);
      cancelPending();
      experiment = next;
      render();
      announce(message);
      get('selected-heading').focus();
    } catch (error) {
      announce(error.message, true);
    }
  }

  get('starting-form').addEventListener('input', event => {
    if (!event.target.matches('[data-start-concept]')) return;
    cancelPending();
    startingDirty = true;
    get('starting-error').textContent = '';
    render();
    announce('Starting assumptions have edits. Apply them to begin a new synthetic path, or discard the edits.');
  });
  get('starting-form').addEventListener('submit', event => {
    event.preventDefault();
    if (!startingDirty) return;
    try {
      const values = Object.fromEntries([...get('starting-fields').querySelectorAll('[data-start-concept]')].map(input => {
        if (input.value.trim() === '' || !Number.isFinite(input.valueAsNumber)) {
          throw new RangeError('Enter a number from 0 to 1 for every concept.');
        }
        return [input.getAttribute('data-start-concept'), input.valueAsNumber];
      }));
      replaceExperiment(createExperiment(experiment.deck, values), 'Applied starting assumptions. A fresh synthetic path is ready.');
    } catch (error) {
      get('starting-error').textContent = error.message;
      announce(error.message, true);
    }
  });
  get('discard-start').addEventListener('click', () => {
    cancelPending();
    startingDirty = false;
    get('starting-error').textContent = '';
    fillStarting();
    render();
    announce('Starting edits discarded. The current synthetic path is unchanged.');
  });
  get('default-start').addEventListener('click', () =>
    replaceExperiment(createExperiment(experiment.deck), 'Started a fresh synthetic path from the published default probabilities.'));
  get('simulate-correct').addEventListener('click', () =>
    act(state => takeSyntheticStep(state, true), 'Added one explicitly hypothetical correct response.'));
  get('simulate-incorrect').addEventListener('click', () =>
    act(state => takeSyntheticStep(state, false), 'Added one explicitly hypothetical incorrect response.'));
  get('undo-step').addEventListener('click', () =>
    act(rewindExperiment, 'Moved back one synthetic step. A different response now starts a different continuation.'));
  get('restart-experiment').addEventListener('click', () =>
    act(restartExperiment, 'Restarted with the same checked course and applied starting assumptions.'));

  get('deck-file').addEventListener('change', async () => {
    const file = get('deck-file').files?.[0];
    cancelPending();
    const version = readVersion;
    if (!file) {
      announce('File selection cancelled. The current experiment is unchanged.');
      return;
    }
    announce('Reading ' + file.name + ' for preview…');
    try {
      if (file.size > MAX_DECK_BYTES) throw new RangeError('Choose a JSON deck no larger than 256 KiB.');
      const text = await file.text();
      if (version !== readVersion) return;
      const deck = parseDeck(text);
      pendingDeck = { deck, version };
      get('preview-name').textContent = file.name;
      get('preview-title').textContent = deck.title;
      get('preview-count').textContent = courseCount(deck);
      get('preview-attribution').textContent = deck.attribution;
      get('preview-license').textContent = deck.license;
      get('file-preview').hidden = false;
      announce('Preview ready. Use this deck explicitly to replace the current experiment.');
    } catch (error) {
      if (version === readVersion) announce(error.message, true);
    }
  });
  get('deck-file').addEventListener('cancel', () => {
    cancelPending();
    announce('File selection cancelled. The current experiment is unchanged.');
  });
  get('cancel-deck').addEventListener('click', () => {
    cancelPending();
    announce('Preview cancelled. The current experiment is unchanged.');
  });
  get('use-deck').addEventListener('click', () => {
    if (!pendingDeck || pendingDeck.version !== readVersion) return;
    replaceExperiment(createExperiment(pendingDeck.deck), 'Using the selected checked deck with fresh default starting assumptions.');
  });
  get('use-bundled').addEventListener('click', () => {
    cancelPending();
    const deck = createExperiment(bundledSource).deck;
    pendingDeck = { deck, version: readVersion };
    get('preview-name').textContent = 'Bundled course';
    get('preview-title').textContent = deck.title;
    get('preview-count').textContent = courseCount(deck);
    get('preview-attribution').textContent = deck.attribution;
    get('preview-license').textContent = deck.license;
    get('file-preview').hidden = false;
    announce('Bundled course preview ready. Use this deck explicitly to start a fresh experiment.');
  });
  get('download-experiment').addEventListener('click', () => {
    if (startingDirty) return;
    try {
      const text = serializeExperiment(experiment);
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json;charset=utf-8' }));
      const link = make('a');
      link.href = url;
      link.download = 'recallweave-selection-experiment.json';
      doc.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      announce('Downloaded the current synthetic experiment. This report does not restore learner progress or reopen in the lab.');
    } catch (error) {
      announce(error.message, true);
    }
  });

  get('model-parameters').textContent = 'Initial ' + DEFAULT_BKT.initial + ' · learning transition ' + DEFAULT_BKT.learn +
    ' · guess ' + DEFAULT_BKT.guess + ' · slip ' + DEFAULT_BKT.slip;
  fillStarting();
  render();
  announce('Ready with the bundled course. Every response in this lab is hypothetical.');
}
