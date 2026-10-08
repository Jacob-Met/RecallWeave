import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRows, buildCode, encodeSymbols, decodeBits, serializeExample } from '../src/prefix-coding.mjs';
const rows = [{ symbol: 'A', count: 8 }, { symbol: 'B', count: 3 }, { symbol: 'C', count: 2 }, { symbol: 'D', count: 1 }];
test('authored uneven distribution has exact 23-bit payload and merge trace', () => {
  const m = buildCode(rows);
  assert.deepEqual(m.steps.map(s => [s.left, s.right, s.addedCost, s.accumulatedCost]), [[3,2,3,3],[1,4,6,9],[5,0,14,23]]);
  assert.deepEqual(m.codebook.map(r => [r.symbol, r.code, r.cost]), [['A','1',8],['B','00',6],['C','011',6],['D','010',3]]);
  assert.deepEqual(m.totals, { totalCount:14,payloadBits:23,fixedWidth:2,fixedPayloadBits:28,averageBits:23/14,savedPayloadBits:5,mergeWeightSum:23 });
});
test('canonical scalar order and node creation resolve all equal-count ties', () => {
  const labels = ['😀', '\ue000', 'A', ' A'];
  const input = labels.map(symbol => ({symbol,count:1}));
  const m = buildCode(input);
  assert.deepEqual(m.rows.map(r=>r.symbol), [' A','A','\ue000','😀']);
  assert.deepEqual(buildCode(input.slice().reverse()),m);
  assert.deepEqual(m.codebook.map(r=>r.code),['00','01','10','11']);
});
test('two symbols and maximum bounds remain exact', () => {
  const two = buildCode([{symbol:'rare',count:1},{symbol:'common',count:10000}]);
  assert.deepEqual(two.codebook.map(r=>r.length),[1,1]);
  assert.equal(two.totals.payloadBits,10001);
  const eight=buildCode(Array.from({length:8},(_,i)=>({symbol:String(i),count:10000})));
  assert.equal(eight.totals.payloadBits,240000);
  assert.equal(eight.totals.savedPayloadBits,0);
  assert.equal(eight.steps.length,7);
  assert.equal(eight.nodes.length,15);
});
test('every codebook is prefix-free and costs equal the sum of merge weights', () => {
  for(let n=2;n<=8;n++) for(let seed=1;seed<=20;seed++){
    const m=buildCode(Array.from({length:n},(_,i)=>({symbol:String(i),count:1+(seed*(i+1)*13)%37})));
    for(const a of m.codebook)for(const b of m.codebook) if(a!==b)assert.equal(b.code.startsWith(a.code),false);
    assert.equal(m.totals.payloadBits,m.steps.reduce((s,x)=>s+x.addedCost,0));
    assert.ok(m.totals.payloadBits<=m.totals.fixedPayloadBits);
    assert.equal(m.nodes[m.root].weight,m.totals.totalCount);
  }
});
test('real codeword segments round-trip exactly without treating labels as text to split', () => {
  const labels=[{symbol:'__proto__',count:3},{symbol:'<b>Ω</b>',count:2},{symbol:' x\n',count:1}];
  const message=[' x\n','__proto__','<b>Ω</b>',' x\n'];
  const encoded=encodeSymbols(labels,message);
  assert.deepEqual(decodeBits(labels,encoded.bits),encoded);
  assert.deepEqual(decodeBits(rows,''),{bits:'',symbols:[],segments:[]});
  assert.deepEqual(encodeSymbols(rows,[]),{bits:'',symbols:[],segments:[]});
});
test('partial final codewords and invalid bit strings cannot be reported as complete', () => {
  assert.throws(()=>decodeBits(rows,'0'),/inside a codeword/);
  for(const value of ['10 01','2','\n','0'.repeat(4097),null,12])assert.throws(()=>decodeBits(rows,value));
  assert.equal(decodeBits([{symbol:'A',count:1},{symbol:'B',count:1}],'0'.repeat(4096)).symbols.length,4096);
});
test('malformed cohorts fail before model construction', () => {
  for(const value of [null,{},[],[rows[0]],Array(9).fill(rows[0])])assert.throws(()=>buildCode(value));
  for(const symbol of ['', ' \n','x'.repeat(25),'\ud800','\udfff',null,1])assert.throws(()=>buildCode([{symbol,count:1},rows[0]]));
  for(const count of [0,-1,1.5,10001,NaN,Infinity,'1',null])assert.throws(()=>buildCode([{symbol:'X',count},rows[0]]));
  assert.throws(()=>buildCode([rows[0],rows[0]]),/distinct/);
  assert.equal(validateRows([{symbol:' A',count:1},rows[0]]).length,2);
});
test('message and inspection limits are admitted explicitly', () => {
  assert.equal(encodeSymbols(rows,Array(512).fill('A')).symbols.length,512);
  for(const input of [Array(513).fill('A'),['Z'],[1],null,'A'])assert.throws(()=>encodeSymbols(rows,input));
  for(const step of [-1,4,0.5,'0',null])assert.throws(()=>serializeExample(rows,step,''));
  const text=serializeExample(rows,2,encodeSymbols(rows,['A','D']).bits);
  assert.ok(text.endsWith('\n'));
  const saved=JSON.parse(text);
  assert.equal(saved.format,'recallweave.prefix-coding/1');
  assert.equal(saved.inspection.step,2);
  assert.deepEqual(saved.decoding.symbols,['A','D']);
  assert.deepEqual(saved.model,buildCode(rows));
});
test('input objects remain untouched and the returned model cannot be edited', () => {
  const input=structuredClone(rows),before=structuredClone(input),m=buildCode(input);
  assert.deepEqual(input,before);
  assert.ok(Object.isFrozen(m)&&Object.isFrozen(m.codebook[0])&&Object.isFrozen(m.steps[0].before));
  input[0].count=99;
  assert.equal(m.rows[0].count,8);
  assert.throws(()=>{m.codebook[0].code='00';});
});

test('sparse arrays never silently omit a symbol row or message entry', () => {
  assert.throws(()=>validateRows([,{symbol:'B',count:2}]),/present/);
  assert.throws(()=>encodeSymbols(rows,Array(1)),/present/);
  assert.throws(()=>encodeSymbols(rows,['A',,'B']),/present/);
  const inherited = ['A',,'B'];
  const proto = Object.create(Array.prototype);
  proto[1] = 'C'; Object.setPrototypeOf(inherited,proto);
  assert.throws(()=>encodeSymbols(rows,inherited),/present/);
});
