/** Original Hamming(7,4) teaching model. Position 1 is displayed at the left. */
const CHECK_GROUPS = Object.freeze([
  Object.freeze({parityPosition: 1, positions: Object.freeze([1, 3, 5, 7])}),
  Object.freeze({parityPosition: 2, positions: Object.freeze([2, 3, 6, 7])}),
  Object.freeze({parityPosition: 4, positions: Object.freeze([4, 5, 6, 7])})
]);
const DATA_POSITIONS = Object.freeze([3, 5, 6, 7]);

function binaryWord(value, length, label) {
  if (typeof value !== 'string' || value.length !== length || !/^[01]+$/.test(value)) {
    throw new TypeError(label + ' must be exactly ' + length + ' binary digits (0 or 1).');
  }
  return value;
}

function errorPositions(value) {
  if (!Array.isArray(value) || value.length > 7) {
    throw new TypeError('Flipped positions must be an array of unique positions 1 through 7.');
  }
  const copied = [];
  for (let index = 0; index < value.length; index++) {
    if (!Object.hasOwn(value, index)) throw new TypeError('Flipped positions must not contain empty entries.');
    const position = value[index];
    if (!Number.isInteger(position) || position < 1 || position > 7 || copied.includes(position)) {
      throw new TypeError('Each flipped position must be a distinct integer from 1 through 7.');
    }
    copied.push(position);
  }
  return Object.freeze(copied.sort((left, right) => left - right));
}

function dataFromWord(word) {
  return DATA_POSITIONS.map(position => word[position - 1]).join('');
}

function distance(left, right) {
  let count = 0;
  for (let index = 0; index < left.length; index++) if (left[index] !== right[index]) count++;
  return count;
}

function encodeHamming74(dataBits) {
  binaryWord(dataBits, 4, 'Data');
  const bits = [0, 0, Number(dataBits[0]), 0, Number(dataBits[1]), Number(dataBits[2]), Number(dataBits[3])];
  for (const group of CHECK_GROUPS) {
    bits[group.parityPosition - 1] = group.positions.reduce(
      (parity, position) => parity ^ bits[position - 1], 0
    );
  }
  return bits.join('');
}

/** The decoder receives only the received word. It never reads simulator truth. */
function inspectReceived74(receivedWord) {
  binaryWord(receivedWord, 7, 'Received word');
  const checks = Object.freeze(CHECK_GROUPS.map(group => {
    const bits = group.positions.map(position => receivedWord[position - 1]).join('');
    const ones = [...bits].reduce((total, bit) => total + Number(bit), 0);
    return Object.freeze({
      parityPosition: group.parityPosition,
      positions: group.positions,
      bits,
      ones,
      failed: ones % 2 === 1
    });
  }));
  const syndrome = checks.reduce((total, check) => total + (check.failed ? check.parityPosition : 0), 0);
  const proposedPosition = syndrome === 0 ? null : syndrome;
  const candidate = [...receivedWord];
  if (proposedPosition !== null) {
    candidate[proposedPosition - 1] = candidate[proposedPosition - 1] === '0' ? '1' : '0';
  }
  const candidateWord = candidate.join('');
  return Object.freeze({
    receivedWord,
    checks,
    syndromeBits: syndrome.toString(2).padStart(3, '0'),
    syndrome,
    proposedPosition,
    candidateWord,
    candidateData: dataFromWord(candidateWord)
  });
}

/** Deterministic authored scenario, not a model of channel error probabilities. */
function runHamming74(dataBits, flippedPositions, prediction = null) {
  const codeword = encodeHamming74(dataBits);
  const positions = errorPositions(flippedPositions);
  if (prediction !== null && (!Number.isInteger(prediction) || prediction < 0 || prediction > 7)) {
    throw new TypeError('A prediction must be null or an integer syndrome from 0 through 7.');
  }
  const selected = new Set(positions);
  const receivedWord = [...codeword].map((bit, index) =>
    selected.has(index + 1) ? (bit === '0' ? '1' : '0') : bit
  ).join('');
  const decoder = inspectReceived74(receivedWord);
  const flipCount = positions.length;
  const outcome = flipCount === 0 ? 'clean' : flipCount === 1 ? 'corrected' :
    decoder.syndrome === 0 ? 'undetected' : 'miscorrected';
  return Object.freeze({
    dataBits,
    codeword,
    errorPositions: positions,
    receivedWord,
    decoder,
    truth: Object.freeze({
      flipCount,
      withinSingleErrorAssumption: flipCount <= 1,
      originalRecovered: decoder.candidateWord === codeword,
      remainingCodewordErrors: distance(decoder.candidateWord, codeword),
      remainingDataErrors: distance(decoder.candidateData, dataBits),
      outcome
    }),
    prediction,
    predictionCorrect: prediction === null ? null : prediction === decoder.syndrome
  });
}

function formatHammingRecord(result) {
  if (!result || typeof result !== 'object') throw new TypeError('Supply a completed Hamming scenario.');
  const run = runHamming74(result.dataBits, result.errorPositions, result.prediction);
  const decoder = run.decoder;
  const truth = run.truth;
  const yesNo = value => value ? 'yes' : 'no';
  const labels = {
    clean: 'Clean transmission in this authored scenario',
    corrected: 'Single error corrected',
    undetected: 'Nonzero error pattern undetected',
    miscorrected: 'Multiple errors miscorrected'
  };
  return [
    'HAMMING(7,4) — WORKED RECORD',
    '',
    'Convention: displayed positions run 1 to 7 from left to right.',
    'Data positions: 3, 5, 6, 7. Even parity positions: 1, 2, 4.',
    '',
    'SENDER AND AUTHORED CHANNEL (SIMULATION TRUTH)',
    'Original data: ' + run.dataBits,
    'Encoded word: ' + run.codeword,
    'Flipped positions: ' + (run.errorPositions.length ? run.errorPositions.join(', ') : 'none'),
    'Received word: ' + run.receivedWord,
    '',
    'RECEIVER (RECEIVED BITS ONLY)',
    ...decoder.checks.map(check => 'Check s' + check.parityPosition + ': positions ' +
      check.positions.join(', ') + '; bits ' + check.bits + '; ones ' + check.ones +
      '; ' + (check.failed ? 'FAIL' : 'PASS') + '.'),
    'Syndrome (s4s2s1): ' + decoder.syndromeBits,
    'Syndrome value: ' + decoder.syndrome,
    'One-error decoder proposal: ' + (decoder.proposedPosition === null ?
      'Keep received word (zero syndrome).' : 'Flip position ' + decoder.proposedPosition + '.'),
    'Candidate word: ' + decoder.candidateWord,
    'Candidate data: ' + decoder.candidateData,
    '',
    'SIMULATION COMPARISON (NOT INFORMATION AVAILABLE TO THE DECODER)',
    'Actual flipped bits: ' + truth.flipCount,
    'At-most-one-error assumption satisfied: ' + yesNo(truth.withinSingleErrorAssumption) + '.',
    'Original codeword recovered: ' + yesNo(truth.originalRecovered) + '.',
    'Remaining codeword differences: ' + truth.remainingCodewordErrors + '.',
    'Remaining data differences: ' + truth.remainingDataErrors + '.',
    'Outcome: ' + labels[truth.outcome] + '.',
    '',
    'LEARNER PREDICTION',
    run.prediction === null ? 'Prediction: not supplied.' :
      'Prediction: syndrome ' + run.prediction + '; ' + (run.predictionCorrect ? 'matched' : 'did not match') +
      ' the received checks.',
    '',
    'Limits: The decoder assumes at most one flipped bit. Zero syndrome means the checks pass; ' +
      'it does not prove unchanged transmission. Two errors are detected by these parity checks, ' +
      'but the one-error correction rule can miscorrect them. No channel probability or real reliability is inferred.',
    ''
  ].join('\n');
}

export { encodeHamming74, inspectReceived74, runHamming74, formatHammingRecord };
