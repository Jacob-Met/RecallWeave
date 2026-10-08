// Original offline UI. The builder supplies canonical deck/guide strings and
// the analytical core in the same module; no dependencies or browser storage.
(() => {
  "use strict";
  const byId = id => document.getElementById(id);
  const keys = ["mass", "wallStiffness", "coupling", "x1", "x2", "v1", "v2", "duration"];
  const fields = Object.fromEntries(keys.map(key => [key, byId(key)]));
  const defaults = { mass: 1, wallStiffness: 16, coupling: 9, x1: 0.6, x2: 0, v1: 0, v2: 0, duration: 8 };
  const presets = {
    "in-phase": { ...defaults, x1: 0.5, x2: 0.5 },
    opposite: { ...defaults, x1: 0.5, x2: -0.5 },
    localized: { ...defaults },
    rest: { ...defaults, x1: 0, x2: 0 },
    uncoupled: { ...defaults, coupling: 0 }
  };
  const presetNames = {
    "in-phase": "In-phase preset", opposite: "Opposite preset",
    localized: "One-mass preset", rest: "Rest preset", uncoupled: "Uncoupled preset"
  };
  const status = byId("experiment-status");
  const inputError = byId("input-error");
  const timeError = byId("time-error");
  const slider = byId("time-scrubber");
  const exactTime = byId("time-input");
  const observationButton = byId("download-observation");
  const appliedBadge = byId("applied-badge");
  const palette = { teal: "#00786e", orange: "#ab421d", ink: "#183c38", muted: "#526762", line: "#cbd5cb" };
  const plot = { left: 48, right: 344, top: 22, bottom: 183 };
  let applied = null;
  let trajectory = [];
  let inspectionTime = 0;
  let dirty = false;
  let timeDraft = false;
  let ordinateBound = 1;

  function shown(value, digits = 8) {
    if (!Number.isFinite(value)) return "—";
    return value === 0 || Object.is(value, -0) ? "0" : Number(value.toPrecision(digits)).toString();
  }

  function numberCell(id, value) {
    const node = byId(id);
    node.textContent = shown(value);
    node.dataset.value = String(value);
    node.title = "Full numeric value: " + String(value);
  }

  function disableAppliedControls() {
    const blocked = !applied || dirty;
    document.querySelectorAll(".applied-only").forEach(node => { node.disabled = blocked; });
    observationButton.disabled = blocked || timeDraft;
    observationButton.setAttribute("aria-describedby", dirty ? "experiment-status" : timeDraft ? "time-error" : "downloads-title");
  }

  function clearFieldErrors() {
    keys.forEach(key => fields[key].removeAttribute("aria-invalid"));
    inputError.hidden = true;
    inputError.textContent = "";
  }

  function pendingInputs() {
    dirty = true;
    timeDraft = false;
    timeError.hidden = true;
    clearFieldErrors();
    appliedBadge.textContent = applied ? "Last applied view" : "No applied view";
    appliedBadge.classList.add("pending");
    status.className = "notice pending";
    status.textContent = applied
      ? "Unapplied inputs. Graphs and readings show the last applied experiment. Apply to update them; an observation download is available after a successful Apply."
      : "Unapplied inputs. Apply a valid experiment to show its motion.";
    document.querySelectorAll("[data-preset]").forEach(button => {
      button.classList.remove("active");
      button.setAttribute("aria-pressed", "false");
    });
    disableAppliedControls();
  }

  function appliedStatus(prefix = "Experiment applied.") {
    status.className = "notice";
    status.textContent = prefix + " Graphs, readings and observation use these applied values. Inspect any time in the selected window.";
    appliedBadge.textContent = "Applied";
    appliedBadge.classList.remove("pending");
    document.body.dataset.experimentState = "applied";
  }

  function spring(from, to, y) {
    const inset = Math.min(13, (to - from) / 6);
    const start = from + inset;
    const end = to - inset;
    let path = "M " + from + " " + y + " L " + start + " " + y;
    for (let index = 1; index < 12; index++) {
      const x = start + (end - start) * index / 12;
      path += " L " + x.toFixed(2) + " " + (y + (index % 2 ? -9 : 9));
    }
    return path + " L " + end + " " + y + " L " + to + " " + y;
  }

  function drawApparatus(state) {
    const scale = applied.amplitudeBound > 0 ? 49 / applied.amplitudeBound : 0;
    const center1 = 205 + state.x1 * scale;
    const center2 = 395 + state.x2 * scale;
    const couplingStroke = applied.parameters.coupling === 0 ? ' stroke-dasharray="4 6" opacity=".45"' : "";
    byId("apparatus-svg").innerHTML =
      '<title id="apparatus-title">Applied two-mass motion at ' + shown(state.t) + ' seconds</title>' +
      '<desc id="apparatus-description">Mass 1 displacement ' + shown(state.x1) + ' metres; mass 2 displacement ' + shown(state.x2) + ' metres. Scaled schematic, with dashed equilibrium guides.</desc>' +
      '<path d="M 35 28 V 123 M 565 28 V 123" stroke="' + palette.ink + '" stroke-width="7"/>' +
      '<path d="M 28 34 l -10 10 M 28 57 l -10 10 M 28 80 l -10 10 M 28 103 l -10 10 M 572 34 l 10 10 M 572 57 l 10 10 M 572 80 l 10 10 M 572 103 l 10 10" stroke="' + palette.muted + '" stroke-width="2"/>' +
      '<path d="M 205 28 V 124 M 395 28 V 124" stroke="' + palette.line + '" stroke-width="2" stroke-dasharray="4 5"/>' +
      '<path d="' + spring(38, center1 - 27, 76) + '" fill="none" stroke="' + palette.muted + '" stroke-width="2.5"/>' +
      '<path d="' + spring(center1 + 27, center2 - 27, 76) + '" fill="none" stroke="' + palette.orange + '" stroke-width="2.5"' + couplingStroke + '/>' +
      '<path d="' + spring(center2 + 27, 562, 76) + '" fill="none" stroke="' + palette.muted + '" stroke-width="2.5"/>' +
      '<rect x="' + (center1 - 27).toFixed(2) + '" y="49" width="54" height="54" rx="10" fill="' + palette.teal + '"/>' +
      '<rect x="' + (center2 - 27).toFixed(2) + '" y="49" width="54" height="54" rx="10" fill="#fff5e8" stroke="' + palette.orange + '" stroke-width="3"/>' +
      '<text x="' + center1.toFixed(2) + '" y="84" text-anchor="middle" font-family="system-ui,sans-serif" font-size="25" font-weight="700" fill="white">1</text>' +
      '<text x="' + center2.toFixed(2) + '" y="84" text-anchor="middle" font-family="system-ui,sans-serif" font-size="25" font-weight="700" fill="' + palette.orange + '">2</text>' +
      '<g text-anchor="middle" font-family="system-ui,sans-serif" font-size="22" fill="' + palette.muted + '"><text x="111" y="38">k</text><text x="300" y="38">' +
      (applied.parameters.coupling === 0 ? "c = 0" : "c") + '</text><text x="489" y="38">k</text></g>' +
      '<path d="M 262 142 H 335 l -8 -5 M 335 142 l -8 5" fill="none" stroke="' + palette.ink + '" stroke-width="2"/>' +
      '<text x="241" y="149" text-anchor="end" font-family="system-ui,sans-serif" font-size="21" fill="' + palette.muted + '">+x</text>';
  }

  function plotX(time, experiment = applied) {
    return plot.left + time / experiment.parameters.duration * (plot.right - plot.left);
  }

  function plotY(value, bound = ordinateBound) {
    return (plot.top + plot.bottom) / 2 - value / bound * (plot.bottom - plot.top) / 2;
  }

  function traceMarkup(experiment, samples, kind, bound) {
    const physical = kind === "physical";
    const names = physical ? ["x1", "x2"] : ["qPlus", "qMinus"];
    const labels = physical ? ["x₁, solid line", "x₂, dashed line"] : ["q₊, solid line", "q₋, dashed line"];
    let grid = "";
    for (const fraction of [-1, 0, 1]) {
      const value = fraction * bound;
      const y = plotY(value, bound);
      grid += '<line x1="' + plot.left + '" y1="' + y + '" x2="' + plot.right + '" y2="' + y + '" stroke="' + palette.line + '"' + (fraction === 0 ? "" : ' stroke-dasharray="3 4"') + '/>';
      grid += '<text x="' + (plot.left - 6) + '" y="' + (y + 5) + '" text-anchor="end" fill="' + palette.muted + '" font-size="12">' + shown(value, 3) + '</text>';
    }
    for (const fraction of [0, 0.5, 1]) {
      const time = experiment.parameters.duration * fraction;
      const x = plotX(time, experiment);
      grid += '<line x1="' + x + '" y1="' + plot.top + '" x2="' + x + '" y2="' + plot.bottom + '" stroke="' + palette.line + '" stroke-dasharray="3 4"/>';
      grid += '<text x="' + x + '" y="207" text-anchor="' + (fraction === 1 ? "end" : fraction === 0 ? "start" : "middle") + '" fill="' + palette.muted + '" font-size="14">' + shown(time, 4) + '</text>';
    }
    const lines = names.map((name, index) => {
      const path = samples.map((state, i) => (i ? "L" : "M") + plotX(state.t, experiment).toFixed(3) + " " + plotY(state[name], bound).toFixed(3)).join(" ");
      return '<path data-series="' + name + '" d="' + path + '" fill="none" stroke="' + (index ? palette.orange : palette.teal) + '" stroke-width="2.2"' + (index ? ' stroke-dasharray="6 4"' : "") + '><title>' + labels[index] + '</title></path>';
    }).join("");
    return '<title>' + (physical ? "Physical" : "Normal") + ' displacement over ' + experiment.parameters.duration + ' seconds</title>' +
      '<desc>Both plots share a displacement axis from ' + (-bound) + ' to ' + bound + ' metres and the same time axis. Solid: ' + labels[0] + '. Dashed: ' + labels[1] + '.</desc>' +
      '<g font-family="system-ui,sans-serif">' + grid + lines +
      '<line id="' + kind + '-cursor" x1="' + plot.left + '" x2="' + plot.left + '" y1="' + plot.top + '" y2="' + plot.bottom + '" stroke="' + palette.ink + '" stroke-width="1.3" stroke-dasharray="2 3"/>' +
      '<circle id="' + kind + '-point-0" r="3.5" cx="' + plot.left + '" cy="' + plotY(samples[0][names[0]], bound) + '" fill="' + palette.teal + '" stroke="white" stroke-width="1.2"/>' +
      '<rect id="' + kind + '-point-1" width="7" height="7" x="' + (plot.left - 3.5) + '" y="' + (plotY(samples[0][names[1]], bound) - 3.5) + '" fill="white" stroke="' + palette.orange + '" stroke-width="1.6"/></g>';
  }

  function renderInstant(time) {
    const state = stateAt(applied, time);
    inspectionTime = time;
    timeDraft = false;
    slider.value = String(time);
    exactTime.value = String(time);
    byId("time-value").textContent = shown(time);
    byId("time-value").dataset.value = String(time);
    timeError.hidden = true;
    numberCell("state-time", state.t);
    ["x1", "x2", "v1", "v2", "a1", "a2", "force1", "force2", "qPlus", "qMinus", "uPlus", "uMinus"].forEach(key => numberCell("state-" + key, state[key]));
    ["kinetic", "wallPotential", "couplingPotential", "plus", "minus", "total", "drift"].forEach(key => numberCell("energy-" + key, state.energies[key]));
    const total = applied.energy.total;
    [["bar-kinetic", "kinetic"], ["bar-wall", "wallPotential"], ["bar-coupling", "couplingPotential"]].forEach(([id, key]) => {
      const fraction = total > 0 ? Math.max(0, Math.min(1, state.energies[key] / total)) : 0;
      byId(id).style.width = String(fraction * 100) + "%";
    });
    for (const [kind, names] of [["physical", ["x1", "x2"]], ["modal", ["qPlus", "qMinus"]]]) {
      const x = plotX(time);
      byId(kind + "-cursor").setAttribute("x1", String(x));
      byId(kind + "-cursor").setAttribute("x2", String(x));
      byId(kind + "-point-0").setAttribute("cx", String(x));
      byId(kind + "-point-0").setAttribute("cy", String(plotY(state[names[0]])));
      byId(kind + "-point-1").setAttribute("x", String(x - 3.5));
      byId(kind + "-point-1").setAttribute("y", String(plotY(state[names[1]]) - 3.5));
    }
    drawApparatus(state);
    disableAppliedControls();
  }

  function applyExperiment(presetName = null) {
    clearFieldErrors();
    const raw = Object.fromEntries(keys.map(key => [key, fields[key].value]));
    let candidate, samples, bound, physicalMarkup, modalMarkup;
    try {
      candidate = makeExperiment(raw);
      samples = sampleTrajectory(candidate);
      bound = candidate.amplitudeBound > 0 ? candidate.amplitudeBound * 1.08 : 1;
      physicalMarkup = traceMarkup(candidate, samples, "physical", bound);
      modalMarkup = traceMarkup(candidate, samples, "modal", bound);
    } catch (error) {
      dirty = true;
      timeDraft = false;
      document.body.dataset.experimentState = "invalid";
      appliedBadge.textContent = applied ? "Last applied view" : "No applied view";
      appliedBadge.classList.add("pending");
      status.className = "notice pending";
      status.textContent = applied
        ? "Inputs were not applied. Graphs and readings still show the last applied experiment. Correct the inputs and Apply; its observation download is disabled until then."
        : "No experiment has been applied. Correct the inputs and Apply.";
      inputError.textContent = error instanceof Error ? error.message : "Check every parameter before applying.";
      inputError.hidden = false;
      const invalid = keys.find(key => !fields[key].validity.valid || fields[key].value.trim() === "");
      if (invalid) fields[invalid].setAttribute("aria-invalid", "true");
      inputError.focus();
      disableAppliedControls();
      return false;
    }
    applied = candidate;
    trajectory = samples;
    ordinateBound = bound;
    dirty = false;
    timeDraft = false;
    timeError.hidden = true;
    exactTime.removeAttribute("aria-invalid");
    slider.max = String(applied.parameters.duration);
    exactTime.max = String(applied.parameters.duration);
    byId("time-end").textContent = shown(applied.parameters.duration) + " s";
    byId("physical-trace-svg").innerHTML = physicalMarkup;
    byId("modal-trace-svg").innerHTML = modalMarkup;
    numberCell("omega-plus", applied.omega.plus);
    numberCell("omega-minus", applied.omega.minus);
    byId("degeneracy-note").hidden = !applied.degenerate;
    const p = applied.parameters;
    byId("applied-parameters").textContent =
      "APPLIED  m = " + shown(p.mass) + " kg · k = " + shown(p.wallStiffness) + " N/m · c = " + shown(p.coupling) +
      " N/m · x(0) = [" + shown(p.x1) + ", " + shown(p.x2) + "] m · v(0) = [" +
      shown(p.v1) + ", " + shown(p.v2) + "] m/s · window " + shown(p.duration) + " s";
    byId("sampling-note").textContent =
      "Both plots use the same axes and " + trajectory.length.toLocaleString("en-US") +
      " analytical samples, including both endpoints; at least 48 intervals per fastest modal period. Readings evaluate the selected time directly.";
    document.querySelectorAll("[data-preset]").forEach(button => {
      const active = button.dataset.preset === presetName;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    renderInstant(0);
    appliedStatus(presetName ? presetNames[presetName] + " applied." : "Experiment applied.");
    return true;
  }

  function setExactTime() {
    if (!applied || dirty) return;
    const text = exactTime.value.trim();
    const validDecimal = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text);
    const value = Number(text);
    const underflow = value === 0 && /[1-9]/.test(text.split(/e/i)[0]);
    if (!validDecimal || !Number.isFinite(value) || underflow || value < 0 || value > applied.parameters.duration) {
      timeDraft = true;
      timeError.className = "notice error";
      timeError.textContent = "Enter one finite time from 0 to " + shown(applied.parameters.duration) +
        " seconds, then Set time. The readings remain at " + shown(inspectionTime) + " seconds.";
      timeError.hidden = false;
      exactTime.setAttribute("aria-invalid", "true");
      disableAppliedControls();
      return;
    }
    exactTime.removeAttribute("aria-invalid");
    renderInstant(value === 0 ? 0 : value);
    appliedStatus("Inspection time set.");
  }

  function download(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    byId("download-status").textContent = filename + " prepared for download.";
  }

  byId("normal-modes-form").addEventListener("input", () => {
    document.body.dataset.experimentState = "pending";
    pendingInputs();
  });
  byId("normal-modes-form").addEventListener("submit", event => {
    event.preventDefault();
    applyExperiment();
  });
  document.querySelectorAll("[data-preset]").forEach(button => {
    button.addEventListener("click", () => {
      const name = button.dataset.preset;
      keys.forEach(key => { fields[key].value = String(presets[name][key]); });
      applyExperiment(name);
    });
  });
  slider.addEventListener("input", () => {
    if (!applied || dirty) return;
    const value = Number(slider.value);
    if (!Number.isFinite(value) || value < 0 || value > applied.parameters.duration) return;
    exactTime.removeAttribute("aria-invalid");
    renderInstant(value);
    appliedStatus("Inspection time updated.");
  });
  exactTime.addEventListener("input", () => {
    if (!applied || dirty) return;
    timeDraft = true;
    exactTime.removeAttribute("aria-invalid");
    timeError.className = "notice pending";
    timeError.textContent = "Time entry is pending. Set time to update the inspected state, or use the time slider.";
    timeError.hidden = false;
    disableAppliedControls();
  });
  exactTime.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      setExactTime();
    }
  });
  byId("set-time").addEventListener("click", setExactTime);
  byId("download-course").addEventListener("click", () => download(normalModesDeckText, "normal-modes.json", "application/json;charset=utf-8"));
  byId("download-guide").addEventListener("click", () => download(normalModesGuideText, "normal-modes.md", "text/markdown;charset=utf-8"));
  observationButton.addEventListener("click", () => {
    if (!applied || dirty || timeDraft) return;
    const observation = makeObservation(applied, inspectionTime);
    download(JSON.stringify(observation, null, 2) + "\n", "normal-modes-observation.json", "application/json;charset=utf-8");
  });
  applyExperiment("localized");
})();
