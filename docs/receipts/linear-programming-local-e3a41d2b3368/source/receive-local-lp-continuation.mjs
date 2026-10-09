#!/usr/bin/env node
// Independent remaining-work LP receiving after the immutable failed first epoch.
// Original L1 is admitted from exact retained evidence; it is never executed again.
// Node built-ins only; no product server.
// Exact source/input custody is external to this file and supplied in a pinned plan.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {spawn, execFileSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';

const BASE='/Users/me/Developer/recallweave-lp-local-receiving-e3a41d2b3368';
const INSTALL='/Users/me/Applications/RecallWeave-LP-e3a41d2b3368';
const AUTHOR='/Users/me/Developer/recallweave-lp-local-e3a41d2b3368';
const NODE='/opt/homebrew/Cellar/node/26.3.0/bin/node';
const PYTHON='/Library/Frameworks/Python.framework/Versions/3.13/Resources/Python.app/Contents/MacOS/Python';
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const CHROME_PLIST='/Applications/Google Chrome.app/Contents/Info.plist';
const LAUNCH=path.join(INSTALL,'Open LP Explorer.command');
const HTML=path.join(INSTALL,'site/courses/linear-programming-explorer.html');
const URL_EXPECTED=pathToFileURL(HTML).href;
const CONTINUATION=path.join(BASE,'continuation-v2');
const PLAN_PATH=path.join(CONTINUATION,'RECEIVING-PLAN.json');
const RUN=path.join(CONTINUATION,'run-v2');
const PROFILE=path.join(RUN,'profile');
const DOWNLOADS=path.join(RUN,'downloads');
const TEMP=path.join(RUN,'tmp');
const SELF=fileURLToPath(import.meta.url);
const COMMIT='b5e46d4f8c3013259c0baa81507652d900cb5074';
const TREE='988b548df0dee45259e54341b56beba1a054ccc9';
const FREEZE='66d4e6a9d3a2f12507aff55de865617b43c647e0';
const FREEZE_SHA='b894b230a64638aa9cf6f324ded29afebdb60ca3d26896f4e90e3a952e35e56e';
const BOOT_AMENDMENT='c4114311d5c5c631d6383c912846e68ea4fe9224';
const BOOT_SESSION='47865B22-BECE-4090-92BD-88664552E3A6';
const CONTINUATION_FREEZE='dfd2eb3d9dede88fe747ffdb8d2e892ed5c9f6d7';
const CONTINUATION_FREEZE_SHA='e912d4d210e87b2194192ab154fa7dc284df52e2ecdfd00816c75ea5fc672b6e';
const PREFIX_AMENDMENT='75c50d1e72ab98912be376bfa4770bc42e7bf601';
const PREFIX_AMENDMENT_SHA='b02be8777162afa224b4e793266c6939efe97a5f7e497e023e40c747b45b3942';
const PRIOR_EVIDENCE=[
  {
    "path": "receive-local-lp.mjs",
    "bytes": 47322,
    "sha256": "e8b0119f8834ce36ee57afae4103b0f0a569bbe354daa00f3b2e938d488a50e2",
    "gitBlob": "77f12825b480ed98a131f7430a483e6d147898bc"
  },
  {
    "path": "RECEIVING-PLAN.json",
    "bytes": 16446,
    "sha256": "5d219ad7f7a7a22aae7bbc8792bf0cc3b07f77533e1341a552c412e28cd56f73",
    "gitBlob": "0fa25ecd260bbffb80d2e7ee55d27ea8c062a3e8"
  },
  {
    "path": "SUPERVISOR-RECEIPT.json",
    "bytes": 32788,
    "sha256": "3c5981d4515b747c28d84d469b441ea7f5af6c2664cf0a3e6e2e2cbf5a4a4b09",
    "gitBlob": "8430aaf3e29527723b473dca9e01b30110917f9e"
  },
  {
    "path": "run-v1/RECEIPT.json",
    "bytes": 60658,
    "sha256": "3a9ac5b7572389718a5f1b95079585275f9a0edc297652ca692d5e2e63dd6215",
    "gitBlob": "df4aa070aa79b0394b6f8ac84c31ceb681ab3f04"
  },
  {
    "path": "run-v1/RECEIVING-PLAN.json",
    "bytes": 16446,
    "sha256": "5d219ad7f7a7a22aae7bbc8792bf0cc3b07f77533e1341a552c412e28cd56f73",
    "gitBlob": "0fa25ecd260bbffb80d2e7ee55d27ea8c062a3e8"
  },
  {
    "path": "run-v1/chrome-3.stderr",
    "bytes": 1014,
    "sha256": "f551e82fce5f190c49c2a1c47cdc2d99c5ee425205da44911c01392dc919c22e",
    "gitBlob": "4d29f2be343b7af9c9c1bdbffa264f438f775586"
  },
  {
    "path": "run-v1/chrome-3.stdout",
    "bytes": 0,
    "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "gitBlob": "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391"
  },
  {
    "path": "run-v1/installed-check-1.stderr",
    "bytes": 0,
    "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "gitBlob": "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391"
  },
  {
    "path": "run-v1/installed-check-1.stdout",
    "bytes": 2726,
    "sha256": "37756ec2767fe62648e171a1e9f140993a612ab49b974a69eb990c9a38863420",
    "gitBlob": "9d018ef93fd1635e4c200573a34065454dad23da"
  },
  {
    "path": "run-v1/installed-no-open-2.stderr",
    "bytes": 0,
    "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "gitBlob": "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391"
  },
  {
    "path": "run-v1/installed-no-open-2.stdout",
    "bytes": 2728,
    "sha256": "c647fa4b56ff315b518e9b21052d7dee13752205e30989d2737ea76947ec7e92",
    "gitBlob": "f31c86b07003469c03bb0b8c48d758182a3e71db"
  }
];
const RELEASE_SHA='2328e2f3fba72cc067eeb8b29f7c0c28e83deb94cd95304ed489e45c3ffaecae';
const ASSETS={
 'site/courses/linear-programming-explorer.html':{bytes:64651,sha256:'a0e64d648b19b0d3cea8fbf321cc318d811acfc7e376e5553ba41e7fcb2cb66f',gitBlob:'de1719274b8acf7b9c161e993b7b9dc1ac93d812'},
 'site/courses/linear-programming.json':{bytes:13211,sha256:'d251a3bc174d109d185d600871f8890d81722aed5c190f759b604d162685c5c5',gitBlob:'626390853e90df96de34f061e7a4f5114c36d067'},
 'site/courses/linear-programming.md':{bytes:8028,sha256:'fa3a0f5a133189ef3a52cd933060245703185f2fcd69327207128dae06fe4e5d',gitBlob:'717653e782acd1d23113117d70cdc7c0a5cd301b'}
};
const SOURCE_NAMES=['install.py','open.py','Open LP Explorer.command.in','README.md','LP-ASSETS.json','RELEASE.json'];
const INSTALLED_NAMES=[...Object.keys(ASSETS),'open.py','Open LP Explorer.command','README.md','RELEASE.json',...SOURCE_NAMES.map(n=>'recovery/'+n),'INSTALLATION.json'].sort();
const LIMITS={disk_floor:268435456,memory_floor:2147483648,owned_bytes:67108864,capture_bytes:8388608,source_bytes:4194304,browser_seconds:120,work_milliseconds:100000,emergency_milliseconds:115000};
const START=Date.now();
const r={schema:'recallweave.lp.mac-installed-continuation/1',owner:'autonomous-e3a41d2b3368/foundation_recovery',
 startedAt:new Date().toISOString(),sourceCommit:COMMIT,sourceTree:TREE,freeze:FREEZE,continuationFreeze:CONTINUATION_FREEZE,prefixAmendment:PREFIX_AMENDMENT,
 installation:INSTALL,receivingRoot:BASE,run:RUN,fileUrl:URL_EXPECTED,limits:LIMITS,
 scopes:{productServer:false,newDependencies:false,defaultProfile:false,finderDoubleClick:false,physicalKeyboard:false,priorTenGroupsReused:true,normalOpenDispatch:'author-control/source scope only; no installed launcher invocation in this continuation',firstEpochOverall:'FAILED and immutable',originalL1:'reused from exact original native evidence',newGroups:'L2-L5 only'},
 groups:[],guards:[],processes:[],processCensus:[],processQueries:[],actions:[],downloadEvents:[],downloadArtifacts:[],
 pageRequests:[],pageErrors:[],protocolErrors:[],transportEvents:[],browserCloseIntent:null,captures:[],cleanup:[],terminal:null};
let plan,created=false,cdp,browser,monitor,workTimer,emergencyTimer,fatal;
let nextChild=0,captured=0;
let priorBodies;
const children=[];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const git=b=>crypto.createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const bytesPin=b=>({bytes:b.length,sha256:sha(b),gitBlob:git(b)});
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const env={...process.env,PYTHONDONTWRITEBYTECODE:'1',TMPDIR:TEMP+'/'};
function need(value,message){assert.ok(value,message);}
function stamp(){return new Date().toISOString();}
function transportPhase(){return r.browserCloseIntent?'close-requested':'active';}
function protocolError(error,kind){
 appendEvent(r.protocolErrors,{kind,error:String(error),phase:transportPhase(),browserCloseIntentAt:r.browserCloseIntent?.at??null});
}
function stable(s){return {device:String(s.dev),inode:String(s.ino),bytes:String(s.size),mode:Number(s.mode&0o777n),uid:Number(s.uid),gid:Number(s.gid),mtimeNs:String(s.mtimeNs),ctimeNs:String(s.ctimeNs)};}
function ordinaryParents(filename){
 let p=path.dirname(filename);
 for(;;){const s=fs.lstatSync(p);need(s.isDirectory()&&!s.isSymbolicLink(),'ordinary directory required: '+p);if(p===path.dirname(p))break;p=path.dirname(p);}
}
function readRegular(filename,max){
 ordinaryParents(filename);
 const before=fs.lstatSync(filename,{bigint:true});
 need(before.isFile()&&!before.isSymbolicLink(),'ordinary file required: '+filename);
 need(before.size<=BigInt(max),'file exceeds input bound: '+filename);
 const fd=fs.openSync(filename,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
 let body,opened,after;
 try{
  opened=fs.fstatSync(fd,{bigint:true});
  assert.deepEqual(stable(opened),stable(before),'opened identity changed: '+filename);
  const buffer=Buffer.alloc(Math.min(max+1,Number(before.size)+1));let used=0;
  while(used<buffer.length){const count=fs.readSync(fd,buffer,used,buffer.length-used,null);if(count===0)break;used+=count;}
  body=buffer.subarray(0,used);after=fs.fstatSync(fd,{bigint:true});
 }finally{fs.closeSync(fd);}
 need(body.length<=max,'read exceeds input bound: '+filename);
 assert.deepEqual(stable(after),stable(before),'file changed during read: '+filename);
 assert.deepEqual(stable(fs.lstatSync(filename,{bigint:true})),stable(before),'pathname changed during read: '+filename);
 return {body,pin:bytesPin(body),metadata:stable(before)};
}
function assertPin(actual,expected,label){
 need(expected&&Number.isSafeInteger(expected.bytes)&&expected.bytes>=0,label+' expected byte count');
 assert.equal(actual.bytes,expected.bytes,label+' bytes');
 assert.equal(actual.sha256,expected.sha256,label+' sha256');
 assert.equal(actual.gitBlob,expected.gitBlob,label+' Git blob');
}
function exclusive(name,body){
 need(created,'run has not been admitted');
 const b=Buffer.isBuffer(body)?body:Buffer.from(body);
 need(!name.includes('/')&&!name.includes('\\')&&name!=='.'&&name!=='..','owned output basename');
 need(ownedSize()+b.length<=LIMITS.owned_bytes,'owned output cap before write');
 fs.writeFileSync(path.join(RUN,name),b,{flag:'wx',mode:0o600});
 return {path:name,...bytesPin(b)};
}
function save(){
 if(!created)return;
 const body=Buffer.from(JSON.stringify(r,null,2)+'\n');
 need(body.length<2097152,'receipt cap');
 fs.writeFileSync(path.join(RUN,'RECEIPT.json'),body,{flag:'w',mode:0o600});
}
function ownedSize(){
 if(!created)return 0;
 let total=0,count=0;
 const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){
  need(++count<20000,'owned entry bound');
  const p=path.join(d,e.name);
  try{const s=fs.lstatSync(p);if(s.isDirectory()&&!s.isSymbolicLink())walk(p);else if(s.isFile())total+=s.size;}catch(error){if(error.code!=='ENOENT')throw error;}
 }};
 walk(RUN);return total;
}
function snapshotInstall(){
 const files={},directories={};let count=0,total=0;
 const walk=(d,rel)=>{const ds=fs.lstatSync(d,{bigint:true});
  need(ds.isDirectory()&&!ds.isSymbolicLink(),'installed directory type: '+d);
  need(ds.uid===501n,'installed directory owner: '+d);
  directories[rel||'.']={mode:Number(ds.mode&0o777n),uid:Number(ds.uid),device:String(ds.dev),inode:String(ds.ino)};
  for(const name of fs.readdirSync(d).sort()){
   need(++count<=64,'installed entry bound');const p=path.join(d,name),s=fs.lstatSync(p);
   const key=rel?rel+'/'+name:name;
   need(!s.isSymbolicLink(),'installed symlink refusal: '+key);
   if(s.isDirectory())walk(p,key);
   else{
    const v=readRegular(p,262144);need(v.metadata.uid===501,'installed file owner: '+key);
    files[key]={...v.pin,mode:v.metadata.mode,metadata:v.metadata};total+=v.pin.bytes;
   }
  }
 };
 ordinaryParents(INSTALL);walk(INSTALL,'');
 need(total<=LIMITS.source_bytes,'installed package bound');
 assert.deepEqual(Object.keys(files).sort(),INSTALLED_NAMES,'complete fourteen-file installed inventory');
 assert.deepEqual(Object.keys(directories).sort(),['.','recovery','site','site/courses'],'complete installed directory inventory');
 for(const [name,pin]of Object.entries(ASSETS))assertPin(files[name],pin,'frozen product '+name);
 return {files,directories,totalBytes:total};
}
function planPinMap(){
 need(Array.isArray(plan.installedFiles)&&plan.installedFiles.length===14,'plan installed fourteen files');
 const out={};
 for(const item of plan.installedFiles){
  need(item&&typeof item.path==='string'&&INSTALLED_NAMES.includes(item.path),'plan installed path');
  need(!Object.hasOwn(out,item.path),'duplicate plan installed path');
  need(Number.isInteger(item.mode)&&item.mode>=0&&item.mode<=0o777,'plan mode');
  out[item.path]=item;
 }
 assert.deepEqual(Object.keys(out).sort(),INSTALLED_NAMES);
 return out;
}
function compareInstalled(snapshot){
 const expected=planPinMap();
 for(const [name,pin]of Object.entries(expected)){
  assertPin(snapshot.files[name],pin,'externally pinned installation '+name);
  assert.equal(snapshot.files[name].mode,pin.mode,'externally pinned installed mode '+name);
 }
}
function inputSnapshot(){
 const out={};
 need(Array.isArray(plan.retainedInputs)&&plan.retainedInputs.length>=6&&plan.retainedInputs.length<=32,'bounded retained source inputs required');
 let total=0;
 for(const item of plan.retainedInputs){
  need(item&&typeof item.path==='string'&&item.path.startsWith(AUTHOR+'/'),'retained input must be in exact new author root');
  need(path.resolve(item.path)===item.path&&!Object.hasOwn(out,item.path),'canonical unique retained source path');
  const v=readRegular(item.path,1048576);assertPin(v.pin,item,'retained author input '+item.path);out[item.path]={...v.pin,metadata:v.metadata};total+=v.pin.bytes;
 }
 need(total<=LIMITS.source_bytes,'retained source bound');return out;
}
function capacity(label){
 const d=fs.statfsSync('/Users/me');
 const vm=execFileSync('/usr/bin/vm_stat',[],{encoding:'utf8',timeout:2500,maxBuffer:65536});
 const page=vm.match(/page size of (\d+) bytes/);need(page,'vm_stat page size');
 let pages=0;for(const name of ['free','inactive','speculative']){
  const m=vm.match(new RegExp('^Pages '+name+':\\s+(\\d+)\\.','m'));need(m,'vm_stat '+name);pages+=Number(m[1]);
 }
 const observation={at:stamp(),label,diskFreeBytes:d.bavail*d.bsize,memoryFreeInactiveSpeculativeBytes:pages*Number(page[1]),ownedBytes:ownedSize(),capturedBytes:captured};
 r.guards.push(observation);
 need(observation.diskFreeBytes>=LIMITS.disk_floor,'disk floor');
 need(observation.memoryFreeInactiveSpeculativeBytes>=LIMITS.memory_floor,'memory floor');
 need(observation.ownedBytes<=LIMITS.owned_bytes,'owned receiver bound');
 need(captured<=LIMITS.capture_bytes,'aggregate capture bound');
 return observation;
}
function processOutput(program,args,maxBuffer=262144){
 let stdout='',stderr='',exitCode=0;
 try{stdout=execFileSync(program,args,{encoding:'utf8',env:{...env,COMMAND_MODE:'unix2003',LC_ALL:'C'},timeout:2500,maxBuffer});}
 catch(error){
  stdout=String(error.stdout??'');stderr=String(error.stderr??'');exitCode=error.status;
  if(exitCode!==1||stdout.trim()||stderr.trim())throw Error('Scoped process query failed: '+program+' '+JSON.stringify(args)+'; '+String(error));
 }
 need(r.processQueries.length<512,'bounded process-query history');
 r.processQueries.push({at:stamp(),program,args,compatibility:'COMMAND_MODE=unix2003; LC_ALL=C',exitCode,stdoutBytes:Buffer.byteLength(stdout),stdoutSha256:sha(Buffer.from(stdout)),stderr});
 return stdout;
}
function processRows(raw){
 const rows=[];
 for(const line of raw.split('\n').filter(x=>x.trim())){
  const m=line.match(/^\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+([A-Za-z]{3}\s+[A-Za-z]{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+\d{4})\s+(.*)$/);
  need(m,'malformed bounded scoped process row');
  rows.push({pid:Number(m[1]),ppid:Number(m[2]),pgid:Number(m[3]),uid:Number(m[4]),lstart:m[5],command:m[6]});
 }
 need(rows.length<=512,'scoped process row bound');return rows;
}
function processCensus(label){
 const fields='pid=,ppid=,pgid=,uid=,lstart=,command=',entries=[],queriedGroups=[];
 for(const state of children){
  const rec=state.rec;
  if(!Number.isInteger(rec.pid)||rec.groupRetiredAt)continue;
  queriedGroups.push({sequence:rec.sequence,pgid:rec.pid});
  const rows=processRows(processOutput('/bin/ps',['-ww','-g',String(rec.pid),'-o',fields]));
  for(const e of rows){assert.equal(e.pgid,rec.pid,'provider selected only the requested created group');assert.equal(e.uid,501,'owned group account');}
  const sameMember=e=>{const previous=state.knownMembers.get(e.pid);return previous&&previous.pgid===e.pgid&&previous.uid===e.uid&&previous.lstart===e.lstart;};
  const liveLeader=!rec.exitedAt&&state.child.exitCode===null&&state.child.signalCode===null&&rows.some(e=>e.pid===rec.pid);
  const continuity=rows.some(sameMember),owned=liveLeader||continuity;
  if(owned){
   rec.groupOwnership??=[];
   for(const e of rows){
    if(!sameMember(e))rec.groupOwnership.push({at:stamp(),pid:e.pid,pgid:e.pgid,uid:e.uid,lstart:e.lstart,basis:liveLeader?'receiver-created live group leader':'previously observed created-group member'});
    state.knownMembers.set(e.pid,{pgid:e.pgid,uid:e.uid,lstart:e.lstart});
   }
  }
  for(const e of rows)entries.push({...e,selection:'created-pgid',ownerSequence:rec.sequence,createdGroupOwnership:owned});
  if(rows.length===0&&rec.terminal){rec.groupRetiredAt=stamp();rec.groupRetirement='empty provider-scoped census after this exact child reached terminal state';}
 }
 if(browser){
  const pattern='(^|[[:space:]])--user-data-dir='+PROFILE+'([[:space:]]|$)';
  const raw=processOutput('/usr/bin/pgrep',['-f',pattern],16384);
  const ids=raw.split('\n').filter(x=>x.trim()).map(x=>{need(/^\d+$/.test(x.trim()),'bounded profile PID');return Number(x.trim());});
  need(ids.length<=128&&new Set(ids).size===ids.length,'profile PID selection bound');
  if(ids.length){
   const selected=new Set(ids);
   const rows=processRows(processOutput('/bin/ps',['-ww','-p',ids.join(','),'-o',fields]));
   for(const e of rows){
    need(selected.has(e.pid),'provider returned an unselected profile PID');
    need(e.uid===501&&e.command.split(/\s+/).includes('--user-data-dir='+PROFILE),'exact profile/account ownership remains unresolved');
    const existing=entries.find(v=>v.pid===e.pid);
    if(existing)existing.exactProfileMatched=true;
    else entries.push({...e,selection:'exact-profile',createdGroupOwnership:false,ownership:'unresolved outside receiver-created groups; observation only, never blanket signaling authority'});
   }
  }
 }
 r.processCensus.push({label,at:stamp(),queriedGroups,exactProfile:browser?PROFILE:null,entries});return entries;
}
function signalOwned(signal){
 let observed;
 try{observed=processCensus('before owned '+signal);}
 catch(error){r.cleanup.push({at:stamp(),scope:'owned census before signal',error:String(error)});}
 for(const state of children){
  const {child,rec}=state;
  if(!Number.isInteger(rec.pid)||rec.groupRetiredAt)continue;
  const proven=observed?.some(e=>e.selection==='created-pgid'&&e.ownerSequence===rec.sequence&&e.pgid===rec.pid&&e.createdGroupOwnership);
  try{
   if(proven){
    process.kill(-rec.pid,signal);
    r.cleanup.push({at:stamp(),sequence:rec.sequence,pid:rec.pid,signal,scope:'receiver-created group with current creation/member-continuity evidence'});
   }else if(!rec.exitedAt&&child.exitCode===null&&child.signalCode===null){
    child.kill(signal);
    r.cleanup.push({at:stamp(),sequence:rec.sequence,pid:rec.pid,signal,scope:'individual live ChildProcess only; group ownership not independently established'});
   }
  }catch(error){if(error.code!=='ESRCH')r.cleanup.push({sequence:rec.sequence,pid:rec.pid,signal,error:String(error)});}
 }
}
function failActive(error){
 if(!fatal)fatal=error;
 signalOwned('SIGTERM');
}
function appendEvent(array,value){
 if(array.length>=4096){failActive(Error('bounded event inventory exceeded'));return;}
 array.push({at:stamp(),...value});
}
function launch(label,program,args){
 need(!fatal,'active receiver refused: '+fatal);
 const seq=++nextChild,stdout=label+'-'+seq+'.stdout',stderr=label+'-'+seq+'.stderr';
 const ofd=fs.openSync(path.join(RUN,stdout),'wx',0o600),efd=fs.openSync(path.join(RUN,stderr),'wx',0o600);
 const rec={sequence:seq,label,program,args,cwd:INSTALL,detached:true,pid:null,startedAt:stamp(),stdout,stderr,stdoutBytes:0,stderrBytes:0,terminal:false};
 const child=spawn(program,args,{cwd:INSTALL,env,detached:true,stdio:['ignore','pipe','pipe']});
 rec.pid=child.pid??null;r.processes.push(rec);
 let resolveClosed;const closed=new Promise(resolve=>{resolveClosed=resolve;});
 const state={child,rec,closed,knownMembers:new Map()};children.push(state);
 const capture=(name,fd,data)=>{
  const key=name+'Bytes',remaining=Math.max(0,1048576-rec[key]);
  const keep=data.subarray(0,remaining);
  if(keep.length){fs.writeSync(fd,keep);rec[key]+=keep.length;captured+=keep.length;}
  if(keep.length!==data.length||captured>LIMITS.capture_bytes)failActive(Error(label+' '+name+' capture bound exceeded'));
 };
 child.stdout.on('data',b=>capture('stdout',ofd,b));
 child.stderr.on('data',b=>capture('stderr',efd,b));
 child.on('error',error=>{rec.spawnError=String(error);});
 child.on('exit',(code,signal)=>{rec.exitCode=code;rec.signal=signal;rec.exitedAt=stamp();});
 child.on('close',(code,signal)=>{
  fs.closeSync(ofd);fs.closeSync(efd);rec.exitCode=code;rec.signal=signal;rec.finishedAt=stamp();rec.terminal=true;
  rec.stdoutPin=bytesPin(fs.readFileSync(path.join(RUN,stdout)));
  rec.stderrPin=bytesPin(fs.readFileSync(path.join(RUN,stderr)));
  resolveClosed();
 });
 return state;
}
async function waitClosed(state,ms=8000){
 if(!state||state.rec.terminal)return;
 let timer;
 try{await Promise.race([state.closed,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('owned child close deadline: '+state.rec.label)),ms);})]);}
 finally{clearTimeout(timer);}
}
async function until(fn,label,ms=8000,allowFatal=false){
 const end=Date.now()+ms;let last;
 while(Date.now()<end){
  if(fatal&&!allowFatal)throw fatal;
  try{const value=await fn();if(value)return value;}catch(error){last=error;}
  await pause(80);
 }
 throw Error(label+' timed out'+(last?': '+last.message:''));
}
class CDP{
 constructor(ws){
  this.ws=ws;this.id=0;this.pending=new Map();this.closed=false;
  ws.addEventListener('message',event=>{
   try{
    need(typeof event.data==='string','text CDP message expected');
    need(event.data.length<=12582912,'CDP message bound');
    const v=JSON.parse(event.data);
    if(v.id){
     const p=this.pending.get(v.id);if(p){clearTimeout(p.timer);this.pending.delete(v.id);v.error?p.reject(Error(JSON.stringify(v.error))):p.resolve(v.result);}return;
    }
    if(v.method==='Browser.downloadWillBegin'||v.method==='Browser.downloadProgress')appendEvent(r.downloadEvents,{method:v.method,...v.params});
    if(v.method==='Network.requestWillBeSent')appendEvent(r.pageRequests,{session:v.sessionId,url:v.params.request.url,method:v.params.request.method,type:v.params.type,documentURL:v.params.documentURL});
    if(v.method==='Runtime.exceptionThrown')appendEvent(r.pageErrors,{method:v.method,session:v.sessionId,details:v.params.exceptionDetails});
    if(v.method==='Log.entryAdded'&&v.params.entry.level==='error')appendEvent(r.pageErrors,{method:v.method,session:v.sessionId,details:v.params.entry});
    if(v.method==='Runtime.consoleAPICalled'&&v.params.type==='error')appendEvent(r.pageErrors,{method:v.method,session:v.sessionId,details:v.params.args});
    if(v.method==='Runtime.bindingCalled'&&v.params.name==='__e3LPInstalledInput')appendEvent(r.actions,{session:v.sessionId,...JSON.parse(v.params.payload)});
   }catch(error){protocolError(error,'CDP message processing');failActive(error);}
  });
  ws.addEventListener('close',event=>{
   appendEvent(r.transportEvents,{kind:'websocket-close',phase:transportPhase(),code:event.code,wasClean:event.wasClean,reason:event.reason,browserCloseIntentAt:r.browserCloseIntent?.at??null});
   this.closed=true;for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(Error('owned CDP closed'));}this.pending.clear();
  });
  ws.addEventListener('error',()=>{
   protocolError('owned CDP websocket error','websocket-error');
   if(!r.browserCloseIntent)failActive(Error('active owned CDP websocket error'));
  });
 }
 static async connect(url){
  const ws=new WebSocket(url);let timer;
  try{await Promise.race([
   new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',()=>reject(Error('owned WebSocket failed')),{once:true});}),
   new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('owned WebSocket open deadline')),6000);})
  ]);}catch(error){ws.close();throw error;}finally{clearTimeout(timer);}
  return new CDP(ws);
 }
 call(method,params={},sessionId){
  need(!this.closed,'CDP already closed');
  return new Promise((resolve,reject)=>{
   const id=++this.id,timer=setTimeout(()=>{this.pending.delete(id);reject(Error(method+' deadline'));},8000);
   this.pending.set(id,{resolve,reject,timer});
   try{this.ws.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));}
   catch(error){clearTimeout(timer);this.pending.delete(id);reject(error);}
  });
 }
}
async function evaluate(sid,expression){
 const v=await cdp.call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},sid);
 if(v.exceptionDetails)throw Error('browser inspection failed: '+JSON.stringify(v.exceptionDetails));
 return v.result.value;
}
async function newPage(){
 const {targetId}=await cdp.call('Target.createTarget',{url:'about:blank'});
 const {sessionId:sid}=await cdp.call('Target.attachToTarget',{targetId,flatten:true});
 for(const method of ['Page.enable','Runtime.enable','Network.enable','Log.enable'])await cdp.call(method,{},sid);
 await cdp.call('Emulation.setDeviceMetricsOverride',{width:1280,height:960,deviceScaleFactor:1,mobile:false},sid);
 await cdp.call('Runtime.addBinding',{name:'__e3LPInstalledInput'},sid);
 const source="for(const kind of ['click','keydown','keypress','keyup','input','change','submit'])document.addEventListener(kind,event=>{const e=event.target.closest?.('button,select,input,textarea,form');if(!e?.id)return;__e3LPInstalledInput(JSON.stringify({kind,trusted:event.isTrusted,id:e.id,key:event.key??null,code:event.code??null,charCode:event.charCode??null,ctrlKey:!!event.ctrlKey,altKey:!!event.altKey,metaKey:!!event.metaKey,value:('value' in e?e.value:null)}));},true);";
 await cdp.call('Page.addScriptToEvaluateOnNewDocument',{source},sid);
 return {targetId,sid};
}
async function navigate(page){
 const nav=await cdp.call('Page.navigate',{url:URL_EXPECTED},page.sid);need(!nav.errorText,nav.errorText);
 await until(()=>evaluate(page.sid,"document.readyState==='complete'&&location.href==="+JSON.stringify(URL_EXPECTED)+"&&!!document.querySelector('#optimum-summary')"),'installed file page load');
 const tree=await cdp.call('Page.getFrameTree',{},page.sid);page.frameId=tree.frameTree.frame.id;
 assert.equal(tree.frameTree.frame.url,URL_EXPECTED,'actual installed frame URL');
}
async function snapshot(page){
 return await evaluate(page.sid,"(()=>{const by=id=>document.getElementById(id);return {url:location.href,readyState:document.readyState,preset:by('preset').value,presetTitle:by('preset').selectedOptions[0].textContent,resultVisible:!by('result').hidden&&by('result').getBoundingClientRect().width>0,resultTitle:by('result-title').textContent,summary:by('optimum-summary').textContent,coverage:by('coverage').textContent,region:by('region-badge').textContent,selectedVertex:by('vertex-select').value,vertexDetail:by('vertex-detail').textContent,vertices:[...by('vertex-select').options].map(o=>({id:o.value,text:o.textContent})),vertexRows:by('vertices-table').tBodies[0].rows.length,pairRows:by('pairs-table').tBodies[0].rows.length,observationEnabled:!by('download-observation').disabled,fields:Object.fromEntries(['xmin','xmax','ymin','ymax','constraints','p','q','sense'].map(id=>[id,by(id).value])),storage:{local:localStorage.length,session:sessionStorage.length}};})()");
}
async function click(page,selector){
 const point=await evaluate(page.sid,"(()=>{const e=document.querySelector("+JSON.stringify(selector)+");if(!e||e.disabled)throw Error('missing/disabled control');e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();if(b.width<=0||b.height<=0)throw Error('hidden control');return {x:b.left+b.width/2,y:b.top+b.height/2};})()");
 r.actions.push({at:stamp(),kind:'receiver-mouse-command',selector,point});
 await cdp.call('Input.dispatchMouseEvent',{type:'mouseMoved',...point},page.sid);
 await cdp.call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point},page.sid);
 await cdp.call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point},page.sid);
}
async function printableKey(page,character){
 need(/^[A-Za-z0-9 ]$/.test(character),'bounded printable native key');
 const code=character===' '?'Space':/[0-9]/.test(character)?'Digit'+character:'Key'+character.toUpperCase();
 const number=character.toUpperCase().charCodeAt(0);
 const params={key:character,code,windowsVirtualKeyCode:number,modifiers:0};
 await cdp.call('Input.dispatchKeyEvent',{type:'rawKeyDown',...params},page.sid);
 await cdp.call('Input.dispatchKeyEvent',{type:'char',...params,text:character,unmodifiedText:character},page.sid);
 await cdp.call('Input.dispatchKeyEvent',{type:'keyUp',...params},page.sid);
}
async function select(page,selector,value,prefix){
 const frozen=selector==='#preset'?{value:'fractional',prefix:'A fr',label:'A fractional continuous optimum'}:
  selector==='#vertex-select'?{value:'V3',prefix:'V3',label:'V3 (5/3, 5/3)'}:null;
 need(frozen,'only the two frozen selects are admitted');
 assert.equal(value,frozen.value);assert.equal(prefix,frozen.prefix);
 const options=await evaluate(page.sid,"(()=>{const e=document.querySelector("+JSON.stringify(selector)+");if(!e||e.disabled)throw Error('missing select');e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();if(b.width<=0||b.height<=0)throw Error('hidden select');e.focus();return [...e.options].map(o=>({value:o.value,label:o.textContent,disabled:o.disabled}));})()");
 need(Array.isArray(options)&&options.length>0&&options.length<=16,'bounded original options');
 const matches=options.filter(o=>!o.disabled&&o.label.trimStart().toLowerCase().startsWith(prefix.toLowerCase()));
 assert.equal(matches.length,1,'frozen prefix uniquely identifies an original option');
 assert.deepEqual(matches[0],{value,label:frozen.label,disabled:false});
 const from=r.actions.length;
 r.actions.push({at:stamp(),kind:'receiver-focus',selector,method:'DOM focus only; no app value or handler mutation'});
 r.actions.push({at:stamp(),kind:'receiver-typeahead-command',selector,prefix,method:'one rawKeyDown/char/keyUp sequence per printable character; no Home, arrow or Enter'});
 for(const character of prefix)await printableKey(page,character);
 assert.equal(await evaluate(page.sid,"document.querySelector("+JSON.stringify(selector)+").value"),value,'actual native typeahead select '+selector);
 const id=selector.slice(1),events=r.actions.slice(from).filter(a=>a.id===id);
 assert.deepEqual(events.filter(a=>a.kind==='keypress').map(a=>a.key),[...prefix],'exact printable native keypress sequence');
 for(const event of events.filter(a=>['keydown','keypress','keyup'].includes(a.kind))){
  need(event.trusted&&!event.ctrlKey&&!event.altKey&&!event.metaKey,'trusted native printable key without control modifiers');
 }
 need(events.some(a=>a.kind==='input'&&a.trusted&&a.value===value),'native selected input event '+selector);
 need(events.some(a=>a.kind==='change'&&a.trusted&&a.value===value),'native selected change event '+selector);
 need(!r.actions.slice(from).some(a=>(a.kind==='click'&&a.id==='apply')||(a.kind==='submit'&&a.id==='problem-form')),'typeahead must not implicitly apply the form');
 r.actions.push({at:stamp(),kind:'receiver-selection-observed',selector,value,prefix,method:'actual native typeahead and trusted selection events'});
}
async function capture(page,name){
 const m=await cdp.call('Page.getLayoutMetrics',{},page.sid);
 const bounds=m.cssContentSize??m.contentSize;
 need(bounds.width<=1600&&bounds.height<=12000,'bounded page dimensions');
 const clip={x:0,y:0,width:Math.min(1280,bounds.width),height:Math.min(5000,bounds.height),scale:1};
 const {data}=await cdp.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip},page.sid);
 const b=Buffer.from(data,'base64');need(b.length>8&&b.subarray(0,8).toString('hex')==='89504e470d0a1a0a','PNG capture');
 need(captured+b.length<=LIMITS.capture_bytes,'aggregate rendered capture bound');
 captured+=b.length;r.captures.push({at:stamp(),url:URL_EXPECTED,clip,...exclusive(name,b)});
}
function group(id,details){
 r.groups.push({id,passed:true,at:stamp(),...details});save();console.log(id+' PASS');
}
function priorEvidenceSnapshot(retainBodies=false){
 need(Array.isArray(plan.priorEpoch.evidenceFiles),'prior evidence plan list');
 assert.deepEqual(plan.priorEpoch.evidenceFiles,PRIOR_EVIDENCE,'exact eleven immutable prior evidence files');
 const out={};if(retainBodies)priorBodies=new Map();
 for(const expected of PRIOR_EVIDENCE){
  need(!path.isAbsolute(expected.path)&&!expected.path.split('/').includes('..'),'fixed prior relative path');
  const filename=path.join(BASE,expected.path),v=readRegular(filename,2097152);
  assertPin(v.pin,expected,'original first-epoch evidence '+expected.path);
  out[expected.path]={...v.pin,metadata:v.metadata};
  if(retainBodies)priorBodies.set(expected.path,v.body);
 }
 return out;
}
function reusePriorL1(){
 const original=JSON.parse(priorBodies.get('run-v1/RECEIPT.json').toString('utf8'));
 assert.equal(original.schema,'recallweave.lp.mac-installed-receiving/1');
 assert.equal(original.terminal.passed,false,'original overall failure must remain explicit');
 assert.equal(original.inputs.driver.gitBlob,'77f12825b480ed98a131f7430a483e6d147898bc');
 assert.equal(original.inputs.plan.gitBlob,'0fa25ecd260bbffb80d2e7ee55d27ea8c062a3e8');
 assert.deepEqual(original.groups.map(g=>g.id),['L1-installed-shebang']);
 need(original.groups[0].passed,'original L1 passed');
 assert.deepEqual(original.downloadEvents,[]);assert.deepEqual(original.downloadArtifacts,[]);assert.deepEqual(original.captures,[]);
 need(!original.actions.some(a=>a.kind==='click'&&a.id==='load-preset'),'original fractional work was not started');
 assert.deepEqual(original.processCensus.at(-1).entries,[],'original final scoped closure');
 assert.deepEqual(original.processes.map(p=>p.pid),[99091,99096,99101]);
 for(const p of original.processes){need(p.terminal&&p.groupRetiredAt,'original child and owned group closed');assert.equal(p.exitCode,0);assert.equal(p.signal,null);}
 const expected=planPinMap(),commands=[];
 for(const [label,flag,pid,stem]of [
  ['installed-check','--check',99091,'installed-check-1'],
  ['installed-no-open','--no-open',99096,'installed-no-open-2']
 ]){
  const process=original.processes.find(p=>p.label===label);assert.equal(process.pid,pid);
  assert.equal(process.program,LAUNCH);assert.deepEqual(process.args,[flag]);
  const stdout=priorBodies.get('run-v1/'+stem+'.stdout'),stderr=priorBodies.get('run-v1/'+stem+'.stderr');
  assertPin(bytesPin(stdout),process.stdoutPin,'original native '+flag+' stdout');
  assertPin(bytesPin(stderr),process.stderrPin,'original native '+flag+' stderr');
  const result=JSON.parse(stdout.toString('utf8'));
  assert.equal(result.schema,'recallweave.lp.local-check/1');
  assert.equal(result.sourceCommit,COMMIT);assert.equal(result.sourceTree,TREE);
  assert.equal(result.releaseSha256,RELEASE_SHA);assert.equal(result.fileUrl,URL_EXPECTED);
  assert.equal(result.filesVerified,13);assert.equal(result.mode,flag.slice(2));assert.equal(result.openRequested,false);
  assert.deepEqual(Object.keys(result.files).sort(),INSTALLED_NAMES.filter(n=>n!=='INSTALLATION.json'));
  for(const [name,pin]of Object.entries(result.files))assert.deepEqual(pin,{bytes:expected[name].bytes,sha256:expected[name].sha256,mode:expected[name].mode});
  commands.push({flag,pid,actualExecutable:LAUNCH,osShebang:true,stdout:bytesPin(stdout),stderr:bytesPin(stderr),sourceEpoch:'original run-v1',newInvocation:false,result});
 }
 return {id:'L1-installed-shebang',passedInOriginalEpoch:true,newInvocations:0,
  originalOverallPassed:false,originalReceipt:PRIOR_EVIDENCE.find(p=>p.path==='run-v1/RECEIPT.json'),
  originalSupervisor:PRIOR_EVIDENCE.find(p=>p.path==='SUPERVISOR-RECEIPT.json'),commands,
  originalActionsPreserved:original.actions,originalProtocolErrorsPreserved:original.protocolErrors,
  preservationScope:'Original driver L5 was not reached; pinned original supervisor supplies separate before/after conservation. No original evidence is rewritten.'};
}
async function startBrowser(){
 capacity('before owned Chrome');
 fs.mkdirSync(PROFILE,{mode:0o700});
 const args=['--headless=new','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--disable-sync','--disable-extensions','--metrics-recording-only','--mute-audio','--disable-breakpad','--disable-gpu','--disk-cache-size=1048576','--media-cache-size=1048576','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--user-data-dir='+PROFILE,'about:blank'];
 browser=launch('chrome',CHROME,args);r.browserStartedAt=stamp();
 processCensus('after receiver-created browser spawn');
 const active=await until(()=>{
  need(!browser.rec.terminal,'owned Chrome exited before control ready');
  const p=path.join(PROFILE,'DevToolsActivePort');if(!fs.existsSync(p))return null;
  const v=readRegular(p,1024).body.toString('utf8').trim().split('\n');
  need(v.length===2&&/^\d+$/.test(v[0])&&/^\/devtools\/browser\/[a-zA-Z0-9-]+$/.test(v[1]),'owned Chrome control file shape');
  const port=Number(v[0]);need(port>1023&&port<65536,'ephemeral loopback control port');
  return {port,browserPath:v[1]};
 },'owned Chrome control admission',10000);
 r.browserControl={...active,host:'127.0.0.1',purpose:'browser instrumentation only; product uses file URL'};
 cdp=await CDP.connect('ws://127.0.0.1:'+active.port+active.browserPath);
 r.browserVersion=await cdp.call('Browser.getVersion');
 need(new RegExp('^(Headless)?Chrome/'+plan.runtime.chrome.version.replace(/\./g,'\\.')+'$').test(r.browserVersion.product),'actual pinned Chrome version');
 assert.equal(r.browserVersion.revision,'@45889d77830582727fe00dbfd614bcb7aac35caa','same actually observed Chromium revision');
 await cdp.call('Browser.setDownloadBehavior',{behavior:'allowAndName',downloadPath:DOWNLOADS,eventsEnabled:true});
}
async function closeBrowser(){
 if(!browser)return;
 processCensus('before owned browser close');
 if(cdp&&!cdp.closed){
  r.browserCloseIntent??={at:stamp(),method:'Browser.close',purpose:'close this receiver-created private browser; subsequent transport observations retain ordering only'};
  appendEvent(r.transportEvents,{kind:'browser-close-command',phase:transportPhase(),browserCloseIntentAt:r.browserCloseIntent.at});
  try{await cdp.call('Browser.close');}
  catch(error){if(!String(error).includes('owned CDP closed'))throw error;}
 }
 await waitClosed(browser,7000);
 r.browserFinishedAt=browser.rec.finishedAt;
 need(Date.parse(r.browserFinishedAt)-Date.parse(r.browserStartedAt)<=120000,'actual browser wall bound');
 cdp=null;
}
function verifyObservation(body,selected){
 need(body.length<=262144&&body.length>0&&body[body.length-1]===10,'bounded original observation with terminal LF');
 const v=JSON.parse(body.toString('utf8'));
 assert.equal(v.format,'recallweave-linear-programming/1');
 assert.deepEqual(v.problem,{bounds:{xmin:0,xmax:4,ymin:0,ymax:4},constraints:[{a:2,b:1,c:5},{a:1,b:2,c:5}],objective:{p:1,q:1,sense:'max'}});
 assert.equal(v.region.kind,'polygon');assert.equal(v.vertices.length,4);assert.equal(v.boundaries.length,6);assert.equal(v.pairs.length,15);
 assert.equal(v.optimum.kind,'point');assert.equal(v.optimum.sense,'max');assert.equal(v.optimum.value,'10/3');assert.equal(v.optimum.wholeRegion,false);
 assert.deepEqual(v.vertices.map(x=>[x.x,x.y]),[['0','0'],['0','5/2'],['5/3','5/3'],['5/2','0']]);
 const best=v.vertices.find(x=>x.id===selected);need(best,'selected vertex in downloaded observation');
 assert.equal(best.x,'5/3');assert.equal(best.y,'5/3');assert.equal(best.objective,'10/3');assert.equal(best.optimal,true);
 assert.deepEqual(v.optimum.vertices,[selected]);assert.deepEqual(v.inspection,{selectedVertex:selected});
 assert.deepEqual(v.boundaries.map(x=>x.id),['x-min','x-max','y-min','y-max','C1','C2']);
 const pairKeys=v.pairs.map(x=>x.first+'|'+x.second);
 const allPairs=[];for(let i=0;i<v.boundaries.length;i++)for(let j=i+1;j<v.boundaries.length;j++)allPairs.push(v.boundaries[i].id+'|'+v.boundaries[j].id);
 assert.deepEqual(pairKeys,allPairs,'complete pair record identities in single use witness');
 return v;
}
async function download(page,selector,suggested,role,selected){
 const before=r.downloadEvents.filter(e=>e.method==='Browser.downloadWillBegin').length;
 await click(page,selector);
 const event=await until(()=>{
  const starts=r.downloadEvents.filter(e=>e.method==='Browser.downloadWillBegin');
  need(starts.length<=before+1,'unexpected extra download');return starts[before];
 },'actual '+role+' download start');
 assert.equal(event.suggestedFilename,suggested);assert.equal(event.frameId,page.frameId,'download bound to installed main frame');
 need(/^[a-zA-Z0-9-]+$/.test(event.guid),'owned download GUID');need(event.url.startsWith('blob:'),'actual embedded Blob download');
 const completion=await until(()=>r.downloadEvents.find(e=>e.method==='Browser.downloadProgress'&&e.guid===event.guid&&e.state==='completed'),'actual '+role+' completed file');
 need(!r.downloadEvents.some(e=>e.guid===event.guid&&e.state==='canceled'),'download cancellation');
 const filename=path.join(DOWNLOADS,event.guid);
 await until(()=>fs.existsSync(filename),'completed physical download custody',3000);
 const v=readRegular(filename,262144);need(v.metadata.uid===501,'owned download owner');
 const artifact={role,selector,suggestedName:suggested,guid:event.guid,frameId:event.frameId,url:event.url,nativePath:filename,relativePath:'downloads/'+event.guid,...v.pin,metadata:v.metadata,completed:{state:completion.state,totalBytes:completion.totalBytes,receivedBytes:completion.receivedBytes}};
 assert.equal(completion.receivedBytes,v.pin.bytes,'completed download received bytes');
 if(role==='course')assertPin(v.pin,ASSETS['site/courses/linear-programming.json'],'original lesson physical download');
 if(role==='guide')assertPin(v.pin,ASSETS['site/courses/linear-programming.md'],'original guide physical download');
 if(role==='observation')artifact.document=verifyObservation(v.body,selected);
 r.downloadArtifacts.push(artifact);return artifact;
}
function runtimeSnapshot(){
 const expectedPaths={node:NODE,python:PYTHON,chrome:CHROME,chromePlist:CHROME_PLIST},runtime={};
 for(const [name,filename]of Object.entries(expectedPaths)){
  const expected=plan.runtime[name];need(expected&&expected.path===filename,'runtime exact path '+name);
  const v=readRegular(filename,1048576);assertPin(v.pin,expected,'runtime '+name);runtime[name]={path:filename,...v.pin,metadata:v.metadata};
 }
 return runtime;
}
function admitRuntime(){
 assert.equal(process.platform,'darwin');assert.equal(process.getuid(),501);assert.equal(process.geteuid(),501);
 assert.equal(process.env.HOME,'/Users/me');assert.equal(process.execPath,NODE);
 const username=execFileSync('/usr/bin/id',['-un'],{encoding:'utf8',timeout:2500,maxBuffer:4096}).trim();assert.equal(username,'me');
 need(typeof WebSocket==='function','observed global WebSocket required');
 assert.equal(process.version,plan.runtime.node.version,'observed Node version');
 const runtime=runtimeSnapshot();r.runtimeBefore=runtime;
 const uuid=execFileSync('/usr/sbin/ioreg',['-rd1','-c','IOPlatformExpertDevice'],{encoding:'utf8',timeout:3000,maxBuffer:131072}).match(/"IOPlatformUUID"\s*=\s*"([^"]+)"/);
 need(uuid,'native hardware identity read');assert.equal(uuid[1],'004A6121-20A8-55AF-A784-0AEF93D536A3');
 const boottimeRaw=execFileSync('/usr/sbin/sysctl',['-n','kern.boottime'],{encoding:'utf8',timeout:3000,maxBuffer:4096});
 const boot=boottimeRaw.match(/sec\s*=\s*(\d+),\s*usec\s*=\s*(\d+)/);need(boot,'raw calendar boot-time observation');
 const bootSessionUuidRaw=execFileSync('/usr/sbin/sysctl',['-n','kern.bootsessionuuid'],{encoding:'utf8',timeout:3000,maxBuffer:4096});
 assert.equal(bootSessionUuidRaw,BOOT_SESSION+'\n','fresh kernel boot-session UUID');
 assert.equal(plan.identity.bootSessionUuid,BOOT_SESSION,'independently admitted session identity');
 assert.equal(plan.identity.hardwareUuid,uuid[1]);assert.equal(plan.identity.uid,501);
 r.runtime={...runtime,nodeVersion:process.version,globalWebSocket:true,os:process.platform,user:username,uid:process.getuid(),home:process.env.HOME,hardwareUuid:uuid[1],bootSessionUuid:BOOT_SESSION,bootSessionUuidRaw,boottimeRaw,boottime:{seconds:Number(boot[1]),microseconds:Number(boot[2])},bootTimeScope:'raw calendar-adjustable provenance only; no equality or historical same-session assertion'};
}
async function main(){
 assert.deepEqual(process.argv.slice(2,5),['--plan',PLAN_PATH,'--plan-sha256']);
 need(process.argv.length===6&&/^[0-9a-f]{64}$/.test(process.argv[5]),'exact pinned receiving plan arguments');
 const planRead=readRegular(PLAN_PATH,262144);assert.equal(planRead.pin.sha256,process.argv[5],'externally pinned plan digest');
 plan=JSON.parse(planRead.body.toString('utf8'));
 assert.equal(plan.schema,'recallweave.lp.local-continuation-plan/1');assert.equal(plan.freeze,FREEZE);assert.equal(plan.freezeSha256,FREEZE_SHA);
 assert.equal(plan.continuationFreeze,CONTINUATION_FREEZE);assert.equal(plan.continuationFreezeSha256,CONTINUATION_FREEZE_SHA);
 assert.equal(plan.prefixAmendment,PREFIX_AMENDMENT);assert.equal(plan.prefixAmendmentSha256,PREFIX_AMENDMENT_SHA);
 assert.equal(plan.sourceCommit,COMMIT);assert.equal(plan.sourceTree,TREE);
 assert.equal(plan.bootIdentityAmendment,BOOT_AMENDMENT,'explicit independent boot-identity amendment');
 assert.equal(SELF,path.join(CONTINUATION,'receive-local-lp-continuation.mjs'),'exact continuation receiver source path');
 const selfRead=readRegular(SELF,131072);assertPin(selfRead.pin,plan.driver,'externally pinned receiver source');
 need(!fs.existsSync(RUN),'refuse existing receiving run; preserve any prior result');
 need(fs.lstatSync(BASE).uid===501&&fs.lstatSync(BASE).isDirectory(),'owned original receiving root');
 need(fs.lstatSync(CONTINUATION).uid===501&&fs.lstatSync(CONTINUATION).isDirectory()&&!fs.lstatSync(CONTINUATION).isSymbolicLink(),'owned ordinary continuation source root');
 admitRuntime();
 r.inputs={plan:{path:PLAN_PATH,...planRead.pin},driver:{path:SELF,...selfRead.pin},helperSourceIndex:plan.helperSourceIndex,installedReceipt:plan.installedReceipt,bootIdentityAmendment:BOOT_AMENDMENT,continuationFreeze:CONTINUATION_FREEZE,prefixAmendment:PREFIX_AMENDMENT};
 r.priorEvidenceBefore=priorEvidenceSnapshot(true);r.carriedL1=reusePriorL1();
 r.installedBefore=snapshotInstall();compareInstalled(r.installedBefore);
 r.retainedInputsBefore=inputSnapshot();
 r.declaredSourceAndInstallationBytes=r.installedBefore.totalBytes+Object.values(r.retainedInputsBefore).reduce((n,v)=>n+v.bytes,0);
 need(r.declaredSourceAndInstallationBytes<=LIMITS.source_bytes,'combined source and installation bound');
 capacity('before exclusive output');
 fs.mkdirSync(RUN,{mode:0o700});created=true;fs.mkdirSync(DOWNLOADS,{mode:0o700});fs.mkdirSync(TEMP,{mode:0o700});
 exclusive('RECEIVING-PLAN.json',planRead.body);save();
 monitor=setInterval(()=>{try{capacity('active');}catch(error){failActive(error);}},1500);
 workTimer=setTimeout(()=>failActive(Error('100-second active-work deadline; close owned children')),LIMITS.work_milliseconds-Math.min(LIMITS.work_milliseconds,Date.now()-START));
 emergencyTimer=setTimeout(()=>{fatal??=Error('115-second emergency child closure');signalOwned('SIGKILL');},LIMITS.emergency_milliseconds-Math.min(LIMITS.emergency_milliseconds,Date.now()-START));
 console.log('L1-installed-shebang reused from immutable first epoch; zero new entry invocations');
 await startBrowser();
 let page=await newPage();await navigate(page);r.initial=await snapshot(page);
 assert.equal(r.initial.url,URL_EXPECTED);assert.equal(r.initial.preset,'unique');need(r.initial.resultVisible,'initial rendered result');
 need(r.initial.summary.includes('Maximum 9 at V3 (1, 3)'),'unchanged initial example smoke');
 assert.deepEqual(r.initial.storage,{local:0,session:0});
 await select(page,'#preset','fractional','A fr');await click(page,'#load-preset');
 await until(()=>evaluate(page.sid,"document.querySelector('#optimum-summary').textContent.includes('Maximum 10/3')"),'fractional installed model visible');
 const applied=await snapshot(page);
 assert.equal(applied.presetTitle,'A fractional continuous optimum');need(applied.resultVisible&&applied.observationEnabled,'applied example visible and downloadable');
 assert.equal(applied.vertexRows,4);assert.equal(applied.pairRows,15);
 const displayed=applied.vertices.filter(v=>v.text.includes('(5/3, 5/3)'));assert.equal(displayed.length,1,'displayed optimal vertex');
 assert.equal(displayed[0].id,'V3','frozen displayed optimal vertex identity');
 await select(page,'#vertex-select',displayed[0].id,'V3');
 r.fractional=await snapshot(page);assert.equal(r.fractional.selectedVertex,displayed[0].id);
 need(r.fractional.vertexDetail.startsWith(displayed[0].id),'inspection follows actual vertex control');
 need(r.fractional.summary.includes('Maximum 10/3')&&r.fractional.summary.includes('(5/3, 5/3)'),'exact rendered fractional optimum');
 assert.deepEqual(r.fractional.fields,{xmin:'0',xmax:'4',ymin:'0',ymax:'4',constraints:'2, 1, 5\n1, 2, 5',p:'1',q:'1',sense:'max'});
 assert.deepEqual(r.fractional.storage,{local:0,session:0});
 await capture(page,'fractional-installed.png');
 group('L2-installed-fractional-use',{page:r.fractional,inputScope:'CDP native key/mouse events; receiver uses DOM only to focus and inspect'});
 const observation=await download(page,'#download-observation','linear-programming-observation.json','observation',displayed[0].id);
 const course=await download(page,'#download-course','linear-programming.json','course');
 const guide=await download(page,'#download-guide','linear-programming.md','guide');
 assert.equal(r.downloadEvents.filter(e=>e.method==='Browser.downloadWillBegin').length,3);
 assert.equal(fs.readdirSync(DOWNLOADS).length,3,'three physical original download files; no replacements');
 group('L3-three-physical-downloads',{observation:{path:observation.relativePath,...bytesPin(readRegular(observation.nativePath,262144).body)},course:{path:course.relativePath,bytes:course.bytes,sha256:course.sha256,gitBlob:course.gitBlob},guide:{path:guide.relativePath,bytes:guide.bytes,sha256:guide.sha256,gitBlob:guide.gitBlob}});
 r.lastBeforeReopen=await snapshot(page);assert.deepEqual(r.lastBeforeReopen.storage,{local:0,session:0});
 await cdp.call('Target.closeTarget',{targetId:page.targetId});
 page=await newPage();await navigate(page);r.reopened=await snapshot(page);
 assert.equal(r.reopened.url,URL_EXPECTED);assert.equal(r.reopened.preset,'unique');need(r.reopened.resultVisible&&r.reopened.summary.includes('Maximum 9 at V3 (1, 3)'),'fresh reopen initial model');
 assert.deepEqual(r.reopened.storage,{local:0,session:0});
 group('L4-same-installed-url-reopened',{page:r.reopened,method:'close used tab; new tab in same owned private Chrome; no persistence claim'});
 for(const id of ['load-preset','download-observation','download-course','download-guide']){
  const clicks=r.actions.filter(a=>a.kind==='click'&&a.id===id);assert.equal(clicks.length,1,'one actual visible '+id+' click');need(clicks[0].trusted,'trusted native mouse event '+id);
 }
 need(r.actions.some(a=>a.kind==='change'&&a.id==='preset'&&a.trusted&&a.value==='fractional'),'native preset selection event');
 need(r.actions.some(a=>a.kind==='change'&&a.id==='vertex-select'&&a.trusted&&a.value===displayed[0].id),'native inspected-vertex event');
 need(!r.actions.some(a=>(a.kind==='click'&&a.id==='apply')||(a.kind==='submit'&&a.id==='problem-form')),'no unexpected implicit Apply or form submit in continuation');
 assert.deepEqual(r.pageErrors,[],'page/console errors');
 assert.deepEqual(r.protocolErrors,[],'browser protocol errors');
 const outside=r.pageRequests.filter(q=>q.url!==URL_EXPECTED&&!q.url.startsWith('blob:')&&!q.url.startsWith('data:')&&q.url!=='about:blank');
 assert.deepEqual(outside,[],'no outside application request');
 r.pageRequestScope='Network events from attached page targets; browser-control/background process traffic is not classified as product traffic.';
 await closeBrowser();
 await until(()=>processCensus('after successful browser close').length===0,'own process groups fully closed');
 for(const {rec}of children){need(rec.terminal,'owned child terminal record');assert.equal(rec.exitCode,0,'owned child zero exit '+rec.label);assert.equal(rec.signal,null);}
 r.installedAfter=snapshotInstall();assert.deepEqual(r.installedAfter,r.installedBefore,'full installed bytes/modes/identity unchanged');
 r.retainedInputsAfter=inputSnapshot();assert.deepEqual(r.retainedInputsAfter,r.retainedInputsBefore,'original author inputs unchanged');
 assertPin(readRegular(PLAN_PATH,262144).pin,r.inputs.plan,'plan unchanged');
 assertPin(readRegular(SELF,131072).pin,r.inputs.driver,'receiver source unchanged');
 r.runtimeAfter=runtimeSnapshot();assert.deepEqual(r.runtimeAfter,r.runtimeBefore,'same four runtime files unchanged after native use');
 r.priorEvidenceAfter=priorEvidenceSnapshot();assert.deepEqual(r.priorEvidenceAfter,r.priorEvidenceBefore,'original first-epoch evidence unchanged');
 assert.deepEqual(r.protocolErrors.filter(e=>e.phase==='active'),[],'no active protocol errors, including late-delivered observations');
 r.transportDisposition={closeIntent:r.browserCloseIntent,allErrorsRetained:r.protocolErrors.length,postIntentErrors:r.protocolErrors.filter(e=>e.phase==='close-requested').length,scope:'Phase records ordering against explicit Browser.close intent only; post-intent errors are preserved and are not a claim of perfect teardown.'};
 capacity('final success');
 group('L5-integrity-and-owned-closure',{installedFiles:14,originalAssets:3,sourceInputsUnchanged:true,runtimeFilesUnchanged:4,priorEvidenceFilesUnchanged:PRIOR_EVIDENCE.length,ownedChildrenClosed:true,externalPageRequests:0,pageErrors:0,activeProtocolErrors:0,postCloseIntentErrors:r.transportDisposition.postIntentErrors});
 r.terminal={passed:true,finishedAt:stamp(),milliseconds:Date.now()-START};
}
try{await main();}
catch(error){
 r.terminal={passed:false,error:String(error.stack??error),finishedAt:stamp(),milliseconds:Date.now()-START};
 console.error(r.terminal.error);process.exitCode=1;
}finally{
 clearInterval(monitor);clearTimeout(workTimer);
 if(browser&&!browser.rec.terminal){
  try{await closeBrowser();r.cleanup.push({scope:'owned Chrome',result:'Browser.close completed'});}
  catch(error){r.cleanup.push({scope:'owned Chrome',error:String(error)});}
 }
 let ownRemaining=[];
 try{if(created)ownRemaining=processCensus('before final shutdown');}catch(error){r.cleanup.push({scope:'final shutdown census',error:String(error)});}
 if(children.some(x=>!x.rec.terminal)||ownRemaining.length){
  signalOwned('SIGTERM');
  for(const state of children){try{await waitClosed(state,2000);}catch{}}
  try{await until(()=>processCensus('after owned SIGTERM').length===0,'owned shutdown after TERM',2000,true);}
  catch{
   signalOwned('SIGKILL');
   for(const state of children){try{await waitClosed(state,1500);}catch(error){r.cleanup.push({pid:state.rec.pid,error:String(error)});}}
   try{await until(()=>processCensus('after owned SIGKILL').length===0,'owned shutdown after KILL',1500,true);}catch(error){r.cleanup.push({scope:'owned group shutdown',error:String(error)});}
  }
 }
 clearTimeout(emergencyTimer);
 if(created){
  try{
   const left=processCensus('final own closure');
   if(left.length||children.some(x=>!x.rec.terminal)){
    r.terminal={...r.terminal,passed:false,closureError:'Owned process group or child terminal evidence remains incomplete'};process.exitCode=1;
   }
   const finalSize=ownedSize();r.ownedFinalBytesBeforeReceipt=finalSize;
   if(finalSize>LIMITS.owned_bytes){r.terminal={...r.terminal,passed:false,outputBoundError:true};process.exitCode=1;}
   r.artifactFiles=fs.readdirSync(RUN).filter(n=>n!=='RECEIPT.json'&&fs.lstatSync(path.join(RUN,n)).isFile()).sort().map(n=>({path:n,...readRegular(path.join(RUN,n),LIMITS.capture_bytes).pin}));
   r.artifactManifestScope='Top-level immutable files and three actual GUID downloads are indexed. Private profile/tmp are retained under the complete owned-byte cap; no profile bytes are treated as product evidence.';
   save();
  }catch(error){r.terminal={...r.terminal,passed:false,finalizationError:String(error)};process.exitCode=1;try{save();}catch{}}
 }
 console.log(JSON.stringify({terminal:r.terminal,groups:r.groups.map(g=>g.id),receipt:created?path.join(RUN,'RECEIPT.json'):null,outputCreated:created}));
}
