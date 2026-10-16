'use strict';
// Post-source-review extension: record zero/one/two initial BOMs through actual browser file input.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {createHash}=require('node:crypto'),{pathToFileURL}=require('node:url');
const puppeteer=require('/Users/me/.npm/_npx/4b4c857f6efdfb61/node_modules/puppeteer/lib/puppeteer/puppeteer.js');
const arg=(n,d)=>{const i=process.argv.indexOf(n);return i<0?d:process.argv[i+1];};
const variant=arg('--variant','original');
const output=arg('--output',path.join(__dirname,'bom-'+variant));
const source=arg('--source','/tmp/ultra-20b27c2e-memory-recall-csv/candidate/csv-course.html');
const originalExport='/tmp/ultra-20b27c2e-memory-recall-csv/frozen-candidate-export.json';
const h=b=>({bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const disk=fs.statfsSync(__dirname),free=disk.bavail*disk.bsize;
 const preflight={at:new Date().toISOString(),free_bytes:free,launch_floor_bytes:300000000};
 if(free<300000000){console.log(JSON.stringify({kind:'post-review-bom-browser',variant,preflight,blocked:true}));process.exitCode=75;return;}
 assert(!fs.existsSync(output));fs.mkdirSync(output);
 const original=fs.readFileSync(originalExport);assert.equal(h(original).sha256,'4070b2e05c7a429f2f25ddea1d5e0a6a3230349b91756af4c4e466f1cd0f8c19');
 const oldHtml=JSON.parse(original).entries.find(x=>x.repository_path==='csv-course.html').content;
 const html=variant==='original'?Buffer.from(oldHtml):fs.readFileSync(source);
 if(variant==='original')assert.equal(h(html).sha256,'b7d8c5c249ccb1feac214578b73f09f774e30bbd6630602a018f2968291d9d8e');
 else if(arg('--sha',null))assert.equal(h(html).sha256,arg('--sha',null));
 const {makeOracle,metadata}=await import(pathToFileURL(path.join(__dirname,'independent-native-v3.mjs')).href);
 const oracle=await makeOracle(path.join(__dirname,'primary'));assert(oracle.csv.startsWith('\ufeff'));
 const plain=oracle.csv.slice(1),groups=[],errors=[],nonlocal=[],downloads=[];
 const server=http.createServer((req,res)=>{if(req.url==='/csv-course.html'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(html);}else{res.writeHead(204);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const profile=path.join(output,'profile');let browser,version;
 try{
  browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,userDataDir:profile,args:['--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--disable-sync']});version=await browser.version();
  for(const count of [0,1,2]){
   const file=path.join(output,'bom-'+count+'.csv');fs.writeFileSync(file,'\ufeff'.repeat(count)+plain);
   const page=await browser.newPage();page.setDefaultTimeout(5000);
   page.on('pageerror',e=>errors.push(String(e)));await page.setRequestInterception(true);
   page.on('request',r=>{if(r.url().startsWith(base+'/')||r.url().startsWith('blob:')||r.url().startsWith('data:'))r.continue();else{nonlocal.push(r.url());r.abort();}});
   const result={name:'actual file with '+count+' initial BOMs',count,expected_ready:count<2,fixture:h(fs.readFileSync(file))};
   try{
    const response=await page.goto(base+'/csv-course.html',{waitUntil:'load'});assert.equal(response.status(),200);
    for(const key of ['title','attribution','license']){await page.type('#course-'+key,metadata[key]);assert.equal(await page.$eval('#course-'+key,e=>e.value),metadata[key]);}
    const [chooser]=await Promise.all([page.waitForFileChooser(),page.click('#choose-csv')]);await chooser.accept([file]);
    await page.waitForFunction(()=>!document.querySelector('#check-csv').disabled);
    await page.click('#check-csv');await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    result.status=await page.$eval('#csv-status',e=>e.textContent);
    result.observed_ready=await page.evaluate(()=>!document.querySelector('#course-preview').hidden&&!document.querySelector('#download-course').disabled);
    if(result.observed_ready){
     const dir=path.join(output,'download-'+count);fs.mkdirSync(dir);const client=await page.createCDPSession();await client.send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:dir});await page.click('#download-course');
     const target=path.join(dir,'recallweave-course.json'),deadline=Date.now()+8000;
     while(Date.now()<deadline&&!fs.existsSync(target))await pause(30);
     const downloaded=fs.readFileSync(target);assert.equal(downloaded.toString('utf8'),oracle.json);downloads.push({count,path:target,...h(downloaded)});await client.detach();
    }
    assert.equal(result.observed_ready,result.expected_ready,'At most one initial BOM is allowed by the settled CSV contract.');
    result.pass=true;
   }catch(e){result.pass=false;result.error=String(e.stack||e);}
   groups.push(result);await page.close();console.log(JSON.stringify(result));
  }
  assert.deepEqual(errors,[]);assert.deepEqual(nonlocal,[]);
  if(variant!=='original')assert.deepEqual(h(fs.readFileSync(source)),h(html));
 }finally{
  if(browser)await browser.close();await new Promise(r=>server.close(r));if(fs.existsSync(profile))fs.rmSync(profile,{recursive:true,force:false});
 }
 const receipt={schema:'recall-csv-root-bom-browser.v1',qualification:'Post-source-review extension, separate from original independent executable freeze.',variant,at:new Date().toISOString(),preflight,node:process.version,browser:version,probe:h(fs.readFileSync(__filename)),served_html:h(html),oracle:h(Buffer.from(oracle.json)),groups,downloads,errors,nonlocal,passed:groups.filter(x=>x.pass).length,failed:groups.filter(x=>!x.pass).length,profile_removed:!fs.existsSync(profile)};
 fs.writeFileSync(path.join(output,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));process.exitCode=receipt.failed?1:0;
})().catch(e=>{console.error(e.stack||e);process.exitCode=2;});
