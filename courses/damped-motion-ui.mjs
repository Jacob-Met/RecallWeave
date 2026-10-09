(() => {
  const $ = id => document.getElementById(id);
  const form = $('parameters'), fields = Object.keys(PARAMETER_LIMITS);
  const slider = $('time-slider'), timeInput = $('time-number'), downloadButton = $('download-observation');
  let applied = null, samples = null, inspectionTime = 0, validInspection = false;
  const standard = {mass:1, stiffness:4, x0:.5, v0:0, duration:10};
  const presets = {
    undamped:{...standard,dampingRatio:0}, underdamped:{...standard,dampingRatio:.25},
    critical:{...standard,dampingRatio:1}, overdamped:{...standard,dampingRatio:2},
    crossing:{mass:1,stiffness:1,dampingRatio:1,x0:.25,v0:-1,duration:4},
    rest:{...standard,dampingRatio:.25,x0:0,v0:0,duration:5},
  };
  const format = value => value === 0 ? '0' :
    Math.abs(value) >= 1e5 || Math.abs(value) < 1e-5 ? value.toExponential(6) : Number(value.toPrecision(8)).toString();
  function message(text, error = false) {
    $('status').textContent = text; $('status').classList.toggle('error', error);
  }
  function markStale() {
    applied = null; samples = null; validInspection = false;
    $('experiment-region').classList.add('stale');
    slider.disabled = true; timeInput.disabled = true; downloadButton.disabled = true;
    message('Parameters edited. The faded display is the previous experiment. Apply the complete draft to inspect or download new results.');
  }
  function element(tag, attributes, text) {
    const node = document.createElementNS('http://www.w3.org/2000/svg',tag);
    for (const [key,value] of Object.entries(attributes)) node.setAttribute(key,String(value));
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function plot(id, field, low, high, unit, colour) {
    const svg = $(id), left=76, right=638, top=20, bottom=212;
    const px = t => left+t/applied.parameters.duration*(right-left);
    const py = y => bottom-(y-low)/(high-low)*(bottom-top);
    svg.replaceChildren();
    for(let i=0;i<=4;i++) {
      const t=applied.parameters.duration*i/4;
      svg.append(element('line',{x1:px(t),y1:top,x2:px(t),y2:bottom,stroke:'#e5edef'}));
      svg.append(element('text',{x:px(t),y:231,'text-anchor':'middle'},format(t)));
    }
    for(let i=0;i<=2;i++) {
      const y=low+(high-low)*i/2;
      svg.append(element('line',{x1:left,y1:py(y),x2:right,y2:py(y),stroke:'#e5edef'}));
      svg.append(element('text',{x:left-8,y:py(y)+4,'text-anchor':'end'},format(y)));
    }
    svg.append(element('line',{x1:left,y1:bottom,x2:right,y2:bottom,class:'axis'}));
    svg.append(element('line',{x1:left,y1:top,x2:left,y2:bottom,class:'axis'}));
    svg.append(element('text',{x:358,y:247,'text-anchor':'middle'},'Time (s)'));
    svg.append(element('text',{x:10,y:13},unit));
    const d=samples.map((s,i)=>(i?'L':'M')+px(s.t).toFixed(3)+','+py(s[field]).toFixed(3)).join(' ');
    svg.append(element('path',{d,stroke:colour}));
    svg.append(element('line',{id:id+'-marker',x1:px(inspectionTime),x2:px(inspectionTime),y1:top,y2:bottom,class:'marker'}));
  }
  function curves() {
    const span=applied.amplitudeBound>0?applied.amplitudeBound*1.08:1;
    plot('displacement-plot','x',-span,span,'x (m)','#087881');
    plot('energy-plot','mechanicalEnergy',0,applied.initialEnergy>0?applied.initialEnergy*1.08:1,'E (J)','#854c95');
    $('sampling').textContent=samples.length+' analytical samples; at least 48 intervals per sinusoidal cycle plus decay-time refinement. Lines connect samples, not integration steps.';
  }
  function show(state) {
    const rows=[['Time (s)',state.t],['Displacement x (m)',state.x],['Velocity v (m/s)',state.v],
      ['Acceleration a (m/s²)',state.a],['Spring force (N)',state.springForce],['Damping force (N)',state.dampingForce],
      ['Kinetic energy (J)',state.kineticEnergy],['Spring energy (J)',state.springEnergy],
      ['Mechanical energy (J)',state.mechanicalEnergy],['Energy rate (W)',state.energyRate],
      ['Energy transferred (J)',state.energyTransferred]];
    const dl=$('state-values'); dl.replaceChildren();
    for(const [label,value] of rows) {
      const dt=document.createElement('dt'),dd=document.createElement('dd');
      dt.textContent=label; dd.textContent=format(value); dl.append(dt,dd);
    }
    const x=76+state.t/applied.parameters.duration*(638-76);
    for(const id of ['displacement-plot-marker','energy-plot-marker']) {
      $(id).setAttribute('x1',String(x)); $(id).setAttribute('x2',String(x));
    }
  }
  function inspect(value) {
    if(!applied) return;
    try {
      const state=stateAt(applied,value);
      inspectionTime=state.t; slider.value=String(state.t); show(state);
      validInspection=true; downloadButton.disabled=false;
      message('Applied '+applied.regime+' experiment. Inspecting t = '+format(state.t)+' s. Results use the applied parameters.');
    } catch(error) {
      validInspection=false; downloadButton.disabled=true;
      message(error.message+' The last valid state remains displayed; enter a valid inspection time.',true);
    }
  }
  function apply(raw) {
    try {
      const next=makeExperiment(raw), trajectory=sampleTrajectory(next);
      applied=next; samples=trajectory; inspectionTime=0; validInspection=true;
      $('experiment-region').classList.remove('stale');
      slider.max=String(next.parameters.duration); slider.value='0'; timeInput.value='0';
      slider.disabled=false; timeInput.disabled=false;
      $('regime').textContent=next.regime;
      $('derived').textContent='b = '+format(next.damping)+' N·s/m · ω₀ = '+format(next.omega0)+' rad/s';
      curves(); inspect(0);
    } catch(error) {markStale(); message(error.message+' No new experiment was applied.',true);}
  }
  function download(name,text,type) {
    const url=URL.createObjectURL(new Blob([text],{type})), link=document.createElement('a');
    link.href=url; link.download=name; document.body.append(link); link.click(); link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  form.addEventListener('input',markStale);
  form.addEventListener('submit',event=>{
    event.preventDefault(); apply(Object.fromEntries(fields.map(key=>[key,$(key).value])));
  });
  for(const button of document.querySelectorAll('[data-preset]')) button.addEventListener('click',()=>{
    const raw=presets[button.dataset.preset];
    for(const key of fields) $(key).value=String(raw[key]);
    apply(raw);
  });
  slider.addEventListener('input',()=>{timeInput.value=slider.value; inspect(slider.value);});
  timeInput.addEventListener('input',()=>inspect(timeInput.value));
  downloadButton.addEventListener('click',()=>{
    if(applied&&validInspection) download('damped-motion-observation.json',
      JSON.stringify(makeObservation(applied,inspectionTime),null,2)+'\n','application/json;charset=utf-8');
  });
  $('download-course').addEventListener('click',()=>download('damped-motion.json',DAMPED_MOTION_COURSE_TEXT,'application/json;charset=utf-8'));
  $('download-guide').addEventListener('click',()=>download('damped-motion.md',DAMPED_MOTION_GUIDE_TEXT,'text/markdown;charset=utf-8'));
  apply(Object.fromEntries(fields.map(key=>[key,$(key).value])));
})();
