import {readFileSync,writeFileSync,readdirSync,openSync,closeSync,statfsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const root='/home/jacob/recallweave-eigen-2479534e1930';
const out=root+'/docs/receiving/eigen-directions-2479534e1930';
const files=readdirSync(root+'/tests').filter(f=>f.endsWith('.test.mjs')).sort().map(f=>'tests/'+f);
const free=statfsSync(root);assert.ok(Number(free.bavail)*Number(free.bsize)>256*1024*1024);
const started=new Date().toISOString();
const log=openSync(out+'/integration-suite.tap','wx');
const run=spawnSync(process.execPath,['--test','--test-concurrency=4','--test-reporter=tap',...files],{cwd:root,stdio:['ignore',log,log],timeout:180000});
closeSync(log);
const tap=readFileSync(out+'/integration-suite.tap','utf8');
const summary=tap.split('\n').filter(s=>/^# (tests |suites |pass |fail |cancelled |skipped |todo |duration_ms )/.test(s));
const before=readFileSync(root+'/demo.html');
const builder=spawnSync('python3',['tools/make_demo.py'],{cwd:root,encoding:'utf8',timeout:30000});
const after=readFileSync(root+'/demo.html');
const eigen=spawnSync(process.execPath,['tools/build-eigen-directions.mjs','--check'],{cwd:root,encoding:'utf8',timeout:30000});
const receipt={
 started,finished:new Date().toISOString(),node:process.version,
 integrationBase:execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),
 command:'node --test --test-concurrency=4 --test-reporter=tap tests/*.test.mjs',
 testFiles:files.length,exitStatus:run.status,signal:run.signal,error:run.error?.message??null,summary,
 demoBuilder:{exitStatus:builder.status,stdout:builder.stdout,stderr:builder.stderr,identical:before.equals(after),sha256:createHash('sha256').update(after).digest('hex')},
 eigenBuilder:{exitStatus:eigen.status,stdout:eigen.stdout,stderr:eigen.stderr}
};
writeFileSync(out+'/integration-gate.json',JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt,null,2));
if(run.status!==0||builder.status!==0||!before.equals(after)||eigen.status!==0)process.exitCode=1;
