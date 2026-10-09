import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const root=String.raw`C:\Users\jacob\recallweave-nfa-independent-3dcb83a1`;
const manifestPath=path.join(root,'browser-source-manifest-v1.json');
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
function pin(p){const b=fs.readFileSync(p);return {bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex'),git_blob:crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex')};}
function check(p,row){const got=pin(p);for(const k of ['bytes','sha256','git_blob'])assert.equal(got[k],row[k],p+' '+k);return got;}
const dest=path.join(root,'product-received-v1');
assert.equal(fs.existsSync(dest),false,'Exclusive receiving copy already exists; reconcile rather than overwrite.');
assert.equal(manifest.files.length,9);
const before={};
for(const row of manifest.files){assert(!path.isAbsolute(row.path)&&!row.path.split('/').includes('..'));before[row.path]=check(path.join(manifest.product_source,row.path),row);}
before['learner-original/demo.html']=check(manifest.learner.original,manifest.learner);
fs.mkdirSync(dest);
for(const row of manifest.files){const target=path.join(dest,row.path);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(manifest.product_source,row.path),target,fs.constants.COPYFILE_EXCL);check(target,row);}
fs.copyFileSync(manifest.learner.original,path.join(dest,'demo.html'),fs.constants.COPYFILE_EXCL);check(path.join(dest,'demo.html'),manifest.learner);
for(const row of manifest.files)check(path.join(manifest.product_source,row.path),row);
check(manifest.learner.original,manifest.learner);
const report={schema:'recallweave-root-browser-intake-result.v1',accepted:true,created_utc:new Date().toISOString(),base:manifest.base,manifest:pin(manifestPath),product_files:9,unchanged_learner_files:1,received_root:dest,original_source_unchanged:true,files:before,execution:'Byte adoption only; no browser/model/learner run',node:process.version,runtime:pin(process.execPath),adoption_program:pin(new URL(import.meta.url))};
fs.writeFileSync(path.join(root,'browser-source-intake-v1.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({accepted:true,files:10,result:pin(path.join(root,'browser-source-intake-v1.json'))}));
