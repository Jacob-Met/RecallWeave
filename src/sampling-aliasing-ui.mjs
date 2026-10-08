import { analyzeSampling, cosineAt, samplingCsv } from './sampling-aliasing.mjs';

const SVG_NS = 'http://www.w3.org/2000/svg';
const readable = value => Number(value.toFixed(6)).toString();

/** Direct-file UI. Every visible result belongs to one checked sampling snapshot. */
export function mountSamplingLab(doc = document) {
  const find = id => doc.getElementById(id);
  const frequency = find('sa-frequency');
  const rate = find('sa-rate');
  const result = find('sa-result');
  const error = find('sa-error');
  const csvButton = find('sa-download-csv');
  const rows = find('sa-sample-rows');
  const plot = find('sa-plot');
  const courseText = JSON.parse(find('sa-course-data').textContent);
  let current = null;

  function svgElement(tag, attributes) {
    const element = doc.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
    return element;
  }

  function graph(snapshot) {
    const group = svgElement('g', {});
    const width = 900;
    const height = 280;
    const pad = 12;
    const x = time => pad + (width - 2 * pad) * time;
    const y = value => height / 2 - value * (height / 2 - pad);
    for (const amplitude of [-1, 0, 1]) {
      group.append(svgElement('line', { x1: x(0), x2: x(1), y1: y(amplitude), y2: y(amplitude), class: 'sa-grid' }));
    }
    for (const time of [0, 0.25, 0.5, 0.75, 1]) {
      group.append(svgElement('line', { x1: x(time), x2: x(time), y1: y(-1), y2: y(1), class: 'sa-grid' }));
    }
    const steps = Math.max(960, Math.ceil(Math.max(snapshot.frequencyHz, snapshot.comparisonHz) * 40));
    for (const [hertz, name] of [[snapshot.comparisonHz, 'sa-comparison'], [snapshot.frequencyHz, 'sa-reference']]) {
      const path = Array.from({ length: steps + 1 }, (_, index) => {
        const time = index / steps;
        return `${index ? 'L' : 'M'}${x(time).toFixed(3)},${y(cosineAt(hertz, time)).toFixed(3)}`;
      }).join(' ');
      group.append(svgElement('path', { d: path, class: name, fill: 'none' }));
    }
    for (const sample of snapshot.samples) {
      group.append(svgElement('circle', { cx: x(sample.timeSeconds), cy: y(sample.reference), r: 4.4, class: 'sa-sample' }));
    }
    return group;
  }

  function numericRows(snapshot) {
    const fragment = doc.createDocumentFragment();
    for (const sample of snapshot.samples) {
      const row = doc.createElement('tr');
      for (const value of [sample.index, sample.timeSeconds, sample.reference, sample.comparison]) {
        const cell = doc.createElement('td');
        cell.textContent = readable(value);
        row.append(cell);
      }
      fragment.append(row);
    }
    return fragment;
  }

  function retire(message) {
    current = null;
    result.hidden = true;
    rows.replaceChildren();
    plot.replaceChildren();
    csvButton.disabled = true;
    error.textContent = message;
    error.hidden = false;
    find('sa-status').textContent = 'Results paused. Correct the highlighted input to sample again.';
  }

  function readInputs() {
    frequency.removeAttribute('aria-invalid');
    rate.removeAttribute('aria-invalid');
    const f = Number(frequency.value);
    const fs = Number(rate.value);
    const problems = [];
    if (!frequency.value.trim() || frequency.validity.badInput || !Number.isFinite(f) || f < 0 || f > 40 || !Number.isInteger(f * 2)) {
      frequency.setAttribute('aria-invalid', 'true');
      problems.push('Signal frequency needs 0 to 40 Hz in steps of 0.5 Hz.');
    }
    if (!rate.value.trim() || rate.validity.badInput || !Number.isInteger(fs) || fs < 2 || fs > 32) {
      rate.setAttribute('aria-invalid', 'true');
      problems.push('Sample rate needs a whole number from 2 to 32 samples per second.');
    }
    if (problems.length) throw new RangeError(problems.join(' '));
    return analyzeSampling({ frequencyHz: f, sampleRateHz: fs });
  }

  function update() {
    try {
      const next = readInputs();
      // Stage complete graph and table before committing the checked snapshot.
      const nextGraph = graph(next);
      const nextRows = numericRows(next);
      plot.replaceChildren(nextGraph);
      rows.replaceChildren(nextRows);
      find('sa-reference-value').textContent = `${readable(next.frequencyHz)} Hz`;
      find('sa-comparison-value').textContent = `${readable(next.comparisonHz)} Hz`;
      find('sa-alias-value').textContent = `${readable(next.aliasHz)} Hz`;
      find('sa-half-rate').textContent = `${readable(next.halfSampleRateHz)} Hz`;
      find('sa-sampling-interval').textContent = `${readable(next.intervalSeconds)} s`;
      find('sa-sample-count').textContent = String(next.samples.length);
      find('sa-plot-description').textContent = `The ${next.frequencyHz} Hz authored cosine and ${next.comparisonHz} Hz comparison agree at all ${next.samples.length} displayed samples, spaced 1/${next.sampleRateHz} second apart. The numeric table follows.`;
      find('sa-relation').textContent = next.relation === 'below'
        ? 'The authored reference is below the half-rate. A higher matching alternative still exists; a justified band limit can exclude it.'
        : next.relation === 'at'
          ? 'The authored reference is exactly at the half-rate. This specified cosine phase does not establish arbitrary-phase recovery; see the sine counterexample below.'
          : 'The authored reference is above the half-rate and shares its samples with a lower-frequency cosine.';
      for (const preset of doc.querySelectorAll('[data-sa-frequency]')) {
        preset.setAttribute('aria-pressed', String(Number(preset.dataset.saFrequency) === next.frequencyHz && Number(preset.dataset.saRate) === next.sampleRateHz));
      }
      error.hidden = true;
      error.textContent = '';
      result.hidden = false;
      current = next;
      csvButton.disabled = false;
      find('sa-status').textContent = `${next.samples.length} samples ready. Reference ${next.frequencyHz} Hz; matching alternative ${next.comparisonHz} Hz.`;
      return true;
    } catch (failure) {
      retire(failure instanceof Error ? failure.message : 'These inputs could not be sampled.');
      return false;
    }
  }

  function download(text, mediaType, filename) {
    const url = URL.createObjectURL(new Blob([text], { type: mediaType }));
    const link = doc.createElement('a');
    link.href = url;
    link.download = filename;
    doc.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  frequency.addEventListener('input', update);
  rate.addEventListener('input', update);
  find('sa-controls').addEventListener('submit', event => { event.preventDefault(); update(); });
  for (const preset of doc.querySelectorAll('[data-sa-frequency]')) {
    preset.addEventListener('click', () => {
      frequency.value = preset.dataset.saFrequency;
      rate.value = preset.dataset.saRate;
      update();
    });
  }
  csvButton.addEventListener('click', () => {
    // Re-read even a programmatic click: edited or invalid controls cannot export
    // the previous result. The same committed snapshot supplies all CSV metadata.
    if (!update() || !current) return;
    download(samplingCsv(current), 'text/csv;charset=utf-8', `sampling-${current.frequencyHz}Hz-at-${current.sampleRateHz}sps.csv`);
  });
  find('sa-download-course').addEventListener('click', () => {
    download(courseText, 'application/json;charset=utf-8', 'sampling-aliasing.json');
  });
  update();
}

if (typeof document !== 'undefined') mountSamplingLab(document);
