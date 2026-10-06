import { DEFAULT_BKT, initialMastery, runLearnerSimulation, selectNextItem, updateMastery } from './knowledge.mjs';

const root = document.querySelector('#session-content');
const dataResponse = await fetch('./data/deck.json');
if (!dataResponse.ok) throw new Error('The local demo deck could not be loaded.');
const deck = await dataResponse.json();
const concepts = deck.concepts;
const mastery = initialMastery(concepts);
const asked = new Set();
const answers = [];
const progressFill = document.querySelector('#progress-fill');
const progressTrack = document.querySelector('[role="progressbar"]');
const stepLabel = document.querySelector('#step-label');
const stepCount = document.querySelector('#step-count');

function setProgress() {
  const count = answers.length;
  stepCount.textContent = `${count} / ${deck.items.length}`;
  progressFill.style.width = `${count / deck.items.length * 100}%`;
  progressTrack.setAttribute('aria-valuenow', String(count));
  stepLabel.textContent = count === deck.items.length ? 'THREAD COMPLETE' : count ? 'FOLLOW THE CONNECTION' : 'READY TO BEGIN';
}
function renderMastery() {
  const rows = concepts.map(concept => `<div class="mastery-row"><span>${conceptLabel(concept)}</span><div class="mastery-meter" aria-hidden="true"><span style="width:${Math.round(mastery[concept] * 100)}%"></span></div><output aria-label="${conceptLabel(concept)} estimated mastery ${Math.round(mastery[concept] * 100)} percent">${Math.round(mastery[concept] * 100)}%</output></div>`).join('');
  return `<div class="mastery-box"><h3>Estimated mastery · model state, not a grade</h3>${rows}</div>`;
}
function conceptLabel(concept) { return ({'photosynthesis':'Light capture','glucose':'Stored sugar','cellular-respiration':'Respiration','atp':'ATP transfer'})[concept] ?? concept; }
function renderQuestion() {
  const item = selectNextItem(deck.items, asked, mastery);
  if (!item) return renderResults();
  asked.add(item.id);
  root.innerHTML = `<article class="question-card"><div class="question-type">CONNECTION ${String(answers.length + 1).padStart(2, '0')} · ${conceptLabel(item.concept).toUpperCase()}</div><h2>${item.prompt}</h2><p class="prompt">Choose the best explanation, then connect it to the larger idea.</p><div class="choices" role="group" aria-label="Answer options">${item.options.map((option, i) => `<button class="choice" data-choice="${i}"><span class="choice-key">${String.fromCharCode(65+i)}</span>${option}</button>`).join('')}</div><div id="feedback-slot"></div>${renderMastery()}</article>`;
  root.querySelectorAll('[data-choice]').forEach(button => button.addEventListener('click', () => submitAnswer(item, Number(button.dataset.choice))));
  const first = root.querySelector('[data-choice]');
  first?.focus({preventScroll:true});
  setProgress();
}
function submitAnswer(item, choice) {
  const correct = choice === item.answer;
  answers.push({item: item.id, concept:item.concept, correct});
  mastery[item.concept] = updateMastery(mastery[item.concept] ?? DEFAULT_BKT.initial, correct);
  root.querySelectorAll('[data-choice]').forEach(button => {
    button.disabled = true;
    const selected = Number(button.dataset.choice);
    if (selected === item.answer) button.classList.add('correct');
    else if (selected === choice) button.classList.add('incorrect');
  });
  const feedback = document.querySelector('#feedback-slot');
  feedback.innerHTML = `<div class="feedback"><strong>${correct ? 'That connection holds.' : 'Here’s the correction.'}</strong> ${item.explanation}<span class="why">Try this transfer: ${item.transfer}</span></div><button class="primary-button next-button" id="next-button">${answers.length === deck.items.length ? 'See your learning trace' : 'Follow the next thread'} <span aria-hidden="true">→</span></button>`;
  feedback.querySelector('button').addEventListener('click', renderQuestion);
  const state = root.querySelector('.mastery-box');
  state.outerHTML = renderMastery();
  setProgress();
  feedback.querySelector('button').focus();
}
function renderResults() {
  const correct = answers.filter(answer => answer.correct).length;
  const trace = answers.map(answer => `<span class="trace-chip ${answer.correct ? 'is-correct' : 'needs-review'}">${answer.correct ? '✓' : '↺'} ${conceptLabel(answer.concept)}</span>`).join(' ');
  root.innerHTML = `<article class="result-card"><div class="result-mark" aria-hidden="true">⌁</div><div class="card-kicker">YOUR LEARNING TRACE</div><h2>Notice the links you built.</h2><p>You made ${correct} of ${answers.length} connections on the first try. That count is a snapshot—not a measure of your ability. Review the concept estimates and choose one connection to explain in your own words.</p>${renderMastery()}<div class="reflection"><strong>Apply it:</strong> Trace energy from sunlight to a cell doing work. Where does the form of energy change, and what molecule transfers it to cellular processes?</div><p>${trace}</p><p class="source-note"><strong>Demo deck attribution:</strong> Original question wording adapted from OpenStax, <cite>Biology 2e</cite>, Chapters 7–8, Rice University, CC BY 4.0. ${deck.attribution}</p><button class="reset-button" id="reset-button">Start a fresh local session</button></article>`;
  root.querySelector('#reset-button').addEventListener('click', () => location.reload());
  root.querySelector('h2').focus?.();
  setProgress();
}

document.querySelector('#simulation-button').addEventListener('click', () => {
  const truth = { photosynthesis:0.82, glucose:0.66, 'cellular-respiration':0.53, atp:0.74 };
  const adaptive = runLearnerSimulation(deck.items, concepts, truth, true, 41);
  const fixed = runLearnerSimulation(deck.items, concepts, truth, false, 41);
  const correctCount = run => run.trace.filter(answer => answer.correct).length;
  document.querySelector('#simulation-output').innerHTML = `<div class="simulation-result"><strong>Scripted run · not learner evidence</strong><p>One deterministic toy profile (latent concept strengths: 0.53–0.82), same seed and response model; only item order changes.</p><div class="simulation-compare"><span>Adaptive: ${correctCount(adaptive)}/${adaptive.trace.length} correct · mean estimated mastery ${Math.round(adaptive.meanEstimatedMastery * 100)}%</span><span>Fixed order: ${correctCount(fixed)}/${fixed.trace.length} correct · mean estimated mastery ${Math.round(fixed.meanEstimatedMastery * 100)}%</span></div><p>One tiny synthetic run is not a performance claim. Use the test suite for invariants; efficacy needs a larger, preregistered study.</p></div>`;
});
document.querySelector('#start-button').addEventListener('click', renderQuestion);
setProgress();
