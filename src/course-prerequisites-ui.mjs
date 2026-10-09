import { MAX_DECK_BYTES } from './deck.mjs';
import { inspectCoursePrerequisites } from './course-prerequisites.mjs';

/** Explicit local-file review. A newer action retires every older read or hash. */
export function mountCoursePrerequisites(document, environment = globalThis) {
  const get = id => document.getElementById(id);
  const input = get('course-file');
  const clear = get('clear-course');
  const download = get('download-review');
  const status = get('review-status');
  const review = get('review');
  let revision = 0;
  let current = null;
  let pending = false;

  const literalText = (node, text) => {
    node.replaceChildren();
    for (const part of String(text).split(/(\r(?!\n))/)) {
      node.append(document.createTextNode(part));
      if (part === '\r') node.append(document.createElement('br'));
    }
  };
  const element = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) literalText(node, text);
    if (className) node.className = className;
    return node;
  };
  const conceptLabel = index => 'Source concept ' + (index + 1) + ': ' + current.report.concepts[index].name;
  const updateControls = () => {
    clear.disabled = !current && !pending;
    download.disabled = !current || pending;
    review.setAttribute('aria-busy', String(pending));
    for (const button of review.querySelectorAll('button')) button.disabled = pending;
  };
  const say = message => { status.textContent = message; };
  const select = index => {
    if (!current || pending) return;
    current = { ...current, report: inspectCoursePrerequisites(current.text, index) };
    render();
    get('selected-concept').focus();
    say('Showing ' + conceptLabel(index) + '.');
  };
  const conceptButton = (index, className) => {
    const button = element('button', conceptLabel(index), className);
    button.type = 'button';
    button.dataset.selectConcept = String(index);
    button.addEventListener('click', () => select(index));
    return button;
  };
  const question = index => {
    const row = current.report.questions[index];
    const box = element('div', undefined, 'question');
    box.dataset.questionIndex = String(index);
    box.append(element('p', 'Question ' + (index + 1) + ' · ID: ' + row.id, 'question-label'),
      element('p', row.prompt, 'literal prompt'));
    return box;
  };
  const relationList = (id, indices, empty) => {
    const host = get(id);
    host.replaceChildren();
    if (!indices.length) { host.append(element('p', empty, 'muted')); return; }
    const list = element('ul', undefined, 'concept-list');
    for (const index of indices) {
      const row = element('li');
      row.append(conceptButton(index));
      list.append(row);
    }
    host.append(list);
  };
  const edgeList = (id, links, empty) => {
    const host = get(id);
    host.replaceChildren();
    if (!links.length) { host.append(element('p', empty, 'muted')); return; }
    for (const link of links) {
      const box = element('article', undefined, 'edge');
      box.dataset.linkFrom = String(link.prerequisiteIndex);
      box.dataset.linkTo = String(link.conceptIndex);
      const heading = element('h4', conceptLabel(link.conceptIndex) + ' requires ' +
        conceptLabel(link.prerequisiteIndex), 'literal');
      const follow = element('div', undefined, 'follow-controls');
      follow.append(conceptButton(link.prerequisiteIndex), conceptButton(link.conceptIndex));
      const details = element('details');
      details.append(element('summary', link.questionIndices.length +
        (link.questionIndices.length === 1 ? ' original question declares this link' :
          ' original questions declare this link')));
      for (const index of link.questionIndices) details.append(question(index));
      box.append(heading, follow, details);
      host.append(box);
    }
  };
  const pathList = (id, rows, empty) => {
    const host = get(id);
    host.replaceChildren();
    if (!rows.length) { host.append(element('p', empty, 'muted')); return; }
    for (const row of rows) {
      const details = element('details', undefined, 'path');
      details.dataset.pathTo = String(row.index);
      details.dataset.path = row.path.join(',');
      details.append(element('summary', row.path.map(conceptLabel).join(' requires → ')));
      details.append(element('p', 'One shortest declared chain. Equal-length alternatives use source concept order.', 'muted'));
      for (let step = 0; step < row.path.length - 1; step += 1) {
        const from = row.path[step];
        const to = row.path[step + 1];
        const link = current.report.links.find(value =>
          value.conceptIndex === from && value.prerequisiteIndex === to);
        const box = element('div', undefined, 'path-step');
        box.append(element('h4', conceptLabel(from) + ' requires ' + conceptLabel(to), 'literal'));
        for (const index of link.questionIndices) box.append(question(index));
        details.append(box);
      }
      host.append(details);
    }
  };
  function render() {
    review.hidden = !current;
    if (!current) {
      for (const id of ['course-title', 'course-attribution', 'course-license', 'source-filename',
        'source-bytes', 'source-sha256', 'concept-overview', 'selected-concept', 'selection-summary',
        'direct-prerequisites', 'required-concepts', 'direct-dependents', 'downstream-concepts',
        'requirement-paths', 'dependent-paths', 'selected-questions']) get(id).replaceChildren();
      updateControls();
      return;
    }
    const { report, source } = current;
    literalText(get('course-title'), report.course.title);
    literalText(get('course-attribution'), report.course.attribution);
    literalText(get('course-license'), report.course.license);
    literalText(get('source-filename'), source.filename);
    get('source-bytes').textContent = String(source.bytes);
    get('source-sha256').textContent = source.sha256;
    const overview = get('concept-overview');
    overview.replaceChildren();
    for (const concept of report.concepts) {
      const row = element('li');
      const button = conceptButton(concept.index);
      button.setAttribute('aria-pressed', String(concept.index === report.selection.index));
      row.append(button, element('p', concept.questionIndices.length +
        (concept.questionIndices.length === 1 ? ' question' : ' questions') +
        ' · ' + concept.directPrerequisites.length + ' direct requirements · structural depth ' + concept.level, 'muted'));
      overview.append(row);
    }
    const selected = report.concepts[report.selection.index];
    literalText(get('selected-concept'), conceptLabel(selected.index));
    get('selection-summary').textContent = selected.questionIndices.length +
      (selected.questionIndices.length === 1 ? ' original question' : ' original questions') +
      ' · structural depth ' + selected.level +
      '. Depth counts the longest declared prerequisite chain; it is not a teaching order or mastery score.';
    edgeList('direct-prerequisites', report.links.filter(link => link.conceptIndex === selected.index),
      'No original question for this concept declares a prerequisite.');
    relationList('required-concepts', selected.required, 'No direct or longer requirements.');
    edgeList('direct-dependents', report.links.filter(link => link.prerequisiteIndex === selected.index),
      'No other concept directly names this concept as a prerequisite.');
    relationList('downstream-concepts', selected.downstream, 'No other concept depends on this concept.');
    pathList('requirement-paths', report.selection.requirementPaths, 'There are no requirement chains to show.');
    pathList('dependent-paths', report.selection.dependentPaths, 'There are no dependent chains to show.');
    const questions = get('selected-questions');
    questions.replaceChildren();
    for (const index of selected.questionIndices) {
      const box = question(index);
      const row = report.questions[index];
      box.append(element('p', row.prerequisiteIndices.length ?
        'Authored prerequisites, in original order: ' + row.prerequisiteIndices.map(conceptLabel).join(' · ') :
        'This question declares no prerequisites.', 'literal muted'));
      questions.append(box);
    }
    updateControls();
  }
  input.addEventListener('change', async () => {
    const file = input.files && input.files[0];
    input.value = '';
    if (!file) return;
    const request = ++revision;
    pending = true;
    updateControls();
    say('Reading ' + file.name + '. ' + (current ? 'The previous file is still shown; its controls are paused.' : ''));
    try {
      if (!Number.isSafeInteger(file.size) || file.size < 0 || file.size > MAX_DECK_BYTES) {
        throw new Error('Choose a JSON deck no larger than 256 KiB.');
      }
      const bytes = await file.arrayBuffer();
      if (request !== revision) return;
      if (bytes.byteLength > MAX_DECK_BYTES) throw new Error('Choose a JSON deck no larger than 256 KiB.');
      const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
      const report = inspectCoursePrerequisites(text);
      const digest = await environment.crypto.subtle.digest('SHA-256', bytes);
      if (request !== revision) return;
      const sha256 = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
      current = {
        text, report,
        source: Object.freeze({ filename: file.name, bytes: bytes.byteLength, sha256 })
      };
      pending = false;
      render();
      say('Review ready. Showing ' + file.name + '. The course file is unchanged.');
      get('course-title').focus();
    } catch (error) {
      if (request !== revision) return;
      pending = false;
      updateControls();
      say('Could not review this file. ' + (error instanceof Error ? error.message : String(error)) +
        (current ? ' Still showing previous file: ' + current.source.filename + '.' : ' Choose another course JSON file.'));
    }
  });
  clear.addEventListener('click', () => {
    revision += 1;
    current = null;
    pending = false;
    input.value = '';
    render();
    say('Review cleared. Choose a course JSON file to begin.');
    input.focus();
  });
  download.addEventListener('click', () => {
    if (!current || pending) return;
    let url = null;
    let anchor = null;
    try {
      const text = JSON.stringify({
        format: 'recallweave-prerequisite-review/1', source: current.source, report: current.report
      }, null, 2) + '\n';
      const blob = new environment.Blob([text], { type: 'application/json;charset=utf-8' });
      url = environment.URL.createObjectURL(blob);
      anchor = element('a');
      anchor.href = url;
      anchor.download = 'course-prerequisite-review.json';
      anchor.hidden = true;
      document.body.append(anchor);
      anchor.click();
      say('Review download started. It contains question prompts and attribution; it is not a lesson file.');
    } catch (error) {
      say('Could not start the review download. ' +
        (error instanceof Error ? error.message : String(error)) + ' Your current review is still available; try again.');
    } finally {
      anchor?.remove();
      if (url) environment.setTimeout(() => environment.URL.revokeObjectURL(url), 1000);
    }
  });
  render();
}

if (typeof document !== 'undefined' && document.getElementById('course-file')) {
  mountCoursePrerequisites(document);
}
