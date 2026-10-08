import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const out=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(out,'../../../..');
const python='C:/Users/minec/AppData/Local/Hamon/hubtwo/runtime/python-3.13.15/python.exe';
const jobs=[
 {name:'author',file:python,args:['-B','tools/make_author.py','--check']},
 {name:'focus',file:python,args:['tools/make_focus.py','--check']},
 {name:'handout',file:python,args:['-B','tools/make_handout.py','--check']},
 {name:'sql-tests',file:process.execPath,args:['--test','tests/sql-query-foundations.test.mjs'],env:{...process.env,PYTHON:python}}
];
const results=[];
for(const job of jobs){
 const run=spawnSync(job.file,job.args,{cwd:root,env:job.env||process.env,encoding:'utf8',maxBuffer:8*1024*1024});
 await fs.writeFile(path.join(out,job.name+'.stdout.txt'),run.stdout||'');await fs.writeFile(path.join(out,job.name+'.stderr.txt'),run.stderr||'');
 results.push({name:job.name,executable:job.file,args:job.args,exit:run.status,error:run.error?.message||null});
}
const receipt={at:new Date().toISOString(),reason:'Original Windows PATH has no python3. Existing qualified Python is used for the identical three builder check entry points; SQL tests use their existing PYTHON configuration. No production tests or runtime installation/aliases changed.',python,pythonVersion:spawnSync(python,['--version'],{encoding:'utf8'}).stdout.trim(),results,passed:results.every(r=>r.exit===0)};
await fs.writeFile(path.join(out,'python-command-receipt.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt,null,2));
assert.ok(receipt.passed);
