'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const root=__dirname, H=b=>crypto.createHash('sha256').update(b).digest('hex'), G=b=>crypto.createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const info=b=>({bytes:b.length,sha256:H(b),gitBlob:G(b)});
function pin(b,p,label){for(const k of ['bytes','sha256','gitBlob'])if(p[k]!==undefined)assert.equal(info(b)[k],p[k],label+': '+k);return info(b);}
const verdict={format:'recall180-independent-original-custody/1',accepted:false,scope:'Read-only original archive, source identity, manually expected downloads, PNG byte integrity and prior original screenshot inspection; no source import, comparator execution, browser run or output regeneration.',started:new Date().toISOString()};
let inputs;
try{
 const st=fs.statfsSync(root),freeDisk=Number(st.bavail)*Number(st.bsize);
 verdict.admission={node:process.version,execPath:fs.realpathSync(process.execPath),user:os.userInfo().username,freeMemory:os.freemem(),freeDisk,minimumMemory:256*1024*1024,minimumDisk:64*1024*1024};
 assert.equal(verdict.admission.user,'jacob');assert.equal(process.version,'v24.14.0');
 assert.equal(verdict.admission.execPath.toLowerCase(),'c:\\program files\\nodejs\\node.exe');
 assert(verdict.admission.freeMemory>=verdict.admission.minimumMemory);assert(freeDisk>=verdict.admission.minimumDisk);
 verdict.runtime=pin(fs.readFileSync(process.execPath),{bytes:91380224,sha256:'63c259c81e5d472b5f11c8d506070130cb04a1ecf84b80377a34ed6ec9048088'},'actual Node');
 const read=n=>fs.readFileSync(path.join(root,n));
 inputs=Object.fromEntries(['transported-archive.b64','receiving-lock.json','receive-originals-r0.cjs'].map(n=>[n,info(read(n))]));
 const lock=JSON.parse(read('receiving-lock.json')), mirror=read('transported-archive.b64');
 verdict.mirror=pin(mirror,lock.mirror,'mirror');const compact=mirror.toString('ascii').replace(/\s/g,'');
 assert(/^[A-Za-z0-9+/]*={0,2}$/.test(compact));const packed=Buffer.from(compact,'base64');assert.equal(packed.toString('base64'),compact);
 verdict.archive=pin(packed,lock.archive,'archive');
 const tar=zlib.gunzipSync(packed,{maxOutputLength:32*1024*1024}), files=new Map(); let pending={},p=0,ended=false;
 const str=b=>b.subarray(0,b.indexOf(0)<0?b.length:b.indexOf(0)).toString('utf8');
 const num=b=>{const s=str(b).trim();assert(/^[0-7]*$/.test(s));return s?parseInt(s,8):0;};
 function pax(buf){const out={};let at=0;while(at<buf.length){const space=buf.indexOf(32,at);assert(space>at);const n=Number(buf.subarray(at,space).toString());assert(Number.isInteger(n)&&n>0&&at+n<=buf.length);const rec=buf.subarray(space+1,at+n);assert.equal(rec.at(-1),10);const eq=rec.indexOf(61);assert(eq>0);out[rec.subarray(0,eq).toString()]=rec.subarray(eq+1,-1).toString('utf8');at+=n;}return out;}
 while(p+512<=tar.length){const hd=tar.subarray(p,p+512);if(hd.every(x=>x===0)){assert(tar.subarray(p).every(x=>x===0),'nonzero after tar end');ended=true;break;}
  const sum=[...hd].reduce((a,x,i)=>a+(i>=148&&i<156?32:x),0);assert.equal(num(hd.subarray(148,156)),sum,'tar checksum');
  const size=num(hd.subarray(124,136)),typ=String.fromCharCode(hd[156]||48);assert(size<=16*1024*1024&&p+512+size<=tar.length);
  const buf=tar.subarray(p+512,p+512+size);p+=512+Math.ceil(size/512)*512;
  if(typ==='x'){pending=pax(buf);continue;}
  assert(typ==='0'||typ==='5','unsupported tar entry '+typ);
  let name=pending.path||([str(hd.subarray(345,500)),str(hd.subarray(0,100))].filter(Boolean).join('/'));pending={};
  assert(name&&!name.startsWith('/')&&!name.includes('\\')&&!name.split('/').includes('..'),'unsafe name');assert(!files.has(name),'duplicate member');
  if(typ==='5'){assert.equal(size,0);continue;}files.set(name,Buffer.from(buf));
 }
 assert(ended);assert.equal(files.size,74);
 const get=n=>{assert(files.has(n),'missing '+n);return files.get(n);};
 verdict.manifest=pin(get('manifest.json'),lock.manifest,'manifest');
 const manifest=JSON.parse(get('manifest.json'));assert.equal(manifest.members.length,73);assert.equal(manifest.originalFiles.length,69);assert.equal(manifest.originalDirectories.length,10);
 assert.deepEqual([...files.keys()].sort(),['manifest.json',...manifest.members.map(x=>x.path)].sort());
 for(const row of manifest.members)pin(get(row.path),row,row.path);
 for(const row of manifest.originalFiles)pin(get('original/'+row.path),row,'original '+row.path);
 verdict.archiveCounts={regularMembers:74,manifestedPayloads:73,originalFiles:69,recordedOriginalDirectories:10};
 const receiptBytes=get('original/browser-r0/receiving.json');verdict.originalReceipt=pin(receiptBytes,lock.receipt,'receipt');const r=JSON.parse(receiptBytes);
 assert.equal(r.status,'passed');assert.equal(r.checks.length,12);assert.equal(new Set(r.checks).size,12);assert.equal(r.artifacts.length,18);
 for(const flag of ['sourceUnchanged','runtimeUnchanged','receiverUnchanged','extraUnchanged','serverClosed','profileRemoved','finalEventsAccepted','withinTimeBudget'])assert.equal(r[flag],true,flag);
 assert.equal(r.pageErrors.length,0);assert.equal(r.cleanupErrors.length,0);assert.equal(r.closeResponse,'confirmed');assert(r.closeRequestSent);
 assert.equal(r.browserClosure.ok,true);assert.equal(r.browserClosure.code,0);assert.equal(r.browserClosure.signal,null);assert.equal(r.browserClosure.observerExitCode,0);assert.equal(r.browserClosure.observerSignal,null);
 assert.equal(r.launcherClose.code,0);assert.equal(r.launcherClose.signal,null);
 assert.equal(r.browserObserverClose.observerStops.length,0);assert.equal(r.browserObserverClose.confirmedExit,true);
 const events=r.browserObserverClose.events;assert.deepEqual(events.map(x=>x.event),['READY','EXIT']);assert.deepEqual(events[0].identity,events[1].identity);assert.equal(events[1].exitCode,0);assert.equal(events[0].identity.handleOpened,true);
 assert.equal(events[0].identity.pid,r.browserPid);assert(!events[0].identity.commandLine.includes('--no-sandbox'));
 for(const a of [r.resourceAdmission,r.preLaunchResources]){assert.equal(a.minimumFreeMemory,2147483648);assert.equal(a.minimumFreeDisk,1073741824);assert(a.freeMemory>=a.minimumFreeMemory&&a.freeDisk>=a.minimumFreeDisk);}
 assert.equal(r.node,'v24.14.0');assert.equal(r.offeredOwnerGitBlob,lock.sourceManifest.owner177.gitBlob);
 assert.equal(r.protocolGit,'aeda8c66cd1272117fda115215c1e6ab57eaab32');assert.equal(G(get('original/browser-protocol-r0.json')),r.protocolGit);
 assert.equal(H(get('original/browser-manifest-r0.json')),r.manifestSHA256);assert.deepEqual(JSON.parse(get('original/browser-manifest-r0.json')),lock.sourceManifest);
 assert.equal(lock.protocol.nativeSourceClosure.length,13);
 assert.deepEqual(Object.keys(r.sourceSha256).sort(),lock.protocol.nativeSourceClosure.map(x=>x.path).sort());
 verdict.sources=lock.protocol.nativeSourceClosure.map(row=>{const got=pin(get('original/source-r0/'+row.path),row,'source '+row.path);assert.equal(r.sourceSha256[row.path],got.sha256);assert.equal(lock.sourceManifest.sources[row.path],got.sha256);return{path:row.path,...got};});
 assert.equal(H(get('original/receive-browser-r0.mjs')),r.receiverSha256);
 assert.equal(H(get('original/owned-chrome-observer.mjs')),r.extraAfter.observer);
 assert.deepEqual(r.runtimeBefore,r.runtimeAfter);
 const b=lock.manual.before,a=JSON.parse(JSON.stringify(b));a.title='Revised lesson <literal> 日本語';a.attribution='Revised author\nExact source';a.license='Revised permission';a.concepts.reverse();a.items=[a.items[2],a.items[1],a.items[3]];a.items[0].options[0]='REVISED_CORRECT_TEXT';a.items[1].options=['C second','A second','B second'];a.items[1].answer=0;a.items[2].id='renamed fourth';
 const B=Buffer.from(JSON.stringify(b,null,2)+'\n'),A=Buffer.from(JSON.stringify(a,null,2)+'\n'),P=Buffer.from(JSON.stringify({...b,ignoredExtension:'ignored by native validator'}));
 assert(get('original/browser-r0/earlier 日本語.json').equals(B));assert(get('original/browser-r0/revised lesson 日本語.json').equals(A));assert(get('original/browser-r0/same-content-different-bytes.json').equals(P));
 const changed={format:'recallweave-course-comparison/1',sameContent:false,metadataChanges:['title','attribution','license'].map(field=>({field,before:b[field],after:a[field]})),concepts:{beforeOrder:b.concepts,afterOrder:a.concepts,added:[],removed:[],retainedOrderChanged:true},questions:{beforeOrder:['q-first',' q spaced ','__proto__','constructor'],afterOrder:['__proto__',' q spaced ','renamed fourth'],added:[a.items[2]],removed:[b.items[0],b.items[3]],retained:[{id:' q spaced ',beforeIndex:1,afterIndex:1,positionChanged:false,changedFields:['options','answer'],answerIndexChanged:true,answerTextChanged:false,before:b.items[1],after:a.items[1]},{id:'__proto__',beforeIndex:2,afterIndex:0,positionChanged:true,changedFields:['options'],answerIndexChanged:false,answerTextChanged:true,before:b.items[2],after:a.items[0]}],retainedOrderChanged:true,summary:{beforeCount:4,afterCount:3,added:1,removed:2,changed:2,unchanged:0,positionChanged:1}}};
 const same={format:'recallweave-course-comparison/1',sameContent:true,metadataChanges:[],concepts:{beforeOrder:b.concepts,afterOrder:b.concepts,added:[],removed:[],retainedOrderChanged:false},questions:{beforeOrder:b.items.map(x=>x.id),afterOrder:b.items.map(x=>x.id),added:[],removed:[],retained:b.items.map((x,i)=>({id:x.id,beforeIndex:i,afterIndex:i,positionChanged:false,changedFields:[],answerIndexChanged:false,answerTextChanged:false,before:x,after:x})),retainedOrderChanged:false,summary:{beforeCount:4,afterCount:4,added:0,removed:0,changed:0,unchanged:4,positionChanged:0}}};
 const captured=(name,bytes)=>({name,bytes:bytes.length,sha256:H(bytes)});
 const expected=(kind)=>({format:'recallweave-course-comparison-browser/1',files:{before:captured('earlier 日本語.json',B),after:kind==='changed'?captured('revised lesson 日本語.json',A):kind==='same-content'?captured('same-content-different-bytes.json',P):captured('earlier 日本語.json',B)},sameBytes:kind==='identical',comparison:kind==='changed'?changed:same});
 const downloads=[];for(const mode of ['modular','standalone'])for(const suffix of ['comparison','after-refusal','download-retry','identical','same-content','digest-replacement','digest-clear']){const name=mode+'-'+suffix+'.json',raw=get('original/browser-r0/'+name),kind=suffix==='identical'?'identical':suffix==='same-content'?'same-content':'changed',exp=expected(kind);assert.deepEqual(JSON.parse(raw),exp,name+' manual fields');assert.equal(raw.toString('utf8'),JSON.stringify(exp,null,2)+'\n',name+' canonical bytes');downloads.push({name,...info(raw),kind});}
 const artifacts=r.artifacts;for(const ar of artifacts)pin(get('original/browser-r0/'+ar.name),ar,'artifact '+ar.name);
 const physical=[...files].filter(([name])=>name.startsWith('original/browser-r0/downloads/'));assert.equal(physical.length,14);assert.deepEqual(physical.map(([,buf])=>H(buf)).sort(),downloads.map(x=>x.sha256).sort());
 function crc32(buf){let c=0xffffffff;for(const v of buf){c^=v;for(let j=0;j<8;j++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
 function png(buf){assert(buf.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])));let p=8,w,h,channels,idat=[],chunks=0,ended=false;while(p+12<=buf.length){const n=buf.readUInt32BE(p),type=buf.subarray(p+4,p+8).toString('ascii');assert(p+n+12<=buf.length);assert.equal(crc32(buf.subarray(p+4,p+8+n)),buf.readUInt32BE(p+8+n),'PNG CRC '+type);const d=buf.subarray(p+8,p+8+n);if(type==='IHDR'){assert.equal(chunks,0);assert.equal(n,13);w=d.readUInt32BE(0);h=d.readUInt32BE(4);assert(w>0&&h>0&&w*h<4000000);assert.equal(d[8],8);assert([2,6].includes(d[9]));channels=d[9]===2?3:4;assert.equal(d[10],0);assert.equal(d[11],0);assert.equal(d[12],0);}if(type==='IDAT')idat.push(d);p+=n+12;chunks++;if(type==='IEND'){assert.equal(n,0);ended=true;break;}}
 assert(ended&&p===buf.length&&idat.length);const stride=w*channels,raw=zlib.inflateSync(Buffer.concat(idat),{maxOutputLength:(stride+1)*h});assert.equal(raw.length,(stride+1)*h);const pixels=Buffer.alloc(stride*h);
 const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
 for(let y=0;y<h;y++){const f=raw[y*(stride+1)];assert(f<=4);for(let x=0;x<stride;x++){const left=x>=channels?pixels[y*stride+x-channels]:0,up=y?pixels[(y-1)*stride+x]:0,ul=y&&x>=channels?pixels[(y-1)*stride+x-channels]:0;pixels[y*stride+x]=(raw[y*(stride+1)+1+x]+(f===0?0:f===1?left:f===2?up:f===3?Math.floor((left+up)/2):paeth(left,up,ul)))&255;}}
 return{width:w,height:h,channels,chunks,decodedBytes:pixels.length,pixelsSha256:H(pixels)};}
 verdict.images=artifacts.filter(x=>x.name.endsWith('.png')).map(ar=>({name:ar.name,...pin(get('original/browser-r0/'+ar.name),ar,ar.name),...png(get('original/browser-r0/'+ar.name))}));
 for(const im of verdict.images)assert.equal(im.width,im.name.startsWith('modular')?1280:390);
 verdict.downloads=downloads;verdict.physicalDownloadCount=14;verdict.manualOracle=lock.manual.provenance;verdict.originalBrowser={status:r.status,checks:r.checks,elapsedMs:r.elapsedMs,browser:r.browser,browserPid:r.browserPid,closeRequestSent:r.closeRequestSent,closeResponse:r.closeResponse,browserClosure:r.browserClosure,launcherClose:r.launcherClose,profileRemoved:r.profileRemoved,sourceUnchanged:r.sourceUnchanged,runtimeUnchanged:r.runtimeUnchanged,finalEventsAccepted:r.finalEventsAccepted};
 const negatives=[];function reject(label,fn){assert.throws(fn);negatives.push(label);}
 const clone=x=>JSON.parse(JSON.stringify(x));
 let wrong=clone(expected('changed'));wrong.comparison.questions.retained[0].answerTextChanged=true;reject('confused answer text with index',()=>assert.deepEqual(wrong,expected('changed')));
 wrong=clone(expected('changed'));wrong.comparison.questions.retained.reverse();reject('retained order reversed',()=>assert.deepEqual(wrong,expected('changed')));
 wrong=clone(expected('changed'));wrong.files.before.sha256='0'.repeat(64);reject('captured byte hash replaced',()=>assert.deepEqual(wrong,expected('changed')));
 wrong=clone(expected('same-content'));wrong.sameBytes=true;reject('content identity confused with byte identity',()=>assert.deepEqual(wrong,expected('same-content')));
 const corrupt=Buffer.from(get('original/browser-r0/modular-comparison.png'));corrupt[45]^=1;reject('PNG content corruption',()=>png(corrupt));
 reject('manifest payload corruption',()=>pin(Buffer.from('changed'),manifest.members[0],'negative'));
 verdict.sensitivity=negatives;verdict.visual=lock.visual;verdict.priorFailures=lock.failures;
 verdict.inputsBefore=inputs;verdict.inputsAfter=Object.fromEntries(Object.keys(inputs).map(n=>[n,info(read(n))]));assert.deepEqual(verdict.inputsAfter,inputs);assert.deepEqual(info(fs.readFileSync(process.execPath)),verdict.runtime);
 verdict.accepted=true;verdict.completed=new Date().toISOString();
}catch(e){verdict.error={name:e.name,message:e.message,stack:e.stack};process.exitCode=1;}
fs.writeFileSync(path.join(root,'receiving-r0.json'),JSON.stringify(verdict,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({accepted:verdict.accepted,archive:verdict.archive,counts:verdict.archiveCounts,downloads:verdict.downloads?.length,images:verdict.images?.length,error:verdict.error,receipt:info(fs.readFileSync(path.join(root,'receiving-r0.json')))}));
