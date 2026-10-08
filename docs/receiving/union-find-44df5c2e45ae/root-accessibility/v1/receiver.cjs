#!/usr/bin/env node
'use strict';
// Independent, direct-file browser receiving for the union-find companion.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {pathToFileURL} = require('node:url');
const puppeteer = require('puppeteer');
const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const root = path.resolve(option('--root', path.join(__dirname, '..')));
const output = path.resolve(option('--output', 'union-find-accessibility-receiving'));
const browserPath = option('--browser', '/snap/bin/chromium');
const hash = data => createHash('sha256').update(data).digest('hex');
const productPaths = [
  'src/union-find.mjs', 'src/union-find-ui.mjs',
  'templates/union-find-explorer.html', 'courses/union-find-explorer.html',
  'courses/union-find.json', 'courses/union-find.md', 'tools/build-union-find.mjs'
];
const report = {
  format: 'recallweave-union-find-independent-browser/1',
  started: new Date().toISOString(), root, output, node: process.version,
  status: 'running', checks: [], findings: [], screenshots: [],
  networkRequests: [], pageErrors: []
};
let browser;
let profile;
async function pins() {
  return Object.fromEntries(await Promise.all(productPaths.map(async file => [
    file, hash(await fs.readFile(path.join(root, file)))
  ])));
}
const record = (name, detail) => { report.checks.push({name, detail}); console.log('PASS ' + name); };
const finding = (name, detail) => { report.findings.push({name, detail}); console.log('FINDING ' + name); };
(async () => {
  await fs.mkdir(output, {recursive: true});
  assert.deepEqual(await fs.readdir(output), [], 'Use a fresh receiving directory');
  report.sourceSha256 = await pins();
  profile = await fs.mkdtemp(path.join(output, 'profile-'));
  try {
    browser = await puppeteer.launch({
      executablePath: browserPath, headless: true, userDataDir: profile,
      args: ['--disable-background-networking', '--disable-component-update',
        '--disable-sync', '--no-first-run', '--no-default-browser-check']
    });
    report.browser = await browser.version();
    const page = await browser.newPage();
    page.on('pageerror', error => report.pageErrors.push(String(error)));
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = request.url();
      if (/^https?:/i.test(url)) { report.networkRequests.push(url); request.abort(); }
      else request.continue();
    });
    await page.setOfflineMode(true);
    await page.setViewport({width: 1280, height: 960, deviceScaleFactor: 1});
    await page.goto(pathToFileURL(path.join(root, 'courses/union-find-explorer.html')).href, {waitUntil: 'load'});
    await page.waitForFunction(() => document.querySelector('#component-count').textContent === '6');
    const capture = async (name, selector, fullPage = false) => {
      if (selector) await page.$eval(selector, el => el.scrollIntoView({block: 'start'}));
      const bytes = await page.screenshot({path: path.join(output, name), fullPage});
      report.screenshots.push({name, sha256: hash(bytes), bytes: bytes.length});
    };
    const basic = await page.evaluate(() => {
      const controls = [...document.querySelectorAll('input,select,textarea,button')]
        .map(el => ({id: el.id, type: el.type, name: el.getAttribute('aria-label') ||
          [...(el.labels || [])].map(label => label.textContent.trim()).join(' ') ||
          (el.tagName === 'BUTTON' ? el.textContent.trim() : ''),
          describedBy: el.getAttribute('aria-describedby')}));
      return {lang: document.documentElement.lang, h1: document.querySelectorAll('h1').length,
        controls, tableHeaders: [...document.querySelectorAll('th')].map(el => ({text: el.textContent, scope: el.scope})),
        alertRole: document.querySelector('#input-error').getAttribute('role'),
        liveRole: document.querySelector('#step-description').getAttribute('role')};
    });
    assert.equal(basic.lang, 'en');
    assert.equal(basic.h1, 1);
    assert.equal(basic.controls.filter(control => !control.name).length, 0, 'All form controls have names');
    assert.equal(basic.tableHeaders.length, 4);
    assert.ok(basic.tableHeaders.every(header => header.scope === 'col'));
    assert.equal(basic.alertRole, 'alert');
    assert.equal(basic.liveRole, 'status');
    record('document, controls, table and live status semantics', basic);
    const client = await page.createCDPSession();
    const ax = await client.send('Accessibility.getFullAXTree');
    const images = ax.nodes.filter(node => node.role?.value === 'image');
    assert.equal(images.length, 2);
    assert.ok(images.every(node => node.name?.value?.length > 30));
    await fs.writeFile(path.join(output, 'accessibility-tree.json'), JSON.stringify(ax, null, 2) + '\n');
    record('Chromium accessibility tree exposes both graph descriptions', images.map(node => node.name.value));
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.className), 'skip');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'step-slider');
    const focusStyle = await page.evaluate(() => {
      const s = getComputedStyle(document.activeElement);
      return {outlineStyle:s.outlineStyle,outlineWidth:s.outlineWidth,outlineColor:s.outlineColor};
    });
    assert.notEqual(focusStyle.outlineStyle, 'none');
    assert.ok(parseFloat(focusStyle.outlineWidth) >= 2);
    await page.keyboard.press('End');
    assert.match(await page.$eval('#step-position', el => el.textContent), /State 8 of 8/);
    await page.keyboard.press('Home');
    assert.match(await page.$eval('#step-position', el => el.textContent), /State 0 of 8/);
    record('skip link reaches trace, visible keyboard focus and range Home/End work', focusStyle);
    await page.select('#element-count', '8');
    await page.click('#apply-commands');
    assert.equal(await page.$eval('#component-count', el => el.textContent), '8');
    const roots = await page.evaluate(() => {
      const rings = [...document.querySelectorAll('#parent-graph circle')]
        .filter(el => Number(el.getAttribute('r')) > 20)
        .map(el => ({x:Number(el.getAttribute('cx')),y:Number(el.getAttribute('cy')),r:Number(el.getAttribute('r'))}));
      const gaps = [];
      for (let a=0;a<rings.length;a++) for(let b=a+1;b<rings.length;b++) {
        gaps.push({a,b,gap:Math.hypot(rings[a].x-rings[b].x,rings[a].y-rings[b].y)-rings[a].r-rings[b].r});
      }
      return {rings,minimumGap:Math.min(...gaps.map(pair=>pair.gap)),overlaps:gaps.filter(pair=>pair.gap < 0)};
    });
    await capture('01-eight-independent-roots.png', '#trace-heading');
    if (roots.overlaps.length) finding('independent root markers overlap in the eight-element initial forest', roots);
    else record('eight independent representative markers remain distinct', roots);
    const commands = 'join B A\njoin D C\njoin F E\njoin H G\njoin C A\njoin G E\njoin E A\njoin H D\njoin F H';
    await page.focus('#commands');
    await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control');
    await page.keyboard.type(commands);
    await page.click('#apply-commands');
    await page.focus('#step-slider');
    for(let i=0;i<7;i++) await page.keyboard.press('ArrowRight');
    const table = () => page.$$eval('#parent-rows tr', rows =>
      rows.map(row => [...row.cells].map(cell => cell.textContent)));
    const seven = await table();
    assert.deepEqual(seven.map(row=>row[1]), ['A','A','A','C','A','E','E','G']);
    assert.equal(await page.$eval('#component-count', el=>el.textContent), '1');
    assert.equal(await page.$eval('#tree-depth', el=>el.textContent), '3');
    await page.keyboard.press('ArrowRight');
    const eight = await table();
    assert.deepEqual(eight.map(row=>row[1]), ['A','A','A','A','A','E','A','A']);
    assert.match(await page.$eval('#step-description', el=>el.textContent), /No merge occurs/);
    assert.match(await page.$eval('#find-paths', el=>el.textContent), /H: G → A/);
    await capture('02-redundant-union-compression.png', '#trace-heading');
    await page.keyboard.press('ArrowLeft');
    assert.deepEqual(await table(), seven);
    record('visible parent table and graph describe both paths compressed by a redundant join', {state7:seven,state8:eight});
    await page.setViewport({width:320,height:760,deviceScaleFactor:1});
    await page.$eval('header', el => el.scrollIntoView({block:'start'}));
    const layout = await page.evaluate(() => ({
      width:innerWidth, documentWidth:document.documentElement.scrollWidth,
      overflowing:[...document.querySelectorAll('main,section,form,.row,.graphs,.details-grid')]
        .map(el=>({tag:el.tagName,id:el.id,cls:el.className,left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right}))
        .filter(rect=>rect.left < -1 || rect.right > innerWidth+1),
      controls:[...document.querySelectorAll('button')].filter(el=>!el.disabled&&el.offsetParent!==null)
        .map(el=>({id:el.id,width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}))
    }));
    await capture('03-mobile-320.png', null, true);
    assert.ok(layout.documentWidth <= 321, 'No horizontal page scrolling at 320 CSS pixels');
    assert.equal(layout.overflowing.length, 0);
    assert.ok(layout.controls.every(button=>button.height >= 44 && button.width >= 44));
    record('320 CSS-pixel layout retains controls, graph text and full page width', layout);
    const graphBounds = await page.evaluate(() => [...document.querySelectorAll('.graph-card svg')].map(svg => {
      const box=svg.getBBox(), view=svg.viewBox.baseVal;
      return {id:svg.id,box:{x:box.x,y:box.y,width:box.width,height:box.height},
        view:{x:view.x,y:view.y,width:view.width,height:view.height},
        inside:box.x >= view.x-1 && box.y >= view.y-1 &&
          box.x+box.width <= view.x+view.width+1 && box.y+box.height <= view.y+view.height+1};
    }));
    assert.ok(graphBounds.every(graph=>graph.inside), 'Drawn graphs remain inside SVG view boxes');
    record('graph geometry remains visible on small-screen layout', graphBounds);
    assert.equal(report.networkRequests.length,0);
    assert.equal(report.pageErrors.length,0);
    assert.deepEqual(await pins(), report.sourceSha256);
    record('direct-file offline execution produces no network request or page error and preserves source', {network:0,errors:0});
    report.status = report.findings.length ? 'needs-repair' : 'pass';
  } catch(error) {
    report.status = 'fail';
    report.error = {message:error.message,stack:error.stack};
    console.error(error.stack);
  } finally {
    if(browser) {
      const proc = browser.process();
      await browser.close().catch(error => report.closeError = error.message);
      if(proc && proc.exitCode === null) {
        await Promise.race([new Promise(resolve=>proc.once('exit',resolve)),new Promise(resolve=>setTimeout(resolve,3000))]);
      }
    }
    if(profile) {
      try { await fs.rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:250}); }
      catch(error) { report.cleanupError=error.message; }
    }
    report.finished = new Date().toISOString();
    await fs.writeFile(path.join(output,'receipt.json'),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify({status:report.status,checks:report.checks.length,findings:report.findings,receipt:path.join(output,'receipt.json')}));
    if(report.status !== 'pass') process.exitCode=1;
  }
})().catch(error => { console.error(error.stack); process.exitCode=1; });
