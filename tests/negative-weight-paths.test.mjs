import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  validateNegativeGraph, parseNegativeGraph, analyzeNegativePaths, formatNegativePaths, MAX_GRAPH_BYTES
} from '../src/negative-weight-paths.mjs';
import { parseDeck } from '../src/deck.mjs';

const example = name => JSON.parse(readFileSync(new URL('../examples/negative-weight-paths/' + name + '.json', import.meta.url), 'utf8'));
const rows = report => report.rounds.map(round => report.graph.nodes.map(node => round.distances[node]));

test('negative edge without a cycle: exact edge-budget table and finite route', () => {
  const r = analyzeNegativePaths(example('finite'));
  assert.deepEqual(rows(r), [[0,null,null,null],[0,5,2,null],[0,5,1,null],[0,5,1,null],[0,5,1,null]]);
  assert.deepEqual(r.results.T, {status:'finite',distance:1,path:['S','A','T']});
  assert.deepEqual(r.results.X, {status:'unreachable',distance:null,path:null});
  assert.deepEqual(r.witnesses, []);
  assert.deepEqual(r.affected, []);
  const first = r.rounds[1].relaxations[2];
  assert.equal(first.sourceDistance, null);
  assert.equal(first.candidate, null);
  assert.equal(first.reason, 'unreached-source');
  assert.equal(r.rounds[2].relaxations[2].candidate, 1);
});
test('reachable and disconnected negative cycles: only forward influence is unbounded', () => {
  const r = analyzeNegativePaths(example('reachable-cycle'));
  assert.deepEqual(rows(r), [
    [0,null,null,null,null,null,null],[0,2,null,null,7,null,null],
    [0,2,-1,null,7,null,null],[0,0,-1,3,7,null,null],
    [0,0,-3,3,7,null,null],[0,-2,-3,1,7,null,null],
    [0,-2,-5,1,7,null,null],[0,-4,-5,-1,7,null,null]
  ]);
  assert.deepEqual(r.witnesses, ['A','T']);
  assert.deepEqual(r.affected, ['A','B','T']);
  for (const node of ['A','B','T']) assert.deepEqual(r.results[node], {status:'unbounded-below',distance:null,path:null});
  assert.deepEqual(r.results.U, {status:'finite',distance:7,path:['S','U']});
  assert.equal(r.results.S.distance, 0);
  for (const node of ['X','Y']) assert.equal(r.results[node].status, 'unreachable');
});
test('unreachable negative component is not a global graph rejection', () => {
  const r = analyzeNegativePaths(example('disconnected-cycle'));
  assert.deepEqual(rows(r), [[0,null,null,null],...[1,2,3,4].map(() => [0,3,null,null])]);
  assert.deepEqual(r.witnesses, []);
  assert.equal(r.results.T.distance, 3);
  assert.equal(r.results.X.status, 'unreachable');
});
test('one-vertex self-loop and a cycle returning to the source', () => {
  for (const weight of [-1,0,1]) {
    const r = analyzeNegativePaths({nodes:['S'],edges:[{from:'S',to:'S',weight}],source:'S'});
    assert.equal(r.rounds.length, 2);
    assert.equal(r.results.S.status, weight < 0 ? 'unbounded-below' : 'finite');
    assert.equal(r.results.S.distance, weight < 0 ? null : 0);
  }
  const graph = example('reachable-cycle');
  graph.edges.push({from:'B',to:'S',weight:0});
  const r = analyzeNegativePaths(graph);
  assert.deepEqual(r.affected, ['S','A','B','T','U']);
  assert.equal(r.results.X.status, 'unreachable');
});
test('equal candidates retain carry first, then declared-edge route; distances do not depend on edge order', () => {
  const g = {nodes:['S','A','B','T'],edges:[
    {from:'S',to:'B',weight:1},{from:'S',to:'A',weight:1},
    {from:'A',to:'T',weight:1},{from:'B',to:'T',weight:1}
  ],source:'S'};
  const a = analyzeNegativePaths(g);
  const b = analyzeNegativePaths({...g,edges:[...g.edges].reverse()});
  assert.deepEqual(a.results.T.path, ['S','A','T']);
  assert.deepEqual(b.results.T.path, ['S','B','T']);
  assert.deepEqual(rows(a), rows(b));
  const c = analyzeNegativePaths({...g,edges:[...g.edges,{from:'S',to:'T',weight:2}]});
  assert.deepEqual(c.results.T.path, ['S','T']);
});
test('zero-cost cycles keep finite results; all recorded walks are genuine and within their edge budgets', () => {
  const g = example('reachable-cycle');
  g.edges.find(edge => edge.from === 'B' && edge.to === 'A').weight = 3;
  const r = analyzeNegativePaths(g);
  assert.deepEqual(r.affected, []);
  assert.equal(r.results.T.distance, 3);
  for (const report of [r, analyzeNegativePaths(example('finite')), analyzeNegativePaths(example('reachable-cycle'))]) {
    for (const round of report.rounds) for (const node of report.graph.nodes) {
      const path = round.paths[node];
      if (path === null) { assert.equal(round.distances[node], null); continue; }
      assert.equal(path[0], report.source);
      assert.equal(path.at(-1), node);
      assert(path.length - 1 <= round.edgesAllowed);
      let cost = 0;
      for (let i = 1; i < path.length; i++) {
        const edge = report.graph.edges.find(edge => edge.from === path[i-1] && edge.to === path[i]);
        assert(edge);
        cost += edge.weight;
      }
      assert.equal(cost, round.distances[node]);
    }
  }
});
test('strict admission bounds and no hidden data access', () => {
  const g = example('finite');
  const bad = [
    null, [], {...g,extra:true}, {...g,source:'Z'}, {...g,nodes:[]},
    {...g,nodes:['S','S']}, {...g,nodes:['s']}, {...g,nodes:Array.from({length:8},(_,i)=>'N'+i)},
    {...g,edges:[{from:'S',to:'T',weight:1.5}]},
    {...g,edges:[{from:'S',to:'T',weight:-51}]},
    {...g,edges:[{from:'S',to:'T',weight:Infinity}]},
    {...g,edges:[{from:'S',to:'T',weight:'1'}]},
    {...g,edges:[{from:'S',to:'T',weight:1,extra:true}]},
    {...g,edges:[{from:'S',to:'Z',weight:1}]},
    {...g,edges:[g.edges[0],g.edges[0]]}
  ];
  for (const input of bad) assert.throws(() => validateNegativeGraph(input));
  let getterRead = false;
  const getter = {...g};
  Object.defineProperty(getter,'source',{get(){getterRead=true;return 'S';}});
  assert.throws(() => validateNegativeGraph(getter));
  assert.equal(getterRead, false);
  for (const weight of [-50,50,-0]) assert.equal(validateNegativeGraph({nodes:['S'],edges:[{from:'S',to:'S',weight}],source:'S'}).edges[0].weight, weight===0 ? 0 : weight);
  assert.throws(() => parseNegativeGraph('{'));
  assert.throws(() => parseNegativeGraph(' '.repeat(MAX_GRAPH_BYTES + 1)));
  assert.throws(() => parseNegativeGraph('é'.repeat(MAX_GRAPH_BYTES)));
});
test('input is untouched and all output descendants are frozen independent copies', () => {
  const g = example('finite'), before = JSON.stringify(g);
  const r = analyzeNegativePaths(g);
  assert.equal(JSON.stringify(g), before);
  function inspect(value) { if (value && typeof value === 'object') { assert(Object.isFrozen(value)); Object.values(value).forEach(inspect); } }
  inspect(r);
  g.nodes[0] = 'Z'; g.edges[0].weight = 20;
  assert.equal(r.graph.nodes[0], 'S');
  assert.equal(r.graph.edges[0].weight, 2);
  assert.throws(() => { r.rounds[1].paths.A.push('T'); });
});
test('JSON status distinctions and human pass table agree', () => {
  const r = analyzeNegativePaths(example('reachable-cycle'));
  const roundTrip = JSON.parse(JSON.stringify(r));
  assert.deepEqual(roundTrip, r);
  const human = formatNegativePaths(r);
  assert.match(human, /S: finite 0 via S/);
  assert.match(human, /U: finite 7 via S → U/);
  assert.match(human, /T: unbounded-below; no finite shortest route/);
  assert.match(human, /X: unreachable; no finite shortest route/);
  assert.match(human, /Improvement witnesses: A, T/);
  assert.throws(() => formatNegativePaths({}));
});
test('the original twelve-item course is admitted by the unchanged learner schema', () => {
  const path = fileURLToPath(new URL('../courses/negative-weight-paths.json', import.meta.url));
  const deck = parseDeck(readFileSync(path, 'utf8'));
  assert.equal(deck.items.length, 12);
  assert.deepEqual(deck.concepts, ['signed-routes','edge-budgets','cycle-influence','reading-results']);
  assert.equal(new Set(deck.items.map(item => item.id)).size, 12);
  assert(deck.items.every(item => item.explanation && item.transfer));
});
