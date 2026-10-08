import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const root = fileURLToPath(new URL('../',import.meta.url));
const read = path => readFileSync(resolve(root,path),'utf8');
const model = read('src/prefix-coding.mjs').replace(/^export /gm,'');
const ui = read('src/prefix-coding-ui.mjs').replace(/^import [^\n]+\n/,'').replace(/^export /gm,'');
const deck = read('courses/prefix-coding.json');
const literal = JSON.stringify(deck).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
let html = read('templates/prefix-coding-explorer.html');
for (const [marker,text] of [['/* PREFIX_MODEL */',model],['/* PREFIX_DECK */','const LESSON_JSON = '+literal+';'],['/* PREFIX_UI */',ui]]) {
  if (html.split(marker).length !== 2) throw new Error('Expected one build marker '+marker);
  html = html.replace(marker,()=>text.replace(/<\/script/gi,'<\\/script'));
}
const target=resolve(root,'courses/prefix-coding-explorer.html');
if(process.argv.includes('--check')) {
  if(readFileSync(target,'utf8')!==html)throw new Error('Rebuild the prefix-coding explorer.');
  console.log('Prefix-coding standalone matches its exact sources.');
} else { writeFileSync(target,html);console.log('Built '+target); }
