/** Standalone UI. Core functions are embedded before this module by the builder. */
const matchingById = id => document.getElementById(id);
const matchingAssets = JSON.parse(matchingById('matching-assets').textContent);
let matchingTrace = null, matchingEventIndex = 0;
const matchingExamples = {
  trap: ['A B','X Y','A X\nA Y\nB X','A X'],
  chain: ['A B C','X Y Z','A X\nA Y\nB X\nC Y\nC Z','A X\nC Y'],
  shortage: ['A B C','X Y','A X\nB X\nC Y',''],
  isolated: ['A B','X Y','A X','']
};
const matchingKinds = {
  initial:'Starting matching', 'search-start':'Fresh search', dequeue:'Explore vertex',
  inspect:'Inspect arc', 'already-reached':'Already reached', discover:'Reach vertex',
  'path-found':'Augmenting path', augment:'Whole-path flip', maximum:'Maximum matching'
};
function matchingText(id, value) { matchingById(id).textContent = value; }
function matchingControlState() {
  const absent = !matchingTrace;
  for(const id of ['first-event','previous-event']) matchingById(id).disabled = absent || matchingEventIndex === 0;
  for(const id of ['next-event','last-event']) matchingById(id).disabled = absent || matchingEventIndex === matchingTrace.events.length-1;
  for(const id of ['event-slider','download-trace','check-prediction']) matchingById(id).disabled = absent;
}
function retireMatchingTrace(message = 'The graph has changed. Build a fresh trace to continue.') {
  matchingTrace = null; matchingEventIndex = 0;
  matchingText('input-status',message); matchingById('input-status').classList.remove('error');
  matchingText('event-kind','No current trace'); matchingText('event-position','No current trace');
  matchingText('event-message','Build a trace from the current inputs. Earlier matching states and downloads have been retired.');
  for(const id of ['matching-size','augmentation-count','inspection-count']) matchingText(id,'—');
  for(const id of ['round-label','free-endpoints','search-roots','search-queue','search-reached','prediction-status']) matchingText(id,'');
  matchingById('matching-pairs').replaceChildren(); matchingById('graph').replaceChildren();
  matchingById('graph').setAttribute('aria-label','No current graph trace');
  matchingById('edge-table').querySelector('tbody').replaceChildren();
  matchingById('path-panel').hidden = true;
  matchingById('event-slider').max = '0'; matchingById('event-slider').value = '0';
  matchingControlState();
}
function buildMatchingTrace() {
  retireMatchingTrace('');
  try {
    const graph = parseBipartiteInput(...['left-input','right-input','edges-input','matching-input'].map(id=>matchingById(id).value));
    matchingTrace = traceBipartiteMatching(graph); matchingEventIndex = 0;
    matchingText('input-status','Trace ready: ' + graph.left.length + ' left vertices, ' + graph.right.length + ' right vertices and ' + graph.edges.length + ' edges.');
    matchingById('event-slider').max = String(matchingTrace.events.length-1);
    renderMatchingEvent();
  } catch(error) {
    matchingText('input-status',error.message); matchingById('input-status').classList.add('error');
  }
}
function matchingPair(edge) { return edge.left + '–' + edge.right; }
function matchingNode(tag, text, className) {
  const element = document.createElement(tag);
  if(text !== undefined) element.textContent = text;
  if(className) element.className = className;
  return element;
}
function matchingSvg(tag, attrs) {
  const element=document.createElementNS('http://www.w3.org/2000/svg',tag);
  for(const [key,value] of Object.entries(attrs)) element.setAttribute(key,String(value));
  return element;
}
function renderMatchingGraph(event) {
  const graph=matchingTrace.graph, container=matchingById('graph');
  container.replaceChildren();
  const height=Math.max(180,Math.max(graph.left.length,graph.right.length)*60+24);
  container.style.height=height+'px';
  const svg=matchingSvg('svg',{viewBox:'0 0 1000 '+height,preserveAspectRatio:'none','aria-hidden':'true'});
  container.append(svg);
  const positions=new Map();
  for(const [side,x] of [['left',220],['right',780]]) {
    graph[side].forEach((label,index)=>positions.set(label,{x,y:(index+1)*height/(graph[side].length+1)}));
  }
  const chosen=new Set(event.matching), path=new Set(event.path.map(step=>step.edgeId));
  const reached=new Set([...event.reachedLeft,...event.reachedRight]), used=new Set();
  for(const edge of graph.edges) {
    const paired=chosen.has(edge.id);
    if(paired){used.add(edge.left);used.add(edge.right);}
    const a=positions.get(paired?edge.right:edge.left), b=positions.get(paired?edge.left:edge.right);
    let color=paired?'#185a87':'#a6b5c2', width=paired?4:2, dash='';
    if(path.has(edge.id)){color='#7041a6';width=5;}
    if(event.edge===edge.id && !event.path.length){color='#a96404';width=5;}
    if(event.kind==='augment'){
      if(event.added.includes(edge.id)){color='#187246';width=5;}
      if(event.removed.includes(edge.id)){color='#a33431';width=3;dash='10 7';}
    }
    const group=matchingSvg('g',{'data-edge-id':edge.id,'data-from':paired?edge.right:edge.left,'data-to':paired?edge.left:edge.right});
    group.append(matchingSvg('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:color,'stroke-width':width,'stroke-dasharray':dash}));
    const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),ux=dx/len,uy=dy/len;
    const tx=a.x+dx*.55,ty=a.y+dy*.55;
    const points=[[tx+ux*12,ty+uy*12],[tx-ux*10-uy*6,ty-uy*10+ux*6],[tx-ux*10+uy*6,ty-uy*10-ux*6]].map(p=>p.join(',')).join(' ');
    group.append(matchingSvg('polygon',{points,fill:color}));svg.append(group);
  }
  for(const label of [...graph.left,...graph.right]) {
    const point=positions.get(label), node=matchingNode('div',undefined,'graph-node');
    if(used.has(label))node.classList.add('matched');
    if(reached.has(label))node.classList.add('reached');
    if(event.current===label)node.classList.add('current');
    node.dataset.node=label;node.style.left=(point.x/10)+'%';node.style.top=point.y+'px';
    node.append(matchingNode('span',label));
    node.append(matchingNode('small',(used.has(label)?'paired':'free')+(reached.has(label)?' · reached':'')));
    container.append(node);
  }
  const pairs=graph.edges.filter(edge=>chosen.has(edge.id)).map(matchingPair);
  container.setAttribute('aria-label','Current matching: '+(pairs.join(', ')||'empty')+'. Free left: '+(event.freeLeft.join(', ')||'none')+'. Free right: '+(event.freeRight.join(', ')||'none')+'. '+event.message);
  matchingText('graph-caption',event.kind==='augment'
    ? 'Matching after the whole-path flip. Green edges were added; red dashed edges were removed. Every arrow now follows the new matching.'
    : 'Arrows show the direction allowed by the current matching. They are search directions on undirected edges.');
}
function renderMatchingEvent() {
  if(!matchingTrace)return;
  const event=matchingTrace.events[matchingEventIndex], graph=matchingTrace.graph;
  matchingText('event-kind',matchingKinds[event.kind]||event.kind);
  matchingText('event-position','Event '+(matchingEventIndex+1)+' of '+matchingTrace.events.length);
  matchingText('round-label',event.round?'Search '+event.round:'Before the first search');
  matchingText('event-message',event.message);
  matchingText('matching-size',String(event.size));matchingText('augmentation-count',String(event.augmentations));
  matchingText('inspection-count',String(event.arcInspections));
  matchingById('event-slider').value=String(matchingEventIndex);
  matchingById('event-slider').setAttribute('aria-valuetext','Event '+(matchingEventIndex+1)+': '+matchingKinds[event.kind]);
  const chosen=new Set(event.matching), pairs=matchingById('matching-pairs');
  pairs.replaceChildren();
  for(const edge of graph.edges.filter(edge=>chosen.has(edge.id)))pairs.append(matchingNode('span',matchingPair(edge)+' · '+edge.id,'pair'));
  if(!event.matching.length)pairs.append(matchingNode('span','Empty matching','small'));
  matchingText('free-endpoints','Free left: '+(event.freeLeft.join(', ')||'none')+'. Free right: '+(event.freeRight.join(', ')||'none')+'.');
  matchingText('search-roots','Roots: '+(event.roots.join(', ')||'none'));
  matchingText('search-queue','Queue: '+(event.queue.join(' → ')||'empty'));
  matchingText('search-reached','Reached left: '+(event.reachedLeft.join(', ')||'none')+'; right: '+(event.reachedRight.join(', ')||'none'));
  matchingById('path-panel').hidden=!event.path.length;
  if(event.path.length){
    matchingText('path-heading',event.kind==='augment'?'Path used for this flip · matching now updated':'Path found · flip not applied yet');
    matchingText('path-vertices',event.path.map(step=>step.from).concat(event.path.at(-1).to).join(' → '));
    const list=matchingById('path-steps');list.replaceChildren();
    for(const step of event.path)list.append(matchingNode('li',step.edgeId+': '+step.from+' → '+step.to+' · '+(step.inMatchingBefore?'remove the previously matched edge':'add the previously unmatched edge')));
    matchingText('flip-summary','Remove '+(event.removed.join(', ')||'none')+'; add '+event.added.join(', ')+'. Net change: +1 pair.');
  }
  const tbody=matchingById('edge-table').querySelector('tbody');tbody.replaceChildren();
  for(const edge of graph.edges){
    const tr=matchingNode('tr');tr.dataset.edgeId=edge.id;if(edge.id===event.edge)tr.classList.add('active');
    const paired=chosen.has(edge.id);
    for(const value of [edge.id,matchingPair(edge),paired?'Matched':'Unmatched',paired?edge.right+' → '+edge.left:edge.left+' → '+edge.right])tr.append(matchingNode('td',value));
    tbody.append(tr);
  }
  renderMatchingGraph(event);matchingControlState();
}
function selectMatchingEvent(index) {
  if(!matchingTrace)return;
  matchingEventIndex=Math.max(0,Math.min(matchingTrace.events.length-1,index));renderMatchingEvent();
}
function downloadMatchingBytes(name,mime,bytes) {
  try{
    const url=URL.createObjectURL(new Blob([bytes],{type:mime}));
    const anchor=matchingNode('a');anchor.href=url;anchor.download=name;document.body.append(anchor);anchor.click();anchor.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
    matchingText('download-status','Download requested: '+name+'.');
  }catch(error){matchingText('download-status','Download could not start: '+error.message);}
}
for(const id of ['left-input','right-input','edges-input','matching-input'])matchingById(id).addEventListener('input',()=>retireMatchingTrace());
matchingById('build-trace').addEventListener('click',buildMatchingTrace);
matchingById('load-example').addEventListener('click',()=>{
  const example=matchingExamples[matchingById('example').value];
  ['left-input','right-input','edges-input','matching-input'].forEach((id,index)=>{matchingById(id).value=example[index];});
  matchingById('prediction').value='';buildMatchingTrace();
});
matchingById('first-event').addEventListener('click',()=>selectMatchingEvent(0));
matchingById('previous-event').addEventListener('click',()=>selectMatchingEvent(matchingEventIndex-1));
matchingById('next-event').addEventListener('click',()=>selectMatchingEvent(matchingEventIndex+1));
matchingById('last-event').addEventListener('click',()=>selectMatchingEvent(matchingTrace.events.length-1));
matchingById('event-slider').addEventListener('input',event=>selectMatchingEvent(Number(event.target.value)));
matchingById('prediction').addEventListener('input',()=>matchingText('prediction-status',''));
matchingById('check-prediction').addEventListener('click',()=>{
  if(!matchingTrace)return;
  const raw=matchingById('prediction').value.trim(), bound=Math.min(matchingTrace.graph.left.length,matchingTrace.graph.right.length);
  if(!/^\d+$/.test(raw)||Number(raw)>bound){matchingText('prediction-status','Enter a whole number from 0 to '+bound+'.');return;}
  matchingText('prediction-status',Number(raw)===matchingTrace.maxSize
    ? 'Correct: the maximum is '+matchingTrace.maxSize+' pair(s). Use the last search to explain why no larger matching exists.'
    : 'The maximum is '+matchingTrace.maxSize+' pair(s). Follow the augmenting paths and the final exhausted search to check why.');
});
for(const [button,key]of [['download-course','course'],['download-guide','guide']])matchingById(button).addEventListener('click',()=>{
  const asset=matchingAssets[key],bytes=Uint8Array.from(atob(asset.base64),character=>character.charCodeAt(0));
  downloadMatchingBytes(asset.name,asset.mime,bytes);
});
matchingById('download-trace').addEventListener('click',()=>{
  if(!matchingTrace)return;
  const packet={format:'recallweave-bipartite-matching-export/1',selectedEventIndex:matchingEventIndex,selectedEvent:matchingTrace.events[matchingEventIndex],trace:matchingTrace};
  downloadMatchingBytes('bipartite-matching-trace.json','application/json;charset=utf-8',JSON.stringify(packet,null,2)+'\n');
});
buildMatchingTrace();
