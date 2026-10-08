import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
const ROOT="/Users/me/recallweave-recursion-content-a219f250962c", SOURCE=path.join(ROOT,"source"), RECEIVING=path.join(ROOT,"receiving");
const sha=bytes=>crypto.createHash("sha256").update(bytes).digest("hex");
const blob=bytes=>crypto.createHash("sha1").update(Buffer.from("blob "+bytes.length+"\0")).update(bytes).digest("hex");
const expected={
  "src/deck.mjs": "f0f8a4b234489c2388f427633f548d56c6ed4c03",
  "src/deck-author.mjs": "72456f3e69a20f2604c0d2389923310cf7d6b47d",
  "src/knowledge.mjs": "1a3a714dc0cf643b911ec196265746fb61c1f5cc",
  "src/review.mjs": "06c76298e0cc60fabedfb8514f5e4851d2381005",
  "src/session-export.mjs": "394b9148d210f885869102d6ea2475efa034bda4",
  "src/reflections.mjs": "1506c7b920ed827a94080bde73351daed6554590",
  "docs/deck-format.md": "db509876dcc6c46bc1253d280872d5014058005c"
};
const canonical={repository:"https://github.com/Jacob-Met/RecallWeave",commit:"e49aee89dc6ecf579f1c9152f32f826bf6f9d8b7",tree:"2a9cfa00c9a3f18ffa834335abb609c1cd7cc989"};
const fileInfo=p=>{const bytes=fs.readFileSync(path.join(SOURCE,p));return {path:p,bytes:bytes.length,sha256:sha(bytes),gitBlob:blob(bytes)};};
const save=(p,v)=>fs.writeFileSync(path.join(RECEIVING,p),JSON.stringify(v,null,2)+"\n");
const git=(...args)=>{const r=spawnSync("/usr/bin/git",args,{cwd:SOURCE,encoding:"utf8"});assert.equal(r.status,0,r.stderr||r.stdout);return r.stdout.trim();};
const stats=fs.statfsSync(ROOT),free=stats.bavail*stats.bsize;assert(free>=1024**3,"less than1GiB available");
for(const [p,b]of Object.entries(expected))assert.equal(fileInfo(p).gitBlob,b,p+" native consumer drift");
if(process.argv[2]==="baseline"){
assert(!fs.existsSync(path.join(SOURCE,".git")),"new baseline required");git("init","-b","estate/a219f250962c-recursion-content");git("config","user.name","HAMON estate a219f250962c");git("config","user.email","estate-a219f250962c@users.noreply.github.com");git("add","--",...Object.keys(expected));git("commit","-m","Receive exact RecallWeave e49 native consumers (partial source)");
const r={canonical,qualification:"Explicit partial native-consumer checkout; not a canonical main commit or full repository",localCommit:git("rev-parse","HEAD"),localTree:git("rev-parse","HEAD^{tree}"),node:process.version,freeBytes:free,files:Object.keys(expected).map(fileInfo)};save("baseline-source.json",r);console.log(JSON.stringify(r));}
else if(process.argv[2]==="test-freeze"){
const test="tests/recursion-call-stack-course.test.mjs";
const r=spawnSync(process.execPath,["--test",test],{cwd:SOURCE,encoding:"utf8",maxBuffer:4*1024*1024});
fs.writeFileSync(path.join(RECEIVING,"native-course-tests.stdout.txt"),r.stdout??"");fs.writeFileSync(path.join(RECEIVING,"native-course-tests.stderr.txt"),r.stderr??"");
const result={command:[process.execPath,"--test",test],cwd:SOURCE,node:process.version,status:r.status,signal:r.signal,startedFrom:git("rev-parse","HEAD"),stdoutSha256:sha(Buffer.from(r.stdout??"")),stderrSha256:sha(Buffer.from(r.stderr??"")),error:r.error?String(r.error):null};save("native-course-tests.json",result);console.log(JSON.stringify(result));if(r.status!==0){process.exitCode=1;console.log(r.stdout,r.stderr);}else{
const files=["courses/recursion-call-stack.json","courses/recursion-call-stack.md",test];git("add","--",...files);git("commit","-m","Add original recursion and call stack course with native content receiving");
const freeze={canonical,qualification:"Three new course/content-control files over seven exact native consumers; partial checkout only",commit:git("rev-parse","HEAD"),tree:git("rev-parse","HEAD^{tree}"),parent:git("rev-parse","HEAD^"),node:process.version,files:files.map(fileInfo),consumerFiles:Object.keys(expected).map(fileInfo),test:result,status:git("status","--porcelain")};assert.equal(freeze.status,"");save("source-freeze.json",freeze);console.log(JSON.stringify(freeze));
}}else throw new Error("expected baseline or test-freeze");
