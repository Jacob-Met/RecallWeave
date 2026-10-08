const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),os=require('node:os');
const root=__dirname, source=String.raw`C:\Users\minec\AppData\Local\Hamon\estate-6e5752b49b6f\handout-selection-production\browser-r1`;
const expected={
 'modular-worksheet.pdf':'832b16f89c28c89337bd6d2541760ad81e44b568d700a068e00311f5128b5897',
 'modular-answer-key.pdf':'29f2191953d5ef6b6c1ae8d057d835e8331223021795c05601d856ae8a7e452c',
 'standalone-worksheet.pdf':'949ea110251b1ea17990d82c588f011ad2a2a5959ccc6b83aca5d6c8c5cbe768',
 'standalone-answer-key.pdf':'cc35525fe166957eb078285b28aa1b504353163bd3acf1daaf904b8f09231761'
};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const nodeHash=hash(fs.readFileSync(process.execPath));
if(nodeHash!=='ba4e6d110e8c1592a1ecd390f6b05f3da124b13871a5be62b341a07a853c6c32')throw Error('node pin');
const receipt={at:new Date().toISOString(),hostname:os.hostname(),user:os.userInfo().username,node:process.version,node_path:process.execPath,node_sha256:nodeHash,free_ram:os.freemem(),source,files:[]};
for(const [name,pin] of Object.entries(expected)){
 const b=fs.readFileSync(path.join(source,name));
 if(hash(b)!==pin)throw Error('PDF pin '+name);
 fs.writeFileSync(path.join(root,name),b,{flag:'wx'});
 const encoded=b.toString('base64');
 fs.writeFileSync(path.join(root,name+'.b64'),encoded.match(/.{1,20000}/g).join('\n')+'\n',{flag:'wx'});
 receipt.files.push({name,bytes:b.length,sha256:pin,base64_chars:encoded.length,base64_lines:Math.ceil(encoded.length/20000)});
}
for(const name of ['fixture.json','modular-selected-worksheet.html','modular-selected-answer-key.html','standalone-selected-worksheet.html','standalone-selected-answer-key.html','receiving.json']){
 const b=fs.readFileSync(path.join(source,name));
 fs.writeFileSync(path.join(root,'author-'+name),b,{flag:'wx'});
 receipt.files.push({name,bytes:b.length,sha256:hash(b),role:'unchanged author reference'});
}
fs.writeFileSync(path.join(root,'transport-source-admission.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(receipt));
