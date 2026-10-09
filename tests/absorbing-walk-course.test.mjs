import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseDeck,serializeDeck} from '../src/deck.mjs';
const root=new URL('../',import.meta.url);
test('original strict parser accepts all twelve original course questions and round trips them',async()=>{
 const text=await readFile(new URL('courses/absorbing-walk.json',root),'utf8');
 const course=parseDeck(text);assert.equal(course.items.length,12);assert.equal(course.concepts.length,6);
 assert.deepEqual(parseDeck(serializeDeck(course)),course);
 assert.equal(course.items.filter(x=>x.prerequisites.length>0).length,10);
 assert.ok(course.items.every(x=>x.explanation.length>80&&x.transfer.length>30));
 assert.ok(text.endsWith('\n'));
});
test('standalone embeds complete exact course and guide with no runtime dependency',async()=>{
 const html=await readFile(new URL('courses/absorbing-walk-lab.html',root),'utf8');
 for(const [id,path]of[['course-bytes','courses/absorbing-walk.json'],['guide-bytes','courses/absorbing-walk.md']]){
  const match=html.match(new RegExp('<script id="'+id+'"[^>]*>([A-Za-z0-9+/=]+)</script>'));
  assert.ok(match,id);assert.deepEqual(Buffer.from(match[1],'base64'),await readFile(new URL(path,root)));
 }
 assert.doesNotMatch(html,/<script[^>]+src=|<link[^>]+href=|@import|fetch\(|localStorage|sessionStorage|Math\.random/);
 assert.doesNotMatch(html,/__(MODEL|UI|COURSE_BASE64|GUIDE_BASE64)__/);
});
