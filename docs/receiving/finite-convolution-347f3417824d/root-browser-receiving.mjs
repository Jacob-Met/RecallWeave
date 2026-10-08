// Root-owned final browser receiving. Oracles were sealed before model source review.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {openBrowser,until,sha256} from './root-convolution-cdp-transport.mjs';
const project=resolve(process.argv[2]),output=resolve(process.argv[3]);
await mkdir(output,{recursive:true});
const evidence=resolve(project,'..','..','hamon-recallweave-convolution-347f3417824d');
const pins={
  'courses/finite-convolution-lab.html':'9ddf99a5f2a80eaab69cd48958a0ac7fe80a83149e15e85f76f4d3805a6bcd93',
  'courses/finite-convolution.json':'452154af5c1975c3d03752173582aa6bf7bee01958b9fc9be0b1ebf1be58ec12',
  'src/finite-convolution.mjs':'b39f202793b18b617b6cc90fb763120cea6fb420b2b3ea7ac08d130da79ee3e5',
  'src/finite-convolution-ui.mjs':'02384eb1ed57db46512ca1c2a0397f354cff3afbc91c3cef5c10a3190efdcbed',
  'templates/finite-convolution-lab.html':'24a442035030ac16c7bb5855fc10f999f7ab158967cb1db76beffccc5078d37f'
};
const oracleBytes=await readFile(join(evidence,'root-numeric-oracles-v1.json'));
assert.equal(sha256(oracleBytes),'23ffdd9168806583f5e6cca536464dfe89cc17c2fa854431067d4532d491e9fc');
const oracles=JSON.parse(oracleBytes);
const receipt={schema:'hamon.independent_browser_receiving.v1',reviewer:'chatgpt-347f3417824d/root',
  observed_at:new Date().toISOString(),node:process.version,project,offline:true,
  source_pins:pins,oracle_sha256:sha256(oracleBytes),cases:[],screenshots:[],status:'running'};
receipt.harness_sha256=sha256(await readFile(new URL(import.meta.url)));
receipt.transport_sha256=sha256(await readFile(new URL('./root-convolution-cdp-transport.mjs',import.meta.url)));
const literal=value=>JSON.stringify(value);
const field=id=>'document.getElementById('+literal(id)+')';
// Independent fixed-point product formatting; this never imports the model/UI.
function productText(a,b){
  let ticks=BigInt(Math.round(Number(a)*10000))*BigInt(Math.round(Number(b)*10000));
  const negative=ticks<0n;if(negative)ticks=-ticks;
  const digits=ticks.toString().padStart(9,'0'),whole=digits.slice(0,-8),fraction=digits.slice(-8).replace(/0+$/,'');
  return (negative?'-':'')+whole+(fraction?'.'+fraction:'');
}
function expectedTerms(c,n){
  return c.x.map((x,k)=>{
    const j=n-k,inKernel=j>=0&&j<c.h.length,h=inKernel?c.h[j]:'0';
    return {k,input:Number(x),kernelIndex:j,inKernel,kernel:Number(h),product:Number(productText(x,h))};
  });
}
let browser;
try{
  for(const[path,pin]of Object.entries(pins))assert.equal(sha256(await readFile(join(project,path))),pin,path+' frozen input');
  browser=await openBrowser(output);receipt.browser=browser.version;
  await browser.navigate(join(project,'courses/finite-convolution-lab.html'));
  await until(()=>browser.evaluate(field('calculation-status')+'.textContent.startsWith("Full result ready")'),'initial lab calculation');
  assert.equal(await browser.evaluate('document.title'),'Finite convolution lab · RecallWeave');
  const selectedCases=[[0,3],[2,2],[5,2],[6,23]];
  for(const[index,n]of selectedCases){
    const c=oracles.cases[index];
    await browser.evaluate(field('sequence-x')+'.value='+literal(c.x.join(', '))+';'+field('sequence-x')+'.dispatchEvent(new Event("input"));'+
      field('sequence-h')+'.value='+literal(c.h.join(', '))+';'+field('sequence-h')+'.dispatchEvent(new Event("input"))');
    assert.equal(await browser.evaluate(field('calculation')+'.hidden'),false,c.name+' visible result');
    assert.equal(await browser.evaluate(field('output-values')+'.textContent'),'['+c.expected.join(', ')+']');
    assert.equal(await browser.evaluate(field('output-length')+'.textContent'),String(c.expected.length));
    assert.equal(await browser.evaluate(field('output-index')+'.max'),String(c.expected.length-1));
    await browser.evaluate(field('output-index')+'.value='+literal(String(n))+';'+field('output-index')+'.dispatchEvent(new Event("input"))');
    assert.equal(await browser.evaluate(field('selected-output')+'.textContent'),'y['+n+'] = '+c.expected[n]);
    assert.equal(await browser.evaluate(field('sum-value')+'.textContent'),c.expected[n]);
    const terms=expectedTerms(c,n);
    const expectedRows=terms.map(t=>[String(t.k),c.x[t.k],String(t.kernelIndex),t.inKernel?c.h[t.kernelIndex]:'0',
      productText(c.x[t.k],t.inKernel?c.h[t.kernelIndex]:'0')]);
    const actualRows=await browser.evaluate('[...document.querySelectorAll("#contribution-rows tr")].map(row=>[...row.children].map(cell=>cell.firstChild.nodeValue))');
    assert.deepEqual(actualRows,expectedRows,c.name+' actual per-index products');
    assert.deepEqual(await browser.evaluate('[...document.querySelectorAll("#contribution-rows tr")].map(row=>row.classList.contains("outside-kernel"))'),
      terms.map(t=>!t.inKernel));
    const expression='y['+n+'] = '+terms.map(t=>'('+c.x[t.k]+' × '+(t.inKernel?c.h[t.kernelIndex]:'0')+')').join(' + ')+' = '+c.expected[n];
    assert.equal(await browser.evaluate(field('sum-expression')+'.textContent'),expression);
    assert.equal(await browser.evaluate('[...document.querySelectorAll(".plot svg *")].flatMap(el=>[...el.attributes].map(a=>a.value)).some(v=>/NaN|Infinity/.test(v))'),false);
    assert.equal(await browser.evaluate('document.querySelector("#output-plot svg title").textContent'),'Output y[n]: ['+c.expected.join(', ')+']');
    // Exercise native keyboard activation at the selected index and at a boundary.
    await browser.activate('#previous-index');
    assert.equal(await browser.evaluate(field('output-index')+'.value'),String(n-1));
    await browser.activate('#next-index');
    assert.equal(await browser.evaluate(field('output-index')+'.value'),String(n));
    await browser.evaluate(field('output-index')+'.focus()');
    await browser.key('End');
    assert.equal(await browser.evaluate(field('output-index')+'.value'),String(c.expected.length-1));
    assert.equal(await browser.evaluate(field('next-index')+'.disabled'),true);
    assert.equal(await browser.evaluate(field('selected-output')+'.textContent'),'y['+(c.expected.length-1)+'] = '+c.expected.at(-1));
    await browser.evaluate(field('output-index')+'.value='+literal(String(n))+';'+field('output-index')+'.dispatchEvent(new Event("input"))');
    const result={name:c.name,status:'pass',x:c.x,h:c.h,expected:c.expected,selected_n:n,
      exact_visible_products_and_output:true,zero_extension_rows:true,keyboard_navigation:true,finite_svg:true};
    if(index===0||index===5){
      const download=await browser.download('#download-calculation');
      assert.equal(download.suggestedFilename,'recallweave-finite-convolution-calculation.json');
      const record=JSON.parse(download.bytes.toString('utf8'));
      assert.equal(record.format,'recallweave-finite-convolution/1');
      assert.deepEqual(record.x,c.x.map(Number));assert.deepEqual(record.h,c.h.map(Number));
      assert.deepEqual(record.y,c.expected.map(Number));assert.equal(record.steps.length,c.expected.length);
      for(let j=0;j<c.expected.length;j++){
        assert.equal(record.steps[j].n,j);assert.equal(record.steps[j].value,Number(c.expected[j]));
        assert.deepEqual(record.steps[j].terms,expectedTerms(c,j));
      }
      result.download={path:download.path,sha256:download.sha256,bytes:download.bytes.length};
      receipt.screenshots.push(await browser.screenshot(c.name+'-desktop.png'));
    }
    if(index===6){
      await browser.viewport(390,844);
      await browser.evaluate('new Promise(resolve=>setTimeout(resolve,150))');
      assert.equal(await browser.evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
      assert.equal(await browser.evaluate('document.querySelector("#output-plot").scrollWidth>document.querySelector("#output-plot").clientWidth'),true);
      assert.equal(await browser.evaluate('document.querySelector(".table-wrap").getAttribute("aria-label")'),'Per-index contributions');
      assert.equal(await browser.evaluate('getComputedStyle(document.querySelector("#contribution-scroll-help")).display'),'block');
      await browser.evaluate('document.querySelector(".table-wrap").focus()');
      await browser.key('ArrowRight');
      await until(()=>browser.evaluate('document.querySelector(".table-wrap").scrollLeft>0'),'keyboard horizontal contribution scroll');
      receipt.screenshots.push(await browser.screenshot(c.name+'-mobile.png'));
      result.mobile_390px_no_document_overflow=true;result.scoped_plot_and_keyboard_table_scrolling=true;
    }
    receipt.cases.push(result);console.log('PASS '+c.name+' actual output/products/keyboard'+(result.download?' physical calculation download':''));
  }
  await browser.evaluate(field('sequence-x')+'.value="1e3";'+field('sequence-x')+'.dispatchEvent(new Event("input"))');
  assert.equal(await browser.evaluate(field('calculation')+'.hidden'),true);
  assert.equal(await browser.evaluate(field('calculation-status')+'.getAttribute("role")'),'alert');
  assert.deepEqual(await browser.evaluate('["output-index","previous-index","next-index","download-calculation"].map(id=>document.getElementById(id).disabled)'),[true,true,true,true]);
  assert.equal(await browser.evaluate('[...document.querySelectorAll(".plot")].every(el=>el.childElementCount===0)'),true);
  assert.equal(await browser.evaluate(field('output-values')+'.textContent'),'');
  assert.equal(await browser.evaluate(field('sum-expression')+'.textContent'),'');
  await browser.activate('[data-preset="difference"]');
  assert.equal(await browser.evaluate(field('calculation')+'.hidden'),false);
  assert.equal(await browser.evaluate(field('output-values')+'.textContent'),'[2, 0, 0, -2]');
  assert.equal(await browser.evaluate(field('calculation-status')+'.getAttribute("role")'),'status');
  assert.equal(await browser.evaluate(field('download-calculation')+'.disabled'),false);
  receipt.cases.push({name:'invalid-input-clears-stale-result-and-preset-recovers',status:'pass'});
  console.log('PASS invalid-input-clears-stale-result-and-preset-recovers');
  const course=await browser.download('#download-course'),original=await readFile(join(project,'courses/finite-convolution.json'));
  assert.deepEqual(course.bytes,original);assert.equal(course.suggestedFilename,'recallweave-finite-convolution.json');
  receipt.cases.push({name:'physical-course-download',status:'pass',path:course.path,bytes:course.bytes.length,sha256:course.sha256});
  for(const[path,pin]of Object.entries(pins))assert.equal(sha256(await readFile(join(project,path))),pin,path+' unchanged after receiving');
  assert.deepEqual(browser.errors,[]);assert.deepEqual(browser.requests.filter(url=>/^https?:/.test(url)),[]);
  receipt.page_errors=[];receipt.external_http_requests=0;receipt.status='pass';
}catch(error){receipt.status='fail';receipt.error=error.stack;console.error(error.stack);process.exitCode=1;}
finally{
  if(browser)await browser.close();
  await writeFile(join(output,'root-browser-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
  console.log(JSON.stringify({status:receipt.status,cases:receipt.cases.length,receipt:join(output,'root-browser-receipt.json')}));
}
