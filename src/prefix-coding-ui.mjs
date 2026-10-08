import { buildCode, encodeSymbols, decodeBits, serializeExample } from './prefix-coding.mjs';
export function mountPrefixExplorer(doc) {
  const get = id => doc.getElementById(id);
  const presets = {
    uneven: [['A',8],['B',3],['C',2],['D',1]],
    equal: [['A',1],['B',1],['C',1],['D',1]],
    skewed: [['A',20],['B',2],['C',1],['D',1]]
  };
  let model = null, step = 0, decoded = null;
  const urls = new Set();
  function element(tag, text, className) {
    const node = doc.createElement(tag);
    if (text !== undefined) node.textContent = String(text);
    if (className) node.className = className;
    return node;
  }
  function readRows() {
    return Array.from(get('symbol-rows').children, row => ({
      symbol: row.querySelector('[data-field="symbol"]').value,
      count: Number(row.querySelector('[data-field="count"]').value)
    }));
  }
  function showError(id, message) {
    get(id).textContent = message;
    get(id).hidden = !message;
  }
  function renderInputs(rows, focusIndex) {
    const fragment = doc.createDocumentFragment();
    rows.forEach((row, index) => {
      const wrap = element('div', undefined, 'symbol-row');
      const symbolLabel = element('label', 'Symbol ' + (index + 1));
      symbolLabel.htmlFor = 'symbol-' + index;
      const symbol = element('textarea'); symbol.rows = 1;
      symbol.id = 'symbol-' + index; symbol.dataset.field = 'symbol';
      symbol.value = row.symbol; symbol.autocomplete = 'off'; symbol.spellcheck = false;
      symbol.setAttribute('aria-describedby','symbol-help');
      symbolLabel.append(symbol);
      const countLabel = element('label', 'Count ' + (index + 1));
      countLabel.htmlFor = 'count-' + index;
      const count = element('input');
      count.id = 'count-' + index; count.dataset.field = 'count';
      count.type = 'number'; count.min = '1'; count.max = '10000'; count.step = '1';
      count.value = String(row.count); count.setAttribute('inputmode','numeric');
      countLabel.append(count);
      const remove = element('button', '×', 'remove');
      remove.type = 'button'; remove.setAttribute('aria-label','Remove symbol ' + (index + 1));
      remove.disabled = rows.length <= 2;
      remove.addEventListener('click', () => {
        const current = readRows(); current.splice(index,1);
        get('example-select').value = '';
        renderInputs(current,Math.min(index,current.length-1)); rebuild();
      });
      wrap.append(symbolLabel,countLabel,remove); fragment.append(wrap);
    });
    get('symbol-rows').replaceChildren(fragment);
    get('add-symbol').disabled = rows.length >= 8;
    if (focusIndex !== undefined) get('symbol-' + focusIndex).focus();
  }
  function clearDerived() {
    for (const id of ['queue','codebook','tree-svg','decode-trace']) get(id).replaceChildren();
    for (const id of ['payload-bits','fixed-payload-bits','average-bits']) get(id).textContent = '—';
    get('cost-note').textContent = 'Repair the inputs to build a new codebook.';
    get('step-status').textContent = 'Waiting for valid symbol counts';
    get('merge-description').textContent = '';
    get('decoder-result').textContent = '';
    get('decoder-status').textContent = 'Enter valid symbol counts first.';
    for (const id of ['step-back','step-next','step-reset','step-all','decode-button','sample-bits','download-example']) get(id).disabled = true;
  }
  function descendants(id) {
    const node = model.nodes[id];
    return node.symbol !== null ? [node.symbol] : descendants(node.left).concat(descendants(node.right));
  }
  function queueAtStep() { return step === 0 ? model.steps[0].before : model.steps[step-1].after; }
  function svgNode(tag, attrs, text) {
    const node = doc.createElementNS('http://www.w3.org/2000/svg',tag);
    for (const [key,value] of Object.entries(attrs || {})) node.setAttribute(key,String(value));
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function renderTree(queue) {
    const svg = get('tree-svg'); svg.replaceChildren();
    const positions = new Map(); let cursor = 0, depthMax = 0;
    function place(id, depth) {
      const node = model.nodes[id]; depthMax = Math.max(depthMax,depth);
      let x;
      if (node.symbol !== null) x = 60 + cursor++ * 110;
      else { place(node.left,depth+1); place(node.right,depth+1); x = (positions.get(node.left).x + positions.get(node.right).x)/2; }
      positions.set(id,{x,y:42+depth*84});
    }
    queue.forEach(id => place(id,0));
    const width = Math.max(300,cursor*110+10), height = depthMax*84+110;
    svg.setAttribute('viewBox','0 0 '+width+' '+height);
    svg.style.width = width+'px'; svg.style.height = height+'px';
    svg.append(svgNode('title',{id:'tree-title'},step === 0 ? 'Separate symbol trees before merging' : 'Code forest after merge '+step));
    function describe(id) {
      const n=model.nodes[id];
      return n.symbol!==null ? JSON.stringify(n.symbol)+' count '+n.weight :
        'count '+n.weight+', zero to ('+describe(n.left)+'), one to ('+describe(n.right)+')';
    }
    svg.append(svgNode('desc',{id:'tree-description'},queue.map(describe).join('; ')));
    for (const [id,pos] of positions) {
      const n=model.nodes[id];
      if(n.symbol!==null)continue;
      for (const [child,bit] of [[n.left,'0'],[n.right,'1']]) {
        const p=positions.get(child);
        svg.append(svgNode('path',{d:'M'+pos.x+','+(pos.y+17)+' L'+p.x+','+(p.y-22),class:'tree-edge'}));
        svg.append(svgNode('text',{x:(pos.x+p.x)/2+(bit==='0'?-9:9),y:(pos.y+p.y)/2+3,class:'edge-bit','text-anchor':'middle'},bit));
      }
    }
    for (const [id,pos] of positions) {
      const n=model.nodes[id],g=svgNode('g',{'data-node-id':id});
      g.append(svgNode('title',{},(n.symbol===null?'Combined tree':JSON.stringify(n.symbol))+' · count '+n.weight));
      if(n.symbol===null) {
        g.append(svgNode('circle',{cx:pos.x,cy:pos.y,r:23,class:'tree-parent'}));
        g.append(svgNode('text',{x:pos.x,y:pos.y+5,'text-anchor':'middle',class:'node-count'},String(n.weight)));
      } else {
        g.append(svgNode('rect',{x:pos.x-44,y:pos.y-25,width:88,height:56,rx:10,class:'tree-leaf'}));
        const chars=Array.from(n.symbol),label=chars.slice(0,7).join('')+(chars.length>7?'…':'');
        g.append(svgNode('text',{x:pos.x,y:pos.y-3,'text-anchor':'middle',class:'leaf-label'},JSON.stringify(label)));
        g.append(svgNode('text',{x:pos.x,y:pos.y+18,'text-anchor':'middle',class:'leaf-count'},String(n.weight)));
      }
      svg.append(g);
    }
  }
  function renderStep() {
    const queue=queueAtStep(),fragment=doc.createDocumentFragment();
    queue.forEach((id,index)=>{
      const node=model.nodes[id],tr=element('tr');
      tr.dataset.nodeId=String(id);tr.dataset.weight=String(node.weight);
      tr.append(element('td',JSON.stringify(descendants(id)),'tree-symbols'),element('td',node.weight,'numeric'));
      tr.append(element('td',queue.length>1&&index<2?'Next pair':'',queue.length>1&&index<2?'next-pair':''));
      fragment.append(tr);
    });
    get('queue').replaceChildren(fragment);
    get('step-status').textContent=step===0?'Before merging · '+queue.length+' trees':'Merge '+step+' of '+model.steps.length+' · '+queue.length+(queue.length===1?' tree':' trees');
    if(step===0) get('merge-description').textContent='Combine the two smallest current counts. Each new parent adds one bit to every occurrence below it.';
    else {
      const s=model.steps[step-1];
      get('merge-description').textContent='Combined '+JSON.stringify(descendants(s.left))+' ('+model.nodes[s.left].weight+') and '+JSON.stringify(descendants(s.right))+' ('+model.nodes[s.right].weight+'). This merge adds '+s.addedCost+' payload bits; all merges so far add '+s.accumulatedCost+'.';
    }
    get('step-back').disabled=step===0;get('step-reset').disabled=step===0;
    get('step-next').disabled=step===model.steps.length;get('step-all').disabled=step===model.steps.length;
    renderTree(queue);get('download-status').textContent='';
  }
  function renderCodebook() {
    const f=doc.createDocumentFragment();
    for(const row of model.codebook) {
      const tr=element('tr');tr.dataset.symbol=row.symbol;
      for(const [value,cls] of [[JSON.stringify(row.symbol),'literal'],[row.count,'numeric'],[row.code,'bits'],[row.length,'numeric'],[row.cost,'numeric']]) tr.append(element('td',value,cls));
      f.append(tr);
    }
    get('codebook').replaceChildren(f);
    const t=model.totals;
    get('payload-bits').textContent=String(t.payloadBits);
    get('fixed-payload-bits').textContent=String(t.fixedPayloadBits);
    get('average-bits').textContent=t.payloadBits+' / '+t.totalCount+' ≈ '+t.averageBits.toFixed(4);
    get('cost-note').textContent=t.totalCount+' symbol occurrences · '+t.savedPayloadBits+' fewer payload bits than a '+t.fixedWidth+'-bit fixed-width symbol code. Codebook and framing costs are excluded.';
  }
  function renderDecoded() {
    get('decoder-result').textContent=JSON.stringify(decoded.symbols);
    const f=doc.createDocumentFragment();
    for(const segment of decoded.segments) f.append(element('li','Bits '+(segment.start+1)+'–'+segment.end+': '+segment.code+' → '+JSON.stringify(segment.symbol)));
    get('decode-trace').replaceChildren(f);
    get('decoder-status').textContent=decoded.bits.length===0?'Empty stream · no symbols.':decoded.bits.length+' bits decoded completely into '+decoded.symbols.length+' symbols.';
    get('download-example').disabled=false;
  }
  function decode() {
    if(!model)return;
    try { decoded=decodeBits(model.rows,get('bits').value);showError('decode-error','');renderDecoded(); }
    catch(error) { decoded=null;get('decoder-result').textContent='';get('decode-trace').replaceChildren();get('decoder-status').textContent='This stream has not been decoded completely.';showError('decode-error',error.message);get('download-example').disabled=true; }
    get('download-status').textContent='';
  }
  function rebuild() {
    step=0;decoded=null;get('bits').value='';showError('decode-error','');get('download-status').textContent='';
    try { model=buildCode(readRows());showError('input-error','');renderCodebook();renderStep();get('decode-button').disabled=false;get('sample-bits').disabled=false;decode(); }
    catch(error) { model=null;clearDerived();showError('input-error',error.message); }
  }
  function download(text,name,statusId) {
    let url;
    try {
      url=URL.createObjectURL(new Blob([text],{type:'application/json;charset=utf-8'}));urls.add(url);
      const a=element('a');a.href=url;a.download=name;a.hidden=true;doc.body.append(a);a.click();a.remove();
      get(statusId).textContent='Download requested: '+name;
      setTimeout(()=>{URL.revokeObjectURL(url);urls.delete(url);},1000);
    } catch(error) {
      if(url){URL.revokeObjectURL(url);urls.delete(url);}
      get(statusId).textContent='The file could not be prepared. Try again. '+error.message;
    }
  }
  get('symbol-rows').addEventListener('input',()=>{get('example-select').value='';rebuild();});
  get('add-symbol').addEventListener('click',()=>{
    const rows=readRows();if(rows.length>=8)return;
    const used=new Set(rows.map(x=>x.symbol));let n=1;while(used.has('Symbol '+n))n++;
    rows.push({symbol:'Symbol '+n,count:1});get('example-select').value='';renderInputs(rows,rows.length-1);rebuild();
  });
  get('example-select').addEventListener('change',()=>{
    if(!presets[get('example-select').value])return;
    renderInputs(presets[get('example-select').value].map(([symbol,count])=>({symbol,count})));rebuild();
  });
  for(const [id,target] of [['step-back',()=>step-1],['step-next',()=>step+1],['step-reset',()=>0],['step-all',()=>model.steps.length]]) get(id).addEventListener('click',()=>{
    if(!model)return;step=Math.max(0,Math.min(model.steps.length,target()));renderStep();
  });
  get('bits').addEventListener('input',()=>{
    decoded=null;get('decoder-result').textContent='';get('decode-trace').replaceChildren();showError('decode-error','');
    get('decoder-status').textContent='Edited stream · choose Decode bits to check it.';get('download-example').disabled=true;get('download-status').textContent='';
  });
  get('decode-button').addEventListener('click',decode);
  get('sample-bits').addEventListener('click',()=>{
    if(!model)return;
    get('bits').value=encodeSymbols(model.rows,model.rows.map(r=>r.symbol)).bits;decode();
  });
  get('download-example').addEventListener('click',()=>{
    if(!model||!decoded)return;
    try { download(serializeExample(model.rows,step,get('bits').value),'prefix-coding-example.json','download-status'); }
    catch(error) { showError('decode-error',error.message);get('download-example').disabled=true; }
  });
  get('download-course').addEventListener('click',()=>download(LESSON_JSON,'prefix-coding.json','course-download-status'));
  get('download-course').disabled=false;
  globalThis.addEventListener('pagehide',()=>{for(const url of urls)URL.revokeObjectURL(url);urls.clear();},{once:true});
  renderInputs(presets.uneven.map(([symbol,count])=>({symbol,count})));rebuild();
}
mountPrefixExplorer(document);
