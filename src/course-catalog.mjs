/** A bounded, explicit index of existing lesson files. Course text stays unchanged. */
import {parseDeck} from './deck.mjs';

export const CATALOG_FORMAT = 'recallweave-course-catalog/1';

function catalogText(value, name, limit) {
  if (typeof value !== 'string' || !value.trim() || value.length > limit) {
    throw new Error(`${name} must be nonempty text of at most ${limit} characters.`);
  }
  return value;
}

function catalogRecord(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${name} must be an object.`);
  }
  return value;
}

/** Manifest paths are repository-relative files, never URLs or parent traversals. */
export function validateCatalogManifest(value) {
  const input = catalogRecord(value, 'Catalog');
  if (input.format !== CATALOG_FORMAT) throw new Error(`Use catalog format ${CATALOG_FORMAT}.`);
  if (!Array.isArray(input.courses) || input.courses.length < 1 || input.courses.length > 100) {
    throw new Error('The catalog must contain 1–100 course entries.');
  }
  const ids = new Set();
  const paths = new Set();
  const downloads = new Set();
  const courses = input.courses.map((value, index) => {
    const entry = catalogRecord(value, `Course ${index + 1}`);
    if (typeof entry.id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(entry.id)) {
      throw new Error('A course ID must be 1–64 lowercase letters, digits or hyphens.');
    }
    if (typeof entry.deck !== 'string' || !/^(data|courses)\/[a-z0-9][a-z0-9-]*\.json$/.test(entry.deck)) {
      throw new Error(`Invalid lesson file path for ${entry.id}.`);
    }
    if (typeof entry.download !== 'string' || !/^[a-z0-9][a-z0-9-]*\.json$/.test(entry.download)) {
      throw new Error(`Invalid download filename for ${entry.id}.`);
    }
    if (ids.has(entry.id) || paths.has(entry.deck) || downloads.has(entry.download)) {
      throw new Error('Course IDs, lesson paths and download filenames must each be unique.');
    }
    ids.add(entry.id); paths.add(entry.deck); downloads.add(entry.download);
    if (!Array.isArray(entry.links) || entry.links.length > 3) throw new Error('Use at most three companion links per course.');
    const links = entry.links.map((value, linkIndex) => {
      const link = catalogRecord(value, `Companion ${linkIndex + 1}`);
      if (typeof link.path !== 'string' || !/^(courses|docs)\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*\.(html|md)$/.test(link.path)) {
        throw new Error(`Invalid companion file path for ${entry.id}.`);
      }
      return Object.freeze({label: catalogText(link.label, 'Companion label', 80), path: link.path});
    });
    return Object.freeze({
      id: entry.id, deck: entry.deck, download: entry.download,
      subject: catalogText(entry.subject, 'Subject', 80),
      summary: catalogText(entry.summary, 'Summary', 240), links: Object.freeze(links)
    });
  });
  return Object.freeze({format: CATALOG_FORMAT, courses: Object.freeze(courses)});
}

/** Metadata comes from the shared deck parser; downloadable text is kept verbatim. */
export function createCatalog(manifestValue, deckTexts) {
  const manifest = validateCatalogManifest(manifestValue);
  if (!(deckTexts instanceof Map)) throw new Error('Supply lesson text in a Map keyed by its repository path.');
  const courses = manifest.courses.map(entry => {
    const text = deckTexts.get(entry.deck);
    if (typeof text !== 'string') throw new Error(`Missing lesson text: ${entry.deck}`);
    let deck;
    try { deck = parseDeck(text); }
    catch (error) { throw new Error(`${entry.deck}: ${error.message}`); }
    return Object.freeze({
      ...entry, title: deck.title, concepts: deck.concepts,
      questionCount: deck.items.length, conceptCount: deck.concepts.length,
      attribution: deck.attribution, license: deck.license,
      bytes: new TextEncoder().encode(text).length, text
    });
  });
  return Object.freeze({format: CATALOG_FORMAT, courses: Object.freeze(courses)});
}

export function catalogSubjects(courses) {
  return [...new Set(courses.map(course => course.subject))].sort();
}

/** Every whitespace-separated search term must occur literally in the course index. */
export function filterCourses(courses, {query = '', subject = ''} = {}) {
  const terms = query.trim().toLowerCase().split(/\s+/u).filter(Boolean);
  return courses.filter(course => {
    if (subject && course.subject !== subject) return false;
    const text = [course.title, course.subject, course.summary, ...course.concepts].join('\n').toLowerCase();
    return terms.every(term => text.includes(term));
  });
}

/** Keep authored HTML-like text inside the JSON data element, without changing it. */
export function catalogJsonForHtml(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}
