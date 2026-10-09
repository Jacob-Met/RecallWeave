/** Exact simultaneous diffusion on an eight-cell periodic ring. No dependencies. */
const abs = x => x < 0n ? -x : x;
function gcd(a,b) { while (b !== 0n) [a,b] = [b,a % b]; return abs(a); }
function rat(n,d=1n) {
  if (d < 0n) { n=-n; d=-d; }
  const g=gcd(n,d); return [n/g,d/g];
}
const add=(a,b)=>rat(a[0]*b[1]+b[0]*a[1],a[1]*b[1]);
const sub=(a,b)=>rat(a[0]*b[1]-b[0]*a[1],a[1]*b[1]);
const mul=(a,b)=>rat(a[0]*b[0],a[1]*b[1]);
const compare=(a,b)=>a[0]*b[1]-b[0]*a[1];
const out=a=>({numerator:String(a[0]),denominator:String(a[1])});
const sum=a=>a.reduce(add,[0n,1n]);
function freeze(value) {
  if (value && typeof value==='object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function integer(x,lo,hi,name) {
  if (typeof x!=='number' || !Number.isInteger(x) || x<lo || x>hi)
    throw new RangeError(name+' must be an integer from '+lo+' to '+hi+'.');
}
export function computeDiffusion(input) {
  if (!input || typeof input!=='object' || Array.isArray(input))
    throw new TypeError('Supply one diffusion settings object.');
  const {values,numerator,denominator,steps}=input;
  if (!Array.isArray(values) || values.length!==8)
    throw new RangeError('Supply exactly eight initial cell values.');
  for (let j=0;j<8;j++) {
    if (!Object.hasOwn(values,j)) throw new RangeError('Every initial cell needs a value.');
    integer(values[j],-20,20,'Cell '+j);
  }
  integer(numerator,0,16,'Ratio numerator');
  integer(denominator,1,16,'Ratio denominator');
  if (numerator>denominator) throw new RangeError('The ratio must be between zero and one.');
  integer(steps,0,24,'Step count');
  const r=rat(BigInt(numerator),BigInt(denominator));
  const center=sub([1n,1n],mul([2n,1n],r));
  const mean=mul(sum(values.map(x=>[BigInt(x),1n])),[1n,8n]);
  let previous=values.map(x=>[BigInt(x),1n]);
  const rows=[];
  function row(step,values,transition) {
    const minimum=values.reduce((a,b)=>compare(a,b)<=0n?a:b);
    const maximum=values.reduce((a,b)=>compare(a,b)>=0n?a:b);
    const deviationSquared=sum(values.map(x=>{ const d=sub(x,mean);return mul(d,d); }));
    return {step,values:values.map(out),sum:out(sum(values)),mean:out(mean),
      minimum:out(minimum),maximum:out(maximum),squaredDeviations:out(deviationSquared),transition};
  }
  rows.push(row(0,previous,null));
  for (let step=1;step<=steps;step++) {
    const next=[],transition=[];
    for (let j=0;j<8;j++) {
      const indices=[(j+7)%8,j,(j+1)%8];
      const inputs=indices.map(i=>previous[i]);
      const terms=[mul(r,inputs[0]),mul(center,inputs[1]),mul(r,inputs[2])];
      const value=sum(terms);
      next.push(value);
      transition.push({cell:j,indices,previous:inputs.map(out),terms:terms.map(out),value:out(value)});
    }
    rows.push(row(step,next,transition)); previous=next;
  }
  return freeze({
    format:'recallweave-diffusion/1',
    scheme:'Eight-cell periodic simultaneous explicit update',
    input:{values:[...values],numerator,denominator,steps},
    ratio:out(r),weights:[out(r),out(center),out(r)],
    alternatingMultiplier:out(sub([1n,1n],mul([4n,1n],r))),
    convexWeights:2*numerator<=denominator,
    rows
  });
}
