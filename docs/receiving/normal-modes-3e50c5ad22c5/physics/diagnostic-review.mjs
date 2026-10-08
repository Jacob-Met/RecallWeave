import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {integrateNewton,physicalEnergy} from './physics-oracle-supported.mjs';

const [candidatePath,receiptPath]=process.argv.slice(2);
assert.ok(candidatePath&&receiptPath,'Usage: node diagnostic-review.mjs candidate.mjs new-receipt.json');
const digest=()=>createHash('sha256').update(readFileSync(candidatePath)).digest('hex');
const sourceBefore=digest(),startedAt=new Date().toISOString();
const api=await import(pathToFileURL(path.resolve(candidatePath)).href);
const base={mass:1,wallStiffness:8,coupling:3,x1:.07,x2:-.05,v1:.04,v2:-.02,duration:20};
const records=[];
const test=(name,fn)=>{try{records.push({name,pass:true,...fn()});}catch(error){records.push({name,pass:false,error:String(error.message)});}};
let comparisons=0,maxDiagnosticScaledError=0;
function near(actual,expected,label,tolerance=3e-12){
  assert.ok(Number.isFinite(actual),label+' must be finite');
  const error=Math.abs(actual-expected)/(1+Math.abs(expected));
  comparisons++;maxDiagnosticScaledError=Math.max(maxDiagnosticScaledError,error);
  assert.ok(error<=tolerance,label+' scaled error '+error+' > '+tolerance);
}
function verifyState(p,s,initial){
  const m=p.mass,k=p.wallStiffness,c=p.coupling;
  const qp=(s.x1+s.x2)/2,qm=(s.x1-s.x2)/2,up=(s.v1+s.v2)/2,um=(s.v1-s.v2)/2;
  const a1=(-(k+c)*s.x1+c*s.x2)/m,a2=(c*s.x1-(k+c)*s.x2)/m;
  for(const [key,value] of Object.entries({qPlus:qp,qMinus:qm,uPlus:up,uMinus:um,a1,a2,force1:m*a1,force2:m*a2}))near(s[key],value,key);
  const kinetic=m*(s.v1**2+s.v2**2)/2,wallPotential=k*(s.x1**2+s.x2**2)/2,couplingPotential=c*(s.x1-s.x2)**2/2;
  const total=kinetic+wallPotential+couplingPotential;
  const plus=m*up**2+k*qp**2,minus=m*um**2+(k+2*c)*qm**2;
  const initialEnergy=physicalEnergy({m,k,c},initial);
  for(const [key,value] of Object.entries({kinetic,wallPotential,couplingPotential,total,plus,minus,drift:total-initialEnergy}))near(s.energies[key],value,'energies.'+key);
  near(total,initialEnergy,'conserved physical energy',3e-11);
}
const params=[];
for(const mass of [.1,1,10])for(const wallStiffness of [1,8,200])for(const coupling of [0,3,200])params.push({...base,mass,wallStiffness,coupling});
test('reported forces, accelerations, modes, and energies across parameter bounds',()=>{
  for(const p of params){
    const e=api.makeExperiment(p),qp=(p.x1+p.x2)/2,qm=(p.x1-p.x2)/2,up=(p.v1+p.v2)/2,um=(p.v1-p.v2)/2;
    near(e.omega.plus,Math.sqrt(p.wallStiffness/p.mass),'omega.plus');
    near(e.omega.minus,Math.sqrt((p.wallStiffness+2*p.coupling)/p.mass),'omega.minus');
    for(const [key,value] of Object.entries({qPlus:qp,qMinus:qm,uPlus:up,uMinus:um}))near(e.initial[key],value,'initial.'+key);
    near(e.energy.plus,p.mass*up**2+p.wallStiffness*qp**2,'initial plus energy');
    near(e.energy.minus,p.mass*um**2+(p.wallStiffness+2*p.coupling)*qm**2,'initial minus energy');
    near(e.energy.total,physicalEnergy({m:p.mass,k:p.wallStiffness,c:p.coupling},p),'initial total energy');
    assert.equal(e.degenerate,p.coupling===0);
    for(const t of [-20,-.37,0,.21,20]){
      const s=api.stateAt(e,t);near(s.t,t,'reported time');verifyState(p,s,p);
      near(s.energies.plus,e.energy.plus,'conserved plus energy');
      near(s.energies.minus,e.energy.minus,'conserved minus energy');
      assert.ok(Math.abs(s.x1)<=e.amplitudeBound+1e-12&&Math.abs(s.x2)<=e.amplitudeBound+1e-12,'amplitude bound');
    }
  }
  return{parameterSets:params.length,states:params.length*5,comparisons,maxScaledError:maxDiagnosticScaledError};
});
test('Cartesian Newton reference at all 8 mass/stiffness/coupling corners',()=>{
  let cases=0,maxScaledError=0;
  for(const mass of [.1,10])for(const wallStiffness of [1,200])for(const coupling of [0,200]){
    const p={...base,mass,wallStiffness,coupling},e=api.makeExperiment(p);
    for(const t of [-.31,.21,20]){
      const s=api.stateAt(e,t),reference=integrateNewton({m:mass,k:wallStiffness,c:coupling},p,t);
      for(const key of ['x1','x2','v1','v2']){
        const error=Math.abs(s[key]-reference[key])/(1+Math.abs(reference[key]));
        assert.ok(error<2e-9,key+' corner RK4 error '+error);maxScaledError=Math.max(maxScaledError,error);
      }cases++;
    }
  }
  return{cases,maxScaledError,tolerance:2e-9};
});
test('complete numeric input and documented boundary enforcement',()=>{
  let rejected=0;
  const invalid=['','1abc','0x10',true,null,undefined,NaN,Infinity,-Infinity,[],{}];
  for(const value of invalid){assert.throws(()=>api.makeExperiment({...base,mass:value}));rejected++;}
  for(const key of Object.keys(base)){const omitted={...base};delete omitted[key];assert.throws(()=>api.makeExperiment(omitted));rejected++;}
  const outside={mass:[.099999,10.000001],wallStiffness:[.999999,200.000001],coupling:[-.000001,200.000001],x1:[-1.000001,1.000001],x2:[-1.000001,1.000001],v1:[-2.000001,2.000001],v2:[-2.000001,2.000001],duration:[.099999,20.000001]};
  for(const [key,values] of Object.entries(outside))for(const value of values){assert.throws(()=>api.makeExperiment({...base,[key]:value}));rejected++;}
  for(const [key,values] of Object.entries({mass:[.1,10],wallStiffness:[1,200],coupling:[0,200],x1:[-1,1],x2:[-1,1],v1:[-2,2],v2:[-2,2],duration:[.1,20]}))for(const value of values)assert.equal(api.makeExperiment({...base,[key]:value}).parameters[key],value);
  const fromStrings=api.makeExperiment(Object.fromEntries(Object.entries(base).map(([key,value])=>[key,String(value)])));
  assert.deepEqual(fromStrings.parameters,base);
  assert.throws(()=>api.makeExperiment({...base,coupling:'1e-999'}));rejected++;
  const e=api.makeExperiment(base);
  for(const value of [-20.000001,20.000001,'',NaN,Infinity,'0x1',null]){assert.throws(()=>api.stateAt(e,value));rejected++;}
  assert.equal(api.stateAt(e,-20).t,-20);assert.equal(api.stateAt(e,20).t,20);
  return{rejectedInvalidInputs:rejected};
});
test('exported trajectory resolution and diagnostic units at maximum frequency',()=>{
  const p={...base,mass:.1,wallStiffness:200,coupling:200},e=api.makeExperiment(p);
  const obs=api.makeObservation(e,12.3),rows=obs.trajectory;
  assert.equal(rows[0].t,0);assert.equal(rows.at(-1).t,20);
  assert.equal(rows.length,obs.sampling.points);assert.equal(rows.length-1,obs.sampling.intervals);
  assert.ok(obs.convention.includes('qPlus=(x1+x2)/2')&&obs.convention.includes('effective modal mass=2*mass'));
  assert.equal(obs.units.energy,'J');assert.equal(obs.units.angularFrequency,'rad/s');
  const maxStep=2*Math.PI/(48*Math.sqrt(600/.1));
  for(let i=1;i<rows.length;i++)assert.ok(rows[i].t>rows[i-1].t&&rows[i].t-rows[i-1].t<=maxStep+1e-13);
  for(const row of [rows[0],rows[Math.floor(rows.length/2)],rows.at(-1)])verifyState(p,row,p);
  return{points:rows.length,minimumIntervalsPerFastestCycle:48,inspectionTime:obs.state.t};
});
test('diagnostic negative controls reject sign, coordinate, and energy defects',()=>{
  const s=api.stateAt(api.makeExperiment(base),.31),rejected=[];
  const mutants=[
    ['force-sign',{...s,force1:-s.force1}],
    ['orthonormal-coordinate',{...s,qPlus:Math.SQRT2*s.qPlus}],
    ['extra-half-modal-energy',{...s,energies:{...s.energies,minus:s.energies.minus/2}}],
  ];
  for(const [name,mutant] of mutants){assert.throws(()=>verifyState(base,mutant,base));rejected.push(name);}
  return{rejected};
});
const sourceAfter=digest(),sourceStable=sourceBefore===sourceAfter;
const receipt={startedAt,completedAt:new Date().toISOString(),candidatePath:path.resolve(candidatePath),candidateSHA256:sourceBefore,candidateSHA256After:sourceAfter,sourceStable,node:process.version,pass:records.every(r=>r.pass)&&sourceStable,records,scope:'Post-source-inspection review of returned diagnostics, supported parameter bounds, and exported sampling; primary physics oracle was separately frozen before inspection.'};
writeFileSync(receiptPath,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(receipt,null,2));
if(!receipt.pass)process.exitCode=1;
