import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBezierInput, traceBezier, BEZIER_PRESETS } from '../src/bezier-curves.mjs';

const gcd = (a,b) => { a = a < 0n ? -a : a; while(b) [a,b] = [b,a%b]; return a; };
const q = (n,d=1n) => { if(d<0n){n=-n;d=-d;} const g=gcd(n,d); return [n/g,d/g]; };
const parse = value => { const parts=String(value).split('/').map(BigInt); return q(parts[0],parts[1]??1n); };
const add = (a,b) => q(a[0]*b[1]+b[0]*a[1],a[1]*b[1]);
const mul = (a,b) => q(a[0]*b[0],a[1]*b[1]);
const sub = (a,b) => add(a,[-b[0],b[1]]);
const text = a => a[1]===1n?String(a[0]):a.join('/');
const choose = (n,k) => [[1],[1,1],[1,2,1],[1,3,3,1]][n][k];
// A direct Bernstein sum, independent of the production adjacent-level recurrence.
function polynomial(points, n, d) {
  const degree=points.length-1, a=BigInt(n), b=BigInt(d);
  return [0,1].map(axis => text(points.reduce((sum,p,i) =>
    add(sum,mul(parse(p[axis]),q(BigInt(choose(degree,i))*a**BigInt(i)*(b-a)**BigInt(degree-i),b**BigInt(degree)))),q(0n))));
}
function derivative(points,n,d) {
  const degree=points.length-1;
  const controls=points.slice(1).map((p,i)=>p.map((v,j)=>text(mul(q(BigInt(degree)),sub(parse(v),parse(points[i][j]))))));
  return polynomial(controls,n,d);
}
function canonical(value) {
  assert.match(value,/^-?(?:0|[1-9]\d*)(?:\/[1-9]\d*)?$/);
  assert.equal(value,text(parse(value)));
}
function allFrozen(value) {
  if(value&&typeof value==='object'){assert.ok(Object.isFrozen(value));Object.values(value).forEach(allFrozen);}
}

test('worked quadratic retains every level and correctly ordered subcurve controls', () => {
  const r=traceBezier([[0,0],[4,8],[8,0]],{numerator:1,denominator:2});
  assert.deepEqual(r.levels,[[['0','0'],['4','8'],['8','0']],[['2','4'],['6','4']],[['4','4']]]);
  assert.deepEqual(r.leftControlPoints,[['0','0'],['2','4'],['4','4']]);
  assert.deepEqual(r.rightControlPoints,[['4','4'],['6','4'],['8','0']]);
  assert.deepEqual(r.derivative,['8','0']);
  assert.deepEqual(r.startDerivative,['8','16']); assert.deepEqual(r.endDerivative,['8','-16']);
  assert.equal(r.parameter,'1/2'); assert.equal(r.stationary,false);
});

test('direct Bernstein and differentiated-polynomial oracles agree on 504 changed cases', () => {
  let count=0;
  for(let degree=1;degree<=3;degree++) for(let seed=0;seed<24;seed++) {
    const points=Array.from({length:degree+1},(_,i)=>[((seed*7+i*13)%41)-20,((seed*11+i*i*7)%41)-20]);
    for(const [n,d] of [[0,1],[1,1],[1,2],[1,3],[2,3],[17,97],[999,1000]]) {
      const r=traceBezier(points,{numerator:n,denominator:d});
      assert.deepEqual(r.point,polynomial(points,n,d));
      assert.deepEqual(r.derivative,derivative(points,n,d));
      r.levels.flat(2).forEach(canonical); r.derivative.forEach(canonical);
      assert.equal(r.stationary,r.derivative.every(x=>x==='0'));
      for(let axis=0;axis<2;axis++){const v=Number(parse(r.point[axis])[0])/Number(parse(r.point[axis])[1]); assert.ok(v>=Math.min(...points.map(p=>p[axis]))&&v<=Math.max(...points.map(p=>p[axis])));}
      count++;
    }
  }
  assert.equal(count,504);
});

test('subdivision polygons reproduce the original polynomial under both local parameter maps', () => {
  for(const points of [[[2,-3],[-4,5]],[[0,0],[4,8],[8,0]],[[-8,-4],[-6,8],[6,-8],[8,4]]]) {
    for(const [n,d] of [[0,1],[1,1],[1,4],[2,3],[999,1000]]) {
      const r=traceBezier(points,{numerator:n,denominator:d});
      for(const [u,v] of [[0,1],[1,1],[1,2],[2,5]]) {
        assert.deepEqual(polynomial(r.leftControlPoints,u,v),polynomial(points,n*u,d*v));
        assert.deepEqual(polynomial(r.rightControlPoints,u,v),polynomial(points,n*v+(d-n)*u,d*v));
        const leftDerivative=derivative(r.leftControlPoints,u,v).map(x=>text(mul(parse(x),q(BigInt(d)))));
        const originalLeft=derivative(points,n*u,d*v).map(x=>text(mul(parse(x),q(BigInt(n)))));
        assert.deepEqual(leftDerivative,originalLeft);
        const rightDerivative=derivative(r.rightControlPoints,u,v).map(x=>text(mul(parse(x),q(BigInt(d)))));
        const originalRight=derivative(points,n*v+(d-n)*u,d*v).map(x=>text(mul(parse(x),q(BigInt(d-n)))));
        assert.deepEqual(rightDerivative,originalRight);
      }
    }
  }
});

test('reversing controls reverses the parameter and derivative; translating preserves construction', () => {
  const points=[[-8,-4],[-6,8],[6,-8],[8,4]], p={numerator:2,denominator:7};
  const forward=traceBezier(points,p), reverse=traceBezier(points.slice().reverse(),{numerator:5,denominator:7});
  assert.deepEqual(forward.point,reverse.point);
  assert.deepEqual(forward.derivative,reverse.derivative.map(x=>text(mul(parse(x),q(-1n)))));
  const translated=traceBezier(points.map(([x,y])=>[x+2,y-1]),p);
  assert.deepEqual(translated.levels,forward.levels.map(level=>level.map(pair=>[text(add(parse(pair[0]),q(2n))),text(add(parse(pair[1]),q(-1n)))])));
  assert.deepEqual(translated.derivative,forward.derivative);
});

test('stationary endpoint, constant curve, and collinear nonuniform speed remain distinct', () => {
  const points=[[0,0],[0,0],[8,0]];
  assert.equal(traceBezier(points,{numerator:0,denominator:1}).stationary,true);
  assert.deepEqual(traceBezier(points,{numerator:1,denominator:2}).point,['2','0']);
  assert.deepEqual(traceBezier(points,{numerator:1,denominator:1}).point,['8','0']);
  const constant=traceBezier([[3,-2],[3,-2],[3,-2],[3,-2]],{numerator:999,denominator:1000});
  assert.deepEqual(constant.point,['3','-2']); assert.equal(constant.stationary,true);
  assert.ok(constant.levels.flat().every(p=>p[0]==='3'&&p[1]==='-2'));
});

test('parser admits exact text grammar and reduces only in the trace', () => {
  const r=parseBezierInput(' +0,-0; 4,8\n8,0 ',' 02/04 ');
  assert.deepEqual(r,{points:[[0,0],[4,8],[8,0]],parameter:{numerator:2,denominator:4}});
  assert.equal(traceBezier(r.points,r.parameter).parameter,'1/2');
  assert.equal(traceBezier([[0,0],[1,1]],{numerator:0,denominator:1000}).parameter,'0');
  for(const preset of BEZIER_PRESETS){const p=parseBezierInput(preset.points,preset.parameter);assert.ok(traceBezier(p.points,p.parameter));}
});

test('malformed and out-of-domain text is refused with an actionable field', () => {
  for(const text of ['', '0,0', '0,0;', '0,0\n\n1,1', '0,0;1,1;2,2;3,3;4,4','1e0,0;1,1','0.5,0;1,1','0,0,0;1,1','21,0;1,1','0,0;NaN,1',' '.repeat(513)]) {
    assert.throws(()=>parseBezierInput(text,'1/2'),e=>e instanceof Error&&e.field==='points'&&e.message.length>0);
  }
  for(const text of ['', '-1/2','1/0','2','2/1','1.0','1e-1','Infinity','1/1001','1001/1001','1 /2','1//2','0'.repeat(17)]) {
    assert.throws(()=>parseBezierInput('0,0;1,1',text),e=>e instanceof Error&&e.field==='parameter'&&e.message.length>0);
  }
});

test('public model rejects coercion, sparse arrays and invalid parameter records', () => {
  const badPoints=[null,{},[],[[0,0]],[[0,0],[1]],[[0,0],[1,2,3]],[[0,0],['1',2]],[[0,0],[NaN,2]],[[0,0],[Infinity,2]],[[0,0],[0.5,2]],[[0,0],[21,2]],new Array(2),[[0,0],new Array(2)]];
  for(const p of badPoints) assert.throws(()=>traceBezier(p,{numerator:1,denominator:2}),e=>e.field==='points');
  for(const p of [null,[],{},0,{numerator:'1',denominator:2},{numerator:1,denominator:0},{numerator:-1,denominator:2},{numerator:3,denominator:2},{numerator:1,denominator:1001},{numerator:NaN,denominator:2},{numerator:1,denominator:Infinity},{numerator:0.5,denominator:1}]) assert.throws(()=>traceBezier([[0,0],[1,1]],p),e=>e.field==='parameter');
});

test('all result state is detached and frozen; repeated calls are deterministic', () => {
  const points=Object.freeze([Object.freeze([0,0]),Object.freeze([4,8]),Object.freeze([8,0])]), p=Object.freeze({numerator:2,denominator:4});
  const first=traceBezier(points,p); allFrozen(first); allFrozen(BEZIER_PRESETS);
  assert.notEqual(first.controlPoints,points); assert.notEqual(first.controlPoints[0],points[0]);
  traceBezier([[3,-2],[3,-2]],{numerator:1,denominator:7});
  assert.deepEqual(traceBezier(points,p),first);
  assert.throws(()=>{first.levels[0][0][0]='999';},TypeError);
  assert.deepEqual(points,[[0,0],[4,8],[8,0]]);
});
