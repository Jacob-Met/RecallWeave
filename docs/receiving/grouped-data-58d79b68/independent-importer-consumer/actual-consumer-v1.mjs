await (async function receiver(){
const assert=(await import('node:assert/strict')).default;
const {readFile,writeFile,appendFile,mkdir,stat}=await import('node:fs/promises');
const {createHash}=await import('node:crypto');
const {join,dirname}=await import('node:path');
const {pathToFileURL}=await import('node:url');
const {startBrowser,waitFor}=await import('./browser-transport-pinned-v2.mjs');
const home=dirname(process.argv[1]),out=join(home,'run-v1'),project=join(home,'candidate');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const oracle=JSON.parse(await readFile(join(home,'consumer-expectations.json'),'utf8'));
const course=JSON.parse(await readFile(join(home,'grouped-data.json'),'utf8'));
const byPrompt=new Map(oracle.items.map(item=>[item.prompt,item]));
const courseById=new Map(course.items.map(item=>[item.id,item]));
const checks=[],surfaces=[],startedAt=new Date().toISOString();
let browser,cleanup,error;
await mkdir(out);
async function save(name,value){await writeFile(join(out,name),typeof value==='string'?value:JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o444});}
async function check(name,condition,detail){
 const entry={name,pass:Boolean(condition),...(detail===undefined?{}:{detail})};checks.push(entry);
 await appendFile(join(out,'events.jsonl'),JSON.stringify(entry)+'\n');
 if(!condition)throw Error('Independent control failed: '+name+' '+JSON.stringify(detail??''));
}
async function equal(name,actual,expected){await check(name,JSON.stringify(actual)===JSON.stringify(expected),JSON.stringify(actual)===JSON.stringify(expected)?undefined:{actual,expected});}
async function at(selector,index=0){
 const focused=await browser.evaluate('(()=>{const n=document.querySelectorAll('+JSON.stringify(selector)+')['+index+'];if(!n)return false;n.focus();return document.activeElement===n;})()');
 assert(focused,'Cannot focus observed control '+selector+'['+index+']');
 await browser.key('Enter');
}
async function ready(selector,label){return waitFor(()=>browser.evaluate('Boolean(document.querySelector('+JSON.stringify(selector)+'))'),label);}
async function snapshot(){
 return browser.evaluate(`(()=>{
   const root=document.querySelector('#session-content'),track=document.querySelector('[role="progressbar"]');
   return {sessionHTML:root.innerHTML,stepLabel:document.querySelector('#step-label').textContent,stepCount:document.querySelector('#step-count').textContent,
     progress:{value:track.getAttribute('aria-valuenow'),max:track.getAttribute('aria-valuemax'),label:track.getAttribute('aria-label')},
     title:document.title,description:document.querySelector('#lesson-description').textContent,lessonSize:document.querySelector('#lesson-size').textContent,
     traceHTML:document.querySelector('#trace-archive').innerHTML};
 })()`);
}
async function question(practice=false){
 return browser.evaluate(`(()=>{
   const root=document.querySelector('#session-content'),selector=${JSON.stringify(practice?'[data-practice-choice]':'[data-choice]')};
   return {prompt:root.querySelector('h2')?.textContent,step:document.querySelector('#step-count').textContent,
    choices:[...root.querySelectorAll(selector)].map((button,position)=>{const clone=button.cloneNode(true);clone.querySelector('.choice-key')?.remove();
      return {position,text:clone.textContent,canonical:Number(button.getAttribute(${JSON.stringify(practice?'data-practice-choice':'data-choice')})),key:button.querySelector('.choice-key')?.textContent,disabled:button.disabled,classes:[...button.classList]};})};
 })()`);
}
async function selectCourse(label){
 const {root}=await browser.command('DOM.getDocument',{depth:0});
 const {nodeId}=await browser.command('DOM.querySelector',{nodeId:root.nodeId,selector:'#deck-file'});
 assert(nodeId,'Missing actual file input');
 await browser.command('DOM.setFileInputFiles',{nodeId,files:[join(home,'grouped-data.json')]});
 await waitFor(()=>browser.evaluate('!document.querySelector("#deck-preview").hidden && Boolean(document.querySelector("#start-deck"))'),label+' preview loaded');
 const preview=await browser.evaluate(`(()=>{const p=document.querySelector('#deck-preview'),f=document.querySelector('#deck-file').files[0];
   return {title:p.querySelector('h3').textContent,count:p.querySelector('.deck-preview-count').textContent,
     prompts:[...p.querySelectorAll('ol li strong')].map(x=>x.textContent),attribution:p.querySelector('.deck-preview-attribution').textContent,
     license:p.querySelector('.deck-preview-license').textContent,replacementNote:p.querySelector('.deck-replace-note').textContent,
     file:{name:f.name,size:f.size},status:document.querySelector('#deck-status').textContent};
 })()`);
 await equal(label+' exact physical course selected',preview.file,{name:'grouped-data.json',size:(await stat(join(home,'grouped-data.json'))).size});
 await equal(label+' preview title',preview.title,oracle.title);
 await equal(label+' preview all twelve independent prompts',preview.prompts,oracle.items.map(x=>x.prompt));
 await check(label+' preview count and explicit replacement warning',preview.count.includes('12 questions')&&preview.replacementNote.includes('Starting this deck replaces the current session'));
 await check(label+' supplied attribution and license',preview.attribution.endsWith(course.attribution)&&preview.license.endsWith(course.license));
 return preview;
}
async function currentReview(expandAll=false){
 if(expandAll){
  const n=await browser.evaluate('document.querySelectorAll(".review-item > summary").length');
  for(let i=0;i<n;i++)await at('.review-item > summary',i);
 }
 return browser.evaluate(`(()=>{
  const root=document.querySelector('#session-content');
  return {summary:root.querySelector('#first-try-summary')?.textContent,masteryHTML:root.querySelector('.mastery-box')?.innerHTML,
    practiceStatus:root.querySelector('#practice-status')?.textContent??null,practiceButton:root.querySelector('#practice-button')?.textContent??null,
    step:document.querySelector('#step-count').textContent,items:[...root.querySelectorAll('.review-item')].map(node=>{
       const answers=Object.fromEntries([...node.querySelectorAll('.review-answers > div')].map(div=>[div.querySelector('dt').textContent,div.querySelector('dd').textContent]));
       const transfer=node.querySelector('.review-transfer').cloneNode(true);transfer.querySelector('strong')?.remove();
       return {prompt:node.querySelector('.review-prompt').textContent,status:node.querySelector('.review-status').textContent,open:node.open,answers,
         explanation:node.querySelector('.review-body > p').textContent,transfer:transfer.textContent.trimStart(),practice:node.querySelector('.review-practice-answer')?.textContent??null};
    })};
 })()`);
}
async function verifyReview(label,value,practiceComplete,expectOpen){
 await check(label+' first count remains 11 of 12',value.summary.includes('11 of 12 connections on the first try'));
 await equal(label+' first-session progress',value.step,'12 / 12');
 await equal(label+' all twelve review prompts unique',new Set(value.items.map(x=>x.prompt)).size,12);
 for(const item of value.items){
  const expected=byPrompt.get(item.prompt);
  await check(label+' recognized review prompt',Boolean(expected),expected?{id:expected.id}:item.prompt);
  if(expectOpen)await check(label+' question opened through keyboard '+expected.id,item.open);
  await equal(label+' original answer '+expected.id,item.answers['Your first answer'],expected.firstText);
  await equal(label+' correct text '+expected.id,item.answers['Correct answer'],expected.correctText);
  await equal(label+' first status '+expected.id,item.status,(expected.firstCorrect?'Correct':'Needs review')+' · first try');
  await equal(label+' explanation '+expected.id,item.explanation,expected.explanation);
  await equal(label+' transfer '+expected.id,item.transfer,expected.transfer);
  if(practiceComplete&&expected.id===oracle.intentionalMiss){
   await check(label+' separate correct retry',item.practice?.includes('correct on retry')&&item.practice.endsWith(expected.correctText));
  }else await equal(label+' no unexpected practice '+expected.id,item.practice,null);
 }
}
async function downloadAndReceive(label,practiceComplete){
 const prior=new Set(browser.downloads.keys());
 await browser.activate('#save-notes-button');
 const observed=await waitFor(()=>[...browser.downloads.values()].find(x=>!prior.has(x.guid)&&x.state==='completed'),label+' actual download complete');
 const raw=await readFile(join(browser.downloadPath,observed.guid)),text=raw.toString('utf8');
 await save(label+'.txt',text);
 const timestamp=text.match(/^Saved: (.+)$/m)?.[1];
 await check(label+' actual nonempty text download',raw.length>100&&observed.suggestedFilename.endsWith('.txt')&&observed.receivedBytes===raw.length,{guid:observed.guid,suggestedFilename:observed.suggestedFilename,bytes:raw.length});
 await check(label+' saved timestamp and filename',Boolean(timestamp)&&Number.isFinite(Date.parse(timestamp))&&observed.suggestedFilename===('recallweave-study-notes-'+timestamp.slice(0,10)+'.txt'));
 await check(label+' course and first count',text.startsWith('RecallWeave — study notes\n'+oracle.title+'\n')&&text.includes('\n11 of 12 connections correct on the first try.\n'));
 await check(label+' model/first-practice boundaries disclosed',text.includes('This count describes this session; it is not a measure of your ability.')&&text.includes('Practice does not change the first-session estimates.')&&text.includes('Practice follows the explanations and is recorded separately from the first answers.'));
 await check(label+' practice status',text.includes(practiceComplete?'Complete: 1 of 1 practice answers recorded; 1 correct on retry.':'Not started. 1 missed connection is available for practice.'));
 const body=text.split('\nREVIEW THE CONNECTIONS\n')[1]?.split('\nDECK ATTRIBUTION\n')[0];
 assert(body,'Missing readable notes review section');
 const headers=[...body.matchAll(/^(\d+)\. (.+)$/gm)],records=[];
 await equal(label+' twelve exported first records',headers.length,12);
 for(let i=0;i<headers.length;i++){
  const header=headers[i],end=headers[i+1]?.index??body.length,lines=body.slice(header.index,end).trimEnd().split('\n'),prompt=header[2],expected=byPrompt.get(prompt);
  await check(label+' known unique prompt record',Boolean(expected),expected?{id:expected.id}:prompt);
  const fields=Object.fromEntries(lines.slice(1).filter(x=>x.includes(': ')).map(line=>{const j=line.indexOf(': ');return [line.slice(0,j),line.slice(j+2)];}));
  await equal(label+' ordinal '+expected.id,Number(header[1]),i+1);
  await equal(label+' concept '+expected.id,fields.Concept,expected.concept);
  await equal(label+' original choice '+expected.id,fields['Your first answer'],expected.firstText);
  await equal(label+' original correctness '+expected.id,fields['First try'],expected.firstCorrect?'correct':'needs review');
  await equal(label+' canonical correct choice '+expected.id,fields['Correct answer'],expected.correctText);
  await equal(label+' explanation '+expected.id,fields.Explanation,expected.explanation);
  await equal(label+' transfer '+expected.id,fields['Apply the idea'],expected.transfer);
  if(expected.id===oracle.intentionalMiss){
    await equal(label+' missed-item retry text',fields['Practice answer'],practiceComplete?expected.correctText:'not recorded.');
    await equal(label+' missed-item retry status',fields['Practice result'],practiceComplete?'correct on retry':undefined);
  }else{
    await equal(label+' no invented retry '+expected.id,fields['Practice answer'],undefined);
    await equal(label+' no invented retry result '+expected.id,fields['Practice result'],undefined);
  }
  records.push({oracleId:expected.id,identityMethod:'exact unique prompt; notes format emits no item ID',prompt,fields});
 }
 await equal(label+' no omitted or duplicated identities',records.map(x=>x.oracleId).sort(),oracle.items.map(x=>x.id).sort());
 await check(label+' exact supplied attribution and license',text.includes('\nDECK ATTRIBUTION\n'+course.attribution+'\n'+course.license+'\n'));
 const masteryBlock=text.split('\nESTIMATED MASTERY — MODEL STATE, NOT A GRADE\n')[1].split('\nPRACTICE\n')[0];
 const receipt={name:label,guid:observed.guid,downloadEvent:observed,sha256:sha(raw),bytes:raw.length,filename:label+'.txt',rawDownloadFile:join('downloads',observed.guid),savedAt:timestamp,format:'plain text',formatEmitsItemIds:false,practiceComplete,records,masteryBlock};
 await save(label+'-receiving.json',receipt);
 return receipt;
}
async function receiveSurface(name,url){
 const result={name,url,sourceHead:'7bd6f10eb76939ab51abdd54c003b1e4fd8eb8dd',importerParent:'9b69c9c1dcc578d45e58d9b7f78eecb0613d76f3'};
 await browser.navigate(url);
 await ready('#trace-archive button',name+' complete learner mount');
 await browser.activate('#start-button');
 await ready('[data-choice]',name+' bundled unfinished start');
 const bundled=await question();
 await check(name+' bundled lesson starts separately',!byPrompt.has(bundled.prompt)&&bundled.choices.length>0);
 await at('[data-choice]',0);
 await ready('#next-button',name+' bundled first answer');
 const prior=await snapshot();
 await equal(name+' nonempty unfinished session established',prior.stepCount,'1 / 6');
 result.bundledBeforePreview=prior;
 result.firstPreview=await selectCourse(name+' first');
 await equal(name+' preview leaves unfinished session byte-exact',await snapshot(),prior);
 await browser.evaluate('document.querySelector("#deck-preview").scrollIntoView({block:"center"})');
 await browser.screenshot(name+'-unfinished-preview.png');
 await browser.activate('#cancel-deck');
 await check(name+' cancel hides only preview',await browser.evaluate('document.querySelector("#deck-preview").hidden && document.querySelector("#deck-file").value === ""'));
 await equal(name+' cancel preserves answered question/progress/model/context',await snapshot(),prior);
 await browser.activate('#next-button');
 await ready('[data-choice]:not(:disabled)',name+' next bundled question');
 const priorStart=await snapshot();
 await equal(name+' old session still has one answer',priorStart.stepCount,'1 / 6');
 result.secondPreview=await selectCourse(name+' second');
 await equal(name+' second preview still preserves unfinished session',await snapshot(),priorStart);
 await browser.activate('#start-deck');
 await ready('[data-choice]:not(:disabled)',name+' imported explicit start');
 const afterStart=await question();
 await check(name+' explicit Start changes to actual course',byPrompt.has(afterStart.prompt));
 await equal(name+' explicit Start resets first progress',afterStart.step,'0 / 12');
 await check(name+' preview cleared after explicit Start',await browser.evaluate('document.querySelector("#deck-preview").hidden'));
 result.answers=[];
 const seen=new Set();
 for(let count=0;count<12;count++){
  const before=await question(),expected=byPrompt.get(before.prompt);
  await check(name+' scheduled known unique item '+(count+1),Boolean(expected)&&!seen.has(expected.id),expected?{id:expected.id}:before);
  seen.add(expected.id);
  const rawItem=courseById.get(expected.id);
  await equal(name+' every displayed option retained '+expected.id,[...before.choices.map(x=>x.text)].sort(),[...rawItem.options].sort());
  for(const c of before.choices)await equal(name+' visible option canonical identity '+expected.id+' '+c.position,c.text,rawItem.options[c.canonical]);
  const choices=before.choices.filter(x=>x.text===expected.firstText);
  await equal(name+' intended visible first choice is unique '+expected.id,choices.length,1);
  await equal(name+' independent first choice canonical index '+expected.id,choices[0].canonical,expected.firstIndex);
  await at('[data-choice]',choices[0].position);
  await ready('#next-button',name+' feedback '+expected.id);
  const after=await question(),feedback=await browser.evaluate('document.querySelector("#feedback-slot").textContent');
  await equal(name+' first progress '+expected.id,after.step,(count+1)+' / 12');
  await check(name+' answer locks actual controls '+expected.id,after.choices.every(x=>x.disabled));
  await equal(name+' highlighted canonical correction '+expected.id,after.choices.filter(x=>x.classes.includes('correct')).map(x=>x.text),[expected.correctText]);
  await equal(name+' intended wrong selection classification '+expected.id,after.choices.filter(x=>x.classes.includes('incorrect')).map(x=>x.text),expected.firstCorrect?[]:[expected.firstText]);
  await check(name+' explanation/transfer in feedback '+expected.id,feedback.includes(expected.explanation)&&feedback.includes(expected.transfer));
  result.answers.push({id:expected.id,prompt:before.prompt,firstText:expected.firstText,firstCorrect:expected.firstCorrect,before,after,feedback});
  await browser.activate('#next-button');
  if(count<11)await ready('[data-choice]:not(:disabled)',name+' next imported question');
 }
 await equal(name+' all twelve initial item identities',Array.from(seen).sort(),oracle.items.map(x=>x.id).sort());
 await ready('#first-try-summary',name+' completed initial trace');
 result.initialReview=await currentReview(true);
 await verifyReview(name+' initial review',result.initialReview,false,true);
 result.firstNotes=await downloadAndReceive(name+'-first-study-notes',false);
 await browser.activate('#practice-button');
 await ready('[data-practice-choice]',name+' missed-item practice');
 const practiceBefore=await question(true),miss=oracle.items.find(x=>x.id===oracle.intentionalMiss);
 await equal(name+' only intended missed question offered',practiceBefore.prompt,miss.prompt);
 await equal(name+' no retry recorded on opening practice',practiceBefore.step,'0 / 1');
 await browser.activate('#back-to-review');
 await ready('#first-try-summary',name+' paused trace');
 const paused=await currentReview();
 await equal(name+' pausing keeps original first count',paused.summary,result.initialReview.summary);
 await equal(name+' pausing keeps original model',paused.masteryHTML,result.initialReview.masteryHTML);
 await check(name+' explicit paused resume state',paused.practiceStatus.includes('Practice paused: 0 of 1 answered')&&paused.practiceButton.includes('Resume practice'));
 await browser.activate('#practice-button');
 await ready('[data-practice-choice]',name+' resumed practice');
 const resumed=await question(true);
 await equal(name+' resume keeps same unanswered miss',resumed.prompt,miss.prompt);
 const retry=resumed.choices.filter(x=>x.text===miss.correctText);
 await equal(name+' canonical retry visible once',retry.length,1);
 await equal(name+' retry canonical index',retry[0].canonical,miss.correctIndex);
 await at('[data-practice-choice]',retry[0].position);
 await ready('#practice-next',name+' retry feedback');
 const retryFeedback=await browser.evaluate('document.querySelector("#practice-feedback").textContent');
 await check(name+' retry explains correct independent answer',retryFeedback.includes(miss.correctText)&&retryFeedback.includes(miss.explanation)&&retryFeedback.includes(miss.transfer));
 await equal(name+' one separate completed practice answer',(await question(true)).step,'1 / 1');
 await browser.activate('#practice-next');
 await ready('#first-try-summary',name+' final trace');
 result.finalReview=await currentReview();
 await verifyReview(name+' final review',result.finalReview,true,false);
 await equal(name+' practice preserves original model estimates',result.finalReview.masteryHTML,result.initialReview.masteryHTML);
 await equal(name+' practice never rewrites original accuracy',result.finalReview.summary,result.initialReview.summary);
 await check(name+' practice completes exactly once',result.finalReview.practiceStatus.includes('1 of 1 correctly on retry')&&result.finalReview.practiceButton===null);
 result.finalNotes=await downloadAndReceive(name+'-final-study-notes',true);
 await equal(name+' notes retain exact original model block',result.finalNotes.masteryBlock,result.firstNotes.masteryBlock);
 await equal(name+' notes retain all twelve original choices',result.finalNotes.records.map(x=>({id:x.oracleId,choice:x.fields['Your first answer'],status:x.fields['First try']})),result.firstNotes.records.map(x=>({id:x.oracleId,choice:x.fields['Your first answer'],status:x.fields['First try']})));
 const missPosition=result.finalReview.items.findIndex(x=>x.prompt===miss.prompt);
 await at('.review-item > summary',missPosition);
 await browser.evaluate('document.querySelector(".review-item[open]").scrollIntoView({block:"center"})');
 await browser.screenshot(name+'-preserved-first-miss-and-retry.png');
 result.storage=await browser.storage();
 await check(name+' no page persistence or upload calls observed',result.storage.calls.length===0,result.storage.calls);
 await save(name+'-surface-result.json',result);
 surfaces.push({name,url,firstAnswers:12,firstCorrect:11,intentionalMiss:miss.id,practiceAnswers:1,practiceCorrect:1,notes:[{name:result.firstNotes.name,sha256:result.firstNotes.sha256},{name:result.finalNotes.name,sha256:result.finalNotes.sha256}],state:'pass'});
 console.log(JSON.stringify({surface:name,state:'pass',firstAnswers:12,firstCorrect:11,practiceCorrect:1,checks:checks.length}));
}
try{
 const source=JSON.parse(await readFile(join(home,'source-freeze.json'),'utf8'));
 for(const file of source.files)assert.equal(sha(await readFile(join(project,file.path))),file.sha256,file.path+' source drift');
 assert.equal(sha(await readFile(join(home,'grouped-data.json'))),oracle.courseSha256);
 assert.equal(sha(await readFile(join(home,'consumer-expectations.json'))),'ac81bdd27162528517989a9a32cf92640c2df41abe9b27364a00562242a7bf99');
 await save('harness-freeze.json',{createdAt:new Date().toISOString(),harnessSha256:sha(await readFile(process.argv[1])),transportSha256:sha(await readFile(join(home,'browser-transport-pinned-v2.mjs'))),sourceFreezeSha256:sha(await readFile(join(home,'source-freeze.json'))),controlFreezeSha256:sha(await readFile(join(home,'consumer-control-freeze.json'))),courseSha256:oracle.courseSha256,answerOracle:'previous blind independent canonical texts; initial one-miss scenario frozen before current app internals',node:process.version,surfaces:['loopback modular index.html','file standalone demo.html'],notesBoundary:'Only actual UI .txt notes; item identity is checked through unique canonical prompts, not a nonexistent export ID field.'});
 browser=await startBrowser(project,out);
 await save('browser-version.json',browser.version);
 await receiveSurface('modular',browser.base+'/index.html');
 await receiveSurface('standalone',pathToFileURL(join(project,'demo.html')).href);
 await check('both routes no page runtime exception',browser.pageErrors.length===0,browser.pageErrors);
 await check('both routes no blocked remote page request',browser.blockedRequests.length===0,browser.blockedRequests);
 for(const file of source.files)assert.equal(sha(await readFile(join(project,file.path))),file.sha256,file.path+' final source drift');
}catch(e){
 error={name:e.name,message:e.message,stack:e.stack};
 console.log(JSON.stringify({state:'failed',error}));
 if(browser){
  try{await save('failure-page.json',await browser.evaluate('({url:document.URL,title:document.title,body:document.body.innerText,html:document.querySelector("#session-content")?.innerHTML})'));await browser.screenshot('failure-page.png');}catch(capture){error.captureError=capture.message;}
 }
}finally{
 if(browser){try{cleanup=await browser.close();}catch(e){error??={};error.cleanupError=e.message;}}
 const result={schema:'chatgpt.actual-course-consumer-receiving.v1',startedAt,completedAt:new Date().toISOString(),state:error?'failed':'pass',sourceHead:'7bd6f10eb76939ab51abdd54c003b1e4fd8eb8dd',importerParent:'9b69c9c1dcc578d45e58d9b7f78eecb0613d76f3',courseSha256:oracle.courseSha256,checks:{total:checks.length,passed:checks.filter(x=>x.pass).length,failed:checks.filter(x=>!x.pass)},surfaces,cleanup,error:error??null,limitations:['Own component/consumer data only; no account or personal profile','No source mutation or importer repair','Notes carry exact prompt text, not explicit item IDs','Observed page network/storage calls do not prove whole Chromium process zero network','This receives current in-memory preview/Start behavior, not unfinished-session save/resume proposal #21/PR37']};
 await save('result.json',result);
 console.log(JSON.stringify(result,null,2));if(error)process.exitCode=1;
}
})();
