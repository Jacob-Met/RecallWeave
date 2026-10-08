import { traceStableMatching } from './stable-matching.mjs';

const LEFT_LABELS = ['A', 'B', 'C', 'D'];
const RIGHT_LABELS = ['W', 'X', 'Y', 'Z'];
const PRESETS = {
  provisional: { leftPreferences: [[0,1,2],[0,1,2],[1,0,2]], rightPreferences: [[1,0,2],[0,2,1],[0,1,2]], proposingSide: 'left' },
  two: { leftPreferences: [[0,1],[1,0]], rightPreferences: [[1,0],[0,1]], proposingSide: 'left' },
  shared: { leftPreferences: [[0,1,2,3],[0,1,2,3],[0,1,2,3],[0,1,2,3]], rightPreferences: [[3,2,1,0],[3,2,1,0],[3,2,1,0],[3,2,1,0]], proposingSide: 'left' },
  aligned: { leftPreferences: [[0,1,2],[1,2,0],[2,0,1]], rightPreferences: [[0,1,2],[1,2,0],[2,0,1]], proposingSide: 'left' },
  single: { leftPreferences: [[0]], rightPreferences: [[0]], proposingSide: 'left' }
};

export function mountStableMatching(doc, payload) {
  const byId = id => doc.getElementById(id);
  const node = (tag, text, className) => {
    const element = doc.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
  };
  let result = null, selectedStep = 0, inspectedMatchingIndex = 0;
  const pairText = matching => matching.map((right, left) => LEFT_LABELS[left] + '–' + RIGHT_LABELS[right]).join(' · ');
  const proposerLabels = () => result.profile.proposingSide === 'left' ? LEFT_LABELS : RIGHT_LABELS;
  const receiverLabels = () => result.profile.proposingSide === 'left' ? RIGHT_LABELS : LEFT_LABELS;

  function retire(message = 'Preferences changed. Apply them to create a new trace and observation.') {
    result = null;
    selectedStep = 0;
    inspectedMatchingIndex = 0;
    byId('results').hidden = true;
    byId('empty-state').hidden = false;
    byId('download-observation').disabled = true;
    byId('draft-status').textContent = message;
    byId('preference-error').hidden = true;
  }

  function renderRows(profile) {
    const size = profile.leftPreferences.length;
    for (const [side, labels, other] of [['left', LEFT_LABELS, RIGHT_LABELS], ['right', RIGHT_LABELS, LEFT_LABELS]]) {
      const container = byId(side + '-rows');
      container.replaceChildren();
      profile[side + 'Preferences'].forEach((row, index) => {
        const wrapper = node('div', undefined, 'preference-row');
        const id = side + '-preference-' + index;
        const label = node('label', labels[index]);
        label.htmlFor = id;
        const input = node('input');
        input.id = id; input.type = 'text'; input.className = 'preference-input';
        input.value = row.map(value => other[value]).join(' ');
        input.spellcheck = false; input.autocomplete = 'off';
        input.setAttribute('aria-label', labels[index] + ' preferences, best first');
        input.setAttribute('aria-describedby', 'draft-status');
        input.maxLength = 32;
        wrapper.append(label, input); container.append(wrapper);
      });
    }
    byId('group-size').value = String(size);
    byId('proposing-side').value = profile.proposingSide;
  }

  function readProfile() {
    const size = Number(byId('group-size').value);
    const profile = { leftPreferences: [], rightPreferences: [], proposingSide: byId('proposing-side').value };
    for (const [side, labels, other] of [['left', LEFT_LABELS, RIGHT_LABELS], ['right', RIGHT_LABELS, LEFT_LABELS]]) {
      const allowed = other.slice(0, size);
      for (let index = 0; index < size; index++) {
        const text = byId(side + '-preference-' + index).value.trim();
        const tokens = text ? text.split(/\s+/) : [];
        if (tokens.length !== size || new Set(tokens).size !== size || tokens.some(token => !allowed.includes(token))) {
          throw new Error(labels[index] + ' must list ' + allowed.join(', ') + ' exactly once, best first. Your row was left unchanged.');
        }
        profile[side + 'Preferences'].push(tokens.map(token => allowed.indexOf(token)));
      }
    }
    return profile;
  }

  function decisionText(action) {
    if (!action) return 'Before any proposal: everyone is free and no receiver holds a partner.';
    const p = proposerLabels()[action.proposerIndex], r = receiverLabels()[action.receiverIndex];
    if (action.decision === 'hold') return p + ' proposes to ' + r + '. ' + r + ' has no incumbent and holds ' + p + '.';
    const prior = proposerLabels()[action.previousProposerIndex];
    if (action.decision === 'replace') return p + ' proposes to ' + r + '. ' + r + ' replaces ' + prior + ' (rank ' + action.receiverRankOfPrevious + ') with ' + p + ' (rank ' + action.receiverRankOfProposal + '). ' + prior + ' becomes free.';
    return p + ' proposes to ' + r + '. ' + r + ' rejects ' + p + ' (rank ' + action.receiverRankOfProposal + ') and keeps ' + prior + ' (rank ' + action.receiverRankOfPrevious + ').';
  }

  function appendRow(body, cells) {
    const row = node('tr');
    for (const value of cells) row.append(node('td', value));
    body.append(row);
  }

  function drawPairs(state) {
    const svg = byId('held-diagram'), size = result.size;
    svg.replaceChildren();
    const namespace = 'http://www.w3.org/2000/svg';
    function shape(tag, attributes, text) {
      const element = doc.createElementNS(namespace, tag);
      for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
      if (text !== undefined) element.textContent = text;
      svg.append(element); return element;
    }
    const y = index => 72 + 65 * index;
    svg.setAttribute('viewBox', '0 0 520 ' + (102 + (size - 1) * 65));
    const held = state.leftMatching.flatMap((right, left) => right === null ? [] : [LEFT_LABELS[left] + '–' + RIGHT_LABELS[right]]);
    svg.setAttribute('aria-label', 'Held pairs at step ' + selectedStep + ': ' + (held.join(', ') || 'none'));
    shape('text', { x: 68, y: 20, 'text-anchor': 'middle', fill: '#4c6868', 'font-size': 14 }, 'Left');
    shape('text', { x: 452, y: 20, 'text-anchor': 'middle', fill: '#4c6868', 'font-size': 14 }, 'Right');
    state.leftMatching.forEach((right, left) => {
      if (right !== null) shape('path', { d: 'M 96 ' + y(left) + ' C 200 ' + y(left) + ', 320 ' + y(right) + ', 424 ' + y(right), fill: 'none', stroke: '#329778', 'stroke-width': 3 });
    });
    for (let index = 0; index < size; index++) {
      for (const [x, label, matching] of [[68, LEFT_LABELS[index], state.leftMatching], [452, RIGHT_LABELS[index], state.rightMatching]]) {
        shape('circle', { cx: x, cy: y(index), r: 26, fill: matching[index] === null ? '#f7f6ef' : '#e4f2ea', stroke: '#2d7465', 'stroke-width': 1.7 });
        shape('text', { x, y: y(index) + 6, 'text-anchor': 'middle', fill: '#153b3b', 'font-size': 19, 'font-weight': 650 }, label);
      }
    }
  }

  function renderStep() {
    const state = result.states[selectedStep];
    byId('current-step').textContent = 'Selected step ' + selectedStep + ' of ' + result.proposalCount;
    byId('step-select').value = String(selectedStep);
    byId('first-step').disabled = byId('back-step').disabled = selectedStep === 0;
    byId('next-step').disabled = byId('finish-step').disabled = selectedStep === result.proposalCount;
    byId('decision').textContent = decisionText(state.action);
    byId('decision').className = 'decision' + (state.action ? ' ' + state.action.decision : '');
    drawPairs(state);
    byId('free-proposers').textContent = 'Free proposers: ' + (state.freeProposers.map(index => proposerLabels()[index]).join(', ') || 'none — the matching is complete.');
    const heldBody = byId('held-table').tBodies[0];
    heldBody.replaceChildren();
    state.leftMatching.forEach((right, left) => appendRow(heldBody, [
      LEFT_LABELS[left], right === null ? 'Free' : RIGHT_LABELS[right],
      right === null ? '—' : String(result.profile.leftPreferences[left].indexOf(right) + 1),
      right === null ? '—' : String(result.profile.rightPreferences[right].indexOf(left) + 1)
    ]));
    const cursorBody = byId('cursor-table').tBodies[0];
    cursorBody.replaceChildren();
    const preferences = result.profile.proposingSide === 'left' ? result.profile.leftPreferences : result.profile.rightPreferences;
    const matches = result.profile.proposingSide === 'left' ? state.leftMatching : state.rightMatching;
    state.nextChoiceIndices.forEach((cursor, proposer) => appendRow(cursorBody, [
      proposerLabels()[proposer],
      matches[proposer] === null ? 'Free' : 'Held by ' + receiverLabels()[matches[proposer]],
      cursor < result.size ? receiverLabels()[preferences[proposer][cursor]] + ' (rank ' + (cursor + 1) + ')' : 'No untried choice'
    ]));
  }

  function renderInspection() {
    const inspection = result.matchings[inspectedMatchingIndex];
    const status = byId('inspection-status');
    status.replaceChildren(node('span', inspection.stable ? 'Stable · no blocking pair' : 'Unstable · ' + inspection.blockingPairs.length + ' blocking pair' + (inspection.blockingPairs.length === 1 ? '' : 's'), 'stable-badge' + (inspection.stable ? '' : ' blocked')));
    const matchingBody = byId('matching-table').tBodies[0];
    matchingBody.replaceChildren();
    inspection.leftMatching.forEach((right, left) => appendRow(matchingBody, [
      LEFT_LABELS[left] + '–' + RIGHT_LABELS[right],
      String(inspection.leftRanks[left]),
      String(inspection.rightRanks[right])
    ]));
    const witness = byId('blocking-witnesses');
    witness.replaceChildren();
    if (inspection.stable) {
      witness.append(node('p', 'Every possible left/right pair was checked. None offers both participants a strictly preferred partner.', 'subtle small'));
      return;
    }
    witness.append(node('h3', 'Both comparisons must improve'));
    const wrap = node('div', undefined, 'table-wrap'), table = node('table'), head = node('thead'), headRow = node('tr'), body = node('tbody');
    for (const title of ['Blocking pair', 'Left prefers', 'Right prefers']) headRow.append(node('th', title));
    head.append(headRow); table.append(head, body); wrap.append(table); witness.append(wrap);
    for (const pair of inspection.blockingPairs) appendRow(body, [
      LEFT_LABELS[pair.left] + '–' + RIGHT_LABELS[pair.right],
      RIGHT_LABELS[pair.leftCurrentPartner] + ' (rank ' + pair.leftCurrentRank + ') → ' + RIGHT_LABELS[pair.right] + ' (rank ' + pair.leftAlternativeRank + ')',
      LEFT_LABELS[pair.rightCurrentPartner] + ' (rank ' + pair.rightCurrentRank + ') → ' + LEFT_LABELS[pair.left] + ' (rank ' + pair.rightAlternativeRank + ')'
    ]);
  }

  function renderApplied() {
    byId('empty-state').hidden = true; byId('results').hidden = false;
    byId('download-observation').disabled = false;
    byId('draft-status').textContent = 'Applied. The result below uses exactly these preference rows and this proposing side.';
    byId('preference-error').hidden = true;
    byId('final-pairs').textContent = pairText(result.final.leftMatching);
    byId('total-proposals').textContent = result.proposalCount + ' proposal' + (result.proposalCount === 1 ? '' : 's') + ' in the completed trace';
    byId('stable-count').textContent = result.stableMatchingIndices.length + ' stable of ' + result.matchings.length + ' complete matching' + (result.matchings.length === 1 ? '' : 's');
    byId('proposer-summary').textContent = result.profile.proposingSide === 'left' ? 'Left proposes' : 'Right proposes';
    byId('optimal-summary').textContent = 'Best stable partner rank for each proposer: ' + result.proposerBestRanks.map((rank, i) => proposerLabels()[i] + ' rank ' + rank).join(' · ') + '. Checked against every stable alternative.';
    const steps = byId('step-select'); steps.replaceChildren();
    result.states.forEach(state => {
      const option = node('option', state.step === 0 ? '0 · Before proposals' : state.step + ' · ' + proposerLabels()[state.action.proposerIndex] + ' → ' + receiverLabels()[state.action.receiverIndex] + ' · ' + state.action.decision);
      option.value = String(state.step); steps.append(option);
    });
    const choices = byId('matching-select'); choices.replaceChildren();
    result.matchings.forEach((matching, index) => {
      const option = node('option', pairText(matching.leftMatching) + (matching.stable ? ' — stable' : ' — blocking pair'));
      option.value = String(index); choices.append(option);
    });
    inspectedMatchingIndex = result.matchings.findIndex(matching => matching.leftMatching.every((right, left) => right === result.final.leftMatching[left]));
    choices.value = String(inspectedMatchingIndex);
    renderStep(); renderInspection();
  }

  function download(filename, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const anchor = node('a'); anchor.href = url; anchor.download = filename;
    doc.body.append(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  byId('preference-form').addEventListener('submit', event => {
    event.preventDefault();
    try { result = traceStableMatching(readProfile()); selectedStep = 0; renderApplied(); }
    catch (error) {
      retire('The draft could not be applied. Correct the indicated row and try again.');
      byId('preference-error').textContent = error.message;
      byId('preference-error').hidden = false;
      byId('preference-error').focus();
    }
  });
  byId('preference-form').addEventListener('input', event => {
    if (event.target.classList.contains('preference-input')) retire();
  });
  byId('proposing-side').addEventListener('change', () => retire());
  byId('group-size').addEventListener('change', () => {
    const size = Number(byId('group-size').value), order = Array.from({ length: size }, (_, i) => i);
    renderRows({ leftPreferences: Array.from({ length: size }, () => [...order]), rightPreferences: Array.from({ length: size }, () => [...order]), proposingSide: byId('proposing-side').value });
    retire('Group size changed. Every row was reset to the displayed label order. Apply preferences to continue.');
  });
  byId('load-preset').addEventListener('click', () => {
    renderRows(PRESETS[byId('preset').value]);
    retire('Preset loaded. Review the displayed rows, then apply preferences.');
  });
  for (const [id, change] of [['first-step', () => 0], ['back-step', () => selectedStep - 1], ['next-step', () => selectedStep + 1], ['finish-step', () => result.proposalCount]]) {
    byId(id).addEventListener('click', () => { if (result) { selectedStep = change(); renderStep(); } });
  }
  byId('step-select').addEventListener('change', () => { if (result) { selectedStep = Number(byId('step-select').value); renderStep(); } });
  byId('matching-select').addEventListener('change', () => { if (result) { inspectedMatchingIndex = Number(byId('matching-select').value); renderInspection(); } });
  byId('download-course').addEventListener('click', () => download('stable-matching.json', payload.courseText, 'application/json;charset=utf-8'));
  byId('download-guide').addEventListener('click', () => download('stable-matching.md', payload.guideText, 'text/markdown;charset=utf-8'));
  byId('download-observation').addEventListener('click', () => {
    if (!result) return;
    const observation = {
      format: 'recallweave-stable-matching-observation/1',
      model: 'Strict complete equal-size one-to-one preferences; ordinal ranks; no fairness or real allocation claim.',
      sourceHashes: payload.sourceHashes,
      appliedProfile: result.profile,
      labels: { left: LEFT_LABELS.slice(0, result.size), right: RIGHT_LABELS.slice(0, result.size) },
      trace: result,
      selectedStep,
      inspectedMatchingIndex,
      inspectedMatching: result.matchings[inspectedMatchingIndex]
    };
    download('stable-matching-observation.json', JSON.stringify(observation, null, 2) + '\n', 'application/json;charset=utf-8');
  });
  renderRows(PRESETS.provisional);
  retire('Ready to apply the displayed preferences.');
}
