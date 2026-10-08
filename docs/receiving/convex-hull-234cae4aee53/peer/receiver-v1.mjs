import assert from 'node:assert/strict';

export function receiveHull(api) {
  let assertions = 0, calls = 0;
  const groups = [];
  const check = (value, message) => { assertions++; assert.ok(value, message); };
  const eq = (actual, expected, message) => { assertions++; assert.deepEqual(actual, expected, message); };
  const refuses = (fn, message) => { assertions++; assert.throws(fn, message); };
  const call = (name, ...args) => { calls++; return api[name](...args); };
  const cross = (a,b,c) => (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  const cmp = (a,b) => a.x-b.x || a.y-b.y;
  const key = p => p.x+','+p.y;
  const onSegment = (a,b,p) => cross(a,b,p)===0 &&
    (p.x-a.x)*(p.x-b.x)+(p.y-a.y)*(p.y-b.y)<=0;

  // Independent geometry: enumerate oriented supporting edges. Every point
  // must lie to the left, and collinear points must lie between the endpoints.
  // There is no lower/upper scan in this expected-boundary construction.
  function geometry(points) {
    const inputs = points.map(([x,y],i) => ({id:'P'+(i+1),x,y}));
    const byCoordinate = new Map(), unique = [];
    for (const p of inputs) {
      const existing = byCoordinate.get(key(p));
      if (existing) existing.inputIds.push(p.id);
      else { const u={...p,inputIds:[p.id]}; byCoordinate.set(key(p),u); unique.push(u); }
    }
    const sorted=[...unique].sort(cmp);
    let hull;
    if(sorted.length<=1) hull=sorted;
    else if(sorted.every(p=>cross(sorted[0],sorted.at(-1),p)===0))
      hull=[sorted[0],sorted.at(-1)];
    else {
      const successor=new Map();
      for(const a of unique) for(const b of unique) {
        if(a===b) continue;
        const length2=(b.x-a.x)**2+(b.y-a.y)**2;
        const supports=unique.every(p=>{
          const turn=cross(a,b,p);
          const dot=(p.x-a.x)*(b.x-a.x)+(p.y-a.y)*(b.y-a.y);
          return turn>0 || (turn===0 && dot>=0 && dot<=length2);
        });
        if(supports) {
          check(!successor.has(a.id),'independent supporting edge is unique');
          successor.set(a.id,b);
        }
      }
      hull=[]; let p=sorted[0];
      do { hull.push(p); p=successor.get(p.id); check(p,'closed supporting-edge walk'); }
      while(p.id!==hull[0].id && hull.length<=unique.length);
      check(p.id===hull[0].id && hull.length>=3,'independent polygon closes');
      eq(hull.length,successor.size,'all oriented supporting edges consumed');
    }
    const twiceArea=hull.length<3?0:hull.reduce((s,p,i)=>{
      const q=hull[(i+1)%hull.length]; return s+p.x*q.y-p.y*q.x;
    },0);
    const vertices=new Set(hull.map(p=>p.id));
    const roles=new Map(unique.map(p=>{
      let role='interior';
      if(vertices.has(p.id)) role='vertex';
      else if(hull.length===2 && onSegment(hull[0],hull[1],p)) role='edge';
      else if(hull.length>2 && hull.some((a,i)=>onSegment(a,hull[(i+1)%hull.length],p))) role='edge';
      return [p.id,role];
    }));
    return {inputs,unique,sortedIds:sorted.map(p=>p.id),hull:hull.map(p=>p.id),
      kind:['empty','point','segment'][hull.length] || 'polygon',
      twiceArea,area:twiceArea/2,
      classifications:inputs.map(p=>{
        const representative=byCoordinate.get(key(p));
        return {id:p.id,representativeId:representative.id,
          duplicate:p.id!==representative.id,role:roles.get(representative.id)};
      })};
  }

  function trace(record) {
    check(Array.isArray(record.steps) && record.steps.length>0,'trace exists');
    const byId=new Map(record.unique.map(p=>[p.id,p]));
    const arrays=new Set();
    const stacks={lower:[],upper:[]}, pushed={lower:[],upper:[]};
    let phase='lower';
    for(let i=0;i<record.steps.length;i++) {
      const s=record.steps[i];
      eq(s.index,i,'step index');
      for(const field of ['phase','action','candidate','before','after','tested','determinant','removed'])
        check(Object.hasOwn(s,field),'step field '+field);
      check(Array.isArray(s.before)&&Array.isArray(s.after)&&Array.isArray(s.tested),'trace arrays');
      check(s.before!==s.after,'independent before/after copies');
      check(!arrays.has(s.before)&&!arrays.has(s.after),'snapshots do not alias earlier stacks');
      arrays.add(s.before); arrays.add(s.after);
      if(s.action==='complete') {
        eq(i,record.steps.length-1,'complete is final');
        eq(s.phase,'complete','complete phase');
        eq(s.candidate,null,'complete candidate');
        eq(s.before,[],'complete before');
        eq(s.after,record.hull,'complete full boundary');
        eq(s.tested,[],'complete tested'); eq(s.determinant,null,'complete determinant');
        eq(s.removed,null,'complete removed');
        continue;
      }
      check(record.unique.length>=2,'degenerate record has no scan');
      check(s.phase==='lower'||s.phase==='upper','scan phase');
      if(s.phase==='upper') phase='upper';
      check(!(phase==='upper' && s.phase==='lower'),'phase order');
      eq(s.before,stacks[s.phase],'continuous local stack');
      check(byId.has(s.candidate),'candidate is a unique representative');
      check(['push','pop','retain'].includes(s.action),'scan action');
      if(s.action==='push') {
        eq(s.after,[...s.before,s.candidate],'push adds exactly candidate');
        eq(s.removed,null,'push removes none');
        pushed[s.phase].push(s.candidate);
      } else {
        check(s.before.length>=2,'turn has two stack members');
        eq(s.tested,[s.before.at(-2),s.before.at(-1),s.candidate],'tested turn identity');
        const det=cross(...s.tested.map(id=>byId.get(id)));
        eq(s.determinant,det,'exact turn determinant');
        if(s.action==='pop') {
          check(det<=0,'pop nonpositive');
          eq(s.removed,s.before.at(-1),'pop removes last');
          eq(s.after,s.before.slice(0,-1),'pop shortens exactly one');
        } else {
          check(det>0,'retain positive');
          eq(s.removed,null,'retain removes none');
          eq(s.after,s.before,'retain stack unchanged');
        }
        const next=record.steps[i+1];
        check(next && next.phase===s.phase && next.candidate===s.candidate,'same candidate continues');
        if(s.action==='retain') eq(next.action,'push','positive turn proceeds to push');
      }
      stacks[s.phase]=s.after;
    }
    if(record.unique.length<2) {
      eq(record.steps.length,1,'empty/point only complete');
    } else {
      eq(pushed.lower,record.sortedIds,'lower visits ascending representatives');
      eq(pushed.upper,[...record.sortedIds].reverse(),'upper visits descending representatives');
      eq(record.lower,stacks.lower,'final lower stack');
      eq(record.upper,stacks.upper,'final upper stack');
      check(!arrays.has(record.lower)&&!arrays.has(record.upper)&&!arrays.has(record.hull),
        'record boundary arrays are independent of snapshots');
    }
  }

  function receive(points,label) {
    const untouched=structuredClone(points);
    const expected=geometry(points);
    const record=call('analyzeHull',points);
    eq(points,untouched,label+' input preserved');
    eq(record.format,'recallweave-convex-hull/1',label+' format');
    for(const field of ['inputs','unique','sortedIds','hull','kind','twiceArea','area','classifications'])
      eq(record[field],expected[field],label+' '+field);
    trace(record);
    return record;
  }

  const literalCases=[
    [], [[3,-2]], [[3,-2],[3,-2],[3,-2]], [[4,4],[-4,-4]],
    [[2,2],[0,0],[1,1],[-2,-2],[0,0]],
    [[0,3],[0,-2],[0,1],[0,0],[0,3]],
    [[3,0],[-2,0],[1,0],[0,0],[-2,0]],
    [[20,20],[-20,-20],[20,-20],[-20,20],[0,0],[20,0],[0,-20],[20,20]],
    [[-4,-1],[-2,-4],[3,-3],[5,1],[1,5],[-3,3],[0,0],[1,1],[3,-3]],
    [[1,1],[0,0],[1,0],[0,1]],
    [[0,0],[1,0],[0,1]], [[0,0],[2,0],[0,1]],
  ];
  for(const [i,points] of literalCases.entries()) receive(points,'literal-'+i);
  const square=call('analyzeHull',literalCases[9]);
  eq(square.hull,['P2','P3','P1','P4'],'literal square hull');
  eq(square.steps.filter(s=>s.action==='pop'||s.action==='retain')
    .map(s=>[s.phase,s.action,s.candidate,s.tested,s.determinant,s.removed]),[
      ['lower','pop','P3',['P2','P4','P3'],-1,'P4'],
      ['lower','retain','P1',['P2','P3','P1'],1,null],
      ['upper','pop','P4',['P1','P3','P4'],-1,'P3'],
      ['upper','retain','P2',['P1','P4','P2'],1,null],
    ],'literal explanatory trace');
  groups.push({name:'literal geometry and trace',cases:literalCases.length});

  const grid=Array.from({length:9},(_,i)=>[i%3-1,Math.floor(i/3)-1]);
  for(let mask=0;mask<512;mask++)
    receive(grid.filter((_,i)=>mask&(1<<i)),'grid-'+mask);
  groups.push({name:'all subsets of the 3 by 3 lattice',cases:512});

  let seed=0x4a3c21;
  function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;}
  for(let n=0;n<180;n++) {
    const points=Array.from({length:16},()=>[random()%41-20,random()%41-20]);
    if(n%3===0) points[15]=[...points[0]];
    const a=receive(points,'seed-'+n);
    const variants=[[...points].reverse(),[...points.slice(5),...points.slice(0,5)]];
    const xy=r=>r.hull.map(id=>{const p=r.inputs.find(x=>x.id===id);return[p.x,p.y];});
    for(const [j,variant] of variants.entries()) {
      const b=receive(variant,'seed-'+n+'-permutation-'+j);
      eq(xy(b),xy(a),'geometric boundary invariant to input order');
    }
  }
  groups.push({name:'bounded samples and input permutations',cases:540});

  const frozen=Object.freeze([Object.freeze([-20,-20]),Object.freeze([20,-20]),Object.freeze([0,20])]);
  receive(frozen,'frozen input');
  const repeat=call('analyzeHull',literalCases[7]);
  eq(call('analyzeHull',literalCases[7]),repeat,'repeat deterministic');
  groups.push({name:'input preservation and deterministic repetition',cases:3});

  const invalid=[
    undefined,null,{},'',1,[[0]],[[0,0,0]],[[]],[null],[{}],
    [[0.5,0]],[[0,-0.5]],[[NaN,0]],[[Infinity,0]],[[0,-Infinity]],
    [[-21,0]],[[21,0]],[[0,-21]],[[0,21]],[['0',0]],[[0,true]],
    [[0,null]],[[0,undefined]],[new Array(2)],new Array(1),
    Array.from({length:17},()=>[0,0])
  ];
  for(const [i,value] of invalid.entries())
    refuses(()=>call('analyzeHull',value),'invalid input '+i);
  groups.push({name:'exact bounded array admission',cases:invalid.length});

  eq(call('parseHullPoints','[]'),[],'explicit empty JSON');
  eq(call('parseHullPoints',' \n\t[[0,0],[20,-20],[0,0]]\r\n'),[[0,0],[20,-20],[0,0]],'JSON source order');
  const exact=' '.repeat(4094)+'[]';
  eq(Buffer.byteLength(exact),4096,'exact parser boundary');
  eq(call('parseHullPoints',exact),[],'exact byte boundary admits');
  const badText=[undefined,null,{},0,'',' \t\n','[','{}','null','0','0,0\n1,1','[[0,0],]',
    '[[1e309,0]]','[[0.1,0]]','[[0]]','[[0,0,0]]','[[21,0]]','["🔎"]',
    ' '.repeat(4095)+'[]',JSON.stringify(Array.from({length:17},()=>[0,0]))];
  for(const [i,text] of badText.entries())
    refuses(()=>call('parseHullPoints',text),'invalid text '+i);
  groups.push({name:'JSON text and byte-limit admission',cases:badText.length+3});

  const inputs=[[1,1],[0,0],[1,0],[0,1],[0,0]];
  const source=call('analyzeHull',inputs);
  for(const selectedStep of [0,Math.floor(source.steps.length/2),source.steps.length-1]) {
    const json=call('serializeHullRecord',inputs,selectedStep);
    check(typeof json==='string' && json.endsWith('\n'),'serialized JSON text final LF');
    const decoded=JSON.parse(json), expected={...source,selectedStep};
    eq(decoded,expected,'complete recomputed saved record');
    check(json.includes('\n  "'),'pretty JSON');
    eq(decoded.steps.length,source.steps.length,'selection does not truncate trace');
  }
  eq(JSON.parse(call('serializeHullRecord',[],0)).selectedStep,0,'empty selected complete');
  eq(JSON.parse(call('serializeHullRecord',inputs)).selectedStep,0,'default selected index');
  for(const index of [-1,source.steps.length,0.5,NaN,Infinity,'0',null])
    refuses(()=>call('serializeHullRecord',inputs,index),'invalid selected index');
  refuses(()=>call('serializeHullRecord',[[21,0]],0),'serializer readmits inputs');
  groups.push({name:'complete JSON record and selection admission',cases:13});

  return {format:'recallweave-hull-independent-receiving/1',groups,assertions,calls,
    scope:'Native model execution through exact source data URL. No filesystem, browser, or Actions qualification.'};
}
