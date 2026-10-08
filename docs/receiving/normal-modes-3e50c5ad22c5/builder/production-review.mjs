import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,cp,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import vm from 'node:vm';

const packet=dirname(fileURLToPath(import.meta.url));
const [candidateArg,runName,freezeArg]=process.argv.slice(2);
assert.ok(candidateArg&&runName,'Supply candidate root, fresh run name, and optional final-freeze path.');
assert.match(runName,/^[a-zA-Z0-9_-]+$/,'Use one fresh directory name.');
const candidate=resolve(candidateArg),work=join(packet,runName),snapshot=join(work,'candidate');
const freezePath=resolve(freezeArg||join(packet,'production-final-freeze.json'));
const freezeBytes=await readFile(freezePath),freeze=JSON.parse(freezeBytes);
const controlsBytes=await readFile(join(packet,'production-expected-controls.json'));
const controlsFreeze=JSON.parse(await readFile(join(packet,'production-controls-freeze.json'),'utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
assert.equal(hash(controlsBytes),controlsFreeze.sha256);
await mkdir(work);await mkdir(snapshot);
const startedAt=new Date().toISOString();
const sourceBefore=[];
for(const expected of freeze.files){
 const bytes=await readFile(join(candidate,expected.path));
 assert.equal(hash(bytes),expected.sha256,expected.path+' frozen source');
 assert.equal(bytes.length,expected.bytes,expected.path+' frozen length');
 await mkdir(dirname(join(snapshot,expected.path)),{recursive:true});
 await writeFile(join(snapshot,expected.path),bytes,{flag:'wx'});
 sourceBefore.push({...expected});
}
const {renderLab,buildLab}=await import(pathToFileURL(join(snapshot,'tools/build-normal-modes.mjs')).href);
const {renderLab:originalRender}=await import(pathToFileURL(join(packet,'original/implementation/tools/build-normal-modes.mjs')).href);
const inputs=['courses/normal-modes-lab.template.html','courses/normal-modes-core.mjs','courses/normal-modes-ui.mjs','courses/normal-modes.json','courses/normal-modes.md'];
const inputText=Object.fromEntries(await Promise.all(inputs.map(async path=>[path,await readFile(join(snapshot,path),'utf8')])));
const [template,core,ui,deck,guide]=inputs.map(path=>inputText[path]);
const results=[];
async function check(name,fn){try{const detail=await fn();results.push({name,pass:true,...detail});}catch(error){results.push({name,pass:false,error:{name:error.name,message:error.message,stack:error.stack}});}}

function independentProgram(text){
 const declarations=['export const ','export function ','export class '];
 const lines=text.split('\n').map(line=>declarations.some(prefix=>line.startsWith(prefix))?line.slice(7):line);
 const joined=lines.join('\n');
 let output='';
 for(let index=0;index<joined.length;index++){
  if(joined.slice(index,index+8).toLowerCase()==='</script'){output+='<\\/script';index+=7;}
  else output+=joined[index];
 }
 return output;
}
function independentString(text){
 let output='';
 for(const character of JSON.stringify(text)){
  if(character==='<')output+='\\u003c';
  else if(character.codePointAt(0)===0x2028)output+='\\u2028';
  else if(character.codePointAt(0)===0x2029)output+='\\u2029';
  else output+=character;
 }
 return output;
}
function independentAssembly(){
 const replacement={CORE:independentProgram(core),UI:independentProgram(ui),DECK_JSON:independentString(deck),GUIDE_JSON:independentString(guide)};
 let offset=0,output='';const found=[];
 for(const match of template.matchAll(/\{\{NORMAL_MODES_([A-Z_]+)\}\}/g)){
  assert.ok(Object.hasOwn(replacement,match[1]));found.push(match[1]);
  output+=template.slice(offset,match.index)+replacement[match[1]];
  offset=match.index+match[0].length;
 }
 assert.deepEqual([...found].sort(),['CORE','DECK_JSON','GUIDE_JSON','UI']);
 return output+template.slice(offset);
}
function scriptsOf(html){
 const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)].map(match=>({attributes:match[1],body:match[2]}));
 assert.equal(scripts.length,1,'One intact executable script boundary');
 for(const script of scripts){
  assert.doesNotMatch(script.attributes,/\bsrc\s*=/i,'No external executable source');
  new vm.Script(script.body,{filename:'normal-modes-inline-classic-compatible.js'});
 }
 return scripts;
}
function resourceAudit(html){
 const scripts=scriptsOf(html);
 const outside=html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,'');
 const resources=[];
 for(const match of outside.matchAll(/<(script|img|iframe|embed|object|audio|video|source|link)\b([^>]*)>/gi)){
  for(const attr of match[2].matchAll(/\b(src|href|data|poster|srcset)\s*=\s*["']([^"']+)["']/gi)){
   resources.push({tag:match[1],attribute:attr[1],value:attr[2]});
   assert.match(attr[2],/^(?:data:|#)/i,'Resource URL must be fully local data or fragment');
  }
 }
 const styles=[...outside.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)].map(match=>match[1]).join('\n');
 assert.doesNotMatch(styles,/@import\b/i,'No CSS imports');
 for(const match of styles.matchAll(/url\(\s*['"]?([^'")\s]+)/gi))assert.match(match[1],/^(?:data:|#)/i,'No external CSS resources');
 for(const text of [core,ui]){
  assert.doesNotMatch(text,/\bimport\s*(?:\(|\.)/,'No dynamic imports or import metadata');
  assert.doesNotMatch(text,/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|importScripts)\s*\(/,'No network request API');
 }
 return {scriptElements:scripts.length,classicCompatibleCompilation:true,scriptAttributes:scripts.map(script=>script.attributes.trim()),resourceReferences:resources,networkOrModuleDependencies:0};
}
async function boundDownloads(html,expectedDeck,expectedGuide){
 const scripts=scriptsOf(html);
 const ids=new Set([...template.matchAll(/\sid="([^"]+)"/g)].map(match=>match[1]));
 const nodes=new Map(),downloads=[],objects=new Map(),timeouts=[],revoked=[];
 function node(id){
  assert.ok(ids.has(id),'Downloaded-content probe referenced a missing real template ID: '+id);
  if(!nodes.has(id))nodes.set(id,{id,listeners:new Map(),addEventListener(type,callback){const list=this.listeners.get(type)||[];list.push(callback);this.listeners.set(type,list);}});
  return nodes.get(id);
 }
 const document={
  getElementById:node,
  querySelectorAll(selector){assert.equal(selector,'[data-preset]');return [];},
  body:{append(link){link.appended=true;}},
  createElement(tag){assert.equal(tag,'a');return {click(){assert.equal(this.appended,true);downloads.push({filename:this.download,blob:objects.get(this.href),url:this.href});},remove(){this.removed=true;}};}
 };
 const urlApi={createObjectURL(blob){const url='blob:independent-receiving/'+objects.size;objects.set(url,blob);return url;},revokeObjectURL(url){revoked.push(url);}};
 const sandbox=vm.createContext({document,Blob,URL:urlApi,setTimeout(callback,delay){timeouts.push({callback,delay});return timeouts.length;}});
 const terminal='  applyExperiment("localized");\n})();';
 assert.equal(scripts[0].body.split(terminal).length,2,'Precisely one default experiment initialization is omitted in the copied probe');
 const instrumented=scripts[0].body.replace(terminal,'  // Receiving probe omits only experiment initialization.\n})();');
 new vm.Script(instrumented,{filename:'bounded-download-binding-probe.js'}).runInContext(sandbox,{timeout:1000});
 for(const id of ['download-course','download-guide']){
  const callbacks=node(id).listeners.get('click');assert.equal(callbacks.length,1);
  callbacks[0]();
 }
 assert.equal(downloads.length,2);
 const expected=[['normal-modes.json','application/json;charset=utf-8',expectedDeck],['normal-modes.md','text/markdown;charset=utf-8',expectedGuide]];
 const receipt=[];
 for(let index=0;index<2;index++){
  const download=downloads[index],entry=expected[index];
  assert.equal(download.filename,entry[0]);assert.ok(download.blob instanceof Blob);assert.equal(download.blob.type,entry[1]);
  const bytes=Buffer.from(await download.blob.arrayBuffer());
  assert.deepEqual(bytes,Buffer.from(entry[2],'utf8'),'Raw embedded source download bytes must be exact');
  receipt.push({filename:download.filename,type:download.blob.type,bytes:bytes.length,sha256:hash(bytes)});
 }
 assert.equal(sandbox.injectedByLiteralPayload,undefined,'Literal source must not execute as HTML or JavaScript');
 assert.equal(timeouts.length,2);
 for(const timeout of timeouts){assert.equal(timeout.delay,1000);timeout.callback();}
 assert.deepEqual(revoked,downloads.map(item=>item.url));
 return {downloads:receipt,exactRawUtf8:true,probeScope:'Actual generated inline code and actual course/guide handlers execute in an authored DOM/Blob boundary. Only the final default experiment initialization is removed; preset registration is skipped by an empty authored selector result. No model function or numerical suite executes, and this is not a browser interaction result.'};
}

let canonical;
await check('Production source assembly, deterministic write and current generated HTML parity',async()=>{
 canonical=await renderLab(snapshot);
 assert.equal(canonical,await renderLab(snapshot));
 assert.equal(canonical,independentAssembly());
 await buildLab({root:snapshot});
 const output=join(snapshot,'courses/normal-modes-lab.html'),written=await readFile(output,'utf8');
 assert.equal(written,canonical);
 const before=await stat(output);await buildLab({root:snapshot,check:true});const after=await stat(output);
 assert.equal(after.ino,before.ino);assert.equal(after.mtimeMs,before.mtimeMs);
 const current=await readFile(join(candidate,'courses/normal-modes-lab.html'),'utf8');
 assert.equal(current,canonical,'Parent generated HTML must match all frozen source bytes');
 return {bytes:Buffer.byteLength(canonical),sha256:hash(canonical),independentAssemblyExact:true,repeatedRenderExact:true,nonMutatingCheck:true,authoritativeGeneratedHtmlExact:true};
});
await check('Each actual production input affects generated bytes',async()=>{
 assert.ok(canonical);
 for(const path of inputs){
  let changed=inputText[path];
  if(path.endsWith('.template.html'))changed+='\n<!-- independent template influence probe -->\n';
  else if(path.endsWith('.mjs'))changed+='\n// independent code influence probe\n';
  else if(path.endsWith('.json')){const object=JSON.parse(changed);object.items[0].prompt+=' Independent source influence probe.';changed=JSON.stringify(object,null,2)+'\n';}
  else changed+='\nIndependent guide influence probe.\n';
  await writeFile(join(snapshot,path),changed);
  try{assert.notEqual(await renderLab(snapshot),canonical,path+' must affect actual output');}finally{await writeFile(join(snapshot,path),inputText[path]);}
 }
 return {sourceInputsChecked:inputs.length};
});
await check('Original and accepted builder preserve ordinary production output identically',async()=>{
 assert.equal(await originalRender(snapshot),canonical);
 return {htmlSHA256:hash(canonical),ordinaryOutputByteIdentical:true};
});
await check('Production classic-compatible compilation and standalone dependency audit',async()=>resourceAudit(canonical));
await check('Actual UI handlers retain exact canonical course and guide bytes',async()=>boundDownloads(canonical,deck,guide));
await check('Actual template retains literal HTML Unicode and marker-shaped source data',async()=>{
 const literal='</script><script>globalThis.injectedByLiteralPayload=true;</script><b title="quotes"> & < > </b>\r\n'+String.fromCodePoint(0x2028,0x2029)+' {{NORMAL_MODES_GUIDE_JSON}} {{NORMAL_MODES_EXAMPLE}}';
 const object=JSON.parse(deck);object.items[0].prompt+=' '+literal;
 const literalDeck='\r\n  '+JSON.stringify(object,null,2).replace(/\n/g,'\r\n')+'\r\n \t';
 const literalGuide='\r\n  '+guide+'\r\nLiteral source: '+literal+'\r\n \t';
 await writeFile(join(snapshot,inputs[3]),literalDeck);await writeFile(join(snapshot,inputs[4]),literalGuide);
 try{
  const html=await renderLab(snapshot);await writeFile(join(work,'literal-production.html'),html,{flag:'wx'});
  const standalone=resourceAudit(html),binding=await boundDownloads(html,literalDeck,literalGuide);
  return {...standalone,...binding,htmlSHA256:hash(html),sourceContainsKnownAndUnknownMarkerText:true};
 }finally{await writeFile(join(snapshot,inputs[3]),deck);await writeFile(join(snapshot,inputs[4]),guide);}
});
await check('All static production ID label and accessible-name references resolve',async()=>{
 const ids=[...template.matchAll(/\sid="([^"]+)"/g)].map(match=>match[1]);assert.equal(new Set(ids).size,ids.length);
 const refs=[...template.matchAll(/\s(aria-labelledby|aria-describedby|for)="([^"]+)"/g)].flatMap(match=>match[2].split(/\s+/).map(target=>({attribute:match[1],target})));
 assert.deepEqual(refs.filter(ref=>!ids.includes(ref.target)),[]);
 return {uniqueIds:ids.length,staticReferences:refs.length,missingReferences:[],originalMissingLabTitleRegressionClosed:true};
});
const sourceAfter=[];
for(const expected of freeze.files){const bytes=await readFile(join(candidate,expected.path));sourceAfter.push({path:expected.path,bytes:bytes.length,sha256:hash(bytes)});}
const sourceStable=JSON.stringify(sourceBefore)===JSON.stringify(sourceAfter);
const receipt={startedAt,completedAt:new Date().toISOString(),node:process.version,candidateRoot:candidate,runName,expectedControlsSHA256:hash(controlsBytes),controlsFrozenAt:controlsFreeze.frozenAt,finalFreezeSHA256:hash(freezeBytes),sourceBefore,sourceAfter,sourceStable,results,pass:sourceStable&&results.every(result=>result.pass),moduleAttributeDisposition:'The preinspection no-module-attribute clause was reviewer-overbroad. The actual single inline type=module body compiles as classic-compatible JavaScript and imports no dependencies. The original expectation and disposition are retained; actual file:// execution is received in the separate runtime lane.',physicsNumericalSuitesExecuted:false,browserInteractionClaim:false};
await writeFile(join(work,'production-receipt.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(receipt,null,2));
if(!receipt.pass)process.exitCode=1;
