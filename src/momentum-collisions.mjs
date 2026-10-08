// Ideal classical one-dimensional collision endpoints, evaluated as exact fractions.
export const COLLISION_PRESETS = Object.freeze([
  {id:'unequal',label:'A heavier cart meets a stationary cart',mA:'2',mB:'1',uA:'3',uB:'0'},
  {id:'zero-momentum',label:'Moving carts with zero total momentum',mA:'1',mB:'1',uA:'3',uB:'-3'},
  {id:'fractions',label:'Fractional answers with opposite directions',mA:'1',mB:'2',uA:'3',uB:'-1'},
  {id:'both-left',label:'Both move left, but the gap shrinks',mA:'2',mB:'1',uA:'-1',uB:'-3'},
  {id:'equal-speed',label:'Equal velocities: no future collision',mA:'2',mB:'1',uA:'2',uB:'2'},
  {id:'separating',label:'The gap grows: no future collision',mA:'1',mB:'2',uA:'-3',uB:'1'}
].map(value=>Object.freeze(value)));

const fields = ['mA','mB','uA','uB'];
function integer(value,label,min,max) {
  let number;
  if(typeof value==='number') {
    if(!Number.isSafeInteger(value)) throw new Error(label+' must be a whole number.');
    number=value;
  } else if(typeof value==='string'&&value.length<=32&&/^[+-]?\d+$/.test(value.trim())) {
    const exact=BigInt(value.trim());
    if(exact<BigInt(min)||exact>BigInt(max)) throw new Error(label+' must be from '+min+' to '+max+'.');
    number=Number(exact);
  } else throw new Error(label+' must be a whole number; decimals and exponents are not accepted.');
  if(number<min||number>max) throw new Error(label+' must be from '+min+' to '+max+'.');
  return number===0?0:number;
}
function gcd(a,b) {
  a=a<0n?-a:a;b=b<0n?-b:b;
  while(b){const next=a%b;a=b;b=next;}
  return a;
}
function q(n,d=1n) {
  if(d===0n)throw new Error('A fraction cannot have a zero denominator.');
  if(d<0n){n=-n;d=-d;}
  const factor=gcd(n,d);
  return {n:n/factor,d:d/factor};
}
const add=(a,b)=>q(a.n*b.d+b.n*a.d,a.d*b.d);
const sub=(a,b)=>q(a.n*b.d-b.n*a.d,a.d*b.d);
const mul=(a,b)=>q(a.n*b.n,a.d*b.d);
const div=(a,b)=>q(a.n*b.d,a.d*b.n);
const asQ=value=>q(BigInt(value));
const publicQ=value=>({numerator:String(value.n),denominator:String(value.d)});
function body(mass,velocity) {
  const m=asQ(mass);
  return {mass,velocity,momentum:mul(m,velocity),kineticEnergy:div(mul(m,mul(velocity,velocity)),q(2n))};
}
function state(mA,mB,vA,vB) {
  const a=body(mA,vA),b=body(mB,vB);
  return {a,b,totalMomentum:add(a.momentum,b.momentum),
    totalKineticEnergy:add(a.kineticEnergy,b.kineticEnergy),relativeVelocity:sub(vA,vB)};
}
function publicBody(value) {
  return {mass:value.mass,velocity:publicQ(value.velocity),momentum:publicQ(value.momentum),
    kineticEnergy:publicQ(value.kineticEnergy)};
}
function publicState(value) {
  return {a:publicBody(value.a),b:publicBody(value.b),
    totalMomentum:publicQ(value.totalMomentum),totalKineticEnergy:publicQ(value.totalKineticEnergy),
    relativeVelocity:publicQ(value.relativeVelocity)};
}
function freeze(value) {
  if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}
  return value;
}

// A starts strictly left of B with a positive gap. Only uA > uB reaches contact.
export function analyzeCollision(input) {
  if(!input||typeof input!=='object'||Array.isArray(input)||
    Object.keys(input).length!==fields.length||!fields.every(key=>Object.hasOwn(input,key)))
    throw new Error('Supply exactly mA, mB, uA and uB; this model assumes zero net external impulse.');
  const inputs={
    mA:integer(input.mA,'Cart A mass (kg)',1,100),
    mB:integer(input.mB,'Cart B mass (kg)',1,100),
    uA:integer(input.uA,'Cart A velocity (m/s)',-20,20),
    uB:integer(input.uB,'Cart B velocity (m/s)',-20,20)
  };
  const {mA,mB,uA,uB}=inputs;
  const a=asQ(mA),b=asQ(mB),M=add(a,b),ua=asQ(uA),ub=asQ(uB);
  const initial=state(mA,mB,ua,ub);
  const V=div(initial.totalMomentum,M);
  const centerEnergy=div(mul(initial.totalMomentum,initial.totalMomentum),mul(q(2n),M));
  const relativeEnergy=sub(initial.totalKineticEnergy,centerEnergy);
  let elastic=null,completelyInelastic=null;
  if(uA>uB) {
    // Momentum plus reversed relative velocity selects the separating collision branch.
    const va=div(add(mul(sub(a,b),ua),mul(mul(q(2n),b),ub)),M);
    const vb=div(add(mul(sub(b,a),ub),mul(mul(q(2n),a),ua)),M);
    const elasticState=state(mA,mB,va,vb),stuckState=state(mA,mB,V,V);
    elastic={...publicState(elasticState),kineticConverted:publicQ(sub(initial.totalKineticEnergy,elasticState.totalKineticEnergy))};
    completelyInelastic={...publicState(stuckState),kineticConverted:publicQ(sub(initial.totalKineticEnergy,stuckState.totalKineticEnergy))};
  }
  return freeze({
    format:'recallweave.momentum-collisions/1',
    entered:Object.fromEntries(fields.map(key=>[key,String(input[key])])),
    inputs,
    units:{mass:'kg',velocity:'m/s',momentum:'kg m/s',kineticEnergy:'J'},
    assumptions:[
      'Classical one-dimensional translation of two fixed positive masses; right is positive.',
      'A initially lies strictly left of B with a positive gap; incoming velocities remain constant until contact.',
      'Calculated collision endpoints assume zero net external impulse on the two-cart system.',
      'Elastic and completely inelastic are alternative idealized event models, not classifications of measurements.',
      'No impact force, contact duration, deformation, rotation, friction or experimental outcome is modeled.'
    ],
    status:uA>uB?'collision':'no-collision',
    reason:uA>uB?'approaching':uA===uB?'equal-velocity':'separating',
    closingVelocity:publicQ(sub(ua,ub)),
    centerOfMassVelocity:publicQ(V),
    centerOfMassKineticEnergy:publicQ(centerEnergy),
    relativeKineticEnergy:publicQ(relativeEnergy),
    initial:publicState(initial),elastic,completelyInelastic
  });
}

export function formatFraction(value) {
  return value.denominator==='1'?value.numerator:value.numerator+'/'+value.denominator;
}

// Recompute from the explicit inputs; a caller cannot pass an edited result as an accepted record.
export function serializeCollision(input) {
  return JSON.stringify(analyzeCollision(input),null,2)+'\n';
}
