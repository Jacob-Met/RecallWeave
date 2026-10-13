import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const base='D:/hamon-course-receiving-dc7255e161d3';
const directory=base+'/expected-loss-current-v4',source=base+'/source-current-ea860d9';
const reviewRoot=base+'/runtime-edge-diagnostic';
const mainRef='ea860d9a47ee16788e6d1220c7a0c5053cc08978';
const courseRef='1892d07bc16b009af91407f42836f5c2e67459ff';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const git=b=>crypto.createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const descriptor=(name,b)=>({path:name,bytes:b.length,sha256:sha(b),git_blob:git(b)});
const intakeBytes=await fs.readFile(base+'/current-intake-ea860d9.json'),intake=JSON.parse(intakeBytes);
assert.equal(path.resolve(intake.source),path.resolve(source));
assert.equal(intake.files.length,19);
assert.equal(new Set(intake.files.map(x=>x.path)).size,19);
const verifiedIntake=[];
for(const f of intake.files){
 const b=await fs.readFile(path.join(source,f.path));
 assert.equal(b.length,f.bytes,f.path);assert.equal(sha(b),f.sha256,f.path);assert.equal(git(b),f.sha,f.path);
 assert.equal(f.ref,f.path.startsWith('courses/')?courseRef:mainRef,f.path);
 verifiedIntake.push({...f});
}
const bytes=await fs.readFile(directory+'/browser-receipt.json'),r=JSON.parse(bytes);
assert.equal(bytes.length,206263);
assert.equal(sha(bytes),'c2d236f3eae8b5e9b20baca12b4fced5c6a92a4359bd1035aa6fbd629f3e1519');
assert.equal(r.receiverSha256,'9823f06e0321794045a0206ab5735ec052780c15b808e21fd3465bb9d40eb45a');
assert.equal(intake.receiver_sha256,r.receiverSha256);
const receiverBytes=await fs.readFile(source+'/tools/check_course_import_browser.mjs');
assert.equal(sha(receiverBytes),r.receiverSha256);assert.equal(git(receiverBytes),'763bf8bcbf17093e87f617da6a6e1c84e6dd0936');
assert.equal(r.checks.length,21);assert.ok(r.checks.every(x=>x.passed));assert.equal(r.fatal,null);
assert.equal(r.sessions.length,2);assert.equal(r.downloads.length,4);assert.ok(Object.values(r.cleanup).every(Boolean));
assert.equal(r.sourceFiles.length,17);assert.equal(new Set(r.sourceFiles.map(x=>x.path)).size,17);
const expectedNames=['desktop-http-before-practice-study-notes.txt','desktop-http-after-practice-study-notes.txt','mobile-file-before-practice-study-notes.txt','mobile-file-after-practice-study-notes.txt'];
assert.deepEqual(r.downloads.map(x=>x.savedAs).sort(),expectedNames.sort());
const notes=[];
for(const d of r.downloads){
 assert.equal(d.state,'completed');const b=await fs.readFile(path.join(directory,d.savedAs));
 assert.equal(b.length,d.bytes);assert.equal(sha(b),d.sha256);notes.push(descriptor(d.savedAs,b));
}
const before=JSON.parse(await fs.readFile(base+'/expected-loss-v3/browser-receipt.json','utf8'));
const changedConsumerFiles=[];
for(const f of r.sourceFiles){
 const pin=intake.files.find(x=>x.path===f.path);assert.ok(pin);assert.equal(pin.ref,mainRef);
 assert.equal(pin.sha256,f.sha256,f.path);
 const old=before.sourceFiles.find(x=>x.path===f.path);assert.ok(old,f.path);
 if(old.sha256!==f.sha256)changedConsumerFiles.push({path:f.path,beforeSha256:old.sha256,afterSha256:f.sha256,afterGitBlob:pin.sha});
}
assert.deepEqual(changedConsumerFiles.map(x=>x.path).sort(),['demo.html','index.html','src/app.mjs']);
assert.equal(path.resolve(r.course),path.resolve(source+'/courses/expected-loss-decisions.json'));
assert.equal(r.courseSha256,'ce40e731d2fd04a4d6d709f65114a35e3e8dd29c92fbfa279d60407fb04b98bb');
assert.equal(sha(await fs.readFile(r.course)),r.courseSha256);
assert.equal(r.browserLifecycle.remoteSocketClosed,true);
assert.equal(r.browserLifecycle.actualBrowserRunningAfterClose,false);
assert.ok(Number.isSafeInteger(r.browserLifecycle.actualBrowserPid)&&r.browserLifecycle.actualBrowserPid>0);
let actualPidAbsent=false;
try{process.kill(r.browserLifecycle.actualBrowserPid,0)}catch(e){if(e.code==='ESRCH')actualPidAbsent=true;else throw e}
assert.ok(actualPidAbsent);
let profileAbsent=false;try{await fs.access(r.browserLifecycle.ownedProfile)}catch(e){if(e.code==='ENOENT')profileAbsent=true;else throw e}
assert.ok(profileAbsent);
const ps="@(Get-CimInstance Win32_Process -Filter \"Name='msedge.exe'\" | Where-Object { $_.CommandLine -and $_.CommandLine.Contains('"+r.browserLifecycle.ownedProfile.replaceAll("'","''")+"') } | Select-Object ProcessId,ParentProcessId,CommandLine) | ConvertTo-Json -Compress";
const raw=execFileSync('C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe',['-NoProfile','-NonInteractive','-Command',ps],{encoding:'utf8',timeout:10000}).trim();
const matching=raw?JSON.parse(raw):[];assert.deepEqual(matching,[]);
const report={schema:'recallweave.current-core-independent-artifact-review.v1',reviewer:'dc7255e161d3/estate_runtime',observedAt:new Date().toISOString(),disposition:'accepted',sourceRef:mainRef,courseRef,source,intake:descriptor('current-intake-ea860d9.json',intakeBytes),receiver:descriptor('tools/check_course_import_browser.mjs',receiverBytes),receipt:descriptor(directory+'/browser-receipt.json',bytes),passedGroups:21,checks:r.checks.map(x=>({name:x.name,passed:x.passed})),sessions:r.sessions.map(x=>x.name),questionCount:r.questionCount,conceptCount:r.conceptCount,verifiedSourceFiles:r.sourceFiles.length,verifiedIntake,changedConsumerFiles,selectedCourseSha256:r.courseSha256,notes,browserLifecycle:r.browserLifecycle,cleanup:r.cleanup,independentCurrentState:{actualPidAbsent,profileAbsent,matchingOwnedProcesses:matching},limitations:['Artifact/state verification of the actual parent-run browser receipt; no duplicate learner run.','Separate addendum for current core ea860d9; the frozen 35-file earlier-core packet is unchanged.','Presentation checked against supplied course key; no new subject-matter or learning-efficacy claim.']};
const output=reviewRoot+'/full-v4-independent-review.json';
await fs.writeFile(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
const exports=[];
for(const name of ['full-v4-independent-review.json','review-full-v4.mjs']){
 const b=await fs.readFile(reviewRoot+'/'+name);exports.push({...descriptor(name,b),base64:b.toString('base64')});
}
const metadata={schema:'recallweave.current-core-review-publication.v1',files:exports.map(({base64,...x})=>x)};
await fs.writeFile(reviewRoot+'/full-v4-independent-review-metadata.json',JSON.stringify(metadata,null,2)+'\n',{flag:'wx'});
await fs.writeFile(reviewRoot+'/full-v4-independent-review-publication.json',JSON.stringify({files:exports},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({metadata,report}));
