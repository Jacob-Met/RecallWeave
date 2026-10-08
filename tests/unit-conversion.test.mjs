import test from 'node:test';
import assert from 'node:assert/strict';
import { UNIT_CATALOG, parseUnitExpression, parseQuantity, convertUnits } from '../src/unit-conversion.mjs';

function exact(value, from, to, result, factor) {
  const conversion = convertUnits(value, from, to);
  assert.equal(conversion.result.exact, result);
  if (factor !== undefined) assert.equal(conversion.factor.exact, factor);
  assert.deepEqual(conversion.from.dimensions, conversion.to.dimensions);
  return conversion;
}

test('linear conversions keep the quantity while changing the numerical value', () => {
  exact('2.75', 'km', 'm', '2750', '1000');
  exact('4500', 'mg', 'g', '9/2', '1/1000');
  exact('7.2', 'μm', 'nm', '7200', '1000');
  exact('-12.5', 'cm', 'm', '-1/8', '1/100');
  exact('0', 'h', 's', '0', '3600');
  exact('2', 't', 'kg', '2000', '1000');
});

test('a prefix scales every powered dimension', () => {
  exact('3', 'cm^2', 'mm^2', '300', '100');
  exact('3', 'cm^2', 'm^2', '3/10000', '1/10000');
  exact('2.5', 'cm^3', 'mm^3', '2500', '1000');
  exact('125', 'cm^3', 'L', '1/8', '1/1000');
  exact('250', 'mL', 'cm^3', '250', '1');
  exact('1', 'L', 'm^3', '1/1000', '1/1000');
});

test('both numerator and denominator scales participate in rates and density', () => {
  exact('72', 'km/h', 'm/s', '20', '5/18');
  exact('2.5', 'g/cm^3', 'kg/m^3', '2500', '1000');
  exact('6', 'L/min', 'cm^3/s', '100', '50/3');
  exact('9', 'km/h^2', 'm/s^2', '1/1440', '1/12960');
});

test('derived units reduce to their stated m/kg/s powers', () => {
  exact('5', 'N', 'kg*m/s^2', '5', '1');
  exact('2', 'kJ', 'N*m', '2000', '1000');
  exact('7', 'mJ', 'J', '7/1000', '1/1000');
  exact('7', 'MJ', 'J', '7000000', '1000000');
  exact('4', 'MJ', 'mJ', '4000000000', '1000000000');
  exact('7', 'Pa', 'kg/(m*s^2)', '7', '1');
  exact('3.5', 'kW', 'J/s', '3500', '1000');
  exact('2', 'MPa', 'N/mm^2', '2', '1');
  assert.deepEqual(parseUnitExpression('W').dimensions, [2, 1, -3]);
});

test('cancellation retains scale even when the resulting dimension is one', () => {
  exact('1', 'm/cm', '1', '100', '100');
  exact('1', '(km/h)/(m/s)', '1', '5/18', '5/18');
  exact('7', 'cm/cm', '1', '7', '1');
  exact('6', '(cm/m)^-2', '1', '60000', '10000');
  assert.deepEqual(parseUnitExpression('m^0').dimensions, [0, 0, 0]);
});

test('division is left-associative and parentheses change denominator grouping', () => {
  assert.deepEqual(parseUnitExpression('kg/m*s').dimensions, [-1, 1, 1]);
  assert.deepEqual(parseUnitExpression('kg/(m*s)').dimensions, [-1, 1, -1]);
  exact('1', 'kg/m/s^2', 'Pa', '1');
  exact('1', '((cm)/(s))^2', 'm^2/s^2', '1/10000');
});

test('Unicode conveniences are explicit and whitespace is not multiplication', () => {
  exact('4', 'cm²', 'mm²', '400');
  exact('4', 'um', 'µm', '4');
  exact('4', 'μm', 'µm', '4');
  exact('4', 'kg · m / s²', 'N', '4');
  exact('1', 's^−2', '1/s^2', '1');
  for (const source of ['m s', 'k g', '2*m', 'kgm', 'cm2', 'KM', 'pa', 'mPa', 'mmin']) {
    assert.throws(() => parseUnitExpression(source), TypeError, source);
  }
});

test('zero does not make incompatible dimensions convertible', () => {
  for (const [from, to] of [['m', 's'], ['m^2', 'm'], ['N', 'J'], ['kg', '1'], ['m/s', 'm/s^2']]) {
    for (const number of ['0', '1']) {
      assert.throws(() => convertUnits(number, from, to), { code: 'INCOMPATIBLE_DIMENSIONS' });
    }
  }
});

test('repeating ratios remain exact and displayed rounding is explicit', () => {
  const speed = exact('1', 'km/h', 'm/s', '5/18', '5/18');
  assert.deepEqual(speed.display, { text: '0.277777777778', rounded: true, significant_digits: 12 });
  const minute = exact('1', 'min', 'h', '1/60', '1/60');
  assert.equal(minute.display.text, '0.0166666666667');
  assert.equal(minute.display.rounded, true);
  const terminating = exact('1', 'm', 'cm', '100');
  assert.equal(terminating.display.rounded, false);
  const tiny = exact('1e-24', 'nm', 'm', '1/1000000000000000000000000000000000');
  assert.equal(tiny.display.text, '1e-33');
  assert.equal(tiny.display.rounded, false);
});

test('large entered integers and small decimal distinctions survive without Number conversion', () => {
  const large = exact('123456789123456789', 'm', 'm', '123456789123456789');
  assert.equal(large.display.text, '1.23456789123e+17');
  assert.equal(large.display.rounded, true);
  const first = exact('1.000000000000000001', 'm', 'm', '1000000000000000001/1000000000000000000');
  assert.equal(first.display.text, '1');
  assert.equal(first.display.rounded, true);
  assert.notEqual(first.result.exact, exact('1', 'm', 'm', '1').result.exact);
  assert.equal(exact('9.999999999999', 'm', 'm', '9999999999999/1000000000000').display.text, '10');
  assert.equal(exact('-9.999999999999', 'm', 'm', '-9999999999999/1000000000000').display.text, '-10');
});

test('quantity parsing requires complete bounded decimal text', () => {
  assert.equal(parseQuantity(' -1.25e+2 ').exact, '-125');
  assert.equal(parseQuantity('.5').exact, '1/2');
  assert.equal(parseQuantity('2.').exact, '2');
  assert.equal(parseQuantity('-0').exact, '0');
  assert.equal(parseQuantity('1e24').exact, '1000000000000000000000000');
  for (const value of ['', ' ', 'NaN', 'Infinity', '1/3', '1,000', '12x', '1e25', '1e-25', '1e024', '1234567890123456789012345', 1, null, {}]) {
    assert.throws(() => parseQuantity(value), TypeError, String(value));
  }
});

test('the unit grammar rejects incomplete, excessive and unsupported expressions', () => {
  for (const value of ['', ' ', 'm/', '/s', '()', '(m', 'm)', 'm**s', 'm^', 'm^2.5', 'm^7', 'm^-7', 'm^2^3', '(((((m)))))', '(m^6)^6', 'm'.repeat(129), Array(25).fill('m').join('*'), '°C', 'K', 'dB', 'Hz', 'constructor', null, {}]) {
    assert.throws(() => parseUnitExpression(value), TypeError, String(value));
  }
  assert.deepEqual(parseUnitExpression('((((m))))').dimensions, [1, 0, 0]);
  assert.deepEqual(parseUnitExpression(Array(24).fill('m').join('*')).dimensions, [24, 0, 0]);
  exact('1', 'm^-6', '1/m^6', '1');
});

test('returned records are immutable JSON with exact rational strings', () => {
  const record = convertUnits('72', 'km/h', 'm/s');
  assert.deepEqual(JSON.parse(JSON.stringify(record)), record);
  assert.throws(() => { record.factor.numerator = '10'; }, TypeError);
  assert.throws(() => { record.from.dimensions[0] = 9; }, TypeError);
  assert.throws(() => { UNIT_CATALOG[1].scale.numerator = '2'; }, TypeError);
  assert.equal(convertUnits('72', 'km/h', 'm/s').result.exact, '20');
});

test('normalized expressions retain every grouping and remain valid within the input bound', () => {
  for (const expression of ['(cm^2)^3', '(m^2)^-1', '(cm^3)^0', '((m/s)^2)^3', '((((m/s))))',
    '  µm · s^−2  ', Array(12).fill('kPa²/kPa²').join('*')]) {
    const original = parseUnitExpression(expression);
    const restored = parseUnitExpression(original.normalized);
    assert.deepEqual(restored.dimensions, original.dimensions, expression);
    assert.deepEqual(restored.scale, original.scale, expression);
    assert.ok(original.normalized.length <= 128);
  }
  assert.equal(parseUnitExpression('(cm^2)^3').normalized, '(cm^2)^3');
});
