import { parseMajorityLines, traceMajority } from './majority-vote.mjs';

const $ = id => document.getElementById(id);
const assets = JSON.parse($('lesson-assets').textContent);
const presets = Object.freeze({
  majority: 'cedar\ncedar\nbirch\ncedar\nbirch',
  candidate: 'red\nblue\ngreen',
  tie: 'north\nsouth\nnorth\nsouth',
  literal: 'm\nM\nm ',
  empty: ''
});
let applied = null;
let phaseIndex = 0;
const literal = value => value === null ? '— none —' : JSON.stringify(value);

function announce(text, error = false) {
  $('status').textContent = text;
  $('status').classList.toggle('error', error);
}

function clearApplied() {
  applied = null;
  phaseIndex = 0;
  $('phase-index').replaceChildren(new Option('No applied trace', ''));
  $('phase-index').disabled = true;
  $('phase-label').textContent = 'No applied trace';
  for (const id of ['first', 'previous', 'next', 'last', 'download-observation']) $(id).disabled = true;
  $('candidate').textContent = '— none —';
  $('balance').textContent = '—';
  $('verified-count').textContent = 'Not started';
  $('decision').textContent = 'Apply a sequence. A stored candidate is not a majority decision.';
  for (const id of ['sequence', 'cancellation-rows', 'verification-rows']) $(id).replaceChildren();
}

function phaseName(index, n) {
  if (n === 0) return 'Final · empty sequence · no strict majority';
  if (index < n) return 'Cancellation · ' + index + ' / ' + n;
  if (index === n) return 'Candidate proposed · verification 0 / ' + n;
  if (index === 2 * n) return 'Final · verification ' + n + ' / ' + n;
  return 'Verification · ' + (index - n) + ' / ' + n;
}

function row(body, values) {
  const tr = document.createElement('tr');
  values.forEach(value => {
    const td = document.createElement('td');
    td.textContent = String(value);
    tr.append(td);
  });
  body.append(tr);
}

function render() {
  const { trace } = applied;
  const n = trace.values.length;
  const cancel = trace.cancellation[Math.min(phaseIndex, n)];
  const verifying = phaseIndex >= n;
  const count = verifying ? trace.verification[Math.max(0, phaseIndex - n)].matches : null;
  const final = phaseIndex === 2 * n;
  $('phase-index').value = String(phaseIndex);
  $('phase-label').textContent = phaseName(phaseIndex, n);
  $('first').disabled = $('previous').disabled = phaseIndex === 0;
  $('last').disabled = $('next').disabled = final;
  $('candidate').textContent = literal(cancel.candidate);
  $('balance').textContent = String(cancel.balance);
  $('verified-count').textContent = count === null ? 'Not started' : count + ' / ' + n;
  if (final) {
    $('decision').textContent = n === 0
      ? 'No strict majority. Empty input has no proposed candidate.'
      : trace.hasMajority
        ? 'Verified strict majority: ' + literal(trace.majority) + ' occurs ' + trace.candidateCount + ' of ' + n + ' times (requires at least ' + trace.threshold + ').'
        : 'No strict majority. The proposed candidate ' + literal(trace.candidate) + ' occurs ' + trace.candidateCount + ' of ' + n + ' times (requires at least ' + trace.threshold + ').';
  } else if (verifying) {
    $('decision').textContent = 'Unverified proposal: ' + literal(trace.candidate) + '. Count the whole sequence before deciding.';
  } else {
    $('decision').textContent = cancel.balance === 0
      ? 'Cancellation in progress. Balance zero means no active residue; the stored label, if any, is inactive.'
      : 'Cancellation in progress. A positive balance is not a frequency count or a majority decision.';
  }
  $('cancellation-rows').replaceChildren();
  for (const step of trace.cancellation.slice(0, Math.min(phaseIndex, n) + 1)) {
    row($('cancellation-rows'), [step.position, literal(step.lastValue), step.action, literal(step.candidate), step.balance]);
  }
  $('verification-rows').replaceChildren();
  if (verifying) {
    for (const step of trace.verification.slice(0, Math.max(0, phaseIndex - n) + 1)) {
      row($('verification-rows'), [step.position, literal(step.lastValue), step.matched === null ? '— none —' : step.matched ? 'Yes' : 'No', step.matches]);
    }
  }
}

$('sequence-form').addEventListener('submit', event => {
  event.preventDefault();
  clearApplied();
  const rawText = $('values-input').value;
  try {
    const trace = traceMajority(parseMajorityLines(rawText));
    applied = Object.freeze({ rawText, trace });
    $('values-input').removeAttribute('aria-invalid');
    const n = trace.values.length;
    $('phase-index').replaceChildren();
    for (let i = 0; i <= 2 * n; i++) $('phase-index').append(new Option(phaseName(i, n), String(i)));
    $('phase-index').disabled = false;
    $('download-observation').disabled = false;
    for (const value of trace.values) {
      const li = document.createElement('li');
      li.textContent = literal(value);
      $('sequence').append(li);
    }
    render();
    announce('Applied ' + n + ' literal values. ' + (n === 0 ? 'Empty input has no strict majority.' : 'Begin with cancellation; verify the proposed candidate afterward.'));
  } catch (error) {
    $('values-input').setAttribute('aria-invalid', 'true');
    $('values-input').focus();
    announce(error.message, true);
  }
});

$('values-input').addEventListener('input', () => {
  clearApplied();
  $('values-input').removeAttribute('aria-invalid');
  announce('Draft changed. Apply the sequence to create a new trace.');
});
$('load-preset').addEventListener('click', () => {
  $('values-input').value = presets[$('preset-select').value];
  clearApplied();
  $('values-input').removeAttribute('aria-invalid');
  announce('Example loaded as a draft. Apply the sequence to begin.');
});
function go(index) {
  if (!applied) return;
  phaseIndex = Math.max(0, Math.min(2 * applied.trace.values.length, index));
  render();
}
$('first').addEventListener('click', () => go(0));
$('previous').addEventListener('click', () => go(phaseIndex - 1));
$('next').addEventListener('click', () => go(phaseIndex + 1));
$('last').addEventListener('click', () => { if (applied) go(2 * applied.trace.values.length); });
$('phase-index').addEventListener('change', () => go(Number($('phase-index').value)));

function download(name, type, text) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$('download-observation').addEventListener('click', () => {
  if (!applied) return;
  const observation = { schema: 'recallweave-majority-observation/1', rawText: applied.rawText, phaseIndex, trace: applied.trace };
  download('majority-vote-observation.json', 'application/json;charset=utf-8', JSON.stringify(observation, null, 2) + '\n');
});
$('download-course').addEventListener('click', () => download('majority-vote.json', 'application/json;charset=utf-8', assets.course));
$('download-guide').addEventListener('click', () => download('majority-vote.md', 'text/markdown;charset=utf-8', assets.guide));
