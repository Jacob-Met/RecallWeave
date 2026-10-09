#!/usr/bin/env node
/** Reproducible offline lab, using only Node built-ins. */
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {parseDeck} from '../src/deck.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFile(resolve(root,path),'utf8');
const course=await read('courses/absorbing-walk.json');
parseDeck(course);
const guide=await read('courses/absorbing-walk.md');
const model=(await read('src/absorbing-walk.mjs')).replace(/^export /gm,'');
const ui=(await read('src/absorbing-walk-ui.mjs')).replace(/^import .*;\r?\n/gm,'');
for(const text of [model,ui])if(/<\/script/i.test(text))throw new Error('Embedded source cannot contain a closing script element.');
let html=await read('templates/absorbing-walk-lab.html');
for(const [marker,value] of [
 ['__COURSE_BASE64__',Buffer.from(course,'utf8').toString('base64')],
 ['__GUIDE_BASE64__',Buffer.from(guide,'utf8').toString('base64')],
 ['__MODEL__',model],['__UI__',ui]
]){
 if(html.split(marker).length!==2)throw new Error('Expected one template marker: '+marker);
 html=html.replace(marker,()=>value);
}
await writeFile(resolve(root,'courses/absorbing-walk-lab.html'),html,'utf8');
console.log('Built courses/absorbing-walk-lab.html ('+Buffer.byteLength(html)+' bytes)');
