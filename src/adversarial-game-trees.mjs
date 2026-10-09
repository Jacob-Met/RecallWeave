// Original finite-tree teaching model. No network or external dependencies.
const PROFILE = 'recallweave.adversarial-game-trees.v1';
const ID = /^[A-Za-z][A-Za-z0-9_-]{0,31}$/;

function reject(message) {
  throw new TypeError(message);
}

function fields(value, allowed, label) {
  if (value === null || typeof value !== 'object' ||
      Object.getPrototypeOf(value) !== Object.prototype) {
    reject(label + ' must be an ordinary object.');
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).some(key => typeof key !== 'string') ||
      Object.keys(descriptors).length !== allowed.length ||
      allowed.some(key => !Object.hasOwn(descriptors, key))) {
    reject(label + ' has unsupported or missing fields.');
  }
  for (const key of allowed) {
    if (!Object.hasOwn(descriptors[key], 'value')) {
      reject(label + ' must contain data properties.');
    }
  }
  return Object.fromEntries(allowed.map(key => [key, descriptors[key].value]));
}

function admit(input) {
  const top = fields(input, ['rootPlayer', 'tree'], 'Input');
  if (top.rootPlayer !== 'MAX' && top.rootPlayer !== 'MIN') {
    reject('rootPlayer must be MAX or MIN.');
  }
  const seen = new Set();
  const ids = new Set();
  const preorder = [];
  let leafCount = 0;
  let maxDepth = 0;

  function node(value, depth) {
    if (depth > 6) reject('Tree depth must not exceed 6.');
    if (value === null || typeof value !== 'object' ||
        Object.getPrototypeOf(value) !== Object.prototype) {
      reject('Each node must be an ordinary object.');
    }
    if (seen.has(value)) reject('Repeated node objects and cycles are unsupported.');
    seen.add(value);
    if (seen.size > 31) reject('Tree must contain at most 31 nodes.');
    const isLeaf = Object.hasOwn(value, 'utility');
    const data = fields(value, isLeaf ? ['id', 'utility'] : ['id', 'children'], 'Node');
    if (typeof data.id !== 'string' || !ID.test(data.id)) {
      reject('Node id must be an ASCII letter followed by at most 31 letters, digits, underscores or hyphens.');
    }
    if (ids.has(data.id)) reject('Node ids must be unique.');
    ids.add(data.id);
    const normalized = { id: data.id, depth };
    preorder.push(normalized);
    maxDepth = Math.max(maxDepth, depth);
    if (isLeaf) {
      if (!Number.isInteger(data.utility) || data.utility < -100 || data.utility > 100) {
        reject('Terminal utility must be an integer from -100 through 100.');
      }
      normalized.utility = data.utility === 0 ? 0 : data.utility;
      normalized.children = null;
      leafCount += 1;
      return normalized;
    }
    const children = data.children;
    if (!Array.isArray(children) || Object.getPrototypeOf(children) !== Array.prototype) {
      reject('children must be an ordinary dense array.');
    }
    const descriptors = Object.getOwnPropertyDescriptors(children);
    const length = descriptors.length.value;
    if (length < 1 || length > 4 || Reflect.ownKeys(descriptors).length !== length + 1) {
      reject('Each internal node must have 1 through 4 children with no extra array fields.');
    }
    for (let index = 0; index < length; index += 1) {
      if (!Object.hasOwn(descriptors, String(index)) ||
          !Object.hasOwn(descriptors[index], 'value')) {
        reject('children must be a dense array of data properties.');
      }
    }
    normalized.children = Array.from({ length }, (_, index) =>
      node(descriptors[index].value, depth + 1));
    return normalized;
  }

  // Finish validation of the entire input before either evaluation begins.
  const tree = node(top.tree, 0);
  return { rootPlayer: top.rootPlayer, tree, preorder, leafCount, maxDepth };
}

/**
 * Analyze one explicit, alternating, perfect-information zero-sum game tree.
 * Utilities are always from MAX's perspective. See the companion guide for
 * admission limits and the distinction between exact values and cutoff bounds.
 */
export function analyzeGameTree(input) {
  const admitted = admit(input);
  const { rootPlayer, tree, preorder, leafCount, maxDepth } = admitted;
  const exact = new Map();
  const roleOf = node => node.children === null ? 'TERMINAL' :
    (node.depth % 2 === 0 ? rootPlayer : (rootPlayer === 'MAX' ? 'MIN' : 'MAX'));

  function minimax(node) {
    const role = roleOf(node);
    if (role === 'TERMINAL') {
      const result = { id: node.id, role, value: node.utility, chosenChild: null };
      exact.set(node.id, result);
      return result.value;
    }
    let value = role === 'MAX' ? -Infinity : Infinity;
    let chosenChild = null;
    for (const child of node.children) {
      const candidate = minimax(child);
      if (chosenChild === null || (role === 'MAX' ? candidate > value : candidate < value)) {
        value = candidate;
        chosenChild = child.id;
      }
    }
    exact.set(node.id, { id: node.id, role, value, chosenChild });
    return value;
  }

  const value = minimax(tree);
  const principalVariation = [];
  let current = tree.id;
  while (current !== null) {
    principalVariation.push(current);
    current = exact.get(current).chosenChild;
  }

  const visitedNodeIds = [];
  const visitedLeafIds = [];
  const cutoffs = [];
  function search(node, alpha, beta) {
    visitedNodeIds.push(node.id);
    const role = roleOf(node);
    if (role === 'TERMINAL') {
      visitedLeafIds.push(node.id);
      return node.utility;
    }
    let best = role === 'MAX' ? -Infinity : Infinity;
    for (let index = 0; index < node.children.length; index += 1) {
      const childValue = search(node.children[index], alpha, beta);
      if (role === 'MAX') {
        best = Math.max(best, childValue);
        alpha = Math.max(alpha, best);
      } else {
        best = Math.min(best, childValue);
        beta = Math.min(beta, best);
      }
      if (alpha >= beta && index + 1 < node.children.length) {
        cutoffs.push({
          nodeId: node.id,
          role,
          bound: role === 'MAX' ? 'lower' : 'upper',
          boundValue: best,
          alpha,
          beta,
          skippedChildIds: node.children.slice(index + 1).map(child => child.id)
        });
        break;
      }
    }
    return best;
  }

  const searchedValue = search(tree, -Infinity, Infinity);
  const visited = new Set(visitedNodeIds);
  const prunedNodeIds = preorder.filter(node => !visited.has(node.id)).map(node => node.id);
  return {
    profile: PROFILE,
    rootPlayer,
    nodeCount: preorder.length,
    leafCount,
    maxDepth,
    minimax: {
      value,
      chosenChild: exact.get(tree.id).chosenChild,
      principalVariation,
      nodes: preorder.map(node => exact.get(node.id))
    },
    alphaBeta: {
      value: searchedValue,
      visitedNodeIds,
      visitedLeafIds,
      prunedNodeIds,
      visitedNodeCount: visitedNodeIds.length,
      visitedLeafCount: visitedLeafIds.length,
      prunedNodeCount: prunedNodeIds.length,
      cutoffs
    }
  };
}
