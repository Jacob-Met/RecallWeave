(() => {
 const el=id=>document.getElementById(id);
 const labels={observe:'Observe & reject',reject:'Reject', 'select-record':'Select record','select-last':'Select last (fallback)','not-observed':'Not observed'};
 let current=null;
 function cell(value, className=''){const td=document.createElement('td');td.textContent=String(value);td.className=className;return td;}
 function retire(message='Inputs changed. Run this order to replace the previous result.'){
  current=null;el('result').hidden=true;el('save-observation').disabled=true;el('print').disabled=true;el('status').className='status';el('status').textContent=message;
 }
 function download(name,text){
  const blob=new Blob([text],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
 }
 function parseInteger(text,name){if(!/^(0|[1-9][0-9]*)$/.test(text))throw new Error(name+' must be a nonnegative whole number, without signs or decimals.');return Number(text);}
 function render(r){
  el('chosen').textContent='Selected arrival '+r.selected.index+' · rank '+r.selected.rank;
  el('outcome').textContent=r.success?'Best overall selected':'Best overall missed';el('outcome').className='badge'+(r.success?'':' loss');
  el('applied').textContent='Applied n='+r.inputs.n+' · skip='+r.inputs.skip+' · order='+r.inputs.order.join(', ');
  el('arrivals').replaceChildren();el('trace').replaceChildren();
  for(const row of r.trace){
   const li=document.createElement('li');li.className='arrival'+(row.index===r.selected.index?' chosen':!row.observed?' unseen':'');
   const position=document.createElement('small');position.textContent='Arrival '+row.index;const rank=document.createElement('b');rank.textContent=String(row.rank);
   const action=document.createElement('small');action.textContent=labels[row.action];li.append(position,rank,action);el('arrivals').append(li);
   const tr=document.createElement('tr');tr.append(cell(row.index,'num'),cell(row.rank,'num'),cell(row.bestSeenBefore===null?'—':row.bestSeenBefore,'num'),cell(row.isRecord===null?'Not observed':row.isRecord?'Yes':'No'),cell(labels[row.action]));el('trace').append(tr);
  }
  el('table-heading').textContent='All '+r.uniform.totalPermutations+' orders for n='+r.inputs.n;
  el('best-skips').textContent='Best skip '+(r.uniform.bestSkips.length===1?'count':'counts')+' among these rules: '+r.uniform.bestSkips.join(', ')+'.';
  el('thresholds').replaceChildren();
  for(const row of r.uniform.thresholds){
   const tr=document.createElement('tr');if(r.uniform.bestSkips.includes(row.skip))tr.className='best';
   const chance=cell(row.fraction.numerator+'/'+row.fraction.denominator,'num'),bar=document.createElement('div'),fill=document.createElement('span');bar.className='bar';bar.setAttribute('aria-hidden','true');fill.style.width=(row.probability*100)+'%';bar.append(fill);chance.append(bar);
   tr.append(cell(row.skip,'num'),cell(row.wins+' / '+row.total,'num'),chance,cell((row.probability*100).toFixed(2)+'%','num'));el('thresholds').append(tr);
  }
  el('assumptions').replaceChildren(...r.assumptions.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
  el('result').hidden=false;el('save-observation').disabled=false;el('print').disabled=false;
  el('status').className='status';el('status').textContent='Applied. The trace and observation download use exactly the settings shown below.';
 }
 function run(){
  retire('Checking inputs…');
  try{
   const n=parseInteger(el('n').value,'n'),skip=parseInteger(el('skip').value,'Skip count'),text=el('order').value.trim();
   if(!text||text.length>64)throw new Error('Enter the complete order, at most 64 characters.');
   const order=text.split(/[\s,]+/).map(t=>parseInteger(t,'Each rank'));current=analyzeOrder(n,skip,order);render(current);
  }catch(error){el('status').className='status error';el('status').textContent=error.message;}
 }
 el('settings').addEventListener('submit',event=>{event.preventDefault();run();});
 for(const id of ['n','skip','order'])el(id).addEventListener('input',()=>retire());
 const presets={success:[5,2,'2,4,1,5,3'],early:[4,1,'1,3,4,2'],fallback:[4,1,'4,1,3,2'],tie:[2,0,'1,2'],single:[1,0,'1']};
 el('load').addEventListener('click',()=>{const [n,s,o]=presets[el('preset').value];el('n').value=n;el('skip').value=s;el('order').value=o;retire('Draft loaded. Select Run this order to apply it.');el('run').focus();});
 el('save-observation').addEventListener('click',()=>{if(current)download('optimal-stopping-observation.json',JSON.stringify(current,null,2)+'\n');});
 el('save-course').addEventListener('click',()=>download('optimal-stopping.json',COURSE_TEXT));
 el('print').addEventListener('click',()=>{if(current)window.print();});
 el('credit').textContent=JSON.parse(COURSE_TEXT).attribution+' '+JSON.parse(COURSE_TEXT).license;
 run();document.documentElement.dataset.ready='true';
})();
