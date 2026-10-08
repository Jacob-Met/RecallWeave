const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib'),cp=require('node:child_process');
const base='C:\\hamon-receiving-b47cbcf18759',custody=path.join(base,'custody');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const roots={source:path.join(base,'recallweave-current-81363271-v3'),driver:path.join(base,'recallweave-browser-current-driver'),negative:path.join(base,'recallweave-v2-label-control')};
const free=()=>{const s=fs.statfsSync(base);return Number(s.bavail)*Number(s.bsize);};
const envelope=JSON.parse(fs.readFileSync(path.join(custody,'recallweave-current-81363271-v3.transport.json'))),compressed=Buffer.from(envelope.base64,'base64');
if(compressed.length!==243137||sha(compressed)!=='24fad32f75f1fb53b7c450047976c786258f0bf53c33ef61a43d19e6d74a42e6')throw Error('Frozen transfer changed');
const packet=JSON.parse(zlib.gunzipSync(compressed,{maxOutputLength:8388608}));
if(packet.files.length!==45)throw Error('Exact staged closure changed');
for(const f of packet.files){const parts=f.path.split('/'),group=parts.shift();if(!roots[group]||parts.some(p=>!p||p==='.'||p==='..'||p.includes('\\')||p.includes(':')))throw Error('Staged path guard');const p=path.join(roots[group],...parts);const b=fs.readFileSync(p);if(b.length!==f.bytes||sha(b)!==f.sha256)throw Error('Staged file mismatch: '+f.path);}
const intakePath=path.join(custody,'recallweave-current-81363271-v3-intake.json'),before=fs.readFileSync(intakePath),intake=JSON.parse(before);
if(intake.files.length!==45||intake.sourceBase!=='81363271da63c5428fcb4cafba39fc89c3557b82')throw Error('Intake closure mismatch');
// Windows FlushFileBuffers requires a writable handle. The prior staging attempt
// had finished all45 source files, then failed only on fsync of a read-only intake
// handle. Resume without rewriting source or the intake bytes.
const fd=fs.openSync(intakePath,'r+');try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
if(!before.equals(fs.readFileSync(intakePath)))throw Error('Intake changed during flush');
const resumed={format:'hamon.windows-intake-flush-recovery/1',at:new Date().toISOString(),previousProcess:37504,previousFailure:'EPERM from fsync of read-only intake handle; browser had not started',intakePath,intakeSha256:sha(before),sourceFilesReverified:45,sourceRewritten:false,intakeBytesChanged:false,identityOrPermissionChange:false};
fs.writeFileSync(path.join(custody,'recallweave-intake-flush-recovery.json'),JSON.stringify(resumed,null,2)+'\n',{flag:'wx'});
const runtimePath=path.join(roots.driver,'runtime-windows.json'),pinsPath=path.join(roots.driver,'pins-cross-platform.json'),driver=path.join(roots.driver,'receive-floating-point-current-browser.mjs');
const runtime=JSON.parse(fs.readFileSync(runtimePath));
const dependency=JSON.parse(fs.readFileSync(runtime.dependencyReceiving.path));
if(sha(fs.readFileSync(runtime.dependencyReceiving.path))!==runtime.dependencyReceiving.sha256)throw Error('Dependency receipt changed');
for(const f of dependency.files){const b=fs.readFileSync(path.join(dependency.target,...f.path.split('/')));if(b.length!==f.bytes||sha(b)!==f.sha256)throw Error('Private dependency changed');}
const nodeHash=sha(fs.readFileSync(runtime.nodeExecutable)),browserHash=sha(fs.readFileSync(runtime.browserExecutable));
if(nodeHash!=='ba4e6d110e8c1592a1ecd390f6b05f3da124b13871a5be62b341a07a853c6c32'||browserHash!=='6849d2982038de9f9489a7b3858f3b785b7fec06a842c93c517281d21995c8ca')throw Error('Reviewed native runtime preimage changed');
const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z'),out=path.join(base,'browser-receiving-current-'+stamp);
const stdout=path.join(custody,'browser-current-'+stamp+'.stdout'),stderr=path.join(custody,'browser-current-'+stamp+'.stderr');
const a=fs.openSync(stdout,'wx'),b=fs.openSync(stderr,'wx');
const r={format:'hamon.current-browser-native-supervisor/1',started:new Date().toISOString(),output:out,intake:{path:intakePath,sha256:sha(fs.readFileSync(intakePath))},nodeHash,browserHash,storage:{before:free(),startGate:1073741824,stopFloor:268435456,minimumObserved:free()},status:'running',stdout,stderr,deadlineMs:225000};
if(r.storage.before<r.storage.startGate)throw Error('Final browser capacity gate');
const child=cp.spawn(runtime.nodeExecutable,[driver,'--runtime',runtimePath,'--pins',pinsPath,'--out',out],{cwd:base,stdio:['ignore',a,b],windowsHide:true});
r.driverPid=child.pid;console.log(JSON.stringify({status:r.status,pid:child.pid,output:out,free:r.storage.before,intake:r.intake}));
let stopping=false;
function stop(reason){if(stopping||child.exitCode!==null||child.signalCode!==null)return;stopping=true;r.stopReason=reason;const k=cp.spawn('C:\\Windows\\System32\\taskkill.exe',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});k.on('error',e=>r.stopError=e.message);}
const timer=setTimeout(()=>stop('owned-driver-deadline'),225000);
const monitor=setInterval(()=>{const n=free();r.storage.minimumObserved=Math.min(r.storage.minimumObserved,n);if(n<r.storage.stopFloor)stop('free-space-floor');},1000);
child.on('error',e=>r.spawnError={name:e.name,message:e.message});
child.on('close',(code,signal)=>{
 clearTimeout(timer);clearInterval(monitor);for(const fd of [a,b]){fs.fsyncSync(fd);fs.closeSync(fd);}
 r.finished=new Date().toISOString();r.exitCode=code;r.signal=signal;r.status=code===0&&!r.stopReason?'passed':'failed';r.storage.after=free();
 const rp=path.join(out,'receiving.json');if(fs.existsSync(rp)){const raw=fs.readFileSync(rp),q=JSON.parse(raw);r.receiving={path:rp,sha256:sha(raw),bytes:raw.length,status:q.status,groups:q.groups.map(g=>({name:g.name,status:g.status,checks:g.checks.length,error:g.error?.message})),passedChecks:q.passedChecks,sourceUnchanged:q.sourceUnchanged,cleanup:q.cleanup};}
 for(const k of ['stdout','stderr']){const raw=fs.readFileSync(r[k]);r[k+'Integrity']={bytes:raw.length,sha256:sha(raw)};}
 r.nodeUnchanged=sha(fs.readFileSync(runtime.nodeExecutable))===nodeHash;r.browserUnchanged=sha(fs.readFileSync(runtime.browserExecutable))===browserHash;
 if(!r.nodeUnchanged||!r.browserUnchanged)r.status='failed';
 const receiptPath=path.join(custody,'browser-current-supervisor-'+stamp+'.json'),fd=fs.openSync(receiptPath,'wx');try{fs.writeFileSync(fd,JSON.stringify(r,null,2)+'\n');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
 console.log(JSON.stringify({status:r.status,exitCode:code,output:out,receiving:r.receiving,receipt:receiptPath,sha256:sha(fs.readFileSync(receiptPath))}));process.exitCode=r.status==='passed'?0:1;
});
