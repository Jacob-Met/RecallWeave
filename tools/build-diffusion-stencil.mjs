import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseDeck} from '../src/deck.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function buildDiffusion(rootPath=root){
 const read=p=>fs.readFileSync(path.join(rootPath,p),'utf8');
 const template=read('templates/diffusion-stencil-lab.html'),model=read('src/diffusion-stencil.mjs'),ui=read('src/diffusion-stencil-ui.mjs');
 const course=read('courses/diffusion-stencil.json'),guide=read('courses/diffusion-stencil.md');parseDeck(course);
 for(const [name,text]of [['model',model],['UI',ui]])if(/<\/script/i.test(text))throw new Error(name+' contains a script closing tag.');
 const jsString=value=>JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
 const assets='const DIFFUSION_COURSE_TEXT = '+jsString(course)+';\nconst DIFFUSION_GUIDE_TEXT = '+jsString(guide)+';';
 const parts=[['/*MODEL*/',model.replace('export function computeDiffusion','function computeDiffusion')],['/*ASSETS*/',assets],['/*UI*/',ui.replace(/^import .*;\r?\n/,'')]];
 let output=template;for(const [marker,text]of parts){if(output.split(marker).length!==2)throw new Error('Expected exactly one '+marker);output=output.replace(marker,()=>text);}
 return output;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const output=buildDiffusion(),destination=path.join(root,'courses/diffusion-stencil-lab.html');
 if(process.argv.slice(2).some(x=>x!=='--check'))throw new Error('Usage: node tools/build-diffusion-stencil.mjs [--check]');
 if(process.argv.includes('--check')){if(fs.readFileSync(destination,'utf8')!==output)throw new Error('Diffusion lab is stale.');}
 else fs.writeFileSync(destination,output,'utf8');
 console.log('Diffusion lab '+(process.argv.includes('--check')?'matches':'built')+' ('+Buffer.byteLength(output)+' bytes).');
}
