import { MAX_STEPS, STATES, PRESETS, parsePercent, computeTrace, presetFor, absorbingStates, observationJSON } from "./markov-chains-core.mjs";

const byId = id => document.getElementById(id);
const colors = ["#166e80", "#a74320", "#6c48a2"];
const dashes = ["", "8 4", "2 4"];
const svgNS = "http://www.w3.org/2000/svg";
let computed;
let selectedStep = 0;
let dirty = false;
const percent = p => (p * 100).toFixed(4) + "%";
function cell(value, tag = "td") {
  const node = document.createElement(tag);
  node.textContent = value;
  return node;
}
function svg(tag, attrs, text) {
  const node = document.createElementNS(svgNS, tag);
  for (const [key, value] of Object.entries(attrs || {})) node.setAttribute(key, String(value));
  if (text !== undefined) node.textContent = text;
  return node;
}
function markDirty() {
  dirty = true;
  byId("draft-status").textContent = "Draft edited. Apply it to update the chart and downloads; the applied system remains below.";
}
function readDraft() {
  return {
    matrix: STATES.map((from, i) => STATES.map((to, j) =>
      parsePercent(byId("matrix-" + i + "-" + j).value, from + " to " + to))),
    initial: STATES.map((state, i) => parsePercent(byId("initial-" + i).value, "Initial " + state))
  };
}
function fillDraft(config) {
  config.matrix.forEach((row, i) => row.forEach((value, j) => {
    byId("matrix-" + i + "-" + j).value = String(value);
  }));
  config.initial.forEach((value, i) => { byId("initial-" + i).value = String(value); });
}
function applyDraft(event) {
  event?.preventDefault();
  try {
    const next = computeTrace(readDraft());
    computed = next;
    selectedStep = 0;
    dirty = false;
    const preset = presetFor(computed.config);
    byId("preset").value = preset?.id || "custom";
    byId("draft-error").textContent = "";
    byId("draft-status").textContent = "Applied. Step 0 shows the initial distribution.";
    render();
  } catch (error) {
    byId("draft-error").textContent = error.message + " The applied system has not changed.";
  }
}
function moveTo(step) {
  selectedStep = Math.max(0, Math.min(MAX_STEPS, step));
  render();
}
function drawChart() {
  if (!computed) return;
  const host = byId("chart");
  const width = Math.max(330, Math.min(900, host.clientWidth || 760));
  const height = 310, left = 48, right = 16, top = 24, bottom = 44;
  const plotWidth = width - left - right, plotHeight = height - top - bottom;
  const x = step => left + step * plotWidth / MAX_STEPS;
  const y = probability => top + (1 - probability) * plotHeight;
  const image = svg("svg", {viewBox: "0 0 " + width + " " + height, role: "img",
    "aria-labelledby": "chart-title chart-desc"});
  image.append(svg("title", {id: "chart-title"}, "Probability by step, from 0 to " + MAX_STEPS));
  image.append(svg("desc", {id: "chart-desc"}, "A is a solid teal line; B is a dashed rust line; C is a dotted purple line. Current step " + selectedStep + ". The complete values are available in the distribution table."));
  for (const tick of [0, .25, .5, .75, 1]) {
    image.append(svg("line", {x1:left, y1:y(tick), x2:width-right, y2:y(tick), stroke:"#cdd9d7", "stroke-width":1}));
    image.append(svg("text", {x:left-7, y:y(tick)+4, "text-anchor":"end", class:"axis"}, String(tick*100) + "%"));
  }
  for (const tick of [0, 5, 10, 15, 20, 25, 30]) {
    image.append(svg("text", {x:x(tick), y:height-21, "text-anchor":"middle", class:"axis"}, String(tick)));
  }
  image.append(svg("text", {x:left+plotWidth/2, y:height-3, "text-anchor":"middle", class:"axis"}, "Step"));
  STATES.forEach((state, i) => {
    image.append(svg("polyline", {points:computed.trace.map(row => x(row.step)+","+y(row.probabilities[i])).join(" "),
      fill:"none",stroke:colors[i],"stroke-width":3,"stroke-dasharray":dashes[i]}));
  });
  image.append(svg("line", {x1:x(selectedStep),y1:top,x2:x(selectedStep),y2:height-bottom,stroke:"#172d35","stroke-width":1.5,"stroke-dasharray":"3 4"}));
  STATES.forEach((_,i) => image.append(svg("circle",{cx:x(selectedStep),cy:y(computed.trace[selectedStep].probabilities[i]),r:4,fill:colors[i],stroke:"#fff","stroke-width":1.5})));
  host.replaceChildren(image);
}
function renderTables() {
  const step = computed.trace[selectedStep];
  byId("flow-heading").textContent = selectedStep === 0 ? "Before the first transition" : "Where step " + selectedStep + " probability came from";
  byId("flow-empty").hidden = selectedStep !== 0;
  byId("flow-table").hidden = selectedStep === 0;
  if (step.contributions) {
    byId("flow-caption").textContent = "Step " + (selectedStep-1) + " to step " + selectedStep + ". Each cell is current probability × conditional transition probability.";
    const rows = step.contributions.map((row, i) => {
      const tr = document.createElement("tr"); const heading = cell("From " + STATES[i], "th");
      heading.scope = "row"; tr.append(heading, ...row.map(p => cell(percent(p)))); return tr;
    });
    byId("flow-body").replaceChildren(...rows);
    STATES.forEach((_, i) => { byId("flow-total-" + i).textContent = percent(step.probabilities[i]); });
  }
  const allRows = computed.trace.map(row => {
    const tr = document.createElement("tr");
    if (row.step === selectedStep) tr.className = "selected-row";
    const th = cell(String(row.step), "th"); th.scope = "row";
    tr.append(th, ...row.probabilities.map(p => cell(percent(p)))); return tr;
  });
  byId("distribution-body").replaceChildren(...allRows);
}

function render() {
  const row = computed.trace[selectedStep];
  byId("step-slider").value = String(selectedStep);
  byId("step-number").textContent = String(selectedStep);
  byId("previous-step").disabled = selectedStep === 0;
  byId("next-step").disabled = selectedStep === MAX_STEPS;
  STATES.forEach((_, i) => { byId("mass-" + i).textContent = percent(row.probabilities[i]); });
  byId("mass-total").textContent = percent(row.probabilities.reduce((a,b) => a+b,0));
  const preset = presetFor(computed.config);
  byId("applied-name").textContent = preset?.label || "Custom system";
  const notes = {
    mixing:"For this matrix, [50%, 25%, 25%] is stationary. Every transition is positive, and distributions approach that vector from any initial distribution.",
    alternating:"Starting with all mass in A gives alternating distributions. Starting with [50%, 25%, 25%] instead stays stationary while every individual state changes.",
    absorbing:"A is absorbing and the other states can reach it. A finite plot does not prove that every individual path has already reached A.",
    closed:"A and B are separate absorbing states. Starting entirely in C gives [40%, 60%, 0%] after one step; other initial distributions can give different outcomes."
  };
  byId("system-note").textContent = preset ? notes[preset.id] :
    "This is your applied hypothetical transition rule. The chart computes its first 30 steps; a finite plot does not establish a general long-run limit.";
  const absorbing = absorbingStates(computed.config);
  byId("absorbing-note").textContent = absorbing.length ?
    "Absorbing states in the applied matrix: " + absorbing.join(", ") + ". Their self-transition is 100%." :
    "No state in the applied matrix is absorbing.";
  renderTables();
  drawChart();
  byId("step-announcement").textContent = "Step " + selectedStep + ": " +
    STATES.map((s,i) => s + " " + percent(row.probabilities[i])).join(", ") +
    (dirty ? ". Draft changes are not applied." : ".");
}
function download(text, name, mime) {
  const blob = new Blob([text], {type:mime});
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = name;
  document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  byId("download-status").textContent = "Download prepared: " + name + ".";
}
byId("transition-form").addEventListener("submit", applyDraft);
byId("transition-form").addEventListener("input", markDirty);
byId("preset").addEventListener("change", event => {
  const preset = PRESETS.find(p => p.id === event.target.value);
  if (preset) { fillDraft(preset); applyDraft(); }
});
byId("stationary-start").addEventListener("click", () => {
  [50,25,25].forEach((n,i) => { byId("initial-"+i).value = String(n); });
  applyDraft();
});
byId("all-a-start").addEventListener("click", () => {
  [100,0,0].forEach((n,i) => { byId("initial-"+i).value = String(n); });
  applyDraft();
});
byId("all-c-start").addEventListener("click", () => {
  [0,0,100].forEach((n,i) => { byId("initial-"+i).value = String(n); });
  applyDraft();
});
byId("previous-step").addEventListener("click", () => moveTo(selectedStep-1));
byId("next-step").addEventListener("click", () => moveTo(selectedStep+1));
byId("reset-step").addEventListener("click", () => moveTo(0));
byId("step-slider").addEventListener("input", event => moveTo(Number(event.target.value)));
byId("download-observation").addEventListener("click", () => {
  download(observationJSON(computed,selectedStep),"recallweave-markov-observation.json","application/json");
});
byId("download-deck").addEventListener("click", () => {
  const bytes = Uint8Array.from(atob(byId("course-data").textContent.trim()), c => c.charCodeAt(0));
  download(new TextDecoder("utf-8",{fatal:true}).decode(bytes),"markov-chains.json","application/json");
});
if (typeof ResizeObserver === "function") new ResizeObserver(drawChart).observe(byId("chart"));
else window.addEventListener("resize",drawChart);
fillDraft(PRESETS[0]);
applyDraft();
