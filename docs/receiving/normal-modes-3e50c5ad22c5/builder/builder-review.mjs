import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,cp,readdir,stat} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';

const packet=dirname(fileURLToPath(import.meta.url));
const sourceRoot=resolve(process.argv[2]);
const runName=process.argv[3]||'candidate';
assert.match(runName,/^[a-z0-9-]+$/,'Use an isolated simple run name');
const runRoot=join(packet,runName);
await mkdir(runRoot);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const freeze=JSON.parse(await readFile(join(packet,'controls-freeze.json'),'utf8'));
const controlBytes=await readFile(join(packet,'expected-controls.json'));
assert.equal(hash(controlBytes),freeze.expectedControlsSHA256,'Frozen expected controls changed');
const contract=JSON.parse(controlBytes);
const builderPath=process.argv[4]?resolve(process.argv[4]):join(sourceRoot,'tools/build-normal-modes.mjs');
const parserPath=join(sourceRoot,'src/deck.mjs');
const builderBytes=await readFile(builderPath),parserBytes=await readFile(parserPath);
const implementation=join(runRoot,'implementation');
await mkdir(join(implementation,'tools'),{recursive:true});
await mkdir(join(implementation,'src'),{recursive:true});
await writeFile(join(implementation,'tools/build-normal-modes.mjs'),builderBytes,{flag:'wx'});
await writeFile(join(implementation,'src/deck.mjs'),parserBytes,{flag:'wx'});
const {renderLab,buildLab}=await import(pathToFileURL(join(implementation,'tools/build-normal-modes.mjs')).href);
const startedAt=new Date().toISOString();
const tokens=['{{NORMAL_MODES_CORE}}','{{NORMAL_MODES_UI}}','{{NORMAL_MODES_DECK_JSON}}','{{NORMAL_MODES_GUIDE_JSON}}'];
const outputRelative='courses/normal-modes-lab.html';
const deck={
 format:'recallweave-deck/1',title:'Independent builder fixture',
 attribution:'Independently authored receiving fixture, 2026-10-08',license:'CC0-1.0',
 concepts:['forces','coordinates','initial-state','energy'],
 items:Array.from({length:16},(_,i)=>({
  id:'independent-'+i,concept:['forces','coordinates','initial-state','energy'][Math.floor(i/4)],
  prerequisites:[],prompt:'Independent prompt '+i,options:['Choice A '+i,'Choice B '+i],
  answer:i%2,explanation:'Independent explanation '+i,transfer:'Independent transfer '+i,
 })),
};
const core="export const independentModel = Object.freeze({kind:'authored fixture'});\nexport function independentValue() { return 7; }\n";
const ui="globalThis.__review = {core: independentValue(), kind: independentModel.kind, deckText: EMBEDDED_DECK, guideText: EMBEDDED_GUIDE, tag: 'initial'};\n";
const template=`<!doctype html>
<meta charset="utf-8"><title>Independent fixture</title>
<script>
'use strict';
{{NORMAL_MODES_CORE}}
const EMBEDDED_DECK = {{NORMAL_MODES_DECK_JSON}};
const EMBEDDED_GUIDE = {{NORMAL_MODES_GUIDE_JSON}};
{{NORMAL_MODES_UI}}
</script>
`;
const baseline={
 'normal-modes-lab.template.html':template,
 'normal-modes-core.mjs':core,
 'normal-modes-ui.mjs':ui,
 'normal-modes.json':JSON.stringify(deck,null,2)+'\n',
 'normal-modes.md':'# Independent guide\n\nBaseline literal source.\n',
};
const outputOf=root=>join(root,outputRelative);
const readOutput=root=>readFile(outputOf(root),'utf8');
const results=[];
let serial=0;
async function fixture(label,changes={}){
 const root=join(runRoot,'cases',String(++serial).padStart(2,'0')+'-'+label);
 await mkdir(join(root,'courses'),{recursive:true});
 for(const [name,text] of Object.entries({...baseline,...changes}))await writeFile(join(root,'courses',name),text,{flag:'wx'});
 return root;
}
async function test(name,fn){try{results.push({name,pass:true,...await fn()});}catch(error){results.push({name,pass:false,error:String(error.message),stack:String(error.stack).split('\n').slice(0,5)});}}
async function noOwnedTemps(root,allowed=[]){
 const names=await readdir(join(root,'courses'));
 assert.deepEqual(names.filter(name=>name.startsWith('normal-modes-lab.html.tmp-')&&!allowed.includes(name)),[]);
}
async function refusedPreserving(root){
 await writeFile(outputOf(root),contract.fixtureDesign.priorOutput,{flag:'wx'});
 await assert.rejects(()=>buildLab({root}));
 assert.equal(await readOutput(root),contract.fixtureDesign.priorOutput);
 await noOwnedTemps(root);
}
function evaluate(html){
 const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)];
 assert.equal(scripts.length,1,'Authored standalone fixture must contain exactly one executable script');
 assert.doesNotMatch(html,/<script\b[^>]*\bsrc\s*=/i,'No external script dependency');
 const context={};
 vm.runInNewContext(scripts[0][1],context,{timeout:1000});
 assert.notEqual(context.__injected,true,'Literal payload executed as script');
 assert.ok(context.__review,'Fixture UI did not execute');
 return context.__review;
}
await test('frozen: deterministic exact parity and non-mutating check mode',async()=>{
 const root=await fixture('parity');
 const first=await renderLab(root),second=await renderLab(root);
 assert.equal(first,second);
 const created=await buildLab({root});assert.equal(created.checked,false);
 assert.equal(await readOutput(root),first);
 await buildLab({root});assert.equal(await readOutput(root),first);
 const before=await stat(outputOf(root),{bigint:true});
 assert.equal((await buildLab({root,check:true})).checked,true);
 const after=await stat(outputOf(root),{bigint:true});
 assert.equal(after.ino,before.ino);assert.equal(after.mtimeNs,before.mtimeNs);
 const changes=[
  ['template','normal-modes-lab.template.html',template.replace('Independent fixture','Changed fixture')],
  ['core','normal-modes-core.mjs',core.replace('return 7','return 8')],
  ['ui','normal-modes-ui.mjs',ui.replace("'initial'","'changed'")],
  ['deck','normal-modes.json',JSON.stringify({...deck,title:'Changed independent title'},null,2)+'\n'],
  ['guide','normal-modes.md',baseline['normal-modes.md']+'Changed guide.\n'],
 ];
 for(const [name,file,value] of changes){
  const changed=await fixture('parity-'+name,{[file]:value});
  await writeFile(outputOf(changed),first,{flag:'wx'});
  const expected=await renderLab(changed);assert.notEqual(expected,first,name+' input was not embedded');
  await assert.rejects(()=>buildLab({root:changed,check:true}));
  assert.equal(await readOutput(changed),first);
  await buildLab({root:changed});assert.equal(await readOutput(changed),expected);
  await noOwnedTemps(changed);
 }
 return{sourceInputsChecked:5,deterministicSHA256:hash(first)};
});
await test('frozen: missing and duplicate template tokens refuse without replacing prior HTML',async()=>{
 for(const [i,token] of tokens.entries()){
  await refusedPreserving(await fixture('missing-'+i,{'normal-modes-lab.template.html':template.replace(token,'')}));
  await refusedPreserving(await fixture('duplicate-'+i,{'normal-modes-lab.template.html':template+'\n'+token}));
 }
 await refusedPreserving(await fixture('unknown-template-token',{'normal-modes-lab.template.html':template+'{{NORMAL_MODES_UNKNOWN}}'}));
 return{missing:4,duplicate:4,unknown:1};
});
await test('frozen: checked-deck refusal preserves prior HTML',async()=>{
 const answer=structuredClone(deck);answer.items[0].answer=99;
 const unknown=structuredClone(deck);unknown.items[0].prerequisites=['unlisted-concept'];
 const cycle=structuredClone(deck);cycle.items[0].prerequisites=['coordinates'];cycle.items[4].prerequisites=['forces'];
 const shortened=structuredClone(deck);shortened.items.pop();
 const malformed=[
  ['invalid-json','{"format":'],
  ['answer-index',JSON.stringify(answer)],
  ['unknown-prerequisite',JSON.stringify(unknown)],
  ['prerequisite-cycle',JSON.stringify(cycle)],
  ['wrong-reviewed-count',JSON.stringify(shortened)],
 ];
 for(const [name,text] of malformed)await refusedPreserving(await fixture(name,{'normal-modes.json':text}));
 return{refusedDeckCases:malformed.length};
});
await test('frozen: literal script HTML and Unicode text survive embedded source downloads exactly',async()=>{
 const literal=contract.fixtureDesign.literal;
 const tricky=structuredClone(deck);
 tricky.title='Fixture '+literal;
 tricky.items[0].prompt=literal;
 tricky.items[0].options=[literal,'Distinct choice'];
 tricky.items[0].explanation=literal;
 tricky.items[0].transfer=literal;
 const rawDeck=' \n'+JSON.stringify(tricky,null,2)+'\r\n';
 const rawGuide='# Independent guide\r\n\r\n'+literal+'\n';
 const root=await fixture('literal-payload',{'normal-modes.json':rawDeck,'normal-modes.md':rawGuide});
 const html=await renderLab(root),view=evaluate(html);
 assert.equal(view.deckText,rawDeck);assert.equal(view.guideText,rawGuide);
 assert.equal(JSON.parse(view.deckText).items[0].prompt,literal);
 assert.ok(!html.includes('\u2028')&&!html.includes('\u2029'),'Unicode separators must be encoded in script source');
 assert.equal(view.core,7);
 await buildLab({root});assert.equal(await readOutput(root),html);
 return{deckBytes:Buffer.byteLength(rawDeck),guideBytes:Buffer.byteLength(rawGuide),scriptElements:1,decodedSourceExact:true,htmlSHA256:hash(html)};
});
await test('frozen: standalone script executes with no retained module dependencies',async()=>{
 const root=await fixture('standalone');
 const html=await renderLab(root),view=evaluate(html);
 assert.equal(view.core,7);assert.equal(view.kind,'authored fixture');
 assert.equal(view.deckText,baseline['normal-modes.json']);
 assert.equal(view.guideText,baseline['normal-modes.md']);
 await refusedPreserving(await fixture('core-import',{'normal-modes-core.mjs':"import {external} from './not-bundled.mjs';\n"+core}));
 await refusedPreserving(await fixture('ui-export',{'normal-modes-ui.mjs':"export default function external() {}\n"}));
 return{classicScriptExecuted:true,refusedModuleDependencies:2};
});
await test('frozen: failed rename cleans only its own temporary file and preserves existing directory',async()=>{
 const root=await fixture('rename-failure');
 await mkdir(outputOf(root));
 await writeFile(join(outputOf(root),'sentinel.txt'),contract.fixtureDesign.directorySentinel,{flag:'wx'});
 const older='normal-modes-lab.html.tmp-preexisting-review';
 await writeFile(join(root,'courses',older),'PREEXISTING_OTHER_TEMP\n',{flag:'wx'});
 await assert.rejects(()=>buildLab({root}));
 assert.ok((await stat(outputOf(root))).isDirectory());
 assert.equal(await readFile(join(outputOf(root),'sentinel.txt'),'utf8'),contract.fixtureDesign.directorySentinel);
 assert.deepEqual(await readdir(outputOf(root)),['sentinel.txt']);
 assert.equal(await readFile(join(root,'courses',older),'utf8'),'PREEXISTING_OTHER_TEMP\n');
 await noOwnedTemps(root,[older]);
 return{directoryPreserved:true,sentinelPreserved:true,unrelatedTemporaryPreserved:true,ownTemporaryRemoved:true};
});
await test('frozen: CLI invocation is independent of caller working directory',async()=>{
 const root=await fixture('cli-project');
 await mkdir(join(root,'tools'));await mkdir(join(root,'src'));
 await writeFile(join(root,'tools/build-normal-modes.mjs'),builderBytes,{flag:'wx'});
 await writeFile(join(root,'src/deck.mjs'),parserBytes,{flag:'wx'});
 const foreign=join(runRoot,'foreign-cwd');await mkdir(foreign);
 const invoke=args=>spawnSync(process.execPath,[join(root,'tools/build-normal-modes.mjs'),...args],{cwd:foreign,encoding:'utf8',timeout:15000});
 const built=invoke([]);assert.equal(built.status,0,built.stderr);
 const report=JSON.parse(built.stdout.trim());assert.equal(report.path,outputOf(root));assert.equal(report.checked,false);
 const html=await readOutput(root);assert.equal(html,await renderLab(root));
 const checked=invoke(['--check']);assert.equal(checked.status,0,checked.stderr);
 assert.equal(JSON.parse(checked.stdout.trim()).checked,true);
 await writeFile(join(root,'courses','normal-modes.md'),'# Changed after built\n');
 const stale=invoke(['--check']);assert.equal(stale.status,1);
 assert.equal(await readOutput(root),html);
 const unknown=invoke(['--unknown']);assert.equal(unknown.status,2);
 assert.equal(await readOutput(root),html);
 assert.deepEqual(await readdir(foreign),[]);
 await noOwnedTemps(root);
 return{buildExit:built.status,checkExit:checked.status,staleCheckExit:stale.status,unknownArgumentExit:unknown.status,callerDirectoryUntouched:true};
});
await test('post-inspection: marker-shaped deck and guide text remains literal data',async()=>{
 const markerDeck=structuredClone(deck);markerDeck.items[0].prompt='Explain literal {{NORMAL_MODES_GUIDE_JSON}} as text.';
 const rawDeck=JSON.stringify(markerDeck,null,2)+'\n';
 const root=await fixture('literal-known-marker',{'normal-modes.json':rawDeck});
 const view=evaluate(await renderLab(root));assert.equal(view.deckText,rawDeck);
 return{knownTokenLiteralPreserved:true};
});
await test('post-inspection: unknown marker prefixes inside guide prose remain literal data',async()=>{
 const rawGuide='# Literal marker\n\n{{NORMAL_MODES_EXAMPLE}} is source prose, not a template directive.\n';
 const guideRoot=await fixture('literal-unknown-marker',{'normal-modes.md':rawGuide});
 const guideView=evaluate(await renderLab(guideRoot));assert.equal(guideView.guideText,rawGuide);
 return{unknownPrefixLiteralPreserved:true};
});
const builderAfter=hash(await readFile(builderPath)),parserAfter=hash(await readFile(parserPath));
const receipt={startedAt,completedAt:new Date().toISOString(),node:process.version,runName,
 builderPath,builderSHA256:hash(builderBytes),builderSHA256After:builderAfter,
 parserPath,parserSHA256:hash(parserBytes),parserSHA256After:parserAfter,
 controlsFrozenAt:freeze.frozenAt,expectedControlsSHA256:freeze.expectedControlsSHA256,
 sourceStable:builderAfter===hash(builderBytes)&&parserAfter===hash(parserBytes),
 preFrozenGroupsPassed:results.filter(r=>r.name.startsWith('frozen:')&&r.pass).length,
 preFrozenGroups:7,pass:results.every(r=>r.pass)&&builderAfter===hash(builderBytes)&&parserAfter===hash(parserBytes),
 results,fixtureScope:'Authored minimal template and sources, real candidate builder and unchanged native deck parser. Production template remains a separate later check.'};
await writeFile(join(runRoot,'review-receipt.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(receipt,null,2));
if(!receipt.pass)process.exitCode=1;
