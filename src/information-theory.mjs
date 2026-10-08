/** A finite, authored joint distribution. No learner model or sampling is used. */
export const INFORMATION_FORMAT = 'recallweave-information-table/1';
export const MAX_INFORMATION_TEXT_LENGTH = 512;

function freezeInformation(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freezeInformation(child);
    Object.freeze(value);
  }
  return value;
}

export const INFORMATION_EXAMPLES = freezeInformation([
  { id: 'independent', title: 'Independent fair labels', text: '1 1\n1 1', note: 'Each X label has the same Y distribution. Does seeing X change uncertainty about Y?' },
  { id: 'copy', title: 'A perfect copy', text: '2 0\n0 2', note: 'The two labels vary, but knowing either one identifies the other.' },
  { id: 'biased-copy', title: 'A biased perfect copy', text: '3 0\n0 1', note: 'Prediction is perfect. The shared information is less than one bit because the labels are uneven.' },
  { id: 'opposite', title: 'Opposite labels', text: '0 1\n1 0', note: 'The labels disagree every time. One still determines the other.' },
  { id: 'coarse', title: 'Four labels become two groups', text: '1 0\n1 0\n0 1\n0 1', note: 'X determines Y, but a Y label leaves two possible X labels. Compare the two conditional entropies.' },
  { id: 'noisy', title: 'A noisy correspondence', text: '3 1\n1 3', note: 'Some pairs occur less often than under independence. Inspect their signed contributions to the total.' },
  { id: 'rare', title: 'A rare ambiguous observation', text: '8 0\n1 1', note: 'Before observing X, Y is usually Y1. Observing X2 makes Y evenly split. Compare that one case with the weighted average.' },
  { id: 'empty', title: 'An unused category', text: '1 0 0\n1 0 0\n0 0 0', note: 'Y is already certain. X3, Y2 and Y3 have no cards; conditioning on them is undefined.' },
  { id: 'constant', title: 'Only one populated pair', text: '7 0\n0 0', note: 'Both labels are already known before drawing. There is no uncertainty for one to remove.' },
  { id: 'near', title: 'A tiny dependence', text: '998 999\n997 998', note: 'All four exact factorization checks differ by one. Rounded information values must not be used to decide independence.' }
]);

/** Strict, bounded text input; original text is retained by the page's explicit export. */
export function parseInformationCounts(text) {
  if (typeof text !== 'string' || text.length > MAX_INFORMATION_TEXT_LENGTH) {
    throw new RangeError('Use at most 512 characters for the count table.');
  }
  const trimmed = text.trim();
  if (!trimmed) throw new RangeError('Enter two to four rows of counts.');
  const lines = trimmed.split(/\r?\n/);
  if (lines.length < 2 || lines.length > 4) {
    throw new RangeError('Use two to four rows, one row per line.');
  }
  const counts = lines.map(function (line, row) {
    if (!line.trim()) throw new RangeError('Row ' + (row + 1) + ' is blank.');
    const cells = line.trim().split(/\s+/u);
    if (cells.length < 2 || cells.length > 4) {
      throw new RangeError('Row ' + (row + 1) + ' needs two to four counts.');
    }
    return cells.map(function (token, column) {
      if (!/^(0|[1-9][0-9]{0,2})$/.test(token)) {
        throw new RangeError('Row ' + (row + 1) + ', column ' + (column + 1) + ': use a whole count from 0 to 999.');
      }
      return Number(token);
    });
  });
  return freezeInformation(copyInformationCounts(counts));
}

function copyInformationCounts(input) {
  if (!Array.isArray(input) || input.length < 2 || input.length > 4) {
    throw new RangeError('The table needs two to four rows.');
  }
  const width = Array.isArray(input[0]) ? input[0].length : 0;
  if (width < 2 || width > 4) throw new RangeError('The table needs two to four columns.');
  const copy = [];
  let total = 0;
  for (let row = 0; row < input.length; row += 1) {
    if (!Array.isArray(input[row]) || input[row].length !== width) {
      throw new RangeError('Every row must have the same number of counts.');
    }
    const resultRow = [];
    for (let column = 0; column < width; column += 1) {
      const count = input[row][column];
      if (typeof count !== 'number' || !Number.isInteger(count) || count < 0 || count > 999) {
        throw new RangeError('Every count must be an integer from 0 to 999.');
      }
      resultRow.push(count === 0 ? 0 : count);
      total += count;
    }
    copy.push(resultRow);
  }
  if (total === 0) throw new RangeError('At least one count must be greater than zero.');
  return copy;
}

function informationFraction(numerator, denominator) {
  let a = numerator;
  let b = denominator;
  while (b !== 0) {
    const next = a % b;
    a = b;
    b = next;
  }
  const divisor = a || 1;
  return {
    numerator: numerator / divisor,
    denominator: denominator / divisor,
    value: numerator / denominator
  };
}

function informationEntropyTerm(count, total) {
  return count === 0 ? 0 : (count / total) * Math.log2(total / count);
}

/** phi(t)=(1+t)ln(1+t)-t; its quadratic series preserves tiny dependence. */
function informationPhi(t) {
  if (t === -1) return 1;
  if (Math.abs(t) < 0.01) {
    let power = t * t;
    let result = 0;
    for (let k = 2; k <= 12; k += 1) {
      result += (k % 2 === 0 ? 1 : -1) * power / (k * (k - 1));
      power *= t;
    }
    return result;
  }
  return (1 + t) * Math.log1p(t) - t;
}

function informationCondition(counts, total, population) {
  if (total === 0) {
    return { defined: false, probabilities: null, entropyBits: null, weightedEntropyBits: 0 };
  }
  const entropyBits = counts.reduce(function (sum, count) {
    return sum + informationEntropyTerm(count, total);
  }, 0);
  return {
    defined: true,
    probabilities: counts.map(function (count) { return informationFraction(count, total); }),
    entropyBits,
    weightedEntropyBits: (total / population) * entropyBits
  };
}

/** Complete detached snapshot. Counts and factorization checks are exact; bits are approximate. */
export function analyzeInformationTable(input) {
  const counts = copyInformationCounts(input);
  const rowTotals = counts.map(function (row) { return row.reduce(function (sum, n) { return sum + n; }, 0); });
  const columnTotals = counts[0].map(function (_, column) {
    return counts.reduce(function (sum, row) { return sum + row[column]; }, 0);
  });
  const total = rowTotals.reduce(function (sum, n) { return sum + n; }, 0);
  const rows = counts.map(function (row, index) {
    return {
      label: 'X' + (index + 1), count: rowTotals[index],
      probability: informationFraction(rowTotals[index], total),
      entropyContributionBits: informationEntropyTerm(rowTotals[index], total),
      conditionalY: informationCondition(row, rowTotals[index], total)
    };
  });
  const columns = columnTotals.map(function (count, index) {
    return {
      label: 'Y' + (index + 1), count,
      probability: informationFraction(count, total),
      entropyContributionBits: informationEntropyTerm(count, total),
      conditionalX: informationCondition(counts.map(function (row) { return row[index]; }), count, total)
    };
  });
  const cells = [];
  const factorizationDifferences = [];
  for (let row = 0; row < counts.length; row += 1) {
    for (let column = 0; column < counts[0].length; column += 1) {
      const count = counts[row][column];
      const jointCrossProduct = count * total;
      const marginalCrossProduct = rowTotals[row] * columnTotals[column];
      const difference = jointCrossProduct - marginalCrossProduct;
      const delta = marginalCrossProduct === 0 ? null : difference / marginalCrossProduct;
      const pointwiseInformationBits = count === 0 ? null : Math.log1p(delta) / Math.LN2;
      const signedContributionBits = count === 0 ? 0 : (count / total) * pointwiseInformationBits;
      const stabilizedContributionBits = marginalCrossProduct === 0 ? 0 :
        (marginalCrossProduct / (total * total)) * informationPhi(delta) / Math.LN2;
      if (difference !== 0) factorizationDifferences.push({ row, column, jointCrossProduct, marginalCrossProduct, difference });
      cells.push({
        row, column, x: rows[row].label, y: columns[column].label, count,
        probability: informationFraction(count, total),
        independentProbability: informationFraction(marginalCrossProduct, total * total),
        surprisalBits: count === 0 ? null : Math.log2(total / count),
        entropyContributionBits: informationEntropyTerm(count, total),
        pointwiseInformationBits,
        signedContributionBits,
        stabilizedContributionBits,
        zeroProbability: count === 0,
        jointCrossProduct, marginalCrossProduct
      });
    }
  }
  const sum = function (items, key) { return items.reduce(function (value, item) { return value + item[key]; }, 0); };
  const metrics = {
    entropyXBits: sum(rows, 'entropyContributionBits'),
    entropyYBits: sum(columns, 'entropyContributionBits'),
    jointEntropyBits: sum(cells, 'entropyContributionBits'),
    conditionalYGivenXBits: rows.reduce(function (value, row) { return value + row.conditionalY.weightedEntropyBits; }, 0),
    conditionalXGivenYBits: columns.reduce(function (value, column) { return value + column.conditionalX.weightedEntropyBits; }, 0),
    mutualInformationBits: sum(cells, 'stabilizedContributionBits'),
    signedContributionSumBits: sum(cells, 'signedContributionBits')
  };
  return freezeInformation({
    format: INFORMATION_FORMAT,
    interpretation: 'Uniform draw from a finite authored box of cards bearing X and Y labels.',
    arithmetic: 'Exact integer counts and reduced fractions; binary64 base-2 logarithms and approximate information values in bits.',
    zeroConvention: 'Zero-probability summands are zero. A zero-marginal conditional is undefined. Null zero-cell surprisal and pointwise information are excluded, not finite zero.',
    counts, total, rows, columns, cells, metrics,
    independence: { exact: factorizationDifferences.length === 0, factorizationDifferences }
  });
}
