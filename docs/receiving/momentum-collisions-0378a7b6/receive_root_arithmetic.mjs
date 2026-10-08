import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
const project = 'C:\\Users\\minec\\hamon-0378a7b6-recallweave';
const source = path.join(project, 'src', 'momentum-collisions.mjs');
const output = path.join(project, 'docs', 'receiving', 'momentum-collisions-0378a7b6', 'root-arithmetic-' + Date.now());
fs.mkdirSync(output, { recursive: true });
const expected = 'ba6e652a68b9018bb6ed59d671c43b04dfc4c617c0dc893c9f59a7197b8948cd';
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const sourceBefore = digest(source), checks = [];
let tested = 0, collisions = 0, noContact = 0, refusalCases = 0, error;
const gcd = (a,b) => { a = a < 0n ? -a : a; while (b) [a,b] = [b,a%b]; return a; };
function fraction(value, label) {
  assert.equal(typeof value.numerator, 'string', label);
  assert.equal(typeof value.denominator, 'string', label);
  assert.match(value.numerator, /^-?(0|[1-9][0-9]*)$/, label);
  assert.match(value.denominator, /^[1-9][0-9]*$/, label);
  assert.notEqual(value.numerator, '-0', label);
  const n = BigInt(value.numerator), d = BigInt(value.denominator);
  assert.equal(gcd(n,d), 1n, label + ': reduced representation');
  return [n,d];
}
const sum = (a,b) => [a[0]*b[1]+b[0]*a[1], a[1]*b[1]];
const same = (a,b,label) => assert.equal(a[0]*b[1], b[0]*a[1], label);
function state(value, mA, mB, label) {
  const values = {};
  for (const [key,mass] of [['a',mA],['b',mB]]) {
    const body = value[key];
    assert.equal(body.mass, mass, label + ' mass ' + key);
    const v = fraction(body.velocity, label + ' velocity ' + key);
    const p = fraction(body.momentum, label + ' momentum ' + key);
    const k = fraction(body.kineticEnergy, label + ' energy ' + key);
    same(p, [BigInt(mass)*v[0],v[1]], label + ' p=mv ' + key);
    same(k, [BigInt(mass)*v[0]*v[0],2n*v[1]*v[1]], label + ' K=mv²/2 ' + key);
    values[key] = {v,p,k};
  }
  values.p = fraction(value.totalMomentum, label + ' total P');
  values.k = fraction(value.totalKineticEnergy, label + ' total K');
  values.relative = fraction(value.relativeVelocity, label + ' relative velocity');
  same(values.p, sum(values.a.p, values.b.p), label + ' sum momentum');
  same(values.k, sum(values.a.k, values.b.k), label + ' sum energy');
  same(values.relative, [values.a.v[0]*values.b.v[1]-values.b.v[0]*values.a.v[1], values.a.v[1]*values.b.v[1]], label + ' relative subtraction');
  return values;
}
try {
  assert.equal(sourceBefore, expected, 'Pinned candidate before import');
  const { analyzeCollision, serializeCollision } = await import(pathToFileURL(source));
  const masses = [1,2,3,5,7,97,100], velocities = [-20,-7,-1,0,3,11,20];
  for (const mA of masses) for (const mB of masses) for (const uA of velocities) for (const uB of velocities) {
    const input = {mA,mB,uA,uB}, original = JSON.stringify(input), result = analyzeCollision(input);
    const label = JSON.stringify(input), A=BigInt(mA), B=BigInt(mB), U=BigInt(uA), W=BigInt(uB), M=A+B;
    const P=A*U+B*W, twiceEnergy=A*U*U+B*W*W;
    const initial = state(result.initial,mA,mB,label+' initial');
    same(initial.p,[P,1n],label+' direct incoming momentum');
    same(initial.k,[twiceEnergy,2n],label+' direct incoming kinetic energy');
    const center = fraction(result.centerOfMassVelocity,label+' center velocity');
    const centerK = fraction(result.centerOfMassKineticEnergy,label+' center energy');
    const relativeK = fraction(result.relativeKineticEnergy,label+' relative energy');
    same(center,[P,M],label+' mass-weighted center velocity');
    same(centerK,[P*P,2n*M],label+' center energy invariant');
    same(relativeK,[A*B*(U-W)*(U-W),2n*M],label+' independently expanded reduced-mass energy');
    same(sum(centerK,relativeK),initial.k,label+' energy decomposition');
    same(fraction(result.closingVelocity,label+' closing'),[U-W,1n],label+' closing sign');
    assert.equal(JSON.stringify(input),original,label+' input unchanged');
    assert.ok(Object.isFrozen(result) && Object.isFrozen(result.initial.a.velocity));
    if (uA<=uB) {
      noContact++;
      assert.equal(result.status,'no-collision');
      assert.equal(result.reason,uA===uB?'equal-velocity':'separating');
      assert.equal(result.elastic,null); assert.equal(result.completelyInelastic,null);
    } else {
      collisions++;
      assert.equal(result.status,'collision'); assert.equal(result.reason,'approaching');
      const elastic=state(result.elastic,mA,mB,label+' elastic');
      const stick=state(result.completelyInelastic,mA,mB,label+' stick');
      same(elastic.p,initial.p,label+' elastic momentum conserved');
      same(elastic.k,initial.k,label+' elastic kinetic energy conserved');
      same(elastic.relative,[W-U,1n],label+' elastic separating relative velocity');
      same(fraction(result.elastic.kineticConverted,label+' elastic converted'),[0n,1n],label+' no elastic energy conversion');
      same(stick.p,initial.p,label+' inelastic momentum conserved');
      same(stick.a.v,center,label+' first common velocity'); same(stick.b.v,center,label+' second common velocity');
      same(stick.k,centerK,label+' minimum final energy');
      same(stick.relative,[0n,1n],label+' zero final relative velocity');
      same(fraction(result.completelyInelastic.kineticConverted,label+' inelastic converted'),relativeK,label+' converted relative energy');
    }
    tested++;
  }
  checks.push('2,401 independent integer-input cases: direct momentum/energy, reduced fractions, center/relative decomposition and unchanged inputs');
  checks.push('1,029 approaching cases satisfy both elastic conservation laws plus separating relative velocity and the common-velocity inelastic minimum');
  checks.push('1,372 equal/receding cases retain null collision endpoints and the correct signed gap condition');
  const ordinary={mA:2,mB:1,uA:3,uB:0};
  for (const bad of [null,[],{}, {...ordinary,extra:1}, {...ordinary,mA:0}, {...ordinary,mB:-1}, {...ordinary,mA:101}, {...ordinary,uA:21}, {...ordinary,uB:-21}, {...ordinary,uA:NaN}, {...ordinary,uA:Infinity}, {...ordinary,mA:1.5}, ...['','1e0','0x2','1.0','--2','2,0'].map(mA=>({...ordinary,mA})), {...ordinary,mA:null}, {...ordinary,uA:true}]) {
    assert.throws(()=>analyzeCollision(bad)); refusalCases++;
  }
  const entered={mA:'+002',mB:' 001 ',uA:'+3',uB:'-0'};
  const normalized=analyzeCollision(entered);
  assert.deepEqual(normalized.inputs,ordinary);
  assert.deepEqual(normalized.entered,entered);
  assert.deepEqual(JSON.parse(serializeCollision(entered)),normalized);
  assert.equal(serializeCollision(entered),serializeCollision(entered));
  assert.throws(()=>serializeCollision(normalized));
  checks.push('20 malformed/out-of-range/extra-field controls refuse; documented numeric normalization and exact entered strings persist');
  checks.push('Deterministic saved record recomputes admitted inputs; an edited result object cannot be substituted');
} catch (caught) {
  error={name:caught.name,message:caught.message,stack:caught.stack}; process.exitCode=1;
} finally {
  const sourceAfter=digest(source);
  if(sourceAfter!==sourceBefore){error={name:'SourceDrift',message:'Pinned core changed during receiving'};process.exitCode=1;}
  const receipt={reviewer:'chatgpt-0378a7b6b7c2/root',at:new Date().toISOString(),method:'Independent physical conservation and reduced-mass invariants; no production formula copied into expected endpoint values',node:process.version,source,sourceBefore,sourceAfter,expected,outcome:error?'fail':'pass',tested,collisions,noContact,refusalCases,checks,error};
  fs.writeFileSync(path.join(output,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');
  console.log(JSON.stringify({output,outcome:receipt.outcome,tested,collisions,noContact,refusalCases,checks:checks.length,error}));
}
