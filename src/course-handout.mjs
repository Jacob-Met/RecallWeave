import { validateDeck } from './deck.mjs';

export const HANDOUT_KINDS = Object.freeze(['worksheet', 'answer-key']);

function checkedKind(kind) {
  if (!HANDOUT_KINDS.includes(kind)) throw new Error('Choose worksheet or answer-key.');
  return kind;
}

// The worksheet projection never carries the deck's answer indices or explanations.
export function createHandout(input, kind = 'worksheet') {
  checkedKind(kind);
  const deck = validateDeck(input);
  const questions = deck.items.map((item, index) => {
    const question = {
      id: item.id,
      number: index + 1,
      prompt: item.prompt,
      options: Object.freeze([...item.options]),
      transfer: item.transfer,
    };
    if (kind === 'answer-key') {
      question.answer = item.answer;
      question.explanation = item.explanation;
    }
    return Object.freeze(question);
  });
  return Object.freeze({
    kind,
    title: deck.title,
    attribution: deck.attribution,
    license: deck.license,
    concepts: Object.freeze([...deck.concepts]),
    questions: Object.freeze(questions),
  });
}

export const HANDOUT_CSS = [
  '.course-paper { box-sizing: border-box; background: #fff; color: #202338; padding: 3rem; font: 1rem/1.65 system-ui, sans-serif; overflow-wrap: anywhere; }',
  '.course-paper *, .course-paper *::before, .course-paper *::after { box-sizing: border-box; }',
  '.paper-header { border-bottom: 2px solid #202338; padding-bottom: 1.5rem; margin-bottom: 2rem; }',
  '.paper-kind { color: #5d3fa8; font-size: .76rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }',
  '.paper-title { font: 700 clamp(1.8rem, 5vw, 2.75rem)/1.2 Georgia, serif; margin: .6rem 0 1rem; }',
  '.paper-title, .paper-attribution, .paper-license, .question-prompt, .question-option, .correct-option, .question-explanation, .question-transfer, .paper-concepts li { white-space: pre-wrap; }',
  '.paper-instructions { max-width: 65ch; margin: .75rem 0; color: #43475d; }',
  '.paper-concepts { display: flex; flex-wrap: wrap; gap: .35rem 1.5rem; padding-left: 1.2rem; margin: 1rem 0; font-size: .85rem; }',
  '.paper-name { margin: 1.75rem 0 0; font-size: .88rem; }',
  '.handout-question { margin: 0 0 2.5rem; break-inside: avoid-page; page-break-inside: avoid; }',
  '.question-heading { display: flex; align-items: baseline; gap: .65rem; margin: 0 0 .85rem; font-size: 1.1rem; font-weight: 650; line-height: 1.55; }',
  '.question-number { flex: 0 0 auto; color: #5d3fa8; font-weight: 800; }',
  '.question-options { list-style-type: upper-alpha; padding-left: 2.25rem; margin: .75rem 0 1.2rem; }',
  '.question-option { padding-left: .35rem; margin: .45rem 0; }',
  '.question-option::marker { font-weight: 700; }',
  '.transfer-heading { margin: 1.2rem 0 .35rem; font-size: .8rem; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; }',
  '.question-transfer { margin: 0 0 .75rem; }',
  '.response-lines span { display: block; min-height: 1.9rem; border-bottom: 1px solid #c1c4cc; }',
  '.key-answer { border-left: 3px solid #5d3fa8; padding: .25rem 0 .25rem 1rem; margin: 1rem 0; }',
  '.answer-label { color: #5d3fa8; font-size: .8rem; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; margin: 0 0 .3rem; }',
  '.correct-option { margin: 0 0 .75rem; font-weight: 700; }',
  '.question-explanation { margin: 0; }',
  '.transfer-note { margin: .5rem 0 0; font-size: .8rem; color: #656a7b; }',
  '.paper-footer { border-top: 1px solid #c1c4cc; padding-top: 1rem; font-size: .78rem; color: #53596c; }',
  '.paper-footer h2 { font-size: .8rem; margin: 0 0 .5rem; }',
  '.paper-attribution, .paper-license { margin: .4rem 0; }',
  '.handout-document { margin: 0; padding: 1.5rem; background: #f1f0ed; color: #202338; font-family: system-ui, sans-serif; }',
  '.handout-document .course-paper { max-width: 850px; margin: 0 auto 2rem; box-shadow: 0 8px 35px #20233812; }',
  '.document-toolbar { max-width: 850px; margin: 0 auto 1.25rem; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1rem; }',
  '.document-toolbar p { margin: 0; font-size: .88rem; }',
  '.document-toolbar button { border: 0; border-radius: .5rem; padding: .8rem 1.15rem; background: #5d3fa8; color: white; font: 700 .9rem system-ui, sans-serif; cursor: pointer; }',
  '.document-toolbar button:focus-visible { outline: 3px solid #c39dff; outline-offset: 3px; }',
  '@media (max-width: 600px) { .course-paper { padding: 1.35rem; } .handout-document { padding: .65rem; } .paper-name { line-height: 2; } }',
  '@page { margin: 16mm; }',
  '@media print {',
  '  html, body { margin: 0 !important; padding: 0 !important; background: white !important; }',
  '  .handout-controls, .document-toolbar, .handout-empty { display: none !important; }',
  '  .handout-layout, .paper-stage { display: block !important; padding: 0 !important; margin: 0 !important; }',
  '  .course-paper, .handout-document .course-paper { width: auto !important; max-width: none !important; margin: 0 !important; padding: 0 !important; border: 0 !important; box-shadow: none !important; font-size: 10.5pt; }',
  '  .paper-title { font-size: 23pt; } .question-heading { font-size: 12pt; }',
  '  .paper-kind, .question-number, .answer-label { color: #202338; }',
  '}',
].join('\n');

// Self-contained so the same literal-text renderer can travel in a saved HTML document.
export function renderHandout(root, handout) {
  const document = root.ownerDocument;
  const node = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };
  const isKey = handout.kind === 'answer-key';
  root.replaceChildren();
  root.classList.add('course-paper');
  root.dataset.handoutKind = handout.kind;
  root.setAttribute('aria-label', isKey ? 'Answer key' : 'Worksheet');

  const header = node('header', 'paper-header');
  header.append(node('p', 'paper-kind', isKey ? 'Answer key · Contains answers' : 'Worksheet · Questions only'));
  const title = node('h1', 'paper-title', handout.title);
  title.tabIndex = -1;
  header.append(title);
  header.append(node('p', 'paper-instructions', isKey
    ? 'Use the original option order below to review each answer and its explanation.'
    : 'Choose one option for each question, then write a response to apply the idea. Answers are in the separate answer key.'));
  const concepts = node('ul', 'paper-concepts');
  for (const concept of handout.concepts) concepts.append(node('li', '', concept));
  header.append(concepts);
  if (!isKey) header.append(node('p', 'paper-name', 'Name: ______________________________    Date: __________________'));
  root.append(header);

  for (const question of handout.questions) {
    const section = node('section', 'handout-question');
    section.dataset.questionNumber = String(question.number);
    const heading = node('h2', 'question-heading');
    heading.append(node('span', 'question-number', question.number + '.'));
    heading.append(node('span', 'question-prompt', question.prompt));
    section.append(heading);
    const options = node('ol', 'question-options');
    options.type = 'A';
    for (const option of question.options) options.append(node('li', 'question-option', option));
    section.append(options);
    if (isKey) {
      const answer = node('div', 'key-answer');
      answer.append(node('p', 'answer-label', 'Answer ' + String.fromCharCode(65 + question.answer)));
      answer.append(node('p', 'correct-option', question.options[question.answer]));
      answer.append(node('p', 'question-explanation', question.explanation));
      section.append(answer);
    }
    section.append(node('h3', 'transfer-heading', 'Apply the idea'));
    section.append(node('p', 'question-transfer', question.transfer));
    if (isKey) {
      section.append(node('p', 'transfer-note', 'No separate transfer answer is provided by the deck.'));
    } else {
      const lines = node('div', 'response-lines');
      lines.setAttribute('aria-label', 'Space for your response');
      for (let index = 0; index < 3; index++) {
        const line = node('span');
        line.setAttribute('aria-hidden', 'true');
        lines.append(line);
      }
      section.append(lines);
    }
    root.append(section);
  }
  const footer = node('footer', 'paper-footer');
  footer.append(node('h2', '', 'Source and permission'));
  footer.append(node('p', 'paper-attribution', handout.attribution));
  footer.append(node('p', 'paper-license', handout.license));
  root.append(footer);
  return root;
}

export function handoutFilename(title, kind = 'worksheet') {
  checkedKind(kind);
  const stem = title.normalize('NFKD').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'course';
  return stem + '.' + kind + '.html';
}

export function createHandoutDocument(input, kind = 'worksheet') {
  const handout = createHandout(input, kind);
  const payload = JSON.stringify(handout)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  const label = kind === 'worksheet' ? 'worksheet' : 'answer key';
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<title>Course ' + label + '</title>',
    '<style>' + HANDOUT_CSS + '</style>',
    '</head>',
    '<body class="handout-document">',
    '<nav class="document-toolbar handout-controls" aria-label="Document actions">',
    '<p>' + (kind === 'worksheet' ? 'Questions only · Separate answer key required' : 'Answer key · Contains answers and explanations') + '</p>',
    '<button id="print-handout" type="button">Print ' + label + '</button>',
    '</nav>',
    '<main id="handout-paper" class="course-paper"></main>',
    '<noscript>This local handout needs JavaScript to display its text. It does not need an internet connection.</noscript>',
    '<script id="handout-data" type="application/json">' + payload + '</script>',
    '<script>',
    "'use strict';",
    "const handout = JSON.parse(document.querySelector('#handout-data').textContent);",
    '(' + renderHandout.toString() + ")(document.querySelector('#handout-paper'), handout);",
    "document.title = handout.title + ' — ' + (handout.kind === 'worksheet' ? 'Worksheet' : 'Answer key');",
    "document.querySelector('#print-handout').addEventListener('click', () => window.print());",
    '</script>',
    '</body>',
    '</html>',
    '',
  ].join('\n');
}
