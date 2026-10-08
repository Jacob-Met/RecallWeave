await (async function sortingBrowserReceiver(){
const assert=(await import('node:assert/strict')).default;
const fs=await import('node:fs/promises');
const path=(await import('node:path')).default;
const crypto=(await import('node:crypto')).default;
const {fileURLToPath,pathToFileURL}=await import('node:url');
const {startBrowser,waitFor}=await import('./browser-transport-v2.mjs');
const {buildSortingComparison}=await import('./core-v1-exact.mjs');
const reviewRoot=path.dirname(fileURLToPath(import.meta.url));
const [project,sourceManifestPath,out]=process.argv.slice(2);
assert(project&&sourceManifestPath&&out&&[project,sourceManifestPath,out].every(path.isAbsolute));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const course=JSON.parse(await fs.readFile(path.join(reviewRoot,'course-current-v1.json'),'utf8'));
const oracle=JSON.parse(await fs.readFile(path.join(reviewRoot,'consumer-expectations.json'),'utf8'));
const byPrompt=new Map(oracle.items.map(x=>[x.prompt,x])),byId=new Map(oracle.items.map(x=>[x.id,x]));
const sourceManifest=JSON.parse(await fs.readFile(sourceManifestPath,'utf8'));
const sourceFiles=[...sourceManifest.sourceFiles,...sourceManifest.learnerFiles];
const checks=[],groups=[],downloadReceipts=[],surfaces=[],startedAt=new Date().toISOString();
let browser,error,cleanup,phase='startup',selectedCoursePath;
await fs.mkdir(out);
async function save(name,value){await fs.writeFile(path.join(out,name),typeof value==='string'?value:JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o644});}
async function check(name,condition,detail){
 const entry={phase,name,pass:Boolean(condition),...(detail===undefined?{}:{detail})};
 checks.push(entry);await fs.appendFile(path.join(out,'events.jsonl'),JSON.stringify(entry)+'\n');
 if(!condition)throw Error(name+' '+JSON.stringify(detail??''));
}
async function equal(name,actual,expected){await check(name,JSON.stringify(actual)===JSON.stringify(expected),JSON.stringify(actual)===JSON.stringify(expected)?undefined:{actual,expected});}
async function group(name,fn){phase=name;const start=checks.length;const result=await fn();groups.push({name,status:'pass',checks:checks.length-start,result});console.log(JSON.stringify({group:name,status:'pass',checks:checks.length-start}));}
async function sourceCheck(){
 for(const file of sourceFiles){
  const b=await fs.readFile(path.join(project,file.path));assert.equal(sha(b),file.sha256,file.path+' source bytes');
  if(file.blob)assert.equal(crypto.createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex'),file.blob,file.path+' source blob');
 }
}
async function ready(selector,label){return waitFor(()=>browser.evaluate('Boolean(document.querySelector('+JSON.stringify(selector)+'))'),label);}
async function at(selector,index=0){
 const yes=await browser.evaluate('(()=>{const e=document.querySelectorAll('+JSON.stringify(selector)+')['+index+'];if(!e)return false;e.focus();return document.activeElement===e&&!e.disabled;})()');
 assert(yes,'focus observed enabled '+selector);await browser.key('Enter');
}
async function preset(name){
 await browser.evaluate('(()=>{const e=document.querySelector("#preset");e.value='+JSON.stringify(name)+';e.dispatchEvent(new Event("change",{bubbles:true}));})()');
}
async function state(){
 return browser.evaluate(`(()=>{
  const panel=n=>{const p=document.querySelector('[data-algorithm="'+n+'"]');return{
    name:n,step:p.querySelector('[data-step-count]').textContent,message:p.querySelector('[data-step-message]').textContent,
    prefix:p.querySelector('[data-prefix-context]').textContent,counts:{comparisons:Number(p.querySelector('[data-comparisons]').textContent),exchanges:Number(p.querySelector('[data-exchanges]').textContent)},
    records:[...p.querySelectorAll('[data-record-id]')].map(e=>({id:e.dataset.recordId,key:Number(e.querySelector('.record-key').textContent),label:e.querySelector('.record-label').textContent,origin:e.querySelector('.record-origin').textContent})),
    back:p.querySelector('[data-action="back"]').disabled,next:p.querySelector('[data-action="next"]').disabled,final:p.querySelector('[data-action="final"]').disabled,
    tie:p.querySelector('[data-tie-report]').textContent,guarantee:p.querySelector('.guarantee').textContent};};
  const p=document.querySelector('#comparison-panels');
  return {draft:[...document.querySelectorAll('#draft-rows .draft-row')].map(r=>({key:r.querySelector('[data-field="keyText"]').value,label:r.querySelector('[data-field="label"]').value,removeDisabled:r.querySelector('[data-remove]').disabled})),
    draftStatus:document.querySelector('#draft-status').textContent,status:document.querySelector('#comparison-status').textContent,
    startDisabled:document.querySelector('#start-comparison').disabled,downloadDisabled:document.querySelector('#download-comparison').disabled,
    lessonDisabled:document.querySelector('#download-lesson').disabled,addDisabled:document.querySelector('#add-record').disabled,
    restartDisabled:document.querySelector('#restart-steps').disabled,hidden:p.hidden,display:getComputedStyle(p).display,
    emptyVisible:!document.querySelector('#empty-results').hidden,focused:document.activeElement?.id,
    insertion:panel('insertion'),selection:panel('selection')};
 })()`);
}
async function screenshot(name,selector,width=1280,height=1000){
 await browser.command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
 if(selector)await browser.evaluate('document.querySelector('+JSON.stringify(selector)+').scrollIntoView({block:"start"})');
 await browser.screenshot(name);const b=await fs.readFile(path.join(out,name));return{path:name,bytes:b.length,sha256:sha(b),width,height};
}
async function actualDownload(selector,label,extension){
 const before=new Set(browser.downloads.keys());await browser.activate(selector);
 const event=await waitFor(()=>[...browser.downloads.values()].find(x=>!before.has(x.guid)&&x.state==='completed'),'actual '+label+' download');
 const native=path.join(browser.downloadPath,event.guid),bytes=await fs.readFile(native);
 await check(label+' completed bytes',bytes.length>0&&event.receivedBytes===bytes.length&&event.suggestedFilename.endsWith(extension),{event,bytes:bytes.length});
 const artifact=label+extension;await fs.writeFile(path.join(out,artifact),bytes,{flag:'wx'});
 const receipt={label,artifact,guid:event.guid,suggestedFilename:event.suggestedFilename,bytes:bytes.length,sha256:sha(bytes),nativePath:native,event};
 downloadReceipts.push(receipt);return{...receipt,bytesValue:bytes};
}
async function start(){await browser.activate('#start-comparison');await waitFor(async()=>!(await state()).hidden,'explicit comparison mounted');}
async function finalBoth(){for(const name of ['insertion','selection'])await browser.activate('[data-algorithm="'+name+'"] [data-action="final"]');}
async function currentJSON(label,input){
 const d=await actualDownload('#download-comparison',label,'.json'),parsed=JSON.parse(d.bytesValue),expected=buildSortingComparison(input);
 await equal(label+' full exact qualified core DTO',parsed,expected);return{receipt:d,comparison:parsed};
}
async function explorer(name,url,full){
 const requestStart=browser.requests.length,blockedStart=browser.blockedRequests.length;
 await browser.navigate(url);
 await waitFor(()=>browser.evaluate('Boolean(document.querySelector("#label-0"))&&!document.querySelector("#download-lesson").disabled'),name+' original course and draft ready');
 const initial=await state();
 await check(name+' no implicit start',initial.hidden&&initial.display==='none'&&initial.emptyVisible&&initial.downloadDisabled&&initial.restartDisabled&&!initial.startDisabled);
 await equal(name+' default authored input',initial.draft.map(r=>[r.key,r.label]),[['2','A'],['2','B'],['1','C']]);
 const focused=[];await browser.evaluate('document.querySelector("#key-2").focus()');
 for(let i=0;i<12;i++){await browser.key('Tab');const id=await browser.evaluate('document.activeElement?.id');focused.push(id);if(id==='start-comparison')break;}
 await equal(name+' native Tab reaches Start',focused.at(-1),'start-comparison');
 const focusCapture=await screenshot(name+'-start-focus.png','#draft-form');
 await browser.key('Enter');await waitFor(async()=>!(await state()).hidden,name+' native Enter starts');
 let current=await state();await equal(name+' Start announces focused results',current.focused,'results-title');
 for(const algorithm of ['insertion','selection']){
  await equal(name+' initial '+algorithm+' counts',current[algorithm].counts,{comparisons:0,exchanges:0});
  await check(name+' initial '+algorithm+' controls',current[algorithm].back&&!current[algorithm].next&&!current[algorithm].final);
 }
 const original=JSON.parse(JSON.stringify(current));
 await browser.activate('[data-algorithm="insertion"] [data-action="next"]');current=await state();
 await equal(name+' insertion advances one key decision',current.insertion.counts,{comparisons:1,exchanges:0});
 await equal(name+' selection remains independent',current.selection,original.selection);
 await browser.activate('[data-algorithm="insertion"] [data-action="back"]');
 await equal(name+' Back restores exact initial trace',(await state()).insertion,original.insertion);
 await browser.activate('[data-algorithm="insertion"] [data-action="next"]');
 const partial=await state(),input=[{key:2,label:'A'},{key:2,label:'B'},{key:1,label:'C'}];
 const exported=await currentJSON(name+'-partial-view-complete-comparison',input),after=await state();
 await equal(name+' download preserves displayed insertion state',after.insertion,partial.insertion);
 await equal(name+' download preserves displayed selection state',after.selection,partial.selection);
 await check(name+' complete file includes future final states',exported.comparison.algorithms.insertion.steps.at(-1).kind==='complete'&&exported.comparison.algorithms.selection.steps.at(-1).kind==='complete');
 await finalBoth();current=await state();
 await equal(name+' insertion final identity order',current.insertion.records.map(x=>x.id),['record-3','record-1','record-2']);
 await equal(name+' selection final identity order',current.selection.records.map(x=>x.id),['record-3','record-2','record-1']);
 await equal(name+' insertion exact final counts',current.insertion.counts,{comparisons:3,exchanges:2});
 await equal(name+' selection exact final counts',current.selection.counts,{comparisons:3,exchanges:1});
 await check(name+' observed change and guarantees stay distinct',current.insertion.tie.includes('Order preserved')&&current.selection.tie.includes('Order changed')&&current.selection.guarantee.includes('no general stability guarantee'));
 for(const algorithm of ['insertion','selection'])await check(name+' final '+algorithm+' controls',!current[algorithm].back&&current[algorithm].next&&current[algorithm].final);
 const finalCapture=await screenshot(name+'-crossing-final.png','#results-title');
 await browser.activate('#restart-steps');current=await state();
 await equal(name+' restart both initial counts',[current.insertion.counts,current.selection.counts],[{comparisons:0,exchanges:0},{comparisons:0,exchanges:0}]);
 await browser.replace('#label-0','');current=await state();
 await check(name+' invalid label retires old successful run',current.hidden&&current.display==='none'&&current.downloadDisabled&&current.restartDisabled&&current.startDisabled&&!current.lessonDisabled);
 const lesson=await actualDownload('#download-lesson',name+'-lesson-from-invalid-draft','.json');
 await equal(name+' exact checked-in lesson bytes',lesson.sha256,oracle.courseSha256);
 if(!selectedCoursePath){selectedCoursePath=path.join(out,'downloaded-stable-sorting.json');await fs.writeFile(selectedCoursePath,lesson.bytesValue,{flag:'wx'});}
 if(full){
  await preset('crossing');await start();
  const invalid=['','01','-01','00','-00','+1','+0','1.0','1e0','0x10','Infinity','NaN','--1','１００','١','-100','100'];
  for(const raw of invalid){await browser.replace('#key-0',raw);const s=await state();await check('raw key rejected '+JSON.stringify(raw),s.startDisabled&&s.downloadDisabled&&s.hidden&&s.draftStatus.length>0);}
  for(const raw of ['0','-0','-99','99',' 2 ']){await browser.replace('#key-0',raw);await check('canonical key admitted '+JSON.stringify(raw),!(await state()).startDisabled);}
  await browser.replace('#label-0','😀'.repeat(17));await check('34-unit label rejected',(await state()).startDisabled);
  await browser.replace('#label-0','😀'.repeat(16));await check('32-unit label admitted',!(await state()).startDisabled);
  await preset('crossing');await start();await browser.activate('#add-record');
  await check('adding a row retires run',(await state()).hidden&&(await state()).downloadDisabled);
  for(let n=4;n<8;n++)await browser.activate('#add-record');
  current=await state();await equal('maximum row count',current.draft.length,8);await check('Add disabled at eight',current.addDisabled);await start();
  for(let n=8;n>2;n--)await browser.activate('[data-remove="0"]');
  current=await state();await equal('minimum row count',current.draft.length,2);await check('Remove disabled at two and old run retired',current.draft.every(r=>r.removeDisabled)&&current.hidden&&current.downloadDisabled);
  await preset('crossing');await browser.replace('#label-0','<b>same</b>');await browser.replace('#label-1','<b>same</b>');await browser.replace('#label-2','😀');
  await start();await finalBoth();current=await state();
  await equal('duplicate visible labels keep identities',current.selection.records.map(r=>r.id),['record-3','record-2','record-1']);
  await equal('literal labels are not parsed HTML',await browser.evaluate('document.querySelectorAll(".record-label b").length'),0);
  await equal('literal label retained',current.insertion.records.map(r=>r.label),['😀','<b>same</b>','<b>same</b>']);
  const narrow=await screenshot('modular-literal-ties-390.png','#results-title',390,844);
  const dims=await browser.evaluate('({viewport:innerWidth,width:document.documentElement.scrollWidth,panels:[...document.querySelectorAll("[data-algorithm]")].map(e=>{const r=e.getBoundingClientRect();return{left:r.left,right:r.right}})})');
  await check('390px panels remain within viewport',dims.width<=390&&dims.panels.every(r=>r.left>=0&&r.right<=390),dims);
  await browser.command('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false});
  await preset('ordered');await check('preset retires run',(await state()).hidden&&(await state()).downloadDisabled);await start();await finalBoth();current=await state();
  await check('all-distinct reports no tied-key experiment',current.insertion.tie.includes('no tied keys to compare')&&current.selection.tie.includes('no tied keys to compare'));
  await equal('ordered five counts',[current.insertion.counts,current.selection.counts],[{comparisons:4,exchanges:0},{comparisons:10,exchanges:0}]);
  await preset('equal');await start();await finalBoth();current=await state();
  await check('all-equal observation does not upgrade selection guarantee',current.selection.tie.includes('Order preserved')&&current.selection.guarantee.includes('no general stability guarantee'));
  await equal('all-equal counts',[current.insertion.counts,current.selection.counts],[{comparisons:3,exchanges:0},{comparisons:6,exchanges:0}]);
  await save('modular-final-state.json',{current,narrow,dimensions:dims});
 }
 const storage=await browser.storage();await check(name+' no page persistence writes',storage.calls.length===0,storage.calls);
 if(url.startsWith('file:')){
  const requests=browser.requests.slice(requestStart);
  await check(name+' no page HTTP request',requests.every(r=>!/^https?:/.test(r.url)),requests);
  await equal(name+' no blocked remote asset request',browser.blockedRequests.length,blockedStart);
 }
 const record={name,url,completeComparisonSha256:exported.receipt.sha256,courseSha256:lesson.sha256,focusPath:focused,captures:[focusCapture,finalCapture]};
 surfaces.push(record);return record;
}
async function question(practice=false){
 return browser.evaluate(`(()=>{const root=document.querySelector('#session-content');return{prompt:root.querySelector('h2')?.textContent,step:document.querySelector('#step-count').textContent,
 choices:[...root.querySelectorAll(${JSON.stringify(practice?'[data-practice-choice]':'[data-choice]')})].map((e,position)=>{const clone=e.cloneNode(true);clone.querySelector('.choice-key')?.remove();return{position,text:clone.textContent,disabled:e.disabled,classes:[...e.classList]};})};})()`);
}
async function review(){
 return browser.evaluate(`(()=>{const root=document.querySelector('#session-content');return{summary:root.querySelector('#first-try-summary')?.textContent,step:document.querySelector('#step-count').textContent,
 mastery:root.querySelector('.mastery-box')?.innerHTML,practiceStatus:root.querySelector('#practice-status')?.textContent??null,
 items:[...root.querySelectorAll('.review-item')].map(e=>({prompt:e.querySelector('.review-prompt').textContent,status:e.querySelector('.review-status').textContent,
 answers:Object.fromEntries([...e.querySelectorAll('.review-answers > div')].map(d=>[d.querySelector('dt').textContent,d.querySelector('dd').textContent])),
 explanation:e.querySelector('.review-body > p').textContent,practice:e.querySelector('.review-practice-answer')?.textContent??null}))};})()`);
}
async function notes(label,practiced){
 const d=await actualDownload('#save-notes-button',label,'.txt'),text=d.bytesValue.toString('utf8');
 await check(label+' title and preserved first score',text.startsWith('RecallWeave — study notes\n'+oracle.title+'\n')&&text.includes('\n11 of 12 connections correct on the first try.\n'));
 const body=text.split('\nREVIEW THE CONNECTIONS\n')[1]?.split('\nDECK ATTRIBUTION\n')[0];assert(body);
 const headers=[...body.matchAll(/^(\d+)\. (.+)$/gm)],items=[];await equal(label+' all twelve first records',headers.length,12);
 for(let i=0;i<headers.length;i++){
  const header=headers[i],end=headers[i+1]?.index??body.length,lines=body.slice(header.index,end).trimEnd().split('\n'),expected=byPrompt.get(header[2]);assert(expected,'known notes prompt');
  const fields=Object.fromEntries(lines.slice(1).filter(x=>x.includes(': ')).map(line=>{const at=line.indexOf(': ');return[line.slice(0,at),line.slice(at+2)];}));
  await equal(label+' first answer '+expected.id,fields['Your first answer'],expected.firstText);
  await equal(label+' correct answer '+expected.id,fields['Correct answer'],expected.correctText);
  await equal(label+' first result '+expected.id,fields['First try'],expected.firstCorrect?'correct':'needs review');
  await equal(label+' explanation '+expected.id,fields.Explanation,expected.explanation);
  await equal(label+' transfer '+expected.id,fields['Apply the idea'],expected.transfer);
  if(expected.id===oracle.intentionalMiss){
   await equal(label+' retry '+expected.id,fields['Practice answer'],practiced?expected.correctText:'not recorded.');
   await equal(label+' retry result '+expected.id,fields['Practice result'],practiced?'correct on retry':undefined);
  }else await equal(label+' no invented retry '+expected.id,fields['Practice answer'],undefined);
  items.push({id:expected.id,fields});
 }
 await equal(label+' all twelve identities by unique prompts',items.map(x=>x.id).sort(),oracle.items.map(x=>x.id).sort());
 await check(label+' exact attribution and license',text.includes('\nDECK ATTRIBUTION\n'+course.attribution+'\n'+course.license+'\n'));
 return{sha256:d.sha256,items,mastery:text.split('\nESTIMATED MASTERY — MODEL STATE, NOT A GRADE\n')[1]?.split('\nPRACTICE\n')[0]};
}
async function learner(){
 await browser.navigate(browser.base+'/index.html');await ready('#deck-file','actual current learner picker');
 const before=await browser.evaluate('document.querySelector("#session-content").innerHTML');
 const {root}=await browser.command('DOM.getDocument',{depth:0}),{nodeId}=await browser.command('DOM.querySelector',{nodeId:root.nodeId,selector:'#deck-file'});
 await browser.command('DOM.setFileInputFiles',{nodeId,files:[selectedCoursePath]});
 await waitFor(()=>browser.evaluate('!document.querySelector("#deck-preview").hidden&&Boolean(document.querySelector("#start-deck"))'),'downloaded lesson preview');
 const preview=await browser.evaluate(`(()=>{const p=document.querySelector('#deck-preview'),f=document.querySelector('#deck-file').files[0];return{title:p.querySelector('h3').textContent,count:p.querySelector('.deck-preview-count').textContent,
 prompts:[...p.querySelectorAll('ol li strong')].map(e=>e.textContent),file:{name:f.name,size:f.size},session:document.querySelector('#session-content').innerHTML};})()`);
 await equal('actual downloaded file selected',preview.file,{name:'downloaded-stable-sorting.json',size:(await fs.stat(selectedCoursePath)).size});
 await equal('picker exact course title',preview.title,oracle.title);await equal('picker all twelve prompts',preview.prompts,oracle.items.map(x=>x.prompt));
 await equal('preview does not start or replace current session',preview.session,before);await check('preview count is twelve',preview.count.includes('12 questions'));
 await browser.activate('#start-deck');await ready('[data-choice]:not(:disabled)','explicit imported learner start');await equal('new session starts at zero',(await question()).step,'0 / 12');
 const seen=new Set(),answers=[];
 for(let count=0;count<12;count++){
  const q=await question(),expected=byPrompt.get(q.prompt);await check('known unique first-session question '+(count+1),expected&&!seen.has(expected.id),expected?.id??q.prompt);seen.add(expected.id);
  const matches=q.choices.filter(x=>x.text===expected.firstText);await equal('blind intended choice present once '+expected.id,matches.length,1);
  if(expected.id==='stable-sort-two-keys'){
   await screenshot('learner-question-390.png','#session-content',390,844);
   const dims=await browser.evaluate('({viewport:innerWidth,width:document.documentElement.scrollWidth})');await check('long lesson prompt and options fit390px',dims.width<=390,dims);
   await browser.command('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false});
  }
  await at('[data-choice]',matches[0].position);await ready('#next-button','feedback '+expected.id);
  const after=await question(),feedback=await browser.evaluate('document.querySelector("#feedback-slot").textContent');
  await equal('first progress '+expected.id,after.step,(count+1)+' / 12');await check('answers locked '+expected.id,after.choices.every(x=>x.disabled));
  await equal('correct text agrees with blind answer '+expected.id,after.choices.filter(x=>x.classes.includes('correct')).map(x=>x.text),[expected.correctText]);
  await check('worked explanation and transfer rendered '+expected.id,feedback.includes(expected.explanation)&&feedback.includes(expected.transfer));
  answers.push({id:expected.id,first:expected.firstText,correct:expected.firstCorrect});
  await browser.activate('#next-button');if(count<11)await ready('[data-choice]:not(:disabled)','next imported question');
 }
 await equal('all twelve first-session identities',Array.from(seen).sort(),oracle.items.map(x=>x.id).sort());await ready('#first-try-summary','completed first review');
 const initial=await review();await check('one deliberate miss preserved',initial.summary.includes('11 of 12 connections on the first try'));await equal('all twelve review cards',initial.items.length,12);
 for(const item of initial.items){
  const expected=byPrompt.get(item.prompt);assert(expected);
  await equal('review original answer '+expected.id,item.answers['Your first answer'],expected.firstText);
  await equal('review correct answer '+expected.id,item.answers['Correct answer'],expected.correctText);await equal('review explanation '+expected.id,item.explanation,expected.explanation);
 }
 const firstNotes=await notes('learner-first-study-notes',false);
 await browser.activate('#practice-button');await ready('[data-practice-choice]','practice of one miss');
 const miss=byId.get(oracle.intentionalMiss),q=await question(true);await equal('practice only the intended missed question',q.prompt,miss.prompt);await equal('practice starts separate progress',q.step,'0 / 1');
 const correct=q.choices.find(x=>x.text===miss.correctText);assert(correct);await at('[data-practice-choice]',correct.position);await ready('#practice-next','practice feedback');
 const feedback=await browser.evaluate('document.querySelector("#practice-feedback").textContent');await check('practice explains the blind correct answer',feedback.includes(miss.correctText)&&feedback.includes(miss.explanation));
 await browser.activate('#practice-next');await ready('#first-try-summary','review after practice');
 const final=await review();await equal('practice preserves first accuracy',final.summary,initial.summary);await equal('practice preserves initial model',final.mastery,initial.mastery);
 const wrong=final.items.find(x=>x.prompt===miss.prompt);await check('first miss remains distinct from successful retry',wrong.status==='Needs review · first try'&&wrong.practice.includes('correct on retry')&&wrong.practice.endsWith(miss.correctText));
 const finalNotes=await notes('learner-final-study-notes',true);await equal('notes keep original model estimates',finalNotes.mastery,firstNotes.mastery);
 const pos=final.items.findIndex(x=>x.prompt===miss.prompt);await at('.review-item > summary',pos);const capture=await screenshot('learner-original-miss-and-correct-retry.png','.review-item[open]');
 const storage=await browser.storage();await check('learner remains without page persistence',storage.calls.length===0,storage.calls);
 await save('learner-receiving.json',{preview,answers,initial,final,notes:[firstNotes,finalNotes],capture,selectedCourseSha256:sha(await fs.readFile(selectedCoursePath))});
 return{questions:12,firstCorrect:11,practiceCorrect:1,notes:2,capture};
}
try{
 await sourceCheck();assert.equal(sha(await fs.readFile(path.join(reviewRoot,'consumer-expectations.json'))),'0ff97d963139796028625b9bddf4265b6929cbdb0f7a4547b02919dcb75624b6');
 await save('browser-driver-freeze.json',{recordedAt:new Date().toISOString(),driverSha256:sha(await fs.readFile(fileURLToPath(import.meta.url))),transportSha256:sha(await fs.readFile(path.join(reviewRoot,'browser-transport-v2.mjs'))),sourceManifestSha256:sha(await fs.readFile(sourceManifestPath)),courseSha256:oracle.courseSha256,coreSha256:'32ccd75596b35f4509b898562c27b8e47638764ad5008fee0d269c77284769b3',node:process.version,contractFreeze:'c8a2c175d353435f415724749a4b228a10c977f77b66a276710c7f53097b1652'});
 browser=await startBrowser(project,out);await save('browser-version.json',browser.version);
 await group('modular explorer input, traces, literal rendering and actual artifacts',()=>explorer('modular',browser.base+'/stable-sorting/index.html',true));
 await group('standalone file explorer and exact complete artifact parity',()=>explorer('standalone',pathToFileURL(path.join(project,'stable-sorting.html')).href,false));
 await equal('modular and standalone comparison bytes identical',surfaces[0].completeComparisonSha256,surfaces[1].completeComparisonSha256);await equal('modular and standalone lesson bytes identical',surfaces[0].courseSha256,surfaces[1].courseSha256);
 await group('actual downloaded lesson through current learner and notes',learner);
 await check('all routes without runtime exceptions',browser.pageErrors.length===0,browser.pageErrors);await check('no attempted external page assets',browser.blockedRequests.length===0,browser.blockedRequests);
 await sourceCheck();
}catch(e){
 error={name:e.name,message:e.message,stack:e.stack,phase};
 if(browser)try{await save('failure-page.json',await browser.evaluate('({url:document.URL,title:document.title,body:document.body.innerText})'));await browser.screenshot('failure-page.png');}catch(capture){error.capture=capture.message;}
 console.log(JSON.stringify({state:'fail',error}));
}finally{
 if(browser)try{cleanup=await browser.close();}catch(e){error??={};error.cleanup=e.message;}
 let sourcePreserved=false;try{await sourceCheck();sourcePreserved=true;}catch(e){error??={};error.sourceCustody=e.message;}
 const result={schema:'chatgpt.independent-sorting-browser-review.v1',startedAt,completedAt:new Date().toISOString(),status:error?'fail':'pass',groups,
 checks:{total:checks.length,passed:checks.filter(x=>x.pass).length,failed:checks.filter(x=>!x.pass).length},surfaces,downloads:downloadReceipts,
 sourceManifestSha256:sha(await fs.readFile(sourceManifestPath)),sourceFiles:sourceFiles.length,sourceRoot:project,sourcePreserved,
 sourceFeature:'a2b7e7abbccb18f1354feb4e7c744b5202107da0',receivingHead:sourceManifest.head,receivingParent:sourceManifest.parent,receivingTree:sourceManifest.tree,
 courseSha256:oracle.courseSha256,coreSha256:'32ccd75596b35f4509b898562c27b8e47638764ad5008fee0d269c77284769b3',cleanup,error:error??null,
 limits:['Own isolated synthetic educational inputs; no account or personal profile.','Course answers were frozen before keyed source access; author test bodies were not read.','Actual browser .json/.txt downloads were read; comparison JSON is not a restore format.','Standalone page HTTP observations do not claim whole Chromium process zero network.','Exact frozen source/current learner composition only, not a whole repository build or another parent.']};
 await save('result.json',result);console.log(JSON.stringify({status:result.status,groups:groups.length,checks:result.checks,downloads:downloadReceipts.length,out,error:error?.message}));
 if(error)process.exitCode=1;
}
})();
