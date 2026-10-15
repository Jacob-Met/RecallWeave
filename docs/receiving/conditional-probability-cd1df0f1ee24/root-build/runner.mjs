import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
const root = '/home/jacob/hamon-probability-cd1df0f1ee24/candidate';
const evidence = '/dev/shm/hamon-probability-cd1df0f1ee24/root-build-v1';
fs.mkdirSync(evidence, {recursive:true});
const pins = {
 'src/conditional-probability.mjs':'51750dc91155e2f2e44b8db3abdbed7d4ece565b128e1827d4c760c55305e58d',
 'src/conditional-probability-ui.mjs':'02066699e7c0e95b91a9cd17017491995c225432cc422c0cefab0c5ab338058f',
 'courses/conditional-probability-lab.template.html':'cced7f75260015e47b5580ce2b9861c5aa8b866b65db72d7465b84a40850a3a5',
 'tools/build-conditional-probability-lab.mjs':'396a07c8ea979e8a161752933b6e4f729aec05ef9f8782120bb953d95b00fb3c',
 'tests/conditional-probability-build.test.mjs':'cac00dcafefcfda1855bcb36cd4da15cef40138bb44a32f0d1d9c28d75f3f8ae',
 'courses/probability-foundations.json':'17a35b359ab5c1f097931bba29dcf7deddc75c98accbf1cced8ae5eca9e9ad01',
 'src/deck.mjs':'621438c166ec4bfafd9d87c698a1d46cb1722f4fb92dcbb8d9f52fce682c338b',
};
const hash = (buffer, algo='sha256') => crypto.createHash(algo).update(buffer).digest('hex');
const info = relative => {
 const bytes = fs.readFileSync(path.join(root,relative));
 return {path:relative,bytes:bytes.length,sha256:hash(bytes),git_blob:hash(Buffer.concat([Buffer.from('blob '+bytes.length+'\0'),bytes]),'sha1')};
};
const receipt = {format:'hamon-native-build/1',started_at:new Date().toISOString(),node:process.version,platform:process.platform,arch:process.arch,root,inputs:[],steps:[],outcome:'pending'};
try {
 for(const [relative,expected] of Object.entries(pins)){
  const actual=info(relative); receipt.inputs.push(actual);
  if(actual.sha256!==expected) throw new Error('input SHA mismatch: '+relative);
 }
 const output='courses/conditional-probability-lab.html';
 if(fs.existsSync(path.join(root,output))) throw new Error('refusing to replace an existing first-build output');
 for(const [name,args] of [
  ['build',['tools/build-conditional-probability-lab.mjs']],
  ['maintained-build-parity',['--test','tests/conditional-probability-build.test.mjs']],
 ]){
  const result=spawnSync('/usr/bin/node',args,{cwd:root,encoding:'utf8',timeout:30000,maxBuffer:2*1024*1024});
  fs.writeFileSync(path.join(evidence,name+'.stdout.txt'),result.stdout||'');
  fs.writeFileSync(path.join(evidence,name+'.stderr.txt'),result.stderr||'');
  receipt.steps.push({name,command:['/usr/bin/node',...args],status:result.status,signal:result.signal,error:result.error?.message||null,stdout_bytes:Buffer.byteLength(result.stdout||''),stderr_bytes:Buffer.byteLength(result.stderr||'')});
  if(result.status!==0) throw new Error('step failed: '+name);
 }
 receipt.output=info(output);
 for(const input of receipt.inputs) if(info(input.path).sha256!==input.sha256) throw new Error('input changed: '+input.path);
 receipt.outcome='passed';
} catch(error) {
 receipt.outcome='failed';receipt.error=String(error?.stack||error);process.exitCode=1;
}
receipt.finished_at=new Date().toISOString();
fs.writeFileSync(path.join(evidence,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');
process.stdout.write(JSON.stringify(receipt)+'\n');
