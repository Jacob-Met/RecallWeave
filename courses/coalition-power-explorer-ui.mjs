const $ = id => document.getElementById(id);
let applied = null;
function node(tag, text, cls) {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  if (cls) e.className = cls;
  return e;
}
function labels(members) { return members.length ? members.map(i => String.fromCharCode(64+i)).join(', ') : 'none (empty)'; }
function ratio(f) { return f.numerator / f.denominator; }
function percent(f) { return (100 * ratio(f)).toFixed(1) + '% approx.'; }
function retire(message = 'Inputs changed. Choose Apply game to calculate this rule.') {
  applied = null;
  $('result').hidden = true;
  $('observation-save').disabled = true;
  $('status').textContent = message;
  $('status').className = 'status';
}
function integerText(text, label) {
  const trimmed = text.trim();
  if (!/^(0|[1-9][0-9]*)$/.test(trimmed)) throw new Error(label + ' must be an ordinary nonnegative integer, without signs, fractions or exponents.');
  return Number(trimmed);
}
function renderMeasures() {
  $('players').replaceChildren();
  const chosen = Number($('player').value);
  for (const p of applied.players) {
    const card = node('article', undefined, 'player' + (p.index === chosen ? ' selected' : ''));
    card.dataset.playerIndex = p.index;
    const head = node('div', undefined, 'player-head');
    head.append(node('h3', 'Player ' + p.label), node('span', 'weight ' + p.weight, 'badge'));
    card.append(head, node('div', p.swing_count + (p.swing_count === 1 ? ' swing' : ' swings'), 'count'));
    for (const [title, f, cls] of [
      ['Absolute', p.absolute_swing_probability, 'measure'],
      ['Normalized share', p.normalized_banzhaf_share, 'measure normal']
    ]) {
      const m = node('div', title, cls);
      m.append(node('strong', f.text + ' · ' + percent(f)));
      const track = node('div', undefined, 'track');
      track.setAttribute('aria-hidden', 'true');
      const fill = node('div', undefined, 'fill');
      fill.style.width = (100 * ratio(f)) + '%';
      track.append(fill); m.append(track); card.append(m);
    }
    $('players').append(card);
  }
}
function renderView() {
  if (!applied) return;
  const p = applied.players[Number($('player').value)-1];
  const filtered = $('critical-only').checked;
  const rows = applied.coalitions.filter(c => !filtered || c.critical_members.includes(p.index));
  $('view-summary').textContent = 'Player ' + p.label + '; ' + (filtered ? 'critical-only' : 'complete') + ' table. Showing ' + rows.length + ' of ' + applied.summary.coalition_count + ' coalitions. Counts and fractions above always use the complete game.';
  $('table-caption').textContent = filtered ? 'Coalitions where ' + p.label + ' is critical' : 'All coalitions, in binary-mask order';
  $('coalitions').replaceChildren();
  for (const c of rows) {
    const tr = node('tr', undefined, c.winning ? 'win' : '');
    tr.dataset.mask = c.mask;
    tr.append(node('td', labels(c.members)), node('td', String(c.weight), 'num'),
      node('td', c.winning ? 'passes' : 'loses'), node('td', c.critical_members.length ? labels(c.critical_members) : 'none'));
    $('coalitions').append(tr);
  }
  $('no-rows').hidden = rows.length !== 0;
  $('witness-title').textContent = p.label + ': ' + p.swing_count + (p.swing_count === 1 ? ' swing witness' : ' swing witnesses');
  $('witnesses').replaceChildren();
  if (!p.swing_count) $('witnesses').append(node('p', 'No swing exists for this player at this quota. A positive weight can still have zero swings.', 'empty'));
  else {
    const ol = node('ol', undefined, 'witnesses');
    for (const mask of p.swing_without_masks) {
      const c = applied.coalitions[mask];
      ol.append(node('li', '{' + labels(c.members) + '}: ' + c.weight + ' loses → add ' + p.label + ' (' + p.weight + ') → ' + (c.weight + p.weight) + ' passes quota ' + applied.input.quota + '.'));
    }
    $('witnesses').append(ol);
  }
  renderMeasures();
}
function applyInputs() {
  retire();
  try {
    const pieces = $('weights').value.split(',');
    if (pieces.length < 1 || pieces.length > 6) throw new Error('Use one to six comma-separated weights.');
    const weights = pieces.map((s,i) => integerText(s, 'Weight ' + (i+1)));
    const quota = integerText($('quota').value, 'Quota');
    const result = analyzeGame(weights, quota);
    applied = result;
    $('player').replaceChildren();
    for (const p of result.players) {
      const option = node('option', p.label + ' · weight ' + p.weight);
      option.value = p.index; $('player').append(option);
    }
    $('critical-only').checked = false;
    $('metrics').replaceChildren();
    for (const [value,label] of [[result.summary.coalition_count,'all coalitions'],[result.summary.winning_count,'winning coalitions'],[result.summary.total_swings,'swings across players'],[result.input.quota,'explicit quota']]) {
      const m = node('div', undefined, 'metric');
      m.append(node('strong', String(value)), node('span', label)); $('metrics').append(m);
    }
    $('applied-input').textContent = 'Applied weights [' + result.input.weights.join(', ') + '], quota ' + result.input.quota + '.';
    $('denominator-summary').textContent = result.summary.other_player_coalitions + ' other-player coalitions per player · ' + result.summary.total_swings + ' total swings';
    $('assumptions').replaceChildren(...result.assumptions.map(x => node('li', x)));
    renderView();
    $('result').hidden = false;
    $('observation-save').disabled = false;
    $('status').textContent = 'Applied weights [' + weights.join(', ') + '], quota ' + quota + '. Every coalition counted exactly.';
    $('status').className = 'status';
  } catch (error) {
    retire('Game not applied: ' + error.message);
    $('status').className = 'status error';
  }
}
function download(text, type, name) {
  const url = URL.createObjectURL(new Blob([text], {type}));
  const a = node('a'); a.href = url; a.download = name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
$('game-form').addEventListener('submit', event => { event.preventDefault(); applyInputs(); });
for (const id of ['weights','quota']) $(id).addEventListener('input', () => retire());
$('player').addEventListener('change', renderView);
$('critical-only').addEventListener('change', renderView);
for (const button of document.querySelectorAll('[data-preset]')) button.addEventListener('click', () => {
  const [weights,quota] = button.dataset.preset.split('|');
  $('weights').value = weights; $('quota').value = quota;
  retire('Example loaded into the inputs. Choose Apply game to calculate it.');
  $('apply').focus();
});
$('course-save').addEventListener('click', () => download(COURSE_TEXT, 'application/json;charset=utf-8', 'coalition-power-course.json'));
$('guide-save').addEventListener('click', () => download(GUIDE_TEXT, 'text/markdown;charset=utf-8', 'coalition-power-guide.md'));
$('observation-save').addEventListener('click', () => {
  if (!applied) return;
  download(JSON.stringify({format:'recallweave-coalition-power-observation/1',analysis:applied,view:{player_index:Number($('player').value),critical_only:$('critical-only').checked}},null,2)+'\n',
    'application/json;charset=utf-8','coalition-power-observation.json');
});
applyInputs();
