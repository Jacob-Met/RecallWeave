#!/usr/bin/env node
// Optional acceptance with an already-installed Playwright and Chromium. No app dependencies.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { createHash } = require('node:crypto');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const project = path.resolve(__dirname, '..');
const workshop = {
  format:'recallweave-deck/1', title:'Observation to decision: a workshop',
  attribution:'Original local workshop fixture', license:'Example content for software tests',
  concepts:['observation', 'decision', 'communication'],
  items:[
    {id:'observe', concept:'observation', prerequisites:[], prompt:'Which statement records an observation?', options:['It will probably rain.', 'The meeting must be delayed.', 'The log records a start at 09:00.'], answer:2, explanation:'The recorded start is the observation in this example.', transfer:'Separate a record from an interpretation.'},
    {id:'decide', concept:'decision', prerequisites:['observation'], prompt:'What makes the decision traceable?', options:['Hide the source.', 'Replace the record.', 'Only keep the conclusion.', 'State the observation and how it supports the choice.'], answer:3, explanation:'Keep the connection between the observation and the choice visible.', transfer:'Explain the reason for a choice.'},
    {id:'communicate', concept:'communication', prerequisites:['decision'], prompt:'Which message preserves the distinction?', options:['Present the interpretation as an observed fact.', 'Name the observation, the interpretation, and the chosen action.'], answer:1, explanation:'The three parts remain distinct in the message.', transfer:'Write one example with all three parts.'}
  ]
};

(async () => {
  const output = await fs.mkdtemp(path.join(process.env.RECALLWEAVE_EVIDENCE_DIR || os.tmpdir(), 'recallweave-decks-'));
  const receipt = {status:'running', project, checks:[], screenshots:[], sourceSha256:{}};
  const sourcePaths = ['src/app.mjs','src/deck.mjs','src/deck-picker.mjs','src/knowledge.mjs','src/review.mjs','data/deck.json','index.html','styles.css','tools/make_demo.py','demo.html','tests/deck.test.mjs','tests/deck_browser_smoke.cjs'];
  for (const file of sourcePaths) receipt.sourceSha256[file] = createHash('sha256').update(await fs.readFile(path.join(project,file))).digest('hex');
  const {initialMastery, updateMastery} = await import(pathToFileURL(path.join(project,'src/knowledge.mjs')));
  const bundled = JSON.parse(await fs.readFile(path.join(project,'data/deck.json'),'utf8'));
  const server = http.createServer(async (request,response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url,'http://localhost').pathname);
      const file = path.resolve(project, `.${pathname === '/' ? '/index.html' : pathname}`);
      if (!file.startsWith(project + path.sep)) {response.writeHead(403).end(); return;}
      const mime = {'.html':'text/html','.mjs':'text/javascript','.css':'text/css','.json':'application/json'}[path.extname(file)];
      response.writeHead(200, {'Content-Type':`${mime || 'application/octet-stream'}; charset=utf-8`});
      response.end(await fs.readFile(file));
    } catch {response.writeHead(404).end();}
  });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  let browser;
  const pageErrors = [];
  const externalRequests = [];
  const pass = name => {receipt.checks.push(name); console.log(`PASS ${name}`);};
  const upload = (page, deck, name='workshop.json') => page.locator('#deck-file').setInputFiles({name,mimeType:'application/json',buffer:Buffer.from(typeof deck === 'string' ? deck : JSON.stringify(deck))});
  const activate = async (page, selector) => {await page.locator(selector).focus(); await page.keyboard.press('Enter');};
  const snapshot = page => page.locator('#session-content').innerHTML();
  const expectText = async (page, selector, expected) => assert.equal(await page.locator(selector).textContent(),expected);
  const startPreview = async page => {await page.locator('#start-deck').waitFor(); await activate(page,'#start-deck'); await page.locator('[data-choice]').first().waitFor();};
  const screenshot = async (page,name,selector) => {
    if(selector) await page.locator(selector).scrollIntoViewIfNeeded();
    await page.waitForFunction(() => {
      const progress = document.querySelector('[role="progressbar"]');
      const expected = Number(progress.getAttribute('aria-valuenow')) / Number(progress.getAttribute('aria-valuemax'));
      return Math.abs(document.querySelector('#progress-fill').getBoundingClientRect().width - expected * progress.getBoundingClientRect().width) < 1;
    });
    await page.screenshot({path:path.join(output,name)});
    receipt.screenshots.push(name);
  };
  try {
    browser = await chromium.launch({executablePath:process.env.BROWSER_BIN,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-background-networking']});
    receipt.browser = await browser.version();
    for(const [name,url] of [['modular',base],['standalone',pathToFileURL(path.join(project,'demo.html')).href]]) {
      const context = await browser.newContext({viewport:{width:1280,height:1000},acceptDownloads:true});
      await context.route('**/*', route => {
        const url=route.request().url();
        if(!url.startsWith(base) && !url.startsWith('file:') && !url.startsWith('blob:') && !url.startsWith('data:')) {
          externalRequests.push(url); return route.abort();
        }
        return route.continue();
      });
      const page = await context.newPage();
      page.on('pageerror',error=>pageErrors.push(`${name}: ${error.message}`));
      await page.goto(url);
      await activate(page,'#start-button');
      await activate(page,'[data-choice="1"]');
      const original = await snapshot(page);
      await upload(page,'{"invalid":','invalid.json');
      await page.locator('#deck-status.deck-error').waitFor();
      assert.match(await page.locator('#deck-status').textContent(),/not valid JSON/);
      assert.equal(await snapshot(page),original);
      await upload(page,workshop);
      await page.locator('#start-deck').waitFor();
      await expectText(page,'#deck-preview-title',workshop.title);
      assert.equal(await snapshot(page),original);
      await activate(page,'#cancel-deck');
      assert.equal(await snapshot(page),original);
      assert.equal(await page.locator('#deck-preview').isHidden(),true);
      pass(`${name}: rejected and cancelled files preserve an answered session exactly`);

      await upload(page,workshop);
      await startPreview(page);
      await expectText(page,'#lesson-description',workshop.title);
      await expectText(page,'#step-count','0 / 3');
      assert.equal(await page.locator('.mastery-row').count(),3);
      const mastery=initialMastery(workshop.concepts);
      const firstAnswers=[];
      for(let index=0; index<workshop.items.length; index++) {
        const prompt=await page.locator('.question-card h2').textContent();
        const item=workshop.items.find(item=>item.prompt===prompt);
        assert.ok(item);
        const choice=index===1 ? item.answer : 0;
        const correct=choice===item.answer;
        await activate(page,`[data-choice="${choice}"]`);
        assert.match(await page.locator('#feedback-slot').textContent(),new RegExp(item.explanation.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
        mastery[item.concept]=updateMastery(mastery[item.concept],correct);
        firstAnswers.push({item,choice,correct});
        await activate(page,'#next-button');
      }
      await expectText(page,'#step-count','3 / 3');
      assert.match(await page.locator('#first-try-summary').textContent(),/1 of 3/);
      assert.deepEqual(await page.locator('.mastery-box output').allTextContents(),workshop.concepts.map(concept=>`${Math.round(mastery[concept]*100)}%`));
      assert.equal(await page.locator('.review-item').count(),3);
      for(let i=0;i<firstAnswers.length;i++) {
        const row=page.locator('.review-item').nth(i);
        await row.locator('summary').click();
        assert.deepEqual(await row.locator('dd').allTextContents(),[firstAnswers[i].item.options[firstAnswers[i].choice],firstAnswers[i].item.options[firstAnswers[i].item.answer]]);
      }
      assert.match(await page.locator('.source-note').textContent(),/Original local workshop fixture/);
      assert.doesNotMatch(await page.locator('.source-note').textContent(),/OpenStax/);
      assert.doesNotMatch(await page.locator('.reflection').textContent(),/sunlight/);
      const originalSummary=await page.locator('#first-try-summary').textContent();
      const originalEstimates=await page.locator('.mastery-box output').allTextContents();
      await activate(page,'#practice-button');
      for(let i=0;i<2;i++) {
        const prompt=await page.locator('.practice-card h2').textContent();
        const item=workshop.items.find(item=>item.prompt===prompt);
        await activate(page,`[data-practice-choice="${item.answer}"]`);
        if(i===0) {
          await activate(page,'#back-to-review');
          await activate(page,'#practice-button');
        } else await activate(page,'#practice-next');
      }
      assert.equal(await page.locator('#first-try-summary').textContent(),originalSummary);
      assert.deepEqual(await page.locator('.mastery-box output').allTextContents(),originalEstimates);
      assert.match(await page.locator('#practice-status').textContent(),/2 of 2 correctly/);
      await screenshot(page,`${name}-imported-trace.png`,'.result-card');
      pass(`${name}: imported questions, answer indices, attribution, review and resumed practice stay coherent`);

      const completed=await snapshot(page);
      await upload(page,workshop,'another-workshop.json');
      await page.locator('#start-deck').waitFor();
      await activate(page,'#cancel-deck');
      assert.equal(await snapshot(page),completed);
      await activate(page,'#reset-button');
      await expectText(page,'#lesson-description',workshop.title);
      await expectText(page,'#step-count','0 / 3');
      assert.equal(await page.locator('.simulation-launch').isHidden(),true);
      await activate(page,'#start-button');
      assert.deepEqual(await page.locator('.mastery-box output').allTextContents(),['22%','22%','22%']);
      const fresh=await snapshot(page);
      await activate(page,'#use-bundled-deck');
      assert.equal(await snapshot(page),fresh);
      await startPreview(page);
      await expectText(page,'#step-count','0 / 6');
      assert.match(await page.locator('#lesson-subject').textContent(),/BIOLOGY/);
      assert.equal(await page.locator('.mastery-row').count(),4);
      pass(`${name}: fresh-session reset retains the imported deck; switching to the bundled deck is explicit`);

      const downloadPromise=page.waitForEvent('download');
      await page.locator('#download-deck').click();
      const download=await downloadPromise;
      const downloaded=JSON.parse(await fs.readFile(await download.path(),'utf8'));
      assert.equal(downloaded.format,'recallweave-deck/1');
      assert.deepEqual(downloaded.items,bundled.items);
      assert.equal(downloaded.attribution,bundled.attribution);
      assert.equal(downloaded.license,bundled.license);
      pass(`${name}: the downloaded example retains original content and attribution`);

      const beforeError=await snapshot(page);
      await page.evaluate(() => {
        const read=File.prototype.text;
        File.prototype.text=function(){
          if(this.name==='unreadable.json') return Promise.reject(new Error('injected read failure'));
          if(this.name==='slow.json') return new Promise(resolve=>{window.finishSlowRead=()=>read.call(this).then(resolve);});
          return read.call(this);
        };
      });
      await upload(page,workshop,'unreadable.json');
      await page.locator('#deck-status.deck-error').waitFor();
      assert.match(await page.locator('#deck-status').textContent(),/could not be read/);
      assert.equal(await snapshot(page),beforeError);
      await upload(page,' '.repeat(262145),'oversize.json');
      assert.match(await page.locator('#deck-status').textContent(),/256 KiB/);
      assert.equal(await snapshot(page),beforeError);
      await upload(page,{...workshop,title:'Older pending file'},'slow.json');
      await page.waitForFunction(()=>typeof window.finishSlowRead==='function');
      await upload(page,workshop,'newest.json');
      await page.locator('#start-deck').waitFor();
      await page.evaluate(()=>window.finishSlowRead());
      await expectText(page,'#deck-preview-title',workshop.title);
      assert.equal(await snapshot(page),beforeError);
      await activate(page,'#cancel-deck');
      pass(`${name}: unreadable, oversized and out-of-order file reads preserve the active session`);

      const literal={
        format:'recallweave-deck/1', title:'<b>Literal title</b>', attribution:'<img src="https://invalid.example/attribution">', license:'<a href="https://invalid.example/license">Literal license</a>',
        concepts:['__proto__','atp'],
        items:[
          {id:'__proto__',concept:'__proto__',prerequisites:[],prompt:'<img src="https://invalid.example/prompt" onerror="window.__deckInjected=true">',options:['<b>first</b>','<svg onload="window.__deckInjected=true">second</svg>'],answer:1,explanation:'<script>window.__deckInjected=true</script>',transfer:'<em>Literal transfer</em>'},
          {id:'atp',concept:'atp',prerequisites:['__proto__'],prompt:'Literal concept labels',options:['wrong','right'],answer:1,explanation:'Local content',transfer:'Local transfer'}
        ]
      };
      await upload(page,literal,'literal.json');
      await page.locator('#start-deck').waitFor();
      await expectText(page,'#deck-preview-title',literal.title);
      assert.equal(await page.locator('#deck-preview img, #deck-preview a').count(),0);
      await startPreview(page);
      await expectText(page,'.question-card h2',literal.items[0].prompt);
      assert.deepEqual(await page.locator('.mastery-row > span').allTextContents(),['__proto__','atp']);
      await activate(page,'[data-choice="0"]');
      assert.ok((await page.locator('#feedback-slot').textContent()).includes(literal.items[0].explanation));
      await activate(page,'#next-button');
      await activate(page,'[data-choice="1"]');
      await activate(page,'#next-button');
      await activate(page,'#practice-button');
      await activate(page,'[data-practice-choice="1"]');
      await activate(page,'#practice-next');
      assert.equal(await page.locator('#session-content img, #session-content svg, #session-content script, #session-content a').count(),0);
      assert.equal(await page.evaluate(()=>window.__deckInjected),undefined);
      pass(`${name}: imported markup is literal text in preview, questions, feedback, review and practice`);

      await page.setViewportSize({width:390,height:844});
      await upload(page,workshop,'workshop-for-phone.json');
      await page.locator('#start-deck').waitFor();
      await page.locator('.deck-questions summary').click();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await screenshot(page,`${name}-phone-preview.png`,'#deck-preview');
      await startPreview(page);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await screenshot(page,`${name}-phone-question.png`,'.workbench');
      pass(`${name}: preview and imported lesson fit a 390px phone viewport`);
      await context.close();
    }
    assert.deepEqual(pageErrors,[]);
    assert.deepEqual(externalRequests,[]);
    receipt.pageErrors=pageErrors;
    receipt.externalRequests=externalRequests;
    receipt.status='passed';
  } catch(error) {
    receipt.status='failed'; receipt.error=error.stack; receipt.pageErrors=pageErrors; receipt.externalRequests=externalRequests;
    throw error;
  } finally {
    await fs.writeFile(path.join(output,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');
    await browser?.close();
    await new Promise(resolve=>server.close(resolve));
    console.log(`Evidence: ${output}`);
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
