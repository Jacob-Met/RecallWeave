import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, x, i, all) => i % 2 ? pairs : [...pairs, [x, all[i + 1]]], []));
for (const key of ['--model','--sha256','--oracle','--output']) if (!args[key]) throw new Error('Missing ' + key);
const modelPath = path.resolve(args['--model']), oraclePath = path.resolve(args['--oracle']), outputPath = path.resolve(args['--output']);
if (fs.existsSync(outputPath)) throw new Error('Output already exists');
function pin(bytes) { return { bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex'), git_blob: crypto.createHash('sha1').update(Buffer.from('blob ' + bytes.length + '\0')).update(bytes).digest('hex') }; }
function witness(p) { const s = fs.statSync(p, {bigint:true}); return {...pin(fs.readFileSync(p)), mode:s.mode.toString(), mtime_ns:s.mtimeNs.toString(), inode:s.ino.toString()}; }
function deepFrozen(value) { return !value || typeof value !== 'object' || (Object.isFrozen(value) && Object.values(value).every(deepFrozen)); }
function allWitnesses() { return {model:witness(modelPath), oracle:witness(oraclePath), observer:witness(new URL(import.meta.url)), original_cases:witness(path.join(path.dirname(oraclePath),'oracle-cases.json')), proof:witness(path.join(path.dirname(oraclePath),'PROOF.md')), generator:witness(path.join(path.dirname(oraclePath),'make_expected_rows.py'))}; }
const before = allWitnesses();
if (before.model.sha256 !== args['--sha256']) throw new Error('Model digest mismatch');
const receipt = {schema:'hamon.minhash-independent-model-receiving/1', started_utc:new Date().toISOString(), runtime:{node:process.version,executable:process.execPath,platform:process.platform}, source_before:before, oracle_adapter:'Only expected.schema is renamed to actual.format for the declared recallweave.minhash-analysis/1 identity. Every other field, all row orders and literal labels are compared exactly. Frozen oracle bytes remain unchanged.', cases:[], author_tests_replayed:false};
try {
  const oracle = JSON.parse(fs.readFileSync(oraclePath,'utf8'));
  assert.equal(oracle.schema,'hamon.minhash-independent-model-oracle/1');
  assert.equal(oracle.cases.length,9);
  const module = await import(pathToFileURL(modelPath).href);
  assert.equal(typeof module.analyzeMinHash,'function'); assert.equal(typeof module.parseSetText,'function');
  for (const item of oracle.cases) {
    const row = {id:item.id,checks:[]};
    function check(name, run) { run(); row.checks.push({name,pass:true}); }
    try {
      const a = structuredClone(item.expected.inputA), b = structuredClone(item.expected.inputB);
      check('parse A preserves literal entries and duplicates',()=>assert.deepEqual(module.parseSetText(JSON.stringify(a),'A'),a));
      check('parse B preserves literal entries and duplicates',()=>assert.deepEqual(module.parseSetText(JSON.stringify(b),'B'),b));
      const actual = module.analyzeMinHash(a,b); row.actual = actual;
      const expected = structuredClone(item.expected); expected.format = expected.schema; delete expected.schema;
      check('complete independent expected model equality',()=>assert.deepEqual(actual,expected));
      check('caller arrays preserved',()=>{assert.deepEqual(a,item.expected.inputA);assert.deepEqual(b,item.expected.inputB);});
      check('complete result is deeply frozen',()=>assert.equal(deepFrozen(actual),true));
      row.passed = true;
    } catch (e) { row.passed = false; row.error = String(e.stack || e); }
    receipt.cases.push(row);
  }
  receipt.validation = {case:'sparse_array_public_admission', checks:[]};
  assert.throws(()=>module.validateLabels(new Array(1),'A'),/must be nonblank text/); receipt.validation.checks.push({name:'public validator rejects sparse hole',pass:true});
  assert.throws(()=>module.analyzeMinHash(new Array(1),['x']),/must be nonblank text/); receipt.validation.checks.push({name:'analysis fresh validation rejects sparse hole',pass:true});
  receipt.validation.passed = true;
  receipt.rows_compared = receipt.cases.reduce((n,c)=>n+(c.actual?.rows.length||0),0);
  receipt.source_after = allWitnesses();
  assert.deepEqual(receipt.source_after,before); receipt.sources_conserved = true;
  receipt.passed = receipt.cases.length===9 && receipt.cases.every(c=>c.passed) && receipt.rows_compared===292;
} catch(e) { receipt.passed=false;receipt.error=String(e.stack||e); }
receipt.finished_utc=new Date().toISOString();
const raw=Buffer.from(JSON.stringify(receipt,null,2)+'\n','utf8');
fs.writeFileSync(outputPath,raw,{flag:'wx'});
console.log(JSON.stringify({passed:receipt.passed,cases:receipt.cases.length,passing:receipt.cases.filter(c=>c.passed).length,checks:receipt.cases.reduce((n,c)=>n+c.checks.length,0),rows:receipt.rows_compared,validation:receipt.validation,receipt:pin(raw),source:before.model}));
process.exitCode = receipt.passed ? 0 : 1;
