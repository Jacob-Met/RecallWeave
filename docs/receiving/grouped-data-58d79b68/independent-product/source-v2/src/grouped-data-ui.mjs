import { analyzeGroupedData, parseGroupedCount, serializeGroupedComparison, GROUPED_PRESETS, GROUPED_KEYS, GROUPED_OPTIONS } from './grouped-data.mjs';

function rateText(rate) {
  return rate === null ? 'Unavailable' : (rate.value * 100).toFixed(2) + '%';
}
function fractionText(rate) {
  return rate === null ? 'Unavailable' : rate.numerator + ' / ' + rate.denominator;
}
function directionText(direction) {
  return { a_higher: 'A has the higher rate', b_higher: 'B has the higher rate', equal: 'The rates are exactly equal', unavailable: 'A comparison is unavailable' }[direction];
}
function gapText(delta) {
  if (delta === null) return 'A missing rate prevents this difference.';
  if (delta.numerator === '0') return 'Difference: 0 percentage points.';
  const magnitude = Math.abs(delta.value) * 100;
  const side = BigInt(delta.numerator) > 0n ? 'A' : 'B';
  return `Difference: ${magnitude < 0.005 ? 'less than 0.01' : magnitude.toFixed(2)} percentage points in favor of ${side}.`;
}

export function mountGroupedDataExplorer(doc, { courseText, saveFile } = {}) {
  if (typeof courseText !== 'string') throw new Error('The original course is required.');
  const course = JSON.parse(courseText);
  const view = doc.defaultView;
  const $ = id => doc.getElementById(id);
  const text = (id, value) => { $(id).textContent = value; };
  let current = null;
  let edited = false;
  const save = saveFile || ((filename, content, mime) => {
    const url = view.URL.createObjectURL(new view.Blob([content], { type: mime }));
    const link = doc.createElement('a');
    link.href = url; link.download = filename;
    doc.body.appendChild(link);
    try { link.click(); }
    finally {
      link.remove();
      view.setTimeout(() => view.URL.revokeObjectURL(url), 1000);
    }
  });

  function read() {
    const counts = {};
    for (const option of GROUPED_OPTIONS) {
      counts[option] = {};
      for (const group of GROUPED_KEYS) {
        counts[option][group] = {};
        for (const field of ['successes', 'total']) {
          counts[option][group][field] = parseGroupedCount(
            $(`${option}-${group}-${field}`).value,
            `Option ${option.toUpperCase()}, ${group}, ${field}`
          );
        }
      }
    }
    const mix = parseGroupedCount($('mix').value, 'Experienced-group percentage');
    return analyzeGroupedData(counts, mix);
  }

  function insight(result) {
    const within = result.groups[0].comparison === 'a_higher' ? 'A' : 'B';
    const overall = result.observed.comparison === 'a_higher' ? 'A' : 'B';
    const messages = {
      strict_reversal: `Both groups favor ${within}, while the recorded pooled sample favors ${overall}. The options have different group mixes: this is a strict Simpson reversal.`,
      same_direction: `${within} is higher in both groups and in the recorded pooled sample. There is no strict reversal here; group composition can still change the size of the gap.`,
      mixed_groups: 'The groups favor different options. There is no single strict within-group direction for the pooled comparison to reverse.',
      subgroup_tie: 'At least one within-group comparison is tied. This is not the strict pattern of an advantage in both groups reversing when pooled.',
      pooled_tie: `Both groups favor ${within}, but the pooled rates tie. The explorer distinguishes this from a strict reversal.`,
      unavailable: 'A zero total leaves a required group rate unavailable. The strict two-group pattern cannot be classified, but the other available rates are still shown.'
    };
    return messages[result.classification];
  }

  function render() {
    text('download-status', '');
    text('mix-label', `Experienced ${$('mix').value}% · newcomers ${100 - Number($('mix').value)}%`);
    try {
      current = read();
      $('input-error').hidden = true;
      text('input-error', '');
      $('results').hidden = false;
      $('download-data').disabled = false;
      $('download-course').disabled = false;
      const message = insight(current);
      text('interpretation', message);
      text('current-status', 'Current counts are valid. ' + directionText(current.observed.comparison) + ' in the pooled sample.');
      for (const group of current.groups) {
        for (const option of GROUPED_OPTIONS) {
          const cell = current.counts[option][group.key];
          text(`${group.key}-${option}-rate`, `${cell.successes} / ${cell.total} · ${rateText(group[option])}`);
        }
        text(`${group.key}-direction`, directionText(group.comparison));
      }
      for (const option of GROUPED_OPTIONS) {
        const pool = current.observed[option];
        text('pooled-' + option, rateText(pool.rate));
        text('pooled-' + option + '-counts', `${pool.successes} successes / ${pool.total} attempts`);
        const mix = pool.experiencedWeight;
        const experienced = mix === null ? 0 : mix.value * 100;
        $('mix-' + option + '-experienced').style.width = experienced + '%';
        $('mix-' + option + '-newcomers').style.width = (mix === null ? 0 : 100 - experienced) + '%';
        text('mix-' + option + '-text', mix === null
          ? 'No recorded attempts: group mix unavailable.'
          : `${(100 - experienced).toFixed(2)}% newcomers · ${experienced.toFixed(2)}% experienced`);
        text('reference-' + option, rateText(current.reference[option]));
        $('reference-bar-' + option).style.width = (current.reference[option]?.value ?? 0) * 100 + '%';
      }
      text('pooled-direction', directionText(current.observed.comparison));
      text('pooled-gap', gapText(current.observed.difference));
      text('reference-direction', directionText(current.reference.comparison));
      text('reference-gap', gapText(current.reference.difference));
      const missing = GROUPED_OPTIONS.filter(option => current.reference.missing[option].length)
        .map(option => `Option ${option.toUpperCase()}: ${current.reference.missing[option].join(' and ')} rate unavailable at a positive weight.`);
      text('reference-support', missing.length ? missing.join(' ') : 'All positive-weight group rates are available. The recorded counts above are unchanged.');
      const list = $('exact-fractions');
      list.replaceChildren();
      const pairs = [];
      for (const group of current.groups) {
        for (const option of GROUPED_OPTIONS) pairs.push([`${group.key}, option ${option.toUpperCase()}`, group[option]]);
      }
      for (const option of GROUPED_OPTIONS) {
        pairs.push([`Pooled option ${option.toUpperCase()}`, current.observed[option].rate]);
        pairs.push([`Reference option ${option.toUpperCase()}`, current.reference[option]]);
      }
      pairs.push(['Exact reference difference, A minus B', current.reference.difference]);
      for (const [label, value] of pairs) {
        const dt = doc.createElement('dt'); const dd = doc.createElement('dd');
        dt.textContent = label; dd.textContent = fractionText(value);
        list.append(dt, dd);
      }
      return true;
    } catch (error) {
      current = null;
      $('results').hidden = true;
      $('download-data').disabled = true;
      $('download-course').disabled = true;
      $('input-error').hidden = false;
      text('input-error', error instanceof Error ? error.message : 'Check the count fields.');
      text('current-status', 'Results are unavailable until every field is valid.');
      return false;
    }
  }

  function preset() {
    const selected = GROUPED_PRESETS[$('preset').value];
    if (!selected) throw new Error('Unknown teaching example.');
    edited = false;
    for (const option of GROUPED_OPTIONS) for (const group of GROUPED_KEYS) for (const field of ['successes', 'total']) {
      $(`${option}-${group}-${field}`).value = String(selected.counts[option][group][field]);
    }
    $('mix').value = String(selected.experiencedPercent);
    text('preset-note', selected.note);
    render();
  }

  function download(kind) {
    // Read the actual fields again; even a programmatic edit cannot export an old cached result.
    if (!render()) return;
    try {
      if (kind === 'data') save('grouped-data-comparison.json',
        serializeGroupedComparison(current.counts, current.reference.experiencedPercent), 'application/json;charset=utf-8');
      else save('grouped-data-course.json', courseText, 'application/json;charset=utf-8');
      text('download-status', 'Download requested. Your browser controls where the file is saved.');
    } catch {
      text('download-status', 'The download could not be prepared. Your current counts remain available; try again.');
    }
  }

  $('counts-form').addEventListener('submit', event => event.preventDefault());
  $('counts-form').addEventListener('input', event => {
    if (event.target.matches('[data-count]')) {
      edited = true;
      text('preset-note', 'Edited teaching counts. Their sample origin is not verified; nothing is sent or stored.');
      render();
    }
  });
  $('mix').addEventListener('input', render);
  $('preset').addEventListener('change', preset);
  $('restore-preset').addEventListener('click', preset);
  $('download-data').addEventListener('click', () => download('data'));
  $('download-course').addEventListener('click', () => download('course'));
  text('course-title', course.title);
  text('course-count', String(course.items.length));
  preset();
  return Object.freeze({ refresh: render, getCurrent: () => current, isEdited: () => edited });
}
