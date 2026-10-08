const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto"),assert=require("node:assert/strict");
const {pathToFileURL}=require("node:url");
const puppeteer=require("/Users/me/.npm/_npx/4b4c857f6efdfb61/node_modules/puppeteer/lib/puppeteer/puppeteer.js");
const root=__dirname,out=path.join(root,"before-native");
fs.mkdirSync(out,{recursive:true});fs.mkdirSync(path.join(out,"downloads"),{recursive:true});
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
const meta={title:"Read an event log",attribution:"Original synthetic receiver fixture; no learner data.",license:"Synthetic qualification fixture."};
const items=[
{id:"observe-1",concept:"observation",prerequisites:[],prompt:'Which line records an observation, not a prediction?',options:['The next step will fail.','The log says "ready" at 09:00.'],answer:1,explanation:"The second line reports a recorded event.\nThe first predicts a later outcome.",transfer:"Write one recorded observation."},
{id:"order-2",concept:"sequence",prerequisites:["observation"],prompt:"The log has A at 09:00 and B at 09:02. Which is earlier?",options:["A — first event","B <later>"],answer:0,explanation:"In the authored fixture, 09:00 precedes 09:02.",transfer:"Describe the order without inventing a cause."}
];
const deck={format:"recallweave-deck/1",...meta,concepts:["observation","sequence"],items};
const header=["id","concept","prompt","option_1","option_2","option_3","option_4","option_5","option_6","correct_option","explanation","transfer","prerequisites"];
const rows=[header,...items.map(x=>[x.id,x.concept,x.prompt,...[0,1,2,3,4,5].map(i=>x.options[i]||""),String(x.answer+1),x.explanation,x.transfer,JSON.stringify(x.prerequisites)])];
const csv=rows.map(row=>row.map(cell=>'"'+cell.replaceAll('"','""')+'"').join(",")).join("\r\n")+"\r\n";
fs.writeFileSync(path.join(out,"question-bank.csv"),csv);
fs.writeFileSync(path.join(out,"control-deck.json"),JSON.stringify(deck,null,2)+"\n");
const watched=[path.join(root,"baseline/author.html"),path.join(root,"baseline/src/deck.mjs"),path.join(out,"question-bank.csv"),path.join(out,"control-deck.json")];
const before=Object.fromEntries(watched.map(p=>[p,sha(fs.readFileSync(p))]));
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const until=async(fn,label)=>{for(let n=0;n<200;n++){if(await fn())return;await wait(50);}throw Error("Timed out: "+label);};
let browser;const receipt={schema:"recallweave-csv-before.v1",base_commit:"ab7e2dddc03dd2629b7d67c291217c946772d10c",source:before,groups:[],refused:[],page_errors:[],downloads:[]};
(async()=>{try{
 browser=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:true,userDataDir:path.join(out,"profile"),
 args:["--no-first-run","--no-default-browser-check","--disable-background-networking","--disable-sync","--disk-cache-size=1048576"]});
 receipt.browser=await browser.version();receipt.node=process.version;
 const page=await browser.newPage();await page.setViewport({width:1280,height:900,deviceScaleFactor:1});
 await page.setRequestInterception(true);
 const target=pathToFileURL(path.join(root,"baseline/author.html")).href;
 page.on("request",r=>{if(r.url()===target||r.url().startsWith("blob:")||r.url().startsWith("data:"))r.continue();else{receipt.refused.push(r.url());r.abort();}});
 page.on("pageerror",e=>receipt.page_errors.push(String(e)));
 const cdp=await browser.target().createCDPSession();
 await cdp.send("Browser.setDownloadBehavior",{behavior:"allow",downloadPath:path.join(out,"downloads"),eventsEnabled:true});
 const beginnings=[],completions=[];
 cdp.on("Browser.downloadWillBegin",e=>beginnings.push(e));
 cdp.on("Browser.downloadProgress",e=>{if(e.state==="completed")completions.push(e);});
 await page.goto(target,{waitUntil:"load"});
 await until(async()=>await page.$("#deck-title"),"author form");
 await (await page.$("#open-deck")).uploadFile(path.join(out,"control-deck.json"));
 await until(async()=>!(await page.$eval("#open-preview",e=>e.hidden)),"JSON preview");
 assert.equal(await page.$eval("#open-preview-title",e=>e.textContent),meta.title);
 await page.click("#replace-draft");
 await until(async()=>await page.$eval("#deck-title",e=>e.value)===meta.title,"JSON replacement");
 receipt.groups.push({name:"existing checked JSON reopens in actual studio",ok:true,question_count:await page.$eval("#question-count",e=>e.textContent)});
 await page.focus("#deck-title");await page.$eval("#deck-title",e=>e.select());await page.keyboard.press("Backspace");await page.type("#deck-title","Teacher draft retained after a CSV refusal");
 const form=()=>page.evaluate(()=>Array.from(document.querySelectorAll("#author-form input,#author-form select,#author-form textarea")).map(e=>({tag:e.tagName,id:e.id,value:e.value,checked:e.checked??null})));
 const draftBefore=await form();
 await (await page.$("#open-deck")).uploadFile(path.join(out,"question-bank.csv"));
 await until(async()=>/not valid JSON/i.test(await page.$eval("#author-status",e=>e.textContent)),"actual CSV refusal");
 const draftAfter=await form();assert.deepEqual(draftAfter,draftBefore);
 receipt.csv_status=await page.$eval("#author-status",e=>e.textContent);
 receipt.input_accept=await page.$eval("#open-deck",e=>e.accept);
 receipt.groups.push({name:"unsupported CSV leaves the existing draft unchanged",ok:true,form_field_count:draftAfter.length});
 receipt.groups.push({name:"CSV rows can become an editable checked lesson",ok:false,missing_capability:true,
 detail:"The current actual file-input flow rejects this authored CSV as invalid JSON; it only offers JSON draft/deck files."});
 await page.click("#save-draft");
 await until(()=>completions.length===1,"native saved-draft download");
 const d=beginnings.find(x=>x.guid===completions[0].guid);assert.ok(d);
 const saved=path.join(out,"downloads",d.suggestedFilename);await until(()=>fs.existsSync(saved),"saved draft file");
 const bytes=fs.readFileSync(saved);assert.ok(bytes.toString().includes("Teacher draft retained after a CSV refusal"));
 receipt.downloads.push({filename:d.suggestedFilename,bytes:bytes.length,sha256:sha(bytes)});
 receipt.groups.push({name:"existing draft download stays usable after refusal",ok:true});
 await page.screenshot({path:path.join(out,"csv-refused-draft-kept.png"),fullPage:true});
 receipt.draft_before=draftBefore;receipt.draft_after=draftAfter;
 assert.deepEqual(receipt.refused,[]);assert.deepEqual(receipt.page_errors,[]);
 receipt.unchanged_inputs=watched.every(p=>sha(fs.readFileSync(p))===before[p]);assert.ok(receipt.unchanged_inputs);
 }catch(error){receipt.infrastructure_error=String(error.stack||error);process.exitCode=1;}
 finally{if(browser)await browser.close();fs.rmSync(path.join(out,"profile"),{recursive:true,force:true});
 fs.writeFileSync(path.join(out,"receipt.json"),JSON.stringify(receipt,null,2)+"\n");
 console.log(JSON.stringify({groups:receipt.groups,source_unchanged:receipt.unchanged_inputs,error:receipt.infrastructure_error||null,receipt:path.join(out,"receipt.json")}));}
})();
