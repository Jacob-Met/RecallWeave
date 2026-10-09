import {parseFenwickDraft, buildFenwickTrace, serializeFenwickTrace} from "./fenwick-trees.mjs";

const byId = (id) => document.getElementById(id);
const initialInput = byId("initial-values");
const operationsInput = byId("operations");
const status = byId("status");
const results = byId("results");
let trace = null;
let selected = 0;

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function labelOperation(operation) {
  if (operation.kind === "add") return "add " + operation.index + " " + operation.delta;
  if (operation.kind === "prefix") return "prefix " + operation.end;
  return "range " + operation.start + " " + operation.end;
}

function retire(message) {
  trace = null;
  selected = 0;
  results.hidden = true;
  byId("download-trace").disabled = true;
  for (const id of ["previous-step", "next-step", "last-step"]) byId(id).disabled = true;
  status.textContent = message;
}

function render() {
  const step = selected ? trace.steps[selected - 1] : null;
  const state = step ? step.after : trace.initial;
  byId("step-position").textContent = selected + " of " + trace.steps.length;
  byId("step-heading").textContent = step ? "After " + labelOperation(step.operation) : "Initial responsibility blocks";
  byId("step-explanation").textContent = !step
    ? "Each tree entry is the sum of its listed inclusive interval. The initial construction is not an update operation."
    : step.operation.kind === "add"
      ? "The point value and every containing responsibility block receive the same addition. These totals show the completed update."
      : "The query reads stored block totals. It changes neither the values nor the tree.";
  const rows = state.values.map((value, offset) => {
    const row = element("tr");
    row.dataset.index = String(offset + 1);
    const block = trace.blocks[offset];
    for (const text of [offset + 1, value, state.tree[offset], "[" + block.start + ", " + block.end + "]"]) {
      row.append(element("td", String(text)));
    }
    return row;
  });
  byId("state-body").replaceChildren(...rows);
  const visits = byId("visits");
  visits.replaceChildren();
  byId("query-result").hidden = !step || step.result === null;
  byId("query-result").textContent = step && step.result !== null ? "Exact query result: " + step.result : "";
  if (!step) {
    visits.append(element("p", "Choose Next operation to inspect the actual update or query path."));
  } else if (step.operation.kind === "add") {
    for (const visit of step.visits) {
      const card = element("li", undefined, "visit");
      card.dataset.index = String(visit.index);
      card.append(element("h3", "Update tree[" + visit.index + "] · interval [" + visit.start + ", " + visit.end + "]"));
      card.append(element("p", visit.before + " + (" + step.operation.delta + ") = " + visit.after));
      card.append(element("p", "lowbit(" + visit.index + ") = " + visit.lowbit + "; next index " + visit.next +
        (visit.next > state.values.length ? " exceeds " + state.values.length + ": stop." : ".")));
      visits.append(card);
    }
  } else {
    for (const part of step.queries) {
      const card = element("li", undefined, "query");
      card.dataset.end = String(part.end);
      card.dataset.sign = String(part.sign);
      card.append(element("h3", (part.sign === 1 ? "Add" : "Subtract") + " prefix(" + part.end + ") = " + part.sum));
      if (part.visits.length === 0) card.append(element("p", "Empty prefix: no tree entries read; total 0."));
      const list = element("ol");
      for (const visit of part.visits) {
        const item = element("li", undefined, "visit");
        item.dataset.index = String(visit.index);
        item.append(element("strong", "Read tree[" + visit.index + "] = " + visit.stored +
          " · interval [" + visit.start + ", " + visit.end + "]"));
        item.append(element("p", "Running sum: " + visit.accumulatorBefore + " + (" + visit.stored + ") = " + visit.accumulatorAfter));
        item.append(element("p", "lowbit(" + visit.index + ") = " + visit.lowbit + "; next index " + visit.next +
          (visit.next === 0 ? ": stop." : ".")));
        list.append(item);
      }
      card.append(list);
      visits.append(card);
    }
    if (step.queries.length === 2) visits.append(element("li",
      step.queries[0].sum + " − (" + step.queries[1].sum + ") = " + step.result, "equation"));
  }
  byId("previous-step").disabled = selected === 0;
  byId("next-step").disabled = selected === trace.steps.length;
  byId("last-step").disabled = selected === trace.steps.length;
  byId("download-trace").disabled = false;
  results.hidden = false;
}

function download(text, filename) {
  const url = URL.createObjectURL(new Blob([text], {type: "application/json;charset=utf-8"}));
  const link = element("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

for (const input of [initialInput, operationsInput]) {
  input.addEventListener("input", () => retire("Draft changed. Build a new trace to inspect or export it."));
}
byId("build-trace").addEventListener("click", () => {
  retire("Checking the entire draft…");
  try {
    trace = buildFenwickTrace(parseFenwickDraft(initialInput.value, operationsInput.value));
    render();
    status.textContent = "Built " + trace.steps.length + " operations for " + trace.input.initial.length +
      " positions. Showing the initial tree; navigation only inspects the saved trace.";
  } catch (error) {
    retire(error.message);
  }
});
byId("previous-step").addEventListener("click", () => {
  if (trace && selected > 0) { selected -= 1; render(); status.textContent = "Showing state " + selected + " of " + trace.steps.length + "."; }
});
byId("next-step").addEventListener("click", () => {
  if (trace && selected < trace.steps.length) { selected += 1; render(); status.textContent = "Showing state " + selected + " of " + trace.steps.length + "."; }
});
byId("last-step").addEventListener("click", () => {
  if (trace) { selected = trace.steps.length; render(); status.textContent = "Showing the final state after " + selected + " operations."; }
});
byId("download-trace").addEventListener("click", () => {
  if (trace) download(serializeFenwickTrace(trace), "fenwick-trees-trace.json");
});
byId("download-course").addEventListener("click", () => download(COURSE_TEXT, "fenwick-trees.json"));

const presets = {
  "preset-signed": ["3, -1, 4, 0, 2, -2, 5, 1", "prefix 7\nadd 3 -2\nprefix 7\nrange 3 6\nprefix 0"],
  "preset-short": ["4, 1, -2, 3, 6", "prefix 5\nadd 5 2\nrange 1 5"],
  "preset-zero": ["0", "prefix 0\nadd 1 0\nrange 1 1"]
};
for (const [id, drafts] of Object.entries(presets)) {
  byId(id).addEventListener("click", () => {
    initialInput.value = drafts[0];
    operationsInput.value = drafts[1];
    retire("Example loaded. Build a trace to inspect it.");
  });
}
retire("Ready. Build the example or edit the draft first.");
