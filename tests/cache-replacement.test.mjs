import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Script } from 'node:vm';
import { analyzeCacheTrace, parseReferenceText } from '../courses/cache-replacement-core.mjs';
import { parseDeck } from '../src/deck.mjs';
import { checkDraft, draftFromDeck } from '../src/deck-author.mjs';
import { initialMastery, selectNextItem, updateMastery } from '../src/knowledge.mjs';
import { createReview, beginPractice, currentPracticeItem, answerPractice } from '../src/review.mjs';
import { readCacheReplacementInputs, renderCacheReplacement } from '../tools/build-cache-replacement.mjs';

const compare = (text, capacity = 2) => analyzeCacheTrace({ references: parseReferenceText(text), capacity });
const compact = policy => policy.steps.map(({ request, before, hit, evicted, after, hits, misses }) =>
  [request, before.join(''), hit, evicted, after.join(''), hits, misses]);
const inputFiles = await readCacheReplacementInputs();
const course = parseDeck(inputFiles.courseText);

test('literal text grammar keeps letters, digits and request multiplicity', () => {
  assert.deepEqual(parseReferenceText(' A,1,\nA\t H , 8 '), ['A','1','A','H','8']);
  assert.deepEqual(parseReferenceText(', ,\n'), []);
  assert.deepEqual(parseReferenceText(''), []);
  assert.equal(Object.isFrozen(parseReferenceText('A')), true);
});

test('text refuses ambiguous tokens, case conversion and bounded overflows', () => {
  for (const value of ['AB', '12', 'a', '0', '9', 'I', 'A;B', 'A/B', 'A\u200bB', ['A'], null,
    ' '.repeat(513), Array(25).fill('A').join(' ')]) assert.throws(() => parseReferenceText(value));
  assert.equal(parseReferenceText(Array(24).fill('A').join(',')).length, 24);
  assert.deepEqual(parseReferenceText(' '.repeat(511) + 'A'), ['A']);
});

test('core rejects unsupported capacity and unexpected outer fields', () => {
  for (const capacity of [0,6,-1,2.5,'2',NaN,Infinity,null]) {
    assert.throws(() => analyzeCacheTrace({ references:['A'], capacity }));
  }
  for (const value of [null, [], {}, {references:[]}, {capacity:2},
    {references:[],capacity:2,extra:true}, new Date()]) assert.throws(() => analyzeCacheTrace(value));
  const symbol = {references:[],capacity:2}; symbol[Symbol('unknown')] = 1;
  assert.throws(() => analyzeCacheTrace(symbol));
  const hidden = {references:[],capacity:2}; Object.defineProperty(hidden, 'hidden', {value:true});
  assert.throws(() => analyzeCacheTrace(hidden));
  assert.deepEqual(analyzeCacheTrace(Object.assign(Object.create(null), {references:[],capacity:1})).input,
    {references:[],capacity:1});
});

test('core refuses sparse arrays, attached metadata and nonliteral page values', () => {
  const withProperty = ['A']; withProperty.note = 'not a request';
  const withSymbol = ['A']; withSymbol[Symbol('note')] = true;
  for (const references of [new Array(1), withProperty, withSymbol, 'A', [1], ['a'], ['AA'], [null],
    [...Array(25)].map(() => 'A')]) assert.throws(() => analyzeCacheTrace({references,capacity:2}));
});

test('FIFO complete trace keeps insertion order on a hit', () => {
  assert.deepEqual(compact(compare('A B A C B').policies.fifo), [
    ['A','',false,null,'A',0,1],
    ['B','A',false,null,'AB',0,2],
    ['A','AB',true,null,'AB',1,2],
    ['C','AB',false,'A','BC',1,3],
    ['B','BC',true,null,'BC',2,3]
  ]);
});

test('LRU complete trace refreshes recency and can lose this fixed comparison', () => {
  const result = compare('A B A C B');
  assert.deepEqual(compact(result.policies.lru), [
    ['A','',false,null,'A',0,1],
    ['B','A',false,null,'AB',0,2],
    ['A','AB',true,null,'BA',1,2],
    ['C','BA',false,'B','AC',1,3],
    ['B','AC',false,'A','CB',1,4]
  ]);
  assert.equal(result.policies.fifo.totals.misses,3);
  assert.equal(result.policies.lru.totals.misses,4);
  const changedLastRequest = compare('A B A C A');
  assert.equal(changedLastRequest.policies.fifo.totals.misses,4);
  assert.equal(changedLastRequest.policies.lru.totals.misses,3);
});

test('the classic FIFO anomaly retains exact miss positions and capacity totals', () => {
  const result = compare('1 2 3 4 1 2 5 1 2 3 4 5',3);
  assert.deepEqual(result.policies.fifo.steps.filter(step => !step.hit).map(step => step.step), [1,2,3,4,5,6,7,10,11]);
  assert.deepEqual(compare('1 2 3 4 1 2 5 1 2 3 4 5',4).policies.fifo.steps.filter(step => !step.hit).map(step => step.step),
    [1,2,3,4,7,8,9,10,11,12]);
  assert.deepEqual(result.capacityComparison, [
    {capacity:1,fifoMisses:12,lruMisses:12}, {capacity:2,fifoMisses:12,lruMisses:12},
    {capacity:3,fifoMisses:9,lruMisses:10}, {capacity:4,fifoMisses:10,lruMisses:8},
    {capacity:5,fifoMisses:5,lruMisses:5}
  ]);
});

test('literal identity, capacity one and a loop that fits retain first-access misses', () => {
  for (const policy of ['fifo','lru']) {
    assert.deepEqual(compare('A 1 A').policies[policy].totals, {requests:3,hits:1,misses:2});
    assert.deepEqual(compare('B B B',1).policies[policy].totals, {requests:3,hits:2,misses:1});
    assert.equal(compare('A B C D A B C D',3).policies[policy].totals.misses,8);
    assert.equal(compare('A B C D A B C D',4).policies[policy].totals.misses,4);
  }
});

test('empty input produces zero counts without a manufactured percentage', () => {
  const result = compare('',5);
  for (const policy of Object.values(result.policies)) {
    assert.deepEqual(policy.initial,[]);
    assert.deepEqual(policy.steps,[]);
    assert.deepEqual(policy.totals,{requests:0,hits:0,misses:0});
  }
  assert.deepEqual(result.capacityComparison.map(row => [row.fifoMisses,row.lruMisses]), [[0,0],[0,0],[0,0],[0,0],[0,0]]);
  assert.doesNotMatch(JSON.stringify(result), /null|rate|NaN|Infinity/);
});

test('caller mutations cannot change retained input, earlier steps or totals', () => {
  const references = ['A','B','A','C'];
  const input = {references,capacity:2};
  const result = analyzeCacheTrace(input);
  const snapshot = JSON.stringify(result);
  references[0] = 'H'; references.push('8'); input.capacity = 5;
  assert.equal(JSON.stringify(result),snapshot);
  assert.notEqual(result.input.references,references);
  assert.notEqual(result.policies.fifo.steps[1].after,result.policies.fifo.steps[2].before);
});

test('every reachable result object is frozen and mutation attempts fail', () => {
  const result = compare('A B A C B');
  const visit = value => {
    if (!value || typeof value !== 'object') return;
    assert.equal(Object.isFrozen(value),true);
    for (const child of Object.values(value)) visit(child);
  };
  visit(result);
  assert.throws(() => result.input.references.push('D'), TypeError);
  assert.throws(() => { result.policies.lru.steps[0].after[0] = 'D'; }, TypeError);
  assert.throws(() => { result.capacityComparison[0].lruMisses = 0; }, TypeError);
});

test('retained prefixes agree with fresh empty-start runs at each selected capacity', () => {
  for (const text of ['A B A C B','A 1 H 8 A 1 B 8','A B C D A B C D','']) {
    const references = parseReferenceText(text);
    for (let capacity=1; capacity<=5; capacity++) {
      const result = analyzeCacheTrace({references,capacity});
      for (let length=0; length<=references.length; length++) {
        const prefix = analyzeCacheTrace({references:references.slice(0,length),capacity});
        for (const policy of ['fifo','lru']) {
          assert.deepEqual(result.policies[policy].steps.slice(0,length),prefix.policies[policy].steps);
        }
      }
    }
  }
});

test('state transitions conserve requests, slots and resident page identity', () => {
  for (let capacity=1; capacity<=5; capacity++) {
    const result = compare('A B A C 1 H 1 8 A H B 8',capacity);
    for (const policy of Object.values(result.policies)) for (const step of policy.steps) {
      assert.equal(step.hits + step.misses,step.step);
      assert.equal(new Set(step.after).size,step.after.length);
      assert.ok(step.after.length <= capacity);
      assert.ok(step.after.includes(step.request));
      assert.equal(step.hit,step.before.includes(step.request));
      if (step.hit || step.before.length < capacity) assert.equal(step.evicted,null);
      else {
        assert.ok(step.before.includes(step.evicted));
        assert.ok(!step.after.includes(step.evicted));
      }
    }
  }
});

test('course is admitted by the unchanged importer and exact authoring round trip', () => {
  assert.equal(course.title,'Cache decisions: FIFO, LRU and capacity');
  assert.equal(course.items.length,12); assert.equal(course.concepts.length,4);
  const roundTrip = checkDraft(draftFromDeck(course));
  assert.equal(roundTrip.ok,true);
  assert.deepEqual(roundTrip.deck,course);
  assert.deepEqual(parseDeck(roundTrip.json),course);
  assert.match(course.attribution,/Arpaci-Dusseau/);
  assert.match(course.attribution,/Bélády/);
  assert.match(course.license,/CC0-1.0/);
});

test('course keeps its independently solved answer map and unique concept coverage', () => {
  assert.deepEqual(course.items.map(item => item.id), [
    'cache-count-hits','cache-resident-not-seen','cache-literal-identity','cache-lru-refresh',
    'cache-fifo-hit-order','cache-policy-counterexample','cache-fifo-anomaly','cache-lru-inclusion',
    'cache-loop-fits','cache-prefix-reading','cache-empty-rate','cache-counts-not-timing'
  ]);
  assert.deepEqual(course.items.map(item => item.answer),[1,2,3,0,2,2,1,1,2,0,3,0]);
  assert.deepEqual(new Set(course.items.map(item => item.concept)),new Set(course.concepts));
  for (const item of course.items) {
    assert.equal(item.options.length,4);
    assert.ok(item.explanation.length > 100); assert.ok(item.transfer.length > 80);
  }
});

test('the real learner selector exhausts this deck once and preserves first tries during practice', () => {
  const mastery = initialMastery(course.concepts), asked = new Set(), answers = [];
  while (asked.size < course.items.length) {
    const item = selectNextItem(course.items,asked,mastery);
    assert.ok(item); assert.equal(asked.has(item.id),false);
    const choice = answers.length % 3 === 0 ? (item.answer + 1) % item.options.length : item.answer;
    asked.add(item.id); answers.push({item:item.id,choice,correct:choice === item.answer});
    mastery[item.concept] = updateMastery(mastery[item.concept],choice === item.answer);
  }
  assert.equal(selectNextItem(course.items,asked,mastery),null);
  assert.equal(answers.length,12);
  assert.ok(Object.values(mastery).every(value => Number.isFinite(value) && value >= 0 && value <= 1));
  const review = createReview(course.items,answers);
  const before = JSON.stringify({answers,review,mastery});
  let round = beginPractice(review);
  assert.equal(round.items.length,4);
  while (currentPracticeItem(round)) {
    const item = currentPracticeItem(round);
    round = answerPractice(round,item.id,item.answer);
  }
  assert.equal(round.answers.length,4); assert.ok(round.answers.every(answer => answer.correct));
  assert.equal(JSON.stringify({answers,review,mastery}),before);
});

test('standalone generation is deterministic and the committed file is current', async () => {
  const expected = renderCacheReplacement(inputFiles);
  assert.equal(renderCacheReplacement(inputFiles),expected);
  assert.equal(await readFile(new URL('../courses/cache-replacement.html',import.meta.url),'utf8'),expected);
  assert.doesNotMatch(expected,/<(?:script|link)[^>]+(?:src=|rel="stylesheet")/);
  const runtime = expected.match(/<script id="cache-lab-runtime">\n([\s\S]*?)<\/script>/)?.[1];
  assert.ok(runtime);
  assert.doesNotThrow(() => new Script(runtime));
  assert.doesNotMatch(runtime,/^\s*(?:import|export)\b/m);
});

test('standalone course embedding preserves exact UTF-8 bytes and HTML-like lesson text', () => {
  const html = renderCacheReplacement(inputFiles);
  const embedded = html.match(/<script id="cache-course-source" type="application\/json">([\s\S]*?)<\/script>/)?.[1];
  assert.equal(JSON.parse(embedded),inputFiles.courseText);
  const altered = JSON.parse(inputFiles.courseText);
  altered.items[0].prompt += ' Literal </script> <tag> and \u2028 stay text.';
  const raw = JSON.stringify(altered,null,1) + '\n';
  const safe = renderCacheReplacement({...inputFiles,courseText:raw});
  const rawEmbedded = safe.match(/<script id="cache-course-source" type="application\/json">([\s\S]*?)<\/script>/)?.[1];
  assert.equal(JSON.parse(rawEmbedded),raw);
  assert.doesNotMatch(rawEmbedded,/<|[\u2028\u2029]/);
  assert.equal((safe.match(/id="cache-lab-runtime"/g)||[]).length,1);
});

test('builder fails closed when template or source import boundaries change', () => {
  assert.throws(() => renderCacheReplacement({...inputFiles,template:inputFiles.template.replace('cache-replacement-entry.mjs','unknown.mjs')}));
  assert.throws(() => renderCacheReplacement({...inputFiles,uiModule:inputFiles.uiModule + "\nimport './unknown.mjs';\n"}));
  assert.throws(() => renderCacheReplacement({...inputFiles,coreModule:inputFiles.coreModule + "\n// </script>\n"}));
  assert.throws(() => renderCacheReplacement({...inputFiles,css:inputFiles.css + '\n</style>'}));
  assert.throws(() => renderCacheReplacement({...inputFiles,courseText:'{}'}));
});
