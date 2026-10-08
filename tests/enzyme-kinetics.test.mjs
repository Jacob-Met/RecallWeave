import test from 'node:test';
import assert from 'node:assert/strict';
import {
  KINETICS_BASELINE, KINETICS_LIMITS, KINETICS_MODES,
  parseKineticsNumber, compareKinetics, kineticsCurve, kineticsCSV,
} from '../src/enzyme-kinetics.mjs';

function near(actual, expected, label = '') {
  assert.ok(Number.isFinite(actual), label + ' must be finite');
  assert.ok(Math.abs(actual - expected) <= 2e-12 * Math.max(1, Math.abs(expected)),
    label + ': expected ' + expected + ', got ' + actual);
}

test('the fixed uninhibited enzyme reproduces the existing course example', () => {
  assert.deepEqual(KINETICS_BASELINE, { vmax: 10, km: 1 });
  const points = [1, 4, 16].map(substrate => compareKinetics({ substrate, inhibitorRatio: 3 }).cases.uninhibited.rate);
  [5, 8, 160 / 17].forEach((expected, i) => near(points[i], expected));
  assert.deepEqual(points.map(value => value.toFixed(1)), ['5.0', '8.0', '9.4']);
});

test('one independently worked comparison distinguishes rate, fraction and apparent parameters', () => {
  const result = compareKinetics({ substrate: 4, inhibitorRatio: 3 });
  const expected = {
    uninhibited: [8, 1, 10, 1],
    competitive: [5, 0.625, 10, 4],
    pure_noncompetitive: [2, 0.25, 2.5, 1],
  };
  for (const [id, values] of Object.entries(expected)) {
    ['rate', 'relativeRate', 'limitingRate', 'apparentKm'].forEach((key, i) => near(result.cases[id][key], values[i], id + '.' + key));
  }
});

test('zero substrate yields zero rates and undefined fractions, including with zero inhibitor', () => {
  for (const inhibitorRatio of [0, 3, 8]) {
    const result = compareKinetics({ substrate: -0, inhibitorRatio });
    assert.equal(Object.is(result.input.substrate, -0), false);
    for (const row of Object.values(result.cases)) {
      assert.equal(row.rate, 0);
      assert.equal(row.relativeRate, null);
      assert.ok(row.limitingRate > 0);
      assert.ok(row.apparentKm > 0);
    }
  }
});

test('zero inhibitor makes all cases coincide; each Km locates its own half limiting rate', () => {
  for (const substrate of [0, 0.1, 1, 4, 16, 32]) {
    const same = compareKinetics({ substrate, inhibitorRatio: 0 }).cases;
    for (const key of ['rate', 'relativeRate', 'limitingRate', 'apparentKm']) {
      assert.equal(same.competitive[key], same.uninhibited[key]);
      assert.equal(same.pure_noncompetitive[key], same.uninhibited[key]);
    }
  }
  for (const inhibitorRatio of [0, 0.5, 3, 8]) {
    const reference = compareKinetics({ substrate: 1, inhibitorRatio });
    for (const mode of KINETICS_MODES) {
      const row = reference.cases[mode.id];
      const half = compareKinetics({ substrate: row.apparentKm, inhibitorRatio }).cases[mode.id];
      near(half.rate, row.limitingRate / 2, mode.id + ' half limit');
    }
  }
});

test('adding substrate reduces competitive fractional loss while the pure special case stays proportional', () => {
  const low = compareKinetics({ substrate: 1, inhibitorRatio: 3 }).cases;
  const high = compareKinetics({ substrate: 16, inhibitorRatio: 3 }).cases;
  near(low.competitive.relativeRate, 0.4);
  near(high.competitive.relativeRate, 0.85);
  near(low.pure_noncompetitive.relativeRate, 0.25);
  near(high.pure_noncompetitive.relativeRate, 0.25);
  for (const id of ['competitive', 'pure_noncompetitive']) assert.ok(high[id].rate > low[id].rate);
});

test('a deterministic domain grid preserves saturation, ordering and fixed baseline parameters', () => {
  for (const inhibitorRatio of [0, 0.25, 1, 3, 8]) {
    let previous = null;
    for (const substrate of [0, 0.1, 0.25, 1, 4, 16, 32]) {
      const { cases } = compareKinetics({ substrate, inhibitorRatio });
      near(cases.uninhibited.limitingRate, 10);
      near(cases.uninhibited.apparentKm, 1);
      near(cases.competitive.limitingRate, 10);
      near(cases.pure_noncompetitive.apparentKm, 1);
      assert.ok(cases.pure_noncompetitive.rate <= cases.competitive.rate + 1e-12);
      assert.ok(cases.competitive.rate <= cases.uninhibited.rate + 1e-12);
      for (const mode of KINETICS_MODES) {
        const row = cases[mode.id];
        assert.ok(row.rate >= 0 && row.rate < row.limitingRate, 'finite substrate stays below the limit');
        if (substrate > 0) {
          assert.ok(row.relativeRate > 0 && row.relativeRate <= 1);
          near(cases.pure_noncompetitive.relativeRate, 1 / (1 + inhibitorRatio));
        }
        if (previous) assert.ok(row.rate > previous[mode.id].rate);
      }
      previous = cases;
    }
  }
});

test('invalid or coerced inputs and incomplete text never silently reuse a prior comparison', () => {
  const good = { substrate: 4, inhibitorRatio: 3 };
  for (const value of [undefined, null, false, '4', []]) assert.throws(() => compareKinetics(value), TypeError);
  for (const key of Object.keys(KINETICS_LIMITS)) {
    for (const value of [undefined, null, '', '4', false, true, NaN, Infinity, -Infinity, {}, []]) {
      assert.throws(() => compareKinetics({ ...good, [key]: value }), TypeError);
    }
    for (const value of [-0.001, KINETICS_LIMITS[key].max + 0.001]) {
      assert.throws(() => compareKinetics({ ...good, [key]: value }), RangeError);
    }
  }
  for (const text of ['', ' ', '1e', '0x10', '1/2', '3 units', '.', 'NaN', 'Infinity', null, 3]) {
    assert.throws(() => parseKineticsNumber(text, 'substrate'), TypeError);
  }
  assert.throws(() => parseKineticsNumber('1e-400', 'substrate'), RangeError);
  for (const [text, expected] of [['0', 0], [' -0 ', 0], ['.25', 0.25], ['+4', 4], ['1.6e1', 16], ['32', 32]]) {
    assert.equal(parseKineticsNumber(text, 'substrate'), expected);
  }
  assert.throws(() => parseKineticsNumber('32.01', 'substrate'), RangeError);
});

test('snapshots are independent and the sampled curve includes exact endpoints and course points', () => {
  const input = { substrate: 4, inhibitorRatio: 3 };
  const result = compareKinetics(input);
  input.substrate = 0;
  assert.equal(result.input.substrate, 4);
  assert.throws(() => { result.cases.competitive.rate = 99; }, TypeError);
  assert.throws(() => { result.input.inhibitorRatio = 0; }, TypeError);
  const curve = kineticsCurve(3);
  assert.equal(curve.length, 129);
  assert.equal(curve[0].input.substrate, 0);
  assert.equal(curve.at(-1).input.substrate, 32);
  near(curve[4].cases.uninhibited.rate, 5);
  near(curve[16].cases.competitive.rate, 5);
  near(curve[64].cases.pure_noncompetitive.rate, 40 / 17);
  assert.throws(() => curve.push(result), TypeError);
});

test('CSV exports the current point, complete sample grid, units and explicit undefined cells', () => {
  const csv = kineticsCSV({ substrate: 4, inhibitorRatio: 3 });
  const [header, ...lines] = csv.trimEnd().split('\r\n');
  const keys = header.split(',');
  const rows = lines.map(line => Object.fromEntries(line.split(',').map((value, i) => [keys[i], value])));
  assert.equal(rows.length, 390);
  assert.deepEqual(rows.slice(0, 3).map(row => row.row_type), ['current', 'current', 'current']);
  assert.deepEqual(rows.slice(0, 3).map(row => Number(row.initial_rate_product_units_per_min)), [8, 5, 2]);
  assert.deepEqual(rows.slice(0, 3).map(row => Number(row.rate_fraction_of_uninhibited)), [1, 0.625, 0.25]);
  assert.ok(rows.every(row => Number(row.baseline_Vmax_product_units_per_min) === 10 && Number(row.baseline_Km_concentration_units) === 1));
  const zero = rows.filter(row => row.substrate_concentration_units === '0');
  assert.equal(zero.length, 3);
  assert.ok(zero.every(row => row.rate_fraction_of_uninhibited === '' && row.initial_rate_product_units_per_min === '0'));
  const s16 = rows.find(row => row.model === 'uninhibited' && row.substrate_concentration_units === '16');
  assert.equal(Number(s16.initial_rate_product_units_per_min), 160 / 17);
  assert.ok(csv.endsWith('\r\n'));
  assert.throws(() => kineticsCSV({ substrate: '=1+1', inhibitorRatio: 3 }), TypeError);
  assert.equal(kineticsCSV({ substrate: 4, inhibitorRatio: 3, rate: '=injected()' }), csv);
});

test('positive subnormal substrate retains analytic fractions instead of a quotient of quantized rates', () => {
  const substrate = parseKineticsNumber('5e-324', 'substrate');
  assert.equal(substrate, Number.MIN_VALUE);
  for (const [inhibitorRatio, expected] of [[0, 1], [3, 0.25], [8, 1 / 9]]) {
    const cases = compareKinetics({ substrate, inhibitorRatio }).cases;
    assert.equal(cases.uninhibited.relativeRate, 1);
    assert.equal(cases.competitive.relativeRate, expected);
    assert.equal(cases.pure_noncompetitive.relativeRate, expected);
    assert.ok(Object.values(cases).every(row => row.rate > 0));
  }
  const rows = kineticsCSV({ substrate, inhibitorRatio: 3 }).trimEnd().split('\r\n').slice(1, 4);
  assert.deepEqual(rows.map(row => Number(row.split(',').at(-1))), [1, 0.25, 0.25]);
});
