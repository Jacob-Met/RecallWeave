const fs=require("node:fs"),path=require("node:path"),cp=require("node:child_process"),crypto=require("node:crypto"),z=require("node:zlib"),assert=require("node:assert/strict");
const root="/dev/shm/convex-hull-stock-234cae4aee53", sha=b=>crypto.createHash("sha256").update(b).digest("hex"), blob=b=>crypto.createHash("sha1").update(Buffer.concat([Buffer.from("blob "+b.length),Buffer.from([0]),b])).digest("hex");
const noteBytes=fs.readFileSync(path.join(root,"SOURCE.json"));assert.equal(sha(noteBytes),"5f4a2aa23e9a42fbf4d165182af1eb262e1356017dd8d0c157d4d86e8332bff3");
const note=JSON.parse(noteBytes), expected=note.files;assert.equal(expected.length,14);
function snapshot(){return Object.fromEntries(expected.map(m=>{const p=path.join(root,m.path),s=fs.lstatSync(p);assert.ok(s.isFile()&&!s.isSymbolicLink());const b=fs.readFileSync(p);const v={bytes:b.length,mode:s.mode&511,sha256:sha(b),gitBlob:blob(b)};assert.equal(v.bytes,m.bytes);assert.equal(v.sha256,m.sha256);assert.equal(v.gitBlob,m.gitBlob);assert.equal(v.mode,420);return[m.path,v];}));}
const receipt={schema:"recallweave.convex-hull.stock-filesystem/1",startedAt:new Date().toISOString(),runtime:{version:process.version,executable:process.execPath,platform:process.platform,arch:process.arch},sourceRoot:root,sourceNoteSha256:sha(noteBytes),productTree:note.productTree,sourceBefore:null,processes:[],sourceAfter:null,passed:false,browserExecuted:false,qualification:"Ordinary private filesystem source projection; normal maintained Node tests and actual default builder write followed by --check. No source/data/loader adapter, dependency installation, browser or GitHub Actions."};
const env={...process.env};delete env.NODE_OPTIONS;
try{
 receipt.sourceBefore=snapshot();
 for(const [id,args] of [
 ["maintained-tests",["--test","--test-reporter=tap","--test-concurrency=1","tests/convex-hull.test.mjs","tests/convex-hull-course.test.mjs"]],
 ["default-builder-write",["tools/build-convex-hull.mjs"]],
 ["builder-check",["tools/build-convex-hull.mjs","--check"]]]){
  const startedAt=new Date().toISOString();const r=cp.spawnSync(process.execPath,args,{cwd:root,env,encoding:null,timeout:30000,maxBuffer:8388608});
  const out=r.stdout??Buffer.alloc(0),err=r.stderr??Buffer.alloc(0);
  const encode=b=>({bytes:b.length,sha256:sha(b),base64:b.toString("base64"),utf8:new TextDecoder("utf-8",{fatal:true}).decode(b)});
  const entry={id,argv:[process.execPath,...args],cwd:root,startedAt,finishedAt:new Date().toISOString(),pid:r.pid,status:r.status,signal:r.signal,error:r.error?{name:r.error.name,message:r.error.message,code:r.error.code}:null,stdout:encode(out),stderr:encode(err)};
  receipt.processes.push(entry);
  assert.equal(r.status,0,id+" exit");assert.equal(r.signal,null,id+" signal");assert.equal(r.error,undefined,id+" error");assert.equal(err.length,0,id+" stderr");
  snapshot();
 }
 const tap=receipt.processes[0].stdout.utf8;receipt.testSummary={};
 for(const key of ["tests","pass","fail","cancelled","skipped","todo"]){const match=tap.match(new RegExp("^# "+key+" (\\d+)$","m"));assert.ok(match,key+" TAP summary");receipt.testSummary[key]=Number(match[1]);}
 assert.deepEqual(receipt.testSummary,{tests:11,pass:11,fail:0,cancelled:0,skipped:0,todo:0});
 assert.equal(receipt.processes[1].stdout.utf8,"Built courses/convex-hull-explorer.html (43637 bytes).\n");
 assert.equal(receipt.processes[2].stdout.utf8,"Convex hull page matches its sources.\n");
 receipt.sourceAfter=snapshot();assert.deepEqual(receipt.sourceAfter,receipt.sourceBefore);
 assert.equal(sha(fs.readFileSync(path.join(root,"SOURCE.json"))),receipt.sourceNoteSha256);
 receipt.sourceUnchanged=true;receipt.defaultBuilderWroteExactFrozenPage=true;receipt.passed=true;
}catch(error){receipt.failure={name:error.name,message:error.message,stack:error.stack};try{receipt.sourceAfter=snapshot();}catch(e){receipt.sourceAfterFailure={name:e.name,message:e.message};}process.exitCode=1;}
receipt.finishedAt=new Date().toISOString();const raw=Buffer.from(JSON.stringify(receipt,null,2)+"\n"),gz=z.gzipSync(raw,{level:9,mtime:0});
const result={schema:"recallweave.convex-hull.stock-filesystem-envelope/1",summary:{passed:receipt.passed,runtime:receipt.runtime,sourceFiles:expected.length,sourceBytes:expected.reduce((a,x)=>a+x.bytes,0),testSummary:receipt.testSummary??null,sourceUnchanged:receipt.sourceUnchanged??false,defaultBuilderWroteExactFrozenPage:receipt.defaultBuilderWroteExactFrozenPage??false,processes:receipt.processes.map(r=>({id:r.id,status:r.status,signal:r.signal,error:r.error,stdoutBytes:r.stdout.bytes,stderrBytes:r.stderr.bytes})),browserExecuted:false},raw:{bytes:raw.length,sha256:sha(raw)},gzip:{bytes:gz.length,sha256:sha(gz),base64:gz.toString("base64")}};
console.log(JSON.stringify(result,null,2));
