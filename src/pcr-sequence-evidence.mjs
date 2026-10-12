/** Synthetic read evidence and idealized PCR growth. Not a laboratory protocol. */
export const PCR_REFERENCE = 'ACGTACGTACGT';

function read(id, start, sequence) { return Object.freeze({id, start, sequence}); }
export const PCR_READ_PRESETS = Object.freeze({
  even: Object.freeze({
    label: 'Even coverage — no gaps',
    description: 'Five overlapping synthetic reads span the twelve reference positions. Coverage is nonuniform despite full span.',
    reads: Object.freeze([
      read('E1', 0, 'ACGT'), read('E2', 2, 'GTAC'), read('E3', 4, 'ACGT'),
      read('E4', 6, 'GTAC'), read('E5', 8, 'ACGT')
    ])
  }),
  pileup: Object.freeze({
    label: 'Pileup — same read count, missing region',
    description: 'Five reads with the same total aligned bases crowd the left side. The right side has no evidence.',
    reads: Object.freeze([
      read('P1', 0, 'ACGT'), read('P2', 0, 'ACGT'), read('P3', 1, 'CGTA'),
      read('P4', 1, 'CGTA'), read('P5', 2, 'GTAC')
    ])
  }),
  mixed: Object.freeze({
    label: 'Mixed bases — an observed fraction is not a genotype',
    description: 'Two of three aligned reads at reference position seven show A instead of G. No independence or genotype is established.',
    reads: Object.freeze([
      read('M1', 0, 'ACGT'), read('M2', 2, 'GTAC'), read('M3', 4, 'ACAT'),
      read('M4', 4, 'ACGT'), read('M5', 6, 'ATAC'), read('M6', 8, 'ACGT')
    ])
  })
});

function finiteInteger(value, label, lower, upper) {
  if (!Number.isInteger(value) || value < lower || value > upper) throw new RangeError(`${label} must be an integer from ${lower} to ${upper}`);
  return value;
}

/** Fixed-efficiency exponential *model*. No assay efficiency or count is measured. */
export function modelAmplification(startCopies, cycles, efficiencyPercent) {
  finiteInteger(startCopies, 'starting copies', 1, 1000);
  finiteInteger(cycles, 'cycles', 0, 30);
  finiteInteger(efficiencyPercent, 'efficiency percent', 0, 100);
  const factor = 1 + efficiencyPercent / 100;
  return Object.freeze({
    startCopies, cycles, efficiencyPercent, factor,
    modeled: startCopies * factor ** cycles,
    ideal: startCopies * 2 ** cycles
  });
}

/** Analyze literal synthetic aligned reads, never inferred missing positions. */
export function summarizeReads(reference, reads) {
  if (typeof reference !== 'string' || !/^[ACGT]{4,64}$/.test(reference)) throw new RangeError('reference must be 4–64 DNA bases');
  if (!Array.isArray(reads) || reads.length > 128) throw new RangeError('reads must be an array of at most 128 observations');
  const seen = new Set();
  const positions = Array.from(reference, (base, index) => ({
    index, referenceBase: base, depth: 0, matching: 0, nonmatching: 0, counts: {A: 0, C: 0, G: 0, T: 0}, reads: []
  }));
  for (const observed of reads) {
    if (!observed || typeof observed !== 'object' || Array.isArray(observed)) throw new TypeError('read must be an object');
    const {id, start, sequence} = observed;
    if (typeof id !== 'string' || !/^[A-Za-z][A-Za-z0-9_-]{0,20}$/.test(id) || seen.has(id)) throw new RangeError('read ids must be distinct short identifiers');
    if (typeof sequence !== 'string' || !/^[ACGT]{1,64}$/.test(sequence)) throw new RangeError('read sequence must consist of 1–64 bases');
    if (!Number.isInteger(start) || start < 0 || start + sequence.length > reference.length) throw new RangeError('read alignment exceeds reference');
    seen.add(id);
    Array.from(sequence).forEach((base, offset) => {
      const p = positions[start + offset];
      p.depth++;
      p.counts[base]++;
      p.reads.push(id);
      if (base === p.referenceBase) p.matching++;
      else p.nonmatching++;
    });
  }
  const totalAlignedBases = positions.reduce((sum, p) => sum + p.depth, 0);
  const coveredBases = positions.filter(p => p.depth > 0).length;
  return {
    reference, totalReads: reads.length, totalAlignedBases, coveredBases,
    uncoveredBases: reference.length - coveredBases,
    meanDepth: totalAlignedBases / reference.length,
    maximumDepth: Math.max(...positions.map(p => p.depth)),
    positions
  };
}

export function observationForPreset(preset, startCopies, cycles, efficiencyPercent) {
  if (typeof preset !== 'string' || !Object.hasOwn(PCR_READ_PRESETS, preset)) throw new RangeError('unknown synthetic read preset');
  const entry = PCR_READ_PRESETS[preset];
  const amplification = modelAmplification(startCopies, cycles, efficiencyPercent);
  const alignment = summarizeReads(PCR_REFERENCE, entry.reads);
  return {
    format: 'recallweave-synthetic-evidence/1',
    warning: 'Synthetic educational observation; no measured PCR result, genotype, or independent molecules.',
    preset, assumptions: {
      amplification: 'Constant per-cycle multiplier 1 + efficiencyPercent/100; no plateau, contamination, stochastic sampling, or calibration.',
      alignments: 'Synthetic predetermined short reads, exactly aligned to the displayed reference with no quality filtering or molecular deduplication.'
    },
    amplification, alignment
  };
}
