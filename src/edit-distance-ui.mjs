import {calculateEditDistance, editCell, serializeEditExperiment, EDIT_PRESETS} from './edit-distance.mjs';

/** One local, explicit experiment. Draft changes retire all derived result surfaces. */
export function mountEditDistance(document, lessonText, guideText) {
  const byId = id => document.getElementById(id);
  const form = byId('edit-form'), status = byId('edit-status'), result = byId('edit-result');
  const source = byId('edit-source'), target = byId('edit-target');
  const fields = ['insert','delete','substitute'].map(kind => [kind, byId('edit-' + kind)]);
  const rowSelect = byId('edit-row'), columnSelect = byId('edit-column');
  const table = byId('edit-matrix'), details = byId('edit-details'), alignment = byId('edit-alignment');
  const experimentDownload = byId('edit-download-experiment');
  let current = null, cellButtons = [];
  const symbol = value => value === null ? 'gap' : JSON.stringify(value);
  const prefix = (values, count) => JSON.stringify(values.slice(0, count).join(''));
  const element = (name, text, className) => {
    const node = document.createElement(name);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  function download(name, text, type) {
    const url = URL.createObjectURL(new Blob([text], {type}));
    const link = element('a');
    link.href = url; link.download = name;
    document.body.append(link);
    link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  byId('edit-download-lesson').addEventListener('click', () => download('edit-distance.json', lessonText, 'application/json;charset=utf-8'));
  byId('edit-download-guide').addEventListener('click', () => download('edit-distance.md', guideText, 'text/markdown;charset=utf-8'));
  experimentDownload.addEventListener('click', () => {
    if (current) download('edit-distance-experiment.json', serializeEditExperiment(current), 'application/json;charset=utf-8');
  });
  function retire(message = 'Inputs changed. Compute again to inspect or download this experiment.') {
    current = null; result.hidden = true; experimentDownload.disabled = true;
    table.replaceChildren(); details.replaceChildren(); alignment.replaceChildren();
    rowSelect.replaceChildren(); columnSelect.replaceChildren(); cellButtons = [];
    byId('edit-minimum').textContent = ''; byId('edit-input-summary').textContent = '';
    byId('edit-replay-text').textContent = ''; byId('edit-replay-cost').textContent = '';
    status.textContent = message;
  }
  [source,target,...fields.map(([,field]) => field)].forEach(field => {
    field.addEventListener('input', () => retire());
    field.addEventListener('change', () => retire());
  });
  function showCell() {
    if (!current) return;
    const i = Number(rowSelect.value), j = Number(columnSelect.value), cell = editCell(current, i, j);
    details.replaceChildren();
    details.append(element('h3', 'D[' + i + ', ' + j + '] = ' + cell.cost));
    details.append(element('p', 'Transform ' + prefix(current.sourceSymbols, i) + ' into ' + prefix(current.targetSymbols, j) + '.'));
    if (!cell.candidates.length) details.append(element('p', 'Empty into empty costs 0; there is no previous operation.'));
    else {
      const list = element('ul');
      for (const candidate of cell.candidates) {
        list.append(element('li', candidate.kind + ': D[' + candidate.from.join(', ') + '] ' +
          candidate.previous + ' + ' + candidate.operationCost + ' = ' + candidate.cost +
          (candidate.optimal ? ' — minimum' : ''), candidate.optimal ? 'winning' : ''));
      }
      details.append(list);
      const tied = cell.candidates.filter(candidate => candidate.optimal);
      details.append(element('p', tied.length > 1
        ? tied.length + ' predecessor choices tie here. The displayed alignment follows the stated tie rule.'
        : 'One predecessor choice minimizes this cell. Other cells may still have ties.'));
    }
    cellButtons.forEach(button => {
      const active = button.dataset.row === String(i) && button.dataset.column === String(j);
      button.setAttribute('aria-pressed', String(active)); button.tabIndex = active ? 0 : -1;
    });
  }
  function selectCell(i,j,focus=false) {
    rowSelect.value=String(i); columnSelect.value=String(j); showCell();
    if(focus) cellButtons.find(button => button.dataset.row===String(i)&&button.dataset.column===String(j))?.focus();
  }
  rowSelect.addEventListener('change', showCell); columnSelect.addEventListener('change', showCell);
  function renderMatrix() {
    const head=element('thead'), header=element('tr');
    header.append(element('th','Source ↓ / Target →'));
    for(let j=0;j<=current.targetSymbols.length;j++){
      const th=element('th',j===0?'0 · ε':j+' · '+symbol(current.targetSymbols[j-1])); th.scope='col'; header.append(th);
    }
    head.append(header); table.append(head);
    const body=element('tbody');
    for(const row of current.cells){
      const tr=element('tr'), i=row[0].i, th=element('th',i===0?'0 · ε':i+' · '+symbol(current.sourceSymbols[i-1]));
      th.scope='row';tr.append(th);
      for(const cell of row){
        const td=element('td'), button=element('button',String(cell.cost));
        button.type='button';button.dataset.row=String(cell.i);button.dataset.column=String(cell.j);
        button.setAttribute('aria-label','Inspect source prefix '+cell.i+', target prefix '+cell.j+', cost '+cell.cost);
        button.addEventListener('click',()=>selectCell(cell.i,cell.j));
        button.addEventListener('keydown',event=>{
          const delta={ArrowUp:[-1,0],ArrowDown:[1,0],ArrowLeft:[0,-1],ArrowRight:[0,1]}[event.key];
          if(!delta||!current)return;event.preventDefault();
          selectCell(Math.max(0,Math.min(current.sourceSymbols.length,cell.i+delta[0])),
            Math.max(0,Math.min(current.targetSymbols.length,cell.j+delta[1])),true);
        });
        td.append(button);cellButtons.push(button);
        const arrows=cell.candidates.filter(candidate=>candidate.optimal).map(candidate=>candidate.kind==='insert'?'←':candidate.kind==='delete'?'↑':'↖').join(' ');
        if(arrows){ const note=element('span',arrows,'cell-arrows');note.setAttribute('aria-hidden','true');td.append(note); }
        tr.append(td);
      }
      body.append(tr);
    }
    table.append(body);
  }
  const step = byId('edit-step');
  function showReplay() {
    if(!current)return;
    const record=current.replay[Number(step.value)];
    byId('edit-replay-text').textContent=JSON.stringify(record.text);
    byId('edit-replay-cost').textContent='Step '+record.step+' of '+current.alignment.length+' · accumulated cost '+record.cost;
    byId('edit-previous').disabled=record.step===0;
    byId('edit-next').disabled=record.step===current.alignment.length;
  }
  step.addEventListener('input',showReplay);
  byId('edit-previous').addEventListener('click',()=>{if(current){step.value=String(Math.max(0,Number(step.value)-1));showReplay();}});
  byId('edit-next').addEventListener('click',()=>{if(current){step.value=String(Math.min(current.alignment.length,Number(step.value)+1));showReplay();}});
  function compute() {
    retire('Computing…');
    try {
      const costs={};
      for(const [kind,field] of fields){
        if(!/^[1-9]$/.test(field.value))throw new Error(kind+' cost must be one whole digit from 1 to 9.');
        costs[kind]=Number(field.value);
      }
      current=calculateEditDistance({source:source.value,target:target.value,costs});
      byId('edit-minimum').textContent=String(current.distance);
      byId('edit-input-summary').textContent=JSON.stringify(current.input.source)+' → '+JSON.stringify(current.input.target)+
        ' · insertion '+costs.insert+', deletion '+costs.delete+', substitution '+costs.substitute;
      for(let i=0;i<=current.sourceSymbols.length;i++){const option=element('option',i+' · '+prefix(current.sourceSymbols,i));option.value=String(i);rowSelect.append(option);}
      for(let j=0;j<=current.targetSymbols.length;j++){const option=element('option',j+' · '+prefix(current.targetSymbols,j));option.value=String(j);columnSelect.append(option);}
      renderMatrix();selectCell(current.sourceSymbols.length,current.targetSymbols.length);
      if(!current.alignment.length)alignment.append(element('li','Both inputs are empty. No operations are needed.'));
      for(const [index,operation] of current.alignment.entries()){
        alignment.append(element('li',(index+1)+'. '+operation.kind+' · '+symbol(operation.source)+' → '+symbol(operation.target)+
          ' · cost '+operation.cost+' · prefix ['+operation.from.join(', ')+'] → ['+operation.to.join(', ')+']'));
      }
      step.max=String(current.alignment.length);step.value='0';showReplay();
      result.hidden=false;experimentDownload.disabled=false;
      status.textContent='Computed '+current.cells.length+' × '+current.cells[0].length+' prefix states. Minimum cost '+current.distance+'.';
    } catch(error) {
      retire('Cannot compute: '+error.message);
    }
  }
  form.addEventListener('submit',event=>{event.preventDefault();compute();});
  const presetSelect=byId('edit-preset');
  EDIT_PRESETS.forEach((preset,index)=>{const option=element('option',preset.name);option.value=String(index);presetSelect.append(option);});
  function loadPreset() {
    const preset=EDIT_PRESETS[Number(presetSelect.value)];
    source.value=preset.source;target.value=preset.target;
    fields.forEach(([kind,field])=>{field.value=String(preset.costs[kind]);});
    retire('Example loaded. Compute to inspect it.');
  }
  byId('edit-load-preset').addEventListener('click',loadPreset);
  loadPreset();compute();
}
