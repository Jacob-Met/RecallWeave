import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { validateDeck } from '../src/deck.mjs';
const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');
const [model,ui,template,course,guide]=await Promise.all(['src/numerical-differentiation.mjs','src/numerical-differentiation-ui.mjs','courses/numerical-differentiation-lab.template.html','courses/numerical-differentiation.json','courses/numerical-differentiation.md'].map(read));
validateDeck(JSON.parse(course));
const importLine="import { analyzeDifferentiation, serializeDifferentiation, DIFFERENCE_METHODS } from './numerical-differentiation.mjs';";
if(!ui.startsWith(importLine+'\n'))throw new Error('Unexpected UI module boundary.');
const modelBody=model.replace(/^export (const|function) /gm,'$1 ');
if(/^\s*(import|export)\s/m.test(modelBody))throw new Error('Unexpected model module declaration.');
const code=`const {analyzeDifferentiation,serializeDifferentiation,DIFFERENCE_METHODS}=(()=>{\n${modelBody}\nreturn {analyzeDifferentiation,serializeDifferentiation,DIFFERENCE_METHODS};\n})();\n${ui.slice(importLine.length)}`;
if(/<\/script/i.test(code))throw new Error('Embedded code contains a closing script tag.');
let html=template;
for(const [marker,value]of [['/* COURSE_TEXT */',JSON.stringify(course).replaceAll('<','\\u003c')],['/* GUIDE_TEXT */',JSON.stringify(guide).replaceAll('<','\\u003c')],['/* MODEL_AND_UI */',code]]){
 if(html.split(marker).length!==2)throw new Error('Expected exactly one '+marker);
 html=html.replace(marker,()=>value);
}
const target=new URL('courses/numerical-differentiation-lab.html',root);
if(process.argv.includes('--check')){
 if(await readFile(target,'utf8')!==html)throw new Error('Lab is stale; run node tools/build-numerical-differentiation.mjs.');
}else await writeFile(target,html);
console.log(JSON.stringify({path:fileURLToPath(target),bytes:Buffer.byteLength(html),check:process.argv.includes('--check')}));
