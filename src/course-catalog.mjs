import { parseDeck } from './deck.mjs';

export const MAX_CATALOG_COURSES = 32;
const COURSE_PATH = /^courses\/[a-z0-9][a-z0-9-]*\.json$/;

/** Curated repository paths only; authoring source files are not course decks. */
export function validateCatalogPaths(paths) {
  if (!Array.isArray(paths) || paths.length < 1 || paths.length > MAX_CATALOG_COURSES) {
    throw new Error('The catalog must list 1–32 course files.');
  }
  const seen = new Set();
  return Object.freeze(paths.map(path => {
    if (typeof path !== 'string' || !COURSE_PATH.test(path)) {
      throw new Error('Catalog entries must name a JSON file directly inside courses/.');
    }
    if (seen.has(path)) throw new Error('Catalog course paths must be unique.');
    seen.add(path);
    return path;
  }));
}

/** Validate metadata while retaining the original file text for exact downloads. */
export function createCourseCatalog(sources) {
  if (!Array.isArray(sources)) throw new Error('Catalog sources must be an array.');
  const paths = validateCatalogPaths(sources.map(source => source?.path));
  return Object.freeze(sources.map((source, index) => {
    const text = source.text;
    const deck = parseDeck(text);
    return Object.freeze({
      path: paths[index],
      filename: paths[index].slice('courses/'.length),
      text,
      title: deck.title,
      questionCount: deck.items.length,
      concepts: deck.concepts,
      attribution: deck.attribution,
      license: deck.license,
      preview: Object.freeze(deck.items.slice(0, 3).map(item => item.prompt))
    });
  }));
}

/** Search the supplied title and concept labels without changing course order. */
export function filterCourseCatalog(courses, query) {
  const needle = String(query ?? '').trim().toLowerCase();
  if (!needle) return courses.slice();
  return courses.filter(course =>
    [course.title, ...course.concepts].some(value => value.toLowerCase().includes(needle)));
}
