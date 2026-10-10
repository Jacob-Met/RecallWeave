import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, cp, rm, readdir, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';
import { siteInventory, buildSiteDirectory, renderCourseCards } from '../tools/build-site-directory.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));

test('published directory covers every course, guide and non-template lab exactly once', async () => {
  const inventory = await siteInventory();
  const files = await readdir(join(root, 'courses'));
  assert.equal(inventory.courses.length, files.filter(name => /^[a-z0-9-]+\.json$/.test(name)).length);
  const labs = inventory.courses.flatMap(course => course.labs.map(lab => lab.path));
  assert.equal(labs.length, inventory.labCount);
  assert.equal(new Set(labs).size, labs.length);
  assert.ok(inventory.courses.some(course => course.labs.length === 0));
  assert.ok(inventory.courses.some(course => course.labs.length === 2));
  for (const course of inventory.courses) await access(join(root, course.guide));
  const html = await buildSiteDirectory();
  assert.equal(await readFile(join(root, 'explore.html'), 'utf8'), html);
  for (const match of html.matchAll(/href="([^"]+)"/g)) {
    if (!match[1].startsWith('#') && !match[1].startsWith('https://')) await access(join(root, match[1]));
  }
  for (const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) assert.doesNotThrow(() => new Script(match[1]));
});

test('course titles and lab labels remain literal text in directory cards', () => {
  const html = renderCourseCards([{path:'courses/safe.json', title:'<img src=x onerror=alert(1)>',
    questionCount:1, concepts:['" data-search="bad'], guide:'courses/safe.md',
    labs:[{path:'courses/safe.html', title:'</a><script>bad()</script>'}]}]);
  assert.ok(!html.includes('<img'));
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;img'));
  assert.ok(html.includes('&quot; data-search=&quot;bad'));
});

test('a newly added course or lab fails the build until it is discoverable', async () => {
  const fixture = await mkdtemp(join(tmpdir(), 'recallweave-site-'));
  try {
    await cp(join(root, 'courses'), join(fixture, 'courses'), {recursive:true});
    await mkdir(join(fixture, 'catalog'));
    for (const file of ['courses.json', 'companions.json']) await cp(join(root, 'catalog', file), join(fixture, 'catalog', file));
    await writeFile(join(fixture, 'courses', 'new-course.json'), await readFile(join(root, 'courses', 'binary-search.json')));
    await assert.rejects(siteInventory(fixture), /Register every canonical course/);
    await rm(join(fixture, 'courses', 'new-course.json'));
    await writeFile(join(fixture, 'courses', 'new-lab.html'), '<title>New lab</title>');
    await assert.rejects(siteInventory(fixture), /Every published lab/);
    await rm(join(fixture, 'courses', 'new-lab.html'));
    const mapping = JSON.parse(await readFile(join(fixture, 'catalog', 'companions.json'), 'utf8'));
    mapping['courses/binary-search.json'] = ['../index.html'];
    await writeFile(join(fixture, 'catalog', 'companions.json'), JSON.stringify(mapping));
    await assert.rejects(siteInventory(fixture), /unique published labs/);
  } finally { await rm(fixture, {recursive:true, force:true}); }
});
