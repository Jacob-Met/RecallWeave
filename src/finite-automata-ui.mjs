import { ALPHABET, MAX_STATES, MAX_WORD_LENGTH, PRESETS, getPreset, validateMachine, traceWord, compareMachines } from './finite-automata.mjs';

export function mountFiniteAutomata(document, {courseText}) {
  const byId = id => document.getElementById(id);
  let trace = null;
  let comparison = null;
  const wordLabel = word => word === '' ? 'ε' : word;
  const outcome = accepted => accepted ? 'accepts' : 'rejects';
  const node = (tag, text, className) => {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
  };
  function status(id, text, error = false) {
    byId(id).textContent = text;
    byId(id).classList.toggle('error', error);
  }
  function clearTrace(text = 'Trace the current word to see each transition.') {
    trace = null;
    byId('trace-result').hidden = true;
    byId('trace-path').replaceChildren();
    byId('trace-rows').replaceChildren();
    byId('download-trace').disabled = true;
    status('trace-status', text);
  }
  function clearComparison(text = 'Compare every reachable pair of states, including the initial pair.') {
    comparison = null;
    byId('comparison-result').hidden = true;
    byId('pair-rows').replaceChildren();
    byId('download-comparison').disabled = true;
    byId('use-witness').hidden = true;
    status('comparison-status', text);
  }
  function machineChanged() {
    clearTrace('Machine changed. Trace the current word again.');
    clearComparison('Machine changed. Compare the current tables again.');
    byId('machine-description').textContent = 'Your edited machine. The transition table and acceptance flags below define its behavior.';
  }
  function options(select, count, selected) {
    select.replaceChildren(...Array.from({length: count}, (_, index) => {
      const option = node('option', 'q' + index);
      option.value = String(index);
      option.selected = index === selected;
      return option;
    }));
  }
  function showMachine(machine, description) {
    const value = validateMachine(machine);
    const count = value.transitions.length;
    byId('machine-name').value = value.name;
    byId('state-count').value = String(count);
    options(byId('initial-state'), count, value.initial);
    byId('machine-description').textContent = description;
    byId('machine-rows').replaceChildren(...value.transitions.map((row, index) => {
      const tr = node('tr');
      const label = node('th', 'q' + index);
      label.scope = 'row';
      const acceptCell = node('td');
      const acceptLabel = node('label', undefined, 'accept-label');
      const check = node('input');
      check.type = 'checkbox';
      check.id = 'accept-' + index;
      check.checked = value.accepting[index];
      check.setAttribute('aria-label', 'q' + index + ' accepting');
      acceptLabel.append(check, node('span', 'Accepting'));
      acceptCell.append(acceptLabel);
      tr.append(label, acceptCell);
      for (let symbol = 0; symbol < 2; symbol++) {
        const cell = node('td');
        const select = node('select');
        select.id = 'transition-' + index + '-' + symbol;
        select.setAttribute('aria-label', 'From q' + index + ' on ' + symbol);
        options(select, count, row[symbol]);
        cell.append(select);
        tr.append(cell);
      }
      return tr;
    }));
    clearTrace();
    clearComparison();
    status('machine-status', count + ' states. Every row has one destination for each binary symbol.');
  }
  function readIndex(id) {
    const value = byId(id).value;
    if (!/^[0-5]$/.test(value)) throw new Error('Choose an existing state in every table cell.');
    return Number(value);
  }
  function readMachine() {
    const count = byId('machine-rows').children.length;
    return validateMachine({
      name: byId('machine-name').value,
      initial: readIndex('initial-state'),
      accepting: Array.from({length: count}, (_, index) => byId('accept-' + index).checked),
      transitions: Array.from({length: count}, (_, index) => [
        readIndex('transition-' + index + '-0'), readIndex('transition-' + index + '-1')
      ])
    });
  }
  function showReference() {
    const preset = getPreset(byId('reference-preset').value);
    byId('reference-description').textContent = preset.description;
    byId('reference-initial').textContent = 'Starts in q' + preset.machine.initial + '.';
    byId('reference-rows').replaceChildren(...preset.machine.transitions.map((row, index) => {
      const tr = node('tr');
      const th = node('th', 'q' + index);
      th.scope = 'row';
      tr.append(th, node('td', preset.machine.accepting[index] ? 'Yes' : 'No'), node('td', 'q' + row[0]), node('td', 'q' + row[1]));
      return tr;
    }));
    clearComparison('Reference changed. Compare it with the current edited machine.');
  }
  function runTrace() {
    clearTrace();
    try {
      trace = traceWord(readMachine(), byId('word').value);
      const display = wordLabel(trace.word);
      byId('trace-heading').textContent = trace.accepted ? 'Accepted' : 'Rejected';
      byId('trace-result').dataset.outcome = trace.accepted ? 'accepted' : 'rejected';
      byId('trace-summary').textContent = trace.machine.name + ' ' + outcome(trace.accepted) + ' ' + display +
        '. After ' + trace.word.length + ' symbols, the run ends in q' + trace.finalState + '.';
      byId('trace-path').replaceChildren(...trace.states.map((state, index) => {
        const part = node('li', undefined, 'state-step');
        part.append(node('small', index ? 'read ' + trace.word[index - 1] : 'start · ε'), node('strong', 'q' + state));
        if (index === trace.states.length - 1) part.classList.add('final-state');
        return part;
      }));
      const initial = node('tr');
      initial.append(node('td', '0'), node('td', 'ε · no symbol'), node('td', '—'), node('td', 'q' + trace.machine.initial),
        node('td', trace.machine.accepting[trace.machine.initial] ? 'Yes' : 'No'));
      byId('trace-rows').append(initial, ...trace.steps.map(step => {
        const row = node('tr');
        row.append(node('td', String(step.position)), node('td', step.symbol), node('td', 'q' + step.from),
          node('td', 'q' + step.to), node('td', step.accepting ? 'Yes' : 'No'));
        return row;
      }));
      byId('trace-result').hidden = false;
      byId('download-trace').disabled = false;
      status('trace-status', 'Current word traced. Only the final state decides acceptance.');
    } catch (error) {
      clearTrace();
      status('trace-status', error.message, true);
    }
  }
  function runComparison() {
    clearComparison();
    try {
      comparison = compareMachines(readMachine(), getPreset(byId('reference-preset').value).machine);
      byId('comparison-heading').textContent = comparison.equivalent ? 'Equivalent for every binary word' : 'Different languages';
      byId('comparison-result').dataset.outcome = comparison.equivalent ? 'equivalent' : 'different';
      const checked = comparison.pairs.length;
      if (comparison.equivalent) {
        byId('comparison-summary').textContent = 'All ' + checked + ' reachable state pairs agree on acceptance. Every finite binary word reaches one of these pairs.';
        byId('witness-line').hidden = true;
      } else {
        byId('witness-line').hidden = false;
        byId('witness').textContent = wordLabel(comparison.witness);
        byId('witness-length').textContent = String(comparison.witness.length);
        byId('comparison-summary').textContent = comparison.left.name + ' ' + outcome(comparison.witnessTraces.left.accepted) +
          ' this word; ' + comparison.right.name + ' ' + outcome(comparison.witnessTraces.right.accepted) +
          ' it. Breadth-first order rules out a shorter witness; 0 comes before 1 when shortest words tie.';
        byId('use-witness').hidden = false;
      }
      byId('pair-count').textContent = 'Inspect ' + checked + ' checked pairs (at most ' + comparison.maxPairs + ' possible)';
      byId('pair-rows').replaceChildren(...comparison.pairs.map(pair => {
        const row = node('tr');
        row.append(node('td', wordLabel(pair.word)), node('td', 'q' + pair.left), node('td', 'q' + pair.right),
          node('td', pair.leftAccepting === pair.rightAccepting ? 'Agree' : 'Disagree'));
        return row;
      }));
      byId('comparison-result').hidden = false;
      byId('download-comparison').disabled = false;
      status('comparison-status', comparison.equivalent ? 'Exact search complete; no distinguishing word exists.' : 'Exact search found a shortest distinguishing word.');
    } catch (error) {
      clearComparison();
      status('comparison-status', error.message, true);
    }
  }
  function download(filename, text, statusId) {
    let url;
    try {
      url = URL.createObjectURL(new Blob([text], {type: 'application/json;charset=utf-8'}));
      const link = node('a');
      link.href = url;
      link.download = filename;
      document.body.append(link);
      try { link.click(); } finally { link.remove(); }
      status(statusId, 'Download requested. Check your browser’s downloads for ' + filename + '.');
    } catch {
      status(statusId, 'The download could not be prepared. Your current setup is still here; try again.', true);
    } finally {
      if (url) setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
  }
  for (const id of ['machine-preset', 'reference-preset']) {
    byId(id).replaceChildren(...PRESETS.map(preset => {
      const option = node('option', preset.title);
      option.value = preset.id;
      return option;
    }));
  }
  byId('state-count').replaceChildren(...Array.from({length: MAX_STATES}, (_, index) => {
    const option = node('option', String(index + 1));
    option.value = String(index + 1);
    return option;
  }));
  byId('load-preset').addEventListener('click', () => {
    const preset = getPreset(byId('machine-preset').value);
    showMachine(preset.machine, preset.description);
  });
  byId('new-machine').addEventListener('click', () => {
    const count = Number(byId('state-count').value);
    if (!Number.isInteger(count) || count < 1 || count > MAX_STATES) {
      status('machine-status', 'Choose 1–6 states for a blank machine.', true);
      return;
    }
    showMachine({name: 'My ' + count + '-state machine', initial: 0,
      accepting: Array(count).fill(false),
      transitions: Array.from({length: count}, (_, index) => [index, index])
    }, 'Blank machine: no states accept; both symbols loop at each state. Edit the table to give it a language.');
  });
  byId('machine-editor').addEventListener('input', machineChanged);
  byId('machine-editor').addEventListener('change', machineChanged);
  byId('word').addEventListener('input', () => clearTrace('Word changed. Trace this input again.'));
  byId('empty-word').addEventListener('click', () => {
    byId('word').value = '';
    runTrace();
  });
  byId('trace-word').addEventListener('click', runTrace);
  byId('word-form').addEventListener('submit', event => {event.preventDefault(); runTrace();});
  byId('reference-preset').addEventListener('change', showReference);
  byId('compare-machines').addEventListener('click', runComparison);
  byId('use-witness').addEventListener('click', () => {
    if (!comparison || comparison.equivalent) return;
    byId('word').value = comparison.witness;
    runTrace();
    byId('trace-heading').focus();
  });
  byId('download-trace').addEventListener('click', () => {
    if (trace) download('recallweave-finite-automata-trace.json',
      JSON.stringify({format: 'recallweave-finite-automata-trace/1', alphabet: ALPHABET, trace}, null, 2) + '\n', 'trace-status');
  });
  byId('download-comparison').addEventListener('click', () => {
    if (comparison) download('recallweave-finite-automata-comparison.json',
      JSON.stringify({format: 'recallweave-finite-automata-comparison/1', alphabet: ALPHABET, comparison}, null, 2) + '\n', 'comparison-status');
  });
  byId('download-course').addEventListener('click', () =>
    download('recallweave-finite-automata-course.json', courseText, 'course-status'));
  byId('word-limit').textContent = String(MAX_WORD_LENGTH);
  showMachine(PRESETS[0].machine, PRESETS[0].description);
  showReference();
}
