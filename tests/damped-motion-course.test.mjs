import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve, dirname} from 'node:path';
import vm from 'node:vm';
import {parseDeck, serializeDeck} from '../src/deck.mjs';
import {renderLab, buildLab} from '../tools/build-damped-motion.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFile(resolve(root,path),'utf8');
test('original course is accepted and preserved by the unchanged learner codec',async()=>{
  const deck=parseDeck(await read('courses/damped-motion.json'));
  assert.equal(deck.items.length,16); assert.equal(deck.concepts.length,4);
  assert.deepEqual(parseDeck(serializeDeck(deck)),deck);
  for(const concept of deck.concepts)
    assert.equal(deck.items.filter(item=>item.concept===concept).length,4);
});
test('standalone file is exact and its complete inline script parses',async()=>{
  const html=await renderLab(root);
  assert.equal(html,await read('courses/damped-motion-lab.html'));
  const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length,1);
  new vm.Script(scripts[0][1],{filename:'damped-motion-lab.html'});
  assert.doesNotMatch(html,/\{\{DAMPED_MOTION_/);
  assert.doesNotMatch(html,/<(?:script|link|iframe)[^>]+(?:src|href)\s*=/i);
  assert.equal((await buildLab({root,check:true})).checked,true);
});
test('standalone course and guide constants retain exact downloadable source bytes',async()=>{
  const html=await renderLab(root);
  for(const [constant,path] of [
    ['DAMPED_MOTION_COURSE_TEXT','courses/damped-motion.json'],
    ['DAMPED_MOTION_GUIDE_TEXT','courses/damped-motion.md'],
  ]) {
    const prefix='const '+constant+' = ';
    const line=html.split('\n').find(value=>value.startsWith(prefix));
    assert.ok(line);
    assert.equal(JSON.parse(line.slice(prefix.length,-1)),await read(path));
  }
});
