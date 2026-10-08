import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import {runPhysicsReview} from './physics-oracle.mjs';

const [adapterFile,candidateFile,receiptFile]=process.argv.slice(2);
assert.ok(adapterFile&&candidateFile&&receiptFile,'Usage: node run-review.mjs adapter.mjs candidate.mjs new-receipt.json');
const directory=path.dirname(fileURLToPath(import.meta.url));
const digest=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
const oracleFile=path.join(directory,'physics-oracle.mjs');
const frozen=JSON.parse(readFileSync(path.join(directory,'frozen-controls.json'),'utf8'));
assert.equal(digest(oracleFile),frozen.sourceSHA256,'Frozen oracle was altered');
const startedAt=new Date().toISOString();
const sourceBefore=digest(candidateFile), adapterBefore=digest(adapterFile);
const {sample}=await import(pathToFileURL(path.resolve(adapterFile)).href);
assert.equal(typeof sample,'function','Adapter must export a sample function');
const result=runPhysicsReview(sample,{label:'independent candidate physics review'});
const sourceAfter=digest(candidateFile), adapterAfter=digest(adapterFile);
const sourceStable=sourceBefore===sourceAfter&&adapterBefore===adapterAfter;
const receipt={
  startedAt,completedAt:new Date().toISOString(),node:process.version,
  candidatePath:path.resolve(candidateFile),candidateSHA256:sourceBefore,
  candidateSHA256After:sourceAfter,adapterSHA256:adapterBefore,adapterSHA256After:adapterAfter,
  oracleSHA256:frozen.sourceSHA256,controlsFrozenAt:frozen.frozenAt,
  sourceStable,pass:result.pass&&sourceStable,result,
  limits:['Evaluation covers finite tested parameters/times, not every representable input.',
    'Content keys, UI behavior, packaging, and deployment require separate evidence.'],
};
writeFileSync(receiptFile,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(receipt,null,2));
if (!receipt.pass) process.exitCode=1;
