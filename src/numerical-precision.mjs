/** Exact arithmetic teaching model for bounded decimal addition/subtraction.
 * No expression evaluation, provider call, measurement model or persistence.
 */
const FORMAT = 'recallweave-numerical-worked/1';
const MAX_TEXT = 128;

function refuse(message, field) {
  const error = new Error(message);
  error.field = field;
  throw error;
}
function absolute(value) { return value < 0n ? -value : value; }
function gcd(a, b) {
  a = absolute(a);
  b = absolute(b);
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}
function ratio(n, d = 1n) {
  if (d === 0n) throw new Error('An exact denominator cannot be zero.');
  if (d < 0n) { n = -n; d = -d; }
  const factor = gcd(n, d);
  return { n: n / factor, d: d / factor };
}
function add(a, b) { return ratio(a.n * b.d + b.n * a.d, a.d * b.d); }
function subtract(a, b) { return ratio(a.n * b.d - b.n * a.d, a.d * b.d); }
function same(a, b) { return a.n === b.n && a.d === b.d; }

function exactDecimal(text, field) {
  if (typeof text !== 'string' || text.length > MAX_TEXT) {
    refuse('Enter a plain decimal with at most 18 whole and 18 fractional digits.', field);
  }
  const value = text.trim();
  if (!/^[+-]?\d{1,18}(?:\.\d{1,18})?$/.test(value)) {
    refuse('Use an optional sign, 1–18 whole digits and at most 18 fractional digits; no exponent, comma or expression.', field);
  }
  const negative = value.startsWith('-');
  const unsigned = /^[+-]/.test(value) ? value.slice(1) : value;
  const [whole, fraction = ''] = unsigned.split('.');
  const n = BigInt(whole + fraction) * (negative ? -1n : 1n);
  return ratio(n, 10n ** BigInt(fraction.length));
}

function binaryValue(value) {
  if (!Number.isFinite(value)) throw new Error('Only finite Number values are supported.');
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setFloat64(0, value, false);
  const bits = view.getBigUint64(0, false);
  const sign = (bits >> 63n) === 0n ? 1n : -1n;
  const exponent = Number((bits >> 52n) & 0x7ffn);
  const tail = bits & ((1n << 52n) - 1n);
  const significand = exponent === 0 ? tail : (1n << 52n) + tail;
  const power = exponent === 0 ? -1074 : exponent - 1023 - 52;
  const exact = power >= 0
    ? ratio(sign * significand * (1n << BigInt(power)))
    : ratio(sign * significand, 1n << BigInt(-power));
  return { exact, bits: bits.toString(16).padStart(16, '0') };
}

function decimalText(value) {
  const sign = value.n < 0n ? '-' : '';
  const magnitude = absolute(value.n);
  let remainder = magnitude % value.d;
  let text = sign + String(magnitude / value.d);
  if (remainder === 0n) return text;
  text += '.';
  // Input decimal denominators and finite binary64 denominators contain only
  // factors 2 and 5. The bound also covers every binary64 subnormal.
  let digits = 0;
  while (remainder !== 0n) {
    if (digits++ >= 1100) throw new Error('Exact decimal expansion exceeded its bound.');
    remainder *= 10n;
    text += String(remainder / value.d);
    remainder %= value.d;
  }
  return text;
}

function publicRatio(value) {
  return {
    numerator: String(value.n),
    denominator: String(value.d),
    fraction: String(value.n) + '/' + String(value.d),
    decimal: decimalText(value),
    isZero: value.n === 0n
  };
}
function numberDisplay(value) { return Object.is(value, -0) ? '-0' : String(value); }
function freeze(value) {
  for (const child of Object.values(value)) {
    if (child && typeof child === 'object' && !Object.isFrozen(child)) freeze(child);
  }
  return Object.freeze(value);
}
function operand(text, field) {
  const intended = exactDecimal(text, field);
  const value = Number(text.trim());
  if (!Number.isFinite(value)) refuse('This input cannot be represented as a finite Number.', field);
  const stored = binaryValue(value);
  return {
    intended, value, stored: stored.exact,
    public: {
      input: text,
      exact: publicRatio(intended),
      stored: publicRatio(stored.exact),
      display: numberDisplay(value),
      bits: stored.bits,
      conversionDiscrepancy: publicRatio(subtract(stored.exact, intended)),
      isInteger: Number.isInteger(value),
      isSafeInteger: Number.isSafeInteger(value),
      isNegativeZero: Object.is(value, -0)
    }
  };
}

/** Compare exact decimal intent, converted operands and the actual operation.
 * The exact reference treats +0 and -0 as the same rational zero; the Number
 * display, bits and isNegativeZero fields retain the sign separately.
 */
export function analyzeDecimalOperation(aText, operation, bText) {
  if (operation !== '+' && operation !== '-') refuse('Choose addition or subtraction.', 'operation');
  const a = operand(aText, 'a');
  const b = operand(bText, 'b');
  const combine = operation === '+' ? add : subtract;
  const intended = combine(a.intended, b.intended);
  const converted = combine(a.stored, b.stored);
  const actualNumber = operation === '+' ? a.value + b.value : a.value - b.value;
  const actual = binaryValue(actualNumber);
  const conversion = subtract(converted, intended);
  const arithmetic = subtract(actual.exact, converted);
  const total = subtract(actual.exact, intended);
  if (!same(add(conversion, arithmetic), total)) throw new Error('Exact discrepancy identity failed.');
  return freeze({
    format: FORMAT,
    operation,
    a: a.public,
    b: b.public,
    result: {
      decimalIntent: publicRatio(intended),
      storedOperandArithmetic: publicRatio(converted),
      actual: publicRatio(actual.exact),
      display: numberDisplay(actualNumber),
      bits: actual.bits,
      conversionContribution: publicRatio(conversion),
      arithmeticContribution: publicRatio(arithmetic),
      totalDiscrepancy: publicRatio(total),
      exactMatch: total.n === 0n,
      isInteger: Number.isInteger(actualNumber),
      isSafeInteger: Number.isSafeInteger(actualNumber),
      isNegativeZero: Object.is(actualNumber, -0)
    },
    identityVerified: true,
    interpretation: 'Exact decimal text is the arithmetic reference, not measured truth. The signed contributions may reinforce or cancel. Safe-integer status describes the guaranteed interval, not whether every particular outside value is inexact.'
  });
}

export function serializeWorkedExample(aText, operation, bText) {
  return JSON.stringify(analyzeDecimalOperation(aText, operation, bText), null, 2) + '\n';
}

export const PRECISION_PRESETS = Object.freeze([
  Object.freeze({ id: 'decimal-sum', title: 'Decimal sum', a: '0.1', operation: '+', b: '0.2' }),
  Object.freeze({ id: 'binary-fractions', title: 'Exact binary fractions', a: '0.125', operation: '+', b: '0.25' }),
  Object.freeze({ id: 'conversion-cancellation', title: 'Conversion before subtraction', a: '1.0000000000000001', operation: '-', b: '1' }),
  Object.freeze({ id: 'lost-integer-step', title: 'A missing integer step', a: '9007199254740992', operation: '+', b: '1' }),
  Object.freeze({ id: 'canceling-contributions', title: 'Signed contributions that cancel', a: '0.1', operation: '+', b: '0.4' }),
  Object.freeze({ id: 'exact-unsafe-sum', title: 'An exact sum outside the safe range', a: '9007199254740992', operation: '+', b: '2' })
]);
