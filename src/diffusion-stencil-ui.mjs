import {computeDiffusion} from './diffusion-stencil.mjs';
const $=id=>document.getElementById(id);
const rational=x=>x.denominator==='1'?x.numerator:x.numerator+'/'+x.denominator;
const approximate=x=>Number(x.numerator)/Number(x.denominator);
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
const presets={
 pulse:{values:[8,0,0,0,0,0,0,0],numerator:1,denominator:4,steps:8},
 constant:{values:Array(8).fill(3),numerator:3,denominator:4,steps:8},
 damping:{values:[1,-1,1,-1,1,-1,1,-1],numerator:1,denominator:4,steps:8},
 boundary:{values:[1,-1,1,-1,1,-1,1,-1],numerator:1,denominator:2,steps:8},
 growing:{values:[1,-1,1,-1,1,-1,1,-1],numerator:3,denominator:4,steps:8}
};
let accepted=null,live=false;
for(let j=0;j<8;j++){
 const label=el('label','Cell '+j),input=el('input');input.id='initial-'+j;input.type='text';input.inputMode='numeric';label.append(input);$('cell-inputs').append(label);
 const option=el('option',String(j));option.value=String(j);$('cell').append(option);
}
function populate(p){p.values.forEach((v,j)=>$('initial-'+j).value=String(v));for(const k of ['numerator','denominator','steps'])$(k).value=String(p[k]);}
function status(text,kind=''){ $('status').textContent=text;$('status').className='status'+(kind?' '+kind:'');}
function retire(){live=false;$('inspect-controls').disabled=true;$('download-observation').disabled=true;status('Draft changed. Previous applied result remains below. Apply to inspect or export the new experiment.','draft');$('download-status').textContent='';}
function readInteger(id,label){
 const text=$(id).value.trim();
 if(!/^[+-]?[0-9]+$/.test(text))throw new RangeError(label+' needs a decimal integer.');
 const n=Number(text);if(!Number.isSafeInteger(n))throw new RangeError(label+' is outside the admitted integer range.');return n;
}
function apply(){
 try{
  const input={values:Array.from({length:8},(_,j)=>readInteger('initial-'+j,'Cell '+j)),numerator:readInteger('numerator','Numerator'),denominator:readInteger('denominator','Denominator'),steps:readInteger('steps','Steps')};
  const next=computeDiffusion(input);accepted=next;live=true;$('row').max=String(input.steps);$('row').value='0';$('cell').value='0';
  $('inspect-controls').disabled=false;$('download-observation').disabled=false;status('Applied. Inspect any row and cell, or save the complete observation.');$('download-status').textContent='';render();
 }catch(e){retire();status('Not applied: '+e.message+' Previous applied result is retained.','error');}
}
function tableRow(body,values,selected=false){const tr=el('tr');if(selected)tr.className='selected';for(const v of values)tr.append(el('td',String(v)));body.append(tr);}
function svg(tag,attrs,text){const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,String(v));if(text!==undefined)n.textContent=text;return n;}
function draw(row,cell){
 const g=$('plot-content');g.replaceChildren();const all=accepted.rows.flatMap(r=>r.values.map(approximate));
 let lo=Math.min(0,...all),hi=Math.max(0,...all);if(lo===hi){lo-=1;hi+=1;}const pad=(hi-lo)*.08;lo-=pad;hi+=pad;
 const x=j=>60+j*76,y=v=>215-(v-lo)/(hi-lo)*175;
 for(const value of [lo,(lo+hi)/2,hi]){
  const yy=y(value);g.append(svg('line',{x1:52,x2:606,y1:yy,y2:yy,stroke:'#d2d9cc'}),svg('text',{x:47,y:yy+4,'text-anchor':'end','font-size':11,fill:'#52645d'},Number(value.toPrecision(3)).toString()));
 }
 g.append(svg('line',{x1:52,x2:606,y1:y(0),y2:y(0),stroke:'#75897d','stroke-width':1.5}));
 for(let j=0;j<8;j++)g.append(svg('text',{x:x(j),y:245,'text-anchor':'middle','font-size':13,fill:'#183837'},String(j)));
 for(const [values,color,dash]of [[accepted.rows[0].values,'#8d948c','5 4'],[row.values,'#197263','']]){
  g.append(svg('polyline',{points:values.map((v,j)=>x(j)+','+y(approximate(v))).join(' '),fill:'none',stroke:color,'stroke-width':3,'stroke-dasharray':dash}));
 }
 row.values.forEach((v,j)=>g.append(svg('circle',{cx:x(j),cy:y(approximate(v)),r:j===cell?7:4,fill:j===cell?'#d18c26':'#197263',stroke:'#fffdf6','stroke-width':2})));
 $('plot-description').textContent='Approximate profile at step '+row.step+'. Cell '+cell+' exact value '+rational(row.values[cell])+'. Fixed scale covers every accepted row.';
}
function render(){
 const step=Number($('row').value),cell=Number($('cell').value),row=accepted.rows[step];$('row-label').textContent=String(step)+' of '+accepted.input.steps;
 $('applied-summary').textContent='Applied r = '+rational(accepted.ratio)+'; initial ['+accepted.input.values.join(', ')+']; '+accepted.input.steps+' steps.';
 const regime=$('regime');regime.className='notice'+(accepted.convexWeights?'':' growing');
 regime.textContent='Weights: '+accepted.weights.map(rational).join(', ')+'. Alternating multiplier: '+rational(accepted.alternatingMultiplier)+'. '+(accepted.convexWeights?'Nonnegative weights: range and squared deviations cannot increase. Boundary cases need not shrink.':'Negative center weight: the averaging guarantee does not apply. The alternating mode can grow; constant data still stays fixed.');
 const stats=$('stats');stats.replaceChildren();
 for(const [name,key]of [['Sum','sum'],['Mean','mean'],['Minimum','minimum'],['Maximum','maximum'],['Squared deviations from mean','squaredDeviations']]){const div=el('div');div.className='stat';div.append(el('dt',name),el('dd',rational(row[key])));stats.append(div);}
 const body=$('contributions').querySelector('tbody');body.replaceChildren();
 if(step===0){$('contribution-summary').textContent='Row 0 is the initial condition. Cell '+cell+' = '+rational(row.values[cell])+'. It has no incoming update.';$('contributions').hidden=true;}
 else{
  $('contributions').hidden=false;const t=row.transition[cell];$('contribution-summary').textContent='Step '+step+', cell '+cell+': '+t.terms.map(rational).join(' + ')+' = '+rational(t.value)+'.';
  for(let k=0;k<3;k++)tableRow(body,[['Left','Center','Right'][k],t.indices[k],rational(t.previous[k]),rational(accepted.weights[k]),rational(t.terms[k])]);
 }
 const vb=$('values').querySelector('tbody');vb.replaceChildren();row.values.forEach((v,j)=>tableRow(vb,[j,rational(v)],j===cell));
 const head=$('history').querySelector('thead');head.replaceChildren();const tr=el('tr');for(const text of ['Step',...Array.from({length:8},(_,j)=>'Cell '+j),'Sum'])tr.append(el('th',text));head.append(tr);
 const hb=$('history').querySelector('tbody');hb.replaceChildren();accepted.rows.forEach(r=>tableRow(hb,[r.step,...r.values.map(rational),rational(r.sum)],r.step===step));
 draw(row,cell);
}
function download(name,text,type){
 const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);$('download-status').textContent='Download requested: '+name+'. Your browser controls where it is saved.';
}
$('settings').addEventListener('input',e=>{if(e.target.matches('input'))retire();});
$('settings').addEventListener('submit',e=>{e.preventDefault();apply();});
$('preset').addEventListener('change',()=>{populate(presets[$('preset').value]);retire();});
$('row').addEventListener('input',()=>{if(live)render();});$('cell').addEventListener('change',()=>{if(live)render();});
$('download-course').addEventListener('click',()=>download('diffusion-stencil.json',DIFFUSION_COURSE_TEXT,'application/json;charset=utf-8'));
$('download-guide').addEventListener('click',()=>download('diffusion-stencil.md',DIFFUSION_GUIDE_TEXT,'text/markdown;charset=utf-8'));
$('download-observation').addEventListener('click',()=>{if(live)download('diffusion-observation.json',JSON.stringify({format:'recallweave-diffusion-observation/1',selected:{step:Number($('row').value),cell:Number($('cell').value)},experiment:accepted},null,2)+'\n','application/json;charset=utf-8');});
populate(presets.pulse);apply();
