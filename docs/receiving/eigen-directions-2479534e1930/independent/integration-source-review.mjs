import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const project='/home/jacob/recallweave-eigen-2479534e1930';
const receiptPath=path.join(project,'docs/receiving/eigen-directions-2479534e1930/browser-final/browser-receipt.json');
const browser=JSON.parse(fs.readFileSync(receiptPath,'utf8'));
const sha=value=>createHash('sha256').update(value).digest('hex');
const productFiles=['src/eigen-directions.mjs','src/eigen-directions-ui.mjs','templates/eigen-directions-explorer.html','tools/build-eigen-directions.mjs','courses/eigen-directions-explorer.html','courses/eigen-directions.json','courses/eigen-directions.md'];
const texts=Object.fromEntries(productFiles.map(f=>[f,fs.readFileSync(path.join(project,f),'utf8')]));
const hashComparison=productFiles.map(file=>({file,expected:browser.source[file].sha256,actual:sha(fs.readFileSync(path.join(project,file))),bytes:fs.statSync(path.join(project,file)).size}));
assert.ok(hashComparison.every(x=>x.expected===x.actual),'Reviewed source differs from browser-final receipt');
const html=texts['templates/eigen-directions-explorer.html'];
const ui=texts['src/eigen-directions-ui.mjs'];
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
assert.equal(new Set(ids).size,ids.length,'duplicate template ID');
const targets=[...new Set([...ui.matchAll(/\bbyId\('([^']+)'\)/g)].map(x=>x[1]).concat(['a11','a12','a21','a22','probe-x','probe-y']))];
assert.ok(targets.every(x=>ids.includes(x)),'UI refers to missing template ID');
const boundary=spawnSync(process.execPath,[path.join(project,'tools/build-eigen-directions.mjs'),'--check'],{encoding:'utf8'});
assert.equal(boundary.status,0,boundary.stderr || boundary.stdout);
assert.ok(hashComparison.every(x=>sha(fs.readFileSync(path.join(project,x.file)))===x.actual),'product files changed during read-only checks');
const line=(file,text)=>({file,line:texts[file].split('\n').findIndex(x=>x.includes(text))+1});
const findings=[
  {topic:'DOM and export safety',status:'accept',pointers:[line('src/eigen-directions-ui.mjs','function svgElement'),line('src/eigen-directions-ui.mjs','function svgText'),line('src/eigen-directions-ui.mjs','function appendCell'),line('src/eigen-directions-ui.mjs','function download')],reason:'User inputs are bounded by the existing model. Rendered prose uses textContent; SVG receives numeric or controlled attributes; filenames are fixed; object URLs are revoked. No source use of HTML insertion, network requests, or browser persistence was found.'},
  {topic:'Applied result and export consistency',status:'accept',pointers:[line('src/eigen-directions-ui.mjs','function apply()'),line('src/eigen-directions-ui.mjs',"fields.forEach(field => field.addEventListener"),line('src/eigen-directions-ui.mjs',"byId('download-observation')")],reason:'Pending/refused form values do not replace accepted state. Plot, text, line toggle and experiment download consume accepted results; serialization recomputes from accepted matrix/probe. Rendering prerequisites exist in the template.'},
  {topic:'Numeric plot boundary',status:'accept',pointers:[line('src/eigen-directions-ui.mjs','function plot(result)'),line('src/eigen-directions-ui.mjs',"const maximum ="),line('src/eigen-directions-ui.mjs',"const size ="),line('src/eigen-directions-ui.mjs',"const directions =")],reason:'The accepted model bounds keep image entries at most 360 in magnitude. The plot floors range input and viewport size so step, range and scale stay finite and positive. Both axes share one scale. Approximate eigenbasis vectors affect only geometry; exact probe status comes from the frozen-qualified model.'},
  {topic:'Embedded source safety and reproducibility',status:'accept',pointers:[line('tools/build-eigen-directions.mjs','validateDeck('),line('tools/build-eigen-directions.mjs','const importLine'),line('tools/build-eigen-directions.mjs',"script.toLowerCase()"),line('tools/build-eigen-directions.mjs','const embeddedText'),line('tools/build-eigen-directions.mjs',"if (args.includes('--check'))")],reason:'Builder validates the original deck, pins its UI import boundary, refuses remaining model module boundaries and script-closing source, JSON-quotes deck/guide text and escapes every less-than sign. Template markers occur exactly once. Read-only --check confirms exact generated/source equality.'},
  {topic:'Template and final layout source',status:'accept',pointers:[line('templates/eigen-directions-explorer.html','fieldset{min-inline-size:0'),line('templates/eigen-directions-explorer.html','@media(max-width:430px)'),line('templates/eigen-directions-explorer.html','id="input-status"'),line('templates/eigen-directions-explorer.html','id="eigen-table"')],reason:'Template supplies every UI target uniquely, status announcements and explicit applied-result labels. Reviewed final layout source is identical to the version recorded by the parent 320px/390px browser receiving. No browser rerun was performed.'}
];
const originals={
  'blind-contract-freeze.json':'1edcf003399bb1932aa4ccded4c548b40ee97184eefc41ca663613c8ed88be55',
  'receiver-model.mjs':'2e7b99ee763bd912bb337d89c16981b8f22154c995b5041fbcc7d595f41be723',
  'model-results.json':'bbd89fe0f5d931bf29a2464aa3aee0a302f9552e198f2c7d2502ebc0108393a9',
  'contract-clarification-receipt.json':'a3ab96c63e624ed1acae96ab9e7246a09fea07de7aa03eef636e58d5e9478235'
};
const originalPreservation=Object.entries(originals).map(([file,expected])=>({file,expected,actual:sha(fs.readFileSync(path.join(here,file)))}));
assert.ok(originalPreservation.every(x=>x.expected===x.actual),'Original receiver evidence changed');
const report={
  estate:'2479534e1930',
  recordedAtUTC:new Date().toISOString(),
  node:process.version,
  sourceHead:spawnSync('git',['-C',project,'rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim(),
  verdict:'accept',
  blockers:[],
  scope:'Bounded source integration review after independently qualified model and content. No model test rerun, browser rerun, source edit, or ref mutation.',
  browserReceipt:{path:receiptPath,sha256:sha(fs.readFileSync(receiptPath)),status:browser.status},
  sourceHashComparison:hashComparison,
  domTargets:{uniqueTemplateIds:ids.length,requiredUiTargets:targets.length,allExist:true},
  exactBuildCheck:{exitCode:boundary.status,stdout:boundary.stdout.trim()},
  findings,
  originalPreservation
};
fs.writeFileSync(path.join(here,'integration-source-review.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
