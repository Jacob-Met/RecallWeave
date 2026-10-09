import {interpolatePolynomial} from './polynomial-interpolation.mjs';

export function queryLines(text) {
  if (typeof text !== 'string') throw new TypeError('Queries must be text.');
  return text.trim() === '' ? [] : text.split(/\r\n|\r|\n/);
}
function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
/** One synchronous accepted observation; editing retires both display and export. */
export function createInterpolationSession() {
  let report = null, serialized = null;
  return Object.freeze({
    retire() { report = null; serialized = null; },
    apply(input) {
      report = null; serialized = null;
      const next = interpolatePolynomial(input);
      serialized = JSON.stringify(next, null, 2) + '\n';
      report = freeze(next);
      return report;
    },
    get report() { return report; },
    observation() {
      if (!report) throw new Error('Apply a valid draft before downloading an observation.');
      return serialized;
    }
  });
}
export function approximateRational(text) {
  const [n, d = '1'] = text.split('/');
  return Number(n) / Number(d);
}
/** This approximate drawing never supplies the model's exact values or relations. */
export function plotInterpolation(report) {
  const nodes = report.nodes.map(n => ({x: approximateRational(n.x), y: approximateRational(n.y)}));
  const queries = report.evaluations.map(n => ({x: approximateRational(n.x), y: approximateRational(n.value)}));
  const coefficients = report.monomialCoefficients.map(approximateRational);
  if (![...nodes, ...queries].every(p => Number.isFinite(p.x) && Number.isFinite(p.y))
      || !coefficients.every(Number.isFinite)) return null;
  let minX = Math.min(...nodes.map(p => p.x), ...queries.map(p => p.x));
  let maxX = Math.max(...nodes.map(p => p.x), ...queries.map(p => p.x));
  const padX = minX === maxX ? Math.max(1, Math.abs(minX) * .05) : (maxX - minX) * .06;
  minX -= padX; maxX += padX;
  const curve = Array.from({length: 161}, (_, i) => {
    const x = minX + (maxX - minX) * i / 160;
    let y = 0;
    for (let j = coefficients.length - 1; j >= 0; j--) y = y * x + coefficients[j];
    return {x, y};
  });
  if (!curve.every(p => Number.isFinite(p.y))) return null;
  let minY = Math.min(...curve.map(p => p.y), ...nodes.map(p => p.y), ...queries.map(p => p.y));
  let maxY = Math.max(...curve.map(p => p.y), ...nodes.map(p => p.y), ...queries.map(p => p.y));
  const padY = minY === maxY ? Math.max(1, Math.abs(minY) * .05) : (maxY - minY) * .08;
  minY -= padY; maxY += padY;
  const xSpan = maxX - minX, ySpan = maxY - minY;
  if (!(xSpan > 0 && ySpan > 0 && Number.isFinite(xSpan) && Number.isFinite(ySpan))) return null;
  const project = p => ({x: 45 + (p.x - minX) / xSpan * 630, y: 265 - (p.y - minY) / ySpan * 230});
  const drawing = {curve: curve.map(project), nodes: nodes.map(project), queries: queries.map(project),
    minX, maxX, minY, maxY, xZero: project({x: 0, y: 0}).x, yZero: project({x: 0, y: 0}).y};
  return [...drawing.curve,...drawing.nodes,...drawing.queries].every(p => Number.isFinite(p.x) && Number.isFinite(p.y)) ? drawing : null;
}

export function mountInterpolation(doc, resources) {
  const byId = id => doc.getElementById(id);
  const session = createInterpolationSession();
  const form = byId('experiment'), rows = byId('samples'), query = byId('queries');
  const results = byId('results'), status = byId('status'), download = byId('download-observation');
  const el = (tag, text, className) => { const node = doc.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; };
  function retire(message = 'Draft changed. Apply to calculate this selection.') {
    session.retire(); results.replaceChildren(); results.hidden = true; download.disabled = true; status.textContent = message;
  }
  function labels() {
    [...rows.children].forEach((row, i) => {
      row.querySelector('legend').textContent = 'Sample ' + (i + 1);
      row.querySelectorAll('input').forEach((input,j) => input.setAttribute('aria-label', 'Sample ' + (i + 1) + (j === 0 ? ' x' : ' y')));
      const remove = row.querySelector('button'); remove.disabled = rows.children.length === 1;
      remove.setAttribute('aria-label','Remove sample ' + (i + 1));
    });
    byId('add-sample').disabled = rows.children.length === 8;
    byId('sample-count').textContent = rows.children.length + ' of 8 samples';
  }
  function addRow(x = '', y = '') {
    const row = el('fieldset',undefined,'sample-row'); row.append(el('legend'));
    for (const [name,value] of [['x',x],['y',y]]) {
      const label = el('label',name); const input = el('input'); input.type = 'text'; input.value = value; input.maxLength = 32; input.autocomplete = 'off'; input.spellcheck = false;
      input.dataset.coordinate = name; label.append(input); row.append(label);
    }
    const remove = el('button','Remove'); remove.type = 'button'; remove.addEventListener('click',() => { retire(); row.remove(); labels(); byId('add-sample').focus(); });
    row.append(remove); rows.append(row); labels();
  }
  const presets = {
    square: {points: [['2','4'],['0','0'],['1','1']], at: '1/2\n3'},
    fraction: {points: [['-1/2','0'],['3/2','4']], at: '-1/2\n1/2\n5/2'},
    collapse: {points: [['-2','-3'],['0','1'],['2','5'],['3','7']], at: '1\n4'},
    single: {points: [['3','-2']], at: '3\n0'},
    zero: {points: [['-1','0'],['0','0'],['1','0']], at: '1/2\n2'}
  };
  function choosePreset(name) {
    retire('Preset loaded as a draft. Apply to calculate.');
    rows.replaceChildren(); const preset = presets[name];
    preset.points.forEach(([x,y]) => addRow(x,y)); query.value = preset.at; labels();
  }
  form.addEventListener('input', () => retire());
  byId('preset').addEventListener('change', event => choosePreset(event.target.value));
  byId('add-sample').addEventListener('click', () => { if (rows.children.length < 8) { retire(); addRow(); rows.lastElementChild.querySelector('input').focus(); } });
  function table(section, headers, data) {
    const scroll = el('div',undefined,'scroll'), t = el('table'), head = el('thead'), tr = el('tr');
    headers.forEach(h => { const th = el('th',h); th.scope = 'col'; tr.append(th); }); head.append(tr);t.append(head);
    const body = el('tbody'); data.forEach(values => { const row = el('tr'); values.forEach(value => row.append(el('td',String(value))));body.append(row); }); t.append(body);scroll.append(t);section.append(scroll);
  }
  function section(title, id) { const s=el('section'); if(id)s.id=id; s.append(el('h2',title));results.append(s);return s; }
  function graph(report) {
    const s=section('A view of the polynomial','graph-section');
    s.append(el('p','Approximate drawing only. The curve is sampled in floating-point; exact fractions and classifications are in the tables. Separate x and y scales are used.'));
    const g=plotInterpolation(report);if(!g){s.append(el('p','A finite drawing is unavailable for this selection. All exact results remain below.'));return;}
    const NS='http://www.w3.org/2000/svg';const svg=doc.createElementNS(NS,'svg');svg.setAttribute('viewBox','0 0 720 310');svg.setAttribute('role','img');svg.setAttribute('aria-label','Approximate polynomial curve, circular samples and square queries. Exact values follow.');
    const append=(tag,attrs)=>{const node=doc.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))node.setAttribute(k,String(v));svg.append(node);return node;};
    append('rect',{x:45,y:35,width:630,height:230,fill:'#f3f8fa',stroke:'#91a9b3'});
    if(g.xZero>=45&&g.xZero<=675)append('line',{x1:g.xZero,x2:g.xZero,y1:35,y2:265,stroke:'#91a9b3'});
    if(g.yZero>=35&&g.yZero<=265)append('line',{x1:45,x2:675,y1:g.yZero,y2:g.yZero,stroke:'#91a9b3'});
    append('polyline',{points:g.curve.map(p=>p.x.toFixed(3)+','+p.y.toFixed(3)).join(' '),fill:'none',stroke:'#176778','stroke-width':2.5});
    g.nodes.forEach((p,i)=>{append('circle',{cx:p.x,cy:p.y,r:5,fill:'#142b38',stroke:'#fff','stroke-width':1});const text=append('text',{x:p.x+7,y:p.y-7,fill:'#142b38','font-size':12});text.textContent='S'+(i+1);});
    g.queries.forEach(p=>append('rect',{x:p.x-4,y:p.y-4,width:8,height:8,fill:'#d17821',stroke:'#fff','stroke-width':1}));
    for(const [x,y,anchor,value]of [[45,289,'start',g.minX],[675,289,'end',g.maxX],[40,42,'end',g.maxY],[40,265,'end',g.minY]]) {const text=append('text',{x,y,'text-anchor':anchor,'font-size':11,fill:'#435b68'});text.textContent=Number(value.toPrecision(4)).toString();}
    s.append(svg,el('p','● Sample nodes (S1, S2, …)   ■ Requested evaluations','legend'));
  }
  function render(report) {
    results.replaceChildren();results.hidden=false;
    const overview=section('Accepted interpolation','accepted');
    overview.append(el('p',report.degree===null?'Zero polynomial: every coefficient is zero; its degree is undefined.':'Actual polynomial degree: '+report.degree+'. '+report.nodes.length+' distinct nodes allow degree at most '+(report.nodes.length-1)+'.','degree'));
    overview.append(el('p','Sample range: '+report.sampleRange.min+' to '+report.sampleRange.max+'. '+report.interpretation));
    graph(report);
    const authored=section('Authored samples, in their original order','authored');
    authored.append(el('p','Raw entries are retained exactly, including surrounding spaces. Reduced coordinates appear beside them.'));
    table(authored,['Sample','Entered x','Entered y','Reduced x','Reduced y'],report.nodes.map((n,i)=>[i+1,JSON.stringify(report.input.points[i].x),JSON.stringify(report.input.points[i].y),n.x,n.y]));
    const diff=section('Complete divided differences','differences');
    diff.append(el('p','Column k is the order-k divided difference on each consecutive k+1-node window in the authored order. An empty cell has no such window.'));
    table(diff,['Start at sample',...report.dividedDifferences.map((_,i)=>'Order '+i)],report.nodes.map((n,i)=>[i+1,...report.dividedDifferences.map(col=>col[i]??'—')]));
    const forms=section('Two equivalent polynomial forms','forms');
    forms.append(el('p','Each row gives a coefficient and the factor it multiplies. Sum all rows. Newton order follows the entered nodes; monomial order is ascending power.'));
    table(forms,['Newton coefficient','Basis factor'],report.newtonCoefficients.map((c,i)=>[c,i===0?'1':report.nodes.slice(0,i).map(n=>'(x − ('+n.x+'))').join(' × ')]));
    table(forms,['Monomial coefficient','Power'],report.monomialCoefficients.map((c,i)=>[c,'x^'+i]));
    const checks=section('Every supplied node is reproduced','node-checks');
    table(checks,['Sample','x','Supplied y','Polynomial value','Exact match'],report.nodeChecks.map(n=>[n.index+1,n.x,n.expected,n.actual,n.ok?'Yes':'No']));
    const queries=section('Requested evaluations','evaluations');
    if(!report.evaluations.length)queries.append(el('p','No query points were requested.'));
    else table(queries,['Entered x','Reduced x','Exact polynomial value','Relation to supplied samples'],report.evaluations.map(n=>[JSON.stringify(n.input),n.x,n.value,({node:'Sampled node',inside:'Inside sample range',outside:'Outside sample range'})[n.relation]]));
    queries.append(el('p','An exact result belongs to this interpolating polynomial. Inside-range evaluation is not a guarantee about an unknown function; outside-range evaluation is extrapolation, not a forecast.'));
  }
  form.addEventListener('submit',event=>{
    event.preventDefault();retire('Calculating the current draft…');
    try {
      const points=[...rows.children].map(row=>({x:row.querySelector('[data-coordinate=x]').value,y:row.querySelector('[data-coordinate=y]').value}));
      const report=session.apply({points,at:queryLines(query.value)});render(report);download.disabled=false;
      status.textContent='Accepted '+report.nodes.length+' samples and '+report.evaluations.length+' query points. The exact observation is ready.';
    } catch(error) { retire('Cannot apply: '+error.message); }
  });
  function save(text,mime,name) {const blob=new Blob([text],{type:mime});const url=URL.createObjectURL(blob);const a=el('a');a.href=url;a.download=name;doc.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  download.addEventListener('click',()=>{if(session.report)save(session.observation(),'application/json','polynomial-interpolation-observation.json');});
  byId('download-course').addEventListener('click',()=>save(resources.course,'application/json','polynomial-interpolation.json'));
  byId('download-guide').addEventListener('click',()=>save(resources.guide,'text/markdown;charset=utf-8','polynomial-interpolation.md'));
  choosePreset('square');
  return Object.freeze({session});
}
