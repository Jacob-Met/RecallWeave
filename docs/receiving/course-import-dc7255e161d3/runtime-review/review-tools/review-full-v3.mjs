import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const base='D:/hamon-course-receiving-dc7255e161d3';
const directory=base+'/expected-loss-v3',source=base+'/source';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const bytes=await fs.readFile(directory+'/browser-receipt.json'),r=JSON.parse(bytes);
assert.equal(r.receiverSha256,'9823f06e0321794045a0206ab5735ec052780c15b808e21fd3465bb9d40eb45a');
assert.equal(sha(await fs.readFile(source+'/tools/check_course_import_browser.mjs')),r.receiverSha256);
assert.equal(r.checks.length,21);assert.ok(r.checks.every(x=>x.passed));assert.equal(r.fatal,null);
assert.equal(r.sessions.length,2);assert.equal(r.downloads.length,4);assert.ok(Object.values(r.cleanup).every(Boolean));
const expectedNames=['desktop-http-before-practice-study-notes.txt','desktop-http-after-practice-study-notes.txt','mobile-file-before-practice-study-notes.txt','mobile-file-after-practice-study-notes.txt'];
assert.deepEqual(r.downloads.map(x=>x.savedAs).sort(),expectedNames.sort());
const files=[];
for(const d of r.downloads){
 assert.equal(d.state,'completed');const b=await fs.readFile(path.join(directory,d.savedAs));
 assert.equal(b.length,d.bytes);assert.equal(sha(b),d.sha256);files.push({path:d.savedAs,bytes:b.length,sha256:sha(b)});
}
for(const f of r.sourceFiles){assert.equal(sha(await fs.readFile(path.join(source,f.path))),f.sha256,f.path)}
assert.equal(sha(await fs.readFile(r.course)),r.courseSha256);
let actualPidAbsent=false;
try{process.kill(r.browserLifecycle.actualBrowserPid,0)}catch(e){if(e.code==='ESRCH')actualPidAbsent=true;else throw e}
assert.ok(actualPidAbsent);
let profileAbsent=false;try{await fs.access(r.browserLifecycle.ownedProfile)}catch(e){if(e.code==='ENOENT')profileAbsent=true;else throw e}
assert.ok(profileAbsent);
const ps="@(Get-CimInstance Win32_Process -Filter \"Name='msedge.exe'\" | Where-Object { $_.CommandLine -and $_.CommandLine.Contains('"+r.browserLifecycle.ownedProfile.replaceAll("'","''")+"') } | Select-Object ProcessId,ParentProcessId,CommandLine) | ConvertTo-Json -Compress";
const raw=execFileSync('C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe',['-NoProfile','-NonInteractive','-Command',ps],{encoding:'utf8',timeout:10000}).trim();
const matching=raw?JSON.parse(raw):[];assert.deepEqual(matching,[]);
const report={schema:'recallweave.full-course-independent-artifact-review.v1',reviewer:'dc7255e161d3/estate_runtime',observedAt:new Date().toISOString(),disposition:'accepted',receiverSha256:r.receiverSha256,receipt:{path:directory+'/browser-receipt.json',bytes:bytes.length,sha256:sha(bytes)},passedGroups:21,sessions:r.sessions.map(x=>x.name),questionCount:r.questionCount,conceptCount:r.conceptCount,verifiedSourceFiles:r.sourceFiles.length,selectedCourseSha256:r.courseSha256,notes:files,browserLifecycle:r.browserLifecycle,cleanup:r.cleanup,independentCurrentState:{actualPidAbsent,profileAbsent,matchingOwnedProcesses:matching},limitations:['Artifact/state verification of the actual parent-run browser receipt; no duplicate learner run.','Presentation checked against supplied course key; no new subject-matter or learning-efficacy claim.']};
await fs.writeFile(base+'/runtime-edge-diagnostic/full-v3-independent-review.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
