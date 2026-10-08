import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {Script} from 'node:vm';
import {RC_LIMITS, RC_EXAMPLES, RC_HORIZON_TAU, RC_SAMPLE_COUNT, validateRcInputs, parseRcNumber, calculateRc, buildRcTrace, rcObservation} from '../src/rc-transients.mjs';
import {parseDeck} from '../src/deck.mjs';
import {buildRcLab} from '../tools/build-rc-transients.mjs';

const charge = {resistanceOhms: 1000, capacitanceMicrofarads: 1000, sourceVolts: 5, initialVolts: 0};
const file = relative => readFileSync(new URL('../' + relative, import.meta.url), 'utf8');
function close(actual, expected, tolerance = 1e-12) {
  assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)), String(actual) + ' is not close to ' + expected);
}

test('circuit admission copies the four finite values and normalizes negative zero', () => {
  const input = {...charge, initialVolts: -0, note: 'not a model field'};
  const admitted = validateRcInputs(input);
  assert.deepEqual(Object.keys(admitted), Object.keys(RC_LIMITS));
  assert.equal(Object.is(admitted.initialVolts, -0), false);
  assert.equal(Object.isFrozen(admitted), true);
  input.sourceVolts = 20;
  assert.equal(admitted.sourceVolts, 5);
  assert.throws(() => { admitted.sourceVolts = 20; }, TypeError);
});

test('invalid records, nonfinite values and values outside each bound are refused', () => {
  for (const invalid of [null, undefined, [], 'circuit', 2]) assert.throws(() => validateRcInputs(invalid));
  for (const [key, limit] of Object.entries(RC_LIMITS)) {
    for (const value of [undefined, null, true, String(charge[key]), NaN, Infinity, -Infinity, limit.min - 1, limit.max + 1]) {
      assert.throws(() => calculateRc({...charge, [key]: value}), key + ' admitted ' + String(value));
    }
    for (const value of [limit.min, limit.max]) assert.equal(calculateRc({...charge, [key]: value}).inputs[key], value);
  }
  for (const u of [-1, 8.0001, NaN, Infinity, '1', null]) assert.throws(() => calculateRc(charge, u));
});

test('text input accepts explicit decimals and exponent notation without empty coercion', () => {
  assert.equal(parseRcNumber(' 1e3 ', 'resistanceOhms'), 1000);
  assert.equal(parseRcNumber('.001', 'capacitanceMicrofarads'), 0.001);
  assert.equal(parseRcNumber('-2.4e1', 'sourceVolts'), -24);
  for (const text of ['', ' ', '0x10', '1,000', '1_000', 'Infinity', 'NaN', '4 V', '--1', '1e']) {
    assert.throws(() => parseRcNumber(text, 'sourceVolts'));
  }
  assert.throws(() => parseRcNumber(5, 'sourceVolts'));
  assert.throws(() => parseRcNumber('5', 'missing'));
});

test('initial capacitor voltage is continuous and initial current uses the signed gap', () => {
  const point = calculateRc({resistanceOhms: 2000, capacitanceMicrofarads: 500, sourceVolts: 8, initialVolts: 2}, 0);
  assert.equal(point.timeConstantSeconds, 1);
  assert.equal(point.capacitorVolts, 2);
  assert.equal(point.resistorVolts, 6);
  assert.equal(point.currentAmps, 0.003);
  assert.equal(point.sourceWorkJoules, 0);
  assert.equal(point.resistorHeatJoules, 0);
  assert.equal(point.changeStoredEnergyJoules, 0);
});

test('discharge, reversed steps and a precharged source preserve current and power signs', () => {
  const discharge = calculateRc({...charge, sourceVolts: 0, initialVolts: 6}, 0);
  assert.equal(discharge.currentAmps, -0.006);
  close(discharge.sourcePowerWatts, 0);
  assert.ok(discharge.resistorPowerWatts > 0);
  const reverse = calculateRc({...charge, sourceVolts: 4, initialVolts: -4}, Math.log(2));
  close(reverse.capacitorVolts, 0);
  assert.ok(reverse.currentAmps > 0);
  const precharged = calculateRc({...charge, initialVolts: 10}, 1);
  assert.ok(precharged.currentAmps < 0);
  assert.ok(precharged.sourcePowerWatts < 0);
  assert.ok(precharged.sourceWorkJoules < 0);
  assert.ok(precharged.resistorHeatJoules > 0);
});

test('equilibrium retains stored energy while all transfers vanish', () => {
  for (const u of [0, 1, 5, 8]) {
    const point = calculateRc({...charge, initialVolts: 5}, u);
    assert.equal(point.capacitorVolts, 5);
    assert.equal(point.currentAmps, 0);
    close(point.storedEnergyJoules, 0.0125);
    for (const key of ['changeStoredEnergyJoules', 'resistorHeatJoules', 'sourceWorkJoules', 'sourcePowerWatts', 'resistorPowerWatts']) assert.equal(point[key], 0);
  }
});

test('resistance and capacitance scaling distinguish physical time from normalized time', () => {
  const base = calculateRc(charge, 1);
  const twiceR = calculateRc({...charge, resistanceOhms: 2000}, 1);
  const twiceC = calculateRc({...charge, capacitanceMicrofarads: 2000}, 1);
  close(twiceR.capacitorVolts, base.capacitorVolts);
  close(twiceR.currentAmps, base.currentAmps / 2);
  close(twiceR.seconds, base.seconds * 2);
  close(twiceC.capacitorVolts, base.capacitorVolts);
  close(twiceC.currentAmps, base.currentAmps);
  close(twiceC.seconds, base.seconds * 2);
  close(twiceC.chargeCoulombs, base.chargeCoulombs * 2);
  close(twiceC.storedEnergyJoules, base.storedEnergyJoules * 2);
  assert.ok(calculateRc({...charge, resistanceOhms: 2000}, 0.5).capacitorVolts < base.capacitorVolts);
});

test('finite five-tau and eight-tau results retain a nonzero gap', () => {
  const five = calculateRc(charge, 5);
  const eight = calculateRc(charge, 8);
  assert.ok(five.capacitorVolts < 5);
  assert.ok(eight.capacitorVolts < 5);
  assert.ok(eight.capacitorVolts > five.capacitorVolts);
  close(five.remainingFraction, 0.006737946999085467);
  assert.ok(eight.currentAmps > 0);
});

test('tiny positive time retains a finite change and signed energy balance', () => {
  const point = calculateRc({...charge, initialVolts: 2}, 1e-14);
  assert.ok(point.sourceWorkJoules > 0);
  assert.ok(point.changeStoredEnergyJoules > 0);
  assert.ok(point.resistorHeatJoules > 0);
  close(point.sourceWorkJoules, point.changeStoredEnergyJoules + point.resistorHeatJoules, 1e-27);
  for (const example of RC_EXAMPLES) {
    for (const u of [0, 0.05, 1, 5, 8]) {
      const sample = calculateRc(example.inputs, u);
      close(sample.sourceWorkJoules, sample.changeStoredEnergyJoules + sample.resistorHeatJoules);
      close(sample.sourcePowerWatts, sample.capacitorVolts * sample.currentAmps + sample.resistorPowerWatts);
      assert.ok(sample.resistorHeatJoules >= 0);
      assert.ok(sample.resistorPowerWatts >= 0);
    }
  }
});

test('the trace is a frozen 161-sample applied snapshot including both endpoints', () => {
  const inputs = {...charge};
  const trace = buildRcTrace(inputs);
  inputs.sourceVolts = 18;
  assert.equal(RC_HORIZON_TAU, 8);
  assert.equal(RC_SAMPLE_COUNT, 161);
  assert.equal(trace.samples.length, 161);
  assert.equal(trace.samples[0].normalizedTime, 0);
  assert.equal(trace.samples.at(-1).normalizedTime, 8);
  assert.equal(trace.inputs.sourceVolts, 5);
  assert.equal(Object.isFrozen(trace), true);
  assert.equal(Object.isFrozen(trace.samples), true);
  for (const [index, sample] of trace.samples.entries()) {
    assert.equal(sample.normalizedTime, index / 20);
    assert.equal(Object.isFrozen(sample), true);
    for (const [key, value] of Object.entries(sample)) if (key !== 'inputs') assert.equal(Number.isFinite(value), true, key);
  }
});

test('observation JSON keeps applied inputs, SI units and full-precision selected results', () => {
  const observation = rcObservation({...charge, initialVolts: 10}, 2.35);
  const roundTrip = JSON.parse(JSON.stringify(observation));
  assert.equal(roundTrip.schema, 'recallweave.rc-observation.v1');
  assert.equal(roundTrip.sampleCount, 161);
  assert.equal(roundTrip.units.current, 'A');
  assert.equal(roundTrip.units.energy, 'J');
  assert.equal(roundTrip.units.capacitanceInput, 'microfarad');
  assert.deepEqual(roundTrip.inspected, JSON.parse(JSON.stringify(calculateRc(observation.inputs, 2.35))));
  assert.equal(roundTrip.samples.at(-1).seconds, 8);
  assert.ok(roundTrip.inspected.currentAmps < 0);
  assert.match(roundTrip.sourceWorkSign, /negative means energy absorbed/);
  assert.throws(() => rcObservation(charge, 9));
});

test('the original course validates in the unchanged parser with balanced concept coverage', () => {
  const deck = parseDeck(file('courses/rc-transients.json'));
  assert.equal(deck.items.length, 16);
  assert.equal(deck.concepts.length, 4);
  for (const concept of deck.concepts) assert.equal(deck.items.filter(item => item.concept === concept).length, 4);
  for (const item of deck.items) {
    assert.ok(item.explanation.trim());
    assert.ok(item.transfer.trim());
  }
});

test('the checked-in standalone lab matches its sources and preserves both download payloads', () => {
  const html = buildRcLab();
  assert.equal(file('courses/rc-transients-lab.html'), html);
  const coursePayload = html.match(/<script id="course-payload" type="application\/json">([\s\S]*?)<\/script>/);
  const guidePayload = html.match(/<script id="guide-payload" type="application\/json">([\s\S]*?)<\/script>/);
  assert.ok(coursePayload && guidePayload);
  assert.equal(JSON.parse(coursePayload[1]), file('courses/rc-transients.json'));
  assert.equal(JSON.parse(guidePayload[1]), file('courses/rc-transients.md'));
  assert.equal(parseDeck(JSON.parse(coursePayload[1])).items.length, 16);
  const executable = html.match(/<script>\n([\s\S]*?)\n<\/script>/);
  assert.ok(executable);
  assert.doesNotThrow(() => new Script(executable[1], {filename: fileURLToPath(new URL('../courses/rc-transients-lab.html', import.meta.url))}));
  assert.doesNotMatch(html, /<(?:script|img|iframe)\b[^>]*\bsrc\s*=/i);
  assert.doesNotMatch(html, /<link\b[^>]*\bhref\s*=/i);
  assert.doesNotMatch(executable[1], /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage)\b/);
  assert.doesNotMatch(html, /__RC_[A-Z_]+__/);
  assert.match(html, /href="\.\.\/demo\.html"/);
});
