import { analyzeDifferentiation, serializeDifferentiation, DIFFERENCE_METHODS } from './numerical-differentiation.mjs';

const byId = id => document.getElementById(id);
const form = byId('calculation');
const output = byId('results');
const status = byId('status');
const save = byId('save-record');
let current = null;
const presets = {
  quadratic: {coefficients:[0,0,1,0,0,0],point:1,stepDenominator:2},
  cubic: {coefficients:[0,0,0,1,0,0],point:0,stepDenominator:4},
  cancellation: {coefficients:[0,0,1,-1,0,0],point:0,stepDenominator:1},
  symmetry: {coefficients:[0,0,0,0,1,0],point:0,stepDenominator:2},
  linear: {coefficients:[3,-2,0,0,0,0],point:-1,stepDenominator:8}
};
function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function retire() {
  current = null; output.replaceChildren(); output.hidden = true; save.disabled = true;
  status.textContent = 'Draft changed. Calculate to inspect these inputs.';
  status.className = 'status';
}
function fillDraft(value) {
  value.coefficients.forEach((c,i) => { byId('c'+i).value = String(c); });
  byId('point').value = String(value.point);
  byId('step').value = String(value.stepDenominator);
}
function readInteger(id, name) {
  const text = byId(id).value.trim();
  if (!/^-?\d+$/.test(text)) throw new TypeError(name+' must be a whole integer.');
  return Number(text);
}
function polynomial(coefficients) {
  const terms = [];
  for (let i=5;i>=0;i--) {
    const c=coefficients[i]; if (!c) continue;
    const body=(i && Math.abs(c)===1 ? '' : String(Math.abs(c)))+(i ? (i===1?'x':'x^'+i) : '');
    terms.push((terms.length ? (c<0?' − ':' + ') : (c<0?'−':''))+body);
  }
  return terms.join('') || '0';
}
function table(headers, rows, name) {
  const scroll = element('div', undefined, 'table-scroll');
  scroll.tabIndex=0;scroll.setAttribute('role','region');scroll.setAttribute('aria-label',name);
  const t=element('table');const head=element('thead');const tr=element('tr');
  for (const header of headers) {const cell=element('th',header);cell.scope='col';tr.append(cell);}
  head.append(tr);t.append(head);
  const body=element('tbody');
  for (const row of rows) {const r=element('tr');for (const value of row) r.append(element('td',String(value)));body.append(r);}
  t.append(body);scroll.append(t);return scroll;
}
function plot(report, level, method) {
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 760 300');svg.setAttribute('role','img');
  svg.setAttribute('aria-label','Approximate function, tangent and selected secant; exact values are in the tables.');
  const x=report.input.point, left=x-1.25,right=x+1.25;
  const evaluate = t => report.input.coefficients.reduceRight((y,c)=>y*t+c,0);
  const y0=evaluate(x), slope=report.exactDerivative.approximate;
  const rule=level.methods[method], anchor=level.samples[rule.sampleIndices[0]];
  const secant=t=>anchor.value.approximate+rule.estimate.approximate*(t-anchor.node.approximate);
  const tangent=t=>y0+slope*(t-x);
  const points=Array.from({length:201},(_,i)=>{const t=left+(right-left)*i/200;return[t,evaluate(t)];});
  const ys=[...points.map(p=>p[1]),tangent(left),tangent(right),secant(left),secant(right)];
  let low=Math.min(...ys),high=Math.max(...ys);const pad=Math.max((high-low)*0.1,0.25);low-=pad;high+=pad;
  const X=t=>54+(t-left)/(right-left)*678, Y=y=>258-(y-low)/(high-low)*224;
  function add(tag, attributes, text) {
    const node=document.createElementNS(svg.namespaceURI,tag);
    for(const [key,value]of Object.entries(attributes))node.setAttribute(key,String(value));
    if(text!==undefined)node.textContent=text;svg.append(node);return node;
  }
  add('path',{d:`M54 30 V258 H732`,stroke:'#b7c3bd',fill:'none'});
  add('line',{x1:X(x),x2:X(x),y1:30,y2:258,stroke:'#dae1dc','stroke-dasharray':'3 5'});
  add('polyline',{points:points.map(([a,b])=>`${X(a)},${Y(b)}`).join(' '),fill:'none',stroke:'#293d37','stroke-width':2.5});
  add('line',{x1:X(left),x2:X(right),y1:Y(tangent(left)),y2:Y(tangent(right)),stroke:'#007b72','stroke-width':2.5,'stroke-dasharray':'8 5'});
  add('line',{x1:X(left),x2:X(right),y1:Y(secant(left)),y2:Y(secant(right)),stroke:'#c75b28','stroke-width':2.5});
  level.samples.forEach((sample,i)=>add('circle',{cx:X(sample.node.approximate),cy:Y(sample.value.approximate),r:5,fill:rule.sampleIndices.includes(i)?'#c75b28':'#293d37',stroke:'#fff','stroke-width':2}));
  for(const t of [left,x,right])add('text',{x:X(t),y:284,'text-anchor':'middle',fill:'#4d5d56','font-size':13},String(t));
  for(const y of [low,high])add('text',{x:48,y:Y(y)+4,'text-anchor':'end',fill:'#4d5d56','font-size':12},Number(y.toPrecision(3)).toString());
  return svg;
}
function render() {
  if (!current) return;
  const report=current, level=report.levels[report.selectedLevel], method=byId('method').value, rule=level.methods[method];
  output.replaceChildren();output.hidden=false;
  const header=element('section');header.append(element('p','ADMITTED CALCULATION','eyebrow'),element('h2','f(x) = '+polynomial(report.input.coefficients)));
  header.append(element('p',`At x = ${report.input.point}; h = ${level.step.fraction}. ${method[0].toUpperCase()+method.slice(1)} difference.`));
  const cards=element('div',undefined,'metrics');
  for(const [label,value]of [['Exact derivative',report.exactDerivative.fraction],['Sampled estimate',rule.estimate.fraction],['Signed error Q − f′',rule.signedError.fraction]]) {
    const card=element('div');card.append(element('span',label),element('strong',value));cards.append(card);
  }
  header.append(cards);
  header.append(element('p',rule.exact?'Exact for this polynomial, point and step.':'Absolute error: '+rule.absoluteError.fraction,rule.exact?'outcome exact':'outcome'));
  header.append(element('p',`Polynomial degree: ${report.polynomialDegree===null?'zero polynomial (no degree)':report.polynomialDegree}. This rule is guaranteed exact through degree ${rule.degreeGuarantee}. ${rule.guaranteedByDegree?'This input falls within that guarantee.':'This input is outside the degree guarantee; inspect the actual error separately.'}`,'muted'));
  output.append(header);
  const figure=element('section');figure.append(element('h3','See the sampled slope'),plot(report,level,method));
  const legend=element('p',undefined,'legend');legend.append(element('span','● Function','function-key'),element('span','┄ Tangent','tangent-key'),element('span','━ Selected secant','secant-key'));figure.append(legend);
  figure.append(element('p','Approximate display coordinates. A central secant joins the two endpoint samples; equal tangent and secant slopes do not require the same line. Exact fractions below are authoritative.','muted'));output.append(figure);
  const samples=element('section');samples.append(element('h3','Three exact samples'),table(['Location','x value','f(x value)'],level.samples.map((s,i)=>[['x − h','x','x + h'][i],s.node.fraction,s.value.fraction]),'Exact sample values'));
  samples.append(element('p',`Difference ${rule.difference.fraction} ÷ horizontal separation ${rule.divisor.fraction} = ${rule.estimate.fraction}.`,'equation'));output.append(samples);
  const comparison=element('section');comparison.append(element('h3','Compare all three rules'),table(['Rule','Estimate','Signed error','Absolute error'],DIFFERENCE_METHODS.map(name=>[name,level.methods[name].estimate.fraction,level.methods[name].signedError.fraction,level.methods[name].absoluteError.fraction]),'Rule comparison'));output.append(comparison);
  const refinement=element('section');refinement.append(element('h3','Six exact step sizes'),element('p','All rows use this same admitted polynomial and point. A smaller step can leave accidental exactness; central is not always closest.','muted'));
  refinement.append(table(['h','Forward |error|','Backward |error|','Central |error|'],report.levels.map(l=>[l.step.fraction,...DIFFERENCE_METHODS.map(m=>l.methods[m].absoluteError.fraction)]),'Step-size comparison'));output.append(refinement);
}
function calculate() {
  try {
    current=analyzeDifferentiation({coefficients:Array.from({length:6},(_,i)=>readInteger('c'+i,'Coefficient c'+i)),point:readInteger('point','Evaluation point'),stepDenominator:Number(byId('step').value)});
    render();save.disabled=false;status.className='status';
    status.textContent='Calculated. The tables and worked-record download are bound to these inputs.';
  } catch(error) {
    current=null;output.replaceChildren();output.hidden=true;save.disabled=true;
    status.className='status error';status.textContent=error.message;
  }
}
function download(text, name, mime) {
  const url=URL.createObjectURL(new Blob([text],{type:mime}));
  const a=element('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
form.addEventListener('input',retire);
form.addEventListener('change',event=>{if(event.target.tagName==='SELECT')retire();});
form.addEventListener('submit',event=>{event.preventDefault();calculate();});
byId('preset').addEventListener('change',()=>{fillDraft(presets[byId('preset').value]);retire();});
byId('method').addEventListener('change',render);
save.addEventListener('click',()=>{if(current)download(serializeDifferentiation(current,byId('method').value),'numerical-differentiation-worked.json','application/json;charset=utf-8');});
byId('save-course').addEventListener('click',()=>download(courseText,'numerical-differentiation.json','application/json;charset=utf-8'));
byId('save-guide').addEventListener('click',()=>download(guideText,'numerical-differentiation.md','text/markdown;charset=utf-8'));
fillDraft(presets.quadratic);calculate();
