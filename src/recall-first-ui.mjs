import { parseDeck, MAX_DECK_BYTES } from './deck.mjs';
import { createRecall, currentRecall, writeRecall, revealRecall, judgeRecall, beginRevisit, recallSummary, MAX_RECALL_TEXT } from './recall-first.mjs';

const $ = id => document.getElementById(id);
const bundled = parseDeck($('bundled-deck').textContent);
let pending = bundled;
let session = null;
let request = 0;

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function button(text, id, action, secondary = false) {
  const node = element('button', text, secondary ? 'secondary' : '');
  node.id = id; node.type = 'button'; node.addEventListener('click', action); return node;
}
function message(text) { $('status').textContent = text; }
function heading(text) {
  const node = element('h2', text); node.tabIndex = -1; node.id = 'active-heading'; return node;
}
function focusHeading() { $('active-heading')?.focus({ preventScroll: true }); }
function credits(parent, deck) {
  const block = element('div', undefined, 'credits');
  block.append(element('p', 'Source: ' + deck.attribution), element('p', 'License: ' + deck.license));
  parent.append(block);
}
function renderPreview() {
  const root = $('preview'); root.replaceChildren(); root.hidden = !pending;
  if (!pending) return;
  root.append(element('h2', 'Ready to start: ' + pending.title),
    element('p', pending.items.length + ' prompts · ' + pending.concepts.length + ' concepts. Questions follow the course’s original order.'),
    element('p', session ? 'Your current work stays below until you explicitly start this course. Starting replaces that work in this tab.' : 'Try each prompt before revealing its reference answer. Your judgments are your own; nothing is automatically marked.'));
  credits(root, pending);
  root.append(button('Start this course', 'start-course', () => {
    request++; session = createRecall(pending); pending = null;
    $('deck-file').value = ''; renderPreview(); renderSession(); message('Course started. Answers remain hidden until you reveal.'); focusHeading();
  }), button('Cancel preview', 'cancel-preview', () => {
    request++; pending = null; $('deck-file').value = ''; renderPreview(); message('Preview cancelled. Current work is unchanged.');
  }, true));
}

function showRestart() {
  const box = $('restart-confirm'); box.hidden = false; $('confirm-restart').focus();
}
function renderSession() {
  const root = $('session'); root.replaceChildren();
  $('restart-area').hidden = !session; $('restart-confirm').hidden = true;
  if (!session) { root.append(element('p', 'Start the bundled course above or choose your own course JSON.', 'empty')); return; }
  const item = currentRecall(session);
  root.append(element('p', session.deck.title, 'course-title'));
  if (item) {
    root.append(element('p', (session.pass === 'first' ? 'FIRST PASS' : 'REVISIT PASS') + ' · ' + (session.index + 1) + ' OF ' + session.queue.length, 'eyebrow'));
    const article = element('article', undefined, 'prompt-card'); article.id = 'prompt-card';
    article.append(heading(item.prompt), element('p', 'Concept: ' + item.concept, 'concept'));
    if (!session.revealed) {
      article.append(element('p', 'Pause and explain the idea to yourself. You can write a short answer, say it aloud, or think it through.'));
      const label = element('label', 'Your answer (optional)'); label.htmlFor = 'recall-answer';
      const input = element('textarea'); input.id = 'recall-answer'; input.rows = 5; input.maxLength = MAX_RECALL_TEXT;
      input.value = session.draft; input.setAttribute('aria-describedby', 'answer-hint');
      input.addEventListener('input', () => { session = writeRecall(session, input.value); $('answer-count').textContent = input.value.length + ' / 4,000'; });
      const hint = element('p', 'Only in this tab. Your answer is not automatically assessed.', 'hint'); hint.id = 'answer-hint';
      const count = element('p', session.draft.length + ' / 4,000', 'hint'); count.id = 'answer-count';
      article.append(label, input, hint, count, button('Reveal and compare', 'reveal', () => {
        session = revealRecall(session); renderSession(); $('reference-heading').focus({ preventScroll: true });
      }));
    } else {
      const own = element('section', undefined, 'own-answer');
      own.append(element('h3', 'Your attempt'), element('p', session.draft || 'No written answer — you may have answered aloud or in your head.', 'literal'));
      const reference = element('section', undefined, 'reference'); reference.id = 'reference';
      const h = element('h3', 'Reference answer'); h.id = 'reference-heading'; h.tabIndex = -1;
      reference.append(h, element('p', item.options[item.answer], 'literal'), element('h3', 'Why this connects'),
        element('p', item.explanation, 'literal'), element('h3', 'Apply the idea'), element('p', item.transfer, 'literal'));
      article.append(own, reference, element('p', 'Compare the ideas, not exact wording. Choose your own next step. These labels are self-reported, not a score.', 'self-check'));
      const actions = element('div', undefined, 'actions');
      for (const [value, label] of [['ready', 'Ready for now'], ['revisit', 'Revisit']]) {
        actions.append(button(label, 'judge-' + value, () => {
          session = judgeRecall(session, value); renderSession(); focusHeading();
        }, value === 'revisit'));
      }
      article.append(actions);
    }
    root.append(article);
  } else {
    const summary = recallSummary(session);
    root.append(heading(session.pass === 'first' ? 'First pass complete' : 'Revisit pass complete'),
      element('p', 'These are your self-checks, not correctness or mastery estimates. A reference answer cannot decide whether your explanation is sound.'),
      element('p', summary.markedFirst + ' of ' + summary.total + ' prompts marked Revisit on the first pass.', 'summary-line'));
    if (session.pass === 'revisit') root.append(element('p', summary.revisitRemaining + ' still marked Revisit after the revisit pass. Keep these ideas for another study session.', 'summary-line'));
    if (session.pass === 'first' && summary.markedFirst) {
      root.append(button('Revisit marked prompts (' + summary.markedFirst + ')', 'begin-revisit', () => {
        session = beginRevisit(session); renderSession(); focusHeading();
      }), element('p', 'One extra pass, in the original course order. Each prompt starts with its reference hidden again.'));
    } else if (session.pass === 'first') root.append(element('p', 'You marked every prompt Ready for now. You can inspect your attempts below or start over.'));
    else root.append(element('p', 'The bounded revisit pass is finished. Your first attempts remain below alongside the revisit attempts.'));
    const list = element('div', undefined, 'attempts');
    for (const item of session.deck.items) {
      const first = session.first.find(x => x.item === item.id);
      const retry = session.revisit.find(x => x.item === item.id);
      const detail = element('details');
      detail.append(element('summary', item.prompt));
      for (const [name, record] of [['First pass', first], ['Revisit pass', retry]]) {
        if (!record) continue;
        detail.append(element('h3', name + ' · ' + (record.judgment === 'ready' ? 'Ready for now' : 'Revisit') + ' (self-reported)'),
          element('p', record.text || 'No written answer.', 'literal'));
      }
      detail.append(element('h3', 'Reference answer'), element('p', item.options[item.answer], 'literal'),
        element('p', item.explanation, 'literal'), element('p', 'Apply the idea: ' + item.transfer, 'literal'));
      list.append(detail);
    }
    root.append(list);
  }
  credits(root, session.deck);
}

$('deck-file').addEventListener('change', async event => {
  const ticket = ++request; const file = event.target.files?.[0];
  pending = null; renderPreview();
  if (!file) { message('No course selected. Current work is unchanged.'); return; }
  message('Checking the selected course. Current work is unchanged.');
  try {
    if (file.size > MAX_DECK_BYTES) throw new Error('Course files must be at most 262,144 bytes.');
    const bytes = await file.arrayBuffer();
    if (ticket !== request) return;
    if (bytes.byteLength > MAX_DECK_BYTES) throw new Error('Course files must be at most 262,144 bytes.');
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    const deck = parseDeck(text);
    if (ticket !== request) return;
    pending = deck; renderPreview(); message('Course checked. Preview it, then explicitly Start this course.');
  } catch (error) {
    if (ticket !== request) return;
    pending = null; renderPreview(); message('Course refused: ' + error.message + ' Current work is unchanged.');
  }
});
$('bundled-course').addEventListener('click', () => {
  request++; pending = bundled; $('deck-file').value = ''; renderPreview(); message('Bundled course preview ready. Current work is unchanged.');
});
$('restart').addEventListener('click', showRestart);
$('cancel-restart').addEventListener('click', () => { $('restart-confirm').hidden = true; $('restart').focus(); });
$('confirm-restart').addEventListener('click', () => {
  session = createRecall(session.deck); renderSession(); message('Started over with the same checked course. Previous attempts were cleared.'); focusHeading();
});
renderPreview(); renderSession();
