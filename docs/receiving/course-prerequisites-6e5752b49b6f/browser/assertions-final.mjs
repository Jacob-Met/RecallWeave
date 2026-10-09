import assert from 'node:assert/strict';

export function snapshotPage() {
  const one = id => {
    const el = document.getElementById(id);
    if (!el) throw new Error('Missing public region ' + id);
    return el;
  };
  const text = id => one(id).textContent;
  const geom = el => {
    const style = getComputedStyle(el), r = el.getBoundingClientRect();
    return {tag:el.tagName,id:el.id,text:el.textContent,rect:{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height},
      display:style.display,visibility:style.visibility,opacity:style.opacity,whiteSpace:style.whiteSpace,
      overflowX:style.overflowX,overflowY:style.overflowY,clientWidth:el.clientWidth,scrollWidth:el.scrollWidth,
      clientHeight:el.clientHeight,scrollHeight:el.scrollHeight,rectCount:el.getClientRects().length,
      inReview:!!el.closest('#review'),ancestors:[...function*(n){while(n){yield n;n=n.parentElement;}}(el)].map(n=>{
        const s=getComputedStyle(n),r=n.getBoundingClientRect();return{tag:n.tagName,id:n.id,hidden:n.hidden===true,
          display:s.display,visibility:s.visibility,opacity:s.opacity,overflowX:s.overflowX,overflowY:s.overflowY,
          closedDetails:n.tagName==='DETAILS'&&!n.open&&el!==n.querySelector('summary'),
          rect:{left:r.left,right:r.right,top:r.top,bottom:r.bottom}};})};
  };
  const buttons = host => [...host.querySelectorAll('button[data-select-concept]')].map(b=>({
    index:Number(b.dataset.selectConcept),text:b.textContent,disabled:b.disabled,pressed:b.getAttribute('aria-pressed')}));
  const questions = host => [...host.querySelectorAll('[data-question-index]')].map(q=>({
    index:Number(q.dataset.questionIndex),label:q.querySelector('.question-label')?.textContent,
    prompt:q.querySelector('.prompt')?.textContent,
    paragraphs:[...q.querySelectorAll('p')].map(p=>p.textContent)}));
  const edges = id => [...one(id).querySelectorAll('[data-link-from][data-link-to]')].map(e=>({
    prerequisiteIndex:Number(e.dataset.linkFrom),conceptIndex:Number(e.dataset.linkTo),
    heading:e.querySelector('h4')?.textContent,buttons:buttons(e),questions:questions(e),
    summary:e.querySelector('summary')?.textContent,open:e.querySelector('details')?.open}));
  const paths = id => [...one(id).querySelectorAll('[data-path-to][data-path]')].map(p=>({
    index:Number(p.dataset.pathTo),path:p.dataset.path.split(',').map(Number),
    summary:p.querySelector('summary')?.textContent,open:p.open,
    steps:[...p.querySelectorAll('.path-step')].map(s=>({heading:s.querySelector('h4')?.textContent,questions:questions(s)}))}));
  const visible = [...document.querySelectorAll('#course-title,#course-attribution,#course-license,#source-filename,#source-bytes,#source-sha256,#selected-concept,#selection-summary,#review-status,#review button,#review summary,#review .question-label,#review .prompt,#review h4,#course-file,#clear-course,#download-review')]
    .map(geom);
  return {
    url:location.href,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,bodyHeight:document.body.scrollHeight,
    labels:{file:document.querySelector('label[for="course-file"]')?.textContent,clear:text('clear-course'),download:text('download-review')},
    state:{hidden:one('review').hidden,busy:one('review').getAttribute('aria-busy'),clearDisabled:one('clear-course').disabled,
      downloadDisabled:one('download-review').disabled,inputValue:one('course-file').value,inputFiles:one('course-file').files.length,
      status:text('review-status'),focus:document.activeElement?.id??'',selectionDisabled:buttons(one('review')).map(b=>b.disabled)},
    course:{title:text('course-title'),attribution:text('course-attribution'),license:text('course-license')},
    source:{filename:text('source-filename'),bytes:text('source-bytes'),sha256:text('source-sha256')},
    overview:[...one('concept-overview').children].map(li=>({button:buttons(li)[0],info:li.querySelector('p')?.textContent})),
    selected:text('selected-concept'),summary:text('selection-summary'),directPrerequisites:edges('direct-prerequisites'),directDependents:edges('direct-dependents'),
    required:buttons(one('required-concepts')),downstream:buttons(one('downstream-concepts')),
    requirementPaths:paths('requirement-paths'),dependentPaths:paths('dependent-paths'),questions:questions(one('selected-questions')),
    bodyText:document.body.textContent,visible,
    dangerous:[...document.querySelectorAll('img,iframe,frame,object,embed,svg,math,base,audio,video,form,script[src],link')].map(e=>e.outerHTML),
    activeAttrs:[...document.querySelectorAll('*')].flatMap(el=>[...el.attributes].filter(a=>/^on/i.test(a.name)||['src','srcset','action','formaction','poster'].includes(a.name)).map(a=>({tag:el.tagName,name:a.name,value:a.value}))),
    scriptCount:document.scripts.length,
    csp:[...document.querySelectorAll('meta[http-equiv]')].map(e=>({name:e.httpEquiv,content:e.content})),
    hooks:globalThis.__rwReceiving.snapshot()
  };
}

export function verifySurface(d, width) {
  assert.equal(d.width,width);
  assert.ok(d.scrollWidth<=width+1,'document horizontal overflow');
  assert.deepEqual(d.labels,{file:'Choose a course JSON file',clear:'Clear review',download:'Download review JSON'});
  assert.equal(d.scriptCount,1,'one original standalone script');
  assert.deepEqual(d.dangerous,[]);assert.deepEqual(d.activeAttrs,[]);
  assert.ok(d.csp.some(x=>x.name.toLowerCase()==='content-security-policy'&&/default-src\s+'none'/.test(x.content)));
  assert.ok(!d.csp.some(x=>x.name.toLowerCase()==='refresh'));
  assert.ok(!/PRIVATE-(?:OPTION|ANSWER|EXPLANATION|TRANSFER)/.test(d.bodyText),'no private course fields in DOM');
  assert.deepEqual(d.hooks.storageWrites,[],'no automatic storage writes');
  for(const f of d.visible){
    if(d.state.hidden&&f.inReview)continue;
    assert.ok(f.rectCount>0,'required field has layout '+f.id+' '+f.tag);
    for(const a of f.ancestors){assert.equal(a.hidden,false,'required field has hidden ancestor '+a.id);assert.equal(a.closedDetails,false,'required witness details must be open');assert.notEqual(a.display,'none','required field has display:none ancestor '+a.id);assert.notEqual(a.visibility,'hidden');assert.ok(Number(a.opacity)>0,'required field has transparent ancestor '+a.id);if(['hidden','clip'].includes(a.overflowX))assert.ok(f.rect.left>=a.rect.left-1&&f.rect.right<=a.rect.right+1,'ancestor horizontal clipping '+a.id);if(['hidden','clip'].includes(a.overflowY))assert.ok(f.rect.top>=a.rect.top-1&&f.rect.bottom<=a.rect.bottom+1,'ancestor vertical clipping '+a.id);}
    assert.ok(f.rect.width>0&&f.rect.height>0,'visible '+f.id+' '+f.tag);
    assert.notEqual(f.display,'none');assert.notEqual(f.visibility,'hidden');assert.ok(Number(f.opacity)>0);
    assert.ok(f.rect.left>=-1&&f.rect.right<=width+1,'within viewport '+f.id+' '+f.text.slice(0,80));
    assert.ok(f.scrollWidth<=f.clientWidth+1,'horizontal text clipping '+f.id+' '+f.text.slice(0,80));
    assert.ok(f.scrollHeight<=f.clientHeight+1,'vertical text clipping '+f.id+' '+f.text.slice(0,80));
    assert.notEqual(f.overflowY,'hidden');assert.notEqual(f.overflowX,'hidden');
    if(f.tag!=='INPUT'&&/[\r\n\t]| {2}/.test(f.text))assert.ok(['pre-wrap','break-spaces'].includes(f.whiteSpace),'literal whitespace '+f.id);
  }
}
export function verifyEmpty(d,width,{pending=false}={}) {
  verifySurface(d,width);assert.equal(d.state.hidden,true);assert.equal(d.state.busy,String(pending));
  assert.equal(d.state.downloadDisabled,true);assert.equal(d.state.clearDisabled,!pending);
  assert.deepEqual(d.course,{title:'',attribution:'',license:''});assert.deepEqual(d.source,{filename:'',bytes:'',sha256:''});
  for(const key of ['overview','directPrerequisites','directDependents','required','downstream','requirementPaths','dependentPaths','questions'])assert.deepEqual(d[key],[],key+' empty');
  assert.equal(d.selected,'');assert.equal(d.summary,'');
}
export function verifyReview(d,e,source,width,{pending=false,open=true}={}) {
  verifySurface(d,width);assert.equal(d.state.hidden,false);assert.equal(d.state.busy,String(pending));
  assert.equal(d.state.clearDisabled,false);assert.equal(d.state.downloadDisabled,pending);
  assert.ok(d.state.selectionDisabled.every(x=>x===pending),'all selection controls reflect pending state');
  assert.deepEqual(d.course,e.course);assert.deepEqual(d.source,{...source,bytes:String(source.bytes)});
  const label=i=>'Source concept '+(i+1)+': '+e.concepts[i].name;
  const question=(i,selected=false)=>{const q=e.questions[i],base={index:i,label:'Question '+(i+1)+' · ID: '+q.id,prompt:q.prompt};
    return {...base,paragraphs:[base.label,q.prompt,...(selected?[q.prerequisiteIndices.length?'Authored prerequisites, in original order: '+q.prerequisiteIndices.map(label).join(' · '):'This question declares no prerequisites.']:[])]};};
  const button=(i,pressed=null)=>({index:i,text:label(i),disabled:pending,pressed});
  assert.deepEqual(d.overview,e.concepts.map(c=>({button:button(c.index,String(c.index===e.selection.index)),
    info:c.questionIndices.length+(c.questionIndices.length===1?' question':' questions')+' · '+c.directPrerequisites.length+' direct requirements · structural depth '+c.level})));
  const selected=e.concepts[e.selection.index];assert.equal(d.selected,label(selected.index));
  assert.equal(d.summary,selected.questionIndices.length+(selected.questionIndices.length===1?' original question':' original questions')+' · structural depth '+selected.level+'. Depth counts the longest declared prerequisite chain; it is not a teaching order or mastery score.');
  const edge=l=>({prerequisiteIndex:l.prerequisiteIndex,conceptIndex:l.conceptIndex,
    heading:label(l.conceptIndex)+' requires '+label(l.prerequisiteIndex),buttons:[button(l.prerequisiteIndex),button(l.conceptIndex)],
    questions:l.questionIndices.map(i=>question(i)),summary:l.questionIndices.length+(l.questionIndices.length===1?' original question declares this link':' original questions declare this link'),open});
  assert.deepEqual(d.directPrerequisites,e.links.filter(l=>l.conceptIndex===selected.index).map(edge));
  assert.deepEqual(d.directDependents,e.links.filter(l=>l.prerequisiteIndex===selected.index).map(edge));
  assert.deepEqual(d.required,selected.required.map(i=>button(i)));assert.deepEqual(d.downstream,selected.downstream.map(i=>button(i)));
  const chain=row=>({index:row.index,path:row.path,summary:row.path.map(label).join(' requires → '),open,
    steps:row.path.slice(0,-1).map((from,i)=>{const to=row.path[i+1],link=e.links.find(l=>l.conceptIndex===from&&l.prerequisiteIndex===to);assert.ok(link,'manual path has original edge');return{heading:label(from)+' requires '+label(to),questions:link.questionIndices.map(i=>question(i))};})});
  assert.deepEqual(d.requirementPaths,e.selection.requirementPaths.map(chain));assert.deepEqual(d.dependentPaths,e.selection.dependentPaths.map(chain));
  assert.deepEqual(d.questions,selected.questionIndices.map(i=>question(i,true)));
}
export function runSensitivityControls(d,e,source,width) {
  const mutations=[
    ['lost original witness',x=>x.directPrerequisites[0].questions.pop()],
    ['incorrect edge direction',x=>x.directPrerequisites[0].prerequisiteIndex=0],
    ['wrong path direction',x=>x.requirementPaths[0].path.reverse()],
    ['literal title trimmed',x=>x.course.title=x.course.title.trim()],
    ['stale source digest',x=>x.source.sha256='0'.repeat(64)],
    ['wrong source concept ordinal',x=>x.overview[0].button.text=x.overview[0].button.text.replace('1:','2:')],
    ['private answer payload',x=>x.bodyText+=' PRIVATE-ANSWER-leak'],
    ['hidden prompt',x=>{const f=x.visible.find(v=>v.tag==='P'&&v.text==='Finish first authored question');assert.ok(f);f.visibility='hidden';}],
    ['display none prompt',x=>{const f=x.visible.find(v=>v.tag==='P'&&v.text==='Finish first authored question');assert.ok(f);f.rectCount=0;f.display='none';}],
    ['hidden prompt ancestor',x=>{const f=x.visible.find(v=>v.tag==='P'&&v.text==='Finish first authored question');assert.ok(f);f.ancestors[0].hidden=true;}],
    ['transparent review ancestor',x=>{const f=x.visible.find(v=>v.id==='course-title');assert.ok(f);f.ancestors.find(a=>a.id==='review').opacity='0';}]
  ];
  return mutations.map(([name,mutate])=>{const x=structuredClone(d);mutate(x);assert.throws(()=>verifyReview(x,e,source,width));return{name,refused:true};});
}
