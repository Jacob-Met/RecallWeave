import { OSCILLATOR_LIMITS, OSCILLATOR_DEFAULT, inspectOscillator, parseOscillatorInput, sampleOscillatorCycle, serializeOscillatorExperiment } from './spring-energy.mjs';

const element = id => document.getElementById(id);
const form = element('parameters');
const fields = Object.fromEntries(Object.keys(OSCILLATOR_LIMITS).map(key => [key, form.elements.namedItem(key)]));
const courseText = JSON.parse(element('spring-course-data').textContent);
const defaultObservation = inspectOscillator(OSCILLATOR_DEFAULT);
let applied = defaultObservation;
let dirty = false;

function numberText(value) {
  if (value === 0) return '0';
  const magnitude = Math.abs(value);
  return magnitude < 0.0001 || magnitude >= 100000
    ? value.toExponential(5)
    : String(Number(value.toPrecision(6)));
}

function direction(value) {
  return value === 0 ? 'zero' : value > 0 ? 'right' : 'left';
}

function svgAttribute(id, attributes) {
  const target = element(id);
  for (const [key, value] of Object.entries(attributes)) target.setAttribute(key, String(value));
}

function drawMotion() {
  const center = 360 + 440 * applied.position;
  const end = center - 32;
  const start = 64, lead = 12, zigStart = start + lead, zigEnd = end - lead;
  let spring = 'M' + start + ' 164 L' + zigStart + ' 164';
  for (let i = 1; i <= 12; i++) {
    const x = zigStart + (zigEnd - zigStart) * i / 13;
    spring += ' L' + x + ' ' + (i % 2 ? 151 : 177);
  }
  spring += ' L' + zigEnd + ' 164 L' + end + ' 164';
  svgAttribute('spring-shape', { d: spring });
  svgAttribute('mass-block', { x: center - 32 });
  svgAttribute('mass-label', { x: center });
  for (const [name, value] of [['force', applied.force], ['velocity', applied.velocity]]) {
    svgAttribute(name + '-vector', {
      x1: center, x2: center + Math.sign(value) * 78,
      visibility: value === 0 ? 'hidden' : 'visible',
    });
    svgAttribute(name + '-direction', { x: center });
    element(name + '-direction').textContent = (name === 'force' ? 'F: ' : 'v: ') + direction(value);
  }
  element('diagram-description').textContent = 'Block at ' + numberText(applied.position) +
    ' metres from equilibrium. Velocity ' + direction(applied.velocity) + '; spring force ' +
    direction(applied.force) + '. Arrows indicate direction only, on a fixed displacement scale.';
}

function drawEnergy() {
  const total = applied.releaseEnergy;
  element('kinetic-value').textContent = numberText(applied.kineticEnergy) + ' J';
  element('potential-value').textContent = numberText(applied.potentialEnergy) + ' J';
  const resolved = total > 0;
  const kineticPercent = resolved ? 100 * applied.kineticEnergy / total : 0;
  const potentialPercent = resolved ? 100 * applied.potentialEnergy / total : 0;
  element('kinetic-bar').style.width = Math.min(100, Math.max(0, kineticPercent)) + '%';
  element('potential-bar').style.width = Math.min(100, Math.max(0, potentialPercent)) + '%';
  element('kinetic-fraction').textContent = resolved ? numberText(kineticPercent) + '% of this release' : 'fraction undefined';
  element('potential-fraction').textContent = resolved ? numberText(potentialPercent) + '% of this release' : 'fraction undefined';
  const rest = applied.input.amplitudeM === 0;
  element('energy-note').textContent = resolved
    ? 'As the phase changes, energy moves between K and U while their total stays constant.'
    : rest
      ? 'Zero amplitude: the block is at rest. Dividing either zero energy by the zero total would be undefined.'
      : 'This positive amplitude is too small for its energy to be represented by ordinary floating-point numbers; no energy fraction is reported.';
  element('energy-bar').setAttribute('aria-label', resolved
    ? 'Kinetic energy ' + numberText(kineticPercent) + ' percent; spring potential energy ' + numberText(potentialPercent) + ' percent of this release.'
    : 'No energy fractions are defined for a represented total of zero joules.');
}

function drawCycle() {
  const fragment = document.createDocumentFragment();
  for (const row of sampleOscillatorCycle(applied.input)) {
    const tr = document.createElement('tr');
    tr.dataset.phase = String(row.input.phaseDegrees);
    tr.dataset.current = String(row.input.phaseDegrees === applied.input.phaseDegrees);
    for (const value of [row.input.phaseDegrees, row.time, row.position, row.velocity,
      row.acceleration, row.force, row.kineticEnergy, row.potentialEnergy, row.totalEnergy]) {
      const td = document.createElement('td');
      td.textContent = numberText(value);
      tr.append(td);
    }
    fragment.append(tr);
  }
  element('cycle-rows').replaceChildren(fragment);
}

function renderApplied() {
  const p = applied.input;
  element('applied-summary').textContent = 'Applied release: ' + numberText(p.massKg) + ' kg · ' +
    numberText(p.stiffnessNPerM) + ' N/m · amplitude ' + numberText(p.amplitudeM) + ' m · phase ' +
    numberText(p.phaseDegrees) + '°.';
  element('phase-slider').value = String(p.phaseDegrees);
  element('phase-slider').setAttribute('aria-valuetext', numberText(p.phaseDegrees) + ' degrees from release');
  element('phase-readout').textContent = numberText(p.phaseDegrees) + '°';
  for (const button of document.querySelectorAll('[data-phase]')) {
    button.setAttribute('aria-pressed', String(Number(button.dataset.phase) === p.phaseDegrees));
  }
  for (const target of document.querySelectorAll('[data-value]')) {
    target.textContent = numberText(applied[target.dataset.value]) + ' ' + target.dataset.unit;
  }
  element('elapsed').textContent = p.amplitudeM === 0
    ? 'Resting system. The selected phase labels a natural-cycle coordinate; no physical cycle is being observed.'
    : 'Elapsed time from release: ' + numberText(applied.time) + ' s (' +
      numberText(p.phaseDegrees / 360) + ' of a natural period).';
  element('comparison').textContent = 'Period ×' + numberText(applied.period / defaultObservation.period) +
    '; release energy ×' + numberText(applied.releaseEnergy / defaultObservation.releaseEnergy) + '.';
  drawMotion();
  drawEnergy();
  drawCycle();
}

function updateDraftState() {
  element('phase-controls').disabled = dirty;
  element('download-experiment').disabled = dirty;
  element('draft-status').classList.toggle('pending', dirty);
  element('draft-status').textContent = dirty
    ? 'Unapplied edits. The diagram, numbers and table still show the last applied release. Apply all inputs to continue.'
    : 'All displayed values and the experiment download use this applied release.';
}

function clearError() {
  element('input-error').hidden = true;
  element('input-error').textContent = '';
  for (const field of Object.values(fields)) field.removeAttribute('aria-invalid');
}

function applyInput(input) {
  const next = inspectOscillator(input);
  applied = next;
  dirty = false;
  for (const [key, field] of Object.entries(fields)) field.value = String(next.input[key]);
  clearError();
  element('download-status').textContent = '';
  renderApplied();
  updateDraftState();
}

form.addEventListener('input', () => {
  dirty = true;
  clearError();
  element('download-status').textContent = '';
  updateDraftState();
});
form.addEventListener('submit', event => {
  event.preventDefault();
  clearError();
  try {
    const input = Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, field.value]));
    applyInput(parseOscillatorInput(input));
  } catch (error) {
    dirty = true;
    element('input-error').textContent = error.message;
    element('input-error').hidden = false;
    for (const [key, limit] of Object.entries(OSCILLATOR_LIMITS)) {
      if (error.message.startsWith(limit.label)) fields[key].setAttribute('aria-invalid', 'true');
    }
    updateDraftState();
  }
});
element('reset').addEventListener('click', () => applyInput(OSCILLATOR_DEFAULT));
const presets = {
  heavy: { ...OSCILLATOR_DEFAULT, massKg: 8 },
  stiff: { ...OSCILLATOR_DEFAULT, stiffnessNPerM: 200 },
  large: { ...OSCILLATOR_DEFAULT, amplitudeM: 0.4 },
};
for (const button of document.querySelectorAll('[data-preset]')) {
  button.addEventListener('click', () => applyInput(presets[button.dataset.preset]));
}

function changePhase(phaseDegrees) {
  if (!dirty) applyInput({ ...applied.input, phaseDegrees });
}
element('phase-slider').addEventListener('input', event => changePhase(Number(event.target.value)));
element('phase-slider').addEventListener('keydown', event => {
  const steps = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -15, PageUp: 15 };
  if (dirty || !(event.key in steps || event.key === 'Home' || event.key === 'End')) return;
  event.preventDefault();
  const phase = event.key === 'Home' ? 0 : event.key === 'End' ? 360
    : Math.min(360, Math.max(0, applied.input.phaseDegrees + steps[event.key]));
  changePhase(phase);
});
for (const button of document.querySelectorAll('[data-phase]')) {
  button.addEventListener('click', () => changePhase(Number(button.dataset.phase)));
}

function downloadText(name, text) {
  let url;
  let anchor;
  try {
    url = URL.createObjectURL(new Blob([text], { type: 'application/json;charset=utf-8' }));
    anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    document.body.append(anchor);
    anchor.click();
    element('download-status').textContent = 'Download requested: ' + name + '.';
  } catch (error) {
    element('download-status').textContent = 'Download could not be requested: ' + error.message;
  } finally {
    anchor?.remove();
    if (url) setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
element('download-course').addEventListener('click', () => downloadText('spring-energy.json', courseText));
element('download-experiment').addEventListener('click', () => {
  if (!dirty) downloadText('spring-energy-experiment.json', serializeOscillatorExperiment(applied.input));
});
applyInput(OSCILLATOR_DEFAULT);
