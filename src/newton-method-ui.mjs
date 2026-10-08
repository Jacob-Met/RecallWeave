import { NEWTON_PRESETS, analyzeNewton, approximateRational, polynomialLabel } from './newton-method.mjs';
const el=id=>document.getElementById(id);
const svgNS='http://www.w3.org/2000/svg';
let result=null,selected=0;
function node(tag,text,className) {
  const value=document.createElement(tag);if(text!==undefined)value.textContent=text;if(className)value.className=className;return value;
}
function svgNode(tag,attributes={},text) {
  const value=document.createElementNS(svgNS,tag);for(const [key,data]of Object.entries(attributes))value.setAttribute(key,String(data));if(text!==undefined)value.textContent=text;return value;
}
function short(value) {
  if(value.length<=24)return value;
  const number=approximateRational(value);
  return Number.isFinite(number)?'≈ '+number.toPrecision(7):'Outside decimal display range';
}
function exactValue(label,value) {
  const box=node('div',undefined,'metric');box.append(node('span',label,'metric-label'));
  const strong=node('strong',short(value),'value');box.append(strong);
  if(value.length>24){const details=node('details');details.append(node('summary','Exact fraction'),node('code',value));box.append(details);}
  return box;
}
function currentInput(){return {coefficients:['c0','c1','c2','c3'].map(id=>el(id).value),start:el('start').value,steps:el('step-limit').value};}
function retire() {
  result=null;selected=0;el('result-panel').hidden=true;el('download-run').disabled=true;
  el('input-error').textContent='';el('download-status').textContent='';
  el('input-status').textContent='Inputs changed. Run exact steps to create a fresh record.';
  el('newton-plot').replaceChildren();el('step-table-body').replaceChildren();el('point-values').replaceChildren();
}
function fillPreset(preset) {
  ['c0','c1','c2','c3'].forEach((id,i)=>{el(id).value=String(preset.coefficients[i]);});
  el('start').value=preset.start;el('step-limit').value=String(preset.steps);retire();
}
function drawPlot(point,step) {
  const svg=el('newton-plot');svg.replaceChildren();const W=Math.max(280,Math.round(svg.getBoundingClientRect().width)||780),H=W<480?320:430,pad={left:62,right:20,top:32,bottom:60};
  svg.setAttribute('viewBox','0 0 '+W+' '+H);
  const currentX=approximateRational(point.x),nextX=step?approximateRational(step.next):null;
  const currentY=approximateRational(point.value),slope=approximateRational(point.derivative);
  const included=[currentX,nextX].filter(x=>x!==null&&Number.isFinite(x)&&Math.abs(x)<=20);
  let lo=Math.min(-2,...included.map(x=>x-1)),hi=Math.max(2,...included.map(x=>x+1));
  lo=Math.max(-22,lo);hi=Math.min(22,hi);
  const coefficients=result.input.coefficients;
  const f=x=>coefficients.reduceRight((total,c)=>total*x+c,0);
  const samples=Array.from({length:181},(_,i)=>{const x=lo+(hi-lo)*i/180;return {x,y:f(x)};});
  const ys=[0,...samples.map(p=>p.y)];
  let low=Math.min(...ys),high=Math.max(...ys),span=high-low;
  if(span<1){low-=.5;high+=.5;span=high-low;}
  low-=span*.12;high+=span*.12;
  const X=x=>pad.left+(x-lo)/(hi-lo)*(W-pad.left-pad.right);
  const Y=y=>H-pad.bottom-(y-low)/(high-low)*(H-pad.top-pad.bottom);
  const axis=n=>Math.abs(n)<1e-12?'0':Math.abs(n)>=10000?n.toExponential(1):Number(n.toPrecision(4)).toString();
  const title=svgNode('title',{id:'plot-title'},'Polynomial and recorded tangent at point '+point.index);
  const description=svgNode('desc',{id:'plot-description'},'Approximate drawing of f(x) = '+polynomialLabel(coefficients)+'. Current exact x is '+point.x+' and exact residual is '+point.value+'. '+(step?'The recorded tangent intercept is '+step.next+'.':'No next tangent step is recorded at this point.')+' Exact values are provided below.');
  svg.append(title,description);
  const definitions=svgNode('defs'),clip=svgNode('clipPath',{id:'plot-window'});clip.append(svgNode('rect',{x:pad.left,y:pad.top,width:W-pad.left-pad.right,height:H-pad.top-pad.bottom}));definitions.append(clip);svg.append(definitions);
  for(let i=0;i<=4;i++){
    const x=lo+(hi-lo)*i/4,y=low+(high-low)*i/4;
    svg.append(svgNode('line',{x1:X(x),y1:pad.top,x2:X(x),y2:H-pad.bottom,class:'grid-line'}));
    svg.append(svgNode('line',{x1:pad.left,y1:Y(y),x2:W-pad.right,y2:Y(y),class:'grid-line'}));
    svg.append(svgNode('text',{x:X(x),y:H-pad.bottom+26,'text-anchor':'middle',class:'axis-label'},axis(x)));
    svg.append(svgNode('text',{x:pad.left-10,y:Y(y)+4,'text-anchor':'end',class:'axis-label'},axis(y)));
  }
  svg.append(svgNode('line',{x1:pad.left,y1:Y(0),x2:W-pad.right,y2:Y(0),class:'axis-line'}));
  if(lo<=0&&hi>=0)svg.append(svgNode('line',{x1:X(0),y1:pad.top,x2:X(0),y2:H-pad.bottom,class:'axis-line'}));
  svg.append(svgNode('text',{x:W-pad.right,y:H-14,'text-anchor':'end',class:'axis-label'},'x'));
  svg.append(svgNode('text',{x:pad.left,y:18,class:'axis-label'},'f(x)'));
  const clipped=svgNode('g',{'clip-path':'url(#plot-window)'});
  clipped.append(svgNode('polyline',{points:samples.map(p=>X(p.x)+','+Y(p.y)).join(' '),fill:'none',class:'function-line'}));
  if(step&&Number.isFinite(currentX)&&Number.isFinite(currentY)&&Number.isFinite(slope)){
    const left=currentY+slope*(lo-currentX),right=currentY+slope*(hi-currentX);
    if(Number.isFinite(left)&&Number.isFinite(right))clipped.append(svgNode('line',{x1:X(lo),y1:Y(left),x2:X(hi),y2:Y(right),class:'tangent-line'}));
  }
  if(Number.isFinite(currentX)&&Number.isFinite(currentY)&&currentX>=lo&&currentX<=hi){
    clipped.append(svgNode('line',{x1:X(currentX),y1:Y(0),x2:X(currentX),y2:Y(currentY),class:'point-guide'}));
    clipped.append(svgNode('circle',{cx:X(currentX),cy:Y(currentY),r:6,class:'current-point'}));
  }
  if(step&&Number.isFinite(nextX)&&nextX>=lo&&nextX<=hi)clipped.append(svgNode('circle',{cx:X(nextX),cy:Y(0),r:6,class:'intercept-point'}));
  svg.append(clipped);
  const off=[];
  if(!Number.isFinite(currentX)||currentX<lo||currentX>hi)off.push('The current coordinate is outside this plot window.');
  if(step&&(!Number.isFinite(nextX)||nextX<lo||nextX>hi))off.push('The next tangent intercept is outside this plot window.');
  el('plot-note').textContent='Curve samples and plotted coordinates are approximate. '+off.join(' ')+' Exact values remain in the record.';
}
function renderPoint() {
  if(!result)return;
  const point=result.points[selected],step=result.steps[selected];
  el('point-slider').value=String(selected);el('point-select').value=String(selected);
  el('previous-point').disabled=selected===0;el('next-point').disabled=selected===result.points.length-1;
  el('point-title').textContent='Point '+selected+(step?' · recorded tangent':' · final recorded point');
  el('point-values').replaceChildren(exactValue('Current x',point.x),exactValue('Residual f(x)',point.value),exactValue('Slope f′(x)',point.derivative));
  const box=el('tangent-equation');box.replaceChildren();
  if(step){
    box.append(node('span','Recorded tangent step','eyebrow'));
    const equation=node('p',undefined,'equation-line');equation.append(node('code',step.x),' − ',node('code','('+step.value+') / ('+step.derivative+')'),' = ',node('code',step.next));box.append(equation);
    box.append(node('p','The correction is '+short(step.correction)+'. At the next point, the exact residual is '+short(step.nextValue)+'.','muted'));
  } else {
    box.append(node('span','No further step recorded','eyebrow'),node('p',result.outcome.message));
  }
  for(const row of el('step-table-body').children)row.classList.toggle('selected-row',Number(row.dataset.index)===selected);
  drawPlot(point,step);
}
function render() {
  const outcomes={'exact-root':'Exact root','zero-slope':'Zero slope away from a root',cycle:'Exact repeated cycle','step-limit':'Step limit reached','arithmetic-limit':'Exact-arithmetic limit reached'};
  el('function-label').textContent='f(x) = '+polynomialLabel(result.input.coefficients);
  el('outcome-title').textContent=outcomes[result.outcome.kind];el('outcome-title').dataset.kind=result.outcome.kind;
  el('outcome-description').textContent=result.outcome.message;
  el('step-count').textContent=String(result.steps.length);el('point-count').textContent=result.points.length+' exact point'+(result.points.length===1?'':'s');
  el('point-slider').max=String(result.points.length-1);
  el('point-slider').disabled=result.points.length===1;
  el('point-select').replaceChildren(...result.points.map(p=>{const option=node('option','Point '+p.index+' · x = '+short(p.x));option.value=String(p.index);return option;}));
  el('step-table-body').replaceChildren(...result.points.map(p=>{
    const row=node('tr');row.dataset.index=String(p.index);
    const head=node('th');head.scope='row';const button=node('button',String(p.index),'table-point');button.type='button';button.setAttribute('aria-label','Inspect point '+p.index);button.addEventListener('click',()=>{selected=p.index;renderPoint();el('point-title').focus();});head.append(button);row.append(head);
    for(const value of [p.x,p.value,p.derivative]){const cell=node('td');cell.append(node('code',value));row.append(cell);}return row;
  }));
  selected=0;el('result-panel').hidden=false;el('download-run').disabled=false;
  el('input-status').textContent='Fresh exact record created from the current inputs.';
  renderPoint();
}
function run(event) {
  if(event)event.preventDefault();
  retire();
  try{result=analyzeNewton(currentInput());el('input-error').textContent='';render();}
  catch(error){el('input-status').textContent='No result is active.';el('input-error').textContent=error.message;}
}
function download(content,name,type) {
  let url;
  try {
    url=URL.createObjectURL(new Blob([content],{type}));
    const a=node('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
    el('download-status').textContent='Prepared '+name+'. Your browser handles saving the file.';
  }catch(error){el('download-status').textContent='The download could not be prepared. Try again: '+error.message;}
  finally{if(url)setTimeout(()=>URL.revokeObjectURL(url),30000);}
}
el('example-select').replaceChildren(...NEWTON_PRESETS.map(p=>{const option=node('option',p.label);option.value=p.id;return option;}));
el('apply-example').addEventListener('click',()=>{fillPreset(NEWTON_PRESETS.find(p=>p.id===el('example-select').value));run();});
el('newton-form').addEventListener('submit',run);
for(const input of el('newton-form').querySelectorAll('input'))input.addEventListener('input',retire);
el('previous-point').addEventListener('click',()=>{if(result&&selected>0){selected--;renderPoint();}});
el('next-point').addEventListener('click',()=>{if(result&&selected<result.points.length-1){selected++;renderPoint();}});
el('point-slider').addEventListener('input',()=>{if(result){selected=Number(el('point-slider').value);renderPoint();}});
el('point-select').addEventListener('change',()=>{if(result){selected=Number(el('point-select').value);renderPoint();}});
el('download-run').addEventListener('click',()=>{if(result)download(JSON.stringify(result,null,2)+'\n','newton-method-record.json','application/json;charset=utf-8');});
el('download-course').addEventListener('click',()=>download(courseText,'newton-method.json','application/json;charset=utf-8'));
el('download-guide').addEventListener('click',()=>download(guideText,'newton-method.md','text/markdown;charset=utf-8'));
window.addEventListener('resize',()=>{if(result)renderPoint();});
fillPreset(NEWTON_PRESETS[0]);run();
