import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {parseDeck} from '../src/deck.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const model=read('src/polynomial-interpolation.mjs');
const ui=read('src/polynomial-interpolation-ui.mjs');
const course=read('courses/polynomial-interpolation.json'),guide=read('courses/polynomial-interpolation.md');
const accepted={
 'src/polynomial-interpolation.mjs':'8647e22022f5809d1b72ed0a5e37ca74f7f12463efa9b80b18415112631a4037',
 'courses/polynomial-interpolation.json':'1c06eb1ee07b4fe48f41a760a14c240d486479fbf1f1624e6d2d239993ee6649',
 'courses/polynomial-interpolation.md':'6bc5e287e7d66a4ee8b89f25650d7c726ec7a1696728599c164ac0a180cfe3d8'
};
for(const [p,sha]of Object.entries(accepted))if(createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex')!==sha)throw new Error('Accepted source changed: '+p);
if(parseDeck(course).items.length!==18)throw new Error('Expected the accepted18-question lesson.');
const dependency="import {interpolatePolynomial} from './polynomial-interpolation.mjs';";
if(!ui.startsWith(dependency))throw new Error('Unexpected UI import boundary.');
const plain=s=>s.replace(/^export /gm,'');
const resources=JSON.stringify({course,guide}).replace(/</g,'\\u003c');
const program=plain(model)+'\n'+plain(ui.slice(dependency.length))+'\nconst embeddedResources='+resources+';\nmountInterpolation(document,embeddedResources);\n';
if(/<\/script/i.test(program))throw new Error('Unescaped script delimiter.');
const template=read('templates/polynomial-interpolation-explorer.html'),marker='/*__INTERPOLATION_PROGRAM__*/';
if(template.split(marker).length!==2)throw new Error('Expected exactly one program marker.');
const output=template.replace(marker,program),target=path.join(root,'courses/polynomial-interpolation-explorer.html');
if(process.argv.slice(2).length>1||process.argv[2]&&process.argv[2]!=='--check')throw new Error('Use no arguments or --check.');
if(process.argv[2]==='--check'){if(fs.readFileSync(target,'utf8')!==output)throw new Error('Explorer is stale.');}
else fs.writeFileSync(target,output);
console.log(JSON.stringify({bytes:Buffer.byteLength(output),sha256:createHash('sha256').update(output).digest('hex'),acceptedSources:Object.keys(accepted),mode:process.argv[2]||'build'}));
