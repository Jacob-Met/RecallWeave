#!/usr/bin/env node
/** Rebuild only this lesson's dependency-free standalone file. */
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const embedded=s=>JSON.stringify(s).replaceAll('<','\\u003c').replaceAll('\u2028','\\u2028').replaceAll('\u2029','\\u2029');
export function buildEquilibriumLab(){
  const read=p=>fs.readFileSync(path.join(root,p),'utf8');
  const template=read('templates/chemical-equilibrium-lab.html');
  const marker='__CHEMICAL_EQUILIBRIUM_SCRIPT__';
  if(template.split(marker).length!==2)throw new Error('Expected one standalone script marker.');
  const core=read('src/chemical-equilibrium.mjs').replace(/^export (function|const) /gm,'$1 ');
  const sourceUI=read('src/chemical-equilibrium-ui.mjs');
  const importLine="import {solveEquilibrium,sampleExtent} from './chemical-equilibrium.mjs';\n";
  if(sourceUI.split(importLine).length!==2)throw new Error('The UI model import changed.');
  const ui=sourceUI.replace(importLine,'').replace(/^export (function|const) /gm,'$1 ');
  const course=read('courses/chemical-equilibrium.json'),guide=read('courses/chemical-equilibrium.md');
  const script='const EQ_COURSE_RAW = '+embedded(course)+';\nconst EQ_GUIDE_RAW = '+embedded(guide)+';\n'+core+'\n'+ui+'\nmountEquilibriumLab(document,{courseRaw:EQ_COURSE_RAW,guideRaw:EQ_GUIDE_RAW});\n';
  if(/<\/script/i.test(script))throw new Error('An embedded source would terminate its script element.');
  return template.replace(marker,()=>script);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const out=path.join(root,'courses/chemical-equilibrium-lab.html'),html=buildEquilibriumLab();
  fs.writeFileSync(out,html);
  console.log(JSON.stringify({output:out,bytes:Buffer.byteLength(html)}));
}
