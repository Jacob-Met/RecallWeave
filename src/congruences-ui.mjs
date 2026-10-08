import { solveCongruences, inspectCongruences, serializeObservation } from './congruences.mjs';

export function startCongruences(document, courseText, guideText) {
  const byId = id => document.getElementById(id);
  const fields = ['a', 'm', 'b', 'n'].map(byId);
  const pairForm = byId('pair-form'), probeForm = byId('probe-form');
  const probe = byId('probe'), status = byId('status'), error = byId('error');
  const resultArea = byId('result'), proof = byId('proof');
  const inspectArea = byId('inspection'), windowBody = byId('window-body');
  const observationButton = byId('download-observation');
  let applied = null, inspection = null;

  const text = (tag, value, className) => {
    const element = document.createElement(tag);
    element.textContent = value;
    if (className) element.className = className;
    return element;
  };
  function invalidateInspection(message) {
    inspection = null;
    inspectArea.hidden = true;
    windowBody.replaceChildren();
    byId('lanes').replaceChildren();
    observationButton.disabled = true;
    byId('inspection-status').textContent = message;
  }
  function invalidatePair(message = 'Inputs changed. Choose Compute both conditions to apply them.') {
    applied = null;
    resultArea.hidden = true;
    proof.replaceChildren();
    probe.disabled = true;
    byId('inspect-button').disabled = true;
    byId('use-solution').disabled = true;
    error.textContent = '';
    invalidateInspection('No computed pair is selected.');
    status.textContent = message;
  }
  function showProof(result) {
    const {a, m, b, n} = result.normalized;
    const c = result.compatibility, s = result.solution;
    const steps = [
      `Normalize: x ≡ ${a} (mod ${m}) and x ≡ ${b} (mod ${n}).`,
      `Shared divisor: gcd(${m}, ${n}) = ${c.gcd}.`,
      `Bézout witness: (${c.bezout.s}) × ${m} + (${c.bezout.t}) × ${n} = ${c.gcd}.`,
      `Difference: ${b} − ${a} = ${c.difference}; its canonical remainder modulo ${c.gcd} is ${c.differenceRemainder}.`,
    ];
    if (s) {
      steps.push(`Write x = ${a} + ${m}k. Divide the condition by the gcd: ${c.reducedM}k ≡ ${s.differenceQuotient} (mod ${c.reducedN}).`);
      steps.push(s.reducedInverse === null
        ? 'The reduced modulus is 1: every integer multiplier works. Choose canonical k = 0; no inverse is needed.'
        : `The inverse of ${c.reducedM} modulo ${c.reducedN} is ${s.reducedInverse}. Canonical k = ${s.multiplier}.`);
      steps.push(`Substitute: ${a} + ${m} × ${s.multiplier} = ${s.unreduced}. Reduce modulo lcm = ${m} × ${c.reducedN} = ${s.period} to get ${s.first}.`);
      steps.push(`Check: ${s.first} mod ${m} = ${s.residueChecks[0]}; ${s.first} mod ${n} = ${s.residueChecks[1]}. Every solution is ${s.first} + ${s.period}j for an integer j.`);
    } else {
      steps.push(`No integer solution: the shared divisor ${c.gcd} does not divide the difference ${c.difference}. This is an exact contradiction, independent of the displayed window.`);
    }
    proof.replaceChildren(...steps.map(value => text('li', value)));
    byId('outcome').textContent = s ? `x ≡ ${s.first} (mod ${s.period})` : 'These two conditions have no common integer.';
    byId('outcome-detail').textContent = s
      ? `Least nonnegative solution: ${s.first}. Least positive period: ${s.period}. Negative solutions are included by taking negative integer j.`
      : 'Each condition separately has infinitely many solutions, but no integer belongs to both.';
    resultArea.dataset.compatible = String(c.compatible);
    resultArea.hidden = false;
    byId('use-solution').disabled = !s;
  }
  function drawLanes(rows) {
    const namespace = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(namespace, 'svg');
    svg.setAttribute('viewBox', '0 0 840 160');
    svg.setAttribute('role', 'img');
    const title = document.createElementNS(namespace, 'title');
    title.textContent = 'Matches among 24 consecutive integers. Horizontal labels are offsets from the inspected integer. Exact values and statuses are in the table below.';
    svg.append(title);
    for (const [index, label, field] of [[0, 'A', 'matchesA'], [1, 'B', 'matchesB'], [2, 'Both', 'matchesBoth']]) {
      const caption = document.createElementNS(namespace, 'text');
      caption.setAttribute('x', '8'); caption.setAttribute('y', String(34 + index * 42));
      caption.textContent = label; svg.append(caption);
      for (const row of rows) {
        const circle = document.createElementNS(namespace, 'circle');
        circle.setAttribute('cx', String(90 + row.offset * 31));
        circle.setAttribute('cy', String(29 + index * 42));
        circle.setAttribute('r', row[field] ? '8' : '3');
        circle.setAttribute('class', row[field] ? 'match' : 'miss');
        svg.append(circle);
      }
    }
    for (const row of rows) {
      const label = document.createElementNS(namespace, 'text');
      label.setAttribute('x', String(90 + row.offset * 31));
      label.setAttribute('y', '150'); label.setAttribute('text-anchor', 'middle');
      label.textContent = String(row.offset); svg.append(label);
    }
    byId('lanes').replaceChildren(svg);
  }
  function inspect() {
    error.textContent = '';
    if (!applied) return invalidateInspection('Compute the pair first.');
    try {
      inspection = inspectCongruences(applied, probe.value);
      const first = inspection.rows[0], {a, m, b, n} = applied.normalized;
      byId('selected-integer').textContent = first.x;
      byId('selected-result').textContent = `A: remainder ${first.remainderA}, needs ${a} modulo ${m} — ${first.matchesA ? 'matches' : 'does not match'}. B: remainder ${first.remainderB}, needs ${b} modulo ${n} — ${first.matchesB ? 'matches' : 'does not match'}. ${first.matchesBoth ? 'This integer satisfies both.' : 'This integer does not satisfy both.'}`;
      byId('window-caption').textContent = `Exactly 24 consecutive integers, ${first.x} through ${inspection.rows.at(-1).x}. This is a bounded window, not a complete period. Lane labels are offsets from ${first.x}.`;
      windowBody.replaceChildren(...inspection.rows.map(row => {
        const tr = document.createElement('tr');
        tr.dataset.both = String(row.matchesBoth);
        const values = [row.offset, row.x, row.remainderA, row.matchesA ? 'A matches' : 'A does not match',
          row.remainderB, row.matchesB ? 'B matches' : 'B does not match',
          row.matchesBoth ? 'Both match' : 'Not both'];
        values.forEach((value, index) => {
          const cell = text(index === 1 ? 'th' : 'td', String(value));
          if (index === 1) cell.scope = 'row';
          tr.append(cell);
        });
        return tr;
      }));
      drawLanes(inspection.rows);
      inspectArea.hidden = false;
      observationButton.disabled = false;
      byId('inspection-status').textContent = `Inspected integer ${first.x}; all 24 window rows are shown.`;
    } catch (failure) {
      invalidateInspection('Inspection refused; correct the integer and choose Inspect.');
      error.textContent = failure.message;
    }
  }
  function compute() {
    invalidatePair('Computing both conditions.');
    try {
      applied = solveCongruences(...fields.map(field => field.value));
      showProof(applied);
      probe.disabled = false;
      byId('inspect-button').disabled = false;
      probe.value = applied.solution?.first ?? '0';
      inspect();
      status.textContent = applied.solution ? 'Compatible pair computed exactly.' : 'Incompatible pair proved exactly.';
    } catch (failure) {
      invalidatePair('No applied result. Correct the inputs and compute again.');
      error.textContent = failure.message;
    }
  }
  function download(name, content, type) {
    let url;
    try {
      url = URL.createObjectURL(new Blob([content], {type}));
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = name;
      document.body.append(anchor);
      try { anchor.click(); } finally { anchor.remove(); }
      setTimeout(() => URL.revokeObjectURL(url), 3000);
      status.textContent = 'Prepared ' + name + '. Keep the saved file to retain it.';
    } catch (failure) {
      if (url) URL.revokeObjectURL(url);
      error.textContent = 'Download could not be prepared: ' + failure.message;
    }
  }
  fields.forEach(field => field.addEventListener('input', () => invalidatePair()));
  probe.addEventListener('input', () => {
    error.textContent = '';
    invalidateInspection('Integer changed. Choose Inspect to apply it.');
  });
  pairForm.addEventListener('submit', event => { event.preventDefault(); compute(); });
  probeForm.addEventListener('submit', event => { event.preventDefault(); inspect(); });
  byId('use-solution').addEventListener('click', () => {
    if (!applied?.solution) return;
    probe.value = applied.solution.first;
    inspect();
    probe.focus();
  });
  const examples = {
    coprime: ['3', '4', '2', '5'], shared: ['2', '6', '5', '9'],
    contradiction: ['1', '4', '2', '6'], negative: ['-14', '5', '-1', '7'],
    redundant: ['5', '12', '1', '4'],
    large: ['0', '1', '9007199254740993', '999999999999999999'],
  };
  document.querySelectorAll('[data-example]').forEach(button => button.addEventListener('click', () => {
    const values = examples[button.dataset.example];
    fields.forEach((field, index) => { field.value = values[index]; });
    invalidatePair('Example loaded. Choose Compute both conditions to apply it.');
    fields[0].focus();
  }));
  observationButton.addEventListener('click', () => {
    if (!applied || !inspection) return;
    try { download('recallweave-congruence-observation.json', serializeObservation(applied, inspection), 'application/json;charset=utf-8'); }
    catch (failure) { error.textContent = failure.message; }
  });
  byId('download-course').addEventListener('click', () => download('congruences.json', courseText, 'application/json;charset=utf-8'));
  byId('download-guide').addEventListener('click', () => download('congruences.md', guideText, 'text/markdown;charset=utf-8'));
  invalidatePair('Enter two remainder conditions, then compute their common integer solutions.');
}
