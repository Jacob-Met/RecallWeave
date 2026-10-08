import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {RATE_PRESETS, analyzeMotion, serializeMotion} from '../src/rates-accumulation.mjs';
import {parseDeck} from '../src/deck.mjs';
const curve = (...rows) => 'time_s,velocity_m_s\n' + rows.join('\n');
const check = (source, time, expected) => {
  const r = analyzeMotion(source, time);
  for (const [field, value] of Object.entries(expected)) assert.equal(r[field]?.fraction ?? null, value, field);
  return r;
};
test('constant rate accumulates with units and negative rate retains direction', () => {
  check(curve('0,2.5','6,2.5'),'6',{velocity:'5/2',displacement:'15/1',distance:'15/1',averageVelocity:'5/2'});
  check(curve('0,-2','3,-2','5,0'),'3',{velocity:'-2/1',displacement:'-6/1',distance:'6/1',averageVelocity:'-2/1'});
  check(curve('0,-2','3,-2','5,0'),'5',{displacement:'-8/1',distance:'8/1'});
});
test('out-and-back prefixes retain signed and absolute accumulation separately', () => {
  const s=RATE_PRESETS[0].source;
  check(s,'2',{velocity:'4/1',displacement:'4/1',distance:'4/1',averageVelocity:'2/1'});
  check(s,'3',{velocity:'2/1',displacement:'7/1',distance:'7/1',averageVelocity:'7/3'});
  check(s,'5',{velocity:'-2/1',displacement:'7/1',distance:'9/1',averageVelocity:'7/5'});
  check(s,'8',{velocity:'0/1',displacement:'0/1',distance:'16/1',averageVelocity:'0/1'});
});
test('an interior zero is split before distance accumulation', () => {
  const s=curve('0,3','4,-1');
  check(s,'3',{velocity:'0/1',displacement:'9/2',distance:'9/2'});
  const r=check(s,'4',{velocity:'-1/1',displacement:'4/1',distance:'5/1'});
  assert.equal(r.segments[0].zeroCrossing.fraction,'3/1');
  check(s,'2.9',{velocity:'1/10',displacement:'899/200',distance:'899/200'});
  check(s,'3.1',{velocity:'-1/10',displacement:'899/200',distance:'901/200'});
});
test('a non-grid zero retains exact rational area', () => {
  const s=curve('0,1','1,-2');
  const r=check(s,'1',{displacement:'-1/2',distance:'5/6'});
  assert.equal(r.segments[0].zeroCrossing.fraction,'1/3');
  check(s,'0.5',{velocity:'-1/2',displacement:'1/8',distance:'5/24',averageVelocity:'1/4'});
});
test('zero duration, complete rest and touching zero are distinct', () => {
  check(curve('0,3','4,-1'),'0',{velocity:'3/1',displacement:'0/1',distance:'0/1',averageVelocity:null});
  check(curve('0,0','4,0'),'4',{velocity:'0/1',displacement:'0/1',distance:'0/1',averageVelocity:'0/1'});
  const r=check(RATE_PRESETS.find(p=>p.id==='touch').source,'4',{displacement:'4/1',distance:'4/1'});
  assert.ok(r.segments.every(s=>s.zeroCrossing===null));
});
test('acceleration records corners, straight inserted knots and one-sided boundaries', () => {
  const s=RATE_PRESETS[0].source;
  const c=analyzeMotion(s,'2').acceleration;
  assert.equal(c.kind,'corner'); assert.equal(c.value,null);
  assert.equal(c.left.fraction,'2/1'); assert.equal(c.right.fraction,'-2/1');
  assert.equal(analyzeMotion(s,'4').acceleration.kind,'defined');
  assert.equal(analyzeMotion(s,'4').acceleration.value.fraction,'-2/1');
  assert.equal(analyzeMotion(s,'0').acceleration.kind,'start-boundary');
  assert.equal(analyzeMotion(s,'0').acceleration.left,null);
  assert.equal(analyzeMotion(s,'8').acceleration.kind,'end-boundary');
  assert.equal(analyzeMotion(s,'8').acceleration.right,null);
  assert.equal(analyzeMotion(s,'0.1').acceleration.value.fraction,'2/1');
});
test('covered segment rows agree with manually worked rest and cruise prefixes', () => {
  const s=RATE_PRESETS.find(p=>p.id==='rest').source;
  const r=check(s,'6',{velocity:'3/1',displacement:'15/2',distance:'15/2',averageVelocity:'5/4'});
  assert.deepEqual(r.segments.map(s=>s.coverage),['complete','complete','partial']);
  assert.deepEqual(r.segments.map(s=>s.coveredDisplacement.fraction),['0/1','9/2','3/1']);
  assert.deepEqual(r.segments.map(s=>s.fullDisplacement.fraction),['0/1','9/2','9/1']);
  assert.equal(r.segments[2].coveredUntil.fraction,'6/1');
});
test('sign reversal negates signed values but preserves distance over many prefixes', () => {
  for(let a=-4;a<=4;a++) for(let b=-4;b<=4;b++) for(const t of ['0','0.1','1.3','3','4']){
    const positive=analyzeMotion(curve('0,'+a,'4,'+b),t);
    const reversed=analyzeMotion(curve('0,'+(-a),'4,'+(-b)),t);
    assert.equal(positive.distance.fraction,reversed.distance.fraction);
    const [n,d]=positive.displacement.fraction.split('/');
    assert.equal(reversed.displacement.fraction,(-BigInt(n))+'/'+d);
    assert.ok(positive.distance.approximate>=Math.abs(positive.displacement.approximate)-1e-12);
  }
});
test('all declared edges are admitted and all invalid inputs are refused before a result', () => {
  check(curve('0,-50','120,50'),'120',{displacement:'0/1',distance:'3000/1'});
  analyzeMotion(curve('0,0','1,0','2,0','3,0','4,0','5,0','6,0','120,0'),'119.9');
  const invalid=[null,'','x\n0,1\n1,2',curve('1,0','2,1'),curve('0,0'),curve('0,0','0,1'),
    curve('0,0','2,1','1,1'),curve('0,0','121,1'),curve('0,0','1,50.1'),curve('0,0','1,-50.1'),
    curve('0,0','1,NaN'),curve('0,0','1,Infinity'),curve('0,0','1,1e1'),curve('0,0','1,.1'),
    curve('0,0','1,0.11'),curve('0,0','1.0,1'),curve('0,0','01,1'),curve('0,0','1,1,2'),
    curve(...Array.from({length:9},(_,i)=>i+',0')),' '.repeat(2049)];
  for(const source of invalid)assert.throws(()=>analyzeMotion(source,'0'),String(source));
  for(const t of ['',null,'-0.1','NaN','Infinity','1e0','.1','0.11','5','00.1'])assert.throws(()=>analyzeMotion(curve('0,0','4,1'),t),String(t));
});
test('records are immutable, deterministic and retain complete authored input', () => {
  const source='time_s,velocity_m_s\r\n 0, -0.0 \r\n\r\n 4, 1.0 ';
  const r=analyzeMotion(source,'2');
  assert.equal(r.source,source); assert.equal(r.points[1].sourceLine,4);
  assert.ok(Object.isFrozen(r.segments[0].fullDistance));
  assert.throws(()=>{r.points[0].velocity.fraction='99/1';},TypeError);
  assert.equal(serializeMotion(source,'2'),JSON.stringify(r,null,2)+'\n');
  assert.deepEqual(JSON.parse(serializeMotion(source,'2')),r);
  assert.equal(r.format,'recallweave-rates-accumulation/1');
});
test('the original course passes unchanged deck admission and balanced answer positions', async () => {
  const raw=await readFile(new URL('../courses/rates-accumulation.json',import.meta.url),'utf8');
  const deck=parseDeck(raw); assert.equal(deck.items.length,12); assert.equal(deck.concepts.length,4);
  const positions=[0,0,0,0]; for(const q of deck.items){positions[q.answer]++;assert.equal(q.options.length,4);}
  assert.deepEqual(positions,[3,3,3,3]);
});
test('standalone parity and embedded exact course/guide bytes', async () => {
  const root=fileURLToPath(new URL('..',import.meta.url));
  const result=spawnSync(process.execPath,['tools/build-rates-accumulation.mjs','--check'],{cwd:root,encoding:'utf8',timeout:10000});
  assert.equal(result.status,0,result.stderr||result.stdout);
  const html=await readFile(new URL('../courses/rates-accumulation-explorer.html',import.meta.url),'utf8');
  for(const [id,path]of [['rates-deck-json','rates-accumulation.json'],['rates-guide-json','rates-accumulation.md']]){
    const match=html.match(new RegExp('<script id="'+id+'" type="application/json">([\\s\\S]*?)</script>'));
    assert.ok(match); assert.equal(JSON.parse(match[1]),await readFile(new URL('../courses/'+path,import.meta.url),'utf8'));
  }
});
