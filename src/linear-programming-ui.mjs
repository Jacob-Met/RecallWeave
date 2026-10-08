import { PRESETS, parseProblem, problemFields, solveProblem, observationJSON } from "./linear-programming.mjs";

const byId = id => document.getElementById(id);
const fields = ["xmin", "xmax", "ymin", "ymax", "constraints", "p", "q", "sense"];
let current = null;
let selectedVertex = null;
function setText(id, value) { byId(id).textContent = value; }
function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function row(cells, className = "") {
  const tr = element("tr", undefined, className);
  for (const [text, exact = false] of cells) tr.append(element("td", text, exact ? "exact" : ""));
  return tr;
}
function pointText(vertex) { return "(" + vertex.x + ", " + vertex.y + ")"; }
function inequality(boundary) { return boundary.a + "x + " + boundary.b + "y ≤ " + boundary.c; }
function retire() {
  current = null;
  selectedVertex = null;
  byId("result").hidden = true;
  byId("empty-state").hidden = false;
  byId("download-observation").disabled = true;
  byId("error").hidden = true;
  setText("status", "Draft changed. Apply the complete problem to calculate a current result.");
}
function svgNode(tag, attrs, text) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  if (text !== undefined) node.textContent = text;
  return node;
}
function draw() {
  if (!current) return;
  const svg = byId("plot");
  // These conversions affect drawing only; the solver's record stays exact.
  const approximate = fraction => {
    const [numerator, denominator = "1"] = fraction.split("/");
    return Number(numerator) / Number(denominator);
  };
  const bounds = current.problem.bounds;
  const xrange = Math.max(2, bounds.xmax - bounds.xmin);
  const yrange = Math.max(2, bounds.ymax - bounds.ymin);
  const xmid = (bounds.xmax + bounds.xmin) / 2;
  const ymid = (bounds.ymax + bounds.ymin) / 2;
  const xmin = xmid - xrange * .62, xmax = xmid + xrange * .62;
  const ymin = ymid - yrange * .62, ymax = ymid + yrange * .62;
  const px = x => 48 + (x - xmin) / (xmax - xmin) * 544;
  const py = y => 362 - (y - ymin) / (ymax - ymin) * 314;
  const vertices = new Map(current.vertices.map(vertex => [vertex.id, vertex]));
  const coords = id => {
    const vertex = vertices.get(id);
    return [px(approximate(vertex.x)), py(approximate(vertex.y))];
  };
  svg.replaceChildren(
    svgNode("title", { id: "plot-title" }, "Feasible region and complete optimum"),
    svgNode("desc", { id: "plot-description" }, byId("optimum-summary").textContent + " " + byId("coverage").textContent)
  );
  for (let tick = 0; tick <= 4; tick += 1) {
    const x = xmin + (xmax - xmin) * tick / 4;
    const y = ymin + (ymax - ymin) * tick / 4;
    svg.append(svgNode("line", { x1: px(x), y1: 48, x2: px(x), y2: 362, stroke: "#d9e3dc" }));
    svg.append(svgNode("line", { x1: 48, y1: py(y), x2: 592, y2: py(y), stroke: "#d9e3dc" }));
    svg.append(svgNode("text", { x: px(x), y: 382, "text-anchor": "middle", "font-size": 12, fill: "#4b6567" }, Number(x.toFixed(2))));
    svg.append(svgNode("text", { x: 39, y: py(y) + 4, "text-anchor": "end", "font-size": 12, fill: "#4b6567" }, Number(y.toFixed(2))));
  }
  if (xmin <= 0 && xmax >= 0) svg.append(svgNode("line", { x1: px(0), y1: 48, x2: px(0), y2: 362, stroke: "#92a89d" }));
  if (ymin <= 0 && ymax >= 0) svg.append(svgNode("line", { x1: 48, y1: py(0), x2: 592, y2: py(0), stroke: "#92a89d" }));
  svg.append(svgNode("rect", {
    x: px(bounds.xmin), y: py(bounds.ymax),
    width: px(bounds.xmax) - px(bounds.xmin), height: py(bounds.ymin) - py(bounds.ymax),
    fill: "none", stroke: "#83998d", "stroke-dasharray": "5 4"
  }));
  svg.append(svgNode("text", { x: 611, y: 382, fill: "#4b6567", "font-size": 14 }, "x"));
  svg.append(svgNode("text", { x: 27, y: 30, fill: "#4b6567", "font-size": 14 }, "y"));
  const shape = (ids, kind, optimal = false) => {
    if (!ids.length) return;
    const stroke = optimal ? "#a94c11" : "#086b67";
    const fill = optimal ? "#a94c1138" : "#187b7230";
    if (kind === "point") {
      const [cx, cy] = coords(ids[0]);
      svg.append(svgNode("circle", { cx, cy, r: optimal ? 8 : 6, fill: stroke, stroke: "white", "stroke-width": 2 }));
    } else if (kind === "segment") {
      const [x1, y1] = coords(ids[0]), [x2, y2] = coords(ids.at(-1));
      svg.append(svgNode("line", { x1, y1, x2, y2, stroke, "stroke-width": optimal ? 6 : 4, "stroke-linecap": "round" }));
    } else {
      svg.append(svgNode("polygon", { points: ids.map(id => coords(id).join(",")).join(" "), fill, stroke, "stroke-width": optimal ? 3 : 2 }));
    }
  };
  shape(current.region.boundary, current.region.kind);
  if (current.optimum) shape(current.optimum.vertices, current.optimum.kind, true);
  for (const vertex of current.vertices) {
    const [cx, cy] = coords(vertex.id);
    svg.append(svgNode("circle", { cx, cy, r: vertex.id === selectedVertex ? 6 : 3.5, fill: "#172f32", stroke: "white", "stroke-width": 2 }));
    svg.append(svgNode("text", { x: cx + 9, y: cy - 9, fill: "#172f32", "font-size": 13, "font-weight": 650 }, vertex.id));
  }
  if (!current.vertices.length) svg.append(svgNode("text", { x: 320, y: 207, "text-anchor": "middle", fill: "#7b2020", "font-size": 19 }, "No feasible point"));
}
function inspect() {
  if (!current) return;
  const vertex = current.vertices.find(value => value.id === selectedVertex);
  const body = byId("slacks-table").tBodies[0];
  body.replaceChildren();
  if (!vertex) {
    setText("vertex-detail", "There is no feasible vertex to inspect.");
  } else {
    setText("vertex-detail", vertex.id + " " + pointText(vertex) + " · objective " + vertex.objective +
      ". Active rows: " + (vertex.active.join(", ") || "none") + ". Defined by " + vertex.pairs.length + " boundary pair(s).");
    for (const slack of vertex.slacks) {
      const boundary = current.boundaries.find(value => value.id === slack.id);
      body.append(row([[slack.id], [inequality(boundary)], [slack.value, true], [slack.value === "0" ? "Yes" : "No"]]));
    }
  }
  draw();
}
function render() {
  const result = current;
  const optimum = result.optimum;
  setText("region-badge", "Feasible " + result.region.kind);
  setText("result-title", (result.problem.objective.sense === "max" ? "Maximize " : "Minimize ") +
    result.problem.objective.p + "x + " + result.problem.objective.q + "y");
  if (!optimum) {
    setText("optimum-summary", "Infeasible: no point satisfies all bounds and authored rows.");
    setText("coverage", "There is no attained optimum. This is an empty feasible set, not a zero objective value.");
  } else {
    const points = optimum.vertices.map(id => id + " " + pointText(result.vertices.find(vertex => vertex.id === id)));
    const location = optimum.kind === "point" ? "at " + points[0] :
      optimum.kind === "segment" ? "on the entire segment from " + points[0] + " to " + points.at(-1) :
      "throughout the entire feasible region";
    setText("optimum-summary", (optimum.sense === "max" ? "Maximum " : "Minimum ") + optimum.value + " " + location + ".");
    setText("coverage", optimum.wholeRegion ?
      "Every feasible point is optimal. The complete optimal set is a " + optimum.kind + "." :
      "The complete optimal set is a " + optimum.kind + "; the remaining feasible points have worse objective values.");
  }
  const body = byId("vertices-table").tBodies[0];
  body.replaceChildren();
  const select = byId("vertex-select");
  select.replaceChildren();
  for (const vertex of result.vertices) {
    body.append(row([[vertex.id], [vertex.x, true], [vertex.y, true], [vertex.objective, true], [vertex.optimal ? "Yes" : "No"]], vertex.optimal ? "optimal-row" : ""));
    const option = element("option", vertex.id + " " + pointText(vertex));
    option.value = vertex.id;
    select.append(option);
  }
  select.disabled = result.vertices.length === 0;
  selectedVertex = result.vertices[0]?.id ?? null;
  setText("vertex-count", result.vertices.length + " exact feasible vertices; IDs follow coordinate order, not objective rank.");
  const pairs = byId("pairs-table").tBodies[0];
  pairs.replaceChildren();
  for (const pair of result.pairs) {
    const crossing = pair.kind === "intersection" ? pointText(pair.point) : "—";
    const feasibility = pair.kind !== "intersection" ? "No unique crossing" :
      pair.feasible ? "Feasible · " + pair.vertex : "Fails " + pair.violated.join(", ");
    pairs.append(row([[pair.first + " × " + pair.second], [pair.kind], [crossing, true], [feasibility]]));
  }
  setText("pair-summary", "Every boundary pair · " + result.pairs.length + " checked");
  inspect();
}
function apply() {
  try {
    const draft = Object.fromEntries(fields.map(key => [key, byId(key).value]));
    current = solveProblem(parseProblem(draft));
    render();
    byId("result").hidden = false;
    byId("empty-state").hidden = true;
    byId("error").hidden = true;
    byId("download-observation").disabled = false;
    setText("status", "Applied current problem. All " + current.pairs.length + " boundary pairs checked with exact arithmetic.");
  } catch (error) {
    retire();
    setText("status", "The draft has not been applied.");
    setText("error", error.message);
    byId("error").hidden = false;
  }
}
function loadPreset() {
  const preset = PRESETS.find(value => value.id === byId("preset").value);
  for (const [key, value] of Object.entries(problemFields(preset.problem))) byId(key).value = value;
  setText("preset-note", preset.note);
  apply();
}
function embeddedBytes(id) {
  return Uint8Array.from(atob(byId(id).textContent.trim()), character => character.charCodeAt(0));
}
function download(bytes, type, name) {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const link = element("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  setText("download-status", "Requested " + name + " from this page. Your browser controls where it is saved.");
}
for (const preset of PRESETS) {
  const option = element("option", preset.title);
  option.value = preset.id;
  byId("preset").append(option);
}
for (const name of fields) {
  byId(name).addEventListener("input", retire);
  byId(name).addEventListener("change", retire);
}
byId("problem-form").addEventListener("submit", event => { event.preventDefault(); apply(); });
byId("load-preset").addEventListener("click", loadPreset);
byId("vertex-select").addEventListener("change", () => { selectedVertex = byId("vertex-select").value; inspect(); });
byId("download-course").addEventListener("click", () => download(embeddedBytes("course-data"), "application/json;charset=utf-8", "linear-programming.json"));
byId("download-guide").addEventListener("click", () => download(embeddedBytes("guide-data"), "text/markdown;charset=utf-8", "linear-programming.md"));
byId("download-observation").addEventListener("click", () => {
  if (current) download(observationJSON(current, selectedVertex), "application/json;charset=utf-8", "linear-programming-observation.json");
});
loadPreset();
