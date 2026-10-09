// Actual Chromium receiving. Oracle packet was frozen independently before candidate source.
import assert from "node:assert/strict";
import fs from "node:fs";
import {readFile,writeFile,mkdir} from "node:fs/promises";
import path from "node:path";
import {pathToFileURL} from "node:url";
import {withBrowser,sha,until} from "./fenwick-trees-browser-helpers.mjs";

const args=Object.fromEntries(process.argv.slice(2).map((value,index,all)=>index%2===0?[value,all[index+1]]:null).filter(Boolean));
for(const key of ["--html","--course","--output","--profile-parent","--expectations"]) assert.ok(args[key],"Missing "+key);
const expected=JSON.parse(await readFile(args["--expectations"],"utf8"));
assert.equal(expected.schema,"recallweave-fenwick-independent-pre-source-plan/v1");
const course=await readFile(args["--course"]);
const html=await readFile(args["--html"]);
await mkdir(args["--output"],{recursive:true});
const sourceBefore={html:sha(html),course:sha(course)};
const report=await withBrowser({output:args["--output"],profileParent:args["--profile-parent"],executable:args["--browser-executable"]??"/snap/bin/chromium"},async api=>{
 const{evaluate,click,key,type,viewport,navigate,screenshot,check,report,downloads}=api;
 report.independentOracle="71a2d88781ba683b0afcdbb4f0a53db7d37e22e0";
 report.sourceBefore=sourceBefore;report.savedDownloads=[];report.images=[];
 const state=()=>evaluate('(()=>{const rows=[...document.querySelectorAll("#state-body tr")].map(r=>[...r.cells].map(c=>c.textContent));return{values:rows.map(r=>Number(r[1])),tree:rows.map(r=>Number(r[2]))}})()');
 const ready=()=>until(()=>evaluate('!!document.querySelector("#build-trace") && document.querySelector("#status").textContent.startsWith("Ready.")'),"explorer ready");
 const draft=async(initial,operations)=>{
  await type("#initial-values",initial.join(", "));
  const script=operations.map(op=>op.kind==="add"?"add "+op.index+" "+op.delta:op.kind==="prefix"?"prefix "+op.end:"range "+op.start+" "+op.end).join("\n");
  if(script){await type("#operations",script);}else{await click("#operations");await key("a",65,2);await key("Backspace",8);}
  assert.equal(await evaluate('document.querySelector("#operations").value'),script);
 };
 const expectRetired=async()=>assert.deepEqual(await evaluate('({hidden:document.querySelector("#results").hidden,trace:document.querySelector("#download-trace").disabled,prev:document.querySelector("#previous-step").disabled,next:document.querySelector("#next-step").disabled,last:document.querySelector("#last-step").disabled,course:document.querySelector("#download-course").disabled})'),
 {hidden:true,trace:true,prev:true,next:true,last:true,course:false});
 const save=async(selector,name,filename)=>{
  const at=report.downloadEvents.length;await click(selector);
  const began=await until(()=>report.downloadEvents.slice(at).find(e=>e.method==="Browser.downloadWillBegin"&&e.suggestedFilename===filename),"download begin "+filename);
  await until(()=>report.downloadEvents.find(e=>e.method==="Browser.downloadProgress"&&e.guid===began.guid&&e.state==="completed"),"download complete "+filename);
  const bytes=await readFile(path.join(downloads,filename));
  const saved=path.join(args["--output"],name);await writeFile(saved,bytes,{flag:"wx"});
  report.savedDownloads.push({filename,path:saved,bytes:bytes.length,sha256:sha(bytes),guid:began.guid});
  fs.unlinkSync(path.join(downloads,filename));
  return bytes;
 };
 const verifyDownloaded=(data,example)=>{
  assert.equal(data.format,"recallweave-fenwick-trace/1");
  assert.deepEqual(data.input,{initial:example.initial,operations:example.operations});
  assert.deepEqual(data.initial,example.expected.initial);
  assert.equal(data.steps.length,example.operations.length);
  data.steps.forEach((step,index)=>{
   const e=example.expected.steps[index];
   assert.equal(step.sequence,index+1);assert.deepEqual(step.operation,e.operation);
   assert.deepEqual(step.before,e.before);assert.deepEqual(step.after,e.after);assert.equal(step.result,e.result);
   assert.deepEqual(step.operation.kind==="add"?step.visits.map(v=>v.index):step.queries.map(q=>q.visits.map(v=>v.index)),e.visitIndices);
  });
  assert.deepEqual(data.final,example.expected.final);
 };
 await check("direct-file load has no computed result until explicit build",async()=>{
  await viewport(1360,1000);await navigate(pathToFileURL(path.resolve(args["--html"])).href);await ready();await expectRetired();
  assert.equal(await evaluate("location.protocol"),"file:");
 });
 await check("keyboard builds default example and initial table is exact",async()=>{
  await click("#operations");
  for(let i=0;i<4;i++)await key("Tab",9);
  assert.equal(await evaluate("document.activeElement.id"),"build-trace");
  await key("Enter",13);
  assert.deepEqual(await state(),{values:[3,-1,4,0,2,-2,5,1],tree:[3,2,4,6,2,0,5,12]});
  assert.equal(await evaluate('document.querySelector("#results").hidden'),false);
  report.images.push({...await screenshot("01-desktop-initial.png"),purpose:"Desktop input and initial state",viewport:{width:1360,height:1000}});
 });
 for(const example of expected.examples){
  await check("actual controls follow independent "+example.name+" snapshots",async()=>{
   await draft(example.initial,example.operations);await expectRetired();await click("#build-trace");
   assert.deepEqual(await state(),example.expected.initial);
   for(const [index,e]of example.expected.steps.entries()){
    await click("#next-step");
    assert.equal(await evaluate('document.querySelector("#step-position").textContent'),(index+1)+" of "+example.operations.length);
    assert.deepEqual(await state(),e.after);
    const actual=await evaluate('(()=>{const result=document.querySelector("#query-result");return{result:result.hidden?null:Number(result.textContent.replace("Exact query result: ","")),visits:[...document.querySelectorAll("#visits>.visit")].map(n=>Number(n.dataset.index)),queries:[...document.querySelectorAll("#visits>.query")].map(q=>[...q.querySelectorAll("ol>.visit")].map(n=>Number(n.dataset.index)))}})()');
    assert.equal(actual.result,e.result);
    assert.deepEqual(e.operation.kind==="add"?actual.visits:actual.queries,e.visitIndices);
   }
   assert.equal(await evaluate('document.querySelector("#next-step").disabled'),true);
   if(example.operations.length){
    await click("#previous-step");await click("#last-step");assert.deepEqual(await state(),example.expected.final);
   }
   const bytes=await save("#download-trace",example.name+".json","fenwick-trees-trace.json");
   const data=JSON.parse(bytes);verifyDownloaded(data,example);
   assert.equal(bytes.toString("utf8"),JSON.stringify(data,null,2)+"\n");
  });
 }
 await check("export from an earlier view retains complete trace without reapplying updates",async()=>{
  const example=expected.examples[0];await draft(example.initial,example.operations);await click("#build-trace");await click("#next-step");
  const before=await state();
  const data=JSON.parse(await save("#download-trace","earlier-view-complete.json","fenwick-trees-trace.json"));
  verifyDownloaded(data,example);assert.deepEqual(await state(),before);
  await click("#last-step");assert.deepEqual(await state(),example.expected.final);
  await evaluate('document.querySelector("#results").scrollIntoView({block:"start"})');
  report.images.push({...await screenshot("02-desktop-traversal.png"),purpose:"Signed query traversal",viewport:{width:1360,height:1000}});
 });
 await check("actual input immediately retires stale state and navigation",async()=>{
  await type("#operations","prefix 1\nadd 1 2\nrange 3 2");
  await expectRetired();
 });
 await check("invalid later operation publishes no partial state; exact lesson still downloads",async()=>{
  await click("#build-trace");await expectRetired();
  assert.match(await evaluate('document.querySelector("#status").textContent'),/Operation 3/);
  const bytes=await save("#download-course","fenwick-trees.json","fenwick-trees.json");
  assert.ok(bytes.equals(course));
 });
 await check("fractional draft is refused and successful correction recovers",async()=>{
  await type("#initial-values","1.5");await type("#operations","prefix 1");await click("#build-trace");await expectRetired();
  await type("#initial-values","1");await click("#build-trace");await click("#next-step");
  assert.deepEqual(await state(),{values:[1],tree:[1]});
  assert.equal(await evaluate('document.querySelector("#query-result").textContent'),"Exact query result: 1");
 });
 await check("maximum 64 additions publish exact 7920 and complete actual download",async()=>{
  await draft(Array(16).fill(99),Array.from({length:64},()=>({kind:"add",index:1,delta:99})));await click("#build-trace");await click("#last-step");
  const final=await state();assert.equal(final.values[0],6435);assert.equal(final.tree[15],7920);
  assert.equal(await evaluate('document.querySelector("#step-position").textContent'),"64 of 64");
  const data=JSON.parse(await save("#download-trace","maximum-64.json","fenwick-trees-trace.json"));
  assert.equal(data.steps.length,64);assert.equal(data.final.tree[15],7920);
  assert.deepEqual(data.steps[63].visits.map(v=>v.index),[1,2,4,8,16]);
 });
 await check("390px layout and native keyboard navigation preserve exact values",async()=>{
  await viewport(390,844);
  await click("#preset-short");await expectRetired();
  await click("#operations");for(let i=0;i<4;i++)await key("Tab",9);assert.equal(await evaluate("document.activeElement.id"),"build-trace");await key(" ",32);
  assert.deepEqual(await state(),{values:[4,1,-2,3,6],tree:[4,5,-2,6,6]});
  assert.equal(await evaluate("document.documentElement.scrollWidth<=innerWidth"),true);
  assert.equal(await evaluate("innerWidth"),390);
  await evaluate("scrollTo(0,0)");
  report.images.push({...await screenshot("03-mobile-draft.png"),purpose:"390px draft controls",viewport:{width:390,height:844}});
  await click("#next-step");await click("#next-step");
  assert.deepEqual(await state(),{values:[4,1,-2,3,8],tree:[4,5,-2,6,8]});
  await evaluate('document.querySelector("#results").scrollIntoView({block:"start"})');
  assert.equal(await evaluate("document.documentElement.scrollWidth<=innerWidth"),true);
  report.images.push({...await screenshot("04-mobile-update.png"),purpose:"390px exact table and update traversal",viewport:{width:390,height:844}});
 });
 await check("no external page requests, page errors, or changed source bytes",async()=>{
  assert.equal(report.pageErrors.length,0);
  assert.deepEqual(report.requests.filter(r=>/^https?:/i.test(r.url)),[]);
  assert.equal(sha(await readFile(args["--html"])),sourceBefore.html);
  assert.equal(sha(await readFile(args["--course"])),sourceBefore.course);
 });
});
report.sourceAfter={html:sha(await readFile(args["--html"])),course:sha(await readFile(args["--course"]))};
assert.deepEqual(report.sourceBefore??sourceBefore,report.sourceAfter);
await writeFile(path.join(args["--output"],"browser-report.json"),JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({status:report.status,checks:report.checks,downloads:report.savedDownloads?.length,images:report.images,cleanup:report.cleanup}));
process.exitCode=report.status==="passed"?0:1;
