import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {parseDeck} from '../src/deck.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const read=path=>readFile(resolve(root,path),'utf8');
const [template,core,ui,course]=await Promise.all(['courses/optimal-stopping-explorer.template.html','courses/optimal-stopping-core.mjs','courses/optimal-stopping-explorer-ui.mjs','courses/optimal-stopping.json'].map(read));
parseDeck(course);
for(const text of [core,ui])if(/<\/script/i.test(text))throw new Error('Inline source closes a script element.');
const escaped=JSON.stringify(course).replaceAll('<','\\u003c').replaceAll('\u2028','\\u2028').replaceAll('\u2029','\\u2029');
const output=template.replace('__CORE__',()=>core.replace(/^export /gm,'')).replace('__COURSE__',()=>escaped).replace('__UI__',()=>ui);
if(/__(CORE|COURSE|UI)__/.test(output))throw new Error('Unresolved template placeholder.');
const destination=resolve(root,'courses/optimal-stopping-explorer.html');
if(process.argv.slice(2).some(x=>x!=='--check'))throw new Error('Only --check is supported.');
if(process.argv.includes('--check')){if(await readFile(destination,'utf8')!==output)throw new Error('Generated explorer differs.');console.log('Exact explorer source/course parity passes.');}
else {await writeFile(destination,output);console.log('Built '+destination);}
