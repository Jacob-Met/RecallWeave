import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const EXPECTED = {
  "format": "recall196-independent-candidate-lock/1",
  "contractGit": "551e3833b6439e475d8566e6727206dcd3e35493",
  "candidate": {
    "entry": "candidate-r1/course-prerequisites.mjs",
    "files": [
      {
        "path": "candidate-r1/course-prerequisites.mjs",
        "bytes": 3893,
        "sha256": "f367d6fb89da575eef8a075a388f4ab8f1765aa5ed67d095df3e64068b9e64a5",
        "git": "331a09191115dc4943b8f42344cd11a817f42757"
      },
      {
        "path": "candidate-r1/deck.mjs",
        "bytes": 4894,
        "sha256": "621438c166ec4bfafd9d87c698a1d46cb1722f4fb92dcbb8d9f52fce682c338b",
        "git": "f0f8a4b234489c2388f427633f548d56c6ed4c03"
      },
      {
        "path": "candidate-r1/course-focus.mjs",
        "bytes": 3169,
        "sha256": "82e362e82a185c18f771f675622bcef8c382b7832e9d95a6c5341fa96e051370",
        "git": "337b90d667170f19e5c75f5aaf4898e3410630b9"
      }
    ]
  },
  "oracle": {
    "path": "independent-oracle-r1.mjs",
    "bytes": 8842,
    "sha256": "5c9e5b44b410a665830e37632d11047c673bca3c5857b2ee1d3f48356474377c",
    "git": "4a0c5075fc04b1c809792b2e88b1f8897da222b2"
  },
  "reference": {
    "path": "blind-reference-r0.json",
    "bytes": 448182,
    "sha256": "dcd0d202e60c635c7e27fa9ff57d94fde0287ee0b8556d3ef36dafbe7001ea73",
    "git": "4a0e069303cb84acd243c8b64d012eedeab8acd5"
  },
  "runtimeManifest": {
    "path": "runtime-dependencies.json",
    "sha256": "ee8d09a2d7134cd89c5323386de26c1ed97d3e2053b7fe6a74af614d9321675f"
  },
  "runtime": {
    "executable": "/usr/bin/node",
    "version": "v22.22.1",
    "uid": 1000
  },
  "floors": {
    "memoryBytes": 268435456,
    "filesystemBytes": 67108864
  },
  "scope": "Native API receiving only; no browser, generated standalone or UI lifecycle qualification."
};
const root=path.dirname(fileURLToPath(import.meta.url));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const git=b=>crypto.createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const read=p=>fs.readFileSync(path.join(root,p));
const relativeSnapshot=p=>{const file=path.join(root,p);assert.equal(fs.realpathSync(file),file);const b=fs.readFileSync(file);return {path:p,bytes:b.length,sha256:sha(b),git:git(b)};};
const admitted=record=>{const actual=relativeSnapshot(record.path);for(const k of ['bytes','sha256','git'])if(record[k]!==undefined)assert.equal(actual[k],record[k],record.path+' '+k);return actual;};
const runtimeSnapshot=files=>files.map(f=>{const b=fs.readFileSync(f.path);assert.equal(b.length,f.bytes,f.path);assert.equal(sha(b),f.sha256,f.path);return {path:f.path,bytes:b.length,sha256:sha(b)};});
const receipt={scope:EXPECTED.scope,passed:false,started:new Date().toISOString(),candidate:EXPECTED.candidate,failures:[]};
const start=performance.now();
let inputPaths,runtimeFiles,before,borrowedBefore;
try{
  assert.equal(process.argv.length,2,'No caller override');
  assert.equal(fs.realpathSync(process.execPath),EXPECTED.runtime.executable);
  assert.equal(process.version,EXPECTED.runtime.version);
  assert.equal(process.getuid(),EXPECTED.runtime.uid);
  assert.equal(fs.realpathSync(root),root);
  assert.deepEqual(JSON.parse(read('candidate-lock-r1.json')),EXPECTED);
  assert.equal(JSON.parse(read('candidate-lock-r0.json')).candidate,null,'Preserve blind null lock');
  assert.equal(fs.existsSync(path.join(root,'receiving-r1.json')),false);
  assert.equal(fs.existsSync(path.join(root,'actual-reports-r1.json')),false);
  const memory=Number(fs.readFileSync('/proc/meminfo','utf8').match(/MemAvailable:\s+(\d+)/)[1])*1024;
  const st=fs.statfsSync(root),filesystemBytes=st.bavail*st.bsize;
  receipt.capacity={memory,filesystemBytes};assert.ok(memory>=EXPECTED.floors.memoryBytes);assert.ok(filesystemBytes>=EXPECTED.floors.filesystemBytes);
  for(const f of [...EXPECTED.candidate.files,EXPECTED.oracle,EXPECTED.reference,EXPECTED.runtimeManifest])admitted(f);
  assert.equal(git(read('baseline-deck.mjs')),'f0f8a4b234489c2388f427633f548d56c6ed4c03');
  assert.deepEqual(fs.readdirSync(path.join(root,'candidate-r1')).sort(),['course-focus.mjs','course-prerequisites.mjs','deck.mjs']);
  const expectedImports=new Map([
    ['candidate-r1/course-prerequisites.mjs',['./deck.mjs','./course-focus.mjs']],
    ['candidate-r1/course-focus.mjs',['./deck.mjs']],
    ['candidate-r1/deck.mjs',[]]
  ]);
  for(const [p,imports] of expectedImports){
    const found=[...read(p).toString('utf8').matchAll(/^import\s+.*?from\s+['"]([^'"]+)['"]/gm)].map(m=>m[1]);
    assert.deepEqual(found,imports);
    assert.equal(/\bimport\s*\(/.test(read(p).toString('utf8')),false);
  }
  inputPaths=['baseline-deck.mjs','runtime-dependencies.json','blind-reference-r0.json','independent-oracle-r0.mjs','independent-oracle-r1.mjs','selftest-r1.mjs','selftest-receipt-r1.json','candidate-lock-r0.json','candidate-lock-r1.json','receive-candidate-r1.mjs',...EXPECTED.candidate.files.map(f=>f.path)];
  before=inputPaths.map(relativeSnapshot);
  runtimeFiles=JSON.parse(read('runtime-dependencies.json')).files;assert.equal(runtimeFiles.length,25);
  borrowedBefore=runtimeSnapshot(runtimeFiles);
  const baseline=await import(pathToFileURL(path.join(root,'baseline-deck.mjs')));
  const oracle=await import(pathToFileURL(path.join(root,EXPECTED.oracle.path)));
  const candidate=await import(pathToFileURL(path.join(root,EXPECTED.candidate.entry)));
  const outcome=oracle.runPrerequisiteReceiving(candidate.inspectCoursePrerequisites,baseline.parseDeck,JSON.parse(read(EXPECTED.reference.path)));
  const {actualOutputs,...summary}=outcome;
  receipt.outcome=summary;
  const actualText=JSON.stringify(actualOutputs,null,2)+'\n';
  fs.writeFileSync(path.join(root,'actual-reports-r1.json'),actualText,{flag:'wx'});
  receipt.actualReports={path:'actual-reports-r1.json',bytes:Buffer.byteLength(actualText),sha256:sha(actualText),git:git(Buffer.from(actualText))};
  receipt.passed=true;
}catch(e){receipt.failures.push({name:e.name,message:e.message,stack:e.stack});process.exitCode=1;}
finally{
  try{
    if(before){const after=inputPaths.map(relativeSnapshot);assert.deepEqual(after,before);receipt.before=before;receipt.after=after;receipt.sourceUnchanged=true;}
    if(borrowedBefore){const after=runtimeSnapshot(runtimeFiles);assert.deepEqual(after,borrowedBefore);receipt.runtimeBefore=borrowedBefore;receipt.runtimeAfter=after;receipt.runtimeUnchanged=true;}
  }catch(e){receipt.passed=false;receipt.failures.push({name:e.name,message:e.message,stack:e.stack});process.exitCode=1;}
  receipt.elapsedMs=performance.now()-start;receipt.finished=new Date().toISOString();
  fs.writeFileSync(path.join(root,'receiving-r1.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({passed:receipt.passed,groups:receipt.outcome?.groups,actualCalls:receipt.outcome?.actualCalls,sourceUnchanged:receipt.sourceUnchanged,runtimeUnchanged:receipt.runtimeUnchanged,failures:receipt.failures,elapsedMs:receipt.elapsedMs}));
}
