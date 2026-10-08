import { DEFAULT_BKT, initialMastery, runLearnerSimulation, selectNextItem, updateMastery } from './knowledge.mjs';
import { answerPractice, beginPractice, createReview, currentPracticeItem } from './review.mjs';
import { createStudyNotes } from './session-export.mjs';

const root = document.querySelector('#session-content');
const dataResponse = await fetch('./data/deck.json');
if (!dataResponse.ok) throw new Error('The local demo deck could not be loaded.');
const deck = await dataResponse.json();
const concepts = deck.concepts;
const mastery = initialMastery(concepts);
const asked = new Set();
const answers = [];
let review = null;
let practice = null;
let inPractice = false;
const progressFill = document.querySelector('#progress-fill');
const progressTrack = document.querySelector('[role="progressbar"]');
const stepLabel = document.querySelector('#step-label');
const stepCount = document.querySelector('#step-count');

function setProgress() {
  const count = inPractice ? practice.answers.length : answers.length;
  const total = inPractice ? practice.items.length : deck.items.length;
  stepCount.textContent = `${count} / ${total}`;
  progressFill.style.width = `${total ? count / total * 100 : 0}%`;
  progressTrack.setAttribute('aria-label', inPractice ? 'Practice progress' : 'Lesson progress');
  progressTrack.setAttribute('aria-valuemax', String(total));
  progressTrack.setAttribute('aria-valuenow', String(count));
  stepLabel.textContent = inPractice
    ? (count === total ? 'PRACTICE COMPLETE' : 'PRACTICE ROUND')
    : count === total ? 'THREAD COMPLETE' : count ? 'FOLLOW THE CONNECTION' : 'READY TO BEGIN';
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
  if (answers.some(answer => answer.item === item.id)) return;
  const correct = choice === item.answer;
  answers.push(Object.freeze({item: item.id, concept:item.concept, choice, correct}));
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
  inPractice = false;
  review ??= createReview(deck.items, answers);
  const correct = answers.filter(answer => answer.correct).length;
  root.innerHTML = `<article class="result-card"><div class="result-mark" aria-hidden="true">⌁</div><div class="card-kicker">YOUR LEARNING TRACE</div><h2 tabindex="-1">Notice the links you built.</h2><p id="first-try-summary">You made ${correct} of ${answers.length} connections on the first try. That count is a snapshot—not a measure of your ability. Review the concept estimates and choose one connection to explain in your own words.</p>${renderMastery()}${renderPracticeSummary()}<section class="review-list" aria-labelledby="review-title"><h3 id="review-title">Review the connections</h3><p>Open a question to see your first answer, the explanation, and an idea to apply.</p>${review.map(renderReviewItem).join('')}</section><div class="reflection"><strong>Apply it:</strong> Trace energy from sunlight to a cell doing work. Where does the form of energy change, and what molecule transfers it to cellular processes?</div><p class="source-note"><strong>Demo deck attribution:</strong> Original question wording adapted from OpenStax, <cite>Biology 2e</cite>, Chapters 7–8, Rice University, CC BY 4.0. ${deck.attribution}</p><button class="reset-button" id="reset-button">Start a fresh local session</button></article>`;
  const resetButton = root.querySelector('#reset-button');
  resetButton.insertAdjacentHTML('beforebegin', '<section class="practice-summary" aria-labelledby="save-notes-title"><h3 id="save-notes-title">Keep these connections</h3><p>Save your questions, first answers, explanations, and any practice answers as a text file.</p><button class="reset-button" id="save-notes-button" aria-describedby="save-notes-status">Download study notes (.txt)</button><p id="save-notes-status" role="status">Your session stays in this tab until you refresh. Download notes to keep a copy.</p></section>');
  root.querySelector('#save-notes-button').addEventListener('click', downloadStudyNotes);
  resetButton.addEventListener('click', () => location.reload());
  root.querySelector('#practice-button')?.addEventListener('click', () => {
    practice ??= beginPractice(review);
    inPractice = true;
    renderPracticeQuestion();
  });
  setProgress();
  root.querySelector('h2').focus();
}

function downloadStudyNotes() {
  const status = root.querySelector('#save-notes-status');
  let url;
  try {
    const notes = createStudyNotes({deck, review, mastery, practice, conceptLabel});
    url = URL.createObjectURL(new Blob([notes.text], {type: notes.mediaType}));
    const link = document.createElement('a');
    link.href = url;
    link.download = notes.filename;
    document.body.append(link);
    try { link.click(); } finally { link.remove(); }
    status.textContent = 'Download requested. Check your browser’s downloads for the study notes. Your session is still here.';
  } catch {
    status.textContent = 'The notes could not be prepared. Your answers are still available in this learning trace; try the download again.';
  } finally {
    if (url) setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]);
}

function renderReviewItem(item, index) {
  const retry = practice?.answers.find(answer => answer.item === item.id);
  const practiceAnswer = retry
    ? `<div class="review-practice-answer"><strong>Practice answer · ${retry.correct ? 'correct on retry' : 'keep reviewing'}</strong><p>${escapeHtml(item.options[retry.choice])}</p></div>`
    : '';
  return `<details class="review-item"><summary><span class="review-label">${String(index + 1).padStart(2, '0')} · ${escapeHtml(conceptLabel(item.concept))}</span><span class="review-status ${item.correct ? 'is-correct' : 'needs-review'}">${item.correct ? 'Correct' : 'Needs review'} · first try</span><span class="review-prompt">${escapeHtml(item.prompt)}</span></summary><div class="review-body"><dl class="review-answers"><div><dt>Your first answer</dt><dd>${escapeHtml(item.options[item.choice])}</dd></div><div><dt>Correct answer</dt><dd>${escapeHtml(item.options[item.answer])}</dd></div></dl><p>${escapeHtml(item.explanation)}</p><p class="review-transfer"><strong>Apply the idea:</strong> ${escapeHtml(item.transfer)}</p>${practiceAnswer}</div></details>`;
}

function renderPracticeSummary() {
  const missed = review.filter(item => !item.correct).length;
  if (!missed) return '<section class="practice-summary"><h3>Every connection held on the first try.</h3><p>Revisit any explanation below, then try applying the energy pathway in your own words.</p></section>';
  const total = practice?.items.length ?? missed;
  const count = practice?.answers.length ?? 0;
  const complete = practice && count === total;
  const status = complete
    ? `You answered ${practice.answers.filter(answer => answer.correct).length} of ${total} correctly on retry.`
    : practice ? `Practice paused: ${count} of ${total} answered. Resume with the next unanswered prompt.`
    : `Try ${missed === 1 ? 'the missed connection' : `each of the ${missed} missed connections`} once more.`;
  const button = complete ? '' : `<button class="primary-button" id="practice-button">${practice ? 'Resume practice' : `Practice ${missed} missed ${missed === 1 ? 'connection' : 'connections'}`} <span aria-hidden="true">→</span></button>`;
  return `<section class="practice-summary" aria-labelledby="practice-title"><h3 id="practice-title">${complete ? 'Practice complete' : 'A second pass'}</h3><p id="practice-status">${status}</p><p class="practice-note">You have seen these explanations. Practice is for recall; your first answers and model estimates stay as they were.</p>${button}</section>`;
}

function renderPracticeQuestion() {
  const item = currentPracticeItem(practice);
  if (!item) return renderResults();
  const number = practice.answers.length + 1;
  root.innerHTML = `<article class="question-card practice-card"><div class="question-type">PRACTICE ${number} OF ${practice.items.length} · ${escapeHtml(conceptLabel(item.concept).toUpperCase())}</div><h2>${escapeHtml(item.prompt)}</h2><p class="prompt">Recall the explanation. Choose the best answer once more.</p><p class="practice-note">This retry is recorded separately from your first try and model estimates.</p><div class="choices" role="group" aria-label="Practice answer options">${item.options.map((option, i) => `<button class="choice" data-practice-choice="${i}"><span class="choice-key">${String.fromCharCode(65+i)}</span>${escapeHtml(option)}</button>`).join('')}</div><div id="practice-feedback"></div><button class="text-button practice-back" id="back-to-review">Back to learning trace</button></article>`;
  let submitted = false;
  root.querySelectorAll('[data-practice-choice]').forEach(button => button.addEventListener('click', () => {
    if (submitted) return;
    const choice = Number(button.dataset.practiceChoice);
    practice = answerPractice(practice, item.id, choice);
    submitted = true;
    const correct = choice === item.answer;
    root.querySelectorAll('[data-practice-choice]').forEach(option => {
      option.disabled = true;
      const selected = Number(option.dataset.practiceChoice);
      if (selected === item.answer) option.classList.add('correct');
      else if (selected === choice) option.classList.add('incorrect');
    });
    const feedback = root.querySelector('#practice-feedback');
    feedback.innerHTML = `<div class="feedback"><strong>${correct ? 'That connection holds on retry.' : 'Keep this connection in view.'}</strong><p><strong>Correct answer:</strong> ${escapeHtml(item.options[item.answer])}</p>${escapeHtml(item.explanation)}<span class="why">Apply the idea: ${escapeHtml(item.transfer)}</span></div><button class="primary-button next-button" id="practice-next">${currentPracticeItem(practice) ? 'Next practice connection' : 'See practice results'} <span aria-hidden="true">→</span></button>`;
    feedback.querySelector('button').addEventListener('click', renderPracticeQuestion);
    setProgress();
    feedback.querySelector('button').focus();
  }));
  root.querySelector('#back-to-review').addEventListener('click', renderResults);
  setProgress();
  root.querySelector('[data-practice-choice]').focus({preventScroll:true});
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
