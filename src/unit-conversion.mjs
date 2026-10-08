/** Exact multiplicative unit conversions for the optional teaching explorer.
 * Dimensions are ordered length (m), mass (kg), time (s). This is a bounded
 * unit-expression grammar, not a general expression evaluator or quantity model.
 */

const MAX_EXPRESSION = 128;
const MAX_FACTORS = 24;
const MAX_DEPTH = 4;
const MAX_POWER = 6;
const MAX_DIMENSION = 24;
const MAX_RATIONAL_DIGITS = 256;

function fail(message, code = 'INVALID_INPUT') {
  const error = new TypeError(message);
  error.code = code;
  throw error;
}

function gcd(a, b) {
  a = a < 0n ? -a : a;
  while (b) [a, b] = [b, a % b];
  return a;
}

function rational(numerator, denominator = 1n) {
  if (denominator === 0n) fail('A scale denominator cannot be zero.');
  if (denominator < 0n) {
    numerator = -numerator;
    denominator = -denominator;
  }
  const common = gcd(numerator, denominator);
  const result = { n: numerator / common, d: denominator / common };
  if (result.n.toString().replace('-', '').length > MAX_RATIONAL_DIGITS ||
      result.d.toString().length > MAX_RATIONAL_DIGITS) {
    fail('This expression exceeds the explorer’s exact-number size limit.');
  }
  return result;
}

function multiply(a, b) { return rational(a.n * b.n, a.d * b.d); }
function divide(a, b) { return rational(a.n * b.d, a.d * b.n); }
function power(a, exponent) {
  const p = BigInt(Math.abs(exponent));
  return exponent < 0 ? rational(a.d ** p, a.n ** p) : rational(a.n ** p, a.d ** p);
}

function publicRational(value) {
  const numerator = String(value.n);
  const denominator = String(value.d);
  return Object.freeze({ numerator, denominator,
    exact: denominator === '1' ? numerator : numerator + '/' + denominator });
}

// Definitions: BIPM SI Brochure, 9th edition v4.01 (June 2026), sections 2–4:
// https://www.bipm.org/en/publications/si-brochure
// Only exact defining scale relations are listed. Symbols remain case-sensitive;
// prefixes are deliberately not guessed for arbitrary unit names.
const definitions = [
  ['1', 'one (dimensionless)', [0, 0, 0], 1n, 1n],
  ['m', 'metre', [1, 0, 0], 1n, 1n],
  ['km', 'kilometre', [1, 0, 0], 1000n, 1n],
  ['cm', 'centimetre', [1, 0, 0], 1n, 100n],
  ['mm', 'millimetre', [1, 0, 0], 1n, 1000n],
  ['μm', 'micrometre', [1, 0, 0], 1n, 1000000n],
  ['nm', 'nanometre', [1, 0, 0], 1n, 1000000000n],
  ['kg', 'kilogram', [0, 1, 0], 1n, 1n],
  ['g', 'gram', [0, 1, 0], 1n, 1000n],
  ['mg', 'milligram', [0, 1, 0], 1n, 1000000n],
  ['t', 'tonne', [0, 1, 0], 1000n, 1n],
  ['s', 'second', [0, 0, 1], 1n, 1n],
  ['ms', 'millisecond', [0, 0, 1], 1n, 1000n],
  ['min', 'minute', [0, 0, 1], 60n, 1n],
  ['h', 'hour', [0, 0, 1], 3600n, 1n],
  ['L', 'litre', [3, 0, 0], 1n, 1000n],
  ['mL', 'millilitre', [3, 0, 0], 1n, 1000000n],
  ['N', 'newton', [1, 1, -2], 1n, 1n],
  ['kN', 'kilonewton', [1, 1, -2], 1000n, 1n],
  ['Pa', 'pascal', [-1, 1, -2], 1n, 1n],
  ['kPa', 'kilopascal', [-1, 1, -2], 1000n, 1n],
  ['MPa', 'megapascal', [-1, 1, -2], 1000000n, 1n],
  ['J', 'joule', [2, 1, -2], 1n, 1n],
  ['mJ', 'millijoule', [2, 1, -2], 1n, 1000n],
  ['kJ', 'kilojoule', [2, 1, -2], 1000n, 1n],
  ['MJ', 'megajoule', [2, 1, -2], 1000000n, 1n],
  ['W', 'watt', [2, 1, -3], 1n, 1n],
  ['kW', 'kilowatt', [2, 1, -3], 1000n, 1n],
];

const units = new Map(definitions.map(([symbol, name, dimensions, n, d]) =>
  [symbol, { symbol, name, dimensions, scale: rational(n, d) }]));

export const UNIT_CATALOG = Object.freeze([...units.values()].map(unit => Object.freeze({
  symbol: unit.symbol, name: unit.name,
  dimensions: Object.freeze([...unit.dimensions]), scale: publicRational(unit.scale),
})));

function checkDimensions(dimensions) {
  if (dimensions.some(value => Math.abs(value) > MAX_DIMENSION)) {
    fail('The combined power of a base dimension must stay between −24 and 24.');
  }
  return dimensions.map(value => value === 0 ? 0 : value);
}

function combine(left, right, division) {
  const sign = division ? -1 : 1;
  const dimensions = checkDimensions(left.dimensions.map((v, i) => v + sign * right.dimensions[i]));
  const terms = new Map(left.terms);
  for (const [symbol, exponent] of right.terms) {
    terms.set(symbol, (terms.get(symbol) || 0) + sign * exponent);
  }
  return { dimensions, terms,
    scale: division ? divide(left.scale, right.scale) : multiply(left.scale, right.scale),
  };
}

function parseInternal(raw) {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > MAX_EXPRESSION) {
    fail('Enter a unit expression of 1–128 characters.');
  }
  // These are spelling conveniences, never implicit multiplication. In
  // particular, whitespace between m and s must not silently become ms.
  // Keep the admitted operator grouping in the displayed form. Rebuilding a
  // power as plain text could turn (cm^2)^3 into the different text cm^2^3.
  // Retaining ²/³ also keeps this form within the original character bound.
  const normalized = raw.trim().replaceAll('µ', 'μ').replace(/\bum\b/gu, 'μm')
    .replaceAll('·', '*').replaceAll('−', '-').replace(/\s+/gu, ' ');
  const text = normalized.replaceAll('²', '^2').replaceAll('³', '^3');
  let position = 0;
  let factors = 0;
  const whitespace = () => { while (/\s/u.test(text[position] || '') && position < text.length) position++; };
  function factor(depth) {
    whitespace();
    let result;
    if (text[position] === '(') {
      if (depth >= MAX_DEPTH) fail('Use at most four levels of parentheses.');
      position++;
      result = expression(depth + 1);
      whitespace();
      if (text[position] !== ')') fail('Close each parenthesis in the unit expression.');
      position++;
    } else {
      const match = /^(?:[A-Za-zμ]+|1)/u.exec(text.slice(position));
      if (!match) fail('Expected a listed unit or a parenthesized unit expression.');
      position += match[0].length;
      const symbol = match[0] === 'um' ? 'μm' : match[0];
      const unit = units.get(symbol);
      if (!unit) fail('Unsupported unit “' + match[0] + '”. Choose a listed, case-sensitive symbol.', 'UNSUPPORTED_UNIT');
      if (++factors > MAX_FACTORS) fail('Use at most 24 unit factors.');
      result = { dimensions: [...unit.dimensions],
        scale: unit.scale, terms: new Map(symbol === '1' ? [] : [[symbol, 1]]) };
    }
    whitespace();
    if (text[position] === '^') {
      position++;
      whitespace();
      const match = /^[+-]?\d+/u.exec(text.slice(position));
      if (!match || match[0].length > 3) fail('Use whole powers from −6 through 6.');
      const exponent = Number(match[0]);
      if (!Number.isInteger(exponent) || Math.abs(exponent) > MAX_POWER) {
        fail('Use whole powers from −6 through 6.');
      }
      position += match[0].length;
      const dimensions = checkDimensions(result.dimensions.map(v => v * exponent));
      result = { dimensions, scale: power(result.scale, exponent),
        terms: new Map([...result.terms].map(([symbol, value]) => [symbol, value * exponent])) };
    }
    return result;
  }
  function expression(depth) {
    let result = factor(depth);
    while (true) {
      whitespace();
      const operator = text[position];
      if (operator !== '*' && operator !== '/') break;
      position++;
      result = combine(result, factor(depth), operator === '/');
    }
    return result;
  }
  const result = expression(0);
  whitespace();
  if (position !== text.length) {
    fail('Use explicit * or / between units, ^ for a whole power, and parentheses for grouping.');
  }
  return { ...result, input: raw, normalized, factors };
}

function publicUnit(unit) {
  return Object.freeze({ input: unit.input, normalized: unit.normalized,
    dimensions: Object.freeze([...unit.dimensions]), scale: publicRational(unit.scale),
    terms: Object.freeze([...unit.terms].filter(([, exponent]) => exponent !== 0).map(([symbol, exponent]) =>
      Object.freeze({ symbol, exponent, scale: publicRational(power(units.get(symbol).scale, exponent)),
        dimensions: Object.freeze(units.get(symbol).dimensions.map(value => value * exponent || 0)) }))),
  });
}

export function parseUnitExpression(text) { return publicUnit(parseInternal(text)); }

function parseQuantityInternal(text) {
  if (typeof text !== 'string' || text.length > 64) fail('Enter a decimal number, with at most 24 digits.');
  const match = /^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:[eE]([+-]?\d{1,2}))?$/u.exec(text.trim());
  if (!match) fail('Enter a decimal number such as 2.5 or 1e-3; no commas or fractions.');
  const whole = match[2] || '';
  const fraction = match[3] ?? match[4] ?? '';
  if (whole.length + fraction.length > 24) fail('Use at most 24 digits in the quantity.');
  const exponent = Number(match[5] || 0);
  if (Math.abs(exponent) > 24) fail('Use a scientific-notation exponent from −24 through 24.');
  let n = BigInt((whole + fraction) || '0');
  if (match[1] === '-') n = -n;
  const places = fraction.length - exponent;
  return places >= 0 ? rational(n, 10n ** BigInt(places)) : rational(n * 10n ** BigInt(-places));
}

export function parseQuantity(text) { return publicRational(parseQuantityInternal(text)); }

// Produce 12 significant digits with integer rounding. Small nonzero results
// stay nonzero in scientific notation; the exact rational is always separate.
function displayRational(value) {
  if (value.n === 0n) return Object.freeze({ text: '0', rounded: false, significant_digits: 12 });
  const negative = value.n < 0n;
  const n = negative ? -value.n : value.n;
  const d = value.d;
  let exponent = n.toString().length - d.toString().length;
  if (exponent >= 0 ? n < d * 10n ** BigInt(exponent) : n * 10n ** BigInt(-exponent) < d) exponent--;
  const places = 11 - exponent;
  const scaledN = places >= 0 ? n * 10n ** BigInt(places) : n;
  const scaledD = places >= 0 ? d : d * 10n ** BigInt(-places);
  let quotient = scaledN / scaledD;
  const remainder = scaledN % scaledD;
  if (remainder * 2n >= scaledD) quotient++;
  if (quotient.toString().length > 12) { quotient /= 10n; exponent++; }
  const digits = quotient.toString().padStart(12, '0');
  let text;
  if (exponent >= -6 && exponent < 12) {
    const index = exponent + 1;
    text = index <= 0 ? '0.' + '0'.repeat(-index) + digits
      : digits.slice(0, index) + (index < digits.length ? '.' + digits.slice(index) : '');
    if (text.includes('.')) text = text.replace(/0+$/u, '').replace(/\.$/u, '');
  } else {
    const rest = digits.slice(1).replace(/0+$/u, '');
    text = digits[0] + (rest ? '.' + rest : '') + 'e' + (exponent >= 0 ? '+' : '') + exponent;
  }
  return Object.freeze({ text: (negative ? '-' : '') + text,
    rounded: remainder !== 0n, significant_digits: 12 });
}

export function convertUnits(valueText, fromText, toText) {
  const value = parseQuantityInternal(valueText);
  const from = parseInternal(fromText);
  const to = parseInternal(toText);
  if (from.dimensions.some((exponent, index) => exponent !== to.dimensions[index])) {
    fail('These units describe different dimensions. A scale factor cannot convert between them.', 'INCOMPATIBLE_DIMENSIONS');
  }
  const factor = divide(from.scale, to.scale);
  const result = multiply(value, factor);
  return Object.freeze({ format: 'recallweave-unit-conversion/1',
    input: Object.freeze({ value: valueText, from: fromText, to: toText }),
    quantity: publicRational(value), from: publicUnit(from), to: publicUnit(to),
    factor: publicRational(factor), result: publicRational(result), display: displayRational(result),
    interpretation: 'Exact arithmetic for the entered number and listed unit definitions. No measurement uncertainty or physical-law validation is inferred.',
  });
}
