// Frozen before implementation/test/key access. Independent pairwise mathematical oracles.
export function expectedInsertion(keys) {
  let inversions = 0;
  let strictNewMinima = 0;
  for (let right = 1; right < keys.length; right += 1) {
    let belowAllEarlier = true;
    for (let left = 0; left < right; left += 1) {
      if (keys[left] > keys[right]) inversions += 1;
      else belowAllEarlier = false;
    }
    if (belowAllEarlier) strictNewMinima += 1;
  }
  return { comparisons: inversions + keys.length - 1 - strictNewMinima, exchanges: inversions };
}
export function expectedStableOrder(keys) {
  return keys.map((key, originalPosition) => ({key, originalPosition}))
    .sort((a,b) => a.key - b.key || a.originalPosition - b.originalPosition)
    .map(record => record.originalPosition);
}
export function expectedSelectionComparisons(length) { return length * (length - 1) / 2; }
export function* vectors(length, alphabet = [-1,0,1]) {
  const count = alphabet.length ** length;
  for (let number = 0; number < count; number += 1) {
    let rest = number;
    const keys = [];
    for (let index = 0; index < length; index += 1) {
      keys.push(alphabet[rest % alphabet.length]);
      rest = Math.floor(rest / alphabet.length);
    }
    yield keys;
  }
}
