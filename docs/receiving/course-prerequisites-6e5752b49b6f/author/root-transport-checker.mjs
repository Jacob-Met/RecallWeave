import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
export function verifyAuthorCapsule(input) {
  const sha256=b=>createHash('sha256').update(b).digest('hex');
  const git=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
  const mirror=Buffer.from(input.mirror,'utf8'), manifestBytes=Buffer.from(input.manifestRaw,'utf8');
  assert.equal(git(mirror),'d7f9dbe847c0d1e024550d98d2ed88e2cedc6a89');
  assert.equal(git(manifestBytes),'960ff6a32c43f29202cb1bb543cd0b5bae8ef0aa');
  assert.match(input.mirror,/^[A-Za-z0-9+/=\r\n]+$/);
  const normalized=input.mirror.replace(/[\r\n]/g,'');
  const archive=Buffer.from(normalized,'base64');
  assert.equal(archive.toString('base64'),normalized);
  assert.equal(archive.length,45821);
  assert.equal(sha256(archive),'266de7cc3d2579c043bcc055e2b5d8311730c38bfbef1c62f389696a884175f5');
  assert.equal(git(archive),'e50fb000eb86abc99e6a7fe9d40867c15c1b32a1');
  const tar=gunzipSync(archive,{maxOutputLength:4*1024*1024});
  const text=(b)=>new TextDecoder('utf-8',{fatal:true}).decode(b);
  const field=(b)=>text(b).replace(/\0.*$/s,'');
  const oct=(b)=>{const s=field(b).trim();assert.match(s,/^[0-7]+$/);return Number.parseInt(s,8);};
  const members=new Map();let offset=0;
  for(;;){
    assert.ok(offset+512<=tar.length,'complete header or trailer');
    const h=tar.subarray(offset,offset+512);
    if(h.every(x=>x===0)){assert.ok(tar.length-offset>=1024);assert.ok(tar.subarray(offset).every(x=>x===0));break;}
    let checksum=0;for(let i=0;i<512;i++)checksum+=i>=148&&i<156?32:h[i];
    assert.equal(checksum,oct(h.subarray(148,156)));
    assert.equal(field(h.subarray(257,263)),'ustar');
    assert.ok(h[156]===0||h[156]===48,'regular files only');
    const prefix=field(h.subarray(345,500)),name=field(h.subarray(0,100));
    const path=prefix?prefix+'/'+name:name;
    assert.ok(path.length>0&&!path.startsWith('/')&&!path.includes('\\'));
    assert.ok(path.split('/').every(x=>x!==''&&x!=='.'&&x!=='..'));
    assert.ok(!members.has(path),'unique paths');
    const n=oct(h.subarray(124,136));assert.ok(Number.isSafeInteger(n)&&n>=0);
    const end=offset+512+n,padded=offset+512+Math.ceil(n/512)*512;
    assert.ok(padded<=tar.length);assert.ok(tar.subarray(end,padded).every(x=>x===0));
    members.set(path,tar.subarray(offset+512,end));offset=padded;
  }
  assert.equal(members.size,32);
  const manifest=JSON.parse(input.manifestRaw);
  assert.equal(manifest.commit,'1bbbc9007d29247c765965bbf1717088167c1cfb');
  assert.equal(manifest.tree,'b0fedebb0ab4ec31ded8887d06e63a19496ae6ad');
  assert.equal(manifest.members.length,31);
  const declared=new Set();
  for(const m of manifest.members){
    assert.ok(!declared.has(m.path));declared.add(m.path);
    const b=members.get(m.path);assert.ok(b,'member '+m.path);
    assert.equal(b.length,m.bytes);assert.equal(sha256(b),m.sha256);assert.equal(git(b),m.git);
  }
  const extra=[...members.keys()].filter(p=>!declared.has(p));assert.equal(extra.length,1);
  assert.deepEqual(members.get(extra[0]),manifestBytes);
  assert.equal(manifest.originalInventory.filter(x=>x.type==='file').length,29);
  assert.equal(manifest.originalInventory.filter(x=>x.type==='directory').length,9);
  const originals=manifest.members.filter(x=>x.path.startsWith('original/'));
  assert.equal(originals.length,29);
  for(const rec of manifest.originalInventory.filter(x=>x.type==='file')){
    const b=members.get('original/'+rec.path);assert.ok(b,'original inventory '+rec.path);
    if(rec.bytes!==undefined)assert.equal(b.length,rec.bytes);
    if(rec.sha256!==undefined)assert.equal(sha256(b),rec.sha256);
    if(rec.git!==undefined)assert.equal(git(b),rec.git);
  }
  return {format:'recall196-root-author-transport-receiving/1',accepted:true,
    scope:'Independent in-memory verification of the supported Git UTF8 Base64 readback and all transported original archive members; no product execution, file extraction, browser replay or native timestamp remeasurement.',
    node:process.version,archive:{git:git(archive),bytes:archive.length,sha256:sha256(archive)},
    mirrorGit:git(mirror),manifestGit:git(manifestBytes),membersVerified:32,manifestedPayloads:31,
    originalFilesVerified:29,recordedOriginalDirectories:9,sourceCommit:manifest.commit,sourceTree:manifest.tree};
}
