/** Exact planar hulls for small, explicitly bounded integer point sets. */
export const MAX_HULL_POINTS = 16;
export const HULL_COORDINATE_LIMIT = 20;
export const MAX_HULL_INPUT_BYTES = 4096;

function checkedPoints(value) {
  if (!Array.isArray(value) || value.length > MAX_HULL_POINTS) {
    throw new TypeError('Supply an array of 0–16 coordinate pairs.');
  }
  return Array.from(value, (pair, index) => {
    if (!Array.isArray(pair) || pair.length !== 2
      || !Array.from(pair).every(v => typeof v === 'number' && Number.isInteger(v)
        && Math.abs(v) <= HULL_COORDINATE_LIMIT)) {
      throw new TypeError('Point ' + (index + 1) + ' needs two integer coordinates from -20 through 20.');
    }
    return pair.map(v => v === 0 ? 0 : v);
  });
}

export function parseHullPoints(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > MAX_HULL_INPUT_BYTES) {
    throw new TypeError('Point input must be UTF-8 text of at most 4096 bytes.');
  }
  let value;
  try { value = JSON.parse(text); }
  catch { throw new TypeError('Enter a JSON array of [x,y] pairs; use [] for an empty set.'); }
  return checkedPoints(value);
}

function turn(a, b, c) {
  // |coordinate difference| <= 40: each product <= 1600, difference <= 3200.
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function onSegment(p, a, b) {
  return turn(a, b, p) === 0
    && p.x >= Math.min(a.x, b.x) && p.x <= Math.max(a.x, b.x)
    && p.y >= Math.min(a.y, b.y) && p.y <= Math.max(a.y, b.y);
}

export function analyzeHull(points) {
  const inputs = checkedPoints(points).map(([x, y], index) => ({ id: 'P' + (index + 1), x, y }));
  const byCoordinate = new Map();
  for (const point of inputs) {
    const key = point.x + ',' + point.y;
    if (!byCoordinate.has(key)) byCoordinate.set(key, { ...point, inputIds: [] });
    byCoordinate.get(key).inputIds.push(point.id);
  }
  const unique = [...byCoordinate.values()].sort((a, b) => a.x - b.x || a.y - b.y);
  const byId = new Map(unique.map(point => [point.id, point]));
  const sortedIds = unique.map(point => point.id);
  const steps = [];
  const snapshot = (phase, action, candidate, before, after, tested = [], determinant = null, removed = null) => {
    steps.push({ index: steps.length, phase, action, candidate,
      before: [...before], after: [...after], tested: [...tested], determinant, removed });
  };
  function scan(ids, phase) {
    const stack = [];
    for (const candidate of ids) {
      while (stack.length >= 2) {
        const a = stack[stack.length - 2], b = stack[stack.length - 1];
        const determinant = turn(byId.get(a), byId.get(b), byId.get(candidate));
        const before = [...stack];
        if (determinant > 0) {
          snapshot(phase, 'retain', candidate, before, stack, [a, b, candidate], determinant);
          break;
        }
        stack.pop();
        snapshot(phase, 'pop', candidate, before, stack, [a, b, candidate], determinant, b);
      }
      const before = [...stack];
      stack.push(candidate);
      snapshot(phase, 'push', candidate, before, stack);
    }
    return stack;
  }
  const lower = unique.length < 2 ? [...sortedIds] : scan(sortedIds, 'lower');
  const upper = unique.length < 2 ? [...sortedIds] : scan([...sortedIds].reverse(), 'upper');
  const hull = unique.length < 2 ? [...sortedIds] : [...lower.slice(0, -1), ...upper.slice(0, -1)];
  const kind = hull.length === 0 ? 'empty' : hull.length === 1 ? 'point' : hull.length === 2 ? 'segment' : 'polygon';
  let twiceArea = 0;
  if (kind === 'polygon') {
    for (let index = 0; index < hull.length; index++) {
      const a = byId.get(hull[index]), b = byId.get(hull[(index + 1) % hull.length]);
      twiceArea += a.x * b.y - a.y * b.x;
    }
  }
  // At most 16 terms, each |x*y-y*x| <= 800. No tolerance decides topology.
  if (!Number.isSafeInteger(twiceArea) || twiceArea < 0) throw new Error('Internal hull orientation invariant failed.');
  const vertices = new Set(hull);
  const roleById = new Map();
  for (const point of unique) {
    let role = vertices.has(point.id) ? 'vertex' : 'interior';
    if (role !== 'vertex' && hull.length >= 2) {
      const count = kind === 'segment' ? 1 : hull.length;
      for (let edge = 0; edge < count; edge++) {
        if (onSegment(point, byId.get(hull[edge]), byId.get(hull[(edge + 1) % hull.length]))) {
          role = 'edge';
          break;
        }
      }
    }
    roleById.set(point.id, role);
  }
  const classifications = inputs.map(point => {
    const representative = byCoordinate.get(point.x + ',' + point.y);
    return { id: point.id, representativeId: representative.id,
      duplicate: point.id !== representative.id, role: roleById.get(representative.id) };
  });
  snapshot('complete', 'complete', null, [], hull);
  return { format: 'recallweave-convex-hull/1',
    conventions: { coordinateLimit: HULL_COORDINATE_LIMIT, maxPoints: MAX_HULL_POINTS,
      axis: 'x right, y up', boundary: 'extreme vertices only',
      order: 'counterclockwise polygon from lexicographic minimum; sorted segment endpoints' },
    inputs, unique, sortedIds, lower, upper, hull, kind, twiceArea, area: twiceArea / 2, classifications, steps };
}

export function serializeHullRecord(points, selectedStep = 0) {
  const result = analyzeHull(points);
  if (!Number.isInteger(selectedStep) || selectedStep < 0 || selectedStep >= result.steps.length) {
    throw new RangeError('Choose an existing inspection step.');
  }
  return JSON.stringify({ ...result, selectedStep }, null, 2) + '\n';
}
