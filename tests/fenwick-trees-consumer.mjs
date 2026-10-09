// Receives the explorer's actual downloaded lesson in the unchanged canonical learner.
import assert from "node:assert/strict";
import fs from "node:fs";
import {readFile,writeFile,mkdir} from "node:fs/promises";
import path from "node:path";
import {pathToFileURL} from "node:url";
import {withBrowser,sha,until} from "./fenwick-trees-browser-helpers.mjs";

const args=Object.fromEntries(process.argv.slice(2).map((value,index,all)=>index%2===0?[value,all[index+1]]:null).filter(Boolean));
for(const key of ["--demo","--downloaded-course","--source-course","--output","--profile-parent"])assert.ok(args[key],"Missing "+key);
const courseBytes=await readFile(args["--downloaded-course"]),sourceCourse=await readFile(args["--source-course"]),demoBytes=await readFile(args["--demo"]);
assert.ok(courseBytes.equals(sourceCourse),"Consumer must receive exact original bytes from actual explorer download");
const deck=JSON.parse(courseBytes);assert.equal(deck.items.length,14);
const byPrompt=new Map(deck.items.map(item=>[item.prompt,item]));
assert.equal(byPrompt.size,14);
await mkdir(args["--output"],{recursive:true});
const pins={demo:sha(demoBytes),downloaded_course:sha(courseBytes),source_course:sha(sourceCourse)};
const report=await withBrowser({output:args["--output"],profileParent:args["--profile-parent"],executable:args["--browser-executable"]??"/snap/bin/chromium"},async api=>{
 const{report,command,evaluate,click,type,viewport,navigate,screenshot,check,downloads}=api;
 report.canonicalConsumerCommit="698902f9c9c1d5c5023092b85b3632a7cb7a01ed";
 report.sourceBefore=pins;report.answers=[];report.images=[];report.savedDownloads=[];
 const upload=async()=>{
  const{root}=await command("DOM.getDocument",{depth:0});
  const{nodeId}=await command("DOM.querySelector",{nodeId:root.nodeId,selector:"#deck-file"});
  assert.ok(nodeId);
  await command("DOM.setFileInputFiles",{nodeId,files:[path.resolve(args["--downloaded-course"])]});
  await until(()=>evaluate('!!document.querySelector("#start-deck")'),"actual course preview");
 };
 let priorSession,priorProgress,firstMastery,firstSummary;
 await check("create a real prior learner answer before local import",async()=>{
  await viewport(1360,1000);await navigate(pathToFileURL(path.resolve(args["--demo"])).href);
  await until(()=>evaluate('!!document.querySelector("#start-button")'),"canonical learner ready");
  await click("#start-button");await click('[data-choice="0"]');
  assert.ok(await evaluate('!!document.querySelector("#next-button")'));
  priorSession=await evaluate('document.querySelector("#session-content").innerHTML');
  priorProgress=await evaluate('document.querySelector("#step-count").textContent');
  assert.match(priorProgress,/1 \/ /);
 });
 await check("preview and cancellation preserve the actual prior session",async()=>{
  await upload();
  assert.equal(await evaluate('document.querySelector("#deck-preview-title").textContent'),deck.title);
  assert.equal(await evaluate('document.querySelector("#deck-preview ol").children.length'),14);
  assert.equal(await evaluate('document.querySelector("#session-content").innerHTML'),priorSession);
  await click("#cancel-deck");
  assert.equal(await evaluate('document.querySelector("#session-content").innerHTML'),priorSession);
  assert.equal(await evaluate('document.querySelector("#step-count").textContent'),priorProgress);
 });
 await check("explicit Start activates the downloaded fourteen-item course",async()=>{
  await upload();await click("#start-deck");
  assert.equal(await evaluate('document.querySelector("#lesson-description").textContent'),deck.title);
  assert.match(await evaluate('document.querySelector("#step-count").textContent'),/^0 \/ 14$/);
  assert.ok(byPrompt.has(await evaluate('document.querySelector("#session-content h2").textContent')));
 });
 await check("all fourteen actual answers retain canonical choice identity through shuffled display and feedback",async()=>{
  const seen=new Set();
  for(let index=0;index<14;index++){
   const prompt=await evaluate('document.querySelector("#session-content h2").textContent'),item=byPrompt.get(prompt);
   assert.ok(item,"Unexpected authored prompt");assert.ok(!seen.has(item.id),"Repeated authored prompt");seen.add(item.id);
   const choices=await evaluate('[...document.querySelectorAll("[data-choice]")].map(n=>({choice:Number(n.dataset.choice),text:n.textContent.slice(1),disabled:n.disabled}))');
   assert.deepEqual(choices.map(x=>x.choice).sort((a,b)=>a-b),[0,1,2,3]);
   choices.forEach(choice=>{assert.equal(choice.text,item.options[choice.choice]);assert.equal(choice.disabled,false);});
   const choice=item.id==="f1"?(item.answer+1)%4:item.answer;
   await click('[data-choice="'+choice+'"]');
   const feedback=await evaluate('document.querySelector("#feedback-slot").textContent');
   assert.ok(feedback.includes("Your answer: "+item.options[choice]));
   assert.ok(feedback.includes("Correct answer: "+item.options[item.answer]));
   assert.ok(feedback.includes(item.explanation));assert.ok(feedback.includes(item.transfer));
   const after=await evaluate('[...document.querySelectorAll("[data-choice]")].map(n=>({choice:Number(n.dataset.choice),disabled:n.disabled}))');
   assert.deepEqual(after.map(x=>x.choice),choices.map(x=>x.choice));
   assert.ok(after.every(x=>x.disabled));
   report.answers.push({id:item.id,choice,answer:item.answer,correct:choice===item.answer,display_order:choices.map(x=>x.choice),prompt});
   await click("#next-button");
  }
  assert.equal(seen.size,14);assert.equal(report.answers.filter(x=>x.correct).length,13);
  firstSummary=await evaluate('document.querySelector("#first-try-summary").textContent');
  assert.match(firstSummary,/13 of 14/);
  firstMastery=await evaluate('[...document.querySelectorAll(".mastery-box output")].map(n=>({label:n.getAttribute("aria-label"),text:n.textContent}))');
  report.nonIdentityDisplayOrders=report.answers.filter(x=>x.display_order.some((choice,index)=>choice!==index)).length;
  assert.ok(report.nonIdentityDisplayOrders>0,"Receiving must observe at least one non-identity display order.");
 });
 await check("review shows each canonical first answer and original explanation",async()=>{
  const review=await evaluate('[...document.querySelectorAll(".review-item")].map(n=>({prompt:n.querySelector(".review-prompt").textContent,first:n.querySelectorAll("dd")[0].textContent,correct:n.querySelectorAll("dd")[1].textContent,body:n.querySelector(".review-body").textContent}))');
  assert.equal(review.length,14);
  for(const entry of review){
   const item=byPrompt.get(entry.prompt),answer=report.answers.find(x=>x.id===item.id);
   assert.equal(entry.first,item.options[answer.choice]);assert.equal(entry.correct,item.options[item.answer]);
   assert.ok(entry.body.includes(item.explanation));assert.ok(entry.body.includes(item.transfer));
  }
 });
 await check("separate correct practice preserves original score and model estimates",async()=>{
  await click("#practice-button");
  const item=byPrompt.get(await evaluate('document.querySelector("#session-content h2").textContent'));assert.equal(item.id,"f1");
  const order=await evaluate('[...document.querySelectorAll("[data-practice-choice]")].map(n=>Number(n.dataset.practiceChoice))');
  assert.deepEqual(order,report.answers.find(x=>x.id==="f1").display_order);
  await click('[data-practice-choice="'+item.answer+'"]');
  assert.match(await evaluate('document.querySelector("#practice-feedback").textContent'),/holds on retry/);
  await click("#practice-next");
  assert.equal(await evaluate('document.querySelector("#first-try-summary").textContent'),firstSummary);
  assert.deepEqual(await evaluate('[...document.querySelectorAll(".mastery-box output")].map(n=>({label:n.getAttribute("aria-label"),text:n.textContent}))'),firstMastery);
  assert.match(await evaluate('document.querySelector("#practice-status").textContent'),/1 of 1 correctly on retry/);
 });
 await check("actual reflection edits survive in notes with all original content",async()=>{
  const index=report.answers.findIndex(x=>x.id==="f1");
  await click(".review-item:nth-of-type("+(index+1)+") summary");
  await type('[data-reflection-item="f1"]',"I keep the requested endpoint inclusive and sum the signed values.");
  await type("#application-reflection","A query partitions a prefix; an update finds containing blocks.");
  const at=report.downloadEvents.length;await click("#save-notes-button");
  const began=await until(()=>report.downloadEvents.slice(at).find(e=>e.method==="Browser.downloadWillBegin"&&/^recallweave-study-notes-\d{4}-\d{2}-\d{2}\.txt$/.test(e.suggestedFilename)),"actual notes download");
  await until(()=>report.downloadEvents.find(e=>e.method==="Browser.downloadProgress"&&e.guid===began.guid&&e.state==="completed"),"notes completion");
  const bytes=await readFile(path.join(downloads,began.suggestedFilename)),text=bytes.toString("utf8");
  const saved=path.join(args["--output"],"actual-study-notes.txt");await writeFile(saved,bytes,{flag:"wx"});
  report.savedDownloads.push({path:saved,filename:began.suggestedFilename,bytes:bytes.length,sha256:sha(bytes),guid:began.guid});
  assert.ok(text.includes(deck.title));assert.ok(text.includes("13 of 14 connections correct on the first try."));
  assert.ok(text.includes("Complete: 1 of 1 practice answers recorded; 1 correct on retry."));
  for(const item of deck.items){assert.ok(text.includes(item.prompt));assert.ok(text.includes("Correct answer: "+item.options[item.answer]));assert.ok(text.includes(item.explanation));assert.ok(text.includes(item.transfer));}
  const missed=deck.items.find(x=>x.id==="f1"),first=report.answers.find(x=>x.id==="f1");
  assert.ok(text.includes("Your first answer: "+missed.options[first.choice]));
  assert.ok(text.includes("Practice answer: "+missed.options[missed.answer]));
  assert.ok(text.includes("I keep the requested endpoint inclusive and sum the signed values."));
  assert.ok(text.includes("A query partitions a prefix; an update finds containing blocks."));
  assert.ok(text.includes(deck.attribution));assert.ok(text.includes(deck.license));
  fs.unlinkSync(path.join(downloads,began.suggestedFilename));
 });
 await check("390px review remains readable without horizontal document overflow",async()=>{
  await viewport(390,844);
  await evaluate('document.querySelector("#session-content").scrollIntoView({block:"start"})');
  assert.equal(await evaluate("innerWidth"),390);
  assert.equal(await evaluate("document.documentElement.scrollWidth<=innerWidth"),true);
  report.images.push({...await screenshot("01-mobile-learner-review.png"),purpose:"Actual imported course learning trace",viewport:{width:390,height:844}});
 });
 await check("source bytes and original imported file remain exact with no remote requests",async()=>{
  assert.equal(sha(await readFile(args["--demo"])),pins.demo);
  assert.equal(sha(await readFile(args["--downloaded-course"])),pins.downloaded_course);
  assert.equal(sha(await readFile(args["--source-course"])),pins.source_course);
  assert.deepEqual(report.requests.filter(x=>/^https?:/i.test(x.url)),[]);
  assert.deepEqual(report.pageErrors,[]);
 });
});
report.sourceAfter={demo:sha(await readFile(args["--demo"])),downloaded_course:sha(await readFile(args["--downloaded-course"])),source_course:sha(await readFile(args["--source-course"]))};
await writeFile(path.join(args["--output"],"browser-report.json"),JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({status:report.status,checks:report.checks,answers:report.answers?.length,downloads:report.savedDownloads?.length,cleanup:report.cleanup}));
process.exitCode=report.status==="passed"?0:1;
