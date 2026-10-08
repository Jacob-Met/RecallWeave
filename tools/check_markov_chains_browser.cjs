#!/usr/bin/env node
// Optional receiving with an already-installed Playwright and Chromium; no app dependencies.
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const http = require("node:http");
const { createHash } = require("node:crypto");
const { execFileSync } = require("node:child_process");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const output = path.resolve(process.argv[2] || path.join(root, "markov-browser-check"));
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const coursePath = path.join(root,"courses/markov-chains.json");
const browserPath = process.env.BROWSER_BIN;
if (!browserPath) throw new Error("Set BROWSER_BIN to an already-installed Chromium or Chrome executable.");
const report = {schema:"recallweave.markov-browser-receiving/1",status:"running",at:new Date().toISOString(),root,browserPath,
  checks:[],downloads:[],screenshots:[],errors:[],externalRequests:[],sources:{}};
let context, server;
const pass = name => {report.checks.push(name); console.log("PASS "+name);};
const activate = async (page, selector) => {await page.locator(selector).focus(); await page.keyboard.press("Enter");};
const masses = page => page.locator(".stat b").allTextContents();
const expectedMasses = values => values.map(value=>(value*100).toFixed(4)+"%");
const stepTo = async (page, step) => {
  await page.locator("#step-slider").focus();
  await page.keyboard.press("Home");
  for(let n=0;n<step;n++) await page.keyboard.press("ArrowRight");
  assert.equal(await page.locator("#step-number").textContent(),String(step));
};
const fillConfiguration = async (page, configuration) => {
  for(let i=0;i<3;i++) for(let j=0;j<3;j++) await page.locator("#matrix-"+i+"-"+j).fill(String(configuration.matrix[i][j]));
  for(let i=0;i<3;i++) await page.locator("#initial-"+i).fill(String(configuration.initial[i]));
  await activate(page,".apply");
};
async function download(page,selector,name) {
  const waiting=page.waitForEvent("download");
  await activate(page,selector);
  const item=await waiting;
  const failure=await item.failure();
  assert.equal(failure,null,item.suggestedFilename()+": "+failure);
  const nativePath=await item.path(), bytes=await fs.readFile(nativePath);
  const saved=path.join(output,name);
  await item.saveAs(saved);
  assert.deepEqual(await fs.readFile(saved),bytes);
  report.downloads.push({name,suggestedFilename:item.suggestedFilename(),bytes:bytes.length,sha256:hash(bytes),failure});
  return {bytes,path:saved};
}
async function screenshot(page,name,selector) {
  if(selector) await page.locator(selector).evaluate(element=>element.scrollIntoView({block:"start"}));
  await page.screenshot({path:path.join(output,name),fullPage:false});
  report.screenshots.push(name);
}
async function noStorage(page,label) {
  const state=await page.evaluate(async()=>{
    const result={writes:window.__markovStorageCalls||[],local:localStorage.length,session:sessionStorage.length};
    if(indexedDB.databases) result.databases=(await indexedDB.databases()).length;
    return result;
  });
  assert.deepEqual(state.writes,[]);
  assert.equal(state.local,0);assert.equal(state.session,0);
  if("databases" in state) assert.equal(state.databases,0);
  pass(label+": no observed browser persistence");
}
(async()=>{
  await fs.mkdir(output,{recursive:false});
  await fs.mkdir(path.join(output,"downloads"));
  const courseBytes=await fs.readFile(coursePath), deck=JSON.parse(courseBytes);
  const {computeTrace}=await import(pathToFileURL(path.join(root,"courses/markov-chains-core.mjs")));
  const {initialMastery,updateMastery}=await import(pathToFileURL(path.join(root,"src/knowledge.mjs")));
  const sourcePaths=["courses/markov-chains.json","courses/markov-chains-core.mjs","courses/markov-chains-explorer-ui.mjs",
    "courses/markov-chains-explorer.template.html","courses/markov-chains-explorer.html","courses/markov-chains.md",
    "tools/build-markov-chains.mjs","tools/check_markov_chains_browser.cjs","tests/markov-chains.test.mjs",
    "demo.html","index.html","styles.css","data/deck.json",...(await fs.readdir(path.join(root,"src"))).filter(n=>n.endsWith(".mjs")).map(n=>"src/"+n)];
  for(const source of sourcePaths) {
    const bytes=await fs.readFile(path.join(root,source));
    report.sources[source]={bytes:bytes.length,sha256:hash(bytes)};
  }
  report.sourceHead=execFileSync("git",["rev-parse","HEAD"],{cwd:root,encoding:"utf8"}).trim();
  report.sourceTree=execFileSync("git",["rev-parse","HEAD^{tree}"],{cwd:root,encoding:"utf8"}).trim();
  report.sourceStatus=execFileSync("git",["status","--porcelain"],{cwd:root,encoding:"utf8"});
  server=http.createServer(async(request,response)=>{
    try {
      const pathname=decodeURIComponent(new URL(request.url,"http://localhost").pathname);
      const file=path.resolve(root,"."+pathname);
      if(!file.startsWith(root+path.sep)){response.writeHead(403).end();return;}
      const bytes=await fs.readFile(file);
      const mime={".html":"text/html",".mjs":"text/javascript",".css":"text/css",".json":"application/json"}[path.extname(file)]||"application/octet-stream";
      response.writeHead(200,{"Content-Type":mime+"; charset=utf-8"});response.end(bytes);
    } catch {response.writeHead(404).end();}
  });
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  const base="http://127.0.0.1:"+server.address().port;
  try {
    context=await chromium.launchPersistentContext(path.join(output,"profile"),{
      executablePath:browserPath,headless:true,acceptDownloads:true,downloadsPath:path.join(output,"downloads"),
      viewport:{width:1280,height:1000},
      args:["--disable-background-networking","--disable-component-update","--disable-sync","--no-first-run","--no-default-browser-check"]
    });
    report.browser=await context.browser().version();
    await context.addInitScript(()=>{
      window.__markovStorageCalls=[];
      for(const method of ["setItem","removeItem","clear"]) {
        const original=Storage.prototype[method];
        Storage.prototype[method]=function(...args){window.__markovStorageCalls.push(method);return original.apply(this,args);};
      }
    });
    await context.route("**/*",route=>{
      const url=route.request().url();
      if(!url.startsWith(base+"/")&&!url.startsWith("file:")&&!url.startsWith("data:")&&!url.startsWith("blob:")) {
        report.externalRequests.push(url);return route.abort();
      }
      return route.continue();
    });
    const page=await context.newPage();
    page.on("pageerror",error=>report.errors.push(error.message));
    // Also receive a copy with no sibling assets: the HTML itself must be complete.
    const isolated=path.join(output,"single-file");
    await fs.mkdir(isolated);
    const isolatedPage=path.join(isolated,"markov-chains-explorer.html");
    await fs.copyFile(path.join(root,"courses/markov-chains-explorer.html"),isolatedPage);
    for(const [mode,url,learnerURL] of [
      ["standalone",pathToFileURL(isolatedPage).href,pathToFileURL(path.join(root,"demo.html")).href],
      ["served",base+"/courses/markov-chains-explorer.html",base+"/index.html"]
    ]) {
      await page.setViewportSize({width:1280,height:1000});
      const pageRequests=[];
      const requestListener=request=>pageRequests.push(request.url());
      page.on("request",requestListener);
      await page.goto(url);
      await page.locator("#chart svg").waitFor();
      assert.deepEqual(await masses(page),["100.0000%","0.0000%","0.0000%"]);
      assert.equal(await page.locator("#distribution-body tr").count(),31);
      assert.equal(await page.locator("#chart polyline").count(),3);
      assert.equal(await page.locator("#previous-step").isDisabled(),true);
      assert.equal(await page.locator("#flow-table").isHidden(),true);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      await page.keyboard.press("Tab");
      await stepTo(page,2);
      assert.deepEqual(await masses(page),["52.0000%","24.0000%","24.0000%"]);
      assert.deepEqual(await page.locator("#flow-body tr").allTextContents(),[
        "From A36.0000%12.0000%12.0000%","From B8.0000%10.0000%2.0000%","From C8.0000%2.0000%10.0000%"]);
      assert.match(await page.locator("#chart-desc").textContent(),/Current step 2/);
      assert.match(await page.locator("#step-announcement").textContent(),/A 52\.0000%/);
      pass(mode+": keyboard trace and incoming contributions agree with the worked calculation");
      if(mode==="standalone") await screenshot(page,"explorer-desktop.png");

      await page.locator("#matrix-0-0").fill("61");
      await activate(page,".apply");
      assert.match(await page.locator("#draft-error").textContent(),/101%/);
      assert.equal(await page.locator("#step-number").textContent(),"2");
      assert.deepEqual(await masses(page),["52.0000%","24.0000%","24.0000%"]);
      const kept=JSON.parse((await download(page,"#download-observation",mode+"-kept-applied.json")).bytes.toString("utf8"));
      assert.deepEqual(kept.transitionPercent,[[60,20,20],[40,50,10],[40,10,50]]);
      assert.equal(kept.selectedStep,2);assert.equal(kept.trace.length,31);
      for(const invalid of ["","1e2","1.5"]) {
        await page.locator("#matrix-0-0").fill(invalid);await activate(page,".apply");
        assert.match(await page.locator("#draft-error").textContent(),/whole percentage/);
        assert.equal(await page.locator("#step-number").textContent(),"2");
      }
      await page.locator("#matrix-0-0").fill("60");await activate(page,".apply");
      assert.equal(await page.locator("#step-number").textContent(),"0");
      pass(mode+": invalid drafts preserve applied inputs, selected step and actual downloaded observation");

      const custom={matrix:[[17,28,55],[0,99,1],[63,0,37]],initial:[19,23,58]};
      await fillConfiguration(page,custom);await stepTo(page,17);
      assert.equal(await page.locator("#applied-name").textContent(),"Custom system");
      assert.match(await page.locator("#system-note").textContent(),/finite plot does not establish/);
      assert.deepEqual(await masses(page),expectedMasses(computeTrace(custom).trace[17].probabilities));
      if(mode==="standalone") {
        const observation=JSON.parse((await download(page,"#download-observation","custom-step17.json")).bytes.toString("utf8"));
        assert.deepEqual(observation.transitionPercent,custom.matrix);assert.deepEqual(observation.initialPercent,custom.initial);
        assert.equal(observation.selectedStep,17);assert.deepEqual(observation.trace,computeTrace(custom).trace);
      }
      pass(mode+": a custom integer system renders and exports its full-precision applied trace");

      await page.locator("#preset").selectOption("alternating");await stepTo(page,1);
      assert.deepEqual(await masses(page),["0.0000%","50.0000%","50.0000%"]);
      await activate(page,"#next-step");
      assert.deepEqual(await masses(page),["100.0000%","0.0000%","0.0000%"]);
      await activate(page,"#stationary-start");await stepTo(page,30);
      assert.deepEqual(await masses(page),["50.0000%","25.0000%","25.0000%"]);
      assert.equal(await page.locator("#next-step").isDisabled(),true);
      assert.match(await page.locator("#system-note").textContent(),/every individual state changes/);
      pass(mode+": period-two alternation and a stationary distribution remain distinct in the UI");

      await page.locator("#preset").selectOption("absorbing");await stepTo(page,2);
      assert.deepEqual(await masses(page),["12.5000%","50.0000%","37.5000%"]);
      assert.match(await page.locator("#absorbing-note").textContent(),/states in the applied matrix: A\./);
      await page.locator("#preset").selectOption("closed");await stepTo(page,1);
      assert.deepEqual(await masses(page),["40.0000%","60.0000%","0.0000%"]);
      await activate(page,"#all-a-start");await stepTo(page,1);
      assert.deepEqual(await masses(page),["100.0000%","0.0000%","0.0000%"]);
      await fillConfiguration(page,{matrix:[[100,0,0],[0,100,0],[40,60,0]],initial:[20,30,50]});await stepTo(page,1);
      assert.deepEqual(await masses(page),["40.0000%","60.0000%","0.0000%"]);
      pass(mode+": absorbing and separately closed states retain their initial-distribution behavior");

      await page.setViewportSize({width:390,height:844});
      await page.locator("#preset").selectOption("mixing");await stepTo(page,2);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      const box=await page.locator("#chart svg").boundingBox();assert.ok(box.width<=390&&box.width>250);
      await page.locator("details").first().locator("summary").focus();await page.keyboard.press("Enter");
      assert.equal(await page.locator("#distribution-body tr").count(),31);
      if(mode==="standalone") await screenshot(page,"explorer-phone.png","#explorer");
      const downloadedCourse=await download(page,"#download-deck",mode+"-markov-course.json");
      assert.deepEqual(downloadedCourse.bytes,courseBytes);
      await noStorage(page,mode+" explorer");
      if(mode==="standalone") assert.deepEqual(pageRequests,[url],"The isolated explorer must not request companion assets.");
      await page.reload();await page.locator("#chart svg").waitFor();
      assert.deepEqual(await masses(page),["100.0000%","0.0000%","0.0000%"]);
      pass(mode+": phone layout, exact course download and refresh-to-default behavior");
      page.off("request",requestListener);

      await page.goto(learnerURL);await page.locator("#start-button").waitFor();
      await activate(page,"#start-button");
      const before=await page.locator("#session-content").innerHTML();
      await page.locator("#deck-file").setInputFiles(downloadedCourse.path);
      await page.locator("#start-deck").waitFor();
      assert.equal(await page.locator("#deck-preview-title").textContent(),deck.title);
      assert.match(await page.locator(".deck-preview-count").textContent(),/14 questions · 5 concepts/);
      assert.equal(await page.locator("#session-content").innerHTML(),before);
      await activate(page,"#cancel-deck");
      assert.equal(await page.locator("#session-content").innerHTML(),before);
      await page.locator("#deck-file").setInputFiles(downloadedCourse.path);
      await page.locator("#start-deck").waitFor();await activate(page,"#start-deck");
      const expected=initialMastery(deck.concepts),answers=[];
      for(let n=0;n<deck.items.length;n++) {
        const prompt=await page.locator(".question-card h2").textContent();
        const item=deck.items.find(item=>item.prompt===prompt);assert.ok(item);
        assert.equal(await page.locator("[data-choice]").count(),item.options.length);
        const choice=n%3===0?(item.answer+1)%item.options.length:item.answer;
        const correct=choice===item.answer;
        assert.ok((await page.locator('[data-choice="'+choice+'"]').textContent()).endsWith(item.options[choice]));
        await activate(page,'[data-choice="'+choice+'"]');
        assert.ok((await page.locator("#feedback-slot").textContent()).includes(item.explanation));
        expected[item.concept]=updateMastery(expected[item.concept],correct);answers.push({item,choice,correct});
        await activate(page,"#next-button");
      }
      assert.equal(new Set(answers.map(a=>a.item.id)).size,14);
      assert.equal(await page.locator(".review-item").count(),14);
      assert.equal(await page.locator("#step-count").textContent(),"14 / 14");
      assert.deepEqual(await page.locator(".mastery-box output").allTextContents(),deck.concepts.map(c=>Math.round(expected[c]*100)+"%"));
      const first=await page.locator("#first-try-summary").textContent(), estimates=await page.locator(".mastery-box").innerHTML();
      assert.match(first,/9 of 14/);
      for(let n=0;n<answers.length;n++) {
        const text=await page.locator(".review-item").nth(n).textContent();
        assert.ok(text.includes(answers[n].item.options[answers[n].choice]));
        assert.ok(text.includes(answers[n].item.explanation));assert.ok(text.includes(answers[n].item.transfer));
      }
      const missed=answers.filter(a=>!a.correct);
      await activate(page,"#practice-button");
      assert.equal(await page.locator(".practice-card h2").textContent(),missed[0].item.prompt);
      await activate(page,'[data-practice-choice="'+missed[0].item.answer+'"]');
      await activate(page,"#back-to-review");await activate(page,"#practice-button");
      assert.equal(await page.locator(".practice-card h2").textContent(),missed[1].item.prompt);
      await activate(page,"#back-to-review");
      assert.equal(await page.locator("#first-try-summary").textContent(),first);
      assert.equal(await page.locator(".mastery-box").innerHTML(),estimates);
      const notes=(await download(page,"#save-notes-button",mode+"-markov-study-notes.txt")).bytes.toString("utf8");
      assert.ok(notes.includes(deck.attribution));assert.ok(notes.includes(deck.license));
      for(const answer of answers) {
        assert.ok(notes.includes(answer.item.prompt));assert.ok(notes.includes("Your first answer: "+answer.item.options[answer.choice]));
        assert.ok(notes.includes("Correct answer: "+answer.item.options[answer.item.answer]));
        assert.ok(notes.includes("Explanation: "+answer.item.explanation));assert.ok(notes.includes("Apply the idea: "+answer.item.transfer));
      }
      assert.match(notes,/MODEL STATE, NOT A GRADE/);
      assert.match(notes,/Practice/);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      if(mode==="standalone") {await page.setViewportSize({width:1280,height:1000});await screenshot(page,"imported-course-review.png",".result-card");}
      await noStorage(page,mode+" learner");
      report[mode+"Lesson"]={answers:answers.map(a=>({id:a.item.id,choice:a.choice,correct:a.correct})),firstTry:first,practiceRetries:1};
      pass(mode+": exact downloaded course passes preview/cancel/start, fourteen questions, review, paused practice and actual study-notes download");
    }
    assert.deepEqual(report.errors,[]);
    assert.deepEqual(report.externalRequests,[]);
    for(const [name,metadata] of Object.entries(report.sources)) assert.equal(hash(await fs.readFile(path.join(root,name))),metadata.sha256);
    report.status="passed";
  } catch(error) {
    report.status="failed";report.failure=error.stack;
    if(context) for(const page of context.pages()) {try {await page.screenshot({path:path.join(output,"failure.png")});} catch {}}
    throw error;
  } finally {
    report.finishedAt=new Date().toISOString();
    await fs.writeFile(path.join(output,"receiving.json"),JSON.stringify(report,null,2)+"\n");
    if(context) await context.close();
    if(server) await new Promise(resolve=>server.close(resolve));
    console.log(JSON.stringify({status:report.status,checks:report.checks.length,downloads:report.downloads.length,output}));
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
