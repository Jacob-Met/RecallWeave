import { createCourseCatalog, filterCourseCatalog } from './course-catalog.mjs';

function catalogElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function requestCourseDownload(course, button, status) {
  let objectUrl = null;
  let anchor = null;
  button.disabled = true;
  status.textContent = '';
  try {
    objectUrl = URL.createObjectURL(new Blob([course.text], {
      type: 'application/json;charset=utf-8'
    }));
    anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = course.filename;
    anchor.hidden = true;
    document.body.append(anchor);
    anchor.click();
    status.textContent = 'Download requested: ' + course.filename + '. Choose it in the learner.';
  } catch {
    status.textContent = 'Download could not start. Try again.';
  } finally {
    if (anchor) anchor.remove();
    button.disabled = false;
    if (objectUrl) setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }
}

function createCourseCard(course) {
  const card = catalogElement('article', 'course-card');
  const titleId = 'course-' + course.filename.slice(0, -5);
  card.dataset.course = course.filename;
  card.setAttribute('aria-labelledby', titleId);

  const count = catalogElement('p', 'course-count',
    course.questionCount + ' questions · ' + course.concepts.length + ' concepts');
  const title = catalogElement('h3', 'course-title', course.title);
  title.id = titleId;
  const concepts = catalogElement('ul', 'course-concepts');
  concepts.setAttribute('aria-label', 'Concepts in this course');
  for (const concept of course.concepts) {
    concepts.append(catalogElement('li', '', concept));
  }

  const preview = catalogElement('details', 'course-detail');
  preview.append(catalogElement('summary', '', 'A look at the questions'));
  const prompts = catalogElement('ol', 'course-preview');
  for (const prompt of course.preview) {
    prompts.append(catalogElement('li', '', prompt));
  }
  preview.append(prompts);

  const credit = catalogElement('details', 'course-detail');
  credit.append(catalogElement('summary', '', 'Source and permissions'));
  credit.append(
    catalogElement('h4', '', 'Source'),
    catalogElement('p', 'course-attribution', course.attribution),
    catalogElement('h4', '', 'Permissions'),
    catalogElement('p', 'course-license', course.license)
  );

  const footer = catalogElement('div', 'course-download');
  const button = catalogElement('button', 'download-button', 'Download course (.json)');
  button.type = 'button';
  button.dataset.download = course.filename;
  button.setAttribute('aria-label', 'Download ' + course.title + ' (.json)');
  const filename = catalogElement('span', 'course-filename', course.filename);
  const status = catalogElement('p', 'download-status');
  status.dataset.downloadStatus = '';
  status.setAttribute('role', 'status');
  button.addEventListener('click', () => requestCourseDownload(course, button, status));
  footer.append(button, filename, status);

  card.append(count, title, concepts, preview, credit, footer);
  return card;
}

function initializeCourseCatalog() {
  const search = document.querySelector('#catalog-search');
  const results = document.querySelector('#catalog-results');
  const message = document.querySelector('#catalog-message');
  try {
    const courses = createCourseCatalog(
      JSON.parse(document.querySelector('#course-data').textContent)
    );
    const cards = new Map(courses.map(course => [course, createCourseCard(course)]));
    results.replaceChildren(...cards.values());
    document.querySelector('#catalog-total').textContent =
      courses.length + ' supplied courses';
    const applySearch = () => {
      const matches = new Set(filterCourseCatalog(courses, search.value));
      for (const [course, card] of cards) card.hidden = !matches.has(course);
      if (!matches.size) {
        message.textContent = 'No courses match this search. Try another title or concept.';
      } else if (!search.value.trim()) {
        message.textContent = courses.length + ' courses available.';
      } else {
        message.textContent = matches.size + ' of ' + courses.length + ' courses match.';
      }
    };
    search.addEventListener('input', applySearch);
    search.disabled = false;
    applySearch();
  } catch {
    results.replaceChildren();
    search.disabled = true;
    message.textContent = 'The course catalog could not load. Use a fresh copy of catalog.html.';
  }
}

initializeCourseCatalog();
