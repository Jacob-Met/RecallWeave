/**
 * Frozen before candidate implementation/content inspection, 2026-10-08.
 * Independent interface: sample({m,k,c}, {x1,x2,v1,v2}, t) -> {x1,x2,v1,v2}.
 * Candidate adapters belong in a separate file. No candidate source is imported here.
 * The numerical reference integrates Newton's equations in physical coordinates.
 */
import assert from 'node:assert/strict';

export const FROZEN_CONTRACT = Object.freeze({
  domain: 'finite m>0, k>0, c>=0; bounded initial displacements/velocities; signed finite time',
  equations: ["m*x1''=-(k+c)*x1+c*x2", "m*x2''=c*x1-(k+c)*x2"],
  coordinates: ['qPlus=(x1+x2)/2', 'qMinus=(x1-x2)/2'],
  frequencies: ['sqrt(k/m)', 'sqrt((k+2*c)/m)'],
  physicalEnergy: '0.5*m*(v1*v1+v2*v2)+0.5*k*(x1*x1+x2*x2)+0.5*c*(x1-x2)**2',
  modalEnergy: 'm*(qPlusDot**2+qMinusDot**2)+k*qPlus**2+(k+2*c)*qMinus**2',
  reviewMethod: 'Fixed exact fixtures, Cartesian RK4, Cartesian finite-difference Newton residual, conservation, restart reversal, exchange symmetry, negative controls.',
});

const keys = ['x1', 'x2', 'v1', 'v2'];
const vector = state => keys.map(key => state[key]);
const state = values => Object.fromEntries(keys.map((key, index) => [key, values[index]]));
export function physicalEnergy(p, s) {
  return p.m * (s.v1 ** 2 + s.v2 ** 2) / 2 + p.k * (s.x1 ** 2 + s.x2 ** 2) / 2 + p.c * (s.x1 - s.x2) ** 2 / 2;
}
function modalEnergy(p, s) {
  const qp = (s.x1 + s.x2) / 2, qm = (s.x1 - s.x2) / 2;
  const vp = (s.v1 + s.v2) / 2, vm = (s.v1 - s.v2) / 2;
  return p.m * (vp ** 2 + vm ** 2) + p.k * qp ** 2 + (p.k + 2 * p.c) * qm ** 2;
}
const derivative = (p, a) => [a[2], a[3], (-(p.k+p.c)*a[0]+p.c*a[1])/p.m, (p.c*a[0]-(p.k+p.c)*a[1])/p.m];

/** RK4 uses only Cartesian forces, never candidate/modal formulas. */
export function integrateNewton(p, initial, t) {
  const maxStep = Math.min(0.002, 0.002 / Math.sqrt((p.k + 2 * p.c) / p.m));
  const n = Math.max(1, Math.ceil(Math.abs(t) / maxStep)), h = t / n;
  let y = vector(initial);
  const shift = (a, b, f) => a.map((v, j) => v + f * b[j]);
  for (let j = 0; j < n; j++) {
    const a = derivative(p, y), b = derivative(p, shift(y, a, h/2));
    const c = derivative(p, shift(y, b, h/2)), d = derivative(p, shift(y, c, h));
    y = y.map((v, i) => v + h*(a[i]+2*b[i]+2*c[i]+d[i])/6);
  }
  return state(y);
}
function compare(actual, expected, tolerance, label) {
  assert.equal(actual.length, expected.length, label);
  let max = 0;
  for (let j = 0; j < expected.length; j++) {
    assert.ok(Number.isFinite(actual[j]), label + ': non-finite output');
    const error = Math.abs(actual[j] - expected[j]) / (1 + Math.abs(expected[j]));
    max = Math.max(max, error);
    assert.ok(error <= tolerance, label + ': coordinate ' + j + ' scaled error ' + error + ' > ' + tolerance);
  }
  return max;
}
export const exactFixtures = Object.freeze([
  {name:'pure in-phase quarter period with nonzero initial velocity',
   p:{m:2,k:8,c:6}, initial:{x1:.6,x2:.6,v1:-.3,v2:-.3},
   t:Math.PI/4, expected:{x1:-.15,x2:-.15,v1:-1.2,v2:-1.2}, energy:3.06},
  {name:'pure out-of-phase quarter period with nonzero initial velocity',
   p:{m:2,k:2,c:3}, initial:{x1:.75,x2:-.75,v1:-.4,v2:.4},
   t:Math.PI/4, expected:{x1:-.2,x2:.2,v1:-1.5,v2:1.5}, energy:4.82},
  {name:'zero coupling degeneracy with unrelated initial states',
   p:{m:2,k:8,c:0}, initial:{x1:.7,x2:-.2,v1:.4,v2:1},
   t:Math.PI/4, expected:{x1:.2,x2:.5,v1:-1.4,v2:.4}, energy:3.28}
]);

export function runPhysicsReview(sample, {label='candidate'}={}) {
  const results = [];
  const test = (name, fn) => {
    try { results.push({name, pass:true, ...fn()}); }
    catch (error) { results.push({name, pass:false, error:String(error.message)}); }
  };
  for (const fixture of exactFixtures) test(fixture.name, () => {
    const got = sample(fixture.p, fixture.initial, fixture.t);
    return {maxScaledError:Math.max(
      compare(vector(got), vector(fixture.expected), 1e-11, fixture.name),
      compare([physicalEnergy(fixture.p, got)], [fixture.energy], 1e-11, fixture.name + ' energy'))};
  });
  const mixed = {x1:.37,x2:-.23,v1:-.41,v2:.19};
  const parameters = [];
  for (const m of [.5, 1, 2]) for (const k of [.25, 3, 8]) for (const c of [0, .4, 3]) parameters.push({m,k,c});
  const times = [-2.75, 0, .17, 1.25, 6.3];
  test('Cartesian Newton integration: 27 parameter sets, 5 signed times', () => {
    let maxScaledError = 0;
    for (const p of parameters) for (const t of times) {
      const got = sample(p, mixed, t), reference = integrateNewton(p, mixed, t);
      maxScaledError = Math.max(maxScaledError, compare(vector(got), vector(reference), 2e-9, JSON.stringify({p,t})));
    }
    return {cases:parameters.length*times.length,maxScaledError,tolerance:2e-9};
  });
  test('independent differential Newton residual and dx/dt=v', () => {
    let maxScaledError = 0;
    for (const p of parameters) for (const t of [.37, 1.91, 4.3]) {
      const h = 1e-4 / Math.sqrt((p.k + 2*p.c)/p.m);
      const samples = [-2,-1,1,2].map(n => vector(sample(p,mixed,t+n*h)));
      const numericalDerivative = keys.map((_,j) => (samples[0][j]-8*samples[1][j]+8*samples[2][j]-samples[3][j])/(12*h));
      const expected = derivative(p, vector(sample(p,mixed,t)));
      maxScaledError = Math.max(maxScaledError, compare(numericalDerivative, expected, 2e-8, JSON.stringify({p,t})));
    }
    return {cases:parameters.length*3,maxScaledError,tolerance:2e-8};
  });
  test('physical energy conservation and modal-energy identity', () => {
    let maxScaledError = 0;
    for (const p of parameters) for (const t of [-6.3,.01,.73,2.91,13.2]) {
      const got = sample(p,mixed,t), energy0 = physicalEnergy(p,mixed);
      maxScaledError = Math.max(maxScaledError, compare(
        [physicalEnergy(p,got),modalEnergy(p,got)], [energy0,energy0], 2e-10, JSON.stringify({p,t})));
    }
    return {cases:parameters.length*5,maxScaledError,tolerance:2e-10};
  });
  test('restart time reversal recovers displacement and reversed initial velocity', () => {
    let maxScaledError=0;
    for (const p of parameters) for (const t of [.19,2.7]) {
      const forward = sample(p,mixed,t);
      const reverse = sample(p,{...forward,v1:-forward.v1,v2:-forward.v2},t);
      maxScaledError = Math.max(maxScaledError,compare(vector(reverse), [mixed.x1,mixed.x2,-mixed.v1,-mixed.v2], 5e-10, JSON.stringify({p,t})));
    }
    return {cases:parameters.length*2,maxScaledError,tolerance:5e-10};
  });
  test('exchange symmetry of identical masses', () => {
    let maxScaledError=0;
    for (const p of parameters) for (const t of [-.31,2.73]) {
      const a=sample(p,mixed,t), b=sample(p,{x1:mixed.x2,x2:mixed.x1,v1:mixed.v2,v2:mixed.v1},t);
      maxScaledError=Math.max(maxScaledError,compare(vector(b),[a.x2,a.x1,a.v2,a.v1],2e-11,JSON.stringify({p,t})));
    }
    return {cases:parameters.length*2,maxScaledError,tolerance:2e-11};
  });
  test('zero displacement and velocity remain stationary', () => {
    let maxScaledError=0;
    for (const p of parameters) maxScaledError=Math.max(maxScaledError,compare(
      vector(sample(p,{x1:0,x2:0,v1:0,v2:0},123)),[0,0,0,0],0,JSON.stringify(p)));
    return {cases:parameters.length,maxScaledError,tolerance:0};
  });
  return {label,pass:results.every(r=>r.pass),groups:results.length,results};
}

/** Only a self-check fixture, independent of the Cartesian integration reference. */
function syntheticExact(p, initial, t, fault) {
  const qp=(initial.x1+initial.x2)/2, qm=(initial.x1-initial.x2)/2;
  const vp=(initial.v1+initial.v2)/2, vm=(initial.v1-initial.v2)/2;
  const a=Math.sqrt(p.k/p.m), b=Math.sqrt((p.k+(fault==='coupling-factor'?1:2)*p.c)/p.m);
  const q=(q0,v0,w)=>q0*Math.cos(w*t)+(fault==='omit-initial-velocity'?0:v0)*Math.sin(w*t)/w;
  const v=(q0,v0,w)=>-q0*w*Math.sin(w*t)+(fault==='omit-initial-velocity'?0:v0)*Math.cos(w*t);
  const plus=q(qp,vp,a), minus=q(qm,vm,b), plusV=v(qp,vp,a), minusV=v(qm,vm,b);
  return {x1:plus+minus,x2:plus+(fault==='reconstruction-sign'?1:-1)*minus,v1:plusV+minusV,v2:plusV-minusV};
}
export function selfCheck() {
  const positive=runPhysicsReview((p,s,t)=>syntheticExact(p,s,t),{label:'synthetic analytic positive control'});
  assert.ok(positive.pass, JSON.stringify(positive));
  const negatives=['coupling-factor','omit-initial-velocity','reconstruction-sign'].map(fault => {
    const result=runPhysicsReview((p,s,t)=>syntheticExact(p,s,t,fault),{label:fault});
    assert.ok(!result.pass,'negative control unexpectedly passed: '+fault);
    assert.ok(result.results.find(r=>r.name.startsWith('Cartesian Newton integration')&&!r.pass),'Newton oracle missed '+fault);
    return {fault,rejected:!result.pass,failedGroups:result.results.filter(r=>!r.pass).map(r=>r.name)};
  });
  return {positive,negatives};
}
