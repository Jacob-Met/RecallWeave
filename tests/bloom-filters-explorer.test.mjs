import test from 'node:test';
import assert from 'node:assert/strict';
import { BLOOM_KEYS, makeBloomState, bloomBits, queryBloom, fixedBloomExperiment,
  previewBloomDeletion, randomTwoBitExperiment } from '../src/bloom-filters.mjs';

const reference = {A:[1,4], B:[4,6], C:[4,4], D:[4,1], X:[1,6], Y:[3,6], Z:[2,2]};
const refBits = keys => {
  const cells = Array(8).fill(0);
  for (const key of keys) for (const position of reference[key]) cells[position] = 1;
  return cells;
};

test('declared mappings and the worked state retain exact members separately from shared bits', () => {
  assert.deepEqual(Object.fromEntries(BLOOM_KEYS.map(({key,positions}) => [key,positions])), reference);
  const input = ['B','A','A'], state = makeBloomState(input);
  assert.deepEqual(input, ['B','A','A']);
  assert.deepEqual(state.members, ['A','B']);
  assert.deepEqual(bloomBits(state.mask), [0,1,0,0,1,0,1,0]);
  assert.equal(queryBloom(state.mask,state.members,'X').classification, 'false-positive');
  assert.equal(queryBloom(state.mask,state.members,'Y').classification, 'true-negative');
  assert.equal(queryBloom(state.mask,state.members,'B').classification, 'true-positive');
  assert.equal(makeBloomState(['A']).mask, makeBloomState(['A','D']).mask);
  assert.equal(makeBloomState(['Z']).mask, 4);
  assert.ok(Object.isFrozen(state) && Object.isFrozen(state.members));
  assert.ok(Object.isFrozen(queryBloom(state.mask,state.members,'X').probes[0]));
});

test('all 128 toy subsets agree with a separately constructed cell-array oracle', () => {
  const keys = Object.keys(reference);
  for (let subset = 0; subset < 128; subset++) {
    const selected = keys.filter((_, index) => subset & (1 << index));
    const cells = refBits(selected), state = makeBloomState(selected);
    assert.deepEqual(bloomBits(state.mask), cells);
    assert.deepEqual(makeBloomState([...selected,...selected]), state);
    for (const key of keys) {
      const result = queryBloom(state.mask,state.members,key);
      const pass = reference[key].every(position => cells[position] === 1);
      assert.equal(result.maybe, pass);
      assert.equal(result.present, selected.includes(key));
      if (result.present) assert.equal(result.classification, 'true-positive');
      else assert.equal(result.classification, pass ? 'false-positive' : 'true-negative');
    }
  }
});

test('deletion preview leaves the original untouched and rebuilding preserves every remaining member', () => {
  const keys=['A','B'], state=makeBloomState(keys);
  const preview=previewBloomDeletion(keys,'A');
  assert.equal(preview.unsafeMask, 64);
  assert.equal(preview.rebuilt.mask, 80);
  assert.deepEqual(preview.missed, ['B']);
  assert.equal(queryBloom(preview.unsafeMask,preview.remaining,'B').classification, 'false-negative');
  assert.deepEqual(makeBloomState(keys), state);
  for (let subset=1;subset<128;subset++) {
    const selected=Object.keys(reference).filter((_,i)=>subset & (1<<i));
    for (const removed of selected) {
      const p=previewBloomDeletion(selected,removed);
      assert.deepEqual(bloomBits(p.rebuilt.mask),refBits(selected.filter(key=>key!==removed)));
      for (const key of p.remaining) assert.equal(queryBloom(p.rebuilt.mask,p.remaining,key).classification,'true-positive');
    }
  }
  assert.throws(()=>previewBloomDeletion(['A'],'B'),RangeError);
});

test('every eight-bit state has exactly s squared accepted ordered query pairs including repeats', () => {
  for (let mask=0;mask<256;mask++) {
    const experiment=fixedBloomExperiment(mask);
    const positions=mask.toString(2).replaceAll('0','').length;
    assert.equal(experiment.setBits,positions);
    assert.equal(experiment.accepted,positions**2);
    assert.equal(experiment.total,64);
    assert.equal(new Set(experiment.pairs.map(p=>p.first+','+p.second)).size,64);
    assert.equal(experiment.pairs.filter(p=>p.first===p.second && p.accepted).length,positions);
  }
  assert.equal(fixedBloomExperiment(makeBloomState(['A','B']).mask).accepted,9);
  assert.equal(fixedBloomExperiment(255).accepted,64);
  assert.equal(fixedBloomExperiment(0).accepted,0);
});

test('the separate four-draw model has ten accepted outcomes, not the square of mean occupancy', () => {
  const experiment=randomTwoBitExperiment();
  let passed=0;
  const byInsertion={};
  for (let code=0;code<16;code++) {
    const [a,b,q,r]=[0,1,2,3].map(bit=>(code>>bit)&1);
    const occupied=new Set([a,b]);
    const accepted=occupied.has(q)&&occupied.has(r);
    if (accepted) passed++;
    byInsertion[''+a+b]=(byInsertion[''+a+b]||0)+Number(accepted);
  }
  assert.equal(passed,10);
  assert.equal(experiment.accepted,passed);
  assert.equal(experiment.total,16);
  assert.deepEqual(experiment.rows.map(row=>row.accepted),[1,4,4,1]);
  for (const row of experiment.rows) assert.equal(row.accepted,byInsertion[row.insertion.join('')]);
  assert.equal(experiment.meanSetFraction,3/4);
  assert.equal(experiment.meanSetFraction**2,9/16);
  assert.notEqual(experiment.accepted/experiment.total,experiment.meanSetFraction**2);
  assert.ok(Object.isFrozen(experiment.rows[0].queryPairs[0]));
});

test('invalid toy inputs are refused without mutating valid caller data', () => {
  for (const value of [-1,256,0.5,NaN,Infinity,'82',true,null]) {
    assert.throws(()=>bloomBits(value),RangeError);
    assert.throws(()=>fixedBloomExperiment(value),RangeError);
  }
  for (const value of [null,'A',{},Array(129).fill('A')]) assert.throws(()=>makeBloomState(value),TypeError);
  for (const value of [['unknown'],[null],[0],Array(1)]) assert.throws(()=>makeBloomState(value),RangeError);
  const list=Object.freeze(['A','B']);
  assert.deepEqual(makeBloomState(list).members,list);
  assert.throws(()=>queryBloom(82,list,'unknown'),RangeError);
  assert.deepEqual(list,['A','B']);
});
