import {solveEquilibrium,sampleExtent} from './chemical-equilibrium.mjs';

/** Native controls over one retained experiment; all visible text is literal DOM text. */
export function mountEquilibriumLab(root,assets) {
  const doc=root.ownerDocument||root;
  const $=selector=>root.querySelector(selector);
  const inputs={a:$('#input-a'),b:$('#input-b'),c:$('#input-c'),K:$('#input-k')};
  const slider=$('#extent-slider'),status=$('#input-status');
  const observations=$('#download-observation');
  let applied=null,inspected=null,dirty=true,scale=1;
  const rows=new Map();
  const examples={
    reactants:{a:'2',b:'2',c:'0',K:'1'},
    products:{a:'0',b:'0',c:'2',K:'1'},
    balanced:{a:'1',b:'1',c:'1',K:'1'},
    'add-a':{a:'2',b:'1',c:'1',K:'1'},
    boundary:{a:'2',b:'0',c:'0',K:'1'}
  };
  const n=s=>{const [a,b]=s.split('/');return Number(a)/Number(b);};
  const negate=s=>{const [a,b]=s.split('/');return (-BigInt(a)).toString()+'/'+b;};
  const decimal=s=>Number(n(s).toPrecision(12)).toString();
  function readable(s,estimate=false){
    const [a,b]=s.split('/');
    if(estimate)return '≈ '+decimal(s);
    if(b==='1')return a;
    if(a.length+b.length<=12)return a+'/'+b;
    return '≈ '+decimal(s);
  }
  function node(tag,text,className){
    const el=doc.createElement(tag);
    if(text!==undefined)el.textContent=text;
    if(className)el.className=className;
    return el;
  }
  function quotient(q){
    return q.kind==='finite'?readable(q.value):'Undefined: a reactant concentration is zero';
  }
  function message(direction){
    return {
      forward:'Net forward conversion is favored: A and B decrease while C increases.',
      reverse:'Net reverse conversion is favored: C decreases while A and B increase.',
      balanced:'The composition is balanced for this K. No net conversion is required.',
      no_feasible_change:'No feasible conversion is available. The quotient is undefined; this is not a claim that Q equals K.'
    }[direction];
  }
  function invalidate(){
    dirty=true;observations.disabled=true;slider.disabled=true;
    $('#result-panel').hidden=true;$('#inspection-panel').hidden=true;
    $('#exact-panel').replaceChildren(node('p','Apply a valid experiment to inspect its exact root bounds.'));
    status.className='status draft';status.textContent='Draft changed. Apply the complete experiment to calculate a current result.';
    $('#download-status').textContent='';
  }
  function bar(card,species,kind,label,value){
    const block=node('div',undefined,'bar-row'),line=node('div',undefined,'bar-label');
    const output=node('output',readable(value,kind==='equilibrium'&&applied.equilibrium.kind==='bracket'));
    output.id='value-'+species+'-'+kind;
    line.append(node('span',label),output);
    const track=node('div',undefined,'bar-track'),fill=node('div',undefined,'bar '+kind);
    fill.id='bar-'+species+'-'+kind;fill.style.width=(Math.max(0,Math.min(100,n(value)/scale*100)))+'%';
    track.setAttribute('aria-hidden','true');track.append(fill);block.append(line,track);card.append(block);
  }
  function updateInspection(){
    if(dirty||!applied)return;
    inspected=sampleExtent(applied.input,Number(slider.value));
    $('#inspected-extent').textContent=readable(inspected.extent);
    $('#inspected-quotient').textContent=quotient(inspected.quotient);
    $('#inspection-message').textContent=message(inspected.direction)+' This describes the selected feasible composition.';
    $('#inspection-marker').style.left=inspected.tick+'%';
    $('#extent-axis').setAttribute('aria-label','Allowed extent from '+readable(applied.feasible_extent.lower)+' to '+readable(applied.feasible_extent.upper)+'. Inspected extent '+readable(inspected.extent)+'. Calculated equilibrium '+readable(applied.equilibrium.extent.midpoint,applied.equilibrium.kind==='bracket')+'. This is not time.');
    for(const key of ['a','b','c']){
      const output=$('#value-'+key+'-inspected'),fill=$('#bar-'+key+'-inspected');
      if(output)output.textContent=readable(inspected[key]);
      if(fill)fill.style.width=Math.max(0,Math.min(100,n(inspected[key])/scale*100))+'%';
    }
    $('#inspection-panel').dataset.inspected=JSON.stringify(inspected);
  }
  function exactDetails(){
    const panel=$('#exact-panel'),e=applied.equilibrium;
    panel.replaceChildren();
    const note=applied.direction==='no_feasible_change'
      ?'The feasible interval has zero width. No conversion is possible, and the quotient remains undefined.'
      :e.kind==='exact'
        ?'An exact rational root was found. Its residual is exactly zero.'
        :'The unique root lies in the following exact interval. The midpoint is an estimate; 64 numerical refinements do not represent reaction time.';
    panel.append(node('p',note));
    for(const [label,value]of [['Extent lower bound',e.extent.lower],['Extent upper bound',e.extent.upper],['Extent midpoint',e.extent.midpoint],['Interval width',e.extent.width],['Residual at lower bound',e.residual.lower],['Residual at upper bound',e.residual.upper]]){
      const p=node('p');p.append(node('strong',label+': '),node('code',value));panel.append(p);
    }
    const cwrap=node('div',undefined,'table-wrap'),ctable=node('table');
    ctable.append(node('caption','Exact concentration bounds'));
    const cbody=node('tbody');
    for(const k of ['a','b','c']){const tr=node('tr'),head=node('th',k.toUpperCase());head.scope='row';tr.append(head);for(const field of ['lower','upper','midpoint']){const td=node('td');td.append(node('span',field+': '),node('code',e.concentrations[k][field]));tr.append(td);}cbody.append(tr);}
    ctable.append(cbody);cwrap.append(ctable);panel.append(cwrap);
    panel.append(node('p','A and B decrease with extent, so their concentration bounds reverse the extent-bound order. These are numerical bounds, not measurement uncertainty.','small muted'));
    const wrap=node('div',undefined,'table-wrap refinements'),table=node('table');
    table.append(node('caption','Complete retained interval refinement'));
    const head=node('thead'),hr=node('tr');
    for(const label of ['Step','Lower extent','Upper extent','Width','f(lower)','f(upper)'])hr.append(node('th',label));
    head.append(hr);table.append(head);const body=node('tbody');
    for(const item of applied.trace){const tr=node('tr');tr.append(node('th',String(item.step)));for(const key of ['lower','upper','width','residual_lower','residual_upper'])tr.append(node('td',item[key],'exact'));body.append(tr);}
    table.append(body);wrap.append(table);panel.append(wrap);
  }
  function render(){
    const estimate=applied.equilibrium.kind==='bracket',none=applied.direction==='no_feasible_change';
    $('#result-panel').hidden=false;$('#inspection-panel').hidden=false;
    $('#result-panel').dataset.applied=JSON.stringify(applied);
    $('#result-kind').textContent=none?'No feasible change':estimate?'Equilibrium bracket':'Exact equilibrium';
    $('#direction-message').textContent=message(applied.direction);
    $('#initial-quotient').textContent=quotient(applied.initial_quotient);
    $('#total-ac').textContent=readable(applied.conserved.a_plus_c);
    $('#total-bc').textContent=readable(applied.conserved.b_plus_c);
    $('#ice-table caption').textContent=none?'Initial, signed change, unchanged composition':'Initial, signed change, equilibrium';
    const body=$('#ice-rows');body.replaceChildren();
    for(const k of ['a','b','c']){
      const tr=node('tr'),th=node('th',k.toUpperCase());th.scope='row';
      const change=k==='c'?applied.equilibrium.extent.midpoint:negate(applied.equilibrium.extent.midpoint);
      tr.append(th,node('td',readable(applied.exact_inputs[k])),node('td',readable(change,estimate)),node('td',readable(applied.equilibrium.concentrations[k].midpoint,estimate)));body.append(tr);
    }
    $('#equilibrium-note').textContent=none
      ?'Only zero extent is feasible. A finite reaction quotient is not assigned to this boundary mixture.'
      :estimate
        ?'Equilibrium entries use the bracket midpoint and are approximate. The exact bounds and all component totals are retained below.'
        :'The signed extent and equilibrium entries above are exact rational values. Component totals remain unchanged.';
    scale=Math.max(1e-12,n(applied.conserved.a_plus_c),n(applied.conserved.b_plus_c));
    const cards=$('#species-bars');cards.replaceChildren();
    const p=sampleExtent(applied.input,Number(slider.value));
    for(const k of ['a','b','c']){
      const card=node('section',undefined,'species-card');card.append(node('h3','Species '+k.toUpperCase()));
      bar(card,k,'initial','Initial',applied.exact_inputs[k]);
      bar(card,k,'equilibrium',none?'Unchanged':estimate?'Equilibrium estimate':'Equilibrium',applied.equilibrium.concentrations[k].midpoint);
      bar(card,k,'inspected','Inspected',p[k]);cards.append(card);
    }
    const lower=n(applied.feasible_extent.lower),upper=n(applied.feasible_extent.upper);
    const fraction=upper===lower?0.5:(n(applied.equilibrium.extent.midpoint)-lower)/(upper-lower);
    $('#equilibrium-marker').style.left=Math.max(0,Math.min(100,fraction*100))+'%';
    $('#extent-lower').textContent='Lower: '+readable(applied.feasible_extent.lower);
    $('#extent-upper').textContent='Upper: '+readable(applied.feasible_extent.upper);
    exactDetails();updateInspection();
  }
  function apply(event){
    event?.preventDefault();
    try{
      const next=solveEquilibrium(Object.fromEntries(Object.entries(inputs).map(([k,el])=>[k,el.value])));
      applied=next;dirty=false;slider.disabled=false;observations.disabled=false;slider.value='50';
      render();status.className='status';status.textContent='Applied. The result and observation download belong to these inputs.';
      $('#download-status').textContent='';
    }catch(error){
      invalidate();status.className='status error';status.textContent='Experiment not applied. '+error.message;
    }
  }
  function download(text,filename,mediaType){
    const url=URL.createObjectURL(new Blob([text],{type:mediaType}));
    const a=node('a');a.href=url;a.download=filename;a.hidden=true;doc.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    $('#download-status').textContent='Download requested: '+filename+'.';
  }
  for(const el of Object.values(inputs))el.addEventListener('input',invalidate);
  $('#experiment-form').addEventListener('submit',apply);
  for(const el of root.querySelectorAll('[data-example]'))el.addEventListener('click',()=>{
    const example=examples[el.dataset.example];
    for(const [k,value]of Object.entries(example))inputs[k].value=value;
    invalidate();status.textContent='Example prepared as a draft. Select Apply experiment to calculate it.';
  });
  slider.addEventListener('input',updateInspection);
  observations.addEventListener('click',()=>{
    if(dirty||!applied||!inspected)return;
    download(JSON.stringify({schema:'recallweave-chemical-equilibrium-observation/1',experiment:applied,inspected},null,2)+'\n','chemical-equilibrium-observation.json','application/json;charset=utf-8');
  });
  $('#download-course').addEventListener('click',()=>download(assets.courseRaw,'chemical-equilibrium.json','application/json;charset=utf-8'));
  $('#download-guide').addEventListener('click',()=>download(assets.guideRaw,'chemical-equilibrium.md','text/markdown;charset=utf-8'));
  apply();
  return Object.freeze({getSnapshot:()=>dirty?null:structuredClone({experiment:applied,inspected})});
}
