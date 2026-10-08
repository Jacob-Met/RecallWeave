import { runHamming74, formatHammingRecord } from './model.mjs';

const byId = id => document.getElementById(id);
const form = byId('scenario-form');
const result = byId('result');
const pending = byId('pending');
const error = byId('input-error');
const saveRecord = byId('save-record');
const recordStatus = byId('record-status');
const courseStatus = byId('course-status');
const courseText = JSON.parse(byId('course-text').textContent);
let completed = null;

function retire(message = 'Inputs changed. Inspect the decoder again to create a current result.') {
  completed = null;
  result.hidden = true;
  pending.hidden = false;
  pending.textContent = message;
  saveRecord.disabled = true;
  error.textContent = '';
  recordStatus.textContent = '';
}

function text(id, value) {
  byId(id).textContent = String(value);
}

function word(id, value, marked = []) {
  const row = byId(id);
  row.replaceChildren();
  const marks = new Set(marked);
  for (let index = 0; index < value.length; index++) {
    const bit = document.createElement('span');
    bit.className = 'word-bit' + (marks.has(index + 1) ? ' marked' : '');
    bit.textContent = value[index];
    bit.title = 'Position ' + (index + 1) + (marks.has(index + 1) ? ', changed here' : '');
    row.append(bit);
  }
  row.setAttribute('aria-label', value + (marked.length ? '; highlighted positions ' + marked.join(', ') : ''));
}

function show(run) {
  const decoder = run.decoder;
  const truth = run.truth;
  word('sent-word', run.codeword);
  word('received-word', run.receivedWord, run.errorPositions);
  word('candidate-word', decoder.candidateWord,
    decoder.proposedPosition === null ? [] : [decoder.proposedPosition]);
  text('original-data', run.dataBits);
  text('flips-summary', run.errorPositions.length ? run.errorPositions.join(', ') : 'None');
  text('candidate-data', decoder.candidateData);
  text('syndrome-value', decoder.syndrome);
  text('syndrome-bits', decoder.syndromeBits);
  text('decoder-proposal', decoder.proposedPosition === null ?
    'Keep the received word: all three checks pass.' :
    'Assuming at most one error, flip position ' + decoder.proposedPosition + '.');
  text('decoder-limit', decoder.syndrome === 0 ?
    'Zero syndrome means consistent checks. The receiver cannot infer that no errors occurred.' :
    'The syndrome identifies the single-error hypothesis. It does not reveal the actual number of flipped bits.');
  const checkBody = byId('check-rows');
  checkBody.replaceChildren();
  for (const check of decoder.checks) {
    const row = document.createElement('tr');
    const values = [
      's' + check.parityPosition,
      check.positions.join(', '),
      check.bits.split('').join(' + ') + ' = ' + check.ones,
      check.failed ? '1 · odd · FAIL' : '0 · even · PASS'
    ];
    values.forEach((value, index) => {
      const cell = document.createElement(index === 0 ? 'th' : 'td');
      if (index === 0) cell.scope = 'row';
      cell.textContent = value;
      row.append(cell);
    });
    checkBody.append(row);
  }
  const outcomes = {
    clean: ['No error was introduced', 'In this authored scenario, the candidate equals the sent codeword. The receiver itself sees only the consistent checks.'],
    corrected: ['The single error is corrected', 'The one-error assumption holds here. The candidate equals the original codeword, including its data and parity bits.'],
    miscorrected: ['The decoder repairs the wrong word', 'More than one bit changed. The one-error rule produces another valid codeword, but it does not recover what the sender transmitted.'],
    undetected: ['The error pattern passes all checks', 'More than one bit changed and the syndrome is zero. The decoder leaves a different valid word unchanged. Only the authored simulation tells us it is wrong.']
  };
  const [title, explanation] = outcomes[truth.outcome];
  text('truth-title', title);
  text('truth-explanation', explanation);
  byId('truth-card').dataset.outcome = truth.outcome;
  text('actual-flips', truth.flipCount);
  text('assumption-status', truth.withinSingleErrorAssumption ? 'Satisfied' : 'Exceeded');
  text('recovery-status', truth.originalRecovered ? 'Yes' : 'No');
  text('codeword-differences', truth.remainingCodewordErrors);
  text('data-differences', truth.remainingDataErrors);
  text('prediction-feedback', run.prediction === null ?
    'No prediction was supplied. Try predicting a new scenario before inspecting its checks.' :
    'You predicted syndrome ' + run.prediction + '. The checks give ' + decoder.syndrome + ': ' +
    (run.predictionCorrect ? 'your prediction matches.' : 'compare the three parity sums to see why.'));
  pending.hidden = true;
  result.hidden = false;
  saveRecord.disabled = false;
}

form.addEventListener('input', () => retire());
form.addEventListener('change', () => retire());
form.addEventListener('submit', event => {
  event.preventDefault();
  retire('Inspecting the current scenario…');
  try {
    const positions = [...form.querySelectorAll('input[name="flip"]:checked')].map(input => Number(input.value));
    const prediction = byId('prediction').value === '' ? null : Number(byId('prediction').value);
    completed = runHamming74(byId('data-bits').value, positions, prediction);
    show(completed);
  } catch (caught) {
    completed = null;
    error.textContent = caught.message;
    pending.textContent = 'Correct the input, then inspect the decoder.';
    byId('data-bits').focus();
  }
});

function download(bytes, type, filename) {
  const blob = new Blob([bytes], {type});
  let url;
  let link;
  try {
    url = URL.createObjectURL(blob);
    link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.hidden = true;
    document.body.append(link);
    link.click();
  } finally {
    if (link) link.remove();
    if (url) setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

saveRecord.addEventListener('click', () => {
  if (!completed) return;
  try {
    download(formatHammingRecord(completed), 'text/plain;charset=utf-8', 'hamming-worked-record.txt');
    recordStatus.textContent = 'Record download requested. This tab cannot confirm whether your browser saved the file.';
  } catch {
    recordStatus.textContent = 'The record download could not start. Your current result is still here; try again.';
  }
});

byId('save-course').addEventListener('click', () => {
  try {
    download(courseText, 'application/json;charset=utf-8', 'hamming-codes.json');
    courseStatus.textContent = 'Course download requested. Open the saved JSON with Bring your own lesson in RecallWeave.';
  } catch {
    courseStatus.textContent = 'The course download could not start. Try again.';
  }
});

const presets = {
  single: {data: '1011', flips: [6]},
  double: {data: '0000', flips: [1, 2]},
  hidden: {data: '0000', flips: [1, 2, 3]},
  clear: {data: '0000', flips: []}
};
for (const button of document.querySelectorAll('[data-preset]')) {
  button.addEventListener('click', () => {
    const preset = presets[button.dataset.preset];
    byId('data-bits').value = preset.data;
    for (const input of form.querySelectorAll('input[name="flip"]')) {
      input.checked = preset.flips.includes(Number(input.value));
    }
    byId('prediction').value = '';
    retire('Example loaded. Make a prediction, then inspect the decoder.');
    byId('data-bits').focus();
  });
}
