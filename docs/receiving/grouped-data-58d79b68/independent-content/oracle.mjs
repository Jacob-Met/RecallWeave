// Independent exact oracle, frozen from contract before product source inspection.
import assert from 'node:assert/strict';
export const gcd = (a,b) => { a=a<0n?-a:a; b=b<0n?-b:b; while(b){[a,b]=[b,a%b];} return a; };
export function fraction(n,d) { n=BigInt(n); d=BigInt(d); if(d===0n) return null; assert(d>0n); const g=gcd(n,d); return {n:n/g,d:d/g}; }
export function add(a,b) { if(a===null||b===null)return null; return fraction(a.n*b.d+b.n*a.d,a.d*b.d); }
export function multiply(a,k,d=1) { if(BigInt(k)===0n) return fraction(0,1); if(a===null)return null; return fraction(a.n*BigInt(k),a.d*BigInt(d)); }
export function compare(a,b) { if(a===null||b===null)return 'unavailable'; const x=a.n*b.d-b.n*a.d; return x>0n?'A':x<0n?'B':'tie'; }
export function encode(x) { return x===null?null:`${x.n}/${x.d}`; }
export function optionView(groups,weight) {
  for(const g of groups) { assert(Number.isInteger(g.success)&&Number.isInteger(g.total)); assert(g.success>=0&&g.success<=g.total&&g.total<=1000000); }
  const total=groups.reduce((s,g)=>s+g.total,0),success=groups.reduce((s,g)=>s+g.success,0);
  const rates=groups.map(g=>fraction(g.success,g.total));
  const weights=groups.map(g=>fraction(g.total,total));
  const reference=add(multiply(rates[0],100-weight,100),multiply(rates[1],weight,100));
  return {counts:groups.map(g=>({...g})),pooledCounts:{success,total},rates,weights,pooled:fraction(success,total),reference};
}
export function expected(data) {
  assert(Number.isInteger(data.weight)&&data.weight>=0&&data.weight<=100);
  const a=optionView(data.A,data.weight),b=optionView(data.B,data.weight);
  const within=a.rates.map((r,i)=>compare(r,b.rates[i]));
  const pooled=compare(a.pooled,b.pooled),reference=compare(a.reference,b.reference);
  const reversal=(within[0]==='A'||within[0]==='B')&&within[0]===within[1]&&pooled!=='tie'&&pooled!=='unavailable'&&pooled!==within[0];
  const serialize=o=>({...o,rates:o.rates.map(encode),weights:o.weights.map(encode),pooled:encode(o.pooled),reference:encode(o.reference)});
  return {weight:data.weight,A:serialize(a),B:serialize(b),within,pooled,reference,strictReversal:reversal};
}
