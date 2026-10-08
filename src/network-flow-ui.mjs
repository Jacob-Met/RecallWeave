import { PRESETS, parseNetwork, networkText, solveNetwork, observationJSON } from "./network-flow.mjs";

const byId = id => document.getElementById(id);
const node = (tag, text, className) => {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
};
const svgNode = (tag, attributes = {}, text) => {
  const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  if (text !== undefined) element.textContent = text;
  return element;
};
let computed = null, selected = 0;

function updateTerminals(source = byId("source").value, sink = byId("sink").value) {
  const vertices = [...new Set(byId("vertices").value.trim().split(/[\s,]+/).filter(Boolean))].slice(0, 8);
  for (const [id, previous, fallback] of [["source", source, vertices[0]], ["sink", sink, vertices.at(-1)]]) {
    const select = byId(id);
    select.replaceChildren(...vertices.map(vertex => {
      const option = node("option", vertex);
      option.value = vertex;
      return option;
    }));
    select.value = vertices.includes(previous) ? previous : (fallback || "");
  }
}

function invalidate() {
  computed = null;
  byId("result").hidden = true;
  byId("empty").hidden = false;
  byId("error").textContent = "";
  byId("status").textContent = "Inputs changed. Build a new trace to inspect or download this network.";
  byId("example-note").textContent = "Custom network draft. Its result will appear after Build the trace.";
  for (const id of ["first", "previous", "next", "last", "step-select", "download-observation"]) byId(id).disabled = true;
}

function build() {
  byId("error").textContent = "";
  try {
    computed = solveNetwork(parseNetwork(byId("vertices").value, byId("edges").value, byId("source").value, byId("sink").value));
    selected = 0;
    byId("step-select").replaceChildren(...computed.steps.map((step, index) => {
      const label = step.kind === "initial" ? "Start with zero" :
        step.kind === "complete" ? "Prove the maximum" : "Augment +" + step.bottleneck;
      const option = node("option", index + " · " + label);
      option.value = String(index);
      return option;
    }));
    byId("step-select").disabled = false;
    byId("download-observation").disabled = false;
    byId("result").hidden = false;
    byId("empty").hidden = true;
    render();
  } catch (error) {
    computed = null;
    byId("result").hidden = true;
    byId("empty").hidden = false;
    byId("error").textContent = error.message;
    byId("status").textContent = "The network was not applied. Correct the input and build again.";
    for (const id of ["first", "previous", "next", "last", "step-select", "download-observation"]) byId(id).disabled = true;
  }
}

function loadExample() {
  const preset = PRESETS.find(item => item.id === byId("preset").value) || PRESETS[0];
  const text = networkText(preset);
  byId("vertices").value = text.vertices;
  byId("edges").value = text.edges;
  updateTerminals(text.source, text.sink);
  byId("example-note").textContent = preset.note;
  build();
}

function tableRow(cells, className) {
  const row = node("tr", undefined, className);
  cells.forEach(cell => row.append(node("td", String(cell))));
  return row;
}

function renderGraph(step) {
  const network = computed.network;
  const svg = svgNode("svg", { viewBox: "0 0 720 430", role: "img", "aria-labelledby": "network-title network-description" });
  svg.append(svgNode("title", { id: "network-title" }, "Original network at step " + selected + ", flow value " + step.value));
  svg.append(svgNode("desc", { id: "network-description" },
    "Arrows are original directed edges. Green edges gain flow; dashed orange edges lose flow; purple edges form the final outward cut. Exact assignments and residual directions appear in the following tables."));
  const defs = svgNode("defs");
  for (const [name, color] of [["normal", "#778e86"], ["use", "#075e52"], ["cancel", "#983b17"], ["cut", "#574397"]]) {
    const marker = svgNode("marker", { id: "arrow-" + name, markerWidth: 8, markerHeight: 8, refX: 7, refY: 4, orient: "auto", markerUnits: "userSpaceOnUse" });
    marker.append(svgNode("path", { d: "M0 0L8 4L0 8Z", fill: color }));
    defs.append(marker);
  }
  svg.append(defs);
  const positions = new Map([[network.source, { x: 62, y: 215 }], [network.sink, { x: 658, y: 215 }]]);
  const middle = network.vertices.filter(v => v !== network.source && v !== network.sink);
  const leftCount = Math.ceil(middle.length / 2);
  middle.forEach((vertex, index) => {
    const column = index < leftCount ? 0 : 1;
    const row = column === 0 ? index : index - leftCount;
    const count = column === 0 ? leftCount : middle.length - leftCount;
    positions.set(vertex, { x: middle.length === 1 ? 360 : (column === 0 ? 258 : 462), y: count === 1 ? 215 : 70 + row * 290 / (count - 1) });
  });
  const dense = step.edges.length > 14;
  const labels = [];
  step.edges.forEach((edge, index) => {
    const a = positions.get(edge.from), b = positions.get(edge.to);
    const dx = b.x - a.x, dy = b.y - a.y, distance = Math.hypot(dx, dy);
    const ux = dx / distance, uy = dy / distance;
    const start = { x: a.x + ux * 29, y: a.y + uy * 29 };
    const end = { x: b.x - ux * 33, y: b.y - uy * 33 };
    const opposite = step.edges.some(other => other.from === edge.to && other.to === edge.from);
    const bend = opposite ? 44 : 0;
    const control = { x: (start.x + end.x) / 2 - uy * bend, y: (start.y + end.y) / 2 + ux * bend };
    const change = step.changes.find(item => item.edgeId === edge.id);
    const kind = step.cut?.edgeIds.includes(edge.id) ? "cut" : change ? (change.delta > 0 ? "use" : "cancel") : "normal";
    svg.append(svgNode("path", {
      d: "M" + start.x + " " + start.y + " Q" + control.x + " " + control.y + " " + end.x + " " + end.y,
      class: "edge " + kind, "marker-end": "url(#arrow-" + kind + ")"
    }));
    if (!dense) {
      const t = opposite ? 0.5 : 0.34 + (index % 3) * 0.16;
      const x = (1 - t) ** 2 * start.x + 2 * (1 - t) * t * control.x + t * t * end.x;
      const y = (1 - t) ** 2 * start.y + 2 * (1 - t) * t * control.y + t * t * end.y;
      const text = edge.id + " " + edge.flow + "/" + edge.capacity;
      labels.push({ x, y, text });
    }
  });
  for (const label of labels) {
    const width = label.text.length * 7 + 10;
    svg.append(svgNode("rect", { x: label.x - width / 2, y: label.y - 10, width, height: 19, rx: 4, fill: "#fffdf8" }));
    svg.append(svgNode("text", { x: label.x, y: label.y + 4, "text-anchor": "middle", class: "edge-label" }, label.text));
  }
  for (const vertex of network.vertices) {
    const position = positions.get(vertex);
    const terminal = vertex === network.source ? "source" : vertex === network.sink ? "sink" : "";
    const color = terminal === "source" ? "#d9eeda" : terminal === "sink" ? "#eee4be" : step.cut?.sourceSide.includes(vertex) ? "#e9e1f5" : "#fffdf8";
    svg.append(svgNode("circle", { cx: position.x, cy: position.y, r: 27, fill: color, stroke: "#314d4a", "stroke-width": terminal ? 2.5 : 1.4 }));
    svg.append(svgNode("text", { x: position.x, y: position.y + 5, "text-anchor": "middle", "font-size": vertex.length > 5 ? 9 : 14, "font-weight": 700 }, vertex));
    if (terminal) svg.append(svgNode("text", { x: position.x, y: position.y + 47, "text-anchor": "middle", "font-size": 11 }, terminal));
  }
  byId("graph").replaceChildren(svg);
  byId("graph-help").textContent = dense ?
    "This dense network keeps its exact edge labels in the table below. Original arrows and step changes remain visible." :
    "Original arrows show edge ID and flow / capacity. A dashed cancellation still points in its original direction; the residual path below shows the reverse adjustment.";
}

function render() {
  if (!computed) return;
  const step = computed.steps[selected];
  byId("flow-value").textContent = String(step.value);
  byId("phase").textContent = step.kind === "complete" ? "Maximum certified" : step.kind === "initial" ? "Start with zero" : "Augment +" + step.bottleneck;
  byId("step-select").value = String(selected);
  byId("first").disabled = byId("previous").disabled = selected === 0;
  byId("next").disabled = byId("last").disabled = selected === computed.steps.length - 1;
  byId("status").textContent = "Step " + selected + " of " + (computed.steps.length - 1) + ". Flow value " + step.value + ". " +
    (step.kind === "complete" ? "A matching cut certifies the maximum." : step.kind === "initial" ? "Every original assignment is zero." : "Added " + step.bottleneck + " along the displayed residual path.");
  byId("step-description").textContent = step.kind === "initial" ?
    "Begin with zero flow on every original edge. Next finds a breadth-first route in the residual network." :
    step.kind === "complete" ? "No positive residual path reaches the sink. The reachable source-side vertices give the matching cut below." :
    "Add " + step.bottleneck + " along " + step.path.map(arc => arc.from).concat(computed.network.sink).join(" → ") +
    ". The bottleneck is the smallest available capacity on this residual path.";
  byId("path-heading").hidden = byId("path-list").hidden = step.kind !== "augment";
  byId("path-list").replaceChildren(...step.path.map(arc => {
    const original = step.edges.find(edge => edge.id === arc.edgeId);
    const change = step.changes.find(item => item.edgeId === arc.edgeId);
    return node("li", arc.from + " → " + arc.to + " · " + (arc.direction === 1 ? "use " : "cancel ") +
      arc.edgeId + " (" + original.from + " → " + original.to + "): " + arc.available +
      " available before this step; original flow " + change.before + " → " + change.after,
    arc.direction === -1 ? "cancel-text" : "");
  }));
  byId("certificate").hidden = !step.cut;
  if (step.cut) {
    const sides = node("p", "Source side: {" + step.cut.sourceSide.join(", ") + "}. Sink side: {" + step.cut.sinkSide.join(", ") + "}.");
    const edges = step.edges.filter(edge => step.cut.edgeIds.includes(edge.id));
    const sum = edges.length ? edges.map(edge => edge.id + " " + edge.from + " → " + edge.to + ": " + edge.capacity).join("; ") : "No outward original edges";
    byId("certificate").replaceChildren(node("strong", "Flow " + step.value + " = cut capacity " + step.cut.capacity + ". The maximum is proved."),
      sides, node("p", sum + "."), node("p", "Only original edges directed out of the source side count toward cut capacity. Edges pointing back do not.", "small"));
  }
  byId("edge-body").replaceChildren(...step.edges.map(edge => {
    const change = step.changes.find(item => item.edgeId === edge.id);
    return tableRow([edge.id, edge.from + " → " + edge.to, edge.flow + " / " + edge.capacity, edge.capacity - edge.flow, edge.flow,
      change ? (change.delta > 0 ? "+" : "") + change.delta : "—"],
    step.cut?.edgeIds.includes(edge.id) ? "cut-row" : change ? (change.delta > 0 ? "changed-use" : "changed-cancel") : "");
  }));
  byId("residual-body").replaceChildren(...step.residual.map(arc => {
    const edge = step.edges.find(item => item.id === arc.edgeId);
    return tableRow([arc.from + " → " + arc.to, (arc.direction === 1 ? "Use " : "Cancel ") + arc.edgeId +
      " (" + edge.from + " → " + edge.to + ")", arc.available], arc.direction === -1 ? "changed-cancel" : "");
  }));
  byId("residual-empty").hidden = step.residual.length !== 0;
  byId("balance-body").replaceChildren(...step.balances.map(balance => tableRow([balance.vertex, balance.incoming, balance.outgoing, balance.netOut])));
  renderGraph(step);
}

function download(bytes, name, type) {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const link = node("a");
  link.href = url; link.download = name;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function embeddedBytes(id) {
  return Uint8Array.from(atob(byId(id).textContent.trim()), character => character.charCodeAt(0));
}
for (const preset of PRESETS) {
  const option = node("option", preset.title); option.value = preset.id; byId("preset").append(option);
}
byId("load-example").addEventListener("click", loadExample);
byId("vertices").addEventListener("input", () => { updateTerminals(); invalidate(); });
byId("edges").addEventListener("input", invalidate);
byId("source").addEventListener("change", invalidate);
byId("sink").addEventListener("change", invalidate);
byId("network-form").addEventListener("submit", event => { event.preventDefault(); build(); });
byId("step-select").addEventListener("change", () => {
  if (computed) { selected = Number(byId("step-select").value); render(); }
});
for (const [id, target] of [["first", () => 0], ["previous", () => selected - 1], ["next", () => selected + 1], ["last", () => computed.steps.length - 1]]) {
  byId(id).addEventListener("click", () => {
    if (computed) { selected = Math.max(0, Math.min(computed.steps.length - 1, target())); render(); }
  });
}
byId("download-course").addEventListener("click", () => download(embeddedBytes("course-data"), "network-flow.json", "application/json"));
byId("download-guide").addEventListener("click", () => download(embeddedBytes("guide-data"), "network-flow.md", "text/markdown;charset=utf-8"));
byId("download-observation").addEventListener("click", () => {
  if (computed) download(observationJSON(computed, selected), "recallweave-network-flow-observation.json", "application/json");
});
loadExample();
