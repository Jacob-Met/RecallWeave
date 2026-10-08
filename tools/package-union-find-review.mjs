#!/usr/bin/env node
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync, spawnSync} from 'node:child_process';
import {readFile, writeFile, mkdir, chmod, utimes} from 'node:fs/promises';
import {resolve, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const args=process.argv.slice(2);
const option=name=>{const index=args.indexOf(name);assert.ok(index>=0&&args[index+1],name+' is required');return args[index+1];};
const repo=resolve(option('--repository')), commit=option('--commit'), base=option('--base');
const output=resolve(option('--output')), expectedLearner=option('--learner-sha256');
assert.match(commit,/^[0-9a-f]{40}$/);assert.match(base,/^[0-9a-f]{40}$/);
assert.match(expectedLearner,/^[0-9a-f]{64}$/);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const git=(...argv)=>execFileSync('git',['-C',repo,...argv],{maxBuffer:16*1024*1024});
assert.equal(git('rev-parse',commit+'^{commit}').toString().trim(),commit);
assert.equal(spawnSync('git',['-C',repo,'merge-base','--is-ancestor',base,commit]).status,0);
const tree=git('rev-parse',commit+'^{tree}').toString().trim();
const sourceTime=git('show','-s','--format=%cI',commit).toString().trim();
const entries=[
  {source:'courses/union-find-explorer.html',file:'explorer.html',expected:'75ef4e4af235761ca131e4bb15f6b1fb2899653633643b95fa4c219e0ef9ceb7'},
  {source:'demo.html',file:'learner.html',expected:expectedLearner},
  {source:'courses/union-find.json',file:'union-find.json',expected:'d7815a6b9da2218dd370fedd7cd0aadfaee793c18cf050b38c01eceedad1911d'},
  {source:'courses/union-find.md',file:'worked-guide.md',expected:'5e71d5505815cb8e46fa3d42266235b3dbcab2e11a0d87fc553ae5017b8199d1'}
];
for(const entry of entries){
  entry.bytes=git('show',commit+':'+entry.source);
  assert.equal(sha(entry.bytes),entry.expected,'Receiving pin must match '+entry.source);
  entry.gitBlob=git('rev-parse',commit+':'+entry.source).toString().trim();
}
await mkdir(output,{recursive:false});
const folder='RecallWeave-Union-Find', dir=join(output,folder);
await mkdir(dir);
const launcher=String.raw`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Connections and components · RecallWeave</title>
<style>
:root{color-scheme:light;--ink:#19363d;--muted:#52666b;--teal:#17675f;--paper:#f3f4ee;--line:#cbd7d3}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:17px/1.6 system-ui,sans-serif}
main{max-width:1050px;margin:auto;padding:54px 24px}h1{max-width:840px;font-size:clamp(2.4rem,6vw,4.5rem);line-height:1.04;letter-spacing:-.045em;margin:14px 0 24px}
h2{font-size:1.65rem;line-height:1.2;margin:10px 0 18px}p{margin:0 0 16px}
.eyebrow{font-size:.8rem;letter-spacing:.17em;text-transform:uppercase;color:var(--teal);font-weight:750}
.lede{font-size:1.2rem;max-width:740px;color:var(--muted)}.cards{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:36px 0}
article{background:#fffefa;border:1px solid var(--line);border-radius:18px;padding:28px;display:flex;flex-direction:column;align-items:flex-start}
.number{font:700 1rem/1 system-ui,sans-serif;color:var(--teal);background:#e3eee7;padding:10px 13px;border-radius:50%}
a{color:var(--teal);text-underline-offset:4px}a:focus-visible{outline:3px solid #bc631f;outline-offset:5px}
.button{display:inline-block;padding:12px 18px;min-height:48px;border-radius:8px;background:var(--teal);color:white;text-decoration:none;font-weight:700;margin-top:auto}
ol{padding-left:22px;margin:0 0 24px}li{padding:3px 0}.resources{padding:24px 0;border-top:1px solid var(--line);display:flex;gap:22px;flex-wrap:wrap}
.note,footer{font-size:.9rem;color:var(--muted)}code{font: .94em ui-monospace,monospace;overflow-wrap:anywhere}footer{margin-top:30px}
@media(max-width:660px){main{padding:30px 18px}.cards{grid-template-columns:1fr;gap:18px}article{padding:22px}.resources{gap:16px}}
</style></head><body><main>
<p class="eyebrow">RecallWeave · offline learning companion</p>
<h1>How do separate groups become connected?</h1>
<p class="lede">Explore the connections, inspect the exact parent trees, then practice the ideas with a twelve-question lesson.</p>
<div class="cards">
<article aria-labelledby="explore-title"><span class="number" aria-hidden="true">1</span><h2 id="explore-title">See the connections</h2>
<p>Add joins, follow representatives, and compare a graph with the forest that records its groups.</p>
<p>Step backward and forward through the same sequence. Turn path compression on or off to see what changes.</p>
<a class="button" href="explorer.html">Open the explorer</a></article>
<article aria-labelledby="learn-title"><span class="number" aria-hidden="true">2</span><h2 id="learn-title">Make the ideas stick</h2>
<ol><li>Open the learner and choose <strong>Bring your own lesson</strong>.</li>
<li>Select <code>union-find.json</code> from this extracted folder.</li>
<li>Inspect the preview, then select <strong>Start this deck</strong>.</li></ol>
<p>Review every answer and practice missed connections. Download your study notes when you want to keep them.</p>
<a class="button" href="learner.html">Open the learner</a></article>
</div>
<nav class="resources" aria-label="Lesson files">
<a href="union-find.json" download>Course file (.json)</a>
<a href="worked-guide.md" download>Worked guide (.md)</a>
<a href="README.txt">Opening instructions</a>
</nav>
<p class="note">Extract the whole ZIP before opening this page. The explorer and learner work directly from these files, without an internet connection, account or server.</p>
<footer>Original lesson and implementation by HAMON. The included course and worked guide retain their authorship, source references and usage terms.</footer>
</main></body></html>
`;
const instructions=[
  'RECALLWEAVE — CONNECTIONS AND COMPONENTS',
  '',
  '1. Extract the complete ZIP to a folder.',
  '2. Open START.html in a current desktop browser.',
  '3. Choose Open the explorer to inspect joins, representatives and parent trees.',
  '4. Choose Open the learner, then Bring your own lesson. Select the included',
  '   union-find.json, inspect its preview, and select Start this deck.',
  '',
  'The explorer and learner are complete local HTML files. No server, installation,',
  'internet connection or account is required. Keep both HTML files and the course',
  'file in the extracted folder so the opening page links continue to work.',
  '',
  'The learner keeps the active session in tab memory. Use its explicit study-note',
  'or learning-trace downloads when you want a copy. Refreshing starts over.',
  '',
  'The worked guide explains the conventions and includes the original references.',
  'The trace download in the explorer is an algorithm observation; it is separate',
  'from the learner-answer trace.',
  '',
  'SOURCE AND INTEGRATION',
  'Repository: https://github.com/Jacob-Met/RecallWeave',
  'Native candidate commit: '+commit,
  'Candidate tree: '+tree,
  'Canonical source base: '+base,
  'This review package contains the qualified native candidate. Its source receipt',
  'does not assert that the candidate has been merged or published to GitHub.',
  'The curated course catalog is maintained by its existing owners. This package',
  'provides a complete local explorer/course/learner entry independently of that catalog.',
  '',
  'Exact file hashes and source blobs are in SOURCE.json.',
  'Estate evidence: https://app.notion.com/p/3f3aedcdf4a581518f79d34897ddac64',
  ''
].join('\n');
const files=new Map(entries.map(entry=>[entry.file,entry.bytes]));
files.set('START.html',Buffer.from(launcher));
files.set('README.txt',Buffer.from(instructions));
const manifest={
  format:'recallweave-union-find-review-package/1',
  repository:'https://github.com/Jacob-Met/RecallWeave',
  nativeCandidateCommit:commit,nativeCandidateTree:tree,canonicalBaseCommit:base,sourceTimestamp:sourceTime,
  integrationState:'qualified native candidate; canonical publication is recorded separately',
  entrypoint:'START.html',
  files:Object.fromEntries([...files].map(([name,bytes])=>[name,{bytes:bytes.length,sha256:sha(bytes),
    ...(entries.find(entry=>entry.file===name)?{
      sourcePath:entries.find(entry=>entry.file===name).source,
      sourceGitBlob:entries.find(entry=>entry.file===name).gitBlob
    }:{kind:'original local package entry/instructions'})}])),
  evidence:'https://app.notion.com/p/3f3aedcdf4a581518f79d34897ddac64',
  algorithmAndCourse:'accepted unchanged source with independent BFS oracle and twelve blind course answers',
  browser:'native offline explorer/learner receiving; independent keyboard, 320px layout and root-ring repair receiving'
};
files.set('SOURCE.json',Buffer.from(JSON.stringify(manifest,null,2)+'\n'));
const timestamp=new Date(sourceTime);
for(const [name,bytes]of files){
  const file=join(dir,name);await writeFile(file,bytes,{flag:'wx'});await chmod(file,0o644);await utimes(file,timestamp,timestamp);
}
const archive=join(output,'RecallWeave-Union-Find-'+commit.slice(0,12)+'.zip');
execFileSync('zip',['-X','-9','-q',archive,...[...files.keys()].sort().map(name=>folder+'/'+name)],{
  cwd:output,env:{...process.env,TZ:'UTC'},maxBuffer:1024*1024
});
const archiveBytes=await readFile(archive);
const receipt={
  format:'recallweave-review-package-assembly/1',completed:new Date().toISOString(),
  sourceCommit:commit,sourceTree:tree,base,archive,bytes:archiveBytes.length,sha256:sha(archiveBytes),
  entrypoint:folder+'/START.html',memberCount:files.size,packageManifestSha256:sha(files.get('SOURCE.json')),
  packagerSha256:sha(await readFile(fileURLToPath(import.meta.url))),
  verification:'Input hashes checked against accepted source; extracted-file receiving follows separately.'
};
await writeFile(join(output,'assembly-receipt.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(receipt,null,2));
