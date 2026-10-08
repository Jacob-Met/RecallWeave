/**
 * Newton tangent steps for bounded cubic-or-lower polynomials.
 * Arithmetic and stopping decisions are exact. Approximation is for drawing only.
 */
export const NEWTON_LIMITS = Object.freeze({coefficient:12,startMagnitude:20,startDenominator:1000,steps:8,arithmeticBits:4096});
export const NEWTON_PRESETS = Object.freeze([
  {id:'square-root',label:'Approach a square root',coefficients:[-2,0,1,0],start:'2',steps:6},
  {id:'zero-slope',label:'A horizontal tangent away from a root',coefficients:[-2,0,1,0],start:'0',steps:6},
  {id:'two-cycle',label:'An exact two-step cycle',coefficients:[2,-2,0,1],start:'0',steps:6},
  {id:'repeated-root',label:'Approach a repeated root',coefficients:[1,-2,1,0],start:'3',steps:6},
  {id:'straight-line',label:'One step on a straight line',coefficients:[-3,2,0,0],start:'4',steps:6},
  {id:'already-root',label:'Already at a root with zero slope',coefficients:[0,0,1,0],start:'0',steps:6},
  {id:'negative-root',label:'Approach the negative root',coefficients:[-1,0,1,0],start:'-3',steps:6},
  {id:'exact-landing',label:'Land on an exact root',coefficients:[0,2,-2,1],start:'1',steps:6}
].map(p=>Object.freeze({...p,coefficients:Object.freeze(p.coefficients)})));

class ArithmeticLimit extends Error {}
const abs=n=>n<0n?-n:n;
function gcd(a,b) {a=abs(a);b=abs(b);while(b){const next=a%b;a=b;b=next;}return a;}
function fraction(n,d=1n) {
  if(d===0n)throw new Error('A fraction denominator cannot be zero.');
  if(d<0n){n=-n;d=-d;}
  const divisor=gcd(n,d);n/=divisor;d/=divisor;
  if(abs(n).toString(2).length>NEWTON_LIMITS.arithmeticBits||d.toString(2).length>NEWTON_LIMITS.arithmeticBits)throw new ArithmeticLimit();
  return {n,d};
}
const add=(a,b)=>fraction(a.n*b.d+b.n*a.d,a.d*b.d);
const subtract=(a,b)=>fraction(a.n*b.d-b.n*a.d,a.d*b.d);
const multiply=(a,b)=>fraction(a.n*b.n,a.d*b.d);
const divide=(a,b)=>fraction(a.n*b.d,a.d*b.n);
const text=a=>a.d===1n?String(a.n):a.n+'/'+a.d;

function integer(value,label,min,max) {
  if(typeof value!=='string'&&typeof value!=='number')throw new Error(label+' must be an integer from '+min+' to '+max+'.');
  const raw=String(value).trim();
  if(!/^[+-]?\d{1,3}$/.test(raw))throw new Error(label+' must be an integer from '+min+' to '+max+'.');
  const result=Number(raw);
  if(!Number.isInteger(result)||result<min||result>max)throw new Error(label+' must be an integer from '+min+' to '+max+'.');
  return result;
}
function startingPoint(value) {
  if(typeof value==='number'&&Number.isInteger(value))value=String(value);
  if(typeof value!=='string'||value.length>24)throw new Error('Enter the starting point as an integer, decimal or fraction.');
  const raw=value.trim();let n,d;
  const ratio=/^([+-]?\d{1,5})\/(\d{1,4})$/.exec(raw);
  if(ratio) {
    n=BigInt(ratio[1]);d=BigInt(ratio[2]);
    if(d<1n||d>1000n||abs(n)>20000n)throw new Error('Use a fraction with a positive denominator at most 1000 and numerator magnitude at most 20000.');
  } else {
    const decimal=/^([+-]?)(?:(\d{1,2})(?:\.(\d{0,3}))?|\.(\d{1,3}))$/.exec(raw);
    if(!decimal)throw new Error('Use an integer, up to three decimal places, or a fraction such as 3/2.');
    const digits=decimal[3]??decimal[4]??'';
    n=BigInt((decimal[2]??'0')+digits)*(decimal[1]==='-'?-1n:1n);d=10n**BigInt(digits.length);
  }
  const result=fraction(n,d);
  if(abs(result.n)>20n*result.d)throw new Error('The starting point must be between -20 and 20.');
  return result;
}
function polynomial(coefficients,x) {
  let value=fraction(0n);
  for(let i=coefficients.length-1;i>=0;i--)value=add(multiply(value,x),fraction(BigInt(coefficients[i])));
  return value;
}
function evaluate(coefficients,derivative,x,index) {
  return {index,x,value:polynomial(coefficients,x),derivative:polynomial(derivative,x)};
}
function pointRecord(point) {
  return Object.freeze({index:point.index,x:text(point.x),value:text(point.value),derivative:text(point.derivative)});
}

/** Coefficients are [constant, x, x², x³]. The input is never modified. */
export function analyzeNewton(input) {
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Provide a polynomial, starting point and step limit.');
  if(!Array.isArray(input.coefficients)||input.coefficients.length!==4)throw new Error('Provide all four coefficients, including zeros.');
  const coefficients=input.coefficients.map((v,i)=>integer(v,'Coefficient c'+i,-12,12));
  const start=startingPoint(input.start);
  const limit=integer(input.steps,'Step limit',1,8);
  const derivative=coefficients.slice(1).map((c,i)=>c*(i+1));
  const points=[],steps=[],seen=new Map([[text(start),0]]);
  let current=evaluate(coefficients,derivative,start,0),outcome;
  points.push(pointRecord(current));
  while(true) {
    if(current.value.n===0n) {
      outcome={kind:'exact-root',index:current.index,message:'The exact residual is zero. This point is an exact root; no further step is needed.'};break;
    }
    if(current.derivative.n===0n) {
      outcome={kind:'zero-slope',index:current.index,message:'The residual is nonzero and the derivative is zero. This horizontal tangent has no x-intercept, so a Newton step is undefined.'};break;
    }
    if(steps.length===limit) {
      outcome={kind:'step-limit',index:current.index,message:'The chosen step limit is reached. The residual is still nonzero; this stop is not a convergence claim.'};break;
    }
    let correction,next;
    try {
      correction=divide(current.value,current.derivative);
      const nextX=subtract(current.x,correction);
      next=evaluate(coefficients,derivative,nextX,current.index+1);
    } catch(error) {
      if(!(error instanceof ArithmeticLimit))throw error;
      outcome={kind:'arithmetic-limit',index:current.index,message:'The next complete step would exceed the 4096-bit exact-arithmetic bound. The last complete point and steps are retained; no convergence or divergence is inferred.'};break;
    }
    steps.push(Object.freeze({index:current.index,x:text(current.x),value:text(current.value),derivative:text(current.derivative),correction:text(correction),next:text(next.x),nextValue:text(next.value)}));
    points.push(pointRecord(next));
    const repeated=seen.get(text(next.x));
    current=next;
    if(current.value.n!==0n&&repeated!==undefined) {
      outcome={kind:'cycle',index:current.index,cycleStart:repeated,cycleLength:current.index-repeated,message:'This exact rational point has appeared before with a nonzero residual. The deterministic steps repeat a cycle of length '+(current.index-repeated)+'.'};break;
    }
    seen.set(text(current.x),current.index);
  }
  return Object.freeze({
    format:'recallweave-newton/1',
    input:Object.freeze({coefficients:Object.freeze(coefficients),start:text(start),steps:limit}),
    limits:NEWTON_LIMITS,
    points:Object.freeze(points),steps:Object.freeze(steps),outcome:Object.freeze(outcome),
    arithmetic:'Every fraction and stopping decision is exact within the stated bound. Plot coordinates and approximate labels are rounded; a small displayed value does not establish a root.'
  });
}

/** Approximate a canonical fraction for a plot, retaining the exact string elsewhere. */
export function approximateRational(value) {
  if(typeof value!=='string'||value.length>2500||! /^-?\d+(?:\/[1-9]\d*)?$/.test(value))throw new Error('Expected a bounded canonical fraction.');
  const parts=value.split('/');const n=BigInt(parts[0]),d=BigInt(parts[1]??'1');
  const magnitude=abs(n);if(magnitude===0n)return 0;
  const nShift=Math.max(0,magnitude.toString(2).length-53),dShift=Math.max(0,d.toString(2).length-53);
  return (n<0n?-1:1)*(Number(magnitude>>BigInt(nShift))/Number(d>>BigInt(dShift)))*2**(nShift-dShift);
}
export function polynomialLabel(coefficients) {
  const terms=[];
  for(let power=3;power>=0;power--){
    const c=coefficients[power];if(c===0)continue;
    const magnitude=Math.abs(c),variable=power===0?'':power===1?'x':power===2?'x²':'x³';
    const body=(power===0||magnitude!==1?String(magnitude):'')+variable;
    terms.push((terms.length?(c<0?' − ':' + '):(c<0?'−':''))+body);
  }
  return terms.join('')||'0';
}
