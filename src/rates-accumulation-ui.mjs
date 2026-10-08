import { RATE_PRESETS, analyzeMotion, serializeMotion } from './rates-accumulation.mjs';
const el = id => document.getElementById(id);
const svgNS = 'http://www.w3.org/2000/svg';
const courseText = JSON.parse(el('rates-deck-json').textContent);
const guideText = JSON.parse(el('rates-guide-json').textContent);
let source = null, result = null, samples = [];
function node(tag, text, attrs = {}) {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  for (const [key, value] of Object.entries(attrs)) e.setAttribute(key, value);
  return e;
}
function exact(record) {
  if (!record) return 'Undefined';
  const [n, d] = record.fraction.split('/');
  return d === '1' ? n : n + '/' + d;
}
function number(value) { return Number(value.toFixed(4)).toString(); }
function shown(record) {
  if (!record) return 'Undefined';
  return exact(record) + (record.fraction.endsWith('/1') ? '' : ' ≈ ' + number(record.approximate));
}
function showValue(id, record) {
  el(id).textContent = shown(record);
  el(id).dataset.fraction = record ? record.fraction : 'undefined';
}
function tableSource() {
  return 'time_s,velocity_m_s\n' + [...el('curve-points').children].map(row => row.querySelector('[data-time]').value + ',' + row.querySelector('[data-velocity]').value).join('\n');
}
function updatePointButtons() {
  const rows = [...el('curve-points').children];
  el('add-point').disabled = rows.length >= 8;
  rows.forEach((row, i) => {
    row.querySelector('[data-time]').setAttribute('aria-label', 'Time for point ' + (i + 1) + ' in seconds');
    row.querySelector('[data-velocity]').setAttribute('aria-label', 'Velocity for point ' + (i + 1) + ' in metres per second');
    const button = row.querySelector('button');
    button.disabled = rows.length <= 2;
    button.setAttribute('aria-label', 'Remove point ' + (i + 1));
  });
}
function dirty() {
  source = null; result = null; samples = [];
  el('rates-results').hidden = true; el('inspection-controls').disabled = true;
  el('download-calculation').disabled = true;
  el('curve-status').textContent = 'Curve changed. Apply the complete curve to calculate again.';
  el('curve-error').textContent = ''; el('inspection-error').textContent = ''; el('download-status').textContent = '';
}
function addPoint(time = '', velocity = '') {
  const row = node('tr');
  for (const [key, value, mode] of [['time', time, 'numeric'], ['velocity', velocity, 'decimal']]) {
    const cell = node('td'), input = node('input', undefined, { type: 'text', inputmode: mode, maxlength: '6' });
    input.dataset[key] = ''; input.value = value;
    input.addEventListener('input', dirty); cell.append(input); row.append(cell);
  }
  const cell = node('td'), remove = node('button', 'Remove', { type: 'button' });
  remove.addEventListener('click', () => {
    if (el('curve-points').children.length <= 2) return;
    const next = row.nextElementSibling ?? row.previousElementSibling;
    row.remove(); updatePointButtons(); dirty(); next?.querySelector('input').focus();
  });
  cell.append(remove); row.append(cell); el('curve-points').append(row); updatePointButtons();
}
function loadExample() {
  const preset = RATE_PRESETS.find(p => p.id === el('rate-preset').value);
  el('curve-points').replaceChildren();
  for (const line of preset.source.split('\n').slice(1)) addPoint(...line.split(','));
  applyCurve();
}
function applyCurve() {
  dirty();
  try {
    const candidate = tableSource(), admitted = analyzeMotion(candidate, '0');
    source = candidate;
    samples = [];
    for (let tick = 0; tick <= admitted.endTime.approximate * 10; tick++) {
      const r = analyzeMotion(source, (tick / 10).toFixed(1));
      samples.push({ time: tick / 10, displacement: r.displacement.approximate, distance: r.distance.approximate });
    }
    el('inspect-slider').max = admitted.endTime.approximate * 10;
    el('inspection-controls').disabled = false;
    el('curve-status').textContent = admitted.points.length + ' points applied. The curve is ready to inspect.';
    inspect(String(admitted.endTime.approximate));
  } catch (error) {
    source = null; result = null; samples = [];
    el('curve-status').textContent = 'The curve has not been applied.';
    el('curve-error').textContent = error.message;
  }
}
function svg(tag, attrs = {}, text) {
  const e = document.createElementNS(svgNS, tag);
  for (const [key, value] of Object.entries(attrs)) e.setAttribute(key, String(value));
  if (text !== undefined) e.textContent = text;
  return e;
}
function axes(target, min, max, unit, endTime) {
  target.replaceChildren();
  if (min === max) { min -= 1; max += 1; }
  const pad = (max - min) * 0.08;
  min -= pad; max += pad;
  const width = Math.max(220, target.getBoundingClientRect().width), right = width - 22;
  target.setAttribute('viewBox', '0 0 '+width+' 280');
  const x = t => 58 + t / endTime * (right - 58), y = v => 222 - (v - min) / (max - min) * 188;
  target.append(svg('line', {x1:58,y1:y(0),x2:right,y2:y(0),stroke:'#7f929b','stroke-width':1.3}));
  const values = [min + pad, 0, max - pad].filter((v,i,a) => a.indexOf(v) === i);
  for (const v of values) {
    target.append(svg('line',{x1:58,y1:y(v),x2:right,y2:y(v),stroke:'#d9e1e0','stroke-dasharray':'3 5'}));
    target.append(svg('text',{x:49,y:y(v)+5,'text-anchor':'end'},number(v)));
  }
  for (let i=0;i<=4;i++) {
    const t=endTime*i/4;
    target.append(svg('text',{x:x(t),y:246,'text-anchor':'middle'},number(t)));
  }
  target.append(svg('text',{x:58,y:17},unit),svg('text',{x:right,y:265,'text-anchor':'end'},'Time (s)'));
  return {x,y};
}
function pathData(list, x, y, key) { return list.map((p,i)=>(i?'L':'M')+x(p.time)+','+y(p[key])).join(' '); }
function drawVelocity(r) {
  const target = el('velocity-plot'), extent = Math.max(1,...r.points.map(p=>Math.abs(p.velocity.approximate)));
  const {x,y} = axes(target,-extent,extent,'Velocity (m/s)',r.endTime.approximate);
  for (const row of r.segments) {
    const a=row.from.approximate, b=row.coveredUntil.approximate;
    if (b<=a) continue;
    const va=row.firstVelocity.approximate, vb=va+row.acceleration.approximate*(b-a);
    const zero=row.zeroCrossing?.approximate;
    const pieces = zero !== undefined && zero>a && zero<b ? [[a,va,zero,0],[zero,0,b,vb]] : [[a,va,b,vb]];
    for (const [left,vLeft,right,vRight] of pieces) {
      const positive=vLeft+vRight>=0;
      target.append(svg('polygon',{points:[[x(left),y(0)],[x(left),y(vLeft)],[x(right),y(vRight)],[x(right),y(0)]].map(p=>p.join(',')).join(' '),fill:positive?'#7bc8b8':'#e8a78e','fill-opacity':0.65}));
    }
  }
  const points=r.points.map(p=>({time:p.time.approximate,velocity:p.velocity.approximate}));
  target.append(svg('path',{d:pathData(points,x,y,'velocity'),fill:'none',stroke:'#163344','stroke-width':3,'stroke-linejoin':'round'}));
  for (const p of points) target.append(svg('circle',{cx:x(p.time),cy:y(p.velocity),r:3.8,fill:'#163344'}));
  target.append(svg('line',{x1:x(r.time.approximate),y1:25,x2:x(r.time.approximate),y2:222,stroke:'#165e88','stroke-dasharray':'5 4'}));
  target.append(svg('circle',{cx:x(r.time.approximate),cy:y(r.velocity.approximate),r:6,fill:'#165e88',stroke:'white','stroke-width':2}));
  el('velocity-plot-description').textContent = 'The curve has '+r.points.length+' points. At '+exact(r.time)+' seconds, velocity is '+exact(r.velocity)+' metres per second. Shaded signed area from the start is '+exact(r.displacement)+' metres; the table supplies each exact interval.';
}
function drawAccumulation(r) {
  const target=el('accumulation-plot');
  const low=Math.min(0,...samples.map(p=>p.displacement)), high=Math.max(0,...samples.map(p=>p.displacement),...samples.map(p=>p.distance));
  const {x,y}=axes(target,low,high,'Accumulated change (m)',r.endTime.approximate);
  target.append(svg('path',{d:pathData(samples,x,y,'displacement'),fill:'none',stroke:'#087c72','stroke-width':3}));
  target.append(svg('path',{d:pathData(samples,x,y,'distance'),fill:'none',stroke:'#b44e35','stroke-width':3,'stroke-dasharray':'8 5'}));
  target.append(svg('line',{x1:x(r.time.approximate),y1:25,x2:x(r.time.approximate),y2:222,stroke:'#165e88','stroke-dasharray':'5 4'}));
  target.append(svg('circle',{cx:x(r.time.approximate),cy:y(r.displacement.approximate),r:5,fill:'#087c72',stroke:'white','stroke-width':1.5}));
  target.append(svg('rect',{x:x(r.time.approximate)-4.5,y:y(r.distance.approximate)-4.5,width:9,height:9,fill:'#b44e35',stroke:'white','stroke-width':1.5}));
  el('accumulation-plot-description').textContent='At '+exact(r.time)+' seconds, signed displacement is '+exact(r.displacement)+' metres and distance is '+exact(r.distance)+' metres. Solid teal is displacement; dashed rust is distance.';
}
function renderSegments(r) {
  el('segment-rows').replaceChildren();
  for (const row of r.segments) {
    const tr=node('tr'); tr.className=row.coverage; tr.dataset.segment=String(row.index);
    const first=node('td',exact(row.from)+' → '+exact(row.to));
    first.append(node('small',row.coverage==='partial'?'Used through '+exact(row.coveredUntil)+' s':row.coverage==='complete'?'Complete':'Not reached'));
    tr.append(first,node('td',exact(row.firstVelocity)+' → '+exact(row.lastVelocity)),node('td',row.zeroCrossing?exact(row.zeroCrossing):'No interior crossing'));
    for(const key of ['coveredDisplacement','coveredDistance']) {
      const td=node('td',shown(row[key])); td.dataset.fraction=row[key].fraction; tr.append(td);
    }
    tr.append(node('td','Net '+exact(row.fullDisplacement)+'; distance '+exact(row.fullDistance)));
    el('segment-rows').append(tr);
  }
}
function inspect(time) {
  if (!source) return;
  result=null;el('download-calculation').disabled=true;el('download-status').textContent='';
  try {
    const r=analyzeMotion(source,time); result=r;
    el('inspect-time').value=time;el('inspect-slider').value=Math.round(r.time.approximate*10);
    el('inspect-slider').setAttribute('aria-valuetext',exact(r.time)+' seconds');
    el('inspection-error').textContent='';el('rates-results').hidden=false;el('download-calculation').disabled=false;
    el('moment-heading').textContent='From 0 to '+exact(r.time)+' seconds';
    showValue('velocity-value',r.velocity);showValue('displacement-value',r.displacement);showValue('distance-value',r.distance);showValue('average-value',r.averageVelocity);
    el('average-unit').textContent=r.averageVelocity?'metres per second':'the elapsed duration is zero';
    const a=r.acceleration;
    el('acceleration-value').textContent=a.kind==='corner'
      ? 'Acceleration is undefined at this velocity corner: left slope '+exact(a.left)+' m/s², right slope '+exact(a.right)+' m/s². Position still has derivative '+exact(r.velocity)+' m/s here.'
      : a.kind==='start-boundary'?'Start boundary: only the right-hand velocity slope is supplied ('+exact(a.right)+' m/s²).'
      : a.kind==='end-boundary'?'End boundary: only the left-hand velocity slope is supplied ('+exact(a.left)+' m/s²).'
      : 'Acceleration at this time is '+exact(a.value)+' m/s². The position curve’s slope is the displayed velocity.';
    el('acceleration-value').dataset.kind=a.kind;
    drawVelocity(r);drawAccumulation(r);renderSegments(r);
  } catch(error) {
    el('rates-results').hidden=true;el('inspection-error').textContent=error.message;
  }
}
function download(text,name,type) {
  let url;
  try {
    url=URL.createObjectURL(new Blob([text],{type}));
    const link=node('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();
    el('download-status').textContent='Prepared '+name+'. Your browser handles saving the file.';
  } catch(error) {el('download-status').textContent='The download could not be prepared. You can try again: '+error.message;}
  finally {if(url)setTimeout(()=>URL.revokeObjectURL(url),30000);}
}
for (const preset of RATE_PRESETS) {
  const option=node('option',preset.title);option.value=preset.id;el('rate-preset').append(option);
}
el('use-example').addEventListener('click',loadExample);
el('curve-form').addEventListener('submit',event=>{event.preventDefault();applyCurve();});
el('add-point').addEventListener('click',()=>{
  if(el('curve-points').children.length>=8)return;
  const last=el('curve-points').lastElementChild.querySelector('[data-time]').value.trim();
  const next=/^(?:0|[1-9]\d*)$/.test(last)&&Number(last)<120?String(Number(last)+1):'';
  addPoint(next,'0');dirty();el('curve-points').lastElementChild.querySelector('input').focus();
});
el('inspect-slider').addEventListener('input',event=>inspect(String(Number(event.target.value)/10)));
el('inspect-time').addEventListener('input',event=>inspect(event.target.value));
el('download-calculation').addEventListener('click',()=>{
  if(source&&result) download(serializeMotion(source,el('inspect-time').value),'rates-accumulation-calculation.json','application/json;charset=utf-8');
});
el('download-lesson').addEventListener('click',()=>download(courseText,'rates-accumulation.json','application/json;charset=utf-8'));
el('download-guide').addEventListener('click',()=>download(guideText,'rates-accumulation-guide.md','text/markdown;charset=utf-8'));
window.addEventListener('resize',()=>{if(result){drawVelocity(result);drawAccumulation(result);}});
loadExample();
