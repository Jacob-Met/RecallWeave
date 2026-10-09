import { PRESETS, parseDraft, analyzeNetwork, configurationJSON } from "./sorting-networks-core.mjs";
const $ = id => document.getElementById(id);
let accepted = null, selected = null, step = 0;
const text = (tag, value, className) => {
  const element = document.createElement(tag);
  element.textContent = value;
  if (className) element.className = className;
  return element;
};
const row = values => {
  const tr = document.createElement("tr");
  values.forEach(value => tr.append(text("td", String(value))));
  return tr;
};
function status(message, error = false) {
  $("status").textContent = message;
  $("status").classList.toggle("error", error);
}
function retire() {
  accepted = null; selected = null; step = 0;
  $("results").hidden = true;
  $("download-config").disabled = true;
  $("download-observation").disabled = true;
  status("Draft changed. Choose Run network to create a current result.");
}
for (const id of ["wires", "values", "comparators"]) $(id).addEventListener("input", retire);
$("load-preset").addEventListener("click", () => {
  const preset = PRESETS[Number($("preset").value)];
  $("wires").value = String(preset.wires);
  $("values").value = preset.values.join(" ");
  $("comparators").value = preset.comparators.map(pair => pair.join(" ")).join("\n");
  retire();
});
function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], {type}));
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.append(a);
  try { a.click(); } finally { a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
}
$("download-config").addEventListener("click", () => {
  if (accepted) download("sorting-network-configuration.json", configurationJSON(accepted.configuration), "application/json;charset=utf-8");
});
$("download-observation").addEventListener("click", () => {
  if (accepted) download("sorting-network-observation.json", JSON.stringify(accepted, null, 2) + "\n", "application/json;charset=utf-8");
});
$("download-course").addEventListener("click", () => {
  const bytes = Uint8Array.from(atob($("course-data").textContent.trim()), c => c.charCodeAt(0));
  download("sorting-networks.json", bytes, "application/json;charset=utf-8");
});
function drawNetwork(trace) {
  const {wires, comparators} = accepted.configuration;
  const width = Math.max(480, 180 + comparators.length * 48), height = 54 + wires * 48;
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 " + width + " " + height);
  svg.setAttribute("width", width); svg.setAttribute("height", height);
  svg.setAttribute("role", "img"); svg.setAttribute("aria-label", "Fixed comparator network: smaller values move to lower-numbered wires. Selected step " + step + ".");
  const add = (tag, attributes, value) => {
    const e = document.createElementNS(ns, tag);
    for (const [key, v] of Object.entries(attributes)) e.setAttribute(key, v);
    if (value !== undefined) e.textContent = value;
    svg.append(e);
    return e;
  };
  for (let i = 0; i < wires; i++) {
    const y = 40 + 48 * i;
    add("line", {x1:70,y1:y,x2:width-70,y2:y,stroke:"#9cb0b9","stroke-width":2});
    add("text", {x:10,y:y+5,fill:"#182d39","font-size":14}, "W" + (i + 1) + ": " + trace.input[i]);
    add("text", {x:width-55,y:y+5,fill:"#182d39","font-size":14}, trace.output[i]);
  }
  comparators.forEach(([a,b], i) => {
    const x = 100 + i * 48, y1 = 40 + 48 * (a - 1), y2 = 40 + 48 * (b - 1);
    const color = step === i + 1 ? "#a55b00" : "#075d62";
    add("line", {x1:x,y1,x2:x,y2,stroke:color,"stroke-width":step === i + 1 ? 5 : 3});
    add("circle", {cx:x,cy:y1,r:5,fill:color});
    add("circle", {cx:x,cy:y2,r:5,fill:color});
    add("text", {x,y:height-12,fill:"#435c68","text-anchor":"middle","font-size":12}, i + 1);
  });
  $("diagram").replaceChildren(svg);
}
function showStep() {
  const trace = selected === null ? accepted.authored : accepted.binary.cases[selected];
  const current = step === 0 ? trace.input : trace.steps[step - 1].after;
  $("trace-source").textContent = selected === null ? "Authored input: " + trace.input.join(" ") :
    "Binary case " + selected + ": " + trace.input.join(" ") + (trace.sorted ? " — sorted output." : " — counterexample.");
  $("step-summary").textContent = step === 0 ? "Step 0 · before any comparison" :
    "Step " + step + " · compare wires " + trace.steps[step-1].pair.join(" and ") + " · " +
    (trace.steps[step-1].swapped ? "swap" : "unchanged");
  $("current-values").textContent = current.map((x,i) => "W" + (i+1) + ": " + x).join("   ");
  $("previous").disabled = step === 0;
  $("next").disabled = step === trace.steps.length;
  drawNetwork(trace);
  const head = document.createElement("tr");
  ["Step", "Pair", ...Array.from({length:accepted.configuration.wires},(_,i) => "Wire " + (i+1)), "Action"].forEach(x => {
    const th = text("th", x); th.scope = "col"; head.append(th);
  });
  $("trace-table").querySelector("thead").replaceChildren(head);
  const rows = [row([0, "—", ...trace.input, "Initial"])];
  trace.steps.forEach(s => rows.push(row([s.index, s.pair.join("–"), ...s.after, s.swapped ? "Swap" : "Unchanged"])));
  rows[step].classList.add("active");
  $("trace-table").querySelector("tbody").replaceChildren(...rows);
}
function render() {
  const b = accepted.binary;
  $("verdict").textContent = b.sortsAll ? "All " + b.total + " binary inputs sort." : b.failed + " of " + b.total + " binary inputs fail.";
  $("verdict-detail").textContent = b.sortsAll ?
    "By the zero–one principle, this fixed min/max network sorts all ordered inputs of length " + accepted.configuration.wires + "." :
    "This exact network is not a sorting network. Each unsorted row below is a witness you can trace.";
  $("binary-summary").textContent = b.passed + " sorted · " + b.failed + " unsorted · " + b.total + " complete cases, in lexicographic order.";
  const rows = b.cases.map(c => {
    const tr = row([c.ordinal, c.input.join(" "), c.output.join(" ")]);
    const result = document.createElement("td");
    result.append(text("span", c.sorted ? "Sorted" : "Unsorted", c.sorted ? "pill" : "pill fail"));
    if (!c.sorted) result.append(text("span", " · wires " + c.firstInversion.join("–"), "hint"));
    tr.append(result);
    const action = document.createElement("td"), button = text("button", "Trace", "secondary smallbtn");
    button.type = "button"; button.setAttribute("aria-label", "Trace binary case " + c.ordinal);
    button.addEventListener("click", () => { selected = c.ordinal; step = 0; showStep(); $("trace-title").scrollIntoView({block:"start"}); });
    action.append(button); tr.append(action);
    return tr;
  });
  $("binary-table").querySelector("tbody").replaceChildren(...rows);
  selected = null; step = 0;
  $("results").hidden = false; showStep();
}
$("run").addEventListener("click", () => {
  retire();
  try {
    const configuration = parseDraft($("wires").value, $("values").value, $("comparators").value);
    accepted = analyzeNetwork(configuration);
    render();
    $("download-config").disabled = false; $("download-observation").disabled = false;
    status("Current result: " + configuration.wires + " wires, " + configuration.comparators.length + " fixed comparators. Downloads preserve this accepted configuration.");
  } catch (error) {
    retire(); status(error.message, true);
  }
});
$("previous").addEventListener("click", () => { if (accepted && step > 0) { step--; showStep(); } });
$("next").addEventListener("click", () => { if (accepted && step < accepted.configuration.comparators.length) { step++; showStep(); } });
$("authored").addEventListener("click", () => { if (accepted) { selected = null; step = 0; showStep(); } });
