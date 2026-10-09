import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {parseDeck} from '../src/deck.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const read=p=>readFile(resolve(root,p),'utf8');
const [template,core,ui,course,guide]=await Promise.all([
  'courses/coalition-power-explorer.template.html','courses/coalition-power-core.mjs',
  'courses/coalition-power-explorer-ui.mjs','courses/coalition-power.json','courses/coalition-power.md'
].map(read));
parseDeck(course);
if (/<\/script/i.test(core+ui)) throw new Error('Inline source must not contain a script terminator.');
const quote=s=>JSON.stringify(s).replaceAll('<','\\u003c').replaceAll('\u2028','\\u2028').replaceAll('\u2029','\\u2029');
const output=template.replace('__CORE__',()=>core.replace(/^export /gm,''))
 .replace('__COURSE__',()=>quote(course)).replace('__GUIDE__',()=>quote(guide)).replace('__UI__',()=>ui);
if (/__(CORE|COURSE|GUIDE|UI)__/.test(output)) throw new Error('Unfilled build slot.');
const args=process.argv.slice(2);
if(args.length>1 || (args.length===1 && args[0]!=='--check')) throw new Error('Usage: node tools/build-coalition-power.mjs [--check]');
const path=resolve(root,'courses/coalition-power-explorer.html');
if(args[0]==='--check'){
 if(await readFile(path,'utf8')!==output) throw new Error('Generated explorer differs; regenerate it.');
 console.log('Exact coalition-power explorer build verified.');
}else{await writeFile(path,output);console.log('Built coalition-power explorer ('+Buffer.byteLength(output)+' bytes).');}
