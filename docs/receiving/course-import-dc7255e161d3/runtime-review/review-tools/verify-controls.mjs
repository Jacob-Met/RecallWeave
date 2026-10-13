import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const base='D:/hamon-course-receiving-dc7255e161d3/runtime-edge-diagnostic/independent-controls/native-v1';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const report={schema:'recallweave.generic-controls-post-run-verification.v1',observedAt:new Date().toISOString(),controls:[]};
for(const name of ['one-question','two-question']){
 const r=JSON.parse(await fs.readFile(base+'/'+name+'/browser-receipt.json','utf8'));
 assert.equal(r.receiverSha256,'9823f06e0321794045a0206ab5735ec052780c15b808e21fd3465bb9d40eb45a');
 assert.equal(r.checks.length,21);assert.ok(r.checks.every(x=>x.passed));assert.equal(r.fatal,null);assert.ok(Object.values(r.cleanup).every(Boolean));
 const row={name,actualBrowserPid:r.browserLifecycle.actualBrowserPid,profile:r.browserLifecycle.ownedProfile,actualPidAbsent:false,profileAbsent:false,notes:[]};
 try{process.kill(row.actualBrowserPid,0)}catch(e){if(e.code==='ESRCH')row.actualPidAbsent=true;else throw e}
 try{await fs.access(row.profile)}catch(e){if(e.code==='ENOENT')row.profileAbsent=true;else throw e}
 assert.ok(row.actualPidAbsent&&row.profileAbsent);
 for(const d of r.downloads){
  assert.equal(d.state,'completed');const b=await fs.readFile(path.join(base,name,d.savedAs));
  assert.equal(b.length,d.bytes);assert.equal(sha(b),d.sha256);row.notes.push({name:d.savedAs,bytes:b.length,sha256:sha(b)});
 }
 assert.equal(row.notes.length,4);report.controls.push(row);
}
const ps="@(Get-CimInstance Win32_Process -Filter \"Name='msedge.exe'\" | Where-Object { $_.CommandLine -like '*independent-controls*native-v1*profiles*' } | Select-Object ProcessId,ParentProcessId,CommandLine) | ConvertTo-Json -Compress";
const raw=execFileSync('C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe',['-NoProfile','-NonInteractive','-Command',ps],{encoding:'utf8',timeout:10000}).trim();
report.matchingOwnedProcesses=raw?JSON.parse(raw):[];
assert.deepEqual(report.matchingOwnedProcesses,[]);
report.disposition='accepted';
await fs.writeFile(base+'/post-run-verification.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
