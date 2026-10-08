import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
const ROOT=path.dirname(fileURLToPath(import.meta.url));
const SOURCE=path.resolve(ROOT,"../source");
const OUT=path.join(ROOT,"browser-import");
await fs.mkdir(OUT,{recursive:false});
const capacity=await fs.statfs(ROOT);assert(capacity.bavail*capacity.bsize>=1024**3,"1GiB free-space gate");
const digest=v=>createHash("sha256").update(v).digest("hex");
const gitBlob=v=>createHash("sha1").update(Buffer.from("blob "+v.length+"\0")).update(v).digest("hex");
const sourceFiles=[
["courses/recursion-call-stack.json",path.join(SOURCE,"courses/recursion-call-stack.json"),"45a2eb91788cc7955840913bdb1a92b23cb2b551"],
["demo.html",path.join(ROOT,"consumer-source/demo.html"),"cf7eea3792deacc3eb98a22aef539b920fb66746"],
["author.html",path.join(ROOT,"consumer-source/author.html"),"e2e5a2f2294bea56f863319a75d8cb589966fc53"]];
const inputs=[];
for(const [name,file,expected]of sourceFiles){const bytes=await fs.readFile(file);assert.equal(gitBlob(bytes),expected,name);inputs.push({name,path:file,bytes:bytes.length,sha256:digest(bytes),gitBlob:expected});}
const deck=JSON.parse(await fs.readFile(sourceFiles[0][1],"utf8"));
const report={status:"running",courseCommit:"66a3fbc3ae444a121830b0333eb380e24b374671",consumerCanonical:"e49aee89dc6ecf579f1c9152f32f826bf6f9d8b7",source:inputs,scriptSha256:digest(await fs.readFile(fileURLToPath(import.meta.url))),checks:[],sessions:[],downloads:[],screenshots:[],pageErrors:[],unexpectedRequests:[],capacityBytes:capacity.bavail*capacity.bsize,node:process.version};
async function save(){const handle=await fs.open(path.join(OUT,"receipt.json"),"w");try{await handle.writeFile(JSON.stringify(report,null,2)+"\n");await handle.sync();}finally{await handle.close();}}
async function passed(name){report.checks.push(name);await save();console.log("PASS "+name);}
async function shot(page,name){const file=path.join(OUT,name);await page.screenshot({path:file,fullPage:false});const bytes=await fs.readFile(file);report.screenshots.push({name,bytes:bytes.length,sha256:digest(bytes)});}
async function download(page,selector,name){const promise=page.waitForEvent("download");await page.locator(selector).click();const download=await promise;const target=path.join(OUT,name);await download.saveAs(target);assert.equal(await download.failure(),null);const bytes=await fs.readFile(target);report.downloads.push({name,suggestedFilename:download.suggestedFilename(),bytes:bytes.length,sha256:digest(bytes)});return bytes;}
let browser;
const contexts=[];
try{
await fs.mkdir(path.join(OUT,"temp"));process.env.TMPDIR=path.join(OUT,"temp");
const {chromium}=await import("/Users/me/suite-projects-066deeadcc8b/source/packages/suite-shell/node_modules/playwright/index.mjs");
browser=await chromium.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:true,args:["--disable-background-networking","--disable-component-update","--disable-sync","--no-first-run","--no-default-browser-check"]});
report.browser=browser.version();
async function makePage(viewport){const context=await browser.newContext({viewport,acceptDownloads:true});contexts.push(context);await context.route(/^https?:\/\//,route=>{report.unexpectedRequests.push(route.request().url());return route.abort();});const page=await context.newPage();page.setDefaultTimeout(8000);page.on("pageerror",error=>report.pageErrors.push(String(error)));return page;}
const page=await makePage({width:1280,height:1000});
await page.goto(pathToFileURL(sourceFiles[1][1]).href);
await page.locator("#start-button").waitFor();
const before=await page.locator("#session-content").textContent();
await page.locator("#deck-file").setInputFiles(sourceFiles[0][1]);
await page.locator("#start-deck").waitFor();
assert.equal(await page.locator("#deck-preview-title").textContent(),deck.title);
assert.equal(await page.locator("#deck-preview ol li").count(),12);
assert.match(await page.locator(".deck-preview-count").textContent(),/12 questions · 4 concepts/);
assert.equal(await page.locator("#session-content").textContent(),before);
await shot(page,"preview-desktop.png");
await page.locator("#cancel-deck").click();
assert.equal(await page.locator("#session-content").textContent(),before);
await passed("actual local-file preview shows all12 questions and cancel preserves the original lesson");
await page.locator("#deck-file").setInputFiles(sourceFiles[0][1]);await page.locator("#start-deck").click();
const responses=[];
for(let index=0;index<12;index++){
const prompt=await page.locator(".question-card h2").textContent();const item=deck.items.find(row=>row.prompt===prompt);assert(item,"imported prompt");assert(!responses.some(row=>row.id===item.id),"no repeated first-session item");
const choices=await page.locator("[data-choice]").evaluateAll(nodes=>nodes.map(node=>({choice:Number(node.dataset.choice),text:node.textContent.slice(node.querySelector(".choice-key").textContent.length)})));
assert.deepEqual(choices.map(row=>row.choice).sort(),[0,1,2,3]);
for(const choice of choices)assert.equal(choice.text,item.options[choice.choice]);
const correct=index%3!==0,choice=correct?item.answer:(item.answer+1)%4;
await page.locator('[data-choice="'+choice+'"]').click();
const feedback=await page.locator(".feedback").textContent();assert(feedback.includes(item.explanation));assert(feedback.includes(item.transfer));
responses.push({id:item.id,choice,answer:item.answer,correct,displayedOrder:choices.map(row=>row.choice)});
if(index===0)await shot(page,"question-feedback-desktop.png");
await page.locator("#next-button").click();
}
assert.equal(await page.locator(".review-item").count(),12);
assert.match(await page.locator("#first-try-summary").textContent(),/8 of 12/);
const estimates=await page.locator(".mastery-box output").allTextContents();
const session={viewport:{width:1280,height:1000},responses,firstSummary:await page.locator("#first-try-summary").textContent(),firstEstimates:estimates};
report.sessions.push(session);
await passed("all12 actual DOM answers preserve canonical options, explanations and transfer text through a mixed8/12 session");
await page.locator(".review-item summary").first().click();
const reflection="The parent keeps 3 times the child result while a deeper frame runs.";
await page.locator("[data-reflection-item]").first().fill(reflection);
await page.locator("#application-reflection").fill("Calls count history; depth counts the live path.");
await page.locator("#practice-button").click();
for(const missed of responses.filter(row=>!row.correct)){
const item=deck.items.find(row=>row.id===missed.id);assert.equal(await page.locator(".practice-card h2").textContent(),item.prompt);await page.locator('[data-practice-choice="'+item.answer+'"]').click();await page.locator("#practice-next").click();}
assert.deepEqual(await page.locator(".mastery-box output").allTextContents(),estimates);
assert.equal(await page.locator(".review-practice-answer").count(),4);
assert.equal(await page.locator(".review-item").count(),12);
assert.match(await page.locator("#first-try-summary").textContent(),/8 of 12/);
const notes=(await download(page,"#save-notes-button","study-notes.txt")).toString("utf8");
for(const item of deck.items)for(const value of [item.prompt,item.options[item.answer],item.explanation,item.transfer])assert(notes.includes(value),item.id+" text missing from actual download");
assert(notes.includes(reflection));assert(notes.includes("Calls count history; depth counts the live path."));assert(notes.includes(deck.attribution));assert(notes.includes(deck.license));assert(notes.includes("MODEL STATE, NOT A GRADE"));
await shot(page,"review-desktop.png");
await passed("four actual practice corrections preserve first answers/model estimates and real downloaded notes retain every question and transfer");
const phone=await makePage({width:390,height:844});await phone.goto(pathToFileURL(sourceFiles[1][1]).href);await phone.locator("#deck-file").setInputFiles(sourceFiles[0][1]);await phone.locator("#start-deck").click();
const phonePrompt=await phone.locator(".question-card h2").textContent(),phoneItem=deck.items.find(row=>row.prompt===phonePrompt);assert(phoneItem);await phone.locator('[data-choice="'+phoneItem.answer+'"]').click();
const phoneSize=await phone.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));assert(phoneSize.scrollWidth<=phoneSize.width,"phone horizontal overflow");
await phone.locator(".question-card").scrollIntoViewIfNeeded();await shot(phone,"question-phone.png");report.sessions.push({viewport:{width:390,height:844},firstItem:phoneItem.id,dimensions:phoneSize});
const priorPhone=await phone.locator("#session-content").textContent();
await phone.locator("#deck-file").setInputFiles({name:"wrong-trace-format.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify({format:"recallweave-recursion-trace/1",events:[]}))});
await phone.waitForFunction(()=>document.querySelector("#deck-status").textContent.includes("unchanged"));assert.equal(await phone.locator("#session-content").textContent(),priorPhone);
await passed("phone390px import is contained and refused recursion-trace JSON preserves the active imported question");
const author=await makePage({width:1280,height:1000});await author.goto(pathToFileURL(sourceFiles[2][1]).href);await author.locator("#open-deck").setInputFiles(sourceFiles[0][1]);await author.locator("#replace-draft").waitFor();assert.match(await author.locator("#open-preview-summary").textContent(),/12 questions · 4 concepts/);await author.locator("#replace-draft").click();assert.equal(await author.locator("#deck-title").inputValue(),deck.title);assert.equal(await author.locator("#question-picker option").count(),12);await author.locator("#check-draft").click();await author.waitForFunction(()=>!document.querySelector("#download-deck").disabled);assert.match(await author.locator("#download-help").textContent(),/12 questions, 4 concepts/);
const checked=JSON.parse((await download(author,"#download-deck","checked-course.json")).toString("utf8"));assert.deepEqual(checked,deck);
await shot(author,"author-checked-desktop.png");
await passed("actual Deck Studio file preview, replacement, check and real checked-deck download preserve the complete course exactly");
assert.deepEqual(report.pageErrors,[]);assert.deepEqual(report.unexpectedRequests,[]);
for(const input of inputs){const bytes=await fs.readFile(input.path);assert.equal(digest(bytes),input.sha256);}
report.status="pass";
}catch(error){report.status="fail";report.error={name:error.name,message:error.message,stack:error.stack};process.exitCode=1;console.error(error);}
finally{for(const context of contexts)await context.close().catch(()=>{});if(browser)await browser.close();report.browserClosed=true;await save();console.log(JSON.stringify({status:report.status,checks:report.checks.length,receipt:path.join(OUT,"receipt.json"),error:report.error?.message}));}
