import { readFile, writeFile } from 'node:fs/promises';

// Keep the directly openable explorer's download identical to the course file.
// No app, importer, learning-model or other course file is rebuilt here.
const course = await readFile(new URL('../courses/vector-geometry.json', import.meta.url), 'utf8');
JSON.parse(course);
const destination = new URL('../courses/vector-geometry-explorer.html', import.meta.url);
const html = await readFile(destination, 'utf8');
const block = /(<script id="course-data" type="application\/json">)[\s\S]*?(<\/script>)/g;
if ([...html.matchAll(block)].length !== 1) throw new Error('Expected one embedded course download block.');
const updated = html.replace(block, (_, before, after) => before + course.trimEnd().replaceAll('<', '\\u003c') + '\n' + after);
await writeFile(destination, updated);
console.log('Embedded vector-geometry.json in the standalone explorer.');
