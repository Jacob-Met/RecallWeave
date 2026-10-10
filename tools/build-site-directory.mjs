#!/usr/bin/env node
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCourseCatalog, validateCatalogPaths } from '../src/course-catalog.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const escape = value => String(value).replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[c]);

/** Inventory the published courses and require an explicit, complete lab mapping. */
export async function siteInventory(root = ROOT) {
  const read = path => readFile(resolve(root, path), 'utf8');
  const files = (await readdir(resolve(root, 'courses'))).sort();
  const paths = validateCatalogPaths(JSON.parse(await read('catalog/courses.json')));
  const canonical = files.filter(name => /^[a-z0-9-]+\.json$/.test(name)).map(name => 'courses/' + name);
  if (JSON.stringify(paths.slice().sort()) !== JSON.stringify(canonical)) {
    throw new Error('Register every canonical course in catalog/courses.json before building the site.');
  }
  const companions = JSON.parse(await read('catalog/companions.json'));
  if (!companions || typeof companions !== 'object' || Array.isArray(companions) ||
      JSON.stringify(Object.keys(companions).sort()) !== JSON.stringify(canonical)) {
    throw new Error('catalog/companions.json must map every registered course, including those without labs.');
  }
  const publishedLabs = files.filter(name => name.endsWith('.html') &&
    !name.includes('.template.') && !name.endsWith('-template.html')).map(name => 'courses/' + name);
  const linked = new Set();
  const courses = createCourseCatalog(await Promise.all(paths.map(async path => ({ path, text: await read(path) }))));
  const entries = await Promise.all(courses.map(async course => {
    const guide = course.path.replace(/\.json$/, '.md');
    await read(guide);
    const labs = companions[course.path];
    if (!Array.isArray(labs)) throw new Error('Each course needs an array of companion paths.');
    const labEntries = await Promise.all(labs.map(async path => {
      if (!publishedLabs.includes(path) || linked.has(path)) {
        throw new Error('Companion paths must name unique published labs: ' + path);
      }
      linked.add(path);
      const html = await read(path);
      const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1];
      if (!title) throw new Error('Lab needs a document title: ' + path);
      // Only the handful of entities allowed in document titles are decoded;
      // the value is escaped again when rendered as HTML text.
      const label = title.replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'")
        .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/\s*(?:·|—|\|)\s*RecallWeave.*$/i, '').trim();
      return { path, title: label };
    }));
    return { path: course.path, title: course.title, questionCount: course.questionCount,
      concepts: course.concepts, guide, labs: labEntries };
  }));
  if (linked.size !== publishedLabs.length) throw new Error('Every published lab must be linked from catalog/companions.json.');
  return { courses: entries, labCount: linked.size };
}

export function renderCourseCards(courses) {
  return courses.map(course => `<article class="course-card" data-course data-lab="${course.labs.length > 0}" data-search="${escape([course.title, ...course.concepts].join(' ').toLowerCase())}">
  <div class="course-top"><span>${course.questionCount} questions · ${course.concepts.length} concepts</span>${course.labs.length ? '<span class="lab-tag">Interactive lab</span>' : ''}</div>
  <h3>${escape(course.title)}</h3>
  <p class="concepts">${course.concepts.map(escape).join(' · ')}</p>
  ${course.labs.length ? '<ul class="lab-links">' + course.labs.map(lab => `<li><a href="${escape(lab.path)}">${escape(lab.title)} <span aria-hidden="true">↗</span></a></li>`).join('') + '</ul>' : '<p class="guide-note">Study the course and work through its companion guide.</p>'}
  <div class="course-actions"><a href="${escape(course.path)}" download>Download course <span aria-hidden="true">↓</span></a><a href="https://github.com/Jacob-Met/RecallWeave/blob/main/${escape(course.guide)}">Read worked guide <span aria-hidden="true">↗</span></a></div>
</article>`).join('\n');
}

export async function buildSiteDirectory(root = ROOT) {
  const inventory = await siteInventory(root);
  const [template, css, script] = await Promise.all(['site/template.html', 'site/site.css', 'site/directory.js']
    .map(path => readFile(resolve(root, path), 'utf8')));
  const replacements = {
    '{{SITE_CSS}}': css.trimEnd(), '{{SITE_SCRIPT}}': script.trimEnd(),
    '{{COURSE_COUNT}}': inventory.courses.length, '{{LAB_COUNT}}': inventory.labCount,
    '{{COURSE_CARDS}}': renderCourseCards(inventory.courses)
  };
  let html = template;
  for (const [marker, value] of Object.entries(replacements)) {
    if (!html.includes(marker)) throw new Error('Missing site template marker: ' + marker);
    html = html.split(marker).join(String(value));
  }
  return html;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length > 1 || (args.length && args[0] !== '--check')) throw new Error('Usage: node tools/build-site-directory.mjs [--check]');
    const html = await buildSiteDirectory();
    const destination = resolve(ROOT, 'explore.html');
    if (args[0] === '--check') {
      if (await readFile(destination, 'utf8') !== html) throw new Error('explore.html is stale. Run node tools/build-site-directory.mjs.');
      console.log('explore.html covers every published course, lab and worked guide.');
    } else {
      await writeFile(destination, html, 'utf8');
      console.log('Built explore.html from the validated repository inventory.');
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
