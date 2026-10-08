import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {validateDeck} from '../src/deck.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2);
if(args.length>1||args.some(a=>a!=='--check'))throw new Error('Use no arguments, or --check.');
const input={template:'courses/rates-accumulation-explorer.template.html',deck:'courses/rates-accumulation.json',guide:'courses/rates-accumulation.md',model:'src/rates-accumulation.mjs',ui:'src/rates-accumulation-ui.mjs'};
const values=Object.fromEntries(await Promise.all(Object.entries(input).map(async([key,path])=>[key,await readFile(resolve(root,path),'utf8')])));
validateDeck(JSON.parse(values.deck));
const importLine="import { RATE_PRESETS, analyzeMotion, serializeMotion } from './rates-accumulation.mjs';\n";
if(!values.ui.startsWith(importLine)||values.ui.slice(importLine.length).split('\n').some(line=>line.trimStart().startsWith('import ')))throw new Error('Unexpected rates UI import boundary.');
const model=values.model.replace(/^export (?=function|const)/gm,'');
const script='const { RATE_PRESETS, analyzeMotion, serializeMotion } = (() => {\n'+model+'\nreturn { RATE_PRESETS, analyzeMotion, serializeMotion };\n})();\n'+values.ui.slice(importLine.length);
if(script.toLowerCase().includes('<'+'/script'))throw new Error('Source must not close its script element.');
let html=values.template;
for(const [marker,value]of Object.entries({'@@DECK_JSON@@':JSON.stringify(values.deck).replaceAll('<','\\u003c'),'@@GUIDE_JSON@@':JSON.stringify(values.guide).replaceAll('<','\\u003c'),'@@SCRIPT@@':script})){
  if(html.split(marker).length!==2)throw new Error('Template marker must occur exactly once: '+marker);
  html=html.replace(marker,()=>value);
}
const target=resolve(root,'courses/rates-accumulation-explorer.html');
if(args.includes('--check')){
  if(await readFile(target,'utf8')!==html)throw new Error('Rebuild the rates and accumulation explorer.');
  console.log('Rates and accumulation explorer matches its exact source inputs.');
}else{await writeFile(target,html,'utf8');console.log('Built courses/rates-accumulation-explorer.html');}
