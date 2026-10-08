import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {validateDeck} from '../src/deck.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2);
if(args.length>1||args.some(arg=>arg!=='--check')) throw new Error('Use no arguments, or --check.');
const inputs={
  template:'templates/momentum-collisions-explorer.html',
  course:'courses/momentum-collisions.json',
  guide:'courses/momentum-collisions.md',
  model:'src/momentum-collisions.mjs',
  ui:'src/momentum-collisions-ui.mjs'
};
const values=Object.fromEntries(await Promise.all(Object.entries(inputs).map(async ([name,path])=>
  [name,await readFile(resolve(root,path),'utf8')])));
validateDeck(JSON.parse(values.course));
const importLine="import {COLLISION_PRESETS, analyzeCollision, formatFraction, serializeCollision} from './momentum-collisions.mjs';\n";
if(!values.ui.startsWith(importLine)||values.ui.slice(importLine.length).split('\n').some(line=>line.trimStart().startsWith('import ')))
  throw new Error('Unexpected momentum UI import boundary.');
const model=values.model.replace(/^export (?=function|const)/gm,'');
const script='const {COLLISION_PRESETS, analyzeCollision, formatFraction, serializeCollision} = (() => {\n'+model+
  '\nreturn {COLLISION_PRESETS, analyzeCollision, formatFraction, serializeCollision};\n})();\n'+values.ui.slice(importLine.length);
if(script.toLowerCase().includes('<'+'/script')) throw new Error('Source must not close its script element.');
let html=values.template;
for(const [marker,value] of Object.entries({
  '@@COURSE_TEXT@@':JSON.stringify(values.course).replaceAll('<','\\u003c'),
  '@@GUIDE_TEXT@@':JSON.stringify(values.guide).replaceAll('<','\\u003c'),
  '@@SCRIPT@@':script
})){
  if(html.split(marker).length!==2) throw new Error('Template marker must occur exactly once: '+marker);
  html=html.replace(marker,()=>value);
}
const target=resolve(root,'courses/momentum-collisions-explorer.html');
if(args.includes('--check')){
  if(await readFile(target,'utf8')!==html) throw new Error('Rebuild the momentum and collisions explorer.');
  console.log('Momentum and collisions explorer matches its exact source inputs.');
}else{
  await writeFile(target,html,'utf8');
  console.log('Built courses/momentum-collisions-explorer.html');
}
