/** Original bounded teaching model: weighted union and full path compression. */
export const UNION_FIND_PRESETS = Object.freeze([
  Object.freeze({id: 'bridges', name: 'Connect three islands', count: 6, text: 'join A B\njoin C D\njoin E F\njoin A C\nfind D\njoin D F\nfind F\njoin B E'}),
  Object.freeze({id: 'compression', name: 'A path becomes shorter', count: 8, text: 'join A B\njoin C D\njoin E F\njoin G H\njoin A C\njoin E G\njoin A E\nfind H\nfind H'}),
  Object.freeze({id: 'repeated', name: 'Repeated connections', count: 4, text: 'join A B\njoin B C\njoin A C\njoin B A\njoin D D\nfind C'})
]);

function checkedCount(count) {
  if (!Number.isInteger(count) || count < 1 || count > 8) throw new Error('Choose 1–8 elements.');
  return count;
}
function record(value, description) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    throw new Error(description + ' must be an object.');
  }
}
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

/** Parse explicit A–H commands; blank lines are ignored and no operation is guessed. */
export function parseUnionFindInput(count, text) {
  checkedCount(count);
  if (typeof text !== 'string' || text.length > 4096) throw new Error('Use at most 4096 characters of commands.');
  const operations = [];
  text.split(/\r?\n/).forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const fields = trimmed.split(/\s+/);
    const union = fields[0] === 'join' && fields.length === 3;
    const find = fields[0] === 'find' && fields.length === 2;
    if (!union && !find) throw new Error('Line ' + (index + 1) + ': use join A B or find A.');
    const elements = fields.slice(1).map(label => {
      if (!/^[A-H]$/.test(label) || label.charCodeAt(0) - 65 >= count) {
        throw new Error('Line ' + (index + 1) + ': use an element from A to ' + String.fromCharCode(64 + count) + '.');
      }
      return label.charCodeAt(0) - 65;
    });
    operations.push(union ? {type: 'union', a: elements[0], b: elements[1]} : {type: 'find', a: elements[0]});
  });
  if (operations.length > 32) throw new Error('Use at most 32 commands.');
  return freeze(operations);
}

/** Return detached immutable states. Inspection never performs an extra find. */
export function traceUnionFind(count, operations, options = {}) {
  checkedCount(count);
  record(options, 'Options');
  if (Object.keys(options).some(key => key !== 'compress')) throw new Error('Unknown trace option.');
  const compress = Object.hasOwn(options, 'compress') ? options.compress : true;
  if (typeof compress !== 'boolean') throw new Error('compress must be true or false.');
  if (!Array.isArray(operations) || operations.length > 32) throw new Error('Use an array of at most 32 operations.');
  const ops = [];
  for (let index = 0; index < operations.length; index++) {
    if (!Object.hasOwn(operations, index)) throw new Error('Operations must not contain gaps.');
    const op = operations[index];
    record(op, 'Operation ' + (index + 1));
    const keys = op.type === 'union' ? ['type', 'a', 'b'] : op.type === 'find' ? ['type', 'a'] : [];
    if (!keys.length || Object.keys(op).length !== keys.length || Object.keys(op).some(key => !keys.includes(key))) {
      throw new Error('Use only union {a,b} or find {a} operations.');
    }
    for (const key of keys.slice(1)) {
      if (!Number.isInteger(op[key]) || op[key] < 0 || op[key] >= count) throw new Error('Operation element is outside the selected range.');
    }
    ops.push(op.type === 'union' ? {type: 'union', a: op.a, b: op.b} : {type: 'find', a: op.a});
  }
  const parent = Array.from({length: count}, (_, index) => index);
  const size = Array(count).fill(1);
  const snapshots = [];
  let components = count;
  let totalLinks = 0;
  function inspect(operation, paths, joined) {
    const groups = new Map();
    let maxDepth = 0;
    for (let node = 0; node < count; node++) {
      let root = node, depth = 0;
      while (parent[root] !== root) { root = parent[root]; depth++; }
      maxDepth = Math.max(maxDepth, depth);
      if (!groups.has(root)) groups.set(root, []);
      groups.get(root).push(node);
    }
    const linksFollowed = paths.reduce((sum, path) => sum + path.path.length - 1, 0);
    totalLinks += linksFollowed;
    snapshots.push(freeze({
      operation, parent: [...parent], size: [...size], components,
      groups: [...groups].sort(([a], [b]) => a - b).map(([root, members]) => ({root, members})),
      paths, joined, linksFollowed, totalLinks, maxDepth
    }));
  }
  function find(start) {
    const path = [start], changes = [];
    let root = start;
    while (parent[root] !== root) { root = parent[root]; path.push(root); }
    if (compress) {
      for (const node of path.slice(0, -1)) {
        if (parent[node] !== root) {
          changes.push({node, from: parent[node], to: root});
          parent[node] = root;
        }
      }
    }
    return {start, path, root, changes};
  }
  inspect(null, [], null);
  for (const operation of ops) {
    const paths = [find(operation.a)];
    let joined = null;
    if (operation.type === 'union') {
      paths.push(find(operation.b));
      const a = paths[0].root, b = paths[1].root;
      if (a !== b) {
        const winner = size[a] === size[b] ? Math.min(a, b) : size[a] > size[b] ? a : b;
        const child = winner === a ? b : a;
        joined = {child, parent: winner, childSize: size[child], parentSizeBefore: size[winner]};
        parent[child] = winner;
        size[winner] += size[child];
        size[child] = 0;
        components--;
      }
    }
    inspect(operation, paths, joined);
  }
  return freeze({format: 'recallweave-union-find-trace/1', count, compress, operations: ops, snapshots});
}
