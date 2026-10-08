import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const root=path.dirname(new URL(import.meta.url).pathname);
const read=relative=>JSON.parse(fs.readFileSync(path.join(root,relative),'utf8'));
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const digest=relative=>{const file=path.join(root,relative),s=fs.lstatSync(file);assert.ok(s.isFile()&&!s.isSymbolicLink());return{path:relative,bytes:s.size,mode:s.mode&0o777,sha256:sha(fs.readFileSync(file))};};
const [l1,l2,b1,b2,b3,sf,visual,builder]=['learner-v1/result.json','learner-v2/result.json','browser-v1/result.json','browser-v2/result.json','browser-v3-loopback/result.json','source-freeze-v2.json','visual-receiving.json','builder-receiving.json'].map(read);
assert.equal(l1.status,'passed');assert.equal(l1.checks.length,10);
assert.equal(l2.status,'passed');assert.equal(l2.checks.length,10);
assert.equal(b1.status,'failed');assert.match(b1.error,/isolated Chromium startup/);assert.equal(b1.frames.length,0);
assert.equal(b2.status,'failed');assert.equal(b2.checks.length,12);assert.match(b2.error,/82 \/ 110/);
assert.equal(b3.status,'passed');assert.equal(b3.checks.length,7);
assert.equal(builder.status,0);assert.equal(visual.product_defects_found.length,0);
const before=read('final-author-source-readback.json');
assert.equal(before.files.length,12);assert.ok(before.files.every(x=>x.unchanged));
const source=sf.files.map(f=>{
const copy=digest('source-v2/'+f.path);
const authored=fs.readFileSync(path.join(sf.author_worktree,f.path));
assert.equal(copy.sha256,f.sha256);assert.equal(sha(authored),f.sha256);
return{path:f.path,bytes:copy.bytes,sha256:f.sha256,copy_unchanged:true,author_unchanged:true};
});
assert.equal(source.length,12);
for(const b of [b2,b3])assert.ok(b.source_readback.every(x=>x.unchanged));
const downloads=[];
for(const [stage,b]of[['browser-v2',b2],['browser-v3-loopback',b3]]){
for(const d of b.downloads){
const original=digest(stage+'/downloads/'+d.guid);
const named=digest(stage+'/'+d.name);
assert.equal(original.sha256,d.sha256);assert.equal(named.sha256,d.sha256);
assert.equal(original.bytes,d.bytes);assert.equal(named.bytes,d.bytes);
downloads.push({stage,...d,original,named});
}
}
assert.equal(downloads.length,14);
const courses=downloads.filter(x=>x.name.endsWith('course.json'));
assert.equal(courses.length,3);
assert.ok(courses.every(x=>x.sha256==='8ea687ed9157c0a81f155d2f96bc381ebe3024c0c582cf177c0814656460d20d'));
const comparisons=downloads.filter(x=>x.name.endsWith('reversal-50.json'));
assert.equal(comparisons.length,3);
assert.ok(comparisons.every(x=>x.sha256==='9ba23eb441375e3466f075a9455e0d181f8b573d56a18c8efdaa70f98d2f9bd5'));
for(const capture of visual.captures)assert.equal(digest(capture.path).sha256,capture.sha256);
assert.equal(b2.fileStorage.calls.length,0);assert.equal(b3.loopbackStorage.calls.length,0);
assert.equal(b2.observations.pageErrors.length,0);assert.equal(b3.observations.pageErrors.length,0);
assert.equal(b2.observations.blockedRequests.length,0);assert.equal(b3.observations.blockedRequests.length,0);
assert.ok(b2.cleanup.profile_removed);assert.ok(b3.cleanup.profile_removed);
const report={
schema:'hamon.independent-product-receiving/1',
recorded_at:new Date().toISOString(),
reviewer:'chatgpt:58d79b68c9e4:product_work',
repository:'Jacob-Met/RecallWeave',
issue:27,
claim:{key:'claim:recallweave-grouped-data-product-receiving-58d79b68c9e4',seq:4044,event_id:'cev_1d2606290a4a40758562b2ca'},
verdict:'qualified_frozen_native_learner_modules_and_chromium_file_loopback_workflows',
product_defects_found:[],
source_parent:sf.source_parent,
source,
author_source_mutations:[],
specification:digest('RECEIVER-SPEC.md'),
independence:{author_tests_used_as_oracle:false,transport_pattern:'Existing zero-dependency project CDP helper; independent assertions and primary fixture',peer_two_exact_fraction_oracles:read('peer-oracle-receipt.json')},
stages:[
{name:'learner_v1',status:'historical_pass',controls_passed:l1.checks.length,artifact:digest('learner-v1/result.json')},
{name:'course_revision',status:'qualified_exact_identity_and_declared_transfer_clarification',artifact:digest('course-revision-receiving.json')},
{name:'learner_v2',status:'passed',controls_passed:l2.checks.length,checks:l2.checks,artifact:digest('learner-v2/result.json'),exports:l2.downloads},
{name:'builder',status:'passed_read_only_check',artifact:digest('builder-receiving.json')},
{name:'browser_v1',status:'preserved_harness_startup_failure_before_page_load',page_frames:0,artifact:digest('browser-v1/result.json')},
{name:'browser_v2',status:'twelve_completed_checkpoints_then_preserved_reduced_fraction_oracle_failure',controls_passed:b2.checks.length,checks:b2.checks,artifact:digest('browser-v2/result.json')},
{name:'browser_v3_loopback',status:'passed_bounded_continuation',controls_passed:b3.checks.length,checks:b3.checks,artifact:digest('browser-v3-loopback/result.json')},
{name:'visual_receiving',status:visual.status,artifact:digest('visual-receiving.json')}
],
browser:b3.browser,
node:l2.node,
downloads,
captures:visual.captures,
observations:{
file_page_http_requests:0,
file_storage_calls:b2.fileStorage.calls,
loopback_storage_calls:b3.loopbackStorage.calls,
loopback_requests:b3.loopbackRequests,
implicit_browser_favicon:b3.implicitBrowserFavicon,
external_page_request_attempts:[],
page_exceptions:[],
native_browser_stderr:'Preserved nonempty DBus and GCM messages; zero whole-browser network activity is not claimed',
cleanup:[b2.cleanup,b3.cleanup]
},
receivers:['receive-learner.mjs','receive-learner-v2.mjs','receive-browser.mjs','receive-browser-v2.mjs','receive-browser-loopback.mjs','browser-transport.mjs','browser-transport-v2.mjs'].map(digest),
limits:[
'Native module receiving is not full learner importer/app or browser notes-download acceptance.',
'Only exact file bytes and the pinned canonical parent composition were reviewed; source publication/current-tree integration is separate.',
'Two historical harness failures remain failed, with no product-source repair or retroactive reclassification of the combined run.',
'The final browser continuation does not repeat settled file-route checks.',
'Page no-network/storage observations do not establish zero network activity for the entire Chromium process.',
'No Safari, Firefox, physical phone, assistive-technology audit, public hosting, production learner data or learning-efficacy acceptance.',
'Author source and all other owners remain unchanged; only this independent receiving claim may be closed.'
]
};
fs.writeFileSync(path.join(root,'review-result.json'),JSON.stringify(report,null,2)+'\n');
const excludedNames=new Set(['manifest.json','conscience-receipt.json','completed-qa-cache-inventory.json']);
const files=[],excluded=[];
function walk(directory,relative=''){
for(const name of fs.readdirSync(directory).sort()){
const rel=relative?relative+'/'+name:name,full=path.join(directory,name),st=fs.lstatSync(full);
assert.ok(!st.isSymbolicLink(),'No symlink traversal: '+rel);
if(st.isDirectory()){
if(name.startsWith('profile-')){excluded.push({path:rel,reason:'Owned ephemeral browser profile; initial directory retained empty after a startup failure'});assert.equal(fs.readdirSync(full).length,0);continue;}
walk(full,rel);
}else if(excludedNames.has(rel)){excluded.push({path:rel,reason:rel==='completed-qa-cache-inventory.json'?'Unrelated read-only completed-workspace cache inventory; preserved outside product packet':'Manifest self-reference or later native receipt'});}
else files.push(digest(rel));
}
}
walk(root);
const manifest={schema:'hamon.file-manifest/1',recorded_at:new Date().toISOString(),root,description:'Exact independent RecallWeave grouped-data native learner and browser receiving packet. No symlinks or ephemeral browser profile contents.',files,excluded,not_yet_in_manifest:['manifest.json','conscience-receipt.json'],file_count:files.length,total_bytes:files.reduce((sum,f)=>sum+f.bytes,0)};
fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
for(const expected of files)assert.deepEqual(digest(expected.path),expected);
console.log(JSON.stringify({status:'sealed',manifest:digest('manifest.json'),readme:digest('README.md'),result:digest('review-result.json'),file_count:files.length,total_bytes:manifest.total_bytes,source_unchanged:source.length,actual_downloads:downloads.length,captures:visual.captures,excluded},null,2));
