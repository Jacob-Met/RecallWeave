import {analyzeInduction, EXAMPLES, fractionText} from './mathematical-induction.mjs';

/** Bind the separate offline lab without touching a RecallWeave learning session. */
export function mountInductionLab(document, deckText, guideText) {
  const get = id => document.getElementById(id);
  const fields = ['a', 'b', 'A', 'B', 'C', 'D', 'n0'];
  let result = null;
  const put = (id, text) => { get(id).textContent = text; };
  const download = (name, text, type) => {
    const blob = new Blob([text], {type});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  function retire() {
    result = null;
    get('results').hidden = true;
    get('record').disabled = true;
    put('status', 'Inputs changed. Check the conjecture to obtain a new proof record.');
  }
  function inspect() {
    if (!result) return;
    const row = result.rows[Number(get('step').value)];
    put('step-label', 'Inspect n = ' + row.n + ' → ' + (row.n + 1));
    put('step-hypothesis', 'Assume S(' + row.n + ') = Q(' + row.n + ') = ' + fractionText(row.proposed) + '. This is a hypothesis, not a claim that this row is true.');
    put('step-calculation', 'Then S(' + (row.n + 1) + ') would be ' + fractionText(row.proposed) + ' + ' + row.nextTerm + ' = ' + fractionText(row.hypothesisPlusNext) + '. The target Q(' + (row.n + 1) + ') is ' + fractionText(row.proposedNext) + '.');
    put('step-residual', 'Target minus that conditional sum: ' + fractionText(row.residual) + '. This one substitution illustrates the symbolic successor check.');
  }
  function render() {
    get('results').hidden = false;
    get('record').disabled = false;
    const {inputs: v, base, successor: s} = result;
    const pass = result.proved;
    put('status', pass ? 'Proved for every integer n ≥ ' + v.n0 + ' within the stated sum family.' : 'Not proved: ' + (!base.pass && !s.pass ? 'the base and successor checks fail.' : !base.pass ? 'the base check fails.' : 'the successor check fails.'));
    get('status').dataset.state = pass ? 'pass' : 'fail';
    put('claim', 'S(n) = sum from k = 1 through n of (' + v.a + 'k + ' + v.b + '); Q(n) = (' + v.A + 'n² + ' + v.B + 'n + ' + v.C + ')/' + v.D + '; integer n ≥ ' + v.n0 + '. S(0) is the empty sum 0.');
    put('base-check', (base.pass ? 'Pass. ' : 'Fail. ') + 'At n = ' + base.n + ', the actual sum is ' + base.actual + ' and Q(n) is ' + fractionText(base.proposed) + '.');
    put('step-difference', 'Q(n + 1) − Q(n) = (' + (2 * v.A) + 'n + ' + (v.A + v.B) + ')/' + v.D + '. The next term is ' + v.a + 'n + ' + (v.a + v.b) + '.');
    put('symbolic-residual', 'Residual = Q(n + 1) − Q(n) − t(n + 1) = (' + s.linearNumerator + 'n + ' + s.constantNumerator + ')/' + s.denominator + '.');
    put('step-check', (s.pass ? 'Pass. Both numerator coefficients are zero, so the residual is zero for every allowed n.' : 'Fail. At least one numerator coefficient is nonzero, so this linear residual is not zero for every allowed n.'));
    put('conclusion', pass ? 'The true starting case and this all-n successor identity prove S(n) = Q(n) for every integer n ≥ ' + v.n0 + ' by ordinary induction. This conclusion comes from the symbolic argument, not from the finite table.' : 'A complete induction argument needs both checks. The table below contains a counterexample for this conjecture at n = ' + result.firstDisplayedCounterexample + '.');
    const tbody = get('rows');
    tbody.replaceChildren();
    for (const row of result.rows) {
      const tr = document.createElement('tr');
      for (const text of [String(row.n), row.actual, fractionText(row.proposed), row.equal ? 'Match' : 'Different']) {
        const td = document.createElement('td'); td.textContent = text; tr.append(td);
      }
      tbody.append(tr);
    }
    get('step').value = '0';
    inspect();
  }
  function check() {
    try {
      result = analyzeInduction(Object.fromEntries(fields.map(field => [field, get(field).value])));
      render();
    } catch (error) {
      result = null;
      get('results').hidden = true;
      get('record').disabled = true;
      put('status', error.message + ' Correct the visible inputs and check again.');
      get('status').dataset.state = 'fail';
    }
  }
  for (const field of fields) get(field).addEventListener('input', retire);
  get('conjecture').addEventListener('submit', event => { event.preventDefault(); check(); });
  EXAMPLES.forEach((example, index) => {
    const option = document.createElement('option'); option.value = String(index); option.textContent = example.title; get('example').append(option);
  });
  function loadExample() {
    const example = EXAMPLES[Number(get('example').value)];
    for (const field of fields) get(field).value = String(example[field]);
    check();
  }
  get('example').addEventListener('change', loadExample);
  get('step').addEventListener('input', inspect);
  get('record').addEventListener('click', () => { if (result) download('mathematical-induction-record.json', JSON.stringify(result, null, 2) + '\n', 'application/json'); });
  get('course').addEventListener('click', () => download('mathematical-induction.json', deckText, 'application/json'));
  get('guide').addEventListener('click', () => download('mathematical-induction.md', guideText, 'text/markdown'));
  loadExample();
}
