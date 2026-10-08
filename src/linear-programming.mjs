/** Exact continuous linear optimization inside an explicit finite rectangle.
 * All feasibility, geometry and objective decisions use reduced BigInt rationals.
 * Number coordinates are never used by the solver.
 */
export const LIMITS = Object.freeze({ constraints: 8, coefficient: 100, bound: 20, text: 4096, integerText: 32 });

function freeze(value) {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function record(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value)) ||
      Object.keys(value).sort().join("|") !== [...keys].sort().join("|")) {
    throw new Error(label + " must contain exactly " + keys.join(", ") + ".");
  }
  return value;
}
function integer(value, bound, label) {
  if (!Number.isInteger(value) || Math.abs(value) > bound) {
    throw new Error(label + " must be an integer from -" + bound + " to " + bound + ".");
  }
  return value === 0 ? 0 : value;
}
function integerText(value, bound, label) {
  if (typeof value !== "string") throw new Error(label + " must be integer text.");
  const text = value.trim();
  if (text.length > LIMITS.integerText || !/^[+-]?\d+$/.test(text)) {
    throw new Error(label + " must be a signed decimal integer, without a decimal point or exponent.");
  }
  return integer(Number(text), bound, label);
}

/** Validate and copy the full mathematical problem; no implicit bounds. */
export function validateProblem(value) {
  const input = record(value, ["bounds", "constraints", "objective"], "Problem");
  const box = record(input.bounds, ["xmin", "xmax", "ymin", "ymax"], "Bounds");
  const bounds = Object.fromEntries(["xmin", "xmax", "ymin", "ymax"]
    .map(key => [key, integer(box[key], LIMITS.bound, key)]));
  if (bounds.xmin > bounds.xmax || bounds.ymin > bounds.ymax) {
    throw new Error("Each rectangle minimum must be at most its maximum.");
  }
  if (!Array.isArray(input.constraints) || input.constraints.length > LIMITS.constraints) {
    throw new Error("Use zero to eight constraint rows.");
  }
  const constraints = [];
  for (let index = 0; index < input.constraints.length; index += 1) {
    if (!Object.hasOwn(input.constraints, index)) throw new Error("Constraint rows cannot be missing.");
    const row = record(input.constraints[index], ["a", "b", "c"], "Constraint " + (index + 1));
    constraints.push(Object.fromEntries(["a", "b", "c"]
      .map(key => [key, integer(row[key], LIMITS.coefficient, "C" + (index + 1) + "." + key)])));
  }
  const goal = record(input.objective, ["p", "q", "sense"], "Objective");
  if (goal.sense !== "min" && goal.sense !== "max") throw new Error("Objective sense must be min or max.");
  return freeze({
    bounds, constraints,
    objective: {
      p: integer(goal.p, LIMITS.coefficient, "Objective p"),
      q: integer(goal.q, LIMITS.coefficient, "Objective q"),
      sense: goal.sense
    }
  });
}

/** Plain form fields; each nonblank line is a,b,c for a*x+b*y <= c. */
export function parseProblem(value) {
  const form = record(value, ["xmin", "xmax", "ymin", "ymax", "constraints", "p", "q", "sense"], "Fields");
  if (typeof form.constraints !== "string" || form.constraints.length > LIMITS.text) {
    throw new Error("Constraint text must be at most 4096 characters.");
  }
  const lines = form.constraints.split(/\r\n|\r|\n/).map(line => line.trim()).filter(Boolean);
  if (lines.length > LIMITS.constraints) throw new Error("Use zero to eight constraint rows.");
  return validateProblem({
    bounds: Object.fromEntries(["xmin", "xmax", "ymin", "ymax"]
      .map(key => [key, integerText(form[key], LIMITS.bound, key)])),
    constraints: lines.map((line, index) => {
      const fields = line.split(",");
      if (fields.length !== 3) throw new Error("Constraint " + (index + 1) + " needs exactly a,b,c.");
      return Object.fromEntries(["a", "b", "c"].map((key, column) =>
        [key, integerText(fields[column], LIMITS.coefficient, "C" + (index + 1) + "." + key)]));
    }),
    objective: {
      p: integerText(form.p, LIMITS.coefficient, "Objective p"),
      q: integerText(form.q, LIMITS.coefficient, "Objective q"), sense: form.sense
    }
  });
}

export function problemFields(value) {
  const problem = validateProblem(value);
  return freeze({
    ...Object.fromEntries(Object.entries(problem.bounds).map(([key, n]) => [key, String(n)])),
    constraints: problem.constraints.map(row => [row.a, row.b, row.c].join(", ")).join("\n"),
    p: String(problem.objective.p), q: String(problem.objective.q), sense: problem.objective.sense
  });
}

function abs(n) { return n < 0n ? -n : n; }
function gcd(a, b) {
  a = abs(a); b = abs(b);
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}
function rational(n, d = 1n) {
  if (d === 0n) throw new Error("Internal zero rational denominator.");
  if (d < 0n) { n = -n; d = -d; }
  const divisor = gcd(n, d);
  return { n: n / divisor, d: d / divisor };
}
function add(a, b) { return rational(a.n * b.d + b.n * a.d, a.d * b.d); }
function sub(a, b) { return rational(a.n * b.d - b.n * a.d, a.d * b.d); }
function mul(a, b) { return rational(a.n * b.n, a.d * b.d); }
function compare(a, b) {
  const difference = a.n * b.d - b.n * a.d;
  return difference < 0n ? -1 : difference > 0n ? 1 : 0;
}
function text(a) { return String(a.n) + (a.d === 1n ? "" : "/" + a.d); }
function scalar(n) { return rational(BigInt(n)); }
function evaluate(a, b, point) { return add(mul(scalar(a), point.x), mul(scalar(b), point.y)); }
function slack(row, point) { return sub(scalar(row.c), evaluate(row.a, row.b, point)); }
function cross(o, a, b) {
  return sub(mul(sub(a.x, o.x), sub(b.y, o.y)), mul(sub(a.y, o.y), sub(b.x, o.x)));
}
function hull(points) {
  if (points.length < 2) return [...points];
  const lower = [], upper = [];
  for (const point of points) {
    while (lower.length >= 2 && cross(lower.at(-2), lower.at(-1), point).n <= 0n) lower.pop();
    lower.push(point);
  }
  for (const point of [...points].reverse()) {
    while (upper.length >= 2 && cross(upper.at(-2), upper.at(-1), point).n <= 0n) upper.pop();
    upper.push(point);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/** Solve the admitted bounded continuous problem by complete boundary-pair enumeration. */
export function solveProblem(value) {
  const problem = validateProblem(value);
  const box = problem.bounds;
  const boundaries = [
    { id: "x-min", a: -1, b: 0, c: box.xmin === 0 ? 0 : -box.xmin, origin: "rectangle" },
    { id: "x-max", a: 1, b: 0, c: box.xmax, origin: "rectangle" },
    { id: "y-min", a: 0, b: -1, c: box.ymin === 0 ? 0 : -box.ymin, origin: "rectangle" },
    { id: "y-max", a: 0, b: 1, c: box.ymax, origin: "rectangle" },
    ...problem.constraints.map((row, index) => ({ id: "C" + (index + 1), ...row, origin: "authored" }))
  ];
  const pairs = [], points = new Map();
  for (let i = 0; i < boundaries.length; i += 1) {
    const left = boundaries[i];
    for (let j = i + 1; j < boundaries.length; j += 1) {
      const right = boundaries[j];
      const pair = { first: left.id, second: right.id };
      const [a, b, c, d, e, f] = [left.a, left.b, left.c, right.a, right.b, right.c].map(BigInt);
      if ((a === 0n && b === 0n) || (d === 0n && e === 0n)) {
        pairs.push({ ...pair, kind: "zero-normal" });
        continue;
      }
      const determinant = a * e - b * d;
      if (determinant === 0n) {
        const coincident = a * f === c * d && b * f === c * e;
        pairs.push({ ...pair, kind: coincident ? "coincident" : "parallel" });
        continue;
      }
      const point = {
        x: rational(c * e - b * f, determinant),
        y: rational(a * f - c * d, determinant)
      };
      const violated = boundaries.filter(row => slack(row, point).n < 0n).map(row => row.id);
      const entry = {
        ...pair, kind: "intersection", point: { x: text(point.x), y: text(point.y) },
        feasible: violated.length === 0, violated
      };
      if (entry.feasible) {
        const key = text(point.x) + "," + text(point.y);
        if (!points.has(key)) points.set(key, { ...point, key, pairs: [] });
        points.get(key).pairs.push([left.id, right.id]);
        entry.key = key;
      }
      pairs.push(entry);
    }
  }
  const ordered = [...points.values()].sort((a, b) => compare(a.x, b.x) || compare(a.y, b.y));
  ordered.forEach((point, index) => { point.id = "V" + (index + 1); });
  const boundary = hull(ordered);
  const kind = boundary.length === 0 ? "empty" : boundary.length === 1 ? "point" :
    boundary.length === 2 ? "segment" : "polygon";
  const values = ordered.map(point => evaluate(problem.objective.p, problem.objective.q, point));
  let optimum = null;
  const optimal = new Set();
  if (values.length) {
    let best = values[0];
    for (const value of values) {
      const order = compare(value, best);
      if ((problem.objective.sense === "max" && order > 0) ||
          (problem.objective.sense === "min" && order < 0)) best = value;
    }
    ordered.forEach((point, index) => { if (compare(values[index], best) === 0) optimal.add(point.id); });
    const optimumBoundary = boundary.filter(point => optimal.has(point.id));
    optimum = {
      sense: problem.objective.sense, value: text(best),
      kind: optimumBoundary.length === 1 ? "point" : optimumBoundary.length === 2 ? "segment" : "region",
      vertices: optimumBoundary.map(point => point.id),
      wholeRegion: optimal.size === ordered.length
    };
  }
  const vertices = ordered.map((point, index) => ({
    id: point.id, x: text(point.x), y: text(point.y), objective: text(values[index]),
    active: boundaries.filter(row => slack(row, point).n === 0n).map(row => row.id),
    slacks: boundaries.map(row => ({ id: row.id, value: text(slack(row, point)) })),
    pairs: point.pairs, optimal: optimal.has(point.id)
  }));
  return freeze({
    format: "recallweave-linear-programming/1", problem, boundaries,
    pairs: pairs.map(entry => {
      if (entry.key === undefined) return entry;
      const { key, ...rest } = entry;
      return { ...rest, vertex: points.get(key).id };
    }),
    vertices, region: { kind, boundary: boundary.map(point => point.id) }, optimum
  });
}

export function observationJSON(result, selectedVertex = null) {
  if (!result || result.format !== "recallweave-linear-programming/1" ||
      !Array.isArray(result.vertices)) throw new Error("Choose a completed linear-programming observation.");
  if (selectedVertex !== null && !result.vertices.some(vertex => vertex.id === selectedVertex)) {
    throw new Error("The inspected vertex must belong to this completed observation.");
  }
  return JSON.stringify({ ...result, inspection: { selectedVertex } }, null, 2) + "\n";
}

export const PRESETS = freeze([
  {
    id: "unique", title: "Two limits, one best vertex",
    note: "Maximize 3x + 2y. Compare all feasible vertices; a crossing must satisfy every row.",
    bounds: { xmin: 0, xmax: 4, ymin: 0, ymax: 4 },
    constraints: [{ a: 1, b: 1, c: 4 }, { a: 2, b: 1, c: 5 }],
    objective: { p: 3, q: 2, sense: "max" }
  },
  {
    id: "fractional", title: "A fractional continuous optimum",
    note: "The exact answer need not be an integer, even when every coefficient is an integer.",
    bounds: { xmin: 0, xmax: 4, ymin: 0, ymax: 4 },
    constraints: [{ a: 2, b: 1, c: 5 }, { a: 1, b: 2, c: 5 }],
    objective: { p: 1, q: 1, sense: "max" }
  },
  {
    id: "edge", title: "A whole optimal edge",
    note: "Every point between the two best vertices has the same objective value.",
    bounds: { xmin: 0, xmax: 4, ymin: 0, ymax: 4 },
    constraints: [{ a: 1, b: 1, c: 4 }],
    objective: { p: 1, q: 1, sense: "max" }
  },
  {
    id: "constant", title: "A constant objective",
    note: "All feasible points tie. There is no reason to prefer one corner.",
    bounds: { xmin: 0, xmax: 4, ymin: 0, ymax: 4 },
    constraints: [{ a: 1, b: 1, c: 4 }],
    objective: { p: 0, q: 0, sense: "max" }
  },
  {
    id: "line", title: "A feasible segment",
    note: "Opposite inequalities impose x + y = 3. This objective is constant on that segment.",
    bounds: { xmin: 0, xmax: 4, ymin: 0, ymax: 4 },
    constraints: [{ a: 1, b: 1, c: 3 }, { a: -1, b: -1, c: -3 }],
    objective: { p: 2, q: 2, sense: "min" }
  },
  {
    id: "point", title: "Only one feasible point",
    note: "The bounds and two lower limits leave (2,1); the feasible set itself is a point.",
    bounds: { xmin: 0, xmax: 2, ymin: 0, ymax: 1 },
    constraints: [{ a: -1, b: 0, c: -2 }, { a: 0, b: -1, c: -1 }],
    objective: { p: 0, q: 0, sense: "min" }
  },
  {
    id: "empty", title: "No jointly feasible point",
    note: "Nonnegative x and y cannot also satisfy x + y <= -1.",
    bounds: { xmin: 0, xmax: 4, ymin: 0, ymax: 4 },
    constraints: [{ a: 1, b: 1, c: -1 }],
    objective: { p: 1, q: 1, sense: "max" }
  }
].map(({ id, title, note, ...problem }) => ({ id, title, note, problem })));
