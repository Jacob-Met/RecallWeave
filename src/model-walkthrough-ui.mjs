import { DEFAULT_BKT } from './knowledge.mjs';
import { MAX_WALKTHROUGH_RESPONSES, walkthroughParameters, createWalkthrough, walkthroughText } from './model-walkthrough.mjs';

function initializeWalkthrough() {
  const byId = id => document.getElementById(id);
  const names = ['initial', 'guess', 'slip', 'learn'];
  const percent = value => `${(value * 100).toFixed(2)}%`;
  const decimal = value => {
    if (value !== 0 && Math.abs(value) < 1e-6) return value.toExponential(6);
    if (value > 1 - 1e-6 && value < 1) return String(value);
    return value.toFixed(6);
  };
  const points = value => `${value >= 0 ? '+' : '−'}${Math.abs(value * 100).toFixed(2)} percentage points`;
  let trace = createWalkthrough([true, false]);
  let selected = 1;
  let draftChanged = false;

  function announce(message, error = false) {
    byId('action-status').textContent = message;
    byId('action-status').classList.toggle('error', error);
  }

  function readDraft() {
    const values = {};
    for (const name of names) {
      if (byId(name).value.trim() === '') throw new RangeError(`Enter a value for ${name}; blank does not mean zero.`);
      values[name] = byId(name).valueAsNumber;
    }
    return walkthroughParameters(values);
  }

  function writeDraft() {
    for (const name of names) byId(name).value = String(trace.parameters[name]);
    updateDraft();
  }

  function updateDraft() {
    try {
      const values = readDraft();
      draftChanged = names.some(name => values[name] !== trace.parameters[name]);
    } catch {
      draftChanged = true;
    }
    byId('draft-status').textContent = draftChanged
      ? 'Unapplied assumptions. Apply them before adding or editing responses. The displayed trace still uses the previous values.'
      : 'The displayed trace uses these applied assumptions.';
    byId('add-correct').disabled = draftChanged || trace.steps.length >= MAX_WALKTHROUGH_RESPONSES;
    byId('add-incorrect').disabled = draftChanged || trace.steps.length >= MAX_WALKTHROUGH_RESPONSES;
    for (const control of byId('response-history').querySelectorAll('select')) control.disabled = draftChanged;
  }

  function renderHistory() {
    const list = byId('response-history');
    list.replaceChildren();
    trace.steps.forEach((step, index) => {
      const item = document.createElement('li');
      item.classList.toggle('selected', index === selected);
      const inspect = document.createElement('button');
      inspect.type = 'button';
      inspect.className = 'history-inspect';
      inspect.dataset.inspect = String(index);
      inspect.setAttribute('aria-pressed', String(index === selected));
      inspect.setAttribute('aria-label', `Inspect response ${index + 1}, ${step.correct ? 'correct' : 'incorrect'}, from ${percent(step.prior)} to ${percent(step.next)}`);
      for (const [className, text] of [
        ['history-number', String(index + 1)],
        ['history-outcome', step.correct ? 'Correct' : 'Incorrect'],
        ['history-change', `${percent(step.prior)} → ${percent(step.next)}`]
      ]) {
        const span = document.createElement('span');
        span.className = className;
        span.textContent = text;
        inspect.append(span);
      }
      inspect.addEventListener('click', () => {
        selected = index;
        renderHistory();
        renderCalculation();
        byId('calculation-title').focus();
      });
      const edit = document.createElement('select');
      edit.dataset.edit = String(index);
      edit.setAttribute('aria-label', `Change response ${index + 1}`);
      for (const [value, label] of [['true', 'Correct'], ['false', 'Incorrect']]) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        edit.append(option);
      }
      edit.value = String(step.correct);
      edit.disabled = draftChanged;
      edit.addEventListener('change', () => {
        const responses = [...trace.responses];
        responses[index] = edit.value === 'true';
        if (replaceTrace(responses, trace.parameters, index, `Response ${index + 1} changed. Later estimates were recomputed.`)) {
          list.querySelector(`[data-edit="${index}"]`).focus();
        } else {
          edit.value = String(step.correct);
        }
      });
      item.append(inspect, edit);
      list.append(item);
    });
    byId('empty-history').hidden = trace.steps.length !== 0;
    byId('undo-response').disabled = trace.steps.length === 0;
    byId('clear-responses').disabled = trace.steps.length === 0;
    byId('response-count').textContent = `${trace.steps.length} / ${MAX_WALKTHROUGH_RESPONSES}`;
    updateDraft();
  }

  function renderCalculation() {
    const step = trace.steps[selected];
    byId('calculation-detail').hidden = !step;
    byId('selected-response').textContent = step ? `RESPONSE ${selected + 1}` : 'AWAITING A RESPONSE';
    byId('calculation-context').textContent = step
      ? `Response ${selected + 1} is hypothetical and ${step.correct ? 'correct' : 'incorrect'}. The after-learning value becomes the prior for the next response.`
      : 'With no response, there is no evidence update or learning transition to apply.';
    byId('prior-value').textContent = percent(step?.prior ?? trace.parameters.initial);
    byId('posterior-value').textContent = step ? percent(step.posterior) : '—';
    byId('next-value').textContent = step ? percent(step.next) : '—';
    byId('evidence-change').textContent = step ? points(step.evidenceChange) : 'waiting for evidence';
    byId('learning-change').textContent = step ? points(step.learningContribution + step.clippingChange) : 'waiting for a response';
    if (!step) return;
    byId('evidence-explanation').textContent = step.correct
      ? 'A correct response can come from the known state without a slip, or from the not-yet-known state through a guess. Compare their two weights.'
      : 'An incorrect response can come from the known state through a slip, or from the not-yet-known state without a successful guess. Compare their two weights.';
    byId('known-weight').textContent = `${decimal(step.prior)} × ${decimal(step.knownLikelihood)} ≈ ${decimal(step.knownContribution)}`;
    byId('unknown-weight').textContent = `${decimal(1 - step.prior)} × ${decimal(step.unknownLikelihood)} ≈ ${decimal(step.unknownContribution)}`;
    byId('response-likelihood').textContent = `${decimal(step.knownContribution)} + ${decimal(step.unknownContribution)} ≈ ${decimal(step.responseLikelihood)}`;
    byId('posterior-calculation').textContent = `${decimal(step.knownContribution)} / ${decimal(step.responseLikelihood)} ≈ ${decimal(step.posterior)}`;
    byId('learning-calculation').textContent = `${decimal(step.posterior)} + (1 − ${decimal(step.posterior)}) × ${decimal(trace.parameters.learn)} ≈ ${decimal(step.next)}`;
    byId('change-explanation').textContent = `Evidence changes the estimate by ${points(step.evidenceChange)}. The learning transition adds ${points(step.learningContribution)}${step.clippingChange ? `, then final clipping changes it by ${points(step.clippingChange)}` : ''}. The final value is the lesson model's returned estimate.`;
    byId('precision-values').textContent = [
      `Prior supplied: ${step.priorInput}`,
      `Prior after clipping to [0, 1]: ${step.prior}`,
      `Known-state weight: ${step.knownContribution}`,
      `Not-yet-known weight: ${step.unknownContribution}`,
      `Response likelihood: ${step.responseLikelihood}`,
      `Posterior: ${step.posterior}`,
      `Evidence change: ${step.evidenceChange}`,
      `Learning contribution: ${step.learningContribution}`,
      `Before final clipping: ${step.beforeFinalClipping}`,
      `Final clipping change: ${step.clippingChange}`,
      `updateMastery return: ${step.next}`
    ].join('\n');
  }

  function render() {
    renderHistory();
    renderCalculation();
    byId('final-estimate').textContent = percent(trace.finalMastery);
    byId('final-context').textContent = trace.steps.length
      ? `After all ${trace.steps.length} hypothetical ${trace.steps.length === 1 ? 'response' : 'responses'}, using the applied assumptions.`
      : 'With no responses, this is the initial assumption.';
    const sum = trace.parameters.guess + trace.parameters.slip;
    byId('assumption-warning').hidden = sum < 1;
    byId('assumption-warning').textContent = sum === 1
      ? 'With guess + slip = 1, responses do not distinguish the two states, apart from floating-point rounding. The learning transition can still change the estimate.'
      : 'With guess + slip greater than 1, a correct response favors the not-yet-known state and an incorrect response favors the known state. The reversed evidence follows from these assumptions.';
  }

  function replaceTrace(responses, parameters, inspectIndex, message) {
    try {
      const candidate = createWalkthrough(responses, parameters);
      trace = candidate;
      selected = candidate.steps.length ? Math.max(0, Math.min(inspectIndex, candidate.steps.length - 1)) : -1;
      render();
      announce(message);
      return true;
    } catch (error) {
      announce(`${error.message} The displayed trace was kept.`, true);
      return false;
    }
  }

  byId('assumptions-form').addEventListener('submit', event => {
    event.preventDefault();
    try {
      const parameters = readDraft();
      if (replaceTrace(trace.responses, parameters, selected, 'Assumptions applied to the whole hypothetical sequence.')) writeDraft();
    } catch (error) {
      announce(`${error.message} The displayed trace was kept.`, true);
    }
  });
  for (const name of names) byId(name).addEventListener('input', updateDraft);
  byId('restore-defaults').addEventListener('click', () => {
    replaceTrace(trace.responses, DEFAULT_BKT, selected, 'Illustrative defaults restored. Responses were kept and recomputed.');
    writeDraft();
  });
  for (const [id, correct] of [['add-correct', true], ['add-incorrect', false]]) {
    byId(id).addEventListener('click', () => {
      if (draftChanged) return;
      replaceTrace([...trace.responses, correct], trace.parameters, trace.steps.length,
        `Hypothetical ${correct ? 'correct' : 'incorrect'} response added.${trace.steps.length + 1 === MAX_WALKTHROUGH_RESPONSES ? ' The 24-response limit is reached; edit, undo or clear to continue.' : ''}`);
    });
  }
  byId('undo-response').addEventListener('click', () => {
    replaceTrace(trace.responses.slice(0, -1), trace.parameters, trace.steps.length - 2, 'Last response removed.');
  });
  byId('clear-responses').addEventListener('click', () => {
    replaceTrace([], trace.parameters, -1, 'Responses cleared. Applied assumptions were kept.');
  });
  byId('download-walkthrough').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([walkthroughText(trace)], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'recallweave-model-walkthrough.txt';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    announce('Downloaded the applied hypothetical walkthrough at full JavaScript precision.');
  });
  writeDraft();
  render();
  announce('Opening example: one correct response, then one incorrect response. Both are hypothetical.');

}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeWalkthrough, { once: true });
} else {
  initializeWalkthrough();
}
