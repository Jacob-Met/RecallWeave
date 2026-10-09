import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const ROOT='C:\\Users\\jacob\\recallweave-nfa-independent-3dcb83a1';
function pin(p){const b=fs.readFileSync(p);return {bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex'),git_blob:crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex')};}
const freeze=JSON.parse(fs.readFileSync(path.join(ROOT,'browser-receiver-freeze-v1.json'),'utf8'));
for(const file of freeze.files){const p=path.join(ROOT,file.path),got=pin(p);for(const k of ['bytes','sha256','git_blob'])assert.equal(got[k],file[k],file.path);}
assert.equal(fs.existsSync(path.join(ROOT,'browser-receiving-v1')),false,'Existing browser run must be reconciled.');
assert.equal(fs.existsSync(path.join(ROOT,'browser-execution-v1.json')),false);
const command=[path.join(ROOT,'receive-browser-v1.mjs')],started=new Date().toISOString(),t=performance.now();
const child=spawnSync(process.execPath,command,{cwd:ROOT,encoding:null,timeout:300000,windowsHide:true,maxBuffer:2000000});
fs.writeFileSync(path.join(ROOT,'browser-v1.stdout'),child.stdout??Buffer.alloc(0),{flag:'wx'});
fs.writeFileSync(path.join(ROOT,'browser-v1.stderr'),child.stderr??Buffer.alloc(0),{flag:'wx'});
const record={schema:'recallweave-root-browser-execution.v1',started_utc:started,finished_utc:new Date().toISOString(),elapsed_seconds:(performance.now()-t)/1000,executable:process.execPath,command,pid:child.pid,actual_exit:child.status,signal:child.signal,error:child.error?{name:child.error.name,message:child.error.message,code:child.error.code}:null,stdout:pin(path.join(ROOT,'browser-v1.stdout')),stderr:pin(path.join(ROOT,'browser-v1.stderr')),frozen_receiver:pin(command[0]),freeze:pin(path.join(ROOT,'browser-receiver-freeze-v1.json'))};
fs.writeFileSync(path.join(ROOT,'browser-execution-v1.json'),JSON.stringify(record,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(record));console.log((child.stdout??Buffer.alloc(0)).toString('utf8'));
process.exitCode=child.status===0?0:2;
