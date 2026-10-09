import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyzeGameTree } from '../src/adversarial-game-trees.mjs';
import { parseDeck } from '../src/deck.mjs';

const literalCases = [
  {
    "name": "worst-reply",
    "expected": {
      "nodeCount": 7,
      "leafCount": 4,
      "maxDepth": 2,
      "value": 4,
      "chosenChild": "Oak",
      "principalVariation": [
        "R",
        "Oak",
        "O4"
      ],
      "values": {
        "R": 4,
        "Oak": 4,
        "O4": 4,
        "O7": 7,
        "Pine": -6,
        "P1": 1,
        "Pm6": -6
      },
      "visitedNodeIds": [
        "R",
        "Oak",
        "O4",
        "O7",
        "Pine",
        "P1"
      ],
      "visitedLeafIds": [
        "O4",
        "O7",
        "P1"
      ],
      "prunedNodeIds": [
        "Pm6"
      ],
      "cutoffs": [
        {
          "nodeId": "Pine",
          "role": "MIN",
          "bound": "upper",
          "boundValue": 1,
          "alpha": 4,
          "beta": 1,
          "skippedChildIds": [
            "Pm6"
          ]
        }
      ]
    }
  },
  {
    "name": "reordered-replies",
    "expected": {
      "nodeCount": 7,
      "leafCount": 4,
      "maxDepth": 2,
      "value": 4,
      "chosenChild": "Oak",
      "principalVariation": [
        "R",
        "Oak",
        "O4"
      ],
      "values": {
        "R": 4,
        "Pine": -6,
        "P1": 1,
        "Pm6": -6,
        "Oak": 4,
        "O4": 4,
        "O7": 7
      },
      "visitedNodeIds": [
        "R",
        "Pine",
        "P1",
        "Pm6",
        "Oak",
        "O4",
        "O7"
      ],
      "visitedLeafIds": [
        "P1",
        "Pm6",
        "O4",
        "O7"
      ],
      "prunedNodeIds": [],
      "cutoffs": []
    }
  },
  {
    "name": "min-root-and-ties",
    "expected": {
      "nodeCount": 7,
      "leafCount": 4,
      "maxDepth": 2,
      "value": 0,
      "chosenChild": "First",
      "principalVariation": [
        "R",
        "First",
        "F0"
      ],
      "values": {
        "R": 0,
        "First": 0,
        "Fm2": -2,
        "F0": 0,
        "Second": 0,
        "S0": 0,
        "Sm3": -3
      },
      "visitedNodeIds": [
        "R",
        "First",
        "Fm2",
        "F0",
        "Second",
        "S0"
      ],
      "visitedLeafIds": [
        "Fm2",
        "F0",
        "S0"
      ],
      "prunedNodeIds": [
        "Sm3"
      ],
      "cutoffs": [
        {
          "nodeId": "Second",
          "role": "MAX",
          "bound": "lower",
          "boundValue": 0,
          "alpha": 0,
          "beta": 0,
          "skippedChildIds": [
            "Sm3"
          ]
        }
      ]
    }
  }
];
const loadExample = name => JSON.parse(readFileSync(new URL('../examples/adversarial-game-trees/' + name + '.json', import.meta.url), 'utf8'));

function freezeDeep(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freezeDeep);
    Object.freeze(value);
  }
  return value;
}
const terminal = (utility, rootPlayer = 'MAX') => ({ rootPlayer, tree: { id: 'R', utility } });

for (const { name, expected } of literalCases) {
  test('hand-derived exact result and traversal: ' + name, () => {
    const input = loadExample(name);
    const before = JSON.stringify(input);
    freezeDeep(input);
    const result = analyzeGameTree(input);
    assert.equal(result.profile, 'recallweave.adversarial-game-trees.v1');
    for (const key of ['nodeCount', 'leafCount', 'maxDepth']) assert.equal(result[key], expected[key]);
    assert.equal(result.rootPlayer, input.rootPlayer);
    assert.equal(result.minimax.value, expected.value);
    assert.equal(result.minimax.chosenChild, expected.chosenChild);
    assert.deepEqual(result.minimax.principalVariation, expected.principalVariation);
    assert.deepEqual(Object.fromEntries(result.minimax.nodes.map(node => [node.id, node.value])), expected.values);
    assert.deepEqual(result.minimax.nodes.map(node => node.id), Object.keys(expected.values));
    assert.equal(result.alphaBeta.value, expected.value);
    for (const key of ['visitedNodeIds', 'visitedLeafIds', 'prunedNodeIds', 'cutoffs']) {
      assert.deepEqual(result.alphaBeta[key], expected[key]);
    }
    assert.equal(result.alphaBeta.visitedNodeCount, expected.visitedNodeIds.length);
    assert.equal(result.alphaBeta.visitedLeafCount, expected.visitedLeafIds.length);
    assert.equal(result.alphaBeta.prunedNodeCount, expected.prunedNodeIds.length);
    assert.equal(result.alphaBeta.visitedNodeCount + result.alphaBeta.prunedNodeCount, result.nodeCount);
    assert.equal(JSON.stringify(input), before);
  });
}

test('terminal MIN and utility endpoints do not flip perspective', () => {
  for (const utility of [-100, -7, 0, 100]) {
    const result = analyzeGameTree(terminal(utility, 'MIN'));
    assert.equal(result.minimax.value, utility);
    assert.equal(result.minimax.chosenChild, null);
    assert.deepEqual(result.minimax.principalVariation, ['R']);
    assert.deepEqual(result.minimax.nodes, [{ id: 'R', role: 'TERMINAL', value: utility, chosenChild: null }]);
    assert.equal(result.alphaBeta.value, utility);
    assert.deepEqual(result.alphaBeta.visitedNodeIds, ['R']);
    assert.deepEqual(result.alphaBeta.visitedLeafIds, ['R']);
    assert.deepEqual(result.alphaBeta.prunedNodeIds, []);
    assert.deepEqual(result.alphaBeta.cutoffs, []);
  }
});

test('signed zero has ordinary zero utility without mutating the input', () => {
  const input = terminal(-0);
  const result = analyzeGameTree(input);
  assert.ok(Object.is(input.tree.utility, -0));
  assert.ok(Object.is(result.minimax.value, 0));
  assert.ok(Object.is(result.alphaBeta.value, 0));
});

test('unequal-depth leaves are exact alternatives, not padding or averaged outcomes', () => {
  const result = analyzeGameTree({ rootPlayer: 'MAX', tree: { id: 'R', children: [
    { id: 'L', utility: 2 },
    { id: 'M', children: [{ id: 'U', utility: 4 }, { id: 'V', utility: 1 }] }
  ] } });
  assert.equal(result.minimax.value, 2);
  assert.equal(result.minimax.chosenChild, 'L');
  assert.deepEqual(result.minimax.principalVariation, ['R', 'L']);
  assert.equal(result.minimax.nodes.find(node => node.id === 'M').value, 1);
});

test('MAX cutoff can be a strict lower bound, and MIN root remains exact', () => {
  const result = analyzeGameTree({ rootPlayer: 'MIN', tree: { id: 'R', children: [
    { id: 'L', utility: 0 },
    { id: 'Right', children: [{ id: 'A', utility: 2 }, { id: 'B', utility: 9 }] }
  ] } });
  assert.equal(result.minimax.value, 0);
  assert.equal(result.alphaBeta.value, 0);
  assert.equal(result.minimax.nodes.find(node => node.id === 'Right').value, 9);
  assert.deepEqual(result.alphaBeta.cutoffs, [{
    nodeId: 'Right', role: 'MAX', bound: 'lower', boundValue: 2,
    alpha: 2, beta: 0, skippedChildIds: ['B']
  }]);
});

test('first declared optimal action, rather than the last tie, defines the principal variation', () => {
  for (const rootPlayer of ['MAX', 'MIN']) {
    const result = analyzeGameTree({ rootPlayer, tree: { id: 'R', children: [
      { id: 'Early', utility: 3 }, { id: 'Late', utility: 3 }
    ] } });
    assert.equal(result.minimax.chosenChild, 'Early');
    assert.deepEqual(result.minimax.principalVariation, ['R', 'Early']);
    assert.deepEqual(result.alphaBeta.cutoffs, []);
  }
});

test('complete 31-node tree and depth-six chain are admitted at the limits', () => {
  let nextId = 0;
  let nextLeaf = 0;
  const binary = depth => {
    const id = 'N' + nextId++;
    return depth === 4 ? { id, utility: nextLeaf++ } :
      { id, children: [binary(depth + 1), binary(depth + 1)] };
  };
  const result = analyzeGameTree({ rootPlayer: 'MAX', tree: binary(0) });
  assert.equal(result.nodeCount, 31);
  assert.equal(result.leafCount, 16);
  assert.equal(result.minimax.value, 10);
  assert.equal(result.alphaBeta.value, 10);
  let tree = { id: 'Leaf', utility: -5 };
  for (let index = 5; index >= 0; index--) tree = { id: 'D' + index, children: [tree] };
  const chain = analyzeGameTree({ rootPlayer: 'MIN', tree });
  assert.equal(chain.maxDepth, 6);
  assert.equal(chain.minimax.value, -5);
});

test('invalid late subtree is refused even where an early branch could prune it', () => {
  const input = { rootPlayer: 'MAX', tree: { id: 'R', children: [
    { id: 'Good', utility: 100 },
    { id: 'Other', children: [{ id: 'Low', utility: -100 }, { id: 'Invalid', utility: 101 }] }
  ] } };
  assert.throws(() => analyzeGameTree(input), TypeError);
});

test('admission rejects accessors without invoking them', () => {
  let calls = 0;
  const tree = { id: 'R' };
  Object.defineProperty(tree, 'utility', { enumerable: true, get() { calls++; return 1; } });
  assert.throws(() => analyzeGameTree({ rootPlayer: 'MAX', tree }), TypeError);
  assert.equal(calls, 0);
});

test('unsupported shape, utility, sharing and size refuse before a result', () => {
  const invalid = [
    null, [], {}, { rootPlayer: 'max', tree: { id: 'R', utility: 1 } },
    { ...terminal(1), probability: 0.5 },
    { rootPlayer: 'MAX', tree: { id: 'R', utility: 1, children: [] } },
    { rootPlayer: 'MAX', tree: { id: 'R', children: [] } },
    { rootPlayer: 'MAX', tree: { id: 'R', children: [{ id: 'R', utility: 1 }] } },
    terminal(1.5), terminal(101), terminal(-101), terminal('2'), terminal(NaN), terminal(Infinity),
    { rootPlayer: 'MAX', tree: { id: '9bad', utility: 1 } },
    { rootPlayer: 'MAX', tree: { id: 'A'.repeat(33), utility: 1 } },
    { rootPlayer: 'MAX', tree: { id: 'R', children: new Array(1) } },
    { rootPlayer: 'MAX', tree: { id: 'R', children: Array.from({ length: 5 }, (_, i) => ({ id: 'C' + i, utility: i })) } },
    { rootPlayer: 'MAX', tree: Object.assign(Object.create(null), { id: 'R', utility: 1 }) }
  ];
  const shared = { id: 'Shared', utility: 1 };
  invalid.push({ rootPlayer: 'MAX', tree: { id: 'R', children: [shared, shared] } });
  const cycle = { id: 'R', children: [] }; cycle.children.push(cycle);
  invalid.push({ rootPlayer: 'MAX', tree: cycle });
  const extraArray = [{ id: 'C', utility: 1 }]; extraArray.extra = 2;
  invalid.push({ rootPlayer: 'MAX', tree: { id: 'R', children: extraArray } });
  const symbol = terminal(1); symbol[Symbol('unsupported')] = 1; invalid.push(symbol);
  let deep = { id: 'Leaf', utility: 1 };
  for (let i = 6; i >= 0; i--) deep = { id: 'D' + i, children: [deep] };
  invalid.push({ rootPlayer: 'MAX', tree: deep });
  let id = 0;
  const binary = depth => {
    const nodeId = 'N' + id++;
    return depth === 4 ? { id: nodeId, utility: 1 } :
      { id: nodeId, children: [binary(depth + 1), binary(depth + 1)] };
  };
  const oversized = binary(0);
  const leaf = oversized.children[1].children[1].children[1].children[1];
  delete leaf.utility; leaf.children = [{ id: 'Extra', utility: 1 }];
  invalid.push({ rootPlayer: 'MAX', tree: oversized });
  for (const input of invalid) assert.throws(() => analyzeGameTree(input), TypeError);
});

test('the new twelve-card course is admitted by the unchanged learner parser and every prompt is mirrored', () => {
  const raw = readFileSync(new URL('../courses/adversarial-game-trees.json', import.meta.url), 'utf8');
  const guide = readFileSync(new URL('../courses/adversarial-game-trees.md', import.meta.url), 'utf8');
  const deck = parseDeck(raw);
  assert.equal(deck.items.length, 12);
  assert.equal(deck.concepts.length, 4);
  assert.equal(new Set(deck.items.map(item => item.id)).size, 12);
  for (const item of deck.items) assert.ok(guide.includes(item.prompt), item.id);
  assert.match(deck.license, /no additional reuse license/);
  assert.match(guide, /not register it/);
});
