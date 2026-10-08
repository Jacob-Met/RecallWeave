/** Fictional initial-rate comparisons, not fitted enzyme data.
 * Baseline Vmax = 10 product units/min; Km = 1 substrate concentration unit.
 * I/Ki is dimensionless. Pure noncompetitive uses equal inhibition constants.
 * References and assumptions: ../courses/enzyme-kinetics.md
 */
export const KINETICS_BASELINE = Object.freeze({ vmax: 10, km: 1 });
export const KINETICS_LIMITS = Object.freeze({
  substrate: Object.freeze({ min: 0, max: 32, label: 'Substrate concentration' }),
  inhibitorRatio: Object.freeze({ min: 0, max: 8, label: 'Inhibitor ratio I/Ki' }),
});
export const KINETICS_MODES = Object.freeze([
  Object.freeze({ id: 'uninhibited', label: 'Uninhibited' }),
  Object.freeze({ id: 'competitive', label: 'Competitive' }),
  Object.freeze({ id: 'pure_noncompetitive', label: 'Pure noncompetitive' }),
]);

function bounded(value, key) {
  const limit = KINETICS_LIMITS[key];
  if (!limit) throw new RangeError('Unknown kinetics parameter.');
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(limit.label + ' must be a finite number.');
  }
  if (value < limit.min || value > limit.max) {
    throw new RangeError(limit.label + ' must be from ' + limit.min + ' to ' + limit.max + '.');
  }
  return value === 0 ? 0 : value;
}

/** Explicit decimal input; an empty edit is never interpreted as zero. */
export function parseKineticsNumber(text, key) {
  if (typeof text !== 'string' || !text.trim()) {
    throw new TypeError('Enter ' + (KINETICS_LIMITS[key]?.label || 'a value').toLowerCase() + '.');
  }
  const value = text.trim();
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value)) {
    throw new TypeError((KINETICS_LIMITS[key]?.label || 'Value') + ' must be a decimal number.');
  }
  const number = Number(value);
  if (number === 0 && /[1-9]/.test(value.split(/e/i)[0])) {
    throw new RangeError('This nonzero value is too small to represent. Enter 0 explicitly or a larger value.');
  }
  return bounded(number, key);
}

/** Three separate hypothetical cases share S and the uninhibited enzyme parameters. */
export function compareKinetics(parameters) {
  if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters)) {
    throw new TypeError('Provide substrate concentration and inhibitor ratio.');
  }
  const input = Object.freeze({
    substrate: bounded(parameters.substrate, 'substrate'),
    inhibitorRatio: bounded(parameters.inhibitorRatio, 'inhibitorRatio'),
  });
  const alpha = 1 + input.inhibitorRatio;
  const { vmax, km } = KINETICS_BASELINE;
  // Analytic fractions avoid dividing rates quantized near the floating-point limit.
  const definitions = [
    [KINETICS_MODES[0], vmax, km, 1],
    [KINETICS_MODES[1], vmax, alpha * km, (km + input.substrate) / (alpha * km + input.substrate)],
    [KINETICS_MODES[2], vmax / alpha, km, 1 / alpha],
  ];
  const cases = {};
  for (const [mode, limitingRate, apparentKm, relativeRate] of definitions) {
    const rate = limitingRate * input.substrate / (apparentKm + input.substrate);
    cases[mode.id] = Object.freeze({
      id: mode.id, label: mode.label, rate, limitingRate, apparentKm,
      // At S=0, both rates are zero. Do not replace the undefined ratio with its limit.
      relativeRate: input.substrate === 0 ? null : relativeRate,
    });
  }
  return Object.freeze({ input, alpha, cases: Object.freeze(cases) });
}

/** Fixed graph sampling, including the course's 1, 4 and 16 concentration units. */
export function kineticsCurve(inhibitorRatio) {
  bounded(inhibitorRatio, 'inhibitorRatio');
  return Object.freeze(Array.from({ length: 129 }, (_, index) =>
    compareKinetics({ substrate: index / 4, inhibitorRatio })));
}

/** Recompute from validated inputs. No caller-supplied output strings enter the file. */
export function kineticsCSV(parameters) {
  const current = compareKinetics(parameters);
  const header = [
    'row_type', 'model', 'substrate_concentration_units', 'inhibitor_ratio_I_over_Ki',
    'baseline_Vmax_product_units_per_min', 'baseline_Km_concentration_units',
    'apparent_Vmax_product_units_per_min', 'apparent_Km_concentration_units',
    'initial_rate_product_units_per_min', 'rate_fraction_of_uninhibited',
  ].join(',');
  const rows = [header];
  for (const [kind, samples] of [
    ['current', [current]],
    ['curve_sample', kineticsCurve(current.input.inhibitorRatio)],
  ]) {
    for (const sample of samples) {
      for (const mode of KINETICS_MODES) {
        const row = sample.cases[mode.id];
        rows.push([
          kind, mode.id, sample.input.substrate, sample.input.inhibitorRatio,
          KINETICS_BASELINE.vmax, KINETICS_BASELINE.km,
          row.limitingRate, row.apparentKm, row.rate, row.relativeRate ?? '',
        ].join(','));
      }
    }
  }
  return rows.join('\r\n') + '\r\n';
}
