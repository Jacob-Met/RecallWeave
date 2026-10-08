/** Ideal, steady two-resistor DC circuits. Units are volts, ohms, amperes and watts. */
export const CIRCUIT_LIMITS = Object.freeze({
  voltage: Object.freeze({ min: 0, max: 24, label: 'Source voltage' }),
  resistance1: Object.freeze({ min: 1, max: 1000, label: 'R1 resistance' }),
  resistance2: Object.freeze({ min: 1, max: 1000, label: 'R2 resistance' }),
});

function boundedNumber(value, label, min, max) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(label + ' must be a finite number.');
  }
  if (value < min || value > max) {
    throw new RangeError(label + ' must be from ' + min + ' to ' + max + '.');
  }
  return value === 0 ? 0 : value;
}

/** Parse an explicit decimal edit without coercing an empty field to zero. */
export function parseCircuitNumber(text, label, min, max) {
  if (typeof text !== 'string' || !text.trim()) {
    throw new TypeError('Enter ' + label.toLowerCase() + '.');
  }
  const trimmed = text.trim();
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(trimmed)) {
    throw new TypeError(label + ' must be a decimal number.');
  }
  return boundedNumber(Number(trimmed), label, min, max);
}

function resistor(id, resistance, voltage, current) {
  return Object.freeze({ id, resistance, voltage, current, power: voltage * current });
}

function circuit(connection, equivalentResistance, voltage, sourceCurrent, resistors) {
  return Object.freeze({
    connection, equivalentResistance, sourceCurrent,
    sourcePower: voltage * sourceCurrent,
    resistors: Object.freeze(resistors),
  });
}

/** Both connections use the same ideal voltage source and fixed positive resistances. */
export function compareCircuits(parameters) {
  if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters)) {
    throw new TypeError('Provide source voltage and both resistances.');
  }
  const input = {};
  for (const [key, limit] of Object.entries(CIRCUIT_LIMITS)) {
    input[key] = boundedNumber(parameters[key], limit.label, limit.min, limit.max);
  }
  Object.freeze(input);
  const { voltage, resistance1, resistance2 } = input;
  const seriesResistance = resistance1 + resistance2;
  const seriesCurrent = voltage / seriesResistance;
  const parallelCurrent1 = voltage / resistance1;
  const parallelCurrent2 = voltage / resistance2;

  return Object.freeze({
    input,
    series: circuit('series', seriesResistance, voltage, seriesCurrent, [
      resistor('R1', resistance1, seriesCurrent * resistance1, seriesCurrent),
      resistor('R2', resistance2, seriesCurrent * resistance2, seriesCurrent),
    ]),
    parallel: circuit('parallel', 1 / (1 / resistance1 + 1 / resistance2), voltage,
      parallelCurrent1 + parallelCurrent2, [
        resistor('R1', resistance1, voltage, parallelCurrent1),
        resistor('R2', resistance2, voltage, parallelCurrent2),
      ]),
  });
}

/** Export unrounded numeric values; fixed headers and validated numbers need no CSV escaping. */
export function comparisonCSV(comparison) {
  // Revalidate the inputs instead of trusting arbitrary caller-supplied result cells.
  const checked = compareCircuits(comparison?.input);
  const header = [
    'connection', 'source_voltage_V', 'R1_resistance_ohm', 'R2_resistance_ohm',
    'equivalent_resistance_ohm', 'source_current_A', 'source_power_W',
    'R1_voltage_V', 'R1_current_A', 'R1_power_W',
    'R2_voltage_V', 'R2_current_A', 'R2_power_W',
  ].join(',');
  const rows = [checked.series, checked.parallel].map(row => [
    row.connection, checked.input.voltage, checked.input.resistance1, checked.input.resistance2,
    row.equivalentResistance, row.sourceCurrent, row.sourcePower,
    ...row.resistors.flatMap(part => [part.voltage, part.current, part.power]),
  ].join(','));
  return [header, ...rows, ''].join('\r\n');
}
