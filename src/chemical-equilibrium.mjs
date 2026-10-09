/**
 * Exact, bounded composition model for ideal A + B <=> C.
 * Concentrations are ratios to c° = 1 mol L^-1; K is dimensionless.
 * No reaction rates, elapsed time, experimental uncertainty or substance data.
 */
const EQ_ZERO = Object.freeze({n:0n,d:1n});
const EQ_FIELDS = Object.freeze(['a','b','c','K']);
function eqRat(n,d=1n) {
  if(d===0n) throw new RangeError('An exact rational cannot divide by zero.');
  if(d<0n){n=-n;d=-d;}
  let a=n<0n?-n:n,b=d;
  while(b!==0n){const t=a%b;a=b;b=t;}
  return {n:n/a,d:d/a};
}
const eqAdd=(a,b)=>eqRat(a.n*b.d+b.n*a.d,a.d*b.d);
const eqNeg=a=>eqRat(-a.n,a.d);
const eqSub=(a,b)=>eqAdd(a,eqNeg(b));
const eqMul=(a,b)=>eqRat(a.n*b.n,a.d*b.d);
const eqDiv=(a,b)=>eqRat(a.n*b.d,a.d*b.n);
const eqCompare=(a,b)=>{const v=a.n*b.d-b.n*a.d;return v<0n?-1:v>0n?1:0;};
const eqText=a=>a.n.toString()+'/'+a.d.toString();
const eqMid=(a,b)=>eqDiv(eqAdd(a,b),eqRat(2n));
function eqInput(input) {
  if(input===null||typeof input!=='object'||Array.isArray(input)||Object.getPrototypeOf(input)!==Object.prototype) {
    throw new TypeError('Supply an ordinary object with exactly a, b, c and K.');
  }
  const keys=Reflect.ownKeys(input);
  if(keys.length!==4||keys.some(k=>typeof k!=='string'||!EQ_FIELDS.includes(k))) {
    throw new TypeError('Supply exactly a, b, c and K; no other fields.');
  }
  const authored={}, values={};
  for(const key of EQ_FIELDS){
    const descriptor=Object.getOwnPropertyDescriptor(input,key);
    if(!descriptor||!Object.hasOwn(descriptor,'value')||typeof descriptor.value!=='string'||descriptor.value.length>32) {
      throw new TypeError(key+' must be a decimal text value of at most 32 characters.');
    }
    const text=descriptor.value.trim();
    if(!/^[0-9]+(?:\.[0-9]{1,6})?$/.test(text)) {
      throw new TypeError(key+' needs an unsigned decimal with an integer part and at most 6 decimal places.');
    }
    const [whole,fraction='']=text.split('.');
    const value=eqRat(BigInt(whole+fraction),10n**BigInt(fraction.length));
    const lower=key==='K'?eqRat(1n,1000n):EQ_ZERO;
    const upper=key==='K'?eqRat(1000n):eqRat(100n);
    if(eqCompare(value,lower)<0||eqCompare(value,upper)>0) {
      throw new RangeError(key+(key==='K'?' must be between 0.001 and 1000.':' must be between 0 and 100.'));
    }
    authored[key]=text;values[key]=value;
  }
  return {authored,...values};
}
function eqQuotient(a,b,c) {
  if(a.n===0n||b.n===0n)return {kind:'undefined',reason:'zero_reactant_concentration'};
  return {kind:'finite',value:eqText(eqDiv(c,eqMul(a,b)))};
}
function eqResidual(v,x) {
  return eqSub(eqMul(v.K,eqMul(eqSub(v.a,x),eqSub(v.b,x))),eqAdd(v.c,x));
}
function eqBounds(v) {
  return {lower:eqNeg(v.c),upper:eqCompare(v.a,v.b)<=0?v.a:v.b};
}
function eqDirection(residual,noChange) {
  if(noChange)return 'no_feasible_change';
  return residual.n>0n?'forward':residual.n<0n?'reverse':'balanced';
}
function eqConserved(v) {
  return {a_plus_c:eqText(eqAdd(v.a,v.c)),b_plus_c:eqText(eqAdd(v.b,v.c))};
}
function eqSnapshot(v,step,lower,upper) {
  return {step,lower:eqText(lower),upper:eqText(upper),midpoint:eqText(eqMid(lower,upper)),
    width:eqText(eqSub(upper,lower)),residual_lower:eqText(eqResidual(v,lower)),
    residual_upper:eqText(eqResidual(v,upper))};
}
function eqRange(lower,upper) {
  return {lower:eqText(lower),upper:eqText(upper),midpoint:eqText(eqMid(lower,upper))};
}

/** Parse four bounded decimal strings; solve without floating-point root decisions. */
export function solveEquilibrium(input) {
  const v=eqInput(input), feasible=eqBounds(v);
  let lower=feasible.lower,upper=feasible.upper;
  const initialResidual=eqResidual(v,EQ_ZERO);
  const noChange=eqCompare(lower,upper)===0;
  const direction=eqDirection(initialResidual,noChange);
  if(direction==='balanced'){lower=EQ_ZERO;upper=EQ_ZERO;}
  const trace=[eqSnapshot(v,0,lower,upper)];
  for(let step=1;step<=64&&eqCompare(lower,upper)!==0;step++){
    const midpoint=eqMid(lower,upper), residual=eqResidual(v,midpoint);
    if(residual.n===0n){lower=midpoint;upper=midpoint;}
    else if(residual.n>0n)lower=midpoint;
    else upper=midpoint;
    trace.push(eqSnapshot(v,step,lower,upper));
  }
  const midpoint=eqMid(lower,upper), a=eqSub(v.a,midpoint),b=eqSub(v.b,midpoint),c=eqAdd(v.c,midpoint);
  return {
    schema:'recallweave-chemical-equilibrium/1',
    input:{...v.authored},
    exact_inputs:Object.fromEntries(EQ_FIELDS.map(key=>[key,eqText(v[key])])),
    initial_quotient:eqQuotient(v.a,v.b,v.c),
    direction,
    feasible_extent:{lower:eqText(feasible.lower),upper:eqText(feasible.upper)},
    conserved:eqConserved(v),
    equilibrium:{
      kind:eqCompare(lower,upper)===0?'exact':'bracket',
      extent:{...eqRange(lower,upper),width:eqText(eqSub(upper,lower))},
      concentrations:{
        a:eqRange(eqSub(v.a,upper),eqSub(v.a,lower)),
        b:eqRange(eqSub(v.b,upper),eqSub(v.b,lower)),
        c:eqRange(eqAdd(v.c,lower),eqAdd(v.c,upper))
      },
      residual:{lower:eqText(eqResidual(v,lower)),upper:eqText(eqResidual(v,upper))},
      midpoint_quotient:eqQuotient(a,b,c)
    },
    trace
  };
}

/** Inspect a feasible composition. The tick is neither time nor a reaction trajectory. */
export function sampleExtent(input,tick) {
  if(!Number.isInteger(tick)||tick<0||tick>100)throw new RangeError('Choose an integer inspection tick from 0 through 100.');
  const v=eqInput(input),bounds=eqBounds(v);
  const extent=eqAdd(bounds.lower,eqMul(eqSub(bounds.upper,bounds.lower),eqRat(BigInt(tick),100n)));
  const a=eqSub(v.a,extent),b=eqSub(v.b,extent),c=eqAdd(v.c,extent),residual=eqResidual(v,extent);
  return {tick,extent:eqText(extent),a:eqText(a),b:eqText(b),c:eqText(c),
    quotient:eqQuotient(a,b,c),direction:eqDirection(residual,eqCompare(bounds.lower,bounds.upper)===0),
    residual:eqText(residual),conserved:eqConserved(v)};
}
