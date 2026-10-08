import {catalogSubjects, filterCourses} from './course-catalog.mjs';

/** Mount once, then hide unmatched cards so filtering preserves focus and details. */
export function mountCourseCatalog(document, catalog) {
  const list = document.querySelector('#course-list');
  const search = document.querySelector('#course-search');
  const subject = document.querySelector('#course-subject');
  const clear = document.querySelector('#clear-filters');
  const count = document.querySelector('#result-count');
  const empty = document.querySelector('#no-results');
  const status = document.querySelector('#download-status');
  const view = document.defaultView;
  const make = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  for (const label of catalogSubjects(catalog.courses)) {
    const option = make('option', label);
    option.value = label;
    subject.append(option);
  }
  const cards = new Map();
  for (const course of catalog.courses) {
    const card = make('li', undefined, 'course-card');
    card.dataset.course = course.id;
    const article = make('article');
    const heading = make('h3', course.title);
    heading.id = `course-${course.id}`;
    article.setAttribute('aria-labelledby', heading.id);
    article.append(make('p', course.subject, 'subject-tag'), heading,
      make('p', `${course.questionCount} questions · ${course.conceptCount} concepts`, 'course-counts'),
      make('p', course.summary, 'course-summary'));
    const concepts = make('ul', undefined, 'concepts');
    concepts.setAttribute('aria-label', 'Concepts in this lesson');
    for (const concept of course.concepts) concepts.append(make('li', concept));
    article.append(concepts);
    const details = make('details', undefined, 'source-details');
    details.append(make('summary', 'Source and permission notes'));
    const notes = make('dl');
    notes.append(make('dt', 'Attribution'), make('dd', course.attribution),
      make('dt', 'Permission statement'), make('dd', course.license));
    details.append(notes);
    article.append(details);
    const actions = make('div', undefined, 'course-actions');
    const download = make('button', 'Download lesson (.json)', 'download-button');
    download.type = 'button';
    download.dataset.download = course.id;
    download.setAttribute('aria-label', `Download ${course.title} as a JSON lesson`);
    download.addEventListener('click', () => {
      let url;
      let link;
      try {
        const blob = new view.Blob([course.text], {type: 'application/json;charset=utf-8', endings: 'transparent'});
        url = view.URL.createObjectURL(blob);
        link = document.createElement('a');
        link.href = url;
        link.download = course.download;
        link.hidden = true;
        document.body.append(link);
        link.click();
        status.textContent = `Download requested: ${course.download}. In the learner, choose it under Bring your own lesson, review the preview, then select Start this deck.`;
      } catch {
        status.textContent = 'The download could not be started. Try again in a browser that supports local file downloads.';
      } finally {
        link?.remove();
        // Give the browser time to consume the object URL before releasing it.
        if (url) view.setTimeout(() => view.URL.revokeObjectURL(url), 30000);
      }
    });
    actions.append(download);
    for (const companion of course.links) {
      const link = make('a', companion.label, 'companion-link');
      link.href = `../${companion.path}`;
      link.target = '_blank';
      link.rel = 'noopener';
      actions.append(link);
    }
    article.append(actions);
    card.append(article);
    cards.set(course.id, card);
    list.append(card);
  }
  const update = () => {
    const matches = filterCourses(catalog.courses, {query: search.value, subject: subject.value});
    const ids = new Set(matches.map(course => course.id));
    for (const [id, card] of cards) card.hidden = !ids.has(id);
    count.textContent = `${matches.length} of ${catalog.courses.length} lessons`;
    empty.hidden = matches.length > 0;
    clear.disabled = !search.value && !subject.value;
  };
  search.addEventListener('input', update);
  subject.addEventListener('change', update);
  clear.addEventListener('click', () => {
    search.value = ''; subject.value = ''; update(); search.focus();
  });
  update();
}
