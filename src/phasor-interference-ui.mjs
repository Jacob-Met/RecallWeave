import { analyzeInterference, interferenceJson, interferenceCsv, DEFAULT_INTERFERENCE } from './phasor-interference.mjs';

const SVG_NS = 'http://www.w3.org/2000/svg';
const palette = Object.freeze({ a: '#087c79', b: '#ad492c', sum: '#51449b' });
const presets = Object.freeze({
  quadrature: DEFAULT_INTERFERENCE,
  constructive: { ...DEFAULT_INTERFERENCE, amplitudeA: 2, amplitudeB: 2, phaseDifferenceDegrees: 0 },
  cancel: { ...DEFAULT_INTERFERENCE, amplitudeA: 2, amplitudeB: 2, phaseDifferenceDegrees: 180 },
  unequal: { ...DEFAULT_INTERFERENCE, amplitudeA: 3, amplitudeB: 1, phaseDifferenceDegrees: 180 },
});

export function formatInterferenceValue(value) {
  if (value === 0) return '0';
  if (Math.abs(value) < 0.00001) return value.toExponential(3);
  return Number(value.toFixed(6)).toString();
}

/** Render and export one checked experiment; invalid controls retire its results. */
export function mountInterferenceLab(doc = document) {
  const find = id => doc.getElementById(id);
  const controls = {
    amplitudeA: find('pi-amplitude-a'),
    amplitudeB: find('pi-amplitude-b'),
    phaseDifferenceDegrees: find('pi-relative-phase'),
    commonPhaseDegrees: find('pi-common-phase'),
    frequencyHz: find('pi-frequency'),
    cursorCycle: find('pi-cursor'),
  };
  const exports = [find('pi-download-json'), find('pi-download-csv')];
  const courseText = JSON.parse(find('pi-course-data').textContent);
  const fmt = formatInterferenceValue;
  let current = null;

  function svg(tag, attributes, text) {
    const node = doc.createElementNS(SVG_NS, tag);
    for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function phasorPicture(s) {
    const group = svg('g', {});
    const bound = Math.max(1, s.parameters.amplitudeA + s.parameters.amplitudeB) * 1.15;
    const scale = 137 / bound;
    const x = re => 210 + re * scale;
    const y = im => 170 - im * scale;
    const tick = Math.max(1, s.parameters.amplitudeA + s.parameters.amplitudeB);
    for (const value of [-tick, 0, tick]) {
      group.append(svg('line', { x1: x(-bound), y1: y(value), x2: x(bound), y2: y(value), class: value === 0 ? 'pi-axis' : 'pi-grid' }));
      group.append(svg('line', { x1: x(value), y1: y(-bound), x2: x(value), y2: y(bound), class: value === 0 ? 'pi-axis' : 'pi-grid' }));
      if (value !== 0) {
        group.append(svg('text', { x: x(value), y: y(0) + 19, 'text-anchor': 'middle', class: 'pi-label' }, fmt(value)));
        group.append(svg('text', { x: x(0) - 8, y: y(value) + 4, 'text-anchor': 'end', class: 'pi-label' }, fmt(value)));
      }
    }
    group.append(svg('text', { x: 210, y: 18, 'text-anchor': 'middle', class: 'pi-label strong' }, 'Imaginary'));
    group.append(svg('text', { x: 412, y: 174, 'text-anchor': 'end', class: 'pi-label strong' }, 'Real'));
    group.append(svg('text', { x: 210, y: 342, 'text-anchor': 'middle', class: 'pi-label' }, 'Common signal units · phase is an angle'));

    const defs = svg('defs', {});
    for (const name of ['a', 'b', 'sum']) {
      const marker = svg('marker', { id: 'pi-arrow-' + name, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto', markerUnits: 'strokeWidth' });
      marker.append(svg('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: palette[name] }));
      defs.append(marker);
    }
    group.append(defs);
    const c = s.cursor;
    group.append(svg('line', {
      x1: x(c.phasors.a.re), y1: y(c.phasors.a.im),
      x2: x(c.phasors.sum.re), y2: y(c.phasors.sum.im),
      stroke: palette.b, 'stroke-width': 2, 'stroke-dasharray': '3 5', opacity: 0.55,
    }));
    for (const [name, label, offset] of [['a', 'A', -10], ['b', 'B', 20], ['sum', 'Sum', -26]]) {
      const z = c.phasors[name];
      if (Math.hypot(z.re, z.im) !== 0) {
        group.append(svg('line', {
          x1: x(0), y1: y(0), x2: x(z.re), y2: y(z.im),
          stroke: palette[name], 'stroke-width': name === 'sum' ? 3.5 : 2.5,
          'stroke-dasharray': name === 'b' ? '7 4' : 'none', 'marker-end': 'url(#pi-arrow-' + name + ')',
          'data-vector': name,
        }));
        group.append(svg('text', { x: x(z.re) + 9, y: y(z.im) + offset, fill: palette[name], 'font-size': 13, 'font-weight': 700 }, label));
      } else if (name === 'sum') {
        group.append(svg('circle', { cx: x(0), cy: y(0), r: 5, fill: 'none', stroke: palette.sum, 'stroke-width': 2.5, 'data-zero-resultant': 'true' }));
        group.append(svg('text', { x: x(0) + 10, y: y(0) - 13, fill: palette.sum, 'font-size': 13, 'font-weight': 700 }, 'Sum = 0'));
      }
    }
    if (s.amplitude !== 0) {
      group.append(svg('line', { x1: x(c.sum), y1: y(c.phasors.sum.im), x2: x(c.sum), y2: y(0), class: 'pi-cursor' }));
      group.append(svg('circle', { cx: x(c.sum), cy: y(0), r: 4.5, fill: palette.sum }));
    }
    return group;
  }

  function timePicture(s) {
    const group = svg('g', {});
    const bound = Math.max(1, s.parameters.amplitudeA + s.parameters.amplitudeB) * 1.15;
    const x = cycle => 53 + cycle / 2 * 550;
    const y = value => 164 - value / bound * 125;
    const tick = Math.max(1, s.parameters.amplitudeA + s.parameters.amplitudeB);
    for (const value of [-tick, 0, tick]) {
      group.append(svg('line', { x1: x(0), x2: x(2), y1: y(value), y2: y(value), class: value === 0 ? 'pi-axis' : 'pi-grid' }));
      group.append(svg('text', { x: 43, y: y(value) + 4, 'text-anchor': 'end', class: 'pi-label' }, fmt(value)));
    }
    for (const cycle of [0, 0.5, 1, 1.5, 2]) {
      group.append(svg('line', { x1: x(cycle), x2: x(cycle), y1: 30, y2: 299, class: 'pi-grid' }));
      group.append(svg('text', { x: x(cycle), y: 318, 'text-anchor': 'middle', class: 'pi-label' }, fmt(cycle / s.parameters.frequencyHz)));
    }
    group.append(svg('text', { x: 53, y: 18, class: 'pi-label strong' }, 'Signal value'));
    group.append(svg('text', { x: 328, y: 343, 'text-anchor': 'middle', class: 'pi-label strong' }, 'Time (seconds)'));
    for (const [key, name] of [['waveA', 'a'], ['waveB', 'b'], ['sum', 'sum']]) {
      const d = s.samples.map((row, i) => (i ? 'L' : 'M') + x(row.cycle).toFixed(3) + ',' + y(row[key]).toFixed(3)).join(' ');
      group.append(svg('path', { d, class: 'pi-wave-' + name, 'data-trace': name }));
    }
    group.append(svg('line', { x1: x(s.cursor.cycle), x2: x(s.cursor.cycle), y1: 30, y2: 299, class: 'pi-cursor' }));
    for (const [key, name] of [['waveA', 'a'], ['waveB', 'b'], ['sum', 'sum']]) {
      group.append(svg('circle', { cx: x(s.cursor.cycle), cy: y(s.cursor[key]), r: name === 'sum' ? 5 : 3.5, fill: palette[name] }));
    }
    return group;
  }

  function tableRows(s) {
    const rows = doc.createDocumentFragment();
    for (const sample of s.samples) {
      const row = doc.createElement('tr');
      for (const key of ['index', 'cycle', 'timeSeconds', 'waveA', 'waveB', 'sum']) {
        const cell = doc.createElement('td');
        cell.textContent = fmt(sample[key]);
        row.append(cell);
      }
      rows.append(row);
    }
    return rows;
  }

  function readInputs() {
    const settings = {};
    const errors = [];
    for (const [key, input] of Object.entries(controls)) {
      input.removeAttribute('aria-invalid');
      const value = Number(input.value);
      if (!input.value.trim() || input.validity.badInput || !Number.isFinite(value)
          || value < Number(input.min) || value > Number(input.max)) {
        input.setAttribute('aria-invalid', 'true');
        errors.push(doc.querySelector('label[for="' + input.id + '"]').textContent
          + ': enter a number from ' + input.min + ' to ' + input.max + '.');
      }
      settings[key] = value;
    }
    if (errors.length) throw new RangeError(errors.join(' '));
    return analyzeInterference(settings);
  }

  function retire(failure) {
    current = null;
    find('pi-results').hidden = true;
    find('pi-sample-rows').replaceChildren();
    find('pi-phasor-drawing').replaceChildren();
    find('pi-trace-drawing').replaceChildren();
    for (const button of exports) button.disabled = true;
    find('pi-error').hidden = false;
    find('pi-error').textContent = failure instanceof Error ? failure.message : 'The experiment could not be calculated.';
    find('pi-status').textContent = 'Results paused. Correct the input to calculate and download the experiment.';
    find('pi-cursor-value').textContent = 'Results paused';
    find('pi-step-back').disabled = true;
    find('pi-step-forward').disabled = true;
    for (const button of doc.querySelectorAll('[data-pi-preset]')) button.setAttribute('aria-pressed', 'false');
  }

  function update() {
    try {
      const next = readInputs();
      const arrows = phasorPicture(next);
      const trace = timePicture(next);
      const rows = tableRows(next);
      // Build before committing: all three representations belong to this snapshot.
      find('pi-phasor-drawing').replaceChildren(arrows);
      find('pi-trace-drawing').replaceChildren(trace);
      find('pi-sample-rows').replaceChildren(rows);
      find('pi-amplitude').textContent = fmt(next.amplitude);
      find('pi-phase').textContent = next.phaseDegrees === null ? 'Undefined' : fmt(next.phaseDegrees) + '°';
      find('pi-mean-square').textContent = fmt(next.meanSquare);
      find('pi-rms').textContent = fmt(next.rms);
      find('pi-cursor-value').textContent = fmt(next.cursor.cycle) + ' cycles · ' + fmt(next.cursor.timeSeconds) + ' s';
      controls.cursorCycle.setAttribute('aria-valuetext', fmt(next.cursor.cycle) + ' cycles, ' + fmt(next.cursor.timeSeconds) + ' seconds');
      find('pi-cursor-equation').textContent = 'At ' + fmt(next.cursor.timeSeconds) + ' s: A (' + fmt(next.cursor.waveA)
        + ') + B (' + fmt(next.cursor.waveB) + ') = ' + fmt(next.cursor.sum) + ' signal units.';
      find('pi-phasor-description').textContent = 'At ' + fmt(next.cursor.timeSeconds) + ' seconds, wave A has real projection '
        + fmt(next.cursor.waveA) + ', wave B ' + fmt(next.cursor.waveB) + ', and the resultant ' + fmt(next.cursor.sum)
        + '. The fixed resultant peak amplitude is ' + fmt(next.amplitude) + '.';
      find('pi-trace-description').textContent = 'Two ' + fmt(next.parameters.frequencyHz) + ' Hz cosines and their sum across '
        + fmt(2 * next.periodSeconds) + ' seconds. Peak amplitudes are ' + fmt(next.parameters.amplitudeA) + ', '
        + fmt(next.parameters.amplitudeB) + ' and ' + fmt(next.amplitude) + '. The numerical table gives all 129 evaluations.';
      find('pi-table-caption').textContent = 'A = ' + fmt(next.parameters.amplitudeA) + '; B = ' + fmt(next.parameters.amplitudeB)
        + '; relative phase ' + fmt(next.parameters.phaseDifferenceDegrees) + '°; common phase '
        + fmt(next.parameters.commonPhaseDegrees) + '°; frequency ' + fmt(next.parameters.frequencyHz) + ' Hz.';
      find('pi-relation').textContent = next.amplitude === 0
        ? (next.parameters.amplitudeA === 0 && next.parameters.amplitudeB === 0
          ? 'Both input amplitudes are zero. The combined signal is zero at every time and its phase is undefined.'
          : 'Complete cancellation: the combined signal is zero at every time. A zero resultant has no direction, so its phase is undefined.')
        : 'The combined peak can range from ' + fmt(next.amplitudeRange.min) + ' to ' + fmt(next.amplitudeRange.max)
          + ' as relative phase changes. Here it is ' + fmt(next.amplitude) + '. The separate cycle mean squares total '
          + fmt(next.separateMeanSquares) + '; the coherent cross term is ' + fmt(next.interferenceMeanSquare)
          + ', giving a combined mean square of ' + fmt(next.meanSquare) + '.';
      for (const button of doc.querySelectorAll('[data-pi-preset]')) {
        const preset = presets[button.dataset.piPreset];
        button.setAttribute('aria-pressed', String(Object.keys(controls).every(key => key === 'cursorCycle' || next.parameters[key] === preset[key])));
      }
      find('pi-step-back').disabled = next.parameters.cursorCycle === 0;
      find('pi-step-forward').disabled = next.parameters.cursorCycle === 2;
      find('pi-error').hidden = true;
      find('pi-error').textContent = '';
      find('pi-results').hidden = false;
      for (const button of exports) button.disabled = false;
      current = next;
      find('pi-status').textContent = 'Current experiment ready. Both plots and 129 values use these settings.';
      return true;
    } catch (failure) {
      retire(failure);
      return false;
    }
  }

  function download(text, mediaType, filename) {
    let url;
    let link;
    try {
      url = URL.createObjectURL(new Blob([text], { type: mediaType }));
      link = doc.createElement('a');
      link.href = url;
      link.download = filename;
      doc.body.append(link);
      link.click();
      find('pi-status').textContent = 'Prepared ' + filename + ' for the browser download.';
    } catch (failure) {
      find('pi-status').textContent = 'The download could not be prepared. The current experiment is still available.';
    } finally {
      if (link) link.remove();
      if (url) setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  for (const input of Object.values(controls)) input.addEventListener('input', update);
  find('pi-controls').addEventListener('submit', event => { event.preventDefault(); update(); });
  for (const button of doc.querySelectorAll('[data-pi-preset]')) {
    button.addEventListener('click', () => {
      for (const [key, input] of Object.entries(controls)) input.value = String(presets[button.dataset.piPreset][key]);
      update();
    });
  }
  for (const [id, change] of [['pi-step-back', -1 / 16], ['pi-step-forward', 1 / 16]]) {
    find(id).addEventListener('click', () => {
      if (!update() || !current) return;
      controls.cursorCycle.value = String(Math.min(2, Math.max(0, current.parameters.cursorCycle + change)));
      update();
    });
  }
  find('pi-download-json').addEventListener('click', () => {
    if (update() && current) download(interferenceJson(current.parameters), 'application/json;charset=utf-8', 'phasor-experiment.json');
  });
  find('pi-download-csv').addEventListener('click', () => {
    if (update() && current) download(interferenceCsv(current.parameters), 'text/csv;charset=utf-8', 'phasor-signal-values.csv');
  });
  find('pi-download-course').addEventListener('click', () => download(courseText, 'application/json;charset=utf-8', 'phasor-interference.json'));
  update();
}

if (typeof document !== 'undefined') mountInterferenceLab(document);
