import test from 'node:test';
import assert from 'node:assert/strict';
import { traceStableMatching, inspectMatching, listCompleteMatchings } from '../src/stable-matching.mjs';

const provisional = { leftPreferences: [[0,1,2],[0,1,2],[1,0,2]], rightPreferences: [[1,0,2],[0,2,1],[0,1,2]], proposingSide: 'left' };
const two = { leftPreferences: [[0,1],[1,0]], rightPreferences: [[1,0],[0,1]], proposingSide: 'left' };
function assertFrozen(value) {
  if (value && typeof value === 'object') {
    assert(Object.isFrozen(value));
    Object.values(value).forEach(assertFrozen);
  }
}
function directStable(profile, matching) {
  const inverse = matching.map((_, right) => matching.indexOf(right));
  return !profile.leftPreferences.some((row, left) => row.some(right =>
    row.indexOf(right) < row.indexOf(matching[left]) &&
    profile.rightPreferences[right].indexOf(left) < profile.rightPreferences[right].indexOf(inverse[right])));
}
function checkTrace(profile) {
  const trace = traceStableMatching(profile), size = trace.size;
  const leftProposes = profile.proposingSide === 'left';
  const proposals = new Set(), received = Array.from({ length: size }, () => []);
  const cursors = Array(size).fill(0);
  const preferences = leftProposes ? profile.leftPreferences : profile.rightPreferences;
  const receiverPreferences = leftProposes ? profile.rightPreferences : profile.leftPreferences;
  assert.equal(trace.states.length, trace.proposalCount + 1);
  assert(trace.proposalCount <= size * size);
  for (const [step, state] of trace.states.entries()) {
    assert.equal(state.step, step);
    assert.equal(new Set(state.leftMatching.filter(value => value !== null)).size, state.leftMatching.filter(value => value !== null).length);
    state.leftMatching.forEach((right, left) => { if (right !== null) assert.equal(state.rightMatching[right], left); });
    state.rightMatching.forEach((left, right) => { if (left !== null) assert.equal(state.leftMatching[left], right); });
    const proposerMatches = leftProposes ? state.leftMatching : state.rightMatching;
    assert.deepEqual(state.freeProposers, proposerMatches.flatMap((partner, i) => partner === null ? [i] : []));
    if (!step) {
      assert.equal(state.action, null);
      assert(state.leftMatching.every(value => value === null));
    } else {
      const action = state.action, previous = trace.states[step - 1];
      assert.equal(action.proposerIndex, previous.freeProposers[0]);
      assert.equal(action.receiverIndex, preferences[action.proposerIndex][cursors[action.proposerIndex]]);
      const id = action.proposerIndex + ':' + action.receiverIndex;
      assert(!proposals.has(id)); proposals.add(id);
      received[action.receiverIndex].push(action.proposerIndex);
      cursors[action.proposerIndex]++;
    }
    assert.deepEqual(state.nextChoiceIndices, cursors);
    const receiverMatches = leftProposes ? state.rightMatching : state.leftMatching;
    received.forEach((incoming, receiver) => {
      const best = receiverPreferences[receiver].find(proposer => incoming.includes(proposer));
      assert.equal(receiverMatches[receiver], best === undefined ? null : best);
    });
  }
  assert(directStable(profile, trace.final.leftMatching));
  assert(trace.final.leftMatching.every(value => value !== null));
  assert.equal(trace.proposerOptimal, true);
  for (const matching of trace.matchings) assert.equal(matching.stable, directStable(profile, matching.leftMatching));
  const stable = trace.matchings.filter(matching => directStable(profile, matching.leftMatching));
  for (let i = 0; i < size; i++) {
    const rankKey = leftProposes ? 'leftRanks' : 'rightRanks';
    assert.equal(trace.final[rankKey][i], Math.min(...stable.map(matching => matching[rankKey][i])));
  }
  return trace;
}

test('a worked proposal sequence preserves replacements, rejections and exact final ranks', () => {
  const trace = checkTrace(provisional);
  assert.deepEqual(trace.states.slice(1).map(state => [state.action.proposerIndex, state.action.receiverIndex, state.action.decision]),
    [[0,0,'hold'],[1,0,'replace'],[0,1,'hold'],[2,1,'reject'],[2,0,'reject'],[2,2,'hold']]);
  assert.equal(trace.states[2].action.displacedProposerIndex, 0);
  assert.deepEqual(trace.states[2].freeProposers, [0,2]);
  assert.deepEqual(trace.final.leftMatching, [1,0,2]);
  assert.deepEqual(trace.final.leftRanks, [2,1,3]);
  assert.deepEqual(trace.final.rightRanks, [1,1,3]);
});

test('blocking witnesses require both strict improvements and preserve exact identities', () => {
  const profile = {leftPreferences:[[0,1],[0,1]],rightPreferences:[[1,0],[0,1]],proposingSide:'left'};
  const unstable = inspectMatching(profile, [0,1]);
  assert.equal(unstable.stable, false);
  assert.deepEqual(unstable.blockingPairs, [{left:1,right:0,leftCurrentPartner:1,rightCurrentPartner:0,leftCurrentRank:2,leftAlternativeRank:1,rightCurrentRank:2,rightAlternativeRank:1}]);
  assert.equal(inspectMatching(profile, [1,0]).stable, true);
  assert.deepEqual(listCompleteMatchings(profile).map(matching => matching.leftMatching), [[0,1],[1,0]]);
});

test('the proposing side chooses different stable outcomes for one unchanged preference profile', () => {
  const left = checkTrace(two), right = checkTrace({...two,proposingSide:'right'});
  assert.deepEqual(left.final.leftMatching, [0,1]);
  assert.deepEqual(right.final.leftMatching, [1,0]);
  assert.deepEqual(left.stableMatchingIndices, [0,1]);
  assert.deepEqual(right.stableMatchingIndices, [0,1]);
  assert.deepEqual(left.final.leftRanks, [1,1]);
  assert.deepEqual(right.final.rightRanks, [1,1]);
});

test('every two-person strict preference profile satisfies proposal and stability invariants on both sides', () => {
  for (let mask = 0; mask < 16; mask++) {
    const rows = Array.from({length:4}, (_, index) => mask & (1 << index) ? [1,0] : [0,1]);
    for (const proposingSide of ['left','right']) checkTrace({leftPreferences:rows.slice(0,2),rightPreferences:rows.slice(2),proposingSide});
  }
});

test('four-person shared preferences finish in ten proposals with all24 alternatives enumerated', () => {
  const profile = {leftPreferences:Array.from({length:4},()=>[0,1,2,3]),rightPreferences:Array.from({length:4},()=>[3,2,1,0]),proposingSide:'left'};
  const trace = checkTrace(profile);
  assert.equal(trace.proposalCount, 10);
  assert.equal(trace.matchings.length, 24);
  assert.deepEqual(trace.final.leftMatching, [3,2,1,0]);
  assert.deepEqual(trace.matchings[0].leftMatching, [0,1,2,3]);
  assert.deepEqual(trace.matchings.at(-1).leftMatching, [3,2,1,0]);
  checkTrace({...profile,proposingSide:'right'});
});

test('one participant on each side yields one complete stable matching', () => {
  for (const proposingSide of ['left','right']) {
    const trace = checkTrace({leftPreferences:[[0]],rightPreferences:[[0]],proposingSide});
    assert.equal(trace.proposalCount, 1); assert.equal(trace.matchings.length, 1);
    assert.deepEqual(trace.final.leftRanks, [1]); assert.deepEqual(trace.final.rightRanks, [1]);
  }
});

test('strict input admission refuses incomplete, duplicate, sparse, coerced and unsupported profiles', () => {
  const bad = [
    null, [], {}, {...two,proposingSide:'either'}, {...two,proposingSide:undefined},
    {...two,extra:1}, {...two,leftPreferences:[]},
    {...two,rightPreferences:[[0]]},
    {...two,leftPreferences:[[0,0],[1,0]]},
    {...two,leftPreferences:[['0',1],[1,0]]},
    {...two,leftPreferences:[[false,1],[1,0]]},
    {...two,leftPreferences:[[0.5,1],[1,0]]},
    {...two,leftPreferences:[[NaN,1],[1,0]]},
    {...two,leftPreferences:[[Infinity,1],[1,0]]},
    {...two,leftPreferences:[[0,,],[1,0]]},
    {...two,leftPreferences:[,[1,0]]},
    {...two,leftPreferences:Array.from({length:5},()=>[0,1,2,3,4]),rightPreferences:Array.from({length:5},()=>[0,1,2,3,4])}
  ];
  const accessor = {...two}; Object.defineProperty(accessor,'proposingSide',{get(){throw new Error('must not invoke accessor');},enumerable:true});
  bad.push(accessor);
  const extraRow = [0,1]; extraRow.note = 'extra';
  bad.push({...two,leftPreferences:[extraRow,[1,0]]});
  for (const profile of bad) {
    assert.throws(()=>traceStableMatching(profile));
    assert.throws(()=>listCompleteMatchings(profile));
    assert.throws(()=>inspectMatching(profile,[0,1]));
  }
  for (const matching of [[0,0],[0],['0',1],[false,1],[0,2],[0,,]]) assert.throws(()=>inspectMatching(two,matching));
});

test('public results are detached, deeply frozen and exactly JSON-safe', () => {
  const input = structuredClone(provisional), before = structuredClone(input);
  const trace = traceStableMatching(input), matching = inspectMatching(input,[0,1,2]), all = listCompleteMatchings(input);
  assert.deepEqual(input,before);
  for (const result of [trace,matching,all]) {
    assertFrozen(result); assert.deepEqual(JSON.parse(JSON.stringify(result)),result);
  }
  input.leftPreferences[0].reverse();
  assert.deepEqual(trace.profile,before);
  assert.throws(()=>{trace.states[1].leftMatching[0]=2;}, TypeError);
  assert.throws(()=>trace.matchings.push(matching), TypeError);
});

test('signed-zero numeric indices are refused so every admitted result has an exact JSON roundtrip', () => {
  for (const profile of [
    {leftPreferences:[[-0,1],[1,0]],rightPreferences:[[0,1],[1,0]],proposingSide:'left'},
    {leftPreferences:[[0,1],[1,0]],rightPreferences:[[-0,1],[1,0]],proposingSide:'right'}
  ]) {
    assert.throws(()=>traceStableMatching(profile), TypeError);
    assert.throws(()=>listCompleteMatchings(profile), TypeError);
    assert.throws(()=>inspectMatching(profile,[0,1]), TypeError);
  }
  assert.throws(()=>inspectMatching(two,[-0,1]), TypeError);
  assert.equal(listCompleteMatchings(two).length,2);
});
