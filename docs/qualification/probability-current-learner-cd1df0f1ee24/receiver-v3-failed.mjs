#!/usr/bin/env node
/**
 * Independent current Probability learner receiving, estate-cd1df0f1ee24.
 * Runtime plumbing follows existing RecallWeave Node22/CDP browser drivers.
 * Ten expectations live in the separate frozen contract. No product/model imports.
 * Default Chrome sandbox; existing installed Chrome only; no dependency installation.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { createServer } from "node:http";
import { readFile, writeFile, mkdir, mkdtemp, readdir, lstat, statfs, rename, rm } from "node:fs/promises";
import { dirname, extname, join, resolve, relative, sep } from "node:path";
import { freemem } from "node:os";
import { fileURLToPath } from "node:url";

const sleep = ms => new Promise(done => setTimeout(done, ms));
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
const gitBlob = bytes => createHash("sha1").update(Buffer.from("blob " + bytes.length + "\0")).update(bytes).digest("hex");
const same = value => JSON.parse(JSON.stringify(value));
const MAX_ARTIFACT_BYTES = 5 * 1024 * 1024;
function argumentsOf(args) {
  const result = { browser: "google-chrome" }, used = new Set();
  while (args.length) {
    const flag = args.shift();
    if (flag === "--emit-bundle" && !used.has(flag)) { used.add(flag); result.emitBundle = true; continue; }
    const key = { "--root": "root", "--browser": "browser", "--output": "output", "--contract": "contract" }[flag];
    assert.ok(key && !used.has(flag) && args[0], "Use --root DIR --browser FILE --output NEW_DIR --contract FILE [--emit-bundle]");
    used.add(flag); result[key] = args.shift();
  }
  for (const key of ["root", "output", "contract"]) { assert.ok(result[key], key + " is required"); result[key] = resolve(result[key]); }
  return result;
}
async function bundle(output) {
  const paths = [];
  async function visit(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const file = join(dir, entry.name);
      if (entry.isDirectory()) await visit(file);
      else { assert.ok(entry.isFile()); paths.push(file); }
    }
  }
  await visit(output);
  const files = []; let total = 0;
  for (const file of paths.sort()) {
    const bytes = await readFile(file); total += bytes.length;
    assert.ok(total <= MAX_ARTIFACT_BYTES, "Full evidence exceeds bundle limit");
    files.push({ path: relative(output, file).split(sep).join("/"), bytes: bytes.length, sha256: sha256(bytes), base64: bytes.toString("base64") });
  }
  const body = Buffer.from(JSON.stringify({ format: "probability-current-learner-bundle/1", files }));
  assert.ok(body.length <= 8 * 1024 * 1024, "Encoded evidence exceeds bound");
  const encoded = body.toString("base64"), count = Math.ceil(encoded.length / 4096);
  console.log("PROBABILITY_CURRENT_LEARNER_BUNDLE_BEGIN " + JSON.stringify({ bytes: body.length, sha256: sha256(body), chunks: count, fileBytes: total }));
  for (let index = 0; index < count; index++) console.log("PROBABILITY_CURRENT_LEARNER_BUNDLE_CHUNK " + index + " " + encoded.slice(index * 4096, (index + 1) * 4096));
  console.log("PROBABILITY_CURRENT_LEARNER_BUNDLE_END");
}
async function main(settings) {
  const contractBytes = await readFile(settings.contract), plan = JSON.parse(contractBytes);
  assert.equal(sha256(contractBytes), "52596618d41a7222379cbb5b8ae927e9d194863bdda87fd9b0faaff08c3925bd", "Exact frozen expectations");
  assert.equal(plan.groups.length, 10);
  try { await lstat(settings.output); throw new Error("Refusing existing evidence directory"); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  await mkdir(settings.output, { recursive: true });
  await mkdir(join(settings.output, "downloads"));
  const self = fileURLToPath(import.meta.url), selfBytes = await readFile(self);
  const report = {
    format: "probability-current-learner-receiving/1", started: new Date().toISOString(),
    sourceParent: plan.parent, settings, node: process.version, platform: process.platform,
    qualification: "Current learner and course handoff only; no lab arithmetic/layout or prior native result is repeated or relabeled.",
    runtimeBoundary: "Existing Chrome, default sandbox, own fresh profile and loopback CDP. Real file-input selection through intercepted Chrome chooser; no OS-native picker or assistive-technology claim.",
    tieBoundary: "Actual Intl locale override is recorded separately from controlled reversal of pf-ID comparisons. Controlled reversal is not natural Swedish ordering.",
    groups: plan.groups.map(x => ({ id: x.id, expect: x.expect, status: "pending" })),
    sources: [], downloads: [], captures: [], feedback: [], requests: [], unexpectedRequests: [], pageErrors: [], harnessErrors: [], controls: [],
    contract: { path: settings.contract, bytes: contractBytes.length, sha256: sha256(contractBytes), git: gitBlob(contractBytes) },
    receiver: { path: self, bytes: selfBytes.length, sha256: sha256(selfBytes), git: gitBlob(selfBytes) },
  };
  const sources = new Map(), pending = new Map(), downloads = new Map(), chooserEvents = [];
  let server, browser, socket, sessionId, profile, origin, sequence = 0, bytesWritten = 0, closing = false, browserClosed = true, browserExitPromise = Promise.resolve(), tieScript;
  let browserLog = "", browserSpawnError, totalTimer;
  let courseDownload, course, firstQuestion, questionSave, firstFeedback, feedbackSave, reviewBefore, notesBefore, traceBefore;
  const firstAnswers = [];
  async function artifact(name, bytes) {
    if (typeof bytes === "string") bytes = Buffer.from(bytes);
    bytesWritten += bytes.length; assert.ok(bytesWritten <= MAX_ARTIFACT_BYTES);
    const file = join(settings.output, name); await mkdir(dirname(file), { recursive: true }); await writeFile(file, bytes, { flag: "wx" });
    return { path: name, bytes: bytes.length, sha256: sha256(bytes) };
  }
  async function receipt(partial = true) {
    await writeFile(join(settings.output, partial ? "receiving.partial.json" : "receiving.json"), JSON.stringify(report, null, 2) + "\n");
  }
  async function group(id, fn) {
    const row = report.groups.find(x => x.id === id); assert.ok(row && row.status === "pending");
    row.status = "running"; row.started = new Date().toISOString(); const start = Date.now();
    try { row.evidence = await fn(); row.status = "passed"; console.log("PASS " + id); }
    catch (error) { row.status = "failed"; row.error = error.stack ?? String(error); console.log("FAIL " + id + ": " + error.message); throw error; }
    finally { row.durationMs = Date.now() - start; await receipt(); }
  }
  async function waitFor(check, label, timeout = 10000) {
    const deadline = Date.now() + timeout; let last;
    while (Date.now() < deadline) {
      try { const value = await check(); if (value) return value; } catch (error) { last = error; }
      await sleep(50);
    }
    throw new Error("Timed out: " + label + (last ? " (" + last.message + ")" : ""));
  }
  function command(method, params = {}, scoped = true) {
    return new Promise((done, reject) => {
      if (!socket || socket.readyState !== WebSocket.OPEN) { reject(new Error("CDP unavailable: " + method)); return; }
      const id = ++sequence, timer = setTimeout(() => { pending.delete(id); reject(new Error("CDP timeout: " + method)); }, 10000);
      pending.set(id, { done, reject, timer });
      socket.send(JSON.stringify({ id, method, params, ...(scoped && sessionId ? { sessionId } : {}) }));
    });
  }
  async function inPage(fn, ...args) {
    const result = await command("Runtime.evaluate", { expression: "(" + fn.toString() + ")(" + args.map(x => JSON.stringify(x)).join(",") + ")", returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    return result.result.value;
  }
  async function click(selector) {
    const point = await inPage(selector => {
      const n = document.querySelector(selector); if (!n || n.disabled) return null;
      n.scrollIntoView({ block: "center" }); const r = n.getBoundingClientRect();
      return r.width > 0 && r.height > 0 ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
    }, selector);
    assert.ok(point, "Visible enabled control: " + selector);
    await command("Input.dispatchMouseEvent", { type: "mouseMoved", ...point });
    await command("Input.dispatchMouseEvent", { type: "mousePressed", ...point, button: "left", clickCount: 1 });
    await command("Input.dispatchMouseEvent", { type: "mouseReleased", ...point, button: "left", clickCount: 1 });
  }
  async function chooseFile(selector, file) {
    const count = chooserEvents.length;
    await click(selector);
    const event = await waitFor(() => chooserEvents[count], "actual file chooser");
    assert.ok(event.backendNodeId);
    await command("DOM.setFileInputFiles", { backendNodeId: event.backendNodeId, files: [file] });
  }
  async function download(selector, label) {
    const known = new Set(downloads.keys()); await click(selector);
    const event = await waitFor(() => {
      const fresh = [...downloads.values()].filter(x => !known.has(x.guid));
      assert.ok(fresh.length <= 1, "Single explicit download");
      if (fresh[0]?.state === "canceled") throw new Error("Browser download canceled");
      return fresh[0]?.state === "completed" ? fresh[0] : null;
    }, "actual download " + label);
    const old = join(settings.output, "downloads", event.guid), bytes = await readFile(old);
    const file = join(settings.output, "downloads", label);
    await rename(old, file); bytesWritten += bytes.length; assert.ok(bytesWritten <= MAX_ARTIFACT_BYTES);
    const entry = { label, path: "downloads/" + label, suggestedFilename: event.suggestedFilename, guid: event.guid, bytes: bytes.length, sha256: sha256(bytes), git: gitBlob(bytes) };
    report.downloads.push(entry);
    return { ...entry, file, bytesBuffer: bytes, text: bytes.toString("utf8") };
  }
  const publicDownload = d => Object.fromEntries(Object.entries(d).filter(([k]) => !["bytesBuffer", "text", "file"].includes(k)));
  async function newDocument(url, locale) {
    await command("Emulation.setLocaleOverride", { locale });
    await command("Emulation.setDeviceMetricsOverride", { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false });
    const navigation = await command("Page.navigate", { url }); assert.ok(!navigation.errorText && navigation.loaderId);
    await waitFor(async () => {
      const frame = await command("Page.getFrameTree");
      return frame.frameTree.frame.loaderId === navigation.loaderId && inPage(url => location.href === url && document.readyState === "complete", url);
    }, "fresh document");
    const observed = await inPage(() => ({ intl: Intl.NumberFormat().resolvedOptions().locale, navigator: navigator.language }));
    assert.equal(observed.intl.toLowerCase(), locale.toLowerCase(), "Requested actual Intl locale");
    report.controls.push({ type: "actual-locale", requested: locale, observed });
  }
  async function session() {
    return inPage(() => ({
      html: document.querySelector("#session-content").innerHTML,
      progress: document.querySelector("#step-count").textContent,
      label: document.querySelector("#step-label").textContent,
      title: document.title,
      mastery: [...document.querySelectorAll(".mastery-box output")].map(n => n.textContent),
    }));
  }
  async function pickerPreview() {
    await chooseFile("#deck-file", courseDownload.file);
    await waitFor(() => inPage(() => !!document.querySelector("#start-deck")), "course preview");
    const p = await inPage(() => ({ title: document.querySelector("#deck-preview-title").textContent, count: document.querySelector(".deck-preview-count").textContent, prompts: [...document.querySelectorAll("#deck-preview ol strong")].map(n => n.textContent) }));
    assert.equal(p.title, course.title); assert.match(p.count, /12 questions · 4 concepts/); assert.deepEqual(p.prompts, course.items.map(x => x.prompt));
    return p;
  }
  async function startCourse() { await pickerPreview(); await click("#start-deck"); await waitFor(() => inPage(() => !!document.querySelector("[data-choice]")), "explicit course start"); }
  async function question(practice = false) {
    const attr = practice ? "data-practice-choice" : "data-choice";
    const value = await inPage(attr => ({
      prompt: document.querySelector(".question-card h2")?.textContent,
      choices: [...document.querySelectorAll("[" + attr + "]")].map(n => ({ index: Number(n.getAttribute(attr)), text: n.textContent.slice(n.querySelector(".choice-key").textContent.length), disabled: n.disabled })),
      mastery: [...document.querySelectorAll(".mastery-box output")].map(n => n.textContent),
      progress: document.querySelector("#step-count").textContent,
    }), attr);
    const item = course.items.find(x => x.prompt === value.prompt); assert.ok(item, "Question belongs to exact course");
    assert.deepEqual(value.choices.map(x => x.index).sort((a, b) => a - b), item.options.map((_, i) => i));
    for (const row of value.choices) assert.equal(row.text, item.options[row.index]);
    return { itemId: item.id, ...value };
  }
  async function feedback(itemId, choice, count) {
    const item = course.items.find(x => x.id === itemId);
    const state = await inPage(() => {
      const f = document.querySelector("#feedback-slot .feedback");
      return {
        paragraphs: [...f.querySelectorAll("p")].map(n => ({ text: n.textContent, visible: n.getClientRects().length > 0 && getComputedStyle(n).visibility !== "hidden", elementTags: [...n.children].map(x => x.tagName) })),
        progress: document.querySelector("#step-count").textContent,
        disabled: [...document.querySelectorAll("[data-choice]")].every(n => n.disabled),
        markup: f.querySelectorAll("img,script,iframe,em,b,a,[onerror]").length,
        mastery: [...document.querySelectorAll(".mastery-box output")].map(n => n.textContent),
      };
    });
    assert.deepEqual(state.paragraphs.map(x => x.text), ["Your answer: " + item.options[choice], "Correct answer: " + item.options[item.answer]]);
    assert.ok(state.paragraphs.every(x => x.visible && JSON.stringify(x.elementTags) === '["STRONG"]'));
    assert.equal(state.markup, 0); assert.equal(state.disabled, true); assert.equal(state.progress, count + " / 12");
    report.feedback.push({ item: itemId, choice, correct: choice === item.answer, ...state }); return state;
  }
  async function answerCurrent(q, count) {
    assert.ok(!firstAnswers.some(x => x.item === q.itemId));
    const item = course.items.find(x => x.id === q.itemId), choice = plan.firstChoices[q.itemId];
    assert.ok(Number.isInteger(choice));
    assert.equal(choice !== item.answer, Object.hasOwn(plan.practiceChoices, q.itemId));
    await click('[data-choice="' + choice + '"]'); await waitFor(() => inPage(() => !!document.querySelector("#next-button")), "answer feedback");
    const f = await feedback(q.itemId, choice, count); firstAnswers.push({ item: q.itemId, choice, correct: choice === item.answer }); return f;
  }
  async function openLessonPanel() {
    if (!(await inPage(() => document.querySelector("#lesson-archive-panel").open))) await click("#lesson-archive-panel > summary");
  }
  async function saveLesson(label, expectedItems = course.items) {
    await openLessonPanel(); const d = await download("#save-lesson-button", label);
    const doc = JSON.parse(d.text); assert.equal(doc.format, "recallweave.unfinished-lesson");
    const items = expectedItems ?? doc.deck.items;
    assert.equal(doc.presentation.optionOrders && Object.keys(doc.presentation.optionOrders).length, items.length);
    for (const item of items) assert.deepEqual([...doc.presentation.optionOrders[item.id]].sort((a, b) => a - b), item.options.map((_, i) => i));
    return { download: d, doc };
  }
  async function saveTrace(label) {
    if (!(await inPage(() => document.querySelector("#trace-archive-panel").open))) await click("#trace-archive-panel > summary");
    const d = await download("#save-trace-button", label), doc = JSON.parse(d.text);
    assert.equal(doc.format, "recallweave.learning-trace");
    assert.deepEqual(doc.firstAnswers, firstAnswers.map(({ item, choice }) => ({ item, choice })));
    assert.deepEqual(Object.keys(doc.mastery).sort(), [...course.concepts].sort());
    assert.ok(Object.values(doc.mastery).every(x => typeof x === "number" && Number.isFinite(x)));
    return { download: d, doc };
  }
  async function previewLesson(file) {
    await openLessonPanel(); const before = await session(); await chooseFile("#lesson-file", file);
    await waitFor(() => inPage(() => !document.querySelector("#lesson-preview").hidden), "lesson preview");
    assert.deepEqual(await session(), before, "Lesson preview is read-only");
    return inPage(() => document.querySelector("#lesson-preview-summary").textContent);
  }
  function sansDate(doc) { const copy = same(doc); delete copy.savedAt; return copy; }
  async function capture(name) {
    await inPage(() => document.querySelector("#session-content").scrollIntoView({ block: "start" }));
    const { data } = await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    const row = await artifact(name, Buffer.from(data, "base64")); report.captures.push({ ...row, visuallyInspected: false }); return row;
  }
  async function reviewState() {
    return inPage(() => ({
      summary: document.querySelector("#first-try-summary").textContent,
      model: document.querySelector(".mastery-box").textContent,
      estimates: [...document.querySelectorAll(".mastery-row")].map(n => ({ concept: n.querySelector("span").textContent, value: n.querySelector("output").textContent })),
      rows: [...document.querySelectorAll(".review-item")].map(n => ({
        id: n.querySelector("[data-reflection-item]").dataset.reflectionItem,
        prompt: n.querySelector(".review-prompt").textContent,
        first: n.querySelectorAll(".review-answers dd")[0].textContent,
        correct: n.querySelectorAll(".review-answers dd")[1].textContent,
        reflection: n.querySelector("textarea").value,
        practice: n.querySelector(".review-practice-answer")?.textContent ?? null,
      })),
      application: document.querySelector("#application-reflection").value,
    }));
  }
  function checkReview(state) {
    assert.match(state.summary, /10 of 12 connections/); assert.equal(state.rows.length, 12);
    assert.equal(new Set(state.rows.map(x => x.id)).size, 12);
    for (const row of state.rows) {
      const item = course.items.find(x => x.id === row.id); assert.ok(item);
      assert.equal(row.prompt, item.prompt); assert.equal(row.first, item.options[plan.firstChoices[item.id]]); assert.equal(row.correct, item.options[item.answer]);
    }
  }
  async function writeText(selector, text) {
    await inPage(selector => {
      const n = document.querySelector(selector), details = n.closest("details");
      if (details) details.open = true;
    }, selector);
    await click(selector);
    await command("Input.insertText", { text });
    assert.equal(await inPage(selector => document.querySelector(selector).value, selector), text, "Literal text input");
  }
  function checkNotes(text, state, practiced) {
    assert.ok(text.startsWith("RecallWeave — study notes\n" + course.title + "\nSaved: "));
    assert.ok(text.includes("10 of 12 connections correct on the first try."));
    for (const row of state.estimates) assert.ok(text.includes(row.concept + ": " + row.value));
    for (const item of course.items) {
      const blockStart = text.indexOf(". " + item.prompt + "\nConcept: ");
      assert.ok(blockStart >= 0, "Notes include " + item.id);
      const next = text.indexOf("\n\n", blockStart), block = text.slice(blockStart, next < 0 ? undefined : next);
      for (const line of ["Your first answer: " + item.options[plan.firstChoices[item.id]], "Correct answer: " + item.options[item.answer], "Explanation: " + item.explanation, "Apply the idea: " + item.transfer]) assert.ok(block.includes(line), item.id + ": " + line);
      if (Object.hasOwn(plan.practiceChoices, item.id)) assert.ok(block.includes(practiced ? "Practice answer: " + item.options[plan.practiceChoices[item.id]] : "Practice answer: not recorded."));
    }
    for (const textValue of [plan.reflection, plan.applicationReflection]) for (const line of textValue.split("\n")) assert.ok(text.includes("  > " + line));
    assert.ok(text.includes(practiced ? "Complete: 2 of 2 practice answers recorded; 2 correct on retry." : "Not started. 2 missed connections are available for practice."));
  }
  try {
    for (const directory of [settings.root, dirname(settings.output)]) {
      const info = await statfs(directory, { bigint: true }); assert.ok(info.bavail * info.bsize >= 1024n ** 3n, "At least1GiB receiving headroom");
    }
    assert.ok(freemem() >= 512 * 1024 * 1024, "At least512MiB free memory");
    const expected = { ...plan.pins, [plan.lab.path]: plan.lab };
    for (const [name, pin] of Object.entries(expected)) {
      const bytes = await readFile(join(settings.root, name));
      assert.equal(bytes.length, pin.bytes, "Source bytes " + name); assert.equal(gitBlob(bytes), pin.git, "Source Git " + name);
      if (pin.sha256) assert.equal(sha256(bytes), pin.sha256);
      sources.set("/" + name, bytes); report.sources.push({ path: name, bytes: bytes.length, git: gitBlob(bytes), sha256: sha256(bytes) });
    }
    course = JSON.parse(sources.get("/" + plan.course.path).toString("utf8"));
    assert.equal(course.items.length, 12); assert.equal(course.concepts.length, 4);
    assert.deepEqual(Object.keys(plan.firstChoices).sort(), course.items.map(x => x.id).sort());
    try { report.checkout = (await promisify(execFile)("git", ["-C", settings.root, "rev-parse", "HEAD"], { timeout: 5000 })).stdout.trim(); }
    catch { report.checkout = null; }
    report.hostedContext = { event: process.env.GITHUB_EVENT_NAME ?? null, workflowSha: process.env.GITHUB_SHA ?? null, runId: process.env.GITHUB_RUN_ID ?? null };
    server = createServer((request, response) => {
      const url = new URL(request.url, "http://127.0.0.1");
      if (request.method === "GET" && url.pathname === "/favicon.ico") { response.writeHead(204).end(); return; }
      if (request.method !== "GET" || url.search || !sources.has(url.pathname)) { response.writeHead(404).end(); return; }
      response.writeHead(200, { "Content-Type": ({ ".html": "text/html", ".json": "application/json", ".mjs": "text/javascript", ".css": "text/css" }[extname(url.pathname)] || "text/plain") + "; charset=utf-8", "Cache-Control": "no-store" });
      response.end(sources.get(url.pathname));
    });
    await new Promise((done, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", done); });
    origin = "http://127.0.0.1:" + server.address().port;
    profile = await mkdtemp(join(dirname(settings.output), "probability-current-learner-chrome-"));
    const args = ["--headless=new", "--disable-gpu", "--disable-background-networking", "--disable-component-update", "--disable-sync", "--no-first-run", "--no-default-browser-check", "--disk-cache-size=8388608", "--media-cache-size=8388608", "--remote-debugging-address=127.0.0.1", "--remote-debugging-port=0", "--user-data-dir=" + profile, "about:blank"];
    report.browserCommand = { executable: settings.browser, args, sandboxDisabled: false };
    browser = spawn(settings.browser, args, { stdio: ["ignore", "ignore", "pipe"] }); browserClosed = false;
    browserExitPromise = new Promise(done => browser.once("close", (code, signal) => { browserClosed = true; report.browserExit = { code, signal }; done(); }));
    browser.on("error", error => { browserSpawnError = error; });
    browser.stderr.on("data", b => { browserLog += b.toString(); if (browserLog.length > 512 * 1024) browser.kill("SIGTERM"); });
    totalTimer = setTimeout(() => { report.totalTimeout = true; browser.kill("SIGTERM"); }, 240000);
    const endpoint = await waitFor(async () => {
      if (browserSpawnError) throw browserSpawnError;
      if (browserClosed) throw new Error("Chrome exited before CDP: " + browserLog.slice(-4000));
      const [port, p] = (await readFile(join(profile, "DevToolsActivePort"), "utf8")).trim().split("\n");
      return port && p ? "ws://127.0.0.1:" + port + p : null;
    }, "Chrome startup", 45000);
    socket = new WebSocket(endpoint);
    socket.addEventListener("message", event => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const task = pending.get(message.id); if (!task) return; pending.delete(message.id); clearTimeout(task.timer);
        if (message.error) task.reject(new Error(message.error.message)); else task.done(message.result);
      } else if (message.method === "Runtime.exceptionThrown") report.pageErrors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
      else if (message.method === "Page.fileChooserOpened") chooserEvents.push(message.params);
      else if (message.method === "Network.requestWillBeSent") report.requests.push(message.params.request.url);
      else if (message.method.startsWith("Browser.download")) downloads.set(message.params.guid, { ...downloads.get(message.params.guid), ...message.params });
      else if (message.method === "Fetch.requestPaused") {
        const url = new URL(message.params.request.url);
        const allowed = message.params.request.method === "GET" && url.origin === origin && !url.search && (sources.has(url.pathname) || url.pathname === "/favicon.ico");
        if (!allowed) report.unexpectedRequests.push(message.params.request.url);
        command(allowed ? "Fetch.continueRequest" : "Fetch.failRequest", { requestId: message.params.requestId, ...(!allowed ? { errorReason: "BlockedByClient" } : {}) }).catch(error => { if (!closing) report.harnessErrors.push(String(error)); });
      }
    });
    await new Promise((done, reject) => {
      const timer = setTimeout(() => reject(new Error("CDP socket timeout")), 10000);
      socket.addEventListener("open", () => { clearTimeout(timer); done(); }, { once: true });
      socket.addEventListener("error", error => { clearTimeout(timer); reject(error); }, { once: true });
    });
    report.browser = await command("Browser.getVersion", {}, false);
    await command("Browser.setDownloadBehavior", { behavior: "allowAndName", downloadPath: join(settings.output, "downloads"), eventsEnabled: true }, false);
    const { targetId } = await command("Target.createTarget", { url: "about:blank" }, false);
    ({ sessionId } = await command("Target.attachToTarget", { targetId, flatten: true }, false));
    for (const method of ["Page.enable", "Runtime.enable", "Network.enable"]) await command(method);
    await command("Page.setInterceptFileChooserDialog", { enabled: true });
    await command("Network.setCacheDisabled", { cacheDisabled: true });
    await command("Fetch.enable", { patterns: [{ urlPattern: "http://*", requestStage: "Request" }, { urlPattern: "https://*", requestStage: "Request" }] });

    await group("actual-course-download", async () => {
      await newDocument(origin + "/" + plan.lab.path, "en-US");
      await waitFor(() => inPage(() => !!document.querySelector("#download-course")), "lab course button");
      courseDownload = await download("#download-course", "probability-foundations.json");
      assert.equal(courseDownload.bytes, plan.course.bytes); assert.equal(courseDownload.sha256, plan.course.sha256); assert.equal(courseDownload.git, plan.course.git);
      assert.deepEqual(courseDownload.bytesBuffer, sources.get("/" + plan.course.path));
      return publicDownload(courseDownload);
    });
    await group("picker-preview-cancel", async () => {
      await newDocument(origin + "/demo.html", "en-US");
      await waitFor(() => inPage(() => !!document.querySelector("#start-button") && !!document.querySelector("#deck-file")), "current learner");
      await click("#start-button"); await waitFor(() => inPage(() => !!document.querySelector("[data-choice]")), "bundled question");
      await click("[data-choice]"); await waitFor(() => inPage(() => !!document.querySelector("#next-button")), "nonempty bundled session");
      const rawBefore = await saveLesson("bundled-before-cancel.json", null);
      const before = await session(), preview = await pickerPreview();
      assert.deepEqual(await session(), before); await click("#cancel-deck");
      assert.deepEqual(await session(), before); assert.equal(await inPage(() => document.querySelector("#deck-preview").hidden), true);
      const rawAfter = await saveLesson("bundled-after-cancel.json", null);
      assert.deepEqual(sansDate(rawAfter.doc), sansDate(rawBefore.doc), "Raw lesson/model state preserved across preview/cancel");
      return { before, preview, rawBefore: publicDownload(rawBefore.download), rawAfter: publicDownload(rawAfter.download) };
    });
    await group("explicit-start-question-save", async () => {
      await startCourse(); firstQuestion = await question(); assert.equal(firstQuestion.progress, "0 / 12");
      questionSave = await saveLesson("question-original.json");
      assert.equal(questionSave.doc.presentation.phase, "question"); assert.equal(questionSave.doc.presentation.itemId, firstQuestion.itemId); assert.deepEqual(questionSave.doc.firstAnswers, []);
      assert.deepEqual(questionSave.doc.presentation.optionOrders[firstQuestion.itemId], firstQuestion.choices.map(x => x.index));
      return { question: firstQuestion, archive: publicDownload(questionSave.download) };
    });
    await group("first-feedback-save", async () => {
      firstFeedback = await answerCurrent(firstQuestion, 1);
      feedbackSave = await saveLesson("feedback-original.json");
      assert.equal(feedbackSave.doc.presentation.phase, "feedback"); assert.equal(feedbackSave.doc.presentation.itemId, firstQuestion.itemId);
      assert.deepEqual(feedbackSave.doc.firstAnswers, [{ item: firstQuestion.itemId, choice: plan.firstChoices[firstQuestion.itemId] }]);
      assert.deepEqual(feedbackSave.doc.presentation.optionOrders, questionSave.doc.presentation.optionOrders);
      return { feedback: firstFeedback, archive: publicDownload(feedbackSave.download) };
    });
    await group("changed-locale-question-resume", async () => {
      const ids = course.items.map(x => x.id);
      const install = function (ids) {
        const known = new Set(ids), original = String.prototype.localeCompare, calls = [];
        const controlled = function (other, ...args) {
          const a = String(this), b = String(other), result = original.call(this, other, ...args);
          if (known.has(a) && known.has(b)) { calls.push({ a, b, original: result, returned: -result }); return -result; }
          return result;
        };
        String.prototype.localeCompare = controlled;
        globalThis.__probabilityTieControl = { calls, isActive: () => String.prototype.localeCompare === controlled, restore: () => { String.prototype.localeCompare = original; return String.prototype.localeCompare === original; } };
      };
      ({ identifier: tieScript } = await command("Page.addScriptToEvaluateOnNewDocument", { source: "(" + install.toString() + ")(" + JSON.stringify(ids) + ");" }));
      await newDocument(origin + "/demo.html", "sv-SE"); await startCourse(); const counterfactual = await question();
      assert.notEqual(counterfactual.itemId, firstQuestion.itemId, "Controlled fresh default must genuinely differ");
      const beforeItem = course.items.find(x => x.id === firstQuestion.itemId), afterItem = course.items.find(x => x.id === counterfactual.itemId);
      assert.equal(beforeItem.concept, afterItem.concept); assert.deepEqual(beforeItem.prerequisites, afterItem.prerequisites);
      assert.equal(counterfactual.progress, "0 / 12"); assert.deepEqual(counterfactual.mastery, firstQuestion.mastery);
      const preview = await previewLesson(questionSave.download.file); await click("#resume-lesson-confirm");
      await waitFor(() => inPage(prompt => document.querySelector(".question-card h2")?.textContent === prompt, firstQuestion.prompt), "original saved question");
      assert.deepEqual(await question(), firstQuestion);
      const resave = await saveLesson("question-resaved.json"); assert.deepEqual(sansDate(resave.doc), sansDate(questionSave.doc));
      const captureRow = await capture("question-resumed.png");
      return { counterfactual, original: firstQuestion, equalScoreBasis: "No answers; identical concept/mastery and prerequisite structure. The unchanged selector score depends on concept mastery and downstream count, which are equal for this same-concept pair.", preview, resave: publicDownload(resave.download), capture: captureRow };
    });
    await group("changed-locale-feedback-resume", async () => {
      const preview = await previewLesson(feedbackSave.download.file); await click("#resume-lesson-confirm");
      await waitFor(() => inPage(() => !!document.querySelector("#next-button")), "saved feedback");
      const restored = await feedback(firstQuestion.itemId, plan.firstChoices[firstQuestion.itemId], 1);
      assert.deepEqual(restored, firstFeedback);
      const q = await question(); assert.deepEqual(q.choices.map(x => ({ index: x.index, text: x.text })), firstQuestion.choices.map(x => ({ index: x.index, text: x.text })));
      const resave = await saveLesson("feedback-resaved.json"); assert.deepEqual(sansDate(resave.doc), sansDate(feedbackSave.doc));
      const control = await inPage(() => {
        const c = globalThis.__probabilityTieControl;
        return { activeBefore: c.isActive(), calls: [...c.calls], restoredOriginal: c.restore(), activeAfter: c.isActive() };
      });
      assert.equal(control.activeBefore, true); assert.ok(control.calls.length > 0); assert.equal(control.restoredOriginal, true); assert.equal(control.activeAfter, false);
      await command("Page.removeScriptToEvaluateOnNewDocument", { identifier: tieScript }); tieScript = null;
      report.controls.push({ type: "controlled-tie-order", ...control, naturalLocaleReorderingClaim: false });
      return { preview, restored, resave: publicDownload(resave.download), control };
    });
    await group("twelve-first-answers", async () => {
      assert.equal(firstAnswers.length, 1);
      while (firstAnswers.length < 12) {
        await click("#next-button"); await waitFor(() => inPage(() => !!document.querySelector("[data-choice]:not(:disabled)")), "next unanswered question");
        const q = await question(); await answerCurrent(q, firstAnswers.length + 1);
      }
      await click("#next-button"); await waitFor(() => inPage(() => !!document.querySelector("#first-try-summary")), "first review");
      assert.equal(new Set(firstAnswers.map(x => x.item)).size, 12);
      assert.deepEqual(firstAnswers.filter(x => !x.correct).map(x => x.item).sort(), ["pf-b2", "pf-c2"]);
      const state = await reviewState(); checkReview(state); return { firstAnswers, review: state };
    });
    await group("first-review-notes", async () => {
      await writeText('[data-reflection-item="pf-c2"]', plan.reflection);
      await writeText("#application-reflection", plan.applicationReflection);
      reviewBefore = await reviewState(); checkReview(reviewBefore);
      assert.equal(reviewBefore.rows.find(x => x.id === "pf-c2").reflection, plan.reflection); assert.equal(reviewBefore.application, plan.applicationReflection);
      notesBefore = await download("#save-notes-button", "study-notes-before.txt"); checkNotes(notesBefore.text, reviewBefore, false);
      traceBefore = await saveTrace("trace-before-practice.json"); assert.equal(traceBefore.doc.practice, null);
      return { review: reviewBefore, notes: publicDownload(notesBefore), rawTrace: publicDownload(traceBefore.download) };
    });
    await group("practice-notes", async () => {
      await click("#practice-button"); const retried = [];
      for (let count = 0; count < 2; count++) {
        await waitFor(() => inPage(() => !!document.querySelector("[data-practice-choice]:not(:disabled)")), "practice question");
        const q = await question(true), choice = plan.practiceChoices[q.itemId]; assert.ok(Number.isInteger(choice) && !retried.includes(q.itemId));
        await click('[data-practice-choice="' + choice + '"]'); await waitFor(() => inPage(() => !!document.querySelector("#practice-next")), "practice feedback");
        const item = course.items.find(x => x.id === q.itemId);
        assert.equal(await inPage(() => document.querySelector("#practice-feedback .feedback p").textContent), "Correct answer: " + item.options[item.answer]);
        retried.push(q.itemId); await click("#practice-next");
      }
      await waitFor(() => inPage(() => !!document.querySelector("#first-try-summary")), "completed practice review");
      assert.deepEqual([...retried].sort(), ["pf-b2", "pf-c2"]);
      const after = await reviewState(); checkReview(after);
      assert.equal(after.summary, reviewBefore.summary); assert.equal(after.model, reviewBefore.model); assert.deepEqual(after.estimates, reviewBefore.estimates); assert.equal(after.application, reviewBefore.application);
      for (const prior of reviewBefore.rows) {
        const row = after.rows.find(x => x.id === prior.id);
        assert.deepEqual({ ...row, practice: null }, { ...prior, practice: null });
        if (Object.hasOwn(plan.practiceChoices, row.id)) assert.ok(row.practice.includes("correct on retry")); else assert.equal(row.practice, null);
      }
      const notes = await download("#save-notes-button", "study-notes-after.txt"); checkNotes(notes.text, after, true);
      const traceAfter = await saveTrace("trace-after-practice.json");
      const originalFields = document => { const result = sansDate(document); delete result.practice; return result; };
      assert.deepEqual(originalFields(traceAfter.doc), originalFields(traceBefore.doc), "Raw mastery/model/first answers/course unchanged by practice");
      assert.deepEqual(traceAfter.doc.practice, { answers: firstAnswers.filter(x => Object.hasOwn(plan.practiceChoices, x.item)).map(x => ({ item: x.item, choice: plan.practiceChoices[x.item] })) });
      const modelSection = text => text.split("ESTIMATED MASTERY — MODEL STATE, NOT A GRADE\n")[1].split("\nPRACTICE\n")[0];
      assert.equal(modelSection(notes.text), modelSection(notesBefore.text));
      const captureRow = await capture("learner-practiced.png");
      return { retried, review: after, notes: publicDownload(notes), rawTrace: publicDownload(traceAfter.download), capture: captureRow };
    });
    await group("source-runtime-closure", async () => {
      assert.deepEqual(report.pageErrors, []); assert.deepEqual(report.unexpectedRequests, []); assert.deepEqual(report.harnessErrors, []);
      assert.equal(downloads.size, report.downloads.length, "Only explicit retained downloads");
      for (const pin of report.sources) assert.equal(sha256(await readFile(join(settings.root, pin.path))), pin.sha256, "Source unchanged " + pin.path);
      assert.equal(sha256(await readFile(self)), report.receiver.sha256);
      assert.equal(sha256(await readFile(settings.contract)), report.contract.sha256);
      report.sourceUnchanged = true;
      return { sourceFiles: report.sources.length, downloads: report.downloads.length, comparatorRestored: true };
    });
  } catch (error) {
    report.error = error.stack ?? String(error);
    for (const row of report.groups) if (row.status === "pending") row.status = "blocked";
    console.error(report.error);
  } finally {
    clearTimeout(totalTimer); closing = true;
    if (socket?.readyState === WebSocket.OPEN) { try { await command("Browser.close", {}, false); } catch {} }
    if (browser && !browserClosed) {
      await Promise.race([browserExitPromise, sleep(5000)]);
      if (!browserClosed) { browser.kill("SIGTERM"); await Promise.race([browserExitPromise, sleep(3000)]); }
      if (!browserClosed) { browser.kill("SIGKILL"); await Promise.race([browserExitPromise, sleep(3000)]); }
    }
    socket?.close();
    for (const item of pending.values()) { clearTimeout(item.timer); item.reject(new Error("Receiver closed")); } pending.clear();
    if (server) await new Promise(done => server.close(done));
    report.browserClosed = browserClosed;
    report.finalSourceChecks = [];
    for (const pin of report.sources) {
      try {
        const actual = sha256(await readFile(join(settings.root, pin.path)));
        report.finalSourceChecks.push({ path: pin.path, expected: pin.sha256, actual, unchanged: actual === pin.sha256 });
      } catch (error) { report.finalSourceChecks.push({ path: pin.path, unchanged: false, error: String(error) }); }
    }
    for (const pin of [report.receiver, report.contract]) {
      try {
        const actual = sha256(await readFile(pin.path));
        report.finalSourceChecks.push({ path: pin.path, expected: pin.sha256, actual, unchanged: actual === pin.sha256 });
      } catch (error) { report.finalSourceChecks.push({ path: pin.path, unchanged: false, error: String(error) }); }
    }
    report.sourceUnchanged = report.finalSourceChecks.length === Object.keys(plan.pins).length + 3
      && report.finalSourceChecks.every(row => row.unchanged);
    if (profile && browserClosed) { await rm(profile, { recursive: true, force: true }); report.ownedProfileRemovedAfterClosure = true; }
    await artifact("chrome-stderr.log", browserLog);
    report.ended = new Date().toISOString();
    report.finalEventChecks = { pageErrors: report.pageErrors.length, unexpectedRequests: report.unexpectedRequests.length, harnessErrors: report.harnessErrors.length, observedDownloads: downloads.size, retainedDownloads: report.downloads.length };
    report.pass = report.groups.every(x => x.status === "passed") && report.sourceUnchanged === true && browserClosed && !report.error && !report.totalTimeout
      && report.pageErrors.length === 0 && report.unexpectedRequests.length === 0 && report.harnessErrors.length === 0
      && downloads.size === report.downloads.length;
    await receipt(false);
    await artifact("source-pins.json", JSON.stringify(report.sources, null, 2) + "\n");
    console.log(JSON.stringify({ pass: report.pass, groups: report.groups.map(x => ({ id: x.id, status: x.status })), checkout: report.checkout, output: settings.output }));
    if (settings.emitBundle) await bundle(settings.output);
    if (!report.pass) process.exitCode = 1;
  }
}
try { await main(argumentsOf(process.argv.slice(2))); }
catch (error) { console.error(error.stack ?? String(error)); process.exitCode = 1; }
