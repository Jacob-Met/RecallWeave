import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
const source=process.argv[2]==='--stdin'?await new Promise((resolve,reject)=>{let s='';process.stdin.setEncoding('utf8');process.stdin.on('data',b=>s+=b);process.stdin.on('end',()=>resolve(s));process.stdin.on('error',reject);}):await readFile(process.argv[2],'utf8');
const hash=s=>{const b=Buffer.from(s);return{bytes:b.length,sha256:createHash('sha256').update(b).digest('hex'),git_blob:createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex')};};
const {receiverLifecycle:L}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const receipt={schema:'recallweave-receiver-lifecycle-tests/v1',node:process.version,platform:process.platform,source:hash(source),groups:[],scope:'Receiver utility tests with real timers and two own spawned Node children; no browser, product, native alias or other-worker process touched.'};
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function test(name,fn){const start=performance.now();try{const observation=await fn();receipt.groups.push({name,status:'passed',milliseconds:performance.now()-start,...observation?{observation}:{}});}catch(e){receipt.groups.push({name,status:'failed',milliseconds:performance.now()-start,error:e.stack});}}
class Socket extends EventTarget{
 constructor(){super();this.readyState=0;this.handlers=new Map();}
 addEventListener(t,fn,opts){super.addEventListener(t,fn,opts);this.handlers.set(t,(this.handlers.get(t)||0)+1);}
 removeEventListener(t,fn,opts){super.removeEventListener(t,fn,opts);this.handlers.set(t,(this.handlers.get(t)||0)-1);}
 emit(type,state){this.readyState=state;this.dispatchEvent(new Event(type));}
 count(){return[...this.handlers.values()].reduce((a,b)=>a+b,0);}
}
await test('deadline aborts unresolved operation without claiming completion',async()=>{
 let signal;const t=performance.now();await assert.rejects(L.bounded('test30',30,s=>{signal=s;return new Promise(()=>{});}),/Receiver deadline/);
 assert(signal.aborted);assert(performance.now()-t>=20);assert(performance.now()-t<1500);
});
await test('WebSocket opens and removes all startup listeners',async()=>{
 const s=new Socket(),p=L.socketOpened(s,100);setTimeout(()=>s.emit('open',1),10);await p;assert.equal(s.count(),0);
});
await test('WebSocket never opens has deadline and removes listeners',async()=>{
 const s=new Socket();await assert.rejects(L.socketOpened(s,30),/deadline/);assert.equal(s.count(),0);
});
await test('WebSocket early close and error refuse promptly',async()=>{
 for(const type of ['close','error']){const s=new Socket(),p=L.socketOpened(s,500);setTimeout(()=>s.emit(type,3),10);await assert.rejects(p,/before open/);assert.equal(s.count(),0);}
});
await test('WebSocket already closed and already open are settled',async()=>{
 const closed=new Socket();closed.readyState=3;await assert.rejects(L.socketOpened(closed,100),/closed before open/);assert.equal(closed.count(),0);
 const open=new Socket();open.readyState=1;await L.socketOpened(open,100);assert.equal(open.count(),0);
});
await test('endpoint read uses abort budget and handles eventual appearance',async()=>{
 let signal;await assert.rejects(L.startupEndpoint(s=>{signal=s;return new Promise(()=>{});},()=>false,30),/deadline/);assert(signal.aborted);
 let reads=0;const result=await L.startupEndpoint(async()=>{if(!reads++){const e=Error('missing');e.code='ENOENT';throw e;}return'1234\n/devtools/browser/owned\n';},()=>false,500);
 assert.deepEqual(result,{port:'1234',endpoint:'/devtools/browser/owned'});assert.equal(reads,2);
});
await test('endpoint exits and unexpected file errors are not retried forever',async()=>{
 let reads=0;await assert.rejects(L.startupEndpoint(async()=>{reads++;return'x';},()=>true,100),/exited/);assert.equal(reads,0);
 await assert.rejects(L.startupEndpoint(async()=>{throw Object.assign(Error('denied'),{code:'EACCES'});},()=>false,100),/denied/);
});
async function ownChild(ignoreTerm){
 const child=spawn(process.execPath,['-e',(ignoreTerm?"process.on('SIGTERM',()=>{});":"")+"process.stdout.write('ready\\n');setInterval(()=>{},1000);"],{stdio:['ignore','pipe','pipe']});
 const state=L.watchChild(child);
 try{
  await L.bounded('own test child ready',3000,()=>new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);}));
  const result=await L.stopOwnChild(child,state,{grace:10,term:ignoreTerm?30:500,kill:1000});
  assert.equal(result.exited,true);assert.equal(result.status,'passed');assert.equal(result.pid,child.pid);assert.equal(child.exitCode,null);
  assert.equal(child.signalCode,ignoreTerm?'SIGKILL':'SIGTERM');
  assert.deepEqual(result.signals.map(x=>x.signal),ignoreTerm?['SIGTERM','SIGKILL']:['SIGTERM']);
  assert(result.signals.every(x=>x.pid===child.pid));
  return result;
 }finally{
  if(!L.childExited(child,state)){child.kill('SIGKILL');await L.bounded('own child final cleanup',1000,()=>state.closed);}
 }
}
await test('real own child signal exit has null exitCode and is recognized',()=>ownChild(false));
await test('real own child ignoring TERM gets only its recorded PID KILL',()=>ownChild(true));
await test('PID mismatch prevents all signaling and live child refusal is explicit',async()=>{
 let signals=[];const child={pid:123,exitCode:null,signalCode:null,kill(s){signals.push(s);return true;}};
 const base={pid:124,exitObserved:false,closeObserved:false,closed:new Promise(()=>{})};
 await assert.rejects(L.stopOwnChild(child,base,{grace:1,term:1,kill:1}),/Refusing signal/);assert.deepEqual(signals,[]);
 const got=await L.stopOwnChild(child,{...base,pid:123},{grace:1,term:1,kill:1});
 assert.equal(got.exited,false);assert.equal(got.status,'failed');assert.deepEqual(signals,['SIGTERM','SIGKILL']);
});
function fakeIO({failure=false,hung=false,remain=false}={}){
 let exists=true;const calls=[];
 return {calls,get exists(){return exists;},io:{
  async rm(profile,options){calls.push({profile,options});if(failure)throw Error('remove denied');if(hung)return new Promise(()=>{});if(!remain)exists=false;},
  exists(profile){assert.equal(profile,'/only-owned/mock-profile');return exists;}
 }};
}
const args=f=>({profile:'/only-owned/mock-profile',canRemove:true,budgets:{remove:30},io:f.io});
await test('confirmed stopped profile is removed without proxy or trace work',async()=>{
 const f=fakeIO(),r=await L.removeOwnedProfile(args(f));
 assert.equal(r.profileRemoved,true);assert.equal(r.retainedProfileReason,null);
 assert.deepEqual(r.phases,[{phase:'profile',status:'passed'}]);
 assert.equal(f.calls.length,1);assert.equal(f.calls[0].profile,'/only-owned/mock-profile');
 assert.deepEqual(f.calls[0].options,{recursive:true,force:true,maxRetries:8,retryDelay:150});
 assert(!('trace' in r));assert(!('traceFailure' in r));
});
await test('unconfirmed own browser retains profile and never calls removal',async()=>{
 const f=fakeIO(),r=await L.removeOwnedProfile({...args(f),canRemove:false});
 assert.equal(r.profileRemoved,false);assert.equal(f.calls.length,0);assert.equal(f.exists,true);
 assert.match(r.retainedProfileReason,/exit is unconfirmed/);assert.deepEqual(r.phases,[]);
});
await test('rejected profile removal stays failed without inventing success',async()=>{
 const f=fakeIO({failure:true}),r=await L.removeOwnedProfile(args(f));
 assert.equal(r.profileRemoved,false);assert.equal(f.exists,true);assert.equal(r.phases[0].status,'failed');assert.match(r.phases[0].error,/remove denied/);
});
await test('stalled profile removal returns at its budget without claiming OS cancellation',async()=>{
 const f=fakeIO({hung:true}),start=performance.now(),r=await L.removeOwnedProfile(args(f));
 assert.equal(r.profileRemoved,false);assert.equal(f.exists,true);assert.equal(r.phases[0].status,'failed');assert.match(r.phases[0].error,/deadline/);
 assert(performance.now()-start>=20);assert(performance.now()-start<1500);
});
await test('resolved removal with profile still present is explicitly failed',async()=>{
 const f=fakeIO({remain:true}),r=await L.removeOwnedProfile(args(f));
 assert.equal(r.profileRemoved,false);assert.equal(r.phases[0].status,'failed');assert.match(r.phases[0].error,/still exists/);
});
await test('pre-spawn failure permits only owned-profile cleanup',async()=>{
 const stopped=await L.stopOwnChild(undefined,undefined);
 assert.deepEqual(stopped,{status:'passed',spawned:false,exited:true,signals:[]});
 const f=fakeIO(),r=await L.removeOwnedProfile({...args(f),canRemove:stopped.exited});
 assert.equal(r.profileRemoved,true);assert.equal(f.calls.length,1);
});
await test('spawn error with no PID cannot signal but permits stopped-profile cleanup',async()=>{
 const child={pid:undefined,exitCode:null,signalCode:null,kill(){assert.fail('must not signal unspawned child');}};
 const state={pid:undefined,error:'ENOENT',exitObserved:false,closeObserved:false,closed:Promise.resolve()};
 const stopped=await L.stopOwnChild(child,state,{grace:1,term:1,kill:1});
 assert.equal(stopped.exited,true);assert.deepEqual(stopped.signals,[]);assert.equal(stopped.spawnError,'ENOENT');
 const f=fakeIO(),r=await L.removeOwnedProfile({...args(f),canRemove:stopped.exited});assert.equal(r.profileRemoved,true);
});
await test('already signalled exit is recognized without another signal before removal',async()=>{
 const child={pid:123,exitCode:null,signalCode:'SIGTERM',kill(){assert.fail('must not signal exited child');}};
 const state={pid:123,exitObserved:false,closeObserved:false,closed:new Promise(()=>{}),error:null};
 const stopped=await L.stopOwnChild(child,state,{grace:1,term:1,kill:1});
 assert.equal(stopped.exited,true);assert.deepEqual(stopped.signals,[]);
 const f=fakeIO(),r=await L.removeOwnedProfile({...args(f),canRemove:stopped.exited});assert.equal(r.profileRemoved,true);
});
await test('report publication distinguishes success, I/O refusal and deadline with abort signal',async()=>{
 assert.equal(await L.bounded('browser report write',100,async()=>17),17);
 await assert.rejects(L.bounded('browser report write',100,async()=>{throw Error('ENOSPC');}),/ENOSPC/);
 let signal;await assert.rejects(L.bounded('browser report write',30,s=>{signal=s;return new Promise(()=>{});}),/deadline/);
 assert(signal.aborted);
});
receipt.status=receipt.groups.every(x=>x.status==='passed')?'passed':'failed';
receipt.summary={groups:receipt.groups.length,passed:receipt.groups.filter(x=>x.status==='passed').length,failed:receipt.groups.filter(x=>x.status==='failed').length};
assert.equal(receipt.groups.length,19);
console.log(JSON.stringify(receipt,null,2));process.exitCode=receipt.status==='passed'?0:1;
