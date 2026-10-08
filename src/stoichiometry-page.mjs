/** Standalone teaching page; shared RecallWeave application files stay unchanged. */
export function renderStoichiometryPage({ modelSource, uiSource, deckText }) {
  const safeDeck = deckText.replace(/</g, '\\u003c');
  const script = (modelSource + '\n' + uiSource).replace(/<\/script/gi, '<\\/script');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'none'; img-src data:; base-uri 'none'">
<title>The limiting reactant · RecallWeave</title>
<style>
:root{color-scheme:light;--ink:#193a38;--muted:#526662;--paper:#f5f5ed;--card:#fffef9;--line:#d3ddd4;--mint:#096b58;--mint-soft:#e1f1e8;--ochre:#86520d;--focus:#8a370c}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:17px/1.55 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}button,input,select{font:inherit}button,a,input,select{touch-action:manipulation}button{cursor:pointer}button:disabled{cursor:default;opacity:.48}button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible,summary:focus-visible{outline:3px solid var(--focus);outline-offset:4px}.skip{position:absolute;top:-100px;left:1rem}.skip:focus{top:1rem;z-index:2;background:white;padding:.7rem}header,main,footer{max-width:1160px;margin:auto;padding:1.5rem 2rem}header{padding-top:2.5rem;padding-bottom:1.2rem}.eyebrow{font-size:.77rem;letter-spacing:.15em;text-transform:uppercase;font-weight:750;color:var(--mint)}.hero{display:flex;align-items:flex-start;justify-content:space-between;gap:2rem}.hero h1{font-size:clamp(2.25rem,5vw,3.9rem);line-height:1.1;letter-spacing:-.045em;margin:.7rem 0 1rem;max-width:780px}.hero p{max-width:730px;font-size:1.08rem;color:var(--muted);margin:0}.badge{border:1px solid var(--line);border-radius:50px;padding:.45rem .8rem;font-size:.78rem;white-space:nowrap;margin-top:1rem}.workspace{display:grid;grid-template-columns:minmax(290px,.86fr) minmax(0,1.45fr);gap:1.5rem;align-items:start}.card{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:1.45rem}.card h2{font-size:1.13rem;margin:0 0 1rem;letter-spacing:-.02em}.step{display:inline-grid;place-items:center;background:var(--mint-soft);color:var(--mint);width:1.6rem;height:1.6rem;border-radius:50%;font-size:.85rem;margin-right:.5rem}.field{display:block;margin-top:1rem;font-weight:650}.field span{font-size:.9rem}input,select{display:block;width:100%;border:1px solid #9baea4;border-radius:8px;padding:.65rem .7rem;color:var(--ink);background:white;margin-top:.3rem;min-height:45px}input{text-align:right;font-variant-numeric:tabular-nums}.hint{font-size:.82rem;color:var(--muted);margin:.45rem 0}.amounts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.9rem}.primary,.secondary,.example{border-radius:9px;padding:.65rem .9rem;min-height:44px;font-weight:650;border:1px solid var(--mint)}.primary{background:var(--mint);color:white;width:100%;margin-top:1.2rem}.secondary{background:transparent;color:var(--mint)}.example{background:white;border-color:var(--line);color:var(--ink);font-size:.83rem;padding:.4rem .65rem}.examples{display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.5rem}.error{color:#8c291b;font-weight:650;font-size:.9rem;margin:.8rem 0 0}.error:empty{display:none}.equation{font-size:clamp(1.35rem,3vw,1.9rem);font-weight:700;letter-spacing:.02em;line-height:1.45;text-align:center;background:var(--mint-soft);padding:1rem;border-radius:12px;margin:0 0 1.2rem}.pending{min-height:220px;display:grid;place-content:center;text-align:center;padding:2rem}.pending strong{font-size:1.4rem;font-weight:650}.pending p{max-width:350px;margin:.8rem auto;color:var(--muted)}[hidden]{display:none!important}.result-title{font-size:1.4rem;line-height:1.3;margin:.6rem 0 .5rem;letter-spacing:-.02em}.prediction-feedback{font-size:.87rem;color:var(--muted);margin:.2rem 0 1.2rem}.capacity-item{margin:.8rem 0}.capacity-label{display:flex;justify-content:space-between;gap:.5rem;align-items:baseline;font-size:.95rem}.capacity-label strong{font-variant-numeric:tabular-nums}.bar{height:13px;background:#e9ece5;border-radius:5px;overflow:hidden;margin-top:.4rem}.bar span{display:block;height:100%;background:var(--mint)}.capacity-item:nth-child(2) .bar span{background:var(--ochre)}.reason{background:#f0f3eb;border-left:3px solid var(--mint);padding:.8rem 1rem;margin:1.2rem 0;font-size:.94rem}.yield{display:flex;justify-content:space-between;gap:1rem;align-items:baseline;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:1rem 0;margin-bottom:1rem}.yield strong{font-size:1.75rem;font-variant-numeric:tabular-nums;white-space:nowrap}.yield span{font-size:.94rem}.table-wrap{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:.9rem;font-variant-numeric:tabular-nums}caption{text-align:left;font-weight:650;margin-bottom:.45rem}th,td{text-align:right;padding:.6rem .3rem;border-bottom:1px solid var(--line)}th:first-child,td:first-child{text-align:left}th{font-size:.78rem;color:var(--muted)}.downloads{display:flex;gap:.7rem;flex-wrap:wrap;margin-top:1.1rem}.status{font-size:.87rem;color:var(--muted);min-height:1.5em;margin-bottom:0}.bottom{display:grid;grid-template-columns:1.3fr 1fr;gap:1.5rem;margin-top:1.5rem}.bottom p,.bottom li{font-size:.94rem}.bottom ol{padding-left:1.2rem}.bottom li{margin:.55rem 0}details{margin-top:.9rem}summary{cursor:pointer;font-weight:650}.limits{color:var(--muted)}a{color:var(--mint);text-underline-offset:3px}.reference{font-size:.82rem!important;overflow-wrap:anywhere}footer{padding-bottom:2.5rem;font-size:.82rem;color:var(--muted)}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}@media(max-width:780px){header,main,footer{padding:1.2rem}.hero{display:block}.badge{display:inline-block;margin:.9rem 0 0}.workspace,.bottom{grid-template-columns:minmax(0,1fr)}.card{padding:1.1rem}.hero h1{font-size:2.6rem}.pending{min-height:170px}.yield{flex-direction:column;align-items:flex-start;gap:.35rem}.yield strong{font-size:1.5rem}.downloads>*{width:100%}}@media(prefers-reduced-motion:no-preference){.bar span{transition:width .2s ease}}
</style>
</head>
<body>
<a class="skip" href="#workbench">Skip to the explorer</a>
<header>
<div class="eyebrow">RecallWeave / Chemistry</div>
<div class="hero"><div><h1>Which reactant<br>sets the limit?</h1><p>Equal amounts are not always the right ratio. Make a prediction, compare what each reactant can support, and account for what remains.</p></div><span class="badge">Offline · No account</span></div>
</header>
<main id="workbench">
<div class="workspace">
<section class="card" aria-labelledby="setup-title">
<h2 id="setup-title"><span class="step">1</span>Set up a comparison</h2>
<form id="reaction-form" novalidate>
<label class="field" for="reaction">Balanced reaction<select id="reaction"></select></label>
<div class="amounts"><label class="field" for="amount-first"><span id="label-first">First reactant (mol)</span><input id="amount-first" inputmode="decimal" autocomplete="off" aria-describedby="amount-help calculation-error"></label><label class="field" for="amount-second"><span id="label-second">Second reactant (mol)</span><input id="amount-second" inputmode="decimal" autocomplete="off" aria-describedby="amount-help calculation-error"></label></div>
<p class="hint" id="amount-help">Use 0–1000 mol, with up to three decimal places. Convert masses to moles before entering them.</p>
<label class="field" for="prediction">Your prediction <span>(optional)</span><select id="prediction"></select></label>
<button class="primary" type="submit">Compare amounts</button>
<p id="calculation-error" class="error" role="alert"></p>
</form>
<p class="field">Try a different starting point</p>
<div class="examples"><button class="example" id="example-equal" type="button">Equal moles</button><button class="example" id="example-ratio" type="button">Exact ratio</button><button class="example" id="example-zero" type="button">One absent</button></div>
<p class="hint">Examples load the starting amounts. Compare when you are ready.</p>
</section>
<section class="card" aria-labelledby="result-section-title">
<h2 id="result-section-title"><span class="step">2</span>Follow the amounts</h2>
<p class="equation" id="equation"></p>
<div id="pending" class="pending"><strong>Predict, then compare.</strong><p>The smaller amount divided by its coefficient sets the shared reaction extent.</p></div>
<div id="result" hidden>
<h3 class="result-title" id="outcome" tabindex="-1"></h3><p class="prediction-feedback" id="prediction-feedback"></p>
<div id="capacities" aria-label="Reactant capacities"></div>
<p class="reason" id="reason"></p>
<div class="yield"><span id="product-label">Theoretical product</span><strong id="product-amount"></strong></div>
<div class="table-wrap"><table><caption>Reactant balance · all amounts in mol</caption><thead><tr><th scope="col">Reactant</th><th scope="col">Start</th><th scope="col">Used</th><th scope="col">Left</th></tr></thead><tbody id="balance"></tbody></table></div>
<p class="hint">Calculated amounts may be rounded for display.</p>
</div>
<div class="downloads"><button type="button" class="secondary" id="download-record" disabled>Download worked record (.txt)</button></div><p class="status" id="record-status" role="status" aria-live="polite"></p>
</section>
</div>
<div class="bottom">
<section class="card" aria-labelledby="why-title"><h2 id="why-title">Why divide by the coefficient?</h2><ol><li><strong>Normalize each supply.</strong> In 2 H₂ + O₂ → 2 H₂O, every 2 mol H₂ supports the same reaction extent as 1 mol O₂.</li><li><strong>Use the smaller capacity.</strong> Both reactants must supply that shared extent. An excess of one cannot replace a shortage of the other.</li><li><strong>Multiply back.</strong> Extent × coefficient gives the amount consumed or formed. Starting amount − amount consumed gives the excess.</li></ol><details><summary>What this model assumes</summary><p class="limits" id="model-note"></p><p class="limits">Amounts of molecules are not conserved as a total count. The balanced equations conserve each kind of atom. This explorer accepts mole amounts only and does not assign measurement uncertainty.</p></details></section>
<section class="card" aria-labelledby="course-title"><h2 id="course-title">Keep building the connection</h2><p>The companion course has 12 original questions with worked explanations and transfer prompts. Save it for a RecallWeave lesson player that supports local deck import.</p><button type="button" class="secondary" id="download-course">Download course (.json)</button><p class="status" id="course-status" role="status"></p><p class="reference">Background: OpenStax, <em>Chemistry 2e</em>, <a href="https://openstax.org/books/chemistry-2e/pages/4-3-reaction-stoichiometry" target="_blank" rel="noreferrer">4.3 Reaction Stoichiometry</a> and <a href="https://openstax.org/books/chemistry-2e/pages/4-4-reaction-yields" target="_blank" rel="noreferrer">4.4 Reaction Yields</a>. Examples and question wording are original; no textbook passages or figures are reproduced.</p></section>
</div>
</main>
<footer>This page works directly from a file. Inputs and predictions stay in this tab; only an explicit download creates a file. No upload, automatic storage or model call. Original course text: CC0-1.0.</footer>
<script type="application/json" id="course-data">${safeDeck}</script>
<script type="module">${script}</script>
</body>
</html>
`;
}
