import fs from 'node:fs';import zlib from 'node:zlib';import crypto from 'node:crypto';import assert from 'node:assert/strict';
const root='/run/user/1000/recallweave-prerequisite-receiving-6e5752b49b6f-native-r0';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const bytes=Buffer.from(fs.readFileSync(root+'/transported-mirror-r1.b64','utf8').replace(/\s/g,''),'base64');
assert.equal(bytes.length,50682);assert.equal(sha(bytes),'9c13ebb46f26ab1ad01eaf2cb810044d1b2d6029189ca58651f8e497ad0a772a');
const tar=zlib.gunzipSync(bytes),members=new Map();let offset=0;
while(offset+512<=tar.length){
 const head=tar.subarray(offset,offset+512);if(head.every(v=>v===0))break;
 const str=(a,b)=>head.subarray(a,b).toString('utf8').replace(/\0.*$/s,'');
 const name=str(0,100);assert.ok(name&&!name.startsWith('/')&&!name.split('/').includes('..')&&!members.has(name));
 const expected=parseInt(str(148,156).trim(),8);let sum=0;for(let i=0;i<512;i++)sum+=(i>=148&&i<156)?32:head[i];assert.equal(sum,expected);
 assert.ok([0,48].includes(head[156]));const size=parseInt(str(124,136).trim(),8);assert.ok(Number.isSafeInteger(size)&&size>=0&&offset+512+size<=tar.length);
 members.set(name,tar.subarray(offset+512,offset+512+size));offset+=512+Math.ceil(size/512)*512;
}
assert.equal(members.size,23);
const manifestBytes=members.get('manifest.json');assert.equal(sha(manifestBytes),'988026df9e1cb6be782239be3a62e115f617790362dbae4a6837554e5ba2fb67');
const manifest=JSON.parse(manifestBytes);assert.equal(manifest.files.length,22);
for(const f of manifest.files){const b=members.get(f.path);assert.ok(b);assert.equal(b.length,f.bytes);assert.equal(sha(b),f.sha256);}
assert.equal(JSON.parse(members.get('receiving-r1.json')).passed,true);
const out={scope:'Independent Node gzip/tar/member verification of the supported Git UTF8 Base64 readback, without product execution or file extraction',passed:true,archiveSha256:sha(bytes),members:members.size,manifestPayloads:manifest.files.length,mirrorGit:'003f501f0fc5faf20ea56b694e5ba55422475ca0'};
fs.writeFileSync(root+'/transport-receipt-r1.json',JSON.stringify(out,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(out));
