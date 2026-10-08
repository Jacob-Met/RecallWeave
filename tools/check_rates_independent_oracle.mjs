#!/usr/bin/env node
// Independent receiving oracle: integrates polynomial antiderivatives, splits at exact roots.
// No production helper is reused. Run against a frozen receiving tree.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const argv=process.argv.slice(2), option=(key,fallback)=>argv.includes(key)?argv[argv.indexOf(key)+1]:fallback;
const root=resolve(option('--root','.')), output=resolve(option('--output','rates-independent-oracle.json'));
const corePath=join(root,'src/rates-accumulation.mjs');
const bytes=await readFile(corePath,'utf8'), hash=s=>createHash('sha256').update(s).digest('hex');
const {analyzeMotion}=await import(pathToFileURL(corePath));
const magnitude=x=>x<0n?-x:x;
const q=(n,d=1n)=>{n=BigInt(n);d=BigInt(d);assert.notEqual(d,0n);if(d<0n){n=-n;d=-d;}let x=magnitude(n),y=d;while(y){[x,y]=[y,x%y];}return [n/x,d/x];};
const plus=(a,b)=>q(a[0]*b[1]+b[0]*a[1],a[1]*b[1]);
const minus=(a,b)=>q(a[0]*b[1]-b[0]*a[1],a[1]*b[1]);
const times=(a,b)=>q(a[0]*b[0],a[1]*b[1]);
const over=(a,b)=>q(a[0]*b[1],a[1]*b[0]);
const absolute=a=>q(magnitude(a[0]),a[1]);
const cmp=(a,b)=>Math.sign(Number(a[0]*b[1]-b[0]*a[1]));
const Q0=q(0),Q2=q(2), text=a=>a[0]+'/'+a[1];
const decimal=ticks=>ticks%10===0?String(ticks/10):String(ticks/10);
const csv=points=>'time_s,velocity_m_s\n'+points.map(([t,v])=>t+','+decimal(v)).join('\n');
function integral(coefficients,u){
  // Polynomial antiderivative evaluated at u: c0*u + (c1/2)*u^2.
  return plus(times(coefficients[0],u),times(over(coefficients[1],Q2),times(u,u)));
}
function expected(points,ticks){
  const t=q(ticks,10), segments=[];
  let position=Q0, travel=Q0, velocity;
  const slopes=[];
  for(let i=0;i<points.length-1;i++){
    const a=q(points[i][0]),b=q(points[i+1][0]),va=q(points[i][1],10),vb=q(points[i+1][1],10);
    const duration=minus(b,a), slope=over(minus(vb,va),duration), coefficients=[va,slope];
    slopes.push(slope);
    const u=cmp(t,a)<=0?Q0:cmp(t,b)>=0?duration:minus(t,a);
    const root=slope[0]===0n?null:over(q(-va[0],va[1]),slope);
    function amounts(end){
      const whole=integral(coefficients,end);
      const breakpoints=[Q0];
      if(root&&cmp(root,Q0)>0&&cmp(root,end)<0)breakpoints.push(root);
      breakpoints.push(end);
      let length=Q0;
      for(let j=1;j<breakpoints.length;j++)length=plus(length,absolute(minus(integral(coefficients,breakpoints[j]),integral(coefficients,breakpoints[j-1]))));
      return {signed:whole,length};
    }
    const prefix=amounts(u),full=amounts(duration);
    position=plus(position,prefix.signed);travel=plus(travel,prefix.length);
    if(cmp(t,a)>=0&&cmp(t,b)<=0)velocity=plus(va,times(slope,minus(t,a)));
    segments.push({from:a,to:b,firstVelocity:va,lastVelocity:vb,acceleration:slope,coveredUntil:plus(a,u),coveredDuration:u,
      fullDisplacement:full.signed,fullDistance:full.length,coveredDisplacement:prefix.signed,coveredDistance:prefix.length,
      zeroCrossing:root&&cmp(root,Q0)>0&&cmp(root,duration)<0?plus(a,root):null,
      coverage:cmp(u,Q0)===0?'not-started':cmp(u,duration)===0?'complete':'partial'});
  }
  let acceleration;
  if(ticks===0)acceleration={kind:'start-boundary',value:null,left:null,right:slopes[0]};
  else if(ticks===points.at(-1)[0]*10)acceleration={kind:'end-boundary',value:null,left:slopes.at(-1),right:null};
  else{
    const knot=points.findIndex(([time])=>time*10===ticks);
    if(knot>=0){
      const left=slopes[knot-1],right=slopes[knot];
      acceleration={kind:cmp(left,right)===0?'defined':'corner',value:cmp(left,right)===0?left:null,left,right};
    }else{
      const segment=points.findIndex(([time])=>time*10>ticks)-1, value=slopes[segment];
      acceleration={kind:'defined',value,left:value,right:value};
    }
  }
  return {time:t,endTime:q(points.at(-1)[0]),velocity,displacement:position,distance:travel,averageVelocity:ticks?over(position,t):null,acceleration,segments};
}
function compareValue(actual,wanted,label){
  if(wanted===null){assert.equal(actual,null,label);return;}
  assert.ok(actual&&typeof actual==='object',label+' missing value');
  assert.equal(actual.fraction,text(wanted),label+' fraction');
  const numeric=Number(wanted[0])/Number(wanted[1]);
  assert.ok(Number.isFinite(actual.approximate)&&Math.abs(actual.approximate-numeric)<=1e-12*Math.max(1,Math.abs(numeric)),label+' approximate');
}
function verify(fn,points,ticks,label){
  const result=fn(csv(points),decimal(ticks)), wanted=expected(points,ticks);
  for(const key of ['time','endTime','velocity','displacement','distance','averageVelocity'])compareValue(result[key],wanted[key],label+'.'+key);
  assert.equal(result.acceleration.kind,wanted.acceleration.kind,label+'.acceleration.kind');
  for(const key of ['value','left','right'])compareValue(result.acceleration[key],wanted.acceleration[key],label+'.acceleration.'+key);
  assert.equal(result.segments.length,wanted.segments.length,label+'.segments.length');
  wanted.segments.forEach((row,i)=>{
    const actual=result.segments[i];
    for(const key of Object.keys(row)){
      if(key==='coverage')assert.equal(actual[key],row[key],label+'.segments['+i+'].coverage');
      else compareValue(actual[key],row[key],label+'.segments['+i+'].'+key);
    }
  });
  assert.ok(Object.isFrozen(result)&&Object.isFrozen(result.segments)&&Object.isFrozen(result.segments[0]),'result must retain stable evidence');
  return result;
}
const report={format:'recallweave-rates-independent-oracle/1',started:new Date().toISOString(),node:process.version,root,sourceSha256:hash(bytes),method:'Independent polynomial antiderivative and exact rational root partition, including full/prefix segment evidence and derivative boundary oracle',cases:0,negativeInputs:0,mutationControls:[],status:'running'};
let seed=0x6377045b;
const random=max=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%max;};
const known=[
  [[0,30],[4,-10]],[[0,10],[1,-20]],[[0,0],[2,40],[4,0],[6,-40],[8,0]],
  [[0,20],[2,0],[4,20]],[[0,0],[2,0],[5,30],[8,30]],[[0,-20],[3,-20],[5,0]],
  [[0,0],[1,0]],[[0,250],[120,250]],[[0,-500],[120,500]],[[0,10],[2,30],[4,50]]
];
try{
  for(const [index,points] of known.entries()){
    for(let ticks=0;ticks<=points.at(-1)[0]*10;ticks++){
      verify(analyzeMotion,points,ticks,'known-'+index+'@'+decimal(ticks));report.cases++;
    }
  }
  for(let trial=0;trial<220;trial++){
    const count=2+random(7),points=[[0,random(1001)-500]];
    for(let i=1;i<count;i++)points.push([points.at(-1)[0]+1+random(16),random(1001)-500]);
    const end=points.at(-1)[0]*10,checks=new Set([0,end,...points.map(p=>p[0]*10)]);
    for(let i=0;i<14;i++)checks.add(random(end+1));
    for(const ticks of checks){verify(analyzeMotion,points,ticks,'generated-'+trial+'@'+decimal(ticks));report.cases++;}
  }
  const valid=csv([[0,30],[4,-10]]);
  const bad=[
    [null,'0'],['','0'],['time,velocity\n0,1\n2,2','0'],['time_s,velocity_m_s\n0,1','0'],
    ['time_s,velocity_m_s\n1,1\n2,2','1'],['time_s,velocity_m_s\n0,1\n0,2','0'],
    ['time_s,velocity_m_s\n0,1\n3,2\n2,3','1'],['time_s,velocity_m_s\n0,1\n121,2','0'],
    ['time_s,velocity_m_s\n0.5,1\n2,2','1'],['time_s,velocity_m_s\n0,50.1\n2,2','1'],
    ['time_s,velocity_m_s\n0,-50.1\n2,2','1'],['time_s,velocity_m_s\n0,1.11\n2,2','1'],
    ['time_s,velocity_m_s\n0,1e1\n2,2','1'],['time_s,velocity_m_s\n0,NaN\n2,2','1'],
    ['time_s,velocity_m_s\n0,Infinity\n2,2','1'],['time_s,velocity_m_s\n0,1,2\n2,2','1'],
    [valid,'-0.1'],[valid,'4.1'],[valid,'0.01'],[valid,'1e0'],[valid,'NaN'],[valid,2],
    ['time_s,velocity_m_s\n'+Array.from({length:9},(_,i)=>i+',1').join('\n'),'1'],
    [' '.repeat(2049),'0']
  ];
  for(const [source,time]of bad){assert.throws(()=>analyzeMotion(source,time));report.negativeInputs++;}
  const mutants=[
    {name:'absolute-net-is-distance',from:'distance = add(distance, prefix.distance);',to:'distance = mag(displacement);',points:known[0],ticks:40},
    {name:'rounded-inspection-time',from:"const t = tenths(selectedTime, 'Inspection time');",to:'const t = rational(BigInt(Math.floor(Number(selectedTime))));',points:known[1],ticks:5},
    {name:'invented-corner-acceleration',from:'value: compare(left, right) === 0 ? value(left) : null',to:'value: value(div(add(left, right), two))',points:known[2],ticks:20},
    {name:'reversed-displacement-sign',from:'displacement = add(displacement, prefix.signed);',to:'displacement = sub(displacement, prefix.signed);',points:known[0],ticks:20}
  ];
  for(const m of mutants){
    assert.equal(bytes.split(m.from).length,2,'mutation anchor must be unique');
    const changed=bytes.replace(m.from,m.to), module=await import('data:text/javascript;base64,'+Buffer.from(changed).toString('base64'));
    let mismatch;
    try{verify(module.analyzeMotion,m.points,m.ticks,'mutant-'+m.name);}catch(error){assert.equal(error.code,'ERR_ASSERTION');mismatch=error.message;}
    assert.ok(mismatch,'oracle must detect '+m.name);
    report.mutationControls.push({name:m.name,sha256:hash(changed),detected:true,mismatch});
  }
  assert.equal(hash(await readFile(corePath)),report.sourceSha256,'production source changed during receiving');
  report.status='passed';
}catch(error){report.status='failed';report.error=error.stack;process.exitCode=1;}
report.finished=new Date().toISOString();
await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
