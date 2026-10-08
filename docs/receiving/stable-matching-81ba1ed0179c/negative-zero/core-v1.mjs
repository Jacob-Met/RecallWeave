/**
 * Strict complete one-to-one stable matching for 1–4 participants per side.
 * Pure, dependency-free and deterministic. Indices identify participants;
 * ranks are ordinal positions, never numerical utilities.
 */
export const MAX_GROUP_SIZE = 4;

function freeze(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

function denseArray(value, length, name) {
  if (!Array.isArray(value) || value.length !== length ||
      Reflect.ownKeys(value).length !== length + 1) {
    throw new TypeError(name + ' must be a dense array of exactly ' + length + ' entries.');
  }
  for (let i = 0; i < length; i++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(i));
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(name + ' must contain ordinary entries without holes or accessors.');
    }
  }
}

function permutation(value, size, name) {
  denseArray(value, size, name);
  const used = new Set();
  const result = [];
  for (let i = 0; i < size; i++) {
    const index = value[i];
    if (!Number.isInteger(index) || index < 0 || index >= size || used.has(index)) {
      throw new TypeError(name + ' must list every index 0–' + (size - 1) + ' exactly once.');
    }
    used.add(index);
    result.push(index);
  }
  return result;
}

function admit(profile) {
  const keys = ['leftPreferences', 'rightPreferences', 'proposingSide'];
  if (!profile || typeof profile !== 'object' || Array.isArray(profile) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(profile)) ||
      Reflect.ownKeys(profile).length !== keys.length ||
      keys.some(key => !Object.hasOwn(profile, key) ||
        !Object.hasOwn(Object.getOwnPropertyDescriptor(profile, key), 'value'))) {
    throw new TypeError('A profile must contain exactly leftPreferences, rightPreferences and proposingSide.');
  }
  if (profile.proposingSide !== 'left' && profile.proposingSide !== 'right') {
    throw new TypeError('proposingSide must be left or right.');
  }
  const size = profile.leftPreferences?.length;
  if (!Number.isInteger(size) || size < 1 || size > MAX_GROUP_SIZE) {
    throw new RangeError('Each side must have 1–4 participants.');
  }
  denseArray(profile.leftPreferences, size, 'leftPreferences');
  denseArray(profile.rightPreferences, size, 'rightPreferences');
  return {
    leftPreferences: profile.leftPreferences.map((row, i) => permutation(row, size, 'Left row ' + i)),
    rightPreferences: profile.rightPreferences.map((row, i) => permutation(row, size, 'Right row ' + i)),
    proposingSide: profile.proposingSide
  };
}

function ranks(preferences) {
  return preferences.map(row => {
    const rank = Array(row.length);
    row.forEach((partner, position) => { rank[partner] = position + 1; });
    return rank;
  });
}

function inspect(profile, leftMatching, leftRank, rightRank) {
  const size = leftMatching.length;
  const rightMatching = Array(size);
  leftMatching.forEach((right, left) => { rightMatching[right] = left; });
  const leftRanks = leftMatching.map((right, left) => leftRank[left][right]);
  const rightRanks = rightMatching.map((left, right) => rightRank[right][left]);
  const blockingPairs = [];
  for (let left = 0; left < size; left++) {
    for (let right = 0; right < size; right++) {
      if (leftRank[left][right] < leftRanks[left] && rightRank[right][left] < rightRanks[right]) {
        blockingPairs.push({
          left, right,
          leftCurrentPartner: leftMatching[left],
          rightCurrentPartner: rightMatching[right],
          leftCurrentRank: leftRanks[left],
          leftAlternativeRank: leftRank[left][right],
          rightCurrentRank: rightRanks[right],
          rightAlternativeRank: rightRank[right][left]
        });
      }
    }
  }
  return {
    leftMatching: [...leftMatching], rightMatching, leftRanks, rightRanks,
    blockingPairs, stable: blockingPairs.length === 0
  };
}

function enumerate(profile, leftRank, rightRank) {
  const size = profile.leftPreferences.length;
  const complete = [], row = [], used = Array(size).fill(false);
  function visit() {
    if (row.length === size) {
      complete.push(inspect(profile, row, leftRank, rightRank));
      return;
    }
    for (let right = 0; right < size; right++) {
      if (used[right]) continue;
      used[right] = true;
      row.push(right);
      visit();
      row.pop();
      used[right] = false;
    }
  }
  visit();
  return complete;
}

/** Inspect a complete left-to-right permutation and every blocking pair. */
export function inspectMatching(profile, leftMatching) {
  const admitted = admit(profile);
  const matching = permutation(leftMatching, admitted.leftPreferences.length, 'leftMatching');
  return freeze(inspect(admitted, matching, ranks(admitted.leftPreferences), ranks(admitted.rightPreferences)));
}

/** All complete matchings, ordered lexicographically by left-to-right indices. */
export function listCompleteMatchings(profile) {
  const admitted = admit(profile);
  return freeze(enumerate(admitted, ranks(admitted.leftPreferences), ranks(admitted.rightPreferences)));
}

/** Initial state and every atomic proposal; lowest-index free proposer goes next. */
export function traceStableMatching(profile) {
  const admitted = admit(profile), size = admitted.leftPreferences.length;
  const leftRank = ranks(admitted.leftPreferences), rightRank = ranks(admitted.rightPreferences);
  const leftMatching = Array(size).fill(null), rightMatching = Array(size).fill(null);
  const leftProposes = admitted.proposingSide === 'left';
  const proposerMatching = leftProposes ? leftMatching : rightMatching;
  const receiverMatching = leftProposes ? rightMatching : leftMatching;
  const preferences = leftProposes ? admitted.leftPreferences : admitted.rightPreferences;
  const receiverRank = leftProposes ? rightRank : leftRank;
  const nextChoiceIndices = Array(size).fill(0);
  const states = [];
  function record(action) {
    states.push({
      step: states.length,
      leftMatching: [...leftMatching], rightMatching: [...rightMatching],
      freeProposers: proposerMatching.flatMap((partner, i) => partner === null ? [i] : []),
      nextChoiceIndices: [...nextChoiceIndices],
      action
    });
  }
  record(null);
  while (proposerMatching.some(partner => partner === null)) {
    const proposerIndex = proposerMatching.indexOf(null);
    const cursor = nextChoiceIndices[proposerIndex];
    if (cursor >= size || states.length > size * size) {
      throw new Error('Internal proposal invariant failed.');
    }
    const receiverIndex = preferences[proposerIndex][cursor];
    nextChoiceIndices[proposerIndex]++;
    const previousProposerIndex = receiverMatching[receiverIndex];
    let decision = 'reject', displacedProposerIndex = null;
    if (previousProposerIndex === null) {
      decision = 'hold';
    } else if (receiverRank[receiverIndex][proposerIndex] < receiverRank[receiverIndex][previousProposerIndex]) {
      decision = 'replace';
      displacedProposerIndex = previousProposerIndex;
      proposerMatching[previousProposerIndex] = null;
    }
    if (decision !== 'reject') {
      proposerMatching[proposerIndex] = receiverIndex;
      receiverMatching[receiverIndex] = proposerIndex;
    }
    record({
      proposerIndex, receiverIndex, decision, previousProposerIndex, displacedProposerIndex,
      proposerChoiceRank: cursor + 1,
      receiverRankOfProposal: receiverRank[receiverIndex][proposerIndex],
      receiverRankOfPrevious: previousProposerIndex === null ? null : receiverRank[receiverIndex][previousProposerIndex]
    });
  }
  const final = inspect(admitted, leftMatching, leftRank, rightRank);
  const matchings = enumerate(admitted, leftRank, rightRank);
  const stableMatchingIndices = matchings.flatMap((matching, i) => matching.stable ? [i] : []);
  const proposerBestRanks = Array.from({ length: size }, (_, proposer) =>
    Math.min(...stableMatchingIndices.map(i =>
      (leftProposes ? matchings[i].leftRanks : matchings[i].rightRanks)[proposer])));
  const finalRanks = leftProposes ? final.leftRanks : final.rightRanks;
  const proposerOptimal = finalRanks.every((rank, i) => rank === proposerBestRanks[i]);
  if (!final.stable || !proposerOptimal) throw new Error('Internal final stability invariant failed.');
  return freeze({
    format: 'recallweave-stable-matching-trace/1',
    profile: admitted, size, states, proposalCount: states.length - 1,
    final, matchings, stableMatchingIndices, proposerBestRanks, proposerOptimal
  });
}
