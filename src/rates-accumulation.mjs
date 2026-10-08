// Exact rational calculations for the explicitly authored, continuous linear-rate model.
const abs = n => n < 0n ? -n : n;
function rational(n, d = 1n) {
  if (d === 0n) throw new Error('A rational denominator cannot be zero.');
  if (d < 0n) { n = -n; d = -d; }
  let a = abs(n), b = d;
  while (b) [a, b] = [b, a % b];
  return { n: n / a, d: d / a };
}
const add = (a, b) => rational(a.n * b.d + b.n * a.d, a.d * b.d);
const sub = (a, b) => rational(a.n * b.d - b.n * a.d, a.d * b.d);
const mul = (a, b) => rational(a.n * b.n, a.d * b.d);
const div = (a, b) => rational(a.n * b.d, a.d * b.n);
const mag = a => rational(abs(a.n), a.d);
const compare = (a, b) => a.n * b.d < b.n * a.d ? -1 : a.n * b.d > b.n * a.d ? 1 : 0;
const zero = rational(0n);
const two = rational(2n);
function value(a) {
  return { fraction: a.n + '/' + a.d, approximate: Number(a.n) / Number(a.d) };
}
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function tenths(text, label, signed = false) {
  const pattern = signed ? /^-?(?:0|[1-9]\d{0,2})(?:\.\d)?$/ : /^(?:0|[1-9]\d{0,2})(?:\.\d)?$/;
  if (typeof text !== 'string' || text.length > 16 || !pattern.test(text.trim())) {
    throw new Error(label + ' must be a plain decimal with at most one decimal place.');
  }
  const raw = text.trim(), negative = raw.startsWith('-'), parts = raw.replace('-', '').split('.');
  return rational((negative ? -1n : 1n) * (BigInt(parts[0]) * 10n + BigInt(parts[1] || '0')), 10n);
}
function parse(source) {
  if (typeof source !== 'string' || source.length > 2048) throw new Error('Use a curve of at most 2,048 characters.');
  const lines = source.split(/\r?\n/).map((text, index) => ({ text: text.trim(), line: index + 1 })).filter(row => row.text);
  if (!lines.length || lines[0].text !== 'time_s,velocity_m_s') throw new Error('The first line must be time_s,velocity_m_s.');
  if (lines.length < 3 || lines.length > 9) throw new Error('Use 2–8 points after the header.');
  const points = lines.slice(1).map(({ text, line }) => {
    const fields = text.split(',').map(field => field.trim());
    if (fields.length !== 2 || !/^(?:0|[1-9]\d{0,2})$/.test(fields[0])) throw new Error('Line ' + line + ': time must be an integer from 0 through 120.');
    const t = rational(BigInt(fields[0]));
    if (compare(t, rational(120n)) > 0) throw new Error('Line ' + line + ': time exceeds 120 seconds.');
    const v = tenths(fields[1], 'Line ' + line + ': velocity', true);
    if (compare(mag(v), rational(50n)) > 0) throw new Error('Line ' + line + ': velocity must lie between −50 and 50 m/s.');
    return { t, v, line };
  });
  if (points[0].t.n !== 0n) throw new Error('The first point must be at 0 seconds.');
  for (let i = 1; i < points.length; i++) {
    if (compare(points[i].t, points[i - 1].t) <= 0) throw new Error('Point times must increase strictly.');
  }
  return points;
}
function areas(duration, first, last) {
  const signed = div(mul(duration, add(first, last)), two);
  const distance = first.n * last.n >= 0n ? mag(signed)
    : div(mul(duration, add(mul(first, first), mul(last, last))), mul(two, mag(sub(last, first))));
  return { signed, distance };
}

export const RATE_PRESETS = freeze([
  { id: 'return', title: 'Out and back', source: 'time_s,velocity_m_s\n0,0\n2,4\n4,0\n6,-4\n8,0' },
  { id: 'crossing', title: 'One interval crosses zero', source: 'time_s,velocity_m_s\n0,3\n4,-1' },
  { id: 'steady', title: 'Steady forward motion', source: 'time_s,velocity_m_s\n0,2.5\n6,2.5' },
  { id: 'rest', title: 'Rest, accelerate, cruise', source: 'time_s,velocity_m_s\n0,0\n2,0\n5,3\n8,3' },
  { id: 'negative', title: 'Entirely backward', source: 'time_s,velocity_m_s\n0,-2\n3,-2\n5,0' },
  { id: 'touch', title: 'Touch zero without reversing', source: 'time_s,velocity_m_s\n0,2\n2,0\n4,2' }
]);

export function analyzeMotion(source, selectedTime) {
  const points = parse(source);
  const t = tenths(selectedTime, 'Inspection time');
  const end = points.at(-1).t;
  if (compare(t, end) > 0) throw new Error('Inspection time must be within this curve.');
  let displacement = zero, distance = zero, rate = points[0].v;
  const slopes = [], segments = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const duration = sub(b.t, a.t), change = sub(b.v, a.v), slope = div(change, duration);
    slopes.push(slope);
    const full = areas(duration, a.v, b.v);
    const until = compare(t, a.t) <= 0 ? a.t : compare(t, b.t) >= 0 ? b.t : t;
    const covered = sub(until, a.t);
    const last = add(a.v, mul(slope, covered));
    const prefix = areas(covered, a.v, last);
    displacement = add(displacement, prefix.signed);
    distance = add(distance, prefix.distance);
    if (compare(t, a.t) >= 0 && compare(t, b.t) <= 0) rate = last;
    const crossing = a.v.n * b.v.n < 0n ? sub(a.t, div(a.v, slope)) : null;
    segments.push({
      index: i, from: value(a.t), to: value(b.t), firstVelocity: value(a.v), lastVelocity: value(b.v),
      acceleration: value(slope), zeroCrossing: crossing ? value(crossing) : null,
      fullDisplacement: value(full.signed), fullDistance: value(full.distance),
      coveredUntil: value(until), coveredDuration: value(covered),
      coveredDisplacement: value(prefix.signed), coveredDistance: value(prefix.distance),
      coverage: covered.n === 0n ? 'not-started' : compare(until, b.t) === 0 ? 'complete' : 'partial'
    });
  }
  let acceleration;
  if (t.n === 0n) acceleration = { kind: 'start-boundary', value: null, left: null, right: value(slopes[0]) };
  else if (compare(t, end) === 0) acceleration = { kind: 'end-boundary', value: null, left: value(slopes.at(-1)), right: null };
  else {
    const knot = points.findIndex(p => compare(p.t, t) === 0);
    if (knot > 0) {
      const left = slopes[knot - 1], right = slopes[knot];
      acceleration = { kind: compare(left, right) === 0 ? 'defined' : 'corner',
        value: compare(left, right) === 0 ? value(left) : null, left: value(left), right: value(right) };
    } else {
      const index = points.findIndex(point => compare(t, point.t) < 0) - 1;
      acceleration = { kind: 'defined', value: value(slopes[index]), left: value(slopes[index]), right: value(slopes[index]) };
    }
  }
  return freeze({
    format: 'recallweave-rates-accumulation/1',
    model: 'Continuous piecewise-linear velocity; time in seconds, velocity in m/s; initial displacement 0 m.',
    source, time: value(t), endTime: value(end),
    velocity: value(rate), displacement: value(displacement), distance: value(distance),
    averageVelocity: t.n === 0n ? null : value(div(displacement, t)), acceleration,
    points: points.map(p => ({ time: value(p.t), velocity: value(p.v), sourceLine: p.line })),
    segments
  });
}

export function serializeMotion(source, selectedTime) {
  return JSON.stringify(analyzeMotion(source, selectedTime), null, 2) + '\n';
}
