import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { parseDeck } from '../src/deck.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFile(resolve(root,path),'utf8');
const sha=text=>createHash('sha256').update(text).digest('hex');

test('the original12-question course validates through the unchanged learner contract', async()=>{
  const course=parseDeck(await read('courses/stable-matching.json'));
  assert.equal(course.items.length,12);
  assert.deepEqual(course.concepts,['Preference order','Blocking pairs','Deferred acceptance','Stable outcomes']);
  assert.deepEqual([0,1,2,3].map(index=>course.items.filter(item=>item.answer===index).length),[3,3,3,3]);
  assert.equal(new Set(course.items.map(item=>item.id)).size,12);
  assert(course.items.every(item=>item.explanation.length>100&&item.transfer.length>30));
});

test('standalone downloads preserve every course, guide and build-input byte',async()=>{
  const page=await read('courses/stable-matching-explorer.html');
  const match=page.match(/<script type="application\/json" id="stable-matching-payload">([\s\S]*?)<\/script>/);
  assert(match,'Embedded payload exists once');
  const payload=JSON.parse(match[1]);
  assert.equal(payload.courseText,await read('courses/stable-matching.json'));
  assert.equal(payload.guideText,await read('courses/stable-matching.md'));
  for(const [path,expected] of Object.entries(payload.sourceHashes))assert.equal(sha(await read(path)),expected,path);
  assert.equal(Object.keys(payload.sourceHashes).length,6);
  const module=page.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
  execFileSync(process.execPath,['--input-type=module','--check'],{input:module,encoding:'utf8'});
});

test('the maintained builder checks the exact committed standalone page without writing',()=>{
  const output=execFileSync(process.execPath,['tools/build-stable-matching.mjs','--check'],{cwd:root,encoding:'utf8'});
  assert.match(output,/matches every current input byte/);
});
