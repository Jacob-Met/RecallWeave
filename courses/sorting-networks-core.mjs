/** Fixed min/max comparator networks. All public inputs are copied and validated. */
export const MAX_WIRES = 6;
export const MAX_COMPARATORS = 30;

function freeze(value) {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function fields(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      Object.keys(value).sort().join("|") !== [...expected].sort().join("|")) {
    throw new Error(label + " must have exactly " + expected.join(", ") + ".");
  }
}
function integer(value, low, high, label) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < low || value > high) {
    throw new Error(label + " must be an integer from " + low + " to " + high + ".");
  }
  return value === 0 ? 0 : value;
}
function vector(values, wires) {
  if (!Array.isArray(values) || values.length !== wires) throw new Error("Supply exactly one value per wire.");
  return Array.from(values, (value, i) => integer(value, -999, 999, "Value on wire " + (i + 1)));
}
export const PRESETS = freeze([
  {name: "Three wires", wires: 3, values: [3, 1, 2], comparators: [[1, 2], [2, 3], [1, 2]]},
  {name: "Four wires", wires: 4, values: [4, 1, 3, 2], comparators: [[1, 2], [3, 4], [1, 3], [2, 4], [2, 3]]},
  {name: "Missing last comparator", wires: 4, values: [2, 4, 1, 3], comparators: [[1, 2], [3, 4], [1, 3], [2, 4]]}
]);
export function validateConfiguration(value) {
  fields(value, ["wires", "values", "comparators"], "Configuration");
  const wires = integer(value.wires, 2, MAX_WIRES, "Wire count");
  if (!Array.isArray(value.comparators) || value.comparators.length > MAX_COMPARATORS) {
    throw new Error("Use at most " + MAX_COMPARATORS + " comparators.");
  }
  const comparators = Array.from(value.comparators, (pair, index) => {
    if (!Array.isArray(pair) || pair.length !== 2) throw new Error("Comparator " + (index + 1) + " needs two wires.");
    const a = integer(pair[0], 1, wires, "First wire");
    const b = integer(pair[1], 1, wires, "Second wire");
    if (a >= b) throw new Error("Each comparator must put the lower-numbered wire first.");
    return [a, b];
  });
  return freeze({wires, values: vector(value.values, wires), comparators});
}
function decimal(token, label) {
  if (!/^[+-]?\d+$/.test(token)) throw new Error(label + " needs ordinary signed decimal integers.");
  return Number(token);
}
export function parseDraft(wireText, valueText, comparatorText) {
  if ([wireText, valueText, comparatorText].some(x => typeof x !== "string")) throw new Error("Draft fields must be text.");
  if (wireText.length > 20 || valueText.length > 200 || comparatorText.length > 2000) throw new Error("Draft exceeds the editor limits.");
  const wires = decimal(wireText.trim(), "Wire count");
  const values = valueText.trim().split(/\s+/).map(x => decimal(x, "Values"));
  const trimmed = comparatorText.trim();
  const comparators = trimmed ? trimmed.split(/\r\n|\r|\n/).map((line, i) => {
    const tokens = line.trim().split(/\s+/);
    if (tokens.length !== 2) throw new Error("Comparator line " + (i + 1) + " needs exactly two wire numbers.");
    return tokens.map(x => decimal(x, "Comparator line " + (i + 1)));
  }) : [];
  return validateConfiguration({wires, values, comparators});
}
function inversion(values) {
  for (let i = 1; i < values.length; i++) if (values[i - 1] > values[i]) return [i, i + 1];
  return null;
}
function run(configuration, values) {
  let current = values.slice();
  const input = current.slice(), steps = [];
  configuration.comparators.forEach((pair, index) => {
    const before = current.slice(), [a, b] = pair.map(x => x - 1);
    const swapped = before[a] > before[b];
    if (swapped) [current[a], current[b]] = [current[b], current[a]];
    steps.push({index: index + 1, pair: pair.slice(), before, after: current.slice(), swapped});
  });
  const firstInversion = inversion(current);
  return {input, steps, output: current.slice(), sorted: firstInversion === null, firstInversion};
}
export function traceInput(configuration, values) {
  const checked = validateConfiguration(configuration);
  return freeze(run(checked, vector(values, checked.wires)));
}
export function analyzeNetwork(configuration) {
  const checked = validateConfiguration(configuration);
  const cases = [];
  for (let ordinal = 0; ordinal < 2 ** checked.wires; ordinal++) {
    const input = Array.from({length: checked.wires}, (_, i) => (ordinal >> (checked.wires - i - 1)) & 1);
    cases.push({ordinal, ...run(checked, input)});
  }
  const failures = cases.filter(x => !x.sorted).map(x => x.ordinal);
  return freeze({
    format: "recallweave-sorting-network-observation/1",
    configuration: checked,
    authored: run(checked, checked.values),
    binary: {total: cases.length, passed: cases.length - failures.length, failed: failures.length,
      sortsAll: failures.length === 0, failingOrdinals: failures, cases}
  });
}
export function configurationJSON(configuration) {
  return JSON.stringify(validateConfiguration(configuration), null, 2) + "\n";
}
export function observationJSON(configuration) {
  return JSON.stringify(analyzeNetwork(configuration), null, 2) + "\n";
}
