import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { registerHooks } from 'node:module';
import { gzipSync } from 'node:zlib';

const input = JSON.parse(process.argv[1]);
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const blob = text => {
  const b = Buffer.from(text);
  return crypto.createHash('sha1').update(Buffer.from('blob ' + b.length + '\0')).update(b).digest('hex');
};
assert.equal(blob(input.deck), 'f0f8a4b234489c2388f427633f548d56c6ed4c03');
assert.equal(blob(input.focus), '337b90d667170f19e5c75f5aaf4898e3410630b9');
assert.equal(sha(input.cli), input.cliSha256);
const sources = {
  'file:///receiving-source/src/deck.mjs': input.deck,
  'file:///receiving-source/src/course-focus.mjs': input.focus,
  'file:///receiving-source/tools/focus-course.mjs': input.cli
};
function resolveFrom(map, specifier, context, next) {
  let url;
  try { url = new URL(specifier, context.parentURL || 'file:///receiving-source/').href; } catch {}
  return Object.hasOwn(map, url) ? {url, shortCircuit:true} : next(specifier, context);
}
registerHooks({
  resolve(specifier, context, next) { return resolveFrom(sources, specifier, context, next); },
  load(url, context, next) { return Object.hasOwn(sources, url)
    ? {format:'module', source:sources[url], shortCircuit:true} : next(url, context); }
});
const nativeDeck = await import('file:///receiving-source/src/deck.mjs');
const nativeFocus = await import('file:///receiving-source/src/course-focus.mjs');
const fixture = {
  format:'recallweave-deck/1', title:'Source 🔎', attribution:'Original � credit — α', license:'CC0-1.0',
  concepts:['Zeta 🔎','Base','-detail','Unused'],
  items:[
    ['z-1','Zeta 🔎',['Base']], ['u-1','Unused',[]], ['base-1','Base',[]],
    ['detail-1','-detail',['Zeta 🔎']], ['z-2','Zeta 🔎',['Base']], ['base-2','Base',[]]
  ].map(([id,concept,prerequisites])=>({
    id,concept,prerequisites,prompt:'Question '+id+' — 保存?',options:['First '+id,'Second '+id],
    answer:1,explanation:'Original explanation '+id,transfer:'Original transfer '+id
  }))
};
const sourceText = JSON.stringify(fixture);
const deck = nativeDeck.parseDeck(sourceText);
const expectedList = {
  format:'recallweave-course-focus-inspection/1',title:fixture.title,attribution:fixture.attribution,license:fixture.license,
  concepts:[
    {id:'Zeta 🔎',questionCount:2,requiredConcepts:['Base']},
    {id:'Base',questionCount:2,requiredConcepts:[]},
    {id:'-detail',questionCount:1,requiredConcepts:['Zeta 🔎','Base']},
    {id:'Unused',questionCount:1,requiredConcepts:[]}
  ]
};
for(const row of expectedList.concepts) {
  assert.deepEqual(nativeFocus.planCourseFocus(deck,[row.id]).required,row.requiredConcepts);
}
assert.deepEqual(nativeFocus.createFocusedLesson(deck,['-detail'],'Focused').deck.items.map(x=>x.id),
  ['z-1','base-1','detail-1','z-2','base-2']);
assert.deepEqual(nativeFocus.createFocusedLesson(deck,['Unused','Base'],'Focused').deck.items.map(x=>x.id),
  ['u-1','base-1','base-2']);

const preload = `import {registerHooks} from 'node:module';
const sources=JSON.parse(process.env.RW_PEER_SOURCE_TEXTS);
delete process.env.RW_PEER_SOURCE_TEXTS;
registerHooks({
 resolve(specifier,context,next) {
  let url;try{url=new URL(specifier,context.parentURL||'file:///receiving-source/').href;}catch{}
  return Object.hasOwn(sources,url)?{url,shortCircuit:true}:next(specifier,context);
 },
 load(url,context,next) {
  return Object.hasOwn(sources,url)?{format:'module',source:sources[url],shortCircuit:true}:next(url,context);
 }
});
if(process.env.RW_PEER_STDIN_ERROR==='1')setImmediate(()=>process.stdin.destroy(Object.assign(new Error('peer controlled read error'),{code:'EIO'})));
`;
const preloadURL = 'data:text/javascript;base64,' + Buffer.from(preload).toString('base64');
const records = [], groups = [];
async function run(name, args, options = {}) {
  const supplied = options.bytes ?? Buffer.from(sourceText);
  const chunks = options.chunks ?? [supplied];
  const record = {name,args,inputBytes:supplied.length,inputSha256:sha(supplied),
    openStdin:!!options.openInput,stdoutSinkClosed:!!options.closedOutput,
    controlledStdinError:!!options.readError};
  records.push(record);
  const child = spawn(process.execPath,['--import',preloadURL,'/receiving-source/tools/focus-course.mjs',...args],{
    stdio:['pipe','pipe','pipe'],env:{...process.env,RW_PEER_SOURCE_TEXTS:JSON.stringify(sources),
      RW_PEER_STDIN_ERROR:options.readError?'1':'0'}
  });
  const out=[],err=[]; let outSize=0,errSize=0;
  child.stdout.on('data',b=>{out.push(b);outSize+=b.length;if(outSize>1048576){record.outputOverflow=true;child.kill('SIGKILL');}});
  child.stderr.on('data',b=>{err.push(b);errSize+=b.length;if(errSize>1048576){record.errorOverflow=true;child.kill('SIGKILL');}});
  child.stdin.on('error',e=>{record.parentInputError={code:e.code,message:e.message};});
  const done = new Promise((resolve,reject)=>{
    child.once('error',reject);
    child.once('close',(code,signal)=>resolve({code,signal}));
  });
  const timer = setTimeout(()=>{record.timedOut=true;child.kill('SIGKILL');},5000);
  try {
    if(options.closedOutput) {
      const closed = new Promise(resolve=>child.stdout.once('close',resolve));
      child.stdout.destroy();
      await closed;
    }
    if(!options.openInput && !options.readError) {
      for(const c of chunks) {
        child.stdin.write(c);
        if(options.chunks)await new Promise(resolve=>setImmediate(resolve));
      }
      child.stdin.end();
    }
    Object.assign(record,await done);
    const stdout=Buffer.concat(out),stderr=Buffer.concat(err);
    Object.assign(record,{stdout:stdout.toString('utf8'),stderr:stderr.toString('utf8'),
      stdoutBytes:stdout.length,stderrBytes:stderr.length,stdoutSha256:sha(stdout),stderrSha256:sha(stderr)});
    assert.equal(record.timedOut,undefined,name+' terminates');
    assert.equal(record.outputOverflow,undefined,name+' bounded stdout');
    assert.equal(record.errorOverflow,undefined,name+' bounded stderr');
    assert.equal(record.signal,null,name+' exits normally');
    return record;
  } finally {clearTimeout(timer);child.stdin.destroy();}
}
function success(r) {assert.equal(r.code,0,r.name);assert.equal(r.stderr,'',r.name+' has no error');}
function refusal(r,code) {
  assert.equal(r.code,code,r.name);assert.equal(r.stdoutBytes,0,r.name+' no stdout');
  assert.ok(r.stderr.trim().length>0,r.name+' has a diagnostic');
}
function list(r) {success(r);assert.ok(r.stdout.endsWith('\n'));assert.deepEqual(JSON.parse(r.stdout),expectedList);}
function focused(r,concepts,title) {success(r);assert.equal(r.stdout,nativeFocus.createFocusedLesson(deck,concepts,title).json);}
async function group(name, fn) {await fn();groups.push({name,status:'passed'});}
let failure;
try {
  await group('help and grammar refusal finish before an open stdin is consumed',async()=>{
    const help=await run('help',['--help'],{openInput:true});success(help);
    for(const word of ['--list','--title','--concept'])assert.ok(help.stdout.includes(word));
    const bad=[
      [],['--list','--concept','Base'],['--list','--title','T'],['--help','--list'],
      ['--title','T','--title','U','--concept','Base'],['--unknown'],['--title=T','--concept','Base'],
      ['positional'],['--'],['--title'],['--concept'],['--title','T','--concept'],
      ['--title','T'],['--concept','Base'],['--list','--list'],['--help','--help'],
      ['--title','T',...Array.from({length:33},()=>['--concept','Base']).flat()]
    ];
    for(let i=0;i<bad.length;i++)refusal(await run('grammar-'+i,bad[i],{openInput:true}),2);
  });
  await group('literal hyphen-prefixed values remain values',async()=>{
    focused(await run('literal-title',['--title','--list','--concept','Base']),['Base'],'--list');
    focused(await run('literal-concept',['--concept','-detail','--title','--help']),['-detail'],'--help');
    refusal(await run('unknown-literal-concept',['--title','T','--concept','--help']),1);
  });
  await group('model-owned target and title refusals emit no result',async()=>{
    const cases=[
      ['--title','T','--concept','Base','--concept','Base'],['--title','T','--concept','missing'],
      ['--title','T','--concept',''],['--title','   ','--concept','Base'],
      ['--title','x'.repeat(161),'--concept','Base']
    ];
    for(let i=0;i<cases.length;i++)refusal(await run('model-refusal-'+i,cases[i]),1);
  });
  await group('source-order list, exact dependent focus and flag-order permutations use native consumers',async()=>{
    list(await run('list',['--list']));
    const title=' Focus 📘\n保存 ';
    focused(await run('dependent-focus',['--title',title,'--concept','-detail']),['-detail'],title);
    const a=await run('multi-focus-a',['--title','Both','--concept','Unused','--concept','Base']);
    const b=await run('multi-focus-b',['--concept','Base','--title','Both','--concept','Unused']);
    focused(a,['Unused','Base'],'Both');focused(b,['Base','Unused'],'Both');assert.equal(a.stdout,b.stdout);
  });
  await group('BOM and explicit replacement text are valid but malformed UTF8 and JSON refuse',async()=>{
    list(await run('bom',['--list'],{bytes:Buffer.concat([Buffer.from([0xef,0xbb,0xbf]),Buffer.from(sourceText)])}));
    const invalid=[Buffer.from([0xff]),Buffer.from([0xc3,0x28]),Buffer.from([0xe2,0x82]),
      Buffer.from([0xc0,0xaf]),Buffer.from([0xed,0xa0,0x80]),Buffer.from('{'),Buffer.from('null')];
    for(let i=0;i<invalid.length;i++)refusal(await run('decode-'+i,['--list'],{bytes:invalid[i]}),1);
    assert.ok(expectedList.attribution.includes('�'));
  });
  await group('raw-byte limit includes BOM and multibyte chunks retain exact input',async()=>{
    const raw=Buffer.from(sourceText),pad=(size,b=raw)=>Buffer.concat([b,Buffer.alloc(size-b.length,32)]);
    list(await run('exact-limit',['--list'],{bytes:pad(262144)}));
    refusal(await run('over-limit',['--list'],{bytes:pad(262145)}),1);
    const bom=Buffer.concat([Buffer.from([0xef,0xbb,0xbf]),raw]);
    list(await run('bom-exact-limit',['--list'],{bytes:pad(262144,bom)}));
    refusal(await run('bom-over-limit',['--list'],{bytes:pad(262145,bom)}),1);
    const chunks=Array.from(raw,b=>Buffer.from([b]));
    list(await run('one-byte-input-writes',['--list'],{bytes:raw,chunks}));
  });
  await group('unchanged native deck admission rejects malformed question and credit data',async()=>{
    const mutations=[
      d=>{d.items[2].prerequisites=['Zeta 🔎'];},d=>{d.items[1].id=d.items[0].id;},
      d=>{d.items[0].answer=2;},d=>{delete d.attribution;}
    ];
    for(let i=0;i<mutations.length;i++){
      const d=structuredClone(fixture);mutations[i](d);
      assert.throws(()=>nativeDeck.validateDeck(d));
      refusal(await run('deck-refusal-'+i,['--list'],{bytes:Buffer.from(JSON.stringify(d))}),1);
    }
  });
  await group('controlled input-stream error and real preclosed output pipe exit nonzero',async()=>{
    refusal(await run('controlled-stdin-error',['--list'],{readError:true}),1);
    const r=await run('preclosed-stdout',['--title','Focused','--concept','-detail'],{closedOutput:true});
    assert.equal(r.code,1,r.name);assert.equal(r.stdoutBytes,0,'closed sink is intentionally unreceived');
  });
} catch(error) {failure={name:error.name,message:error.message,stack:error.stack};}
const packet={schema:'recallweave.focus-cli.peer.v1',node:process.version,platform:process.platform,architecture:process.arch,
  status:failure?'failed':'passed',groups,processes:records.length,records,failure,
  fixture,sourcePins:{cliSha256:sha(input.cli),deckBlob:blob(input.deck),focusBlob:blob(input.focus)},
  receiverSha256:sha(input.receiver),preloadSha256:sha(preload),
  sourceUnchanged:sha(input.cli)===input.cliSha256,
  boundary:'Exact path-based ESM sources served by declared synchronous registerHooks; child argv and pipes are actual Node. No filesystem-source or browser claim.',
  controlledErrors:'stdin EIO is an explicit fixture stream error; stdout close is a real native pipe without a receiving sink.'};
const text=JSON.stringify(packet),compressed=gzipSync(Buffer.from(text),{mtime:0});
console.log(JSON.stringify({summary:{status:packet.status,groups:groups.length,processes:records.length,failure,
  sourcePins:packet.sourcePins,receiverSha256:packet.receiverSha256},
  rawPacket:{encoding:'gzip+base64',bytes:Buffer.byteLength(text),sha256:sha(text),compressedBytes:compressed.length,
    compressedSha256:sha(compressed),base64:compressed.toString('base64')}}));
process.exitCode=failure?1:0;
