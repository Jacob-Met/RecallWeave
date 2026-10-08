import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const defaultActivities = [
  {id:'A', start:0, end:3, value:4}, {id:'B', start:1, end:4, value:5},
  {id:'C', start:3, end:5, value:4}, {id:'D', start:0, end:6, value:10},
  {id:'E', start:5, end:7, value:4}, {id:'F', start:6, end:8, value:5},
];
const compare = (a, b) => a.end - b.end || a.start - b.start ||
  (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const compatible = (a, b) => a.end <= b.start || b.end <= a.start;
const digest = value => createHash('sha256').update(value).digest('hex');

// Independent reference: enumerate subsets and compare every selected pair.
// Ascending mask order implements exclusion of the latest ordered row on ties.
function enumerate(ordered) {
  let value = 0, mask = 0;
  for (let candidate = 1; candidate < 2 ** ordered.length; candidate++) {
    const selected = ordered.filter((_, index) => candidate & (1 << index));
    let feasible = true;
    for (let a = 0; a < selected.length; a++) {
      for (let b = a + 1; b < selected.length; b++) {
        if (!compatible(selected[a], selected[b])) feasible = false;
      }
    }
    if (!feasible) continue;
    const total = selected.reduce((sum, activity) => sum + activity.value, 0);
    if (total > value) { value = total; mask = candidate; }
  }
  return {value, mask};
}

function reference(activities) {
  const ordered = activities.map(activity => ({...activity})).sort(compare);
  const prefix = Array.from({length:ordered.length + 1}, (_, j) => enumerate(ordered.slice(0, j)));
  const rows = [{j:0, id:null, p:0, take:0, skip:0, best:0, choice:'base'}];
  for (let j = 1; j <= ordered.length; j++) {
    const activity = ordered[j - 1];
    let p = 0;
    for (let i = 1; i < j; i++) if (ordered[i - 1].end <= activity.start) p = i;
    rows.push({j, id:activity.id, p, take:activity.value + prefix[p].value,
      skip:prefix[j - 1].value, best:prefix[j].value,
      choice:prefix[j].mask & (1 << (j - 1)) ? 'take' : 'skip'});
  }
  const best = prefix.at(-1);
  const selectedIds = ordered.filter((_, i) => best.mask & (1 << i)).map(activity => activity.id);
  const backtrack = [];
  for (let j = ordered.length; j > 0;) {
    const row = rows[j], next = row.choice === 'take' ? row.p : j - 1;
    backtrack.push({j, id:row.id, choice:row.choice, next});
    j = next;
  }
  const greedy = {selectedIds:[], value:0};
  let lastEnd = -Infinity;
  for (const activity of ordered) if (activity.start >= lastEnd) {
    greedy.selectedIds.push(activity.id);
    greedy.value += activity.value;
    lastEnd = activity.end;
  }
  return {ordered, rows, bestValue:best.value, selectedIds, backtrack, greedy};
}

function* fixtures() {
  yield ['default', defaultActivities];
  yield ['empty', []];
  yield ['all-zero', defaultActivities.map(activity => ({...activity, value:0}))];
  yield ['touching-maximum', Array.from({length:8}, (_, i) => ({id:String.fromCharCode(65+i), start:i*3, end:(i+1)*3, value:99}))];
  yield ['same-interval-code-unit-tie', ['Z','A_','A-','A0','A','B','A9','AA'].map(id => ({id, start:0, end:24, value:99}))];
  yield ['nested', Array.from({length:8}, (_, i) => ({id:String.fromCharCode(65+i), start:i, end:24-i, value:99-i}))];
  yield ['combination-ties-one', [{id:'A',start:0,end:2,value:2},{id:'B',start:2,end:4,value:2},{id:'C',start:0,end:4,value:4}]];
  yield ['equal-end-order', [{id:'L',start:2,end:6,value:9},{id:'E',start:0,end:6,value:9},{id:'P',start:0,end:2,value:1}]];
  yield ['id-boundary', [{id:'A_0-9ZXY',start:0,end:1,value:99}]];
  const intervals = [[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];
  // Each interval is absent or has value 0, 1, or 2: the complete 4^6 universe.
  for (let encoding = 0; encoding < 4 ** intervals.length; encoding++) {
    let code = encoding;
    const activities = [];
    for (let i = 0; i < intervals.length; i++) {
      const choice = code % 4; code = Math.floor(code / 4);
      if (choice) activities.push({id:String.fromCharCode(65+i), start:intervals[i][0], end:intervals[i][1], value:choice-1});
    }
    yield ['universe-' + encoding, activities];
    yield ['universe-reversed-' + encoding, [...activities].reverse()];
  }
  let state = 0x406d0fb0;
  const random = maximum => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state % maximum;
  };
  for (let trial = 0; trial < 64; trial++) {
    const activities = Array.from({length:8}, (_, index) => {
      const start = random(24);
      return {id:String.fromCharCode(65+index), start, end:start+1+random(24-start), value:random(100)};
    });
    yield ['eight-activity-' + trial, activities];
  }
}

function invalidFixtures() {
  const activity = {id:'A',start:0,end:1,value:1};
  const change = patch => [{...activity,...patch}];
  return [
    ['null',null], ['object',{}], ['string','[]'], ['row-null',[null]],
    ['nine-rows',Array.from({length:9}, (_, i) => ({...activity,id:String.fromCharCode(65+i)}))],
    ['duplicate-id',[activity,{...activity,start:2,end:3}]],
    ...['','a',' A','A ','0A','A.B','É','A00000000'].map(id => ['id-'+JSON.stringify(id),change({id})]),
    ['missing-id',[{start:0,end:1,value:1}]], ['missing-start',[{id:'A',end:1,value:1}]],
    ['missing-end',[{id:'A',start:0,value:1}]], ['missing-value',[{id:'A',start:0,end:1}]],
    ...['start','end','value'].flatMap(field => [null,'1',true,0.5,NaN,Infinity].map(value => [field+'-'+String(value),change({[field]:value})])),
    ['start-negative',change({start:-1})], ['end-over-bound',change({end:25})],
    ['zero-duration',change({end:0})], ['reverse-duration',change({start:2})],
    ['value-negative',change({value:-1})], ['value-over-bound',change({value:100})],
  ];
}

const self = reference(defaultActivities);
assert.equal(self.bestValue, 15);
assert.deepEqual(self.selectedIds, ['D','F']);
assert.equal(self.greedy.value, 12);
assert.deepEqual(self.greedy.selectedIds, ['A','C','E']);
assert.deepEqual(reference(defaultActivities.map(activity => ({...activity,value:0}))).selectedIds, []);
assert.deepEqual(reference([{id:'A',start:0,end:2,value:2},{id:'B',start:2,end:4,value:2},{id:'C',start:0,end:4,value:4}]).selectedIds, ['C']);

const cliArgs = process.argv.slice(2);
if (cliArgs[0] === '--self-check') {
  console.log(JSON.stringify({status:'oracle-self-check-pass',validFixtures:[...fixtures()].length,invalidFixtures:invalidFixtures().length,default:self}));
} else {
  assert.equal(cliArgs.length, 2, 'Usage: node receive-math.mjs MODULE_PATH RECEIPT_PATH');
  const modulePath = resolve(cliArgs[0]), output = resolve(cliArgs[1]);
  const sourceBefore = await readFile(modulePath), oracleBefore = await readFile(fileURLToPath(import.meta.url));
  const {solveSchedule} = await import(pathToFileURL(modulePath));
  assert.equal(typeof solveSchedule, 'function');
  const receipt = {status:'running',module:modulePath,moduleSha256:digest(sourceBefore),oracleSha256:digest(oracleBefore),
    node:process.version,validCases:0,invalidCases:0,failures:[],fixtureUniverse:'4^6 absent/zero/one/two values on every nonempty interval in endpoints0..3; original/reversed order',
    reference:'Full feasible subset enumeration and pairwise interval tests; no dynamic recurrence computes the optimum.'};
  const observed = createHash('sha256');
  for (const [name, activities] of fixtures()) {
    try {
      const input = activities.map(activity => Object.freeze({...activity}));
      Object.freeze(input);
      const expected = reference(activities), actual = solveSchedule(input);
      assert.deepEqual(actual, expected);
      assert.deepEqual(input, activities, 'caller input remains unchanged');
      for (const row of actual.ordered) assert.notEqual(row, input.find(activity => activity.id === row.id), 'ordered rows are detached');
      observed.update(JSON.stringify({name,actual})+'\n');
      receipt.validCases++;
    } catch (error) {
      receipt.failures.push({name,activities,error:error.stack});
      break;
    }
  }
  if (!receipt.failures.length) for (const [name, activities] of invalidFixtures()) {
    try { assert.throws(() => solveSchedule(activities)); receipt.invalidCases++; }
    catch (error) { receipt.failures.push({name,activities,error:error.stack}); break; }
  }
  assert.deepEqual(await readFile(modulePath), sourceBefore, 'source changed during execution');
  assert.deepEqual(await readFile(fileURLToPath(import.meta.url)), oracleBefore, 'oracle changed during execution');
  receipt.resultDigest = observed.digest('hex');
  receipt.status = receipt.failures.length ? 'failed' : 'accepted';
  await writeFile(output, JSON.stringify(receipt,null,2)+'\n', {flag:'wx'});
  console.log(JSON.stringify(receipt));
  if (receipt.failures.length) process.exitCode = 1;
}
