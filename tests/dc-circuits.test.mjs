import test from 'node:test';
import assert from 'node:assert/strict';
import { CIRCUIT_LIMITS, parseCircuitNumber, compareCircuits, comparisonCSV } from '../src/dc-circuits.mjs';

function near(actual, expected, label = '') {
  assert.ok(Number.isFinite(actual), label + ' must be finite');
  assert.ok(Math.abs(actual - expected) <= 2e-12 * Math.max(1, Math.abs(expected)),
    label + ': expected ' + expected + ', got ' + actual);
}

test('12 V across 100 and 200 ohms agrees with independently worked branch values', () => {
  const result = compareCircuits({ voltage: 12, resistance1: 100, resistance2: 200 });
  const expected = {
    series: [300, 0.04, 0.48, [4, 0.04, 0.16], [8, 0.04, 0.32]],
    parallel: [200 / 3, 0.18, 2.16, [12, 0.12, 1.44], [12, 0.06, 0.72]],
  };
  for (const connection of ['series', 'parallel']) {
    const row = result[connection];
    const [resistance, current, power, ...parts] = expected[connection];
    near(row.equivalentResistance, resistance);
    near(row.sourceCurrent, current);
    near(row.sourcePower, power);
    row.resistors.forEach((part, index) => {
      [part.voltage, part.current, part.power].forEach((value, i) => near(value, parts[index][i]));
    });
  }
});

test('zero voltage has finite equivalent resistance and zero current and power', () => {
  const result = compareCircuits({ voltage: -0, resistance1: 1, resistance2: 1000 });
  assert.equal(Object.is(result.input.voltage, -0), false);
  for (const row of [result.series, result.parallel]) {
    assert.ok(row.equivalentResistance > 0);
    assert.equal(row.sourceCurrent, 0);
    assert.equal(row.sourcePower, 0);
    for (const part of row.resistors) {
      assert.equal(part.voltage, 0);
      assert.equal(part.current, 0);
      assert.equal(part.power, 0);
    }
  }
});

test('charge, loop-voltage and power relationships hold throughout a deterministic input grid', () => {
  for (const voltage of [0, 0.25, 9, 24]) {
    for (const resistance1 of [1, 2.5, 37, 1000]) {
      for (const resistance2 of [1, 7.25, 100, 1000]) {
        const result = compareCircuits({ voltage, resistance1, resistance2 });
        assert.ok(result.series.equivalentResistance > Math.max(resistance1, resistance2));
        assert.ok(result.parallel.equivalentResistance < Math.min(resistance1, resistance2));
        for (const row of [result.series, result.parallel]) {
          const [a, b] = row.resistors;
          near(row.sourceCurrent * row.equivalentResistance, voltage, 'equivalent source drop');
          near(row.sourcePower, a.power + b.power, 'energy balance');
          for (const part of row.resistors) {
            near(part.current * part.resistance, part.voltage, 'Ohmic drop');
            near(part.power, part.current ** 2 * part.resistance, 'resistor dissipation');
          }
          if (row.connection === 'series') {
            near(a.current, b.current, 'unbranched charge flow');
            near(row.sourceCurrent, a.current, 'source charge flow');
            near(a.voltage + b.voltage, voltage, 'loop voltage');
          } else {
            near(a.voltage, voltage, 'first shared node voltage');
            near(b.voltage, voltage, 'second shared node voltage');
            near(a.current + b.current, row.sourceCurrent, 'junction charge flow');
          }
        }
      }
    }
  }
});

test('permuting resistors swaps their values without changing source behavior', () => {
  const normal = compareCircuits({ voltage: 7.5, resistance1: 3, resistance2: 11 });
  const swapped = compareCircuits({ voltage: 7.5, resistance1: 11, resistance2: 3 });
  for (const connection of ['series', 'parallel']) {
    for (const key of ['equivalentResistance', 'sourceCurrent', 'sourcePower']) {
      near(normal[connection][key], swapped[connection][key]);
    }
    for (const key of ['resistance', 'voltage', 'current', 'power']) {
      near(normal[connection].resistors[0][key], swapped[connection].resistors[1][key]);
      near(normal[connection].resistors[1][key], swapped[connection].resistors[0][key]);
    }
  }
});

test('a branch change and a voltage change preserve the stated ideal-source assumptions', () => {
  const original = compareCircuits({ voltage: 12, resistance1: 4, resistance2: 8 });
  const branch = compareCircuits({ voltage: 12, resistance1: 4, resistance2: 16 });
  assert.equal(branch.parallel.resistors[0].current, original.parallel.resistors[0].current);
  near(branch.parallel.resistors[1].current, original.parallel.resistors[1].current / 2);
  assert.ok(branch.series.sourceCurrent < original.series.sourceCurrent);
  const doubled = compareCircuits({ voltage: 24, resistance1: 4, resistance2: 8 });
  for (const connection of ['series', 'parallel']) {
    near(doubled[connection].sourceCurrent, original[connection].sourceCurrent * 2);
    near(doubled[connection].sourcePower, original[connection].sourcePower * 4);
  }
});

test('equal resistors use four times as much total power in parallel at fixed nonzero voltage', () => {
  for (const resistance of [1, 6, 8, 37.5, 1000]) {
    const result = compareCircuits({ voltage: 12, resistance1: resistance, resistance2: resistance });
    near(result.parallel.sourcePower / result.series.sourcePower, 4);
    near(result.series.resistors[0].voltage, 6);
    near(result.parallel.resistors[0].voltage, 12);
  }
});

test('model refuses missing, coerced, nonfinite and out-of-domain parameters', () => {
  const good = { voltage: 12, resistance1: 4, resistance2: 8 };
  for (const value of [undefined, null, [], '12', false]) assert.throws(() => compareCircuits(value), TypeError);
  for (const key of Object.keys(CIRCUIT_LIMITS)) {
    for (const invalid of [undefined, null, '', '12', false, true, NaN, Infinity, -Infinity, {}, []]) {
      assert.throws(() => compareCircuits({ ...good, [key]: invalid }), TypeError);
    }
    const { min, max } = CIRCUIT_LIMITS[key];
    for (const invalid of [min - 0.01, max + 0.01]) {
      assert.throws(() => compareCircuits({ ...good, [key]: invalid }), RangeError);
    }
    compareCircuits({ ...good, [key]: min });
    compareCircuits({ ...good, [key]: max });
  }
});

test('text edits require explicit decimal values and never turn a blank into zero', () => {
  const parse = text => parseCircuitNumber(text, 'Source voltage', 0, 24);
  for (const [text, expected] of [['0', 0], [' -0 ', 0], ['12.5', 12.5], ['.25', 0.25], ['+6', 6], ['2.4e1', 24]]) {
    assert.equal(parse(text), expected);
  }
  for (const text of ['', '  ', '\n\t', '0x10', '1_000', '1/2', '12 V', 'Infinity', 'NaN', '1e309', '1e', '.', null, 0]) {
    assert.throws(() => parse(text), TypeError);
  }
  for (const text of ['-0.01', '24.01']) assert.throws(() => parse(text), RangeError);
});

test('results are independent immutable snapshots of their input parameters', () => {
  const input = { voltage: 12, resistance1: 4, resistance2: 8 };
  const result = compareCircuits(input);
  input.voltage = 0;
  assert.equal(result.input.voltage, 12);
  assert.throws(() => { result.input.voltage = 0; }, TypeError);
  assert.throws(() => { result.series.resistors[0].power = 0; }, TypeError);
  assert.throws(() => result.parallel.resistors.reverse(), TypeError);
});

test('CSV keeps both modes, physical units and full numeric precision', () => {
  const result = compareCircuits({ voltage: 7.25, resistance1: 3, resistance2: 11 });
  const csv = comparisonCSV(result);
  const [header, ...rows] = csv.trimEnd().split('\r\n');
  assert.equal(header.split(',').length, 13);
  assert.equal(rows.length, 2);
  assert.match(header, /source_voltage_V/);
  assert.match(header, /R2_power_W/);
  rows.forEach((line, index) => {
    const cells = line.split(',');
    const row = index === 0 ? result.series : result.parallel;
    assert.equal(cells[0], row.connection);
    assert.deepEqual(cells.slice(1).map(Number), [
      7.25, 3, 11, row.equivalentResistance, row.sourceCurrent, row.sourcePower,
      ...row.resistors.flatMap(part => [part.voltage, part.current, part.power]),
    ]);
  });
  const altered = structuredClone(result);
  altered.series.sourcePower = '=untrusted()';
  assert.equal(comparisonCSV(altered), csv);
  assert.match(csv, /\r\n$/);
});
