import {analyzeWalk} from './absorbing-walk.mjs';

const $ = selector => document.querySelector(selector);
const form = $('#walk-form');
const names = ['upper','start','rightNumerator','rightDenominator','horizon'];
const presets = [
  ['Fair center',6,3,1,2,12],
  ['Near the left boundary',6,1,1,2,12],
  ['Right bias',4,2,2,3,12],
  ['Always left',6,3,0,1,8],
  ['Already absorbed',6,6,1,2,8]
];
let analysis = null;
let selectedStep = 0;
const fractionText = x => x.denominator === '1' ? x.numerator : x.numerator + '/' + x.denominator;
const approximate = x => Number(x.numerator) / Number(x.denominator);
const percentage = x => (approximate(x) * 100).toFixed(2) + '%';
const exact = x => '<span class="fraction">' + fractionText(x) + '</span>';
const courseText = new TextDecoder().decode(Uint8Array.from(atob($('#course-bytes').textContent), c => c.charCodeAt(0)));
const guideText = new TextDecoder().decode(Uint8Array.from(atob($('#guide-bytes').textContent), c => c.charCodeAt(0)));
for (const [index,preset] of presets.entries()) {
  const option = document.createElement('option');
  option.value = String(index); option.textContent = preset[0]; $('#preset').append(option);
}
function status(text, state) { $('#status').textContent = text; $('#status').dataset.state = state; }
function retire() {
  analysis = null;
  $('#results').hidden = true;
  $('#download-experiment').disabled = true;
  for (const id of ['first','previous','next','last','step']) $('#'+id).disabled = true;
  status('Inputs changed. Apply to calculate a fresh exact trace; the previous experiment is retired.', 'dirty');
}
function apply() {
  try {
    const input = {};
    for (const name of names) {
      const value = form.elements.namedItem(name).value.trim();
      if (!/^-?\d+$/.test(value)) throw new Error(name + ': enter a whole integer.');
      input[name] = Number(value);
    }
    analysis = analyzeWalk(input); selectedStep = 0;
    $('#step').max = String(input.horizon); $('#step').disabled = false;
    $('#results').hidden = false; $('#download-experiment').disabled = false;
    status('Applied exact walk: states 0–'+input.upper+', start '+input.start+', right '+fractionText(analysis.probabilities.right)+', horizon '+input.horizon+'.', 'applied');
    render();
  } catch (error) {
    retire(); status('Cannot apply: '+error.message, 'invalid');
  }
}
function render() {
  const frame = analysis.frames[selectedStep], input = analysis.input;
  $('#step').value = String(selectedStep);
  $('#step-label').textContent = 'Step '+selectedStep+' of '+input.horizon;
  $('#first').disabled = $('#previous').disabled = selectedStep === 0;
  $('#last').disabled = $('#next').disabled = selectedStep === input.horizon;
  const strip = $('#probability-strip'); strip.replaceChildren();
  for (const [state,mass] of frame.distribution.entries()) {
    const item = document.createElement('div'); item.className = 'state-bar';
    const bar = document.createElement('span'); bar.className = 'bar-fill'; bar.style.height = (approximate(mass)*100)+'%';
    const track = document.createElement('span'); track.className = 'bar-track'; track.append(bar);
    const label = document.createElement('strong'); label.textContent = String(state);
    const value = document.createElement('span'); value.textContent = percentage(mass);
    item.append(track,label,value); strip.append(item);
  }
  $('#distribution-table tbody').innerHTML = frame.distribution.map((mass,state) =>
    '<tr><th scope="row">'+state+(state===0?' · left boundary':state===input.upper?' · right boundary':'')+'</th><td>'+exact(mass)+'</td><td>'+percentage(mass)+'</td></tr>').join('');
  $('#first-left').textContent = fractionText(frame.firstArrival.left);
  $('#first-right').textContent = fractionText(frame.firstArrival.right);
  $('#survival').textContent = fractionText(frame.survival);
  const eventual = analysis.eventual[input.start];
  $('#time-comparison').innerHTML =
    '<div><dt>Eventual E[T]</dt><dd>'+exact(eventual.expectedSteps)+' <small>steps</small></dd></div>'+
    '<div><dt>Observed through step '+selectedStep+': E[min(T,'+selectedStep+')]</dt><dd>'+exact(frame.truncatedExpectedSteps)+' <small>steps</small></dd></div>'+
    '<div><dt>Unconditional expected excess</dt><dd>'+exact(frame.expectedExcessSteps)+' <small>steps</small></dd></div>';
  $('#arrival-table tbody').innerHTML = analysis.frames.map(f =>
    '<tr'+(f.step===selectedStep?' class="selected" aria-current="step"':'')+'><th scope="row">'+f.step+'</th>'+
    [f.firstArrival.left,f.firstArrival.right,f.absorbed.left,f.absorbed.right,f.survival].map(x=>'<td>'+exact(x)+'</td>').join('')+'</tr>').join('');
  $('#eventual-table tbody').innerHTML = analysis.eventual.map(row =>
    '<tr'+(row.start===input.start?' class="selected"':'')+'><th scope="row">'+row.start+'</th><td>'+exact(row.left)+'</td><td>'+exact(row.right)+'</td><td>'+exact(row.expectedSteps)+'</td></tr>').join('');
  $('#contribution-table tbody').innerHTML = frame.contributions.map(edge =>
    '<tr><th scope="row">'+edge.from+' → '+edge.to+'</th><td>'+exact(edge.probability)+'</td><td>'+exact(edge.mass)+'</td></tr>').join('');
  $('#contribution-note').textContent = selectedStep === 0
    ? 'At time 0 there is no preceding transition. The table is empty.'
    : 'From step '+(selectedStep-1)+' to '+selectedStep+'. All allowed edges are retained, including zero mass; endpoint self-edges retain previously absorbed mass.';
}
function selectStep(value) {
  if (!analysis) return;
  if (!Number.isInteger(value) || value<0 || value>analysis.input.horizon) return;
  selectedStep = value; render();
}
function download(text,name,type) {
  const url=URL.createObjectURL(new Blob([text],{type}));
  const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
form.addEventListener('submit', event=>{event.preventDefault();apply();});
for (const name of names) form.elements.namedItem(name).addEventListener('input',retire);
$('#load-preset').addEventListener('click',()=>{
  const preset=presets[Number($('#preset').value)];
  names.forEach((name,i)=>{form.elements.namedItem(name).value=String(preset[i+1]);});
  retire();apply();
});
$('#step').addEventListener('input',()=>selectStep(Number($('#step').value)));
for (const [id,fn] of [['first',()=>0],['previous',()=>selectedStep-1],['next',()=>selectedStep+1],['last',()=>analysis.input.horizon]]) {
  $('#'+id).addEventListener('click',()=>{if(analysis)selectStep(fn());});
}
$('#download-experiment').addEventListener('click',()=>{
  if(analysis)download(JSON.stringify({...analysis,selectedStep},null,2)+'\n','absorbing-walk-experiment.json','application/json;charset=utf-8');
});
$('#download-course').addEventListener('click',()=>download(courseText,'absorbing-walk.json','application/json;charset=utf-8'));
$('#download-guide').addEventListener('click',()=>download(guideText,'absorbing-walk.md','text/markdown;charset=utf-8'));
