/** Deterministic standalone page for the original Hamming-code lesson. */
function htmlText(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function renderHammingPage({modelSource, uiSource, deckText}) {
  if (![modelSource, uiSource, deckText].every(value => typeof value === 'string' && value.length)) {
    throw new TypeError('The page needs model, interface and original course text.');
  }
  const deck = JSON.parse(deckText);
  const embeddedCourse = JSON.stringify(deckText).replaceAll('<', '\\u003c');
  const safeScript = source => source.replace(/<\/script/gi, '<\\/script');
  const flipInputs = Array.from({length: 7}, (_, index) => {
    const position = index + 1;
    const role = [1, 2, 4].includes(position) ? 'parity' : 'data';
    return `<label class="flip-cell ${role}"><span class="position">${position}</span><input id="flip-${position}" type="checkbox" name="flip" value="${position}"${position === 6 ? ' checked' : ''}><span>${role}</span></label>`;
  }).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="An offline Hamming(7,4) teaching lab: make a prediction, inspect parity checks and compare a decoder proposal with separately labeled simulation truth.">
<title>When a repair can be wrong · RecallWeave</title>
<style>
:root{color-scheme:light;--ink:#142f3e;--muted:#475e69;--paper:#f5f3e9;--white:#fffef9;--line:#c6d0ce;--teal:#006d68;--teal-pale:#e2f2ec;--amber:#7a4100;--amber-pale:#fff0d7;--blue:#e9f0fb;--focus:#aa4300;font:16px/1.55 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
*{box-sizing:border-box}body{margin:0;color:var(--ink);background:var(--paper)}
[hidden]{display:none!important}a{color:var(--teal);text-underline-offset:3px}button,input,select{font:inherit}
button,input,select,a{touch-action:manipulation}:focus-visible{outline:3px solid var(--focus);outline-offset:4px}
button{border:1px solid var(--teal);border-radius:8px;background:var(--white);color:var(--teal);padding:.65rem 1rem;min-height:44px;cursor:pointer;font-weight:650}
button:hover{background:var(--teal-pale)}button:disabled{opacity:.48;cursor:default}
button.primary{background:var(--teal);color:white;border-color:var(--teal)}button.primary:hover{background:#00564f}
.skip{position:absolute;left:1rem;top:-5rem;background:white;padding:.6rem;z-index:2}.skip:focus{top:1rem}
header,main,footer{width:min(1120px,calc(100% - 40px));margin-inline:auto}
header{padding:2rem 0 1.5rem}.brand{font-size:.8rem;letter-spacing:.13em;text-transform:uppercase;color:var(--teal);font-weight:800}
h1{font-size:clamp(2.1rem,5.5vw,3.7rem);line-height:1.07;letter-spacing:-.045em;max-width:760px;margin:.8rem 0 1rem}
h2{font-size:1.35rem;line-height:1.25;margin:0 0 .8rem}h3{font-size:1.05rem;margin:1.1rem 0 .5rem}
p{margin:.65rem 0}.intro{max-width:790px;font-size:1.12rem;color:var(--muted)}.small{font-size:.91rem;color:var(--muted)}
.pill{display:inline-block;padding:.18rem .55rem;border:1px solid var(--line);border-radius:99px;font-size:.77rem;letter-spacing:.02em;margin:.1rem .4rem .1rem 0}
.grid{display:grid;grid-template-columns:minmax(0,.88fr) minmax(0,1.12fr);gap:1.25rem;align-items:start}
.card{background:var(--white);border:1px solid var(--line);border-radius:16px;padding:1.3rem;min-width:0;margin-bottom:1.25rem}
.step{font-size:.75rem;letter-spacing:.1em;text-transform:uppercase;color:var(--teal);font-weight:800;margin:0 0 .4rem}
label.field{display:block;font-weight:700;margin-top:1rem}label.field small{display:block;font-weight:400}
input[type=text],select{width:100%;border:1px solid #728c92;background:white;color:var(--ink);border-radius:7px;padding:.65rem .8rem;min-height:46px;margin:.35rem 0}
input[type=text]{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:1.2rem;letter-spacing:.16em}
fieldset{border:0;padding:0;margin:1rem 0}legend{font-weight:700;padding:0;margin-bottom:.45rem}
.bit-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px}
.flip-cell{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;border:1px solid var(--line);padding:7px 1px 5px;border-radius:8px;min-width:0;font-size:.67rem;cursor:pointer}
.flip-cell.parity{background:var(--teal-pale)}.flip-cell.data{background:var(--blue)}.position{font:700 1rem ui-monospace,SFMono-Regular,Consolas,monospace}.flip-cell input{width:20px;height:20px;margin:2px}
.actions{display:flex;flex-wrap:wrap;gap:.55rem;margin-top:1rem}.examples{display:flex;gap:.45rem;flex-wrap:wrap}.examples button{font-size:.83rem;padding:.45rem .7rem}
.note{border-left:4px solid var(--teal);padding:.4rem .8rem;background:var(--teal-pale);font-size:.94rem}
.error{color:#8e230b;font-weight:650;min-height:1.5em;margin:.6rem 0 0}
.pending{padding:1.5rem;border:1px dashed #8ea4a6;border-radius:12px;color:var(--muted);background:#f8faf5}
.word-row{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px;max-width:400px;margin:.5rem 0}
.word-bit{font:700 clamp(1.05rem,3vw,1.5rem)/1.2 ui-monospace,SFMono-Regular,Consolas,monospace;padding:.6rem .1rem;text-align:center;border:1px solid var(--line);border-radius:7px;background:#f2f6f5}
.word-bit.marked{background:var(--amber-pale);border:2px solid var(--amber);padding:calc(.6rem - 1px) 0}
.word-caption{font-size:.85rem;font-weight:700;color:var(--muted);margin-top:.8rem}
.word-legend{font-size:.85rem;color:var(--muted)}code,.mono{font-family:ui-monospace,SFMono-Regular,Consolas,monospace}
.big-number{font:800 2.7rem/1 ui-monospace,SFMono-Regular,Consolas,monospace;color:var(--teal)}
.syndrome{display:flex;align-items:center;gap:1rem;padding:.9rem 0}
.table-wrap{overflow:auto;border:1px solid var(--line);border-radius:8px;margin:.75rem 0}
table{border-collapse:collapse;width:100%;font-size:.87rem}th,td{text-align:left;padding:.55rem .5rem;border-bottom:1px solid var(--line);vertical-align:top}
thead th{background:#edf3ef;font-size:.78rem}tbody tr:last-child>*{border-bottom:0}
.check-table{min-width:370px}.check-table th:first-child{white-space:nowrap}
#truth-card{border-top:5px solid var(--teal)}#truth-card[data-outcome=miscorrected],#truth-card[data-outcome=undetected]{border-top-color:var(--amber);background:#fffaf0}
.metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.7rem;margin-top:.9rem}
.metrics div{padding:.7rem;border:1px solid var(--line);border-radius:8px}.metrics dt{font-size:.8rem;color:var(--muted)}.metrics dd{font-size:1.2rem;font-weight:750;margin:.1rem 0 0}
.full{grid-column:1/-1}.learn-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1.1rem}.learn-grid p{font-size:.94rem}
.status{min-height:1.5em;font-size:.89rem;color:var(--muted);overflow-wrap:anywhere}
footer{padding:.2rem 0 2.5rem;font-size:.85rem;color:var(--muted)}
@media(max-width:760px){header,main,footer{width:calc(100% - 28px)}header{padding-top:1.2rem}.grid,.learn-grid{grid-template-columns:1fr}.card{padding:1rem}.full{grid-column:auto}.bit-grid{gap:4px}.word-row{gap:4px}.intro{font-size:1rem}.metrics{gap:.5rem}}
@media print{body{background:white}header,main,footer{width:100%}.skip,.examples,.actions,form,#pending,.course-download{display:none!important}.grid,.learn-grid{display:block}.card{break-inside:avoid;border:1px solid #999;margin-bottom:.8rem}h1{font-size:2rem}.table-wrap{overflow:visible}.check-table{min-width:0}.status{display:none}footer{padding-bottom:0}}
</style>
</head>
<body>
<a class="skip" href="#lab">Skip to the bit lab</a>
<header>
<div class="brand">RecallWeave · Coding theory</div>
<h1>When a repair<br>can be wrong.</h1>
<p class="intro">Add three parity bits to a four-bit message. Introduce a few errors, make a prediction, and see exactly what a Hamming decoder can—and cannot—know.</p>
<span class="pill">Hamming(7,4)</span><span class="pill">Even parity</span><span class="pill">Offline · No account</span>
</header>
<main id="lab">
<div class="grid">
<section class="card">
<p class="step">01 · Author a scenario</p>
<h2>What will the receiver see?</h2>
<p class="small">The sender and error switches belong to this simulation. The decoder receives only the seven bits that arrive.</p>
<form id="scenario-form" novalidate>
<label class="field" for="data-bits">Four data bits <small>Exactly four 0s or 1s. Leading zeros matter.</small></label>
<input id="data-bits" type="text" inputmode="numeric" value="1011" autocomplete="off" spellcheck="false" aria-describedby="data-help">
<p id="data-help" class="small">Data fill positions 3, 5, 6 and 7. Positions 1, 2 and 4 hold even-parity checks. Position 1 is always at the left.</p>
<fieldset><legend>Flip these transmitted positions</legend>
<div class="bit-grid">${flipInputs}</div>
<p class="small">A checked box flips that bit once. Try any combination, including none.</p></fieldset>
<label class="field" for="prediction">Predict the syndrome <small>Optional: which position will the one-error rule suggest?</small></label>
<select id="prediction"><option value="">I have not predicted yet</option>${Array.from({length:8},(_,n)=>`<option value="${n}">${n===0?'0 · All checks pass':n+' · Suggest position '+n}</option>`).join('')}</select>
<div class="actions"><button class="primary" type="submit" id="inspect">Inspect decoder</button></div>
<p id="input-error" class="error" role="alert"></p>
</form>
<h3>Try an authored example</h3>
<div class="examples"><button type="button" data-preset="single">One flip</button><button type="button" data-preset="double">Two flips</button><button type="button" data-preset="hidden">Three hidden flips</button><button type="button" data-preset="clear">No flips</button></div>
<p class="note">This decoder assumes <strong>at most one error</strong>. The lab lets you exceed that assumption so you can inspect the consequences.</p>
</section>
<div>
<p id="pending" class="pending" aria-live="polite">Choose data and flipped positions, then inspect the decoder. Results appear only after that choice.</p>
<div id="result" hidden>
<section class="card">
<p class="step">02 · Sender and channel · Simulation truth</p><h2>From message to received word</h2>
<p>Original data: <strong id="original-data" class="mono"></strong></p>
<p class="word-caption">Encoded word · positions 1 → 7</p><div id="sent-word" class="word-row" role="img"></div>
<p class="word-caption">Received word · positions 1 → 7</p><div id="received-word" class="word-row" role="img"></div>
<p class="word-legend">Authored flipped positions: <strong id="flips-summary"></strong>. Amber borders identify those positions.</p>
</section>
<section class="card">
<p class="step">03 · Receiver · Received bits only</p><h2>Check, then propose a repair</h2>
<p class="small">Count the 1s in each group. Odd parity sets that check to 1. Even parity sets it to 0.</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="Received parity checks; scroll horizontally on small screens"><table class="check-table"><thead><tr><th scope="col">Check</th><th scope="col">Positions</th><th scope="col">Received sum</th><th scope="col">Result</th></tr></thead><tbody id="check-rows"></tbody></table></div>
<div class="syndrome"><span id="syndrome-value" class="big-number"></span><div>Syndrome value<br><span class="small">s4s2s1 = <strong id="syndrome-bits" class="mono"></strong><br>value = s1 + 2s2 + 4s4</span></div></div>
<p id="decoder-proposal"></p><p id="decoder-limit" class="note"></p>
<p class="word-caption">Decoder candidate · suggested flip highlighted</p><div id="candidate-word" class="word-row" role="img"></div>
<p>Candidate data: <strong id="candidate-data" class="mono"></strong></p>
<p id="prediction-feedback" class="small"></p>
</section>
<section class="card" id="truth-card">
<p class="step">04 · Compare with simulation truth</p><h2 id="truth-title"></h2>
<p id="truth-explanation"></p>
<p class="small"><strong>The receiver cannot perform this comparison by itself:</strong> the lab kept the original message and the flips you chose.</p>
<dl class="metrics"><div><dt>Actual flipped bits</dt><dd id="actual-flips"></dd></div><div><dt>One-error assumption</dt><dd id="assumption-status"></dd></div><div><dt>Original codeword recovered</dt><dd id="recovery-status"></dd></div><div><dt>Different codeword positions</dt><dd id="codeword-differences"></dd></div><div><dt>Different data positions</dt><dd id="data-differences"></dd></div></dl>
</section>
</div>
<section class="card">
<h2>Keep this worked example</h2>
<p class="small">The text record keeps the exact data, flipped positions, parity arithmetic, decoder proposal, your optional prediction and the simulation comparison.</p>
<div class="actions"><button id="save-record" type="button" disabled>Download worked record</button></div>
<p id="record-status" class="status" aria-live="polite"></p>
</section>
</div>
<section class="card full">
<p class="step">Connect the ideas</p><h2>Three checks, one useful assumption</h2>
<div class="learn-grid">
<div><h3>Parity creates structure</h3><p>Only 16 of the 128 seven-bit words pass all three checks. Each four-bit message chooses one of those words. The added bits make some changes observable.</p></div>
<div><h3>Distance creates a guarantee</h3><p>Distinct valid words are at least three positions apart. After exactly one flip, the original remains closer than every other valid word.</p></div>
<div><h3>A candidate is not a history</h3><p>Every received word is within one position of a valid word. A decoder can always produce a candidate, even when the actual error pattern exceeds its guarantee.</p></div>
</div>
<p class="note">Two flipped positions fail at least one check, so a detector can notice them. The ordinary one-error correction rule cannot distinguish that case from a single error and can miscorrect it. Some three-bit patterns pass all checks.</p>
<div class="course-download"><h3>Study the twelve-question course</h3><p><strong>${htmlText(deck.title)}</strong> connects parity, syndromes, distance and the assumptions behind a repair. Download it, then use <strong>Bring your own lesson</strong> in RecallWeave.</p>
<div class="actions"><button id="save-course" type="button">Download course JSON</button><a href="hamming-codes.md">Read the worked guide</a></div><p id="course-status" class="status" aria-live="polite"></p></div>
</section>
</div>
</main>
<footer><p>Original teaching scenario and questions. No random channel or probability model is used, and no real communication reliability or measured learning benefit is inferred. Your choices stay in this tab; a refresh clears them. Downloads use your browser's normal file flow.</p><p>Mathematical foundation: R. W. Hamming (1950), <a href="https://doi.org/10.1002/j.1538-7305.1950.tb00463.x" target="_blank" rel="noreferrer">Error Detecting and Error Correcting Codes</a>. Original lesson content: CC BY 4.0. Source links open only if you choose them.</p></footer>
<script id="course-text" type="application/json">${embeddedCourse}</script>
<script>
'use strict';
${safeScript(modelSource)}
${safeScript(uiSource)}
</script>
</body>
</html>
`;
}

export { renderHammingPage };
