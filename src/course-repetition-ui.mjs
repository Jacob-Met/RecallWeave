import { MAX_DECK_BYTES } from './deck.mjs';
import { inspectCourseRepetition } from './course-repetition.mjs';

async function sha256(bytes) {
  if (!globalThis.crypto?.subtle) {
    throw new Error('This browser cannot prepare the required SHA-256 provenance. Use a current browser.');
  }
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

/** A separate, in-memory consumer of the unchanged literal-repetition helper. */
export function mountCourseRepetition(document, platform = {}) {
  const byId = id => document.getElementById(id);
  const input = byId('repetition-file');
  const choose = byId('choose-repetition-file');
  const review = byId('review-repetition');
  const download = byId('download-repetition');
  const status = byId('repetition-status');
  const hash = platform.hash ?? sha256;
  const createURL = platform.createObjectURL ?? (blob => URL.createObjectURL(blob));
  const revokeURL = platform.revokeObjectURL ?? (url => URL.revokeObjectURL(url));
  const later = platform.setTimeout ?? setTimeout;
  const BlobType = platform.Blob ?? Blob;
  const listeners = [];
  const urls = new Set();
  let generation = 0;
  let captured = null;
  let prepared = null;

  function on(element, event, action) {
    element.addEventListener(event, action);
    listeners.push(() => element.removeEventListener(event, action));
  }
  function revoke(url) {
    if (urls.delete(url)) revokeURL(url);
  }
  function retire(message) {
    generation++;
    captured = null;
    prepared = null;
    review.disabled = true;
    download.disabled = true;
    byId('repetition-captured').hidden = true;
    byId('repetition-result').hidden = true;
    byId('repetition-empty').hidden = false;
    for (const id of ['repetition-filename', 'repetition-bytes', 'repetition-source-hash',
      'repetition-title', 'repetition-metadata', 'repetition-total', 'repetition-prompt-count',
      'repetition-member-count', 'repetition-choice-count', 'repetition-answer-count',
      'repetition-outcome', 'repetition-report-json']) byId(id).textContent = '';
    byId('repetition-groups').replaceChildren();
    for (const url of [...urls]) revoke(url);
    status.textContent = message;
    return generation;
  }
  function refuse(message) {
    retire(message);
    input.value = '';
  }
  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function exactBlock(parent, label, value) {
    parent.append(element('h4', label), element('pre', JSON.stringify(value, null, 2), 'record'));
  }
  function showReport(report) {
    byId('repetition-title').textContent = report.course.title;
    byId('repetition-metadata').textContent = JSON.stringify(report.course, null, 2);
    const s = report.summary;
    byId('repetition-total').textContent = String(s.questionCount);
    byId('repetition-prompt-count').textContent = String(s.repeatedPromptGroups);
    byId('repetition-member-count').textContent = String(s.repeatedQuestionCount);
    byId('repetition-choice-count').textContent = String(s.equivalentChoiceGroups);
    byId('repetition-answer-count').textContent = String(s.answerDisagreementGroups);
    byId('repetition-outcome').textContent = s.repeatedPromptGroups === 0
      ? 'No literal repeated prompts were found in this course. This does not establish semantic uniqueness, factual accuracy or teaching quality.'
      : 'These are review cues, not automatic corrections. Repetition may be intentional, and different authored answers need human review.';
    const groups = byId('repetition-groups');
    groups.replaceChildren();
    report.prompts.forEach((group, groupIndex) => {
      const card = element('article', undefined, 'prompt-group');
      card.append(element('p', 'Prompt group ' + (groupIndex + 1), 'step'),
        element('h3', group.prompt, 'literal prompt-title'),
        element('p', group.members.length + ' questions share this exact prompt. Original source positions are shown below.', 'quiet'));
      if (group.choiceGroups.length === 0) {
        card.append(element('p', 'No choice set repeats within this prompt group. Every original record is retained below.', 'notice'));
      }
      group.choiceGroups.forEach((choice, choiceIndex) => {
        const section = element('section', undefined, 'choice-group');
        section.append(element('h4', 'Choice set ' + (choiceIndex + 1) + (choice.answerDisagreement
          ? ' · Authored answers differ' : ' · Same authored answer text')));
        exactBlock(section, 'Choices in the first member’s order', choice.options);
        exactBlock(section, 'Question IDs in source order', choice.questionIds);
        exactBlock(section, 'Authored selected text and its question IDs', choice.authoredAnswers);
        card.append(section);
      });
      const records = element('details');
      records.open = true;
      records.append(element('summary', 'Inspect all ' + group.members.length + ' original question records'));
      for (const member of group.members) {
        const section = element('section', undefined, 'question-record');
        section.append(element('h4', 'Source question ' + (member.index + 1) + ' · ID ' + JSON.stringify(member.item.id)));
        const item = member.item;
        section.append(element('p', 'Authored choice ' + (item.answer + 1) + ' of ' + item.options.length
          + ' · selected text ' + JSON.stringify(item.options[item.answer]), 'literal record-answer'));
        section.append(element('pre', JSON.stringify({ sourceQuestion: member.index + 1, index: member.index, item }, null, 2), 'record'));
        records.append(section);
      }
      card.append(records);
      groups.append(card);
    });
    byId('repetition-report-json').textContent = JSON.stringify(report, null, 2);
    byId('repetition-result').hidden = false;
    byId('repetition-empty').hidden = true;
  }

  async function readSelection() {
    const version = retire('Reading the selected file…');
    const file = input.files?.[0];
    if (!file) {
      status.textContent = 'Selection cancelled. Choose a course JSON to begin.';
      return;
    }
    try {
      if (input.files.length !== 1) throw new Error('Choose one course JSON at a time.');
      if (!Number.isSafeInteger(file.size) || file.size < 0 || file.size > MAX_DECK_BYTES) {
        throw new Error('Choose a JSON deck no larger than 256 KiB.');
      }
      const buffer = await file.arrayBuffer();
      if (version !== generation) return;
      const bytes = new Uint8Array(buffer);
      if (bytes.byteLength > MAX_DECK_BYTES) throw new Error('Choose a JSON deck no larger than 256 KiB.');
      let text;
      try { text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes); }
      catch { throw new Error('The file must contain valid UTF-8. Invalid bytes were not replaced.'); }
      const sourceHash = await hash(bytes);
      if (version !== generation) return;
      if (typeof sourceHash !== 'string' || !/^[0-9a-f]{64}$/.test(sourceHash)) {
        throw new Error('The required SHA-256 provenance could not be prepared.');
      }
      captured = Object.freeze({ text, source: Object.freeze({
        filename: file.name, bytes: bytes.byteLength, sha256: sourceHash
      }) });
      byId('repetition-filename').textContent = JSON.stringify(file.name);
      byId('repetition-bytes').textContent = String(bytes.byteLength);
      byId('repetition-source-hash').textContent = sourceHash;
      byId('repetition-captured').hidden = false;
      review.disabled = false;
      status.textContent = 'File captured. Choose Review loaded course to validate it and inspect literal repetitions.';
    } catch (error) {
      if (version !== generation) return;
      refuse(error instanceof Error ? error.message : 'The file could not be read. Choose the course again.');
    }
  }

  function reviewCaptured() {
    if (!captured) return;
    try {
      const report = inspectCourseRepetition(captured.text);
      const wrapper = { format: 'recallweave-course-repetition-browser/1', source: captured.source, report };
      const json = JSON.stringify(wrapper, null, 2) + '\n';
      showReport(report);
      prepared = Object.freeze({ json });
      review.disabled = true;
      download.disabled = false;
      status.textContent = 'Review ready. Inspect the authored records and download the report if useful. The course has not been changed.';
    } catch (error) {
      refuse(error instanceof Error ? error.message : 'The course could not be reviewed. Choose another course JSON.');
    }
  }
  function downloadPrepared() {
    if (!prepared) return;
    try {
      const url = createURL(new BlobType([prepared.json], { type: 'application/json;charset=utf-8' }));
      urls.add(url);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'course-repetition-review.json';
      document.body.append(link);
      try { link.click(); } finally { link.remove(); }
      later(() => revoke(url), 1000);
      status.textContent = 'Review download requested. It contains original question text and answer keys; share it deliberately.';
    } catch {
      refuse('The download could not be prepared. Choose the course again and review it before retrying.');
    }
  }
  on(choose, 'click', () => {
    retire('Choose a course JSON. The previous file, review and download have been cleared.');
    input.value = '';
    try { input.click(); }
    catch { refuse('The file chooser could not be opened. Try choosing the course again.'); }
  });
  on(input, 'change', readSelection);
  on(input, 'cancel', () => refuse('Selection cancelled. Choose a course JSON to begin.'));
  on(byId('clear-repetition'), 'click', () => {
    refuse('Selection cleared. Choose a course JSON to begin.');
    choose.focus();
  });
  on(review, 'click', reviewCaptured);
  on(download, 'click', downloadPrepared);
  retire('Choose a local course JSON to begin. Review cues do not edit your course.');
  return () => {
    retire('Question review closed.');
    listeners.forEach(remove => remove());
  };
}

if (typeof document !== 'undefined') mountCourseRepetition(document);
