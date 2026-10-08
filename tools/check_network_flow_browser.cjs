#!/usr/bin/env node
// Optional actual-browser receiving. Uses an already-installed Playwright and Chromium.
// The production app remains dependency-free. Browser sandboxing is explicitly enabled.
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const http = require("node:http");
const {createHash} = require("node:crypto");
const {execFileSync} = require("node:child_process");
const {pathToFileURL} = require("node:url");
const {chromium} = require("playwright");

const root = path.resolve(__dirname, "..");
const output = path.resolve(process.argv[2] || path.join(root, "network-flow-browser-check"));
const executablePath = process.env.BROWSER_BIN;
if (!executablePath) throw new Error("Set BROWSER_BIN to an already-installed Chromium or Chrome executable.");
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const report = {schema:"recallweave.network-flow-browser-receiving/1", status:"running",
  startedAt:new Date().toISOString(), root, executablePath, chromiumSandbox:true,
  checks:[], downloads:[], screenshots:[], errors:[], externalRequests:[], sources:{}};
let context, server;
const pass = name => {report.checks.push(name);console.log("PASS "+name);};
const activate = async(page, selector) => {
  await page.locator(selector).focus();
  await page.keyboard.press("Enter");
};
async function shot(page, name, selector) {
  if (selector) await page.locator(selector).evaluate(element=>element.scrollIntoView({block:"start"}));
  await page.screenshot({path:path.join(output,name),fullPage:false});
  report.screenshots.push(name);
}
async function download(page, selector, name) {
  const pending=page.waitForEvent("download");
  await activate(page,selector);
  const item=await pending;
  assert.equal(await item.failure(),null,item.suggestedFilename());
  const bytes=await fs.readFile(await item.path());
  const saved=path.join(output,name);
  await item.saveAs(saved);
  assert.deepEqual(await fs.readFile(saved),bytes);
  report.downloads.push({name,suggestedFilename:item.suggestedFilename(),bytes:bytes.length,sha256:hash(bytes)});
  return {bytes,path:saved};
}
async function noStorage(page,label) {
  const state=await page.evaluate(async()=>{
    const value={calls:window.__flowStorageCalls||[],local:localStorage.length,session:sessionStorage.length};
    if(indexedDB.databases) value.databases=(await indexedDB.databases()).length;
    return value;
  });
  assert.deepEqual(state.calls,[]);
  assert.equal(state.local,0);assert.equal(state.session,0);
  if("databases" in state) assert.equal(state.databases,0);
  pass(label+": no observed browser persistence");
}
async function receiveStep(page, step) {
  assert.equal(await page.locator("#flow-value").textContent(),String(step.value));
  assert.equal(await page.locator("#edge-body tr").count(),step.edges.length);
  const assignments=await page.locator("#edge-body tr").evaluateAll(rows=>rows.map(row=>Array.from(row.cells,cell=>cell.textContent)));
  assert.deepEqual(assignments.map(row=>row.slice(0,5)),step.edges.map(edge=>[
    edge.id,edge.from+" → "+edge.to,edge.flow+" / "+edge.capacity,String(edge.capacity-edge.flow),String(edge.flow)]));
  const residual=await page.locator("#residual-body tr").evaluateAll(rows=>rows.map(row=>Array.from(row.cells,cell=>cell.textContent)));
  assert.deepEqual(residual,step.residual.map(arc=>{
    const edge=step.edges.find(edge=>edge.id===arc.edgeId);
    return [arc.from+" → "+arc.to,(arc.direction===1?"Use ":"Cancel ")+arc.edgeId+" ("+edge.from+" → "+edge.to+")",String(arc.available)];
  }));
  assert.equal(await page.locator("#graph svg").getAttribute("role"),"img");
  assert.match(await page.locator("#graph svg title").textContent(),new RegExp("flow value "+step.value+"$"));
  assert.equal(await page.locator("#graph svg .edge").count(),step.edges.length);
  assert.equal(await page.locator("#certificate").isVisible(),step.kind==="complete");
}
(async()=>{
  await fs.mkdir(output,{recursive:false});
  await fs.mkdir(path.join(output,"downloads"));
  const courseBytes=await fs.readFile(path.join(root,"courses/network-flow.json"));
  const guideBytes=await fs.readFile(path.join(root,"courses/network-flow.md"));
  const deck=JSON.parse(courseBytes);
  const {PRESETS,solveNetwork,observationJSON}=await import(pathToFileURL(path.join(root,"src/network-flow.mjs")));
  const {initialMastery,updateMastery}=await import(pathToFileURL(path.join(root,"src/knowledge.mjs")));
  const sources=["courses/network-flow.json","courses/network-flow.md","courses/network-flow-explorer.template.html",
    "courses/network-flow-explorer.html","tools/build-network-flow.mjs","tools/check_network_flow_browser.cjs",
    "tests/network-flow.test.mjs","demo.html","index.html","styles.css","data/deck.json",
    ...(await fs.readdir(path.join(root,"src"))).filter(name=>name.endsWith(".mjs")).map(name=>"src/"+name)];
  for(const name of sources) {
    const bytes=await fs.readFile(path.join(root,name));
    report.sources[name]={bytes:bytes.length,sha256:hash(bytes)};
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
      response.writeHead(200,{"Content-Type":mime+"; charset=utf-8"}).end(bytes);
    } catch {response.writeHead(404).end();}
  });
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  const base="http://127.0.0.1:"+server.address().port;
  try {
    context=await chromium.launchPersistentContext(path.join(output,"profile"),{
      executablePath,headless:true,chromiumSandbox:true,acceptDownloads:true,
      downloadsPath:path.join(output,"downloads"),viewport:{width:1280,height:1000},timeout:45000,
      args:["--disable-dev-shm-usage","--disable-background-networking","--disable-component-update","--disable-sync",
        "--no-first-run","--no-default-browser-check"]
    });
    report.browser=context.browser().version();
    await context.addInitScript(()=>{
      window.__flowStorageCalls=[];
      for(const method of ["setItem","removeItem","clear"]) {
        const original=Storage.prototype[method];
        Storage.prototype[method]=function(...args){window.__flowStorageCalls.push(method);return original.apply(this,args);};
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
    page.setDefaultTimeout(12000);
    page.on("pageerror",error=>report.errors.push(error.message));
    const isolated=path.join(output,"single-file");
    await fs.mkdir(isolated);
    const isolatedHTML=path.join(isolated,"network-flow-explorer.html");
    await fs.copyFile(path.join(root,"courses/network-flow-explorer.html"),isolatedHTML);
    assert.deepEqual(await fs.readdir(isolated),["network-flow-explorer.html"]);
    for(const mode of ["standalone","served"]) {
      const explorerURL=mode==="standalone"?pathToFileURL(isolatedHTML).href:base+"/courses/network-flow-explorer.html";
      const learnerURL=mode==="standalone"?pathToFileURL(path.join(root,"demo.html")).href:base+"/index.html";
      await page.setViewportSize({width:1280,height:1000});
      await page.goto(explorerURL);
      await page.locator("#graph svg").waitFor();
      const reroute=solveNetwork(PRESETS[0]);
      await receiveStep(page,reroute.steps[0]);
      assert.equal(await page.locator("#first").isDisabled(),true);
      assert.equal(await page.locator("#previous").isDisabled(),true);
      assert.equal(await page.locator("#next").isDisabled(),false);
      await activate(page,"#next");
      assert.equal(await page.locator("#next").evaluate(element=>element===document.activeElement),true);
      await receiveStep(page,reroute.steps[1]);
      assert.equal(await page.locator("#flow-value").textContent(),"1");
      await activate(page,"#next");
      await receiveStep(page,reroute.steps[2]);
      assert.equal(await page.locator("#flow-value").textContent(),"2");
      assert.match(await page.locator("#path-list").textContent(),/C → A · cancel e3 \(A → C\): 1 available before this step; original flow 1 → 0/);
      assert.equal(await page.locator("#graph .edge.cancel").count(),1);
      const observation=await download(page,"#download-observation",mode+"-observation.json");
      assert.equal(observation.bytes.toString("utf8"),observationJSON(reroute,2));
      if(mode==="standalone") await shot(page,"rerouting-desktop.png","#result");
      await activate(page,"#last");
      await receiveStep(page,reroute.steps.at(-1));
      assert.match(await page.locator("#certificate").textContent(),/Flow 2 = cut capacity 2/);
      assert.equal(await page.locator("#next").isDisabled(),true);
      await activate(page,"#previous");
      await activate(page,"#previous");
      await receiveStep(page,reroute.steps[1]);
      await page.locator("#step-select").selectOption("3");
      await receiveStep(page,reroute.steps[3]);
      pass(mode+": keyboard step navigation, reverse cancellation, exact tables and downloaded immutable trace");
      for(const preset of PRESETS.slice(1)) {
        await page.locator("#preset").selectOption(preset.id);
        await activate(page,"#load-example");
        await activate(page,"#last");
        const expected=solveNetwork(preset);
        await receiveStep(page,expected.steps.at(-1));
        assert.match(await page.locator("#phase").textContent(),/Maximum certified/);
        assert.match(await page.locator("#certificate").textContent(),new RegExp("Flow "+expected.maximumFlow+" = cut capacity "+expected.maximumFlow));
        if(preset.id==="opposite") {
          const text=await page.locator("#residual-body").textContent();
          assert.ok(text.includes("Use e4 (B → A)5"));
          assert.ok(text.includes("Cancel e3 (A → B)3"));
        }
      }
      pass(mode+": bottleneck6, opposite-edge identities5, disconnected zero-flow certificate");
      await page.locator("#vertices").fill("S,A,T");
      assert.equal(await page.locator("#result").isVisible(),false);
      assert.equal(await page.locator("#download-observation").isDisabled(),true);
      await page.locator("#edges").fill("S A 1\nS A 2");
      await activate(page,"#build");
      assert.match(await page.locator("#error").textContent(),/Duplicate directed edge/);
      assert.equal(await page.locator("#result").isVisible(),false);
      await page.locator("#edges").fill("S S 1");
      await activate(page,"#build");
      assert.match(await page.locator("#error").textContent(),/two different listed vertices/);
      await page.locator("#edges").fill("S T 1e1");
      await activate(page,"#build");
      assert.match(await page.locator("#error").textContent(),/whole number|integer|digits/);
      await page.locator("#edges").fill("S A 2\nA T 9");
      await activate(page,"#build");await activate(page,"#last");
      assert.equal(await page.locator("#flow-value").textContent(),"2");
      await page.locator("#sink").selectOption("S");
      await activate(page,"#build");
      assert.match(await page.locator("#error").textContent(),/different source and sink/);
      await page.locator("#vertices").fill("S,<img>,T");
      await activate(page,"#build");
      assert.match(await page.locator("#error").textContent(),/Vertex names/);
      assert.equal(await page.locator("img").count(),0);
      await page.locator("#vertices").fill("Origin_1, Middle_2, Target_3");
      await page.locator("#edges").fill("Origin_1 Middle_2 4\nMiddle_2 Target_3 3");
      await page.locator("#source").selectOption("Origin_1");
      await page.locator("#sink").selectOption("Target_3");
      await activate(page,"#build");await activate(page,"#last");
      assert.equal(await page.locator("#flow-value").textContent(),"3");
      assert.match(await page.locator("#graph").textContent(),/Origin_1/);
      const denseVertices=["S","A","B","C","D","E","F","T"];
      const denseEdges=denseVertices.flatMap((from,i)=>denseVertices.filter(to=>from!==to).map(to=>({from,to,capacity:(i+1)%4})));
      const dense={vertices:denseVertices,source:"S",sink:"T",edges:denseEdges};
      await page.locator("#vertices").fill(denseVertices.join(","));
      await page.locator("#edges").fill(denseEdges.map(edge=>edge.from+" "+edge.to+" "+edge.capacity).join("\n"));
      await page.locator("#source").selectOption("S");await page.locator("#sink").selectOption("T");
      await activate(page,"#build");await activate(page,"#last");
      await receiveStep(page,solveNetwork(dense).steps.at(-1));
      assert.equal(await page.locator("#edge-body tr").count(),56);
      assert.equal(await page.locator("#graph .edge-label").count(),0);
      assert.match(await page.locator("#graph-help").textContent(),/exact edge labels in the table/);
      pass(mode+": input invalidation/refusals/recovery, literal names and all56 dense-network assignments");
      await page.locator("#preset").selectOption("reroute");await activate(page,"#load-example");await activate(page,"#last");
      if(mode==="standalone") await shot(page,"certificate-desktop.png","#result");
      await page.setViewportSize({width:375,height:900});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      if(mode==="standalone") {
        await shot(page,"phone-inputs.png");
        await shot(page,"phone-certificate.png","#result");
      }
      const downloadedCourse=await download(page,"#download-course",mode+"-network-flow.json");
      const downloadedGuide=await download(page,"#download-guide",mode+"-network-flow.md");
      assert.deepEqual(downloadedCourse.bytes,courseBytes);assert.deepEqual(downloadedGuide.bytes,guideBytes);
      await noStorage(page,mode+" explorer");
      await page.reload();
      assert.equal(await page.locator("#flow-value").textContent(),"0");
      assert.equal(await page.locator("#phase").textContent(),"Start with zero");
      pass(mode+":375px layout, exact course/guide downloads and refresh-to-default behavior");

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
      assert.equal(new Set(answers.map(answer=>answer.item.id)).size,14);
      assert.equal(await page.locator(".review-item").count(),14);
      assert.equal(await page.locator("#step-count").textContent(),"14 / 14");
      assert.deepEqual(await page.locator(".mastery-box output").allTextContents(),deck.concepts.map(c=>Math.round(expected[c]*100)+"%"));
      const first=await page.locator("#first-try-summary").textContent(),estimates=await page.locator(".mastery-box").innerHTML();
      assert.match(first,/9 of 14/);
      for(let n=0;n<answers.length;n++) {
        const text=await page.locator(".review-item").nth(n).textContent();
        assert.ok(text.includes(answers[n].item.options[answers[n].choice]));
        assert.ok(text.includes(answers[n].item.explanation));assert.ok(text.includes(answers[n].item.transfer));
      }
      const missed=answers.filter(answer=>!answer.correct);
      await activate(page,"#practice-button");
      assert.equal(await page.locator(".practice-card h2").textContent(),missed[0].item.prompt);
      await activate(page,'[data-practice-choice="'+missed[0].item.answer+'"]');
      await activate(page,"#back-to-review");await activate(page,"#practice-button");
      assert.equal(await page.locator(".practice-card h2").textContent(),missed[1].item.prompt);
      await activate(page,"#back-to-review");
      assert.equal(await page.locator("#first-try-summary").textContent(),first);
      assert.equal(await page.locator(".mastery-box").innerHTML(),estimates);
      const notes=(await download(page,"#save-notes-button",mode+"-network-flow-study-notes.txt")).bytes.toString("utf8");
      assert.ok(notes.includes(deck.attribution));assert.ok(notes.includes(deck.license));
      for(const answer of answers) {
        assert.ok(notes.includes(answer.item.prompt));assert.ok(notes.includes("Your first answer: "+answer.item.options[answer.choice]));
        assert.ok(notes.includes("Correct answer: "+answer.item.options[answer.item.answer]));
        assert.ok(notes.includes("Explanation: "+answer.item.explanation));assert.ok(notes.includes("Apply the idea: "+answer.item.transfer));
      }
      assert.match(notes,/MODEL STATE, NOT A GRADE/);assert.match(notes,/Practice/);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      if(mode==="standalone") {
        await page.setViewportSize({width:1280,height:1000});
        await shot(page,"imported-course-review.png",".result-card");
      }
      await noStorage(page,mode+" learner");
      report[mode+"Lesson"]={answers:answers.map(answer=>({id:answer.item.id,choice:answer.choice,correct:answer.correct})),firstTry:first,practiceRetries:1};
      pass(mode+": imported downloaded course preview/cancel/start,14 questions, review, paused practice and study-notes download");
    }
    assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalRequests,[]);
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
