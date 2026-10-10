import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const input=JSON.parse(process.argv[1]);
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
assert.equal(sha(input.source),'a9415a4cef654f88583b62808a5bbbdd8b1946678f278488a9bd9dcd506cb470');
const {solveCongruences:solve,inspectCongruences:inspect,serializeObservation:serialize}=await import('data:text/javascript;base64,'+Buffer.from(input.source).toString('base64'));
const groups=[];let assertions=0,cases=0;
function equal(actual,expected,label){assertions++;assert.deepEqual(actual,expected,label);}
function yes(value,label){assertions++;assert.ok(value,label);}
function refuses(fn,label){assertions++;assert.throws(fn,undefined,label);}
const mod=(x,m)=>(x%m+m)%m;
function identity(r,strings){
 const a=BigInt(strings[0]),m=BigInt(strings[1]),b=BigInt(strings[2]),n=BigInt(strings[3]);
 const c=r.compatibility,g=BigInt(c.gcd),s=BigInt(c.bezout.s),t=BigInt(c.bezout.t);
 equal(r.entered,{a:strings[0],m:strings[1],b:strings[2],n:strings[3]},'exact entered text');
 equal(r.normalized,{a:String(mod(a,m)),m:String(m),b:String(mod(b,n)),n:String(n)},'canonical residues');
 yes(g>0n && m%g===0n && n%g===0n,'positive common divisor');
 equal(m*s+n*t,g,'Bezout proves greatest common divisor');
 const difference=mod(b,n)-mod(a,m);
 equal(c.difference,String(difference),'canonical difference');
 equal(c.differenceRemainder,String(mod(difference,g)),'canonical compatibility remainder');
 equal(c.reducedM,String(m/g),'reduced first modulus');
 equal(c.reducedN,String(n/g),'reduced second modulus');
 equal(c.compatible,difference%g===0n,'divisibility compatibility');
 if(!c.compatible){equal(r.solution,null,'no invented solution');return;}
 const z=r.solution,x=BigInt(z.first),period=BigInt(z.period),k=BigInt(z.multiplier);
 equal(period*g,m*n,'lcm from gcd');
 yes(x>=0n && x<period,'least nonnegative class representative bound');
 equal(mod(x,m),mod(a,m),'first input condition');equal(mod(x,n),mod(b,n),'second input condition');
 equal(z.residueChecks,[String(mod(x,m)),String(mod(x,n))],'literal residue checks');
 equal(z.differenceQuotient,String(difference/g),'exact difference division');
 yes(k>=0n && k<n/g,'canonical multiplier bound');
 equal(z.unreduced,String(mod(a,m)+m*k),'substitution');
 equal(x,mod(BigInt(z.unreduced),period),'solution normalization');
 if(n/g===1n){equal(z.reducedInverse,null,'redundant second modulus has no inverse');equal(k,0n,'canonical modulus-one multiplier');}
 else {const inv=BigInt(z.reducedInverse);yes(inv>=0n && inv<n/g,'inverse bound');equal(mod((m/g)*inv,n/g),1n,'actual inverse identity');equal(mod((m/g)*k,n/g),mod(difference/g,n/g),'reduced equation');}
 for(const j of [-7n,-1n,0n,1n,9n]){
  equal(mod(x+j*period,m),mod(a,m),'all signed class members satisfy first');
  equal(mod(x+j*period,n),mod(b,n),'all signed class members satisfy second');
 }
}
const started=Date.now();
for(let m=1;m<=18;m++)for(let n=1;n<=18;n++){
 let period=1;while(period%m!==0||period%n!==0)period++;
 for(let a=0;a<m;a++)for(let b=0;b<n;b++){
  let first=null;
  for(let x=0;x<period;x++)if(x%m===a&&x%n===b){first=x;break;}
  const raw=[String(a-3*m),String(m),String(b+2*n),String(n)],r=solve(...raw);
  cases++;identity(r,raw);
  equal(r.compatibility.compatible,first!==null,'exhaustive independent search compatibility');
  if(first!==null){equal(r.solution.first,String(first),'exhaustive least solution');equal(r.solution.period,String(period),'independent least repeating difference');}
 }
}
groups.push({name:'All canonical residue pairs, moduli1..18, signed input representatives, brute-force first and period',cases});
const largeCases=[
 ['999999999999999999','999999999999999989','-999999999999999999','999999999999999937'],
 ['9007199254740993','999999999999999999','-9007199254740993','999999999999999998'],
 ['123456789012345678','999999999999999990','-234567890123456789','888888888888888880'],
 ['-999999999999999999','999999999999999999','0','1'],
 ['999999999999999998','999999999999999999','-1','999999999999999999'],
 ['0','1','0','1'],
 [' \t+0003\n','004','+0002','005']
];
const largeResults=[];
for(const raw of largeCases){
 const r=solve(...raw);identity(r,raw);
 const reversed=solve(raw[2],raw[3],raw[0],raw[1]);identity(reversed,[raw[2],raw[3],raw[0],raw[1]]);
 equal(reversed.compatibility.compatible,r.compatibility.compatible,'order-invariant compatibility');
 equal(reversed.solution?.first,r.solution?.first,'order-invariant first');
 equal(reversed.solution?.period,r.solution?.period,'order-invariant period');
 largeResults.push({input:raw,compatible:r.compatibility.compatible,first:r.solution?.first??null,period:r.solution?.period??null});
}
groups.push({name:'Large exact identities, signed extremes, order invariance, repeated and modulus-one cases',cases:largeCases.length,results:largeResults});
const invalid=['',' ','+','--1','+ 1','1e3','0x10','1.0','1_000','−1','١','１','1'.repeat(19),' '.repeat(50)+'1',null,undefined,1,1n,true,{},[]];
let refusals=0;
for(let index=0;index<4;index++)for(const bad of invalid){const raw=['2','6','5','9'];raw[index]=bad;refuses(()=>solve(...raw),'typed bounded decimal refusal at '+index);refusals++;}
for(const index of [1,3])for(const bad of ['0','-0','+0','-1']){const raw=['2','6','5','9'];raw[index]=bad;refuses(()=>solve(...raw),'nonpositive modulus');refusals++;}
const atLimit=' '.repeat(32)+'1'.repeat(18);identity(solve(atLimit,'1','0','1'),[atLimit,'1','0','1']);
equal(solve('-000000000000000000','1','+000000000000000000','1').solution.first,'0','signed 18-digit zero residues');
groups.push({name:'Strict string/type/grammar/raw-length/digit/sign admission',refusals});
let windows=0,rows=0;
for(const r of [solve('2','6','5','9'),solve('1','4','2','6'),solve('0','1','0','1'),solve('0','1','9007199254740993','999999999999999999')]){
 for(const probe of ['-25','0','999999999999999999999999999999999999999999999999999999999999999999999999','-999999999999999999999999999999999999999999999999999999999999999999999999',' \t+0000\n']){
  const w=inspect(r,probe);equal(w.rows.length,24,'entire window');equal(w.entered,probe,'exact probe text');
  for(let i=0;i<24;i++){
   const row=w.rows[i],x=BigInt(probe)+BigInt(i),a=BigInt(r.normalized.a),m=BigInt(r.normalized.m),b=BigInt(r.normalized.b),n=BigInt(r.normalized.n);
   equal(row,{offset:i,x:String(x),remainderA:String(mod(x,m)),remainderB:String(mod(x,n)),matchesA:mod(x,m)===a,matchesB:mod(x,n)===b,matchesBoth:mod(x,m)===a&&mod(x,n)===b},'every exact visible row');rows++;
  }
  yes(Object.isFrozen(w)&&Object.isFrozen(w.rows)&&w.rows.every(Object.isFrozen),'inspection immutability');
  const altered=structuredClone(w);altered.rows[0].x='999';altered.rows[0].matchesBoth=!altered.rows[0].matchesBoth;
  const saved=JSON.parse(serialize(r,altered));
  equal(saved.result,r,'complete applied result preserved');equal(saved.inspection,w,'serialized inspection recomputed from admitted text');
  windows++;
 }
}
for(const bad of ['', '+', '1e5', '1'.repeat(73), ' '.repeat(104)+'0', 0, null])refuses(()=>inspect(solve('0','1','0','1'),bad),'probe admission');
groups.push({name:'All rows, 72-digit endpoints/carry, signed windows, exact saved observations',windows,rows});
const frozen=solve('2','6','5','9');
yes(Object.isFrozen(frozen)&&Object.isFrozen(frozen.entered)&&Object.isFrozen(frozen.normalized)&&Object.isFrozen(frozen.compatibility)&&Object.isFrozen(frozen.compatibility.bezout)&&Object.isFrozen(frozen.solution)&&Object.isFrozen(frozen.solution.residueChecks),'recursive result freeze');
refuses(()=>{frozen.solution.first='bad';},'applied result cannot change');refuses(()=>{frozen.solution.residueChecks.push('bad');},'applied check array cannot change');
groups.push({name:'Returned applied-result identity is immutable'});
console.log(JSON.stringify({schema:'recallweave.congruences.root-independent.v1',source_commit:input.commit,source_sha256:sha(input.source),oracle_sha256:sha(input.oracle),node:process.version,platform:process.platform,architecture:process.arch,assertions,groups,seconds:(Date.now()-started)/1000,passed:true,scope:'Exact production core imported as a data URL in Node; independent arithmetic/observation receiving. No stock filesystem, browser, learner, hosted-suite, or deployment result is inferred.'}));
