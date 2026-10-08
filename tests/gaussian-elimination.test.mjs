import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { LIMITS, PRESETS, parseMatrix, applyOperation, replayOperation, analyze } from '../src/gaussian-elimination.mjs';
import { parseDeck } from '../src/deck.mjs';

// Independent substitution oracle: fraction cross-products, no elimination implementation.
function fraction(value) { const [n, d = '1'] = value.split('/'); return [BigInt(n), BigInt(d)]; }
function total(terms) {
  let n = 0n, d = 1n;
  for (const [a, b] of terms) { n = n * b + a * d; d *= b; }
  return [n, d];
}
function product(a, b) { const [an, ad] = fraction(a), [bn, bd] = fraction(b); return [an * bn, ad * bd]; }
function equalFraction([n, d], value) { const [vn, vd] = fraction(value); assert.equal(n * vd, vn * d); }
function certify(matrix, result) {
  const n = matrix[0].length - 1;
  if (result.kind === 'none') {
    for (let c = 0; c <= n; c++) equalFraction(total(matrix.map((row, r) => product(row[c], result.witness[r]))), c === n ? '1' : '0');
    assert.equal(result.augmentedRank, result.rank + 1);
  } else {
    assert.equal(result.particular.length, n);
    for (const row of matrix) equalFraction(total(row.slice(0, n).map((a, c) => product(a, result.particular[c]))), row[n]);
    for (const vector of result.basis) for (const row of matrix) equalFraction(total(row.slice(0, n).map((a, c) => product(a, vector[c]))), '0');
    assert.equal(result.basis.length, n - result.rank);
    result.free.forEach((c, j) => result.basis.forEach((vector, k) => assert.equal(vector[c], j === k ? '1' : '0')));
    assert.equal(result.kind, result.rank === n ? 'unique' : 'infinite');
  }
}
test('five frozen hand oracles, including exact fractions and contradiction weights', () => {
  const expected = {
    unique: { kind: 'unique', particular: ['2', '3'], rref: [['1', '0', '2'], ['0', '1', '3']] },
    swap: { kind: 'unique', particular: ['1', '2'] },
    family: { kind: 'infinite', particular: ['3', '0', '0'], basis: [['-2', '1', '0'], ['1', '0', '1']] },
    inconsistent: { kind: 'none', witness: ['-2', '1'] },
    fractions: { kind: 'unique', particular: ['6/7', '11/7'] },
  };
  for (const preset of PRESETS) {
    const matrix = parseMatrix(preset.text), result = analyze(matrix);
    for (const [key, value] of Object.entries(expected[preset.id])) assert.deepEqual(result[key], value);
    certify(matrix, result);
  }
});
test('three-equation hand oracle and all-zero system', () => {
  const m = parseMatrix('1 1 1 6; 2 -1 1 3; 1 2 -1 2');
  const a = analyze(m); assert.deepEqual(a.particular, ['1', '2', '3']); certify(m, a);
  const z = analyze(parseMatrix('0 0 0; 0 0 0'));
  assert.deepEqual(z.basis, [['1', '0'], ['0', '1']]); assert.equal(z.kind, 'infinite');
});
test('whole augmented row operations and inverse recovery', () => {
  const m = parseMatrix('1 1 5; 2 -1 1'), frozen = JSON.stringify(m);
  assert.deepEqual(applyOperation(m, {kind:'add',target:1,source:0,factor:'-2'}), [['1','1','5'],['0','-3','-9']]);
  for (const [forward, backward] of [
    [{kind:'swap',target:0,source:1},{kind:'swap',target:0,source:1}],
    [{kind:'scale',target:0,factor:'-2/3'},{kind:'scale',target:0,factor:'-3/2'}],
    [{kind:'add',target:1,source:0,factor:'7/3'},{kind:'add',target:1,source:0,factor:'-7/3'}],
  ]) assert.deepEqual(applyOperation(applyOperation(m,forward),backward),m);
  assert.equal(JSON.stringify(m), frozen);
});
test('returned reduction trace consists of legal operations and ends in canonical form', () => {
  for (const preset of PRESETS) {
    const m = parseMatrix(preset.text), before = JSON.stringify(m), result = analyze(m);
    let at = m;
    for (const step of result.steps) { at = replayOperation(at,step.operation); assert.deepEqual(at,step.matrix); }
    assert.deepEqual(at,result.rref); assert.equal(analyze(at).steps.length,0); assert.equal(JSON.stringify(m),before);
    result.rref[0][0] = '99'; assert.equal(JSON.stringify(m),before);
  }
});
test('200 deterministic small systems satisfy independent exact certificates', () => {
  let state = 93281;
  const rand = () => { state = (state * 48271) % 2147483647; return state; };
  for (let k = 0; k < 200; k++) {
    const rows = 2 + rand()%2, variables = 2 + rand()%2;
    const m = Array.from({length:rows},()=>Array.from({length:variables+1},()=>String(rand()%11-5)));
    const before = JSON.stringify(m); certify(m,analyze(m)); assert.equal(JSON.stringify(m),before);
  }
});
test('fraction normalization is exact and admits negative denominators', () => {
  assert.deepEqual(parseMatrix('+02 -3/-6 0/7; 1 1 2'), [['2','1/2','0'],['1','1','2']]);
  assert.deepEqual(applyOperation(parseMatrix('1 1 2; 1 -1 0'), {kind:'add',target:0,source:1,factor:'0'}), [['1','1','2'],['1','-1','0']]);
});
test('invalid matrices and numeric syntax are refused', () => {
  for (const text of ['1 2 3','1 2 3;4 5','1 2 3;;4 5 6','1.5 1 2;1 1 2','1e2 1 2;1 1 2','1/0 1 2;1 1 2','NaN 1 2;1 1 2','1 2 3 4 5;1 2 3 4 5'])
    assert.throws(()=>parseMatrix(text),Error,text);
  for (const value of [null, [], {}, [['1','2','3'],['4','5',6]]]) assert.throws(()=>analyze(value));
});
test('invalid operations preserve inputs, including zero-scale and same-row add', () => {
  const m = parseMatrix('1 1 5;2 -1 1'), before = JSON.stringify(m);
  for (const op of [null,{kind:'scale',target:0,factor:'0'},{kind:'scale',target:0,factor:'1/0'},{kind:'add',target:0,source:0,factor:'1'},{kind:'swap',target:0,source:2},{kind:'add',target:0.1,source:1,factor:'1'},{kind:'delete',target:0}]) {
    assert.throws(()=>applyOperation(m,op)); assert.equal(JSON.stringify(m),before);
  }
});
test('text, token and exact integer limits have explicit boundaries', () => {
  const text='1 1 2;1 -1 0', exact=text+' '.repeat(LIMITS.text-text.length);
  assert.deepEqual(parseMatrix(exact),parseMatrix(text)); assert.throws(()=>parseMatrix(exact+' '));
  assert.equal(parseMatrix('0'.repeat(40)+' 1 2;1 -1 0')[0][0],'0'); assert.throws(()=>parseMatrix('0'.repeat(41)+' 1 2;1 -1 0'));
  const max=((1n<<128n)-1n).toString(), beyond=(1n<<128n).toString();
  const m=parseMatrix(max+' 0 0;0 1 0'); assert.equal(m[0][0],max);
  assert.throws(()=>parseMatrix(beyond+' 0 0;0 1 0'));
  const before=JSON.stringify(m); assert.throws(()=>applyOperation(m,{kind:'scale',target:0,factor:'2'})); assert.equal(JSON.stringify(m),before);
});
test('canonical long fractions remain usable across later operations', () => {
  const m=parseMatrix('100000000000000000003 1 2;1 1 2');
  const next=applyOperation(m,{kind:'scale',target:0,factor:'1/100000000000000000019'});
  assert(next[0][0].length>40);
  assert.deepEqual(applyOperation(next,{kind:'scale',target:0,factor:'100000000000000000019'}),m);
});
test('original twelve-question deck passes the unchanged importer', async () => {
  const text=await readFile(new URL('../courses/gaussian-elimination.json',import.meta.url),'utf8');
  const deck=parseDeck(text); assert.equal(deck.items.length,12); assert.equal(deck.concepts.length,4);
  assert.deepEqual(deck.concepts.map(c=>deck.items.filter(i=>i.concept===c).length),[3,3,3,3]);
  assert(Object.isFrozen(deck)); assert(deck.items.every(i=>i.transfer.length>40 && i.explanation.length>80));
});
test('generated document embeds exact downloads and has no remote runtime dependencies', async () => {
  const root=new URL('../',import.meta.url), html=await readFile(new URL('courses/gaussian-elimination-explorer.html',root),'utf8');
  const deck=await readFile(new URL('courses/gaussian-elimination.json',root),'utf8'), guide=await readFile(new URL('courses/gaussian-elimination.md',root),'utf8');
  const get=name=>JSON.parse(html.match(new RegExp('const '+name+' = (.*);'))[1]);
  assert.equal(get('DECK_TEXT'),deck); assert.equal(get('GUIDE_TEXT'),guide);
  assert(!/<(?:script|link)[^>]+(?:src|href)=["']https?:/i.test(html)); assert(!/\b(?:fetch|XMLHttpRequest|localStorage|sessionStorage)\s*[.(]/.test(html));
  assert(!html.includes('@@SCRIPT@@'));
});

test('generated long factors reduce and replay exactly while typed factors stay bounded', () => {
  const max=((1n<<128n)-1n).toString();
  for (const matrix of [
    [[max,'0','0'],['0','1','0']],
    [['1','1/1000000000039','0'],['1/1000000000061','1','0']],
  ]) {
    const before=JSON.stringify(matrix), result=analyze(matrix);
    assert.deepEqual(result.rref,[['1','0','0'],['0','1','0']]);
    assert.deepEqual(result.particular,['0','0']); certify(matrix,result);
    assert(result.steps.some(step=>step.operation.factor?.length>40));
    let current=matrix;
    for (const step of result.steps) {
      if (step.operation.factor?.length>40) assert.throws(()=>applyOperation(current,step.operation));
      current=replayOperation(current,step.operation); assert.deepEqual(current,step.matrix);
    }
    assert.deepEqual(current,result.rref); assert.equal(JSON.stringify(matrix),before);
  }
});
test('sparse rows and cells are refused by every matrix entrypoint', () => {
  for (const hole of ['row','cell']) {
    const matrix=[['1','0','0'],['0','1','0']];
    if (hole==='row') delete matrix[1]; else delete matrix[0][0];
    const before=Object.getOwnPropertyDescriptors(matrix);
    assert.throws(()=>analyze(matrix));
    assert.throws(()=>applyOperation(matrix,{kind:'scale',target:0,factor:'1'}));
    assert.throws(()=>replayOperation(matrix,{kind:'scale',target:0,factor:'1'}));
    assert.deepEqual(Object.getOwnPropertyDescriptors(matrix),before);
  }
});
test('exact replay still rejects zero scale, noncanonical factors and over128 values', () => {
  const matrix=parseMatrix('1 0 0;0 1 0'),before=JSON.stringify(matrix);
  for (const factor of ['0','2/2','+1','1/-2',(1n<<128n).toString(),'1/'.padEnd(81,'1')])
    assert.throws(()=>replayOperation(matrix,{kind:'scale',target:0,factor}));
  assert.deepEqual(replayOperation(matrix,{kind:'scale',target:0,factor:'-1/2'}),[['-1/2','0','0'],['0','1','0']]);
  assert.equal(JSON.stringify(matrix),before);
});
