'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const H=b=>crypto.createHash('sha256').update(b).digest('hex');
const G=b=>crypto.createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const meta=JSON.parse(fs.readFileSync(path.join(__dirname,'archive-metadata.json')));
const arc=fs.readFileSync(meta.archive);assert.equal(arc.length,194393);assert.equal(H(arc),'e1fa0b32b3080876005d58faf981fc2c861bd0409e514af96e1308e550f75ceb');assert.equal(G(arc),meta.gitBlob);
assert.deepEqual(Buffer.from(fs.readFileSync(path.join(__dirname,'packet.b64'),'utf8').replace(/\s/g,''),'base64'),arc);
const tar=zlib.gunzipSync(arc),files=new Map();let offset=0;while(tar.subarray(offset,offset+512).some(x=>x)){const h=tar.subarray(offset,offset+512),name=h.subarray(0,100).toString().split('\0')[0],size=parseInt(h.subarray(124,136).toString().replace(/\0/g,'').trim(),8);assert.ok(!files.has(name));files.set(name,tar.subarray(offset+512,offset+512+size));offset+=512+Math.ceil(size/512)*512;}
assert.equal(files.size,37);const man=JSON.parse(files.get('manifest.json'));assert.equal(man.files.length,36);
for(const f of man.files){const b=files.get(f.path);assert.ok(b);assert.equal(b.length,f.bytes);assert.equal(H(b),f.sha256);assert.equal(G(b),f.gitBlob);}
const received=JSON.parse(fs.readFileSync(path.join(__dirname,'transport-verification.json')));assert.equal(received.accepted,true);assert.equal(received.archive.sha256,H(arc));
const orig=JSON.parse(files.get('custody/receiving.json'));for(const f of orig.originalFiles){const b=fs.readFileSync(path.join(orig.sourceRoot,f.path));assert.equal(H(b),f.sha256);assert.deepEqual(b,files.get('original/'+f.path));}
const result={schema:'recall180-custody-native-disk-readback/1',accepted:true,archive:{bytes:arc.length,sha256:H(arc),gitBlob:G(arc)},members:files.size,manifestPayloads:36,originalFilesUnchanged:19,base64DiskCopyExact:true,note:'Post-write native filesystem archive and Base64 readback; prior seal metadata nativeMemberReadback concerned the in-memory archive. Independent transported CPython receipt separately verifies all payloads and four PNG decodes.',at:new Date().toISOString()};
fs.writeFileSync(path.join(__dirname,'native-disk-readback.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result));
